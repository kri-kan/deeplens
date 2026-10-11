using System;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Logistics;
using DeepLens.Infrastructure.Clients.Delhivery;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services.Logistics;

public class PickupService : IPickupService
{
    private readonly IDelhiveryClient _delhiveryClient;
    private readonly IDbConnectionFactory _dbConnectionFactory;
    private readonly ILogger<PickupService> _logger;

    public PickupService(
        IDelhiveryClient delhiveryClient,
        IDbConnectionFactory dbConnectionFactory,
        ILogger<PickupService> logger)
    {
        _delhiveryClient = delhiveryClient;
        _dbConnectionFactory = dbConnectionFactory;
        _logger = logger;
    }

    public async Task<PickupResponseDto> SchedulePickupAsync(PickupRequestDto request, CancellationToken ct = default)
    {
        var pickupDate = string.IsNullOrWhiteSpace(request.PickupDate)
            ? DateTime.UtcNow.ToString("yyyy-MM-dd")
            : request.PickupDate;

        var pickupTime = string.IsNullOrWhiteSpace(request.PickupTime)
            ? "14:00:00"
            : request.PickupTime;

        // Resolve registered Delhivery warehouse name.
        var effectiveLocation = request.PickupLocation?.Trim() ?? string.Empty;
        try
        {
            using var lookupConn = await _dbConnectionFactory.CreateConnectionAsync();

            // 1. If WarehouseId provided, lookup canonical name directly: SELECT name FROM warehouses WHERE id = @Id
            if (request.WarehouseId.HasValue && request.WarehouseId.Value != Guid.Empty)
            {
                var directWhName = await lookupConn.QueryFirstOrDefaultAsync<string>(
                    "SELECT name FROM public.warehouses WHERE id = @Id LIMIT 1",
                    new { Id = request.WarehouseId.Value });

                if (!string.IsNullOrWhiteSpace(directWhName))
                {
                    effectiveLocation = directWhName.Trim();
                }
            }

            // 2. Check if request.PickupLocation matches an existing registered warehouse name directly
            if (string.IsNullOrWhiteSpace(effectiveLocation) && !string.IsNullOrWhiteSpace(request.PickupLocation))
            {
                var directMatch = await lookupConn.QueryFirstOrDefaultAsync<string>(
                    "SELECT name FROM public.warehouses WHERE LOWER(name) = LOWER(@Loc) LIMIT 1",
                    new { Loc = request.PickupLocation.Trim() });

                if (!string.IsNullOrWhiteSpace(directMatch))
                {
                    effectiveLocation = directMatch.Trim();
                }
            }

            // 3. Fallback: If not resolved yet, check shipment metadata from previous manifest if AWB or OrderGrpId provided
            if (string.IsNullOrWhiteSpace(effectiveLocation) && (!string.IsNullOrWhiteSpace(request.AwbNumber) || !string.IsNullOrWhiteSpace(request.OrderGrpId)))
            {
                var manifestLocation = await lookupConn.QueryFirstOrDefaultAsync<string>(@"
                    SELECT COALESCE(metadata->>'pickupLocation', metadata->>'pickup_location')
                    FROM shipments
                    WHERE (@AwbNumber IS NOT NULL AND awb_number = @AwbNumber)
                       OR (@OrderGrpId IS NOT NULL AND (order_number = @OrderGrpId OR shipment_number = @OrderGrpId))
                    ORDER BY created_at DESC
                    LIMIT 1",
                    new { AwbNumber = request.AwbNumber, OrderGrpId = request.OrderGrpId });

                if (!string.IsNullOrWhiteSpace(manifestLocation))
                {
                    effectiveLocation = manifestLocation.Trim();
                }
            }

            // 4. Fallback: Lookup by alias or code from warehouses table
            if (string.IsNullOrWhiteSpace(effectiveLocation) || effectiveLocation.Length <= 10)
            {
                var whName = await lookupConn.QueryFirstOrDefaultAsync<string>(@"
                    SELECT name
                    FROM warehouses
                    WHERE LOWER(alias) = LOWER(@Loc)
                       OR LOWER(code) = LOWER(@Loc)
                       OR LOWER(name) = LOWER(@Loc)
                    LIMIT 1",
                    new { Loc = !string.IsNullOrWhiteSpace(effectiveLocation) ? effectiveLocation : (request.WarehouseCode ?? request.PickupLocation) });

                if (!string.IsNullOrWhiteSpace(whName))
                {
                    effectiveLocation = whName.Trim();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to resolve canonical warehouse name for pickup location {Loc}", request.PickupLocation);
        }

        var delhiveryRequest = new DelhiveryPickupRequest
        {
            PickupLocation = effectiveLocation,
            PickupDate = pickupDate,
            PickupTime = pickupTime,
            ExpectedPackageCount = request.ExpectedPackageCount > 0 ? request.ExpectedPackageCount : 1
        };

        _logger.LogInformation("Scheduling pickup with Delhivery at location {Location} for date {Date} and count {Count}",
            effectiveLocation, pickupDate, request.ExpectedPackageCount);

        var res = await _delhiveryClient.SchedulePickupAsync(delhiveryRequest, ct);

        var isSuccess = !string.IsNullOrWhiteSpace(res.PickupId) || !string.IsNullOrWhiteSpace(res.PickupToken) || res.PrExist == true;
        var message = res.GetEffectiveMessage();

        if (string.IsNullOrWhiteSpace(message))
        {
            if (res.PrExist == true)
            {
                message = !string.IsNullOrWhiteSpace(res.PickupId)
                    ? $"A pickup request ({res.PickupId}) already exists for this location and date."
                    : "A pickup request already exists for this location and date.";
            }
            else if (isSuccess)
            {
                message = "Pickup scheduled successfully";
            }
            else
            {
                message = "Failed to schedule pickup with Delhivery";
            }
        }

        var pickupSlot = pickupTime.StartsWith("18") ? "18:00 - 21:00" : (pickupTime.StartsWith("14") ? "14:00 - 18:00" : pickupTime);

        if (isSuccess && (!string.IsNullOrWhiteSpace(request.OrderGrpId) || !string.IsNullOrWhiteSpace(request.AwbNumber)))
        {
            try
            {
                using var conn = await _dbConnectionFactory.CreateConnectionAsync();
                await conn.ExecuteAsync(@"
                    UPDATE shipments
                    SET pickup_scheduled_at = @PickupDate::timestamptz,
                        pickup_token = COALESCE(@PickupId, pickup_token),
                        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                            'pickup_scheduled_date', @PickupDate,
                            'pickup_scheduled_time', @PickupTime,
                            'pickup_slot', @PickupSlot,
                            'pickup_id', @PickupId,
                            'pickup_location', @PickupLocation
                        ),
                        updated_at = NOW()
                    WHERE (order_number = @OrderGrpId OR shipment_number = @OrderGrpId)
                       OR (@AwbNumber IS NOT NULL AND awb_number = @AwbNumber)",
                    new
                    {
                        PickupDate = pickupDate,
                        PickupTime = pickupTime,
                        PickupSlot = pickupSlot,
                        PickupId = res.PickupId,
                        PickupLocation = request.PickupLocation,
                        OrderGrpId = request.OrderGrpId,
                        AwbNumber = request.AwbNumber
                    });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to persist pickup schedule to shipments table for group {OrderGrpId}", request.OrderGrpId);
            }
        }

        return new PickupResponseDto
        {
            Success = isSuccess,
            PickupId = res.PickupId,
            PickupToken = res.PickupToken,
            PickupDate = res.PickupDate ?? pickupDate,
            PickupTime = res.PickupTime ?? pickupTime,
            PickupSlot = pickupSlot,
            PickupLocation = res.PickupLocation ?? request.PickupLocation,
            Message = message,
            PrExist = res.PrExist
        };
    }
}

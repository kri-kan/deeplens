using System;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Contracts.Logistics;
using DeepLens.Infrastructure.Clients.Delhivery;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services.Logistics;

public class PickupService : IPickupService
{
    private readonly IDelhiveryClient _delhiveryClient;
    private readonly ILogger<PickupService> _logger;

    public PickupService(IDelhiveryClient delhiveryClient, ILogger<PickupService> logger)
    {
        _delhiveryClient = delhiveryClient;
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

        var delhiveryRequest = new DelhiveryPickupRequest
        {
            PickupLocation = request.PickupLocation,
            PickupDate = pickupDate,
            PickupTime = pickupTime,
            ExpectedPackageCount = request.ExpectedPackageCount > 0 ? request.ExpectedPackageCount : 1
        };

        _logger.LogInformation("Scheduling pickup with Delhivery at location {Location} for date {Date} and count {Count}",
            request.PickupLocation, pickupDate, request.ExpectedPackageCount);

        var res = await _delhiveryClient.SchedulePickupAsync(delhiveryRequest, ct);

        return new PickupResponseDto
        {
            Success = !string.IsNullOrWhiteSpace(res.PickupId) || !string.IsNullOrWhiteSpace(res.PickupToken) || res.PrExist == true,
            PickupId = res.PickupId,
            PickupToken = res.PickupToken,
            PickupDate = res.PickupDate ?? pickupDate,
            PickupTime = res.PickupTime ?? pickupTime,
            PickupLocation = res.PickupLocation ?? request.PickupLocation,
            Message = res.Message ?? "Pickup scheduled successfully"
        };
    }
}

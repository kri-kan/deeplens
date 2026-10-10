using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Domain.Entities.Logistics;
using DeepLens.Infrastructure.Clients.Delhivery;
using DeepLens.Infrastructure.Services;
using DeepLens.Shared.Common.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services.Logistics;

public record CancelGroupLabelCommand(
    string OrderGrpId,
    string? AwbNumber = null,
    string? Reason = null) : IRequest<Result<CancelGroupLabelResponse>>;

public record CancelGroupLabelResponse(
    string OrderGrpId,
    string? AwbNumber,
    string Status = "cancelled",
    bool Success = true);

public class CancelGroupLabelCommandHandler : IRequestHandler<CancelGroupLabelCommand, Result<CancelGroupLabelResponse>>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IDbConnectionFactory _dbConnectionFactory;
    private readonly IDelhiveryClient _delhiveryClient;
    private readonly IStorageService _storageService;
    private readonly ILogger<CancelGroupLabelCommandHandler> _logger;

    public CancelGroupLabelCommandHandler(
        IOrderRepository orderRepository,
        IDbConnectionFactory dbConnectionFactory,
        IDelhiveryClient delhiveryClient,
        IStorageService storageService,
        ILogger<CancelGroupLabelCommandHandler> logger)
    {
        _orderRepository = orderRepository;
        _dbConnectionFactory = dbConnectionFactory;
        _delhiveryClient = delhiveryClient;
        _storageService = storageService;
        _logger = logger;
    }

    public async Task<Result<CancelGroupLabelResponse>> Handle(CancelGroupLabelCommand request, CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.OrderGrpId))
            {
                return Result<CancelGroupLabelResponse>.Failure(new Error("CancelGroupLabel.InvalidId", "Order Group ID cannot be empty."));
            }

            var awbNumber = request.AwbNumber;

            // If AWB is not supplied, look it up from order_groups
            if (string.IsNullOrWhiteSpace(awbNumber))
            {
                using var conn = await _dbConnectionFactory.CreateConnectionAsync();
                awbNumber = await conn.QueryFirstOrDefaultAsync<string>(
                    "SELECT awb_number FROM order_groups WHERE order_grp_id = @OrderGrpId",
                    new { OrderGrpId = request.OrderGrpId });
            }

            // If we have an AWB, cancel with Delhivery live API and hard delete label from MinIO
            if (!string.IsNullOrWhiteSpace(awbNumber))
            {
                var cleanAwb = awbNumber.Trim();
                _logger.LogInformation("Cancelling Delhivery shipment for AWB {Awb} (Group: {GrpId})", cleanAwb, request.OrderGrpId);
                try
                {
                    await _delhiveryClient.CancelShipmentAsync(cleanAwb, request.Reason ?? "Need Label toggled off", cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Delhivery live API cancellation returned an error for AWB {Awb}, proceeding with database update", cleanAwb);
                }

                _logger.LogInformation("Hard deleting shipping label PDF from MinIO for AWB {Awb}", cleanAwb);
                try
                {
                    await _storageService.DeleteFileAsync($"labels/{cleanAwb}.pdf");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete label PDF from MinIO for AWB {Awb}", cleanAwb);
                }
            }

            // Update database records: soft delete manifest submission / set status = cancelled, clear label_url, RETAIN awb_number
            await _orderRepository.CancelGroupLabelAsync(request.OrderGrpId, awbNumber);

            return Result<CancelGroupLabelResponse>.Success(new CancelGroupLabelResponse(
                request.OrderGrpId,
                awbNumber,
                "cancelled",
                true));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling group label for group {GroupGrpId}", request.OrderGrpId);
            return Result<CancelGroupLabelResponse>.Failure(new Error("CancelGroupLabel.Error", ex.Message));
        }
    }
}

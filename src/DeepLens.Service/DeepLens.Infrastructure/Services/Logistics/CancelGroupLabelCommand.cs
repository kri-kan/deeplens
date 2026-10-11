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
            string? existingLabelUrl = null;

            // Look up awb_number and label_url from order_groups if not fully provided
            using (var conn = await _dbConnectionFactory.CreateConnectionAsync())
            {
                var groupInfo = await conn.QueryFirstOrDefaultAsync<dynamic>(
                    "SELECT awb_number, label_url FROM order_groups WHERE order_grp_id = @OrderGrpId",
                    new { OrderGrpId = request.OrderGrpId });

                if (groupInfo != null)
                {
                    if (string.IsNullOrWhiteSpace(awbNumber))
                    {
                        awbNumber = (string?)groupInfo.awb_number;
                    }
                    existingLabelUrl = (string?)groupInfo.label_url;
                }
            }

            // 1. If we have an AWB, cancel with Delhivery live API and hard delete label from MinIO
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
                    _logger.LogWarning(ex, "Delhivery live API cancellation returned an error for AWB {Awb}, proceeding with storage and database cleanup", cleanAwb);
                }

                _logger.LogInformation("Hard deleting shipping label PDF from MinIO for AWB {Awb}", cleanAwb);
                try
                {
                    await _storageService.DeleteFileAsync($"labels/{cleanAwb}.pdf");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete labels/{Awb}.pdf from storage", cleanAwb);
                }
            }

            // 2. If existingLabelUrl is present, delete that file from storage as well
            if (!string.IsNullOrWhiteSpace(existingLabelUrl))
            {
                try
                {
                    string cleanPath = existingLabelUrl.Trim();
                    if (cleanPath.Contains("path=", StringComparison.OrdinalIgnoreCase))
                    {
                        var idx = cleanPath.IndexOf("path=", StringComparison.OrdinalIgnoreCase);
                        var sub = cleanPath.Substring(idx + 5);
                        var endIdx = sub.IndexOf('&');
                        if (endIdx > 0) sub = sub.Substring(0, endIdx);
                        cleanPath = Uri.UnescapeDataString(sub);
                    }
                    if (cleanPath.StartsWith("/")) cleanPath = cleanPath.TrimStart('/');

                    if (!string.IsNullOrWhiteSpace(cleanPath))
                    {
                        _logger.LogInformation("Hard deleting label storage path {Path} for group {GrpId}", cleanPath, request.OrderGrpId);
                        await _storageService.DeleteFileAsync(cleanPath);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete storage path {Path} for group {GrpId}", existingLabelUrl, request.OrderGrpId);
                }
            }

            // 3. Purge any attachment records in DB (attachments and entity_attachments)
            try
            {
                using var conn = await _dbConnectionFactory.CreateConnectionAsync();
                var cleanAwb = awbNumber?.Trim();

                var attachmentIds = (await conn.QueryAsync<Guid>(@"
                    SELECT DISTINCT a.id 
                    FROM attachments a
                    LEFT JOIN entity_attachments ea ON a.id = ea.attachment_id
                    WHERE (ea.entity_type = 'order_group' AND ea.entity_id = @OrderGrpId)
                       OR (ea.tag = 'shipping_label' AND ea.entity_id = @OrderGrpId)
                       OR (@CleanAwb IS NOT NULL AND (a.object_key LIKE '%' || @CleanAwb || '%' OR a.original_filename LIKE '%' || @CleanAwb || '%'))",
                    new { OrderGrpId = request.OrderGrpId, CleanAwb = cleanAwb })).ToList();

                foreach (var attId in attachmentIds)
                {
                    await conn.ExecuteAsync("DELETE FROM entity_attachments WHERE attachment_id = @Id", new { Id = attId });
                    await conn.ExecuteAsync("DELETE FROM attachments WHERE id = @Id", new { Id = attId });
                    _logger.LogInformation("Purged attachment record {Id} for cancelled label in group {GrpId}", attId, request.OrderGrpId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to clean up attachments database records for group {GrpId}", request.OrderGrpId);
            }

            // 4. Update database records: clear awb_number and label_url in order_groups, mark shipment cancelled
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

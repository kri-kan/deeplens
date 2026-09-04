using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Contracts.Logistics;
using DeepLens.Domain.Entities.Logistics;
using DeepLens.Infrastructure.Clients.Delhivery;
using DeepLens.Infrastructure.Persistence.Repositories.Logistics;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services.Logistics;

public class NdrService : INdrService
{
    private readonly ILogisticsRepository _repository;
    private readonly IDelhiveryClient _delhiveryClient;
    private readonly ILogger<NdrService> _logger;

    public NdrService(
        ILogisticsRepository repository,
        IDelhiveryClient delhiveryClient,
        ILogger<NdrService> logger)
    {
        _repository = repository;
        _delhiveryClient = delhiveryClient;
        _logger = logger;
    }

    public async Task<NdrTask> CreateOrUpdateNdrFromScanAsync(Guid shipmentId, string awb, string ndrCode, string ndrReason, string? customerPhone, CancellationToken ct = default)
    {
        var existing = await _repository.GetOpenNdrTaskByShipmentIdAsync(shipmentId);
        if (existing != null)
        {
            existing.NdrCode = ndrCode;
            existing.NdrReason = ndrReason;
            existing.CustomerPhone = customerPhone ?? existing.CustomerPhone;
            existing.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateNdrTaskActionAsync(
                existing.Id,
                existing.ChosenAction ?? string.Empty,
                existing.ReattemptDate,
                $"Updated from webhook scan: {ndrReason}",
                existing.DispatchedToDelhivery,
                existing.ActionStatus);

            _logger.LogInformation("Updated existing open NDR task {Id} for AWB {Awb}", existing.Id, awb);
            return existing;
        }

        var newTask = new NdrTask
        {
            Id = Guid.NewGuid(),
            ShipmentId = shipmentId,
            AwbNumber = awb,
            NdrCode = ndrCode,
            NdrReason = ndrReason,
            CustomerPhone = customerPhone,
            ActionStatus = "open",
            DispatchedToDelhivery = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var id = await _repository.CreateNdrTaskAsync(newTask);
        newTask.Id = id;

        // Also update shipment status to NDR
        await _repository.UpdateShipmentStatusAsync(shipmentId, "ndr");

        _logger.LogInformation("Created new NDR human-in-the-loop task {Id} for AWB {Awb} with reason: {Reason}", id, awb, ndrReason);
        return newTask;
    }

    public async Task<List<PendingNdrDto>> GetPendingNdrsAsync(CancellationToken ct = default)
    {
        var tasks = await _repository.GetPendingNdrTasksAsync();
        var dtos = new List<PendingNdrDto>();

        foreach (var t in tasks)
        {
            var shipment = await _repository.GetShipmentByIdAsync(t.ShipmentId);
            dtos.Add(new PendingNdrDto
            {
                Id = t.Id,
                ShipmentId = t.ShipmentId,
                OrderNumber = shipment?.OrderNumber ?? string.Empty,
                AwbNumber = t.AwbNumber ?? shipment?.AwbNumber,
                NdrReason = t.NdrReason,
                NdrCode = t.NdrCode,
                CustomerPhone = t.CustomerPhone,
                CustomerFeedback = t.CustomerFeedback,
                ActionStatus = t.ActionStatus,
                ChosenAction = t.ChosenAction,
                ReattemptDate = t.ReattemptDate,
                Remarks = t.Remarks,
                DispatchedToDelhivery = t.DispatchedToDelhivery,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            });
        }

        return dtos;
    }

    public async Task<NdrActionResponse> ExecuteNdrActionAsync(Guid ndrTaskId, NdrActionRequest request, CancellationToken ct = default)
    {
        var task = await _repository.GetNdrTaskByIdAsync(ndrTaskId);
        if (task == null)
        {
            throw new KeyNotFoundException($"NDR Task with ID '{ndrTaskId}' not found.");
        }

        var shipment = await _repository.GetShipmentByIdAsync(task.ShipmentId);
        var awb = task.AwbNumber ?? shipment?.AwbNumber ?? string.Empty;

        // Map frontend action string to Delhivery edit action
        string delhiveryAct = request.Action.ToLowerInvariant() switch
        {
            "reattempt" => "REATTEMPT",
            "addressupdate" or "change_address" or "address_update" => "EDIT_ADDRESS",
            "rto" or "return_to_origin" => "RTO",
            "phoneupdate" or "change_phone" or "phone_update" => "EDIT_PHONE",
            _ => "REATTEMPT"
        };

        var editRequest = new DelhiveryNdrEditRequest
        {
            Waybill = awb,
            Action = delhiveryAct,
            Address = request.UpdatedAddress,
            Phone = request.UpdatedPhone,
            Name = request.UpdatedName,
            ReattemptDate = request.ReattemptDate?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd"),
            Remarks = request.Remarks
        };

        _logger.LogInformation("Dispatching NDR Action {Action} for AWB {Awb} to Delhivery", delhiveryAct, awb);
        var response = await _delhiveryClient.SubmitNdrActionAsync(editRequest, ct);

        bool delhiverySuccess = response.Success == true || response.Status == true;
        string actionStatus = delhiverySuccess ? "resolved" : "open";

        await _repository.UpdateNdrTaskActionAsync(
            ndrTaskId,
            request.Action,
            request.ReattemptDate,
            request.Remarks ?? response.Message ?? "Action dispatched",
            delhiverySuccess,
            actionStatus);

        // Update shipment status accordingly
        if (delhiverySuccess)
        {
            if (delhiveryAct == "RTO")
            {
                await _repository.UpdateShipmentStatusAsync(task.ShipmentId, "rto_initiated");
            }
            else
            {
                await _repository.UpdateShipmentStatusAsync(task.ShipmentId, "in_transit");
            }
        }

        return new NdrActionResponse
        {
            Success = true,
            NdrTaskId = ndrTaskId,
            ShipmentId = task.ShipmentId,
            AwbNumber = awb,
            Action = request.Action,
            DelhiverySuccess = delhiverySuccess,
            DelhiveryRemarks = response.Message,
            ActionStatus = actionStatus,
            Message = delhiverySuccess ? "NDR action executed successfully." : "NDR action recorded locally; Delhivery dispatch warning."
        };
    }
}

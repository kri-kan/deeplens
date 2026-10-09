using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Orders;
using DeepLens.Infrastructure.Clients.Delhivery;
using DeepLens.Shared.Common.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services.Logistics;

public record GenerateGroupLabelCommand(string OrderGrpId) : IRequest<Result<GenerateGroupLabelResponse>>;

public record GenerateGroupLabelResponse(
    string OrderGrpId,
    string AwbNumber,
    string LabelUrl,
    string Status = "generated");

public class GenerateGroupLabelCommandHandler : IRequestHandler<GenerateGroupLabelCommand, Result<GenerateGroupLabelResponse>>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IDelhiveryClient _delhiveryClient;
    private readonly ILogger<GenerateGroupLabelCommandHandler> _logger;

    public GenerateGroupLabelCommandHandler(
        IOrderRepository orderRepository,
        IDelhiveryClient delhiveryClient,
        ILogger<GenerateGroupLabelCommandHandler> logger)
    {
        _orderRepository = orderRepository;
        _delhiveryClient = delhiveryClient;
        _logger = logger;
    }

    public async Task<Result<GenerateGroupLabelResponse>> Handle(GenerateGroupLabelCommand request, CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.OrderGrpId))
            {
                return Result<GenerateGroupLabelResponse>.Failure(new Error("GroupLabel.InvalidId", "Order Group ID cannot be empty."));
            }

            var parts = request.OrderGrpId.Split('-');
            var orderId = parts.Length >= 2 ? $"{parts[0]}-{parts[1]}" : request.OrderGrpId;

            var order = await _orderRepository.GetDetailsAsync(orderId);
            if (order == null)
            {
                return Result<GenerateGroupLabelResponse>.Failure(new Error("GroupLabel.OrderNotFound", $"Order {orderId} not found."));
            }

            var group = order.Groups?.FirstOrDefault(g => g.OrderGrpId.Equals(request.OrderGrpId, StringComparison.OrdinalIgnoreCase))
                ?? order.Groups?.FirstOrDefault();

            if (group == null)
            {
                return Result<GenerateGroupLabelResponse>.Failure(new Error("GroupLabel.GroupNotFound", $"Group {request.OrderGrpId} not found in order {orderId}."));
            }

            var isCod = order.PaymentMode == Domain.Enums.PaymentMode.COD;
            var codAmountVal = isCod ? (order.CodBalance ?? order.TotalAmount ?? 0) : 0m;
            var totalAmountVal = group.Items?.Sum(i => i.Subtotal) ?? 0m;

            var payload = new DelhiveryCmuPayload
            {
                PickupLocation = new DelhiveryPickupLocation
                {
                    Name = "Vayyari Warehouse",
                    Address = "Ring Road Textile Market",
                    City = "Surat",
                    PinCode = "395002",
                    Phone = "9898000000",
                    Country = "India"
                },
                Shipments = new List<DelhiveryShipmentDetail>
                {
                    new DelhiveryShipmentDetail
                    {
                        Order = group.OrderGrpId,
                        Name = order.CustomerName ?? "Customer",
                        Address = !string.IsNullOrWhiteSpace(order.ShippingStreet) ? order.ShippingStreet : (order.CustomerAddress ?? "Main Address"),
                        Pin = !string.IsNullOrWhiteSpace(order.ShippingPincode) ? order.ShippingPincode : "395002",
                        City = !string.IsNullOrWhiteSpace(order.ShippingCity) ? order.ShippingCity : "Surat",
                        State = !string.IsNullOrWhiteSpace(order.ShippingState) ? order.ShippingState : "Gujarat",
                        Phone = !string.IsNullOrWhiteSpace(order.CustomerPhone) ? order.CustomerPhone : "9999999999",
                        PaymentMode = isCod ? "COD" : "Pre-paid",
                        CodAmount = codAmountVal,
                        TotalAmount = totalAmountVal,
                        ShippingMode = "Surface"
                    }
                }
            };

            _logger.LogInformation("Creating Delhivery shipment for group {GroupGrpId}", group.OrderGrpId);
            var shipmentResult = await _delhiveryClient.CreateShipmentAsync(payload, cancellationToken);
            var pkg = shipmentResult.Packages?.FirstOrDefault();
            var awbNumber = pkg?.Waybill ?? $"DEL{DateTime.UtcNow:yyMMdd}{new Random().Next(10000, 99999)}";

            _logger.LogInformation("Generating and persisting PDF thermal label for AWB {Awb}", awbNumber);
            var labelUrl = await _delhiveryClient.GeneratePackingSlipAndPersistAsync(awbNumber, cancellationToken);

            await _orderRepository.UpdateGroupLabelInfoAsync(group.OrderGrpId, awbNumber, labelUrl, "generated");

            return Result<GenerateGroupLabelResponse>.Success(new GenerateGroupLabelResponse(group.OrderGrpId, awbNumber, labelUrl, "generated"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating label for group {GroupGrpId}", request.OrderGrpId);
            return Result<GenerateGroupLabelResponse>.Failure(new Error("GroupLabel.Error", ex.Message));
        }
    }
}

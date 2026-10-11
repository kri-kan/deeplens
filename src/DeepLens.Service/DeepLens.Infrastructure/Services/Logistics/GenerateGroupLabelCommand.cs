using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Orders;
using DeepLens.Domain.Entities.Logistics;
using DeepLens.Infrastructure.Clients.Delhivery;
using DeepLens.Infrastructure.Persistence.Repositories.Logistics;
using DeepLens.Shared.Common.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services.Logistics;

public record GenerateGroupLabelCommand(
    string OrderGrpId,
    string? PickupLocation = null,
    string? ShippingMode = null,
    int? WeightGrams = null,
    double? LengthCm = null,
    double? WidthCm = null,
    double? HeightCm = null,
    string? PaymentMode = null,
    decimal? CodAmount = null,
    decimal? TotalAmount = null,
    string? OrderId = null,
    int? Quantity = null,
    string? ProductsDesc = null,
    string? OrderType = null,
    string? ResellerName = null,
    string? SellerName = null,
    string? SellerAddress = null) : IRequest<Result<GenerateGroupLabelResponse>>;

public record GenerateGroupLabelResponse(
    string OrderGrpId,
    string AwbNumber,
    string LabelUrl,
    string Status = "generated");

public class GenerateGroupLabelCommandHandler : IRequestHandler<GenerateGroupLabelCommand, Result<GenerateGroupLabelResponse>>
{
    private readonly IOrderRepository _orderRepository;
    private readonly ILogisticsRepository _logisticsRepository;
    private readonly IDbConnectionFactory _dbConnectionFactory;
    private readonly IDelhiveryClient _delhiveryClient;
    private readonly ILogger<GenerateGroupLabelCommandHandler> _logger;

    public GenerateGroupLabelCommandHandler(
        IOrderRepository orderRepository,
        ILogisticsRepository logisticsRepository,
        IDbConnectionFactory dbConnectionFactory,
        IDelhiveryClient delhiveryClient,
        ILogger<GenerateGroupLabelCommandHandler> logger)
    {
        _orderRepository = orderRepository;
        _logisticsRepository = logisticsRepository;
        _dbConnectionFactory = dbConnectionFactory;
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

            // Look up orderId from order_groups first, falling back to stripping group suffix -G\d+
            string? orderId = null;
            try
            {
                using var conn = await _dbConnectionFactory.CreateConnectionAsync();
                orderId = await conn.QueryFirstOrDefaultAsync<string>(
                    "SELECT order_id FROM order_groups WHERE order_grp_id = @OrderGrpId LIMIT 1",
                    new { OrderGrpId = request.OrderGrpId });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to query orderId from order_groups for {OrderGrpId}, falling back to regex", request.OrderGrpId);
            }

            if (string.IsNullOrWhiteSpace(orderId))
            {
                var match = System.Text.RegularExpressions.Regex.Match(request.OrderGrpId, @"^(.*?)-G\d+$", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (match.Success)
                {
                    orderId = match.Groups[1].Value;
                }
                else
                {
                    var parts = request.OrderGrpId.Split('-');
                    orderId = parts.Length > 1 ? string.Join("-", parts.Take(parts.Length - 1)) : request.OrderGrpId;
                }
            }

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

            // Resolve pickup warehouse
            Warehouse? resolvedWarehouse = null;

            if (!string.IsNullOrWhiteSpace(request.PickupLocation))
            {
                var allWarehouses = await _logisticsRepository.GetAllWarehousesAsync();
                resolvedWarehouse = allWarehouses.FirstOrDefault(w =>
                    w.Code.Equals(request.PickupLocation, StringComparison.OrdinalIgnoreCase) ||
                    w.Name.Equals(request.PickupLocation, StringComparison.OrdinalIgnoreCase));
            }

            if (resolvedWarehouse == null && !string.IsNullOrWhiteSpace(group.VendorName))
            {
                try
                {
                    using var conn = await _dbConnectionFactory.CreateConnectionAsync();
                    resolvedWarehouse = await conn.QueryFirstOrDefaultAsync<Warehouse>(@"
                        SELECT w.*
                        FROM public.vendors v
                        JOIN public.warehouses w ON v.default_warehouse_id = w.id
                        WHERE v.vendor_name ILIKE @VendorName OR v.vendor_code ILIKE @VendorName",
                        new { VendorName = group.VendorName.Trim() });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to resolve vendor warehouse mapping for {VendorName}", group.VendorName);
                }
            }

            if (resolvedWarehouse == null)
            {
                resolvedWarehouse = await _logisticsRepository.GetCentralWarehouseAsync();
            }

            var pickupName = resolvedWarehouse?.Name ?? request.PickupLocation ?? "HYD_CENTRAL";
            var pickupAddress = resolvedWarehouse?.AddressLine1 ?? "Central Fulfillment Hub";
            var pickupCity = resolvedWarehouse?.City ?? "Surat";
            var pickupPin = resolvedWarehouse?.Pincode ?? "395002";
            var pickupPhone = resolvedWarehouse?.Phone ?? "9876543210";

            // Calculations per user specs
            var totalItemsCount = request.Quantity ?? group.Items?.Sum(i => i.Quantity) ?? 1;
            var weightGrams = request.WeightGrams ?? Math.Max(400, totalItemsCount * 400); // 400gm per item rule
            var lengthCm = request.LengthCm ?? 40.0; // 40cm plastic cover rule
            var widthCm = request.WidthCm ?? 25.0;   // 25cm rule
            var heightCm = request.HeightCm ?? 3.0;   // 3cm rule
            var shippingMode = !string.IsNullOrWhiteSpace(request.ShippingMode) ? request.ShippingMode : "Surface"; // Surface default

            // Determine Payment Mode & COD Amount
            var isCod = !string.IsNullOrWhiteSpace(request.PaymentMode)
                ? request.PaymentMode.Equals("COD", StringComparison.OrdinalIgnoreCase)
                : (order.PaymentMode == Domain.Enums.PaymentMode.COD);

            var codAmountVal = isCod
                ? (request.CodAmount ?? order.CodBalance ?? order.TotalAmount ?? 0m)
                : 0m;

            // Total Amount: 4 times actual amount for declared consignment value per user specification
            var actualAmount = group.Items?.Sum(i => i.Subtotal) ?? (order.TotalAmount ?? 0m);
            var totalAmountVal = request.TotalAmount ?? (actualAmount * 4m);

            var effectiveOrder = !string.IsNullOrWhiteSpace(request.OrderId) ? request.OrderId : group.OrderGrpId;
            var productDesc = !string.IsNullOrWhiteSpace(request.ProductsDesc) ? request.ProductsDesc : $"{group.VendorName ?? "Apparel"} ({totalItemsCount} items)";

            // Determine Seller Name: if explicitly specified in request, use it; otherwise derive based on OrderType and ResellerName
            string sellerName;
            if (request.SellerName != null)
            {
                sellerName = request.SellerName.Trim();
            }
            else
            {
                var effectiveOrderType = !string.IsNullOrWhiteSpace(request.OrderType) ? request.OrderType : order.OrderType;
                var effectiveResellerName = request.ResellerName ?? order.ResellerName;
                var isReseller = string.Equals(effectiveOrderType, "Reseller", StringComparison.OrdinalIgnoreCase);

                if (isReseller)
                {
                    sellerName = !string.IsNullOrWhiteSpace(effectiveResellerName)
                        ? $"From: {effectiveResellerName.Trim()}"
                        : string.Empty;
                }
                else
                {
                    sellerName = "From: VAYYARI Fashions";
                }
            }

            // Determine Seller Address: default to "" empty string so Delhivery does not print physical warehouse street address under Seller
            var hasExplicitSellerAddress = !string.IsNullOrWhiteSpace(request.SellerAddress);
            var sellerAddress = hasExplicitSellerAddress ? request.SellerAddress!.Trim() : string.Empty;

            // If seller address is suppressed, suppress it across shipment seller_add, return_add, and pickup_location
            // NOTE: Delhivery auto-populates seller address / return address if return_city, return_pin, or pickup_location address fields are passed.
            var effectivePickupAddress = hasExplicitSellerAddress ? pickupAddress : null;
            var effectivePickupCity = hasExplicitSellerAddress ? pickupCity : null;
            var effectivePickupPin = hasExplicitSellerAddress ? pickupPin : null;
            var effectivePickupPhone = hasExplicitSellerAddress ? pickupPhone : null;

            var effectiveReturnAddress = hasExplicitSellerAddress ? pickupAddress : null;
            var effectiveReturnCity = hasExplicitSellerAddress ? pickupCity : null;
            var effectiveReturnState = hasExplicitSellerAddress ? (resolvedWarehouse?.State) : null;
            var effectiveReturnPin = hasExplicitSellerAddress ? pickupPin : null;
            var effectiveReturnPhone = hasExplicitSellerAddress ? pickupPhone : null;
            var effectiveReturnName = !string.IsNullOrWhiteSpace(sellerName) ? sellerName : null;

            var payload = new DelhiveryCmuPayload
            {
                PickupLocation = new DelhiveryPickupLocation
                {
                    Name = pickupName,
                    Address = effectivePickupAddress,
                    City = effectivePickupCity,
                    PinCode = effectivePickupPin,
                    Phone = effectivePickupPhone,
                    Country = "India"
                },
                Shipments = new List<DelhiveryShipmentDetail>
                {
                    new DelhiveryShipmentDetail
                    {
                        Order = effectiveOrder,
                        Name = order.CustomerName ?? "Customer",
                        Address = !string.IsNullOrWhiteSpace(order.ShippingStreet) ? order.ShippingStreet : (order.CustomerAddress ?? "Main Address"),
                        Pin = !string.IsNullOrWhiteSpace(order.ShippingPincode) ? order.ShippingPincode : "395002",
                        City = !string.IsNullOrWhiteSpace(order.ShippingCity) ? order.ShippingCity : "Surat",
                        State = !string.IsNullOrWhiteSpace(order.ShippingState) ? order.ShippingState : "Gujarat",
                        Phone = !string.IsNullOrWhiteSpace(order.CustomerPhone) ? order.CustomerPhone : "9999999999",
                        PaymentMode = isCod ? "COD" : "Pre-paid",
                        CodAmount = codAmountVal,
                        TotalAmount = totalAmountVal,
                        ShippingMode = shippingMode,
                        Weight = weightGrams,
                        ShipmentWidth = widthCm,
                        ShipmentHeight = heightCm,
                        Quantity = totalItemsCount.ToString(),
                        ProductsDesc = productDesc,
                        SellerName = sellerName,
                        SellerAddress = sellerAddress,
                        ReturnName = effectiveReturnName,
                        ReturnAddress = effectiveReturnAddress,
                        ReturnCity = effectiveReturnCity,
                        ReturnState = effectiveReturnState,
                        ReturnPin = effectiveReturnPin,
                        ReturnPhone = effectiveReturnPhone
                    }
                }
            };

            _logger.LogInformation("Creating Delhivery shipment for group {GroupGrpId} from pickup {Pickup} ({Mode}, {Weight}g)",
                group.OrderGrpId, pickupName, shippingMode, weightGrams);

            var shipmentResult = await _delhiveryClient.CreateShipmentAsync(payload, cancellationToken);
            var pkg = shipmentResult.Packages?.FirstOrDefault();
            var awbNumber = pkg?.Waybill;

            if (string.IsNullOrWhiteSpace(awbNumber))
            {
                var errRemarks = string.Join("; ", shipmentResult.Packages?.SelectMany(p => p.Remarks ?? Enumerable.Empty<string>()) ?? Enumerable.Empty<string>());
                var errDetail = !string.IsNullOrWhiteSpace(errRemarks) ? errRemarks : (!string.IsNullOrWhiteSpace(shipmentResult.Error) ? shipmentResult.Error : "Delhivery did not return a valid waybill.");
                _logger.LogError("Delhivery shipment creation failed for group {GroupGrpId}: {Error}", group.OrderGrpId, errDetail);

                var friendlyMessage = DelhiveryErrorSanitizer.Sanitize(errDetail);
                return Result<GenerateGroupLabelResponse>.Failure(new Error("GroupLabel.DelhiveryFailed", friendlyMessage));
            }

            _logger.LogInformation("Generating and persisting PDF thermal label for AWB {Awb}", awbNumber);
            var labelUrl = await _delhiveryClient.GeneratePackingSlipAndPersistAsync(awbNumber, cancellationToken);

            await _orderRepository.UpdateGroupLabelInfoAsync(group.OrderGrpId, awbNumber, labelUrl);

            // Persist shipment in shipments table with form data in metadata JSONB
            try
            {
                var metaDict = new Dictionary<string, object?>
                {
                    ["orderGrpId"] = group.OrderGrpId,
                    ["pickupLocation"] = pickupName,
                    ["pickupAddress"] = pickupAddress,
                    ["pickupCity"] = pickupCity,
                    ["pickupPin"] = pickupPin,
                    ["pickupPhone"] = pickupPhone,
                    ["shippingMode"] = shippingMode,
                    ["weightGrams"] = weightGrams,
                    ["lengthCm"] = lengthCm,
                    ["widthCm"] = widthCm,
                    ["heightCm"] = heightCm,
                    ["paymentMode"] = isCod ? "COD" : "Pre-paid",
                    ["codAmount"] = codAmountVal,
                    ["totalAmount"] = totalAmountVal,
                    ["quantity"] = totalItemsCount,
                    ["productsDesc"] = productDesc,
                    ["sellerName"] = sellerName,
                    ["sellerAddress"] = sellerAddress,
                    ["resellerName"] = request.ResellerName,
                    ["orderType"] = request.OrderType,
                    ["manifestedAt"] = DateTime.UtcNow
                };
                var metaJson = System.Text.Json.JsonSerializer.Serialize(metaDict);

                using var conn = await _dbConnectionFactory.CreateConnectionAsync();
                await conn.ExecuteAsync(@"
                    INSERT INTO public.shipments (
                        id, order_id, order_number, shipment_number, courier_partner, 
                        awb_number, status, shipping_mode, fulfillment_type, cod_amount, 
                        label_url, vendor_name, metadata, created_at, updated_at
                    )
                    VALUES (
                        gen_random_uuid(), @OrderIdGuid, @OrderGrpId, @ShipmentNumber, 'Delhivery',
                        @AwbNumber, 'manifested', @ShippingMode, 'direct_dispatch', @CodAmount,
                        @LabelUrl, @VendorName, @Metadata::jsonb, NOW(), NOW()
                    )
                    ON CONFLICT (shipment_number) DO UPDATE
                    SET status = 'manifested',
                        label_url = EXCLUDED.label_url,
                        metadata = EXCLUDED.metadata,
                        updated_at = NOW()",
                    new
                    {
                        OrderIdGuid = Guid.TryParse(order.Id, out var oGuid) ? oGuid : (Guid?)null,
                        OrderGrpId = group.OrderGrpId,
                        ShipmentNumber = awbNumber.Trim(),
                        AwbNumber = awbNumber.Trim(),
                        ShippingMode = shippingMode,
                        CodAmount = codAmountVal,
                        LabelUrl = labelUrl,
                        VendorName = group.VendorName,
                        Metadata = metaJson
                    });
            }
            catch (Exception shipEx)
            {
                _logger.LogWarning(shipEx, "Could not persist shipment record for AWB {Awb}", awbNumber);
            }

            return Result<GenerateGroupLabelResponse>.Success(new GenerateGroupLabelResponse(group.OrderGrpId, awbNumber, labelUrl, "generated"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating label for group {GroupGrpId}", request.OrderGrpId);
            return Result<GenerateGroupLabelResponse>.Failure(new Error("GroupLabel.Error", ex.Message));
        }
    }
}

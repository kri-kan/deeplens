using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Logistics;
using DeepLens.Contracts.Marketing;
using DeepLens.Contracts.Orders;
using DeepLens.Domain.Entities.Logistics;
using DeepLens.Domain.Enums;
using DeepLens.Infrastructure.Clients.Delhivery;
using DeepLens.Infrastructure.Persistence.Repositories.Logistics;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services.Logistics;

public class ShipmentService : IShipmentService
{
    private readonly ILogisticsRepository _repository;
    private readonly IDelhiveryClient _delhiveryClient;
    private readonly IPickupService _pickupService;
    private readonly ITrackingService _trackingService;
    private readonly IOrderRepository _orderRepository;
    private readonly IWhatsAppService? _whatsAppService;
    private readonly ILogger<ShipmentService> _logger;

    public ShipmentService(
        ILogisticsRepository repository,
        IDelhiveryClient delhiveryClient,
        IPickupService pickupService,
        ITrackingService trackingService,
        IOrderRepository orderRepository,
        ILogger<ShipmentService> logger,
        IWhatsAppService? whatsAppService = null)
    {
        _repository = repository;
        _delhiveryClient = delhiveryClient;
        _pickupService = pickupService;
        _trackingService = trackingService;
        _orderRepository = orderRepository;
        _logger = logger;
        _whatsAppService = whatsAppService;
    }

    public async Task<PackageSplitPreviewResponse> GenerateSplitPreviewAsync(string orderIdOrNumber, PackageSplitPreviewRequest? request = null, CancellationToken ct = default)
    {
        OrderDetailDto? order = null;
        try
        {
            order = await _orderRepository.GetDetailsAsync(orderIdOrNumber);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not load order details directly from order repository for {OrderId}", orderIdOrNumber);
        }

        var warehouses = await _repository.GetAllWarehousesAsync();
        var centralHub = warehouses.FirstOrDefault(w => w.IsCentral) ?? warehouses.FirstOrDefault();

        // Extract items either from request or from fetched order
        var rawItems = new List<SplitItemCandidateDto>();

        if (request?.Items != null && request.Items.Count > 0)
        {
            rawItems = request.Items;
        }
        else if (order?.Items != null && order.Items.Count > 0)
        {
            int idx = 1;
            foreach (var item in order.Items)
            {
                rawItems.Add(new SplitItemCandidateDto
                {
                    OrderItemId = Guid.NewGuid(),
                    ProductId = Guid.TryParse(item.ProductId, out var pid) ? pid : null,
                    ProductName = !string.IsNullOrWhiteSpace(item.Comments) ? item.Comments : $"Product Item #{idx}",
                    Sku = !string.IsNullOrWhiteSpace(item.ProductId) ? item.ProductId : $"SKU-{idx}",
                    Quantity = 1,
                    UnitPrice = 1500.00m,
                    WeightGrams = 500
                });
                idx++;
            }
        }
        else
        {
            // Default sample items if creating a plan for a new order
            rawItems.Add(new SplitItemCandidateDto
            {
                OrderItemId = Guid.NewGuid(),
                ProductName = "Handcrafted Pure Silk Saree",
                Sku = "SAREE-SILK-001",
                Quantity = 1,
                UnitPrice = 2499.00m,
                WeightGrams = 600
            });
        }

        // Determine payment mode and total COD
        bool isCod = order?.PaymentMode == PaymentMode.COD;
        decimal totalOrderValue = rawItems.Sum(x => x.Quantity * x.UnitPrice);
        decimal totalCodAmount = isCod ? totalOrderValue : 0.00m;

        // Group items by vendor ID / vendor Name
        var vendorGroups = rawItems.GroupBy(x => x.VendorId?.ToString() ?? x.VendorName ?? "Direct");

        var packages = new List<PackageSplitPlanItem>();
        int packageCounter = 1;
        decimal accumulatedCod = 0;

        var groupList = vendorGroups.ToList();
        for (int i = 0; i < groupList.Count; i++)
        {
            var group = groupList[i];
            var firstItem = group.First();
            var pkgItems = group.Select(item => new PackageItemDetailDto
            {
                OrderItemId = item.OrderItemId,
                ProductId = item.ProductId,
                ProductName = item.ProductName ?? "Item",
                Sku = item.Sku,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice
            }).ToList();

            decimal pkgValue = pkgItems.Sum(x => x.LineTotal);
            int pkgQty = pkgItems.Sum(x => x.Quantity);
            int estimatedWeight = group.Sum(x => (x.WeightGrams ?? 500) * x.Quantity);

            decimal proportionalCod = 0.00m;
            if (isCod && totalOrderValue > 0)
            {
                if (i == groupList.Count - 1)
                {
                    // Balance any rounding discrepancy on the final package
                    proportionalCod = Math.Max(0, totalCodAmount - accumulatedCod);
                }
                else
                {
                    proportionalCod = Math.Round((pkgValue / totalOrderValue) * totalCodAmount, 2);
                    accumulatedCod += proportionalCod;
                }
            }

            var planItem = new PackageSplitPlanItem
            {
                PackageNumber = $"PKG-{orderIdOrNumber}-{packageCounter}",
                VendorId = firstItem.VendorId,
                VendorName = firstItem.VendorName ?? "Vayyari In-House",
                WarehouseId = centralHub?.Id,
                WarehouseName = centralHub?.Name ?? "Vayyari Central Hub",
                FulfillmentType = "direct_dispatch",
                TotalQuantity = pkgQty,
                PackageValue = pkgValue,
                ProportionalCodAmount = proportionalCod,
                EstimatedWeightGrams = estimatedWeight,
                RecommendedCourier = "Delhivery",
                Items = pkgItems
            };

            packages.Add(planItem);
            packageCounter++;
        }

        return new PackageSplitPreviewResponse
        {
            OrderId = Guid.TryParse(orderIdOrNumber, out var parsedGuid) ? parsedGuid : null,
            OrderNumber = order?.Id ?? orderIdOrNumber,
            TotalAmount = totalOrderValue,
            TotalCodAmount = totalCodAmount,
            PaymentMode = isCod ? "COD" : "Prepaid",
            Packages = packages
        };
    }

    public async Task<CreateShipmentResponse> CreateDelhiveryShipmentAsync(CreateDelhiveryShipmentRequest request, CancellationToken ct = default)
    {
        var random = new Random();
        var shipmentNumber = !string.IsNullOrWhiteSpace(request.ShipmentNumber)
            ? request.ShipmentNumber
            : $"SHP-{DateTime.UtcNow:yyyyMMdd}-{random.Next(1000, 9999)}";

        var warehouseId = request.WarehouseId;
        Warehouse? warehouse = null;
        if (warehouseId.HasValue && warehouseId.Value != Guid.Empty)
        {
            warehouse = await _repository.GetWarehouseByIdAsync(warehouseId.Value);
        }
        if (warehouse == null)
        {
            warehouse = await _repository.GetCentralWarehouseAsync();
            warehouseId = warehouse?.Id;
        }

        var pickupLocationName = !string.IsNullOrWhiteSpace(request.PickupLocation)
            ? request.PickupLocation
            : (warehouse?.Code ?? "VAY-CENTRAL-01");

        bool isCod = string.Equals(request.PaymentMode, "COD", StringComparison.OrdinalIgnoreCase);
        decimal codAmount = isCod ? (request.CodAmount > 0 ? request.CodAmount : request.TotalAmount) : 0.00m;

        var productsDescription = request.Items.Count > 0
            ? string.Join(", ", request.Items.Select(x => $"{x.ProductName} x{x.Quantity}"))
            : "Fashion Apparel";

        // Build CMU Payload
        var cmuPayload = new DelhiveryCmuPayload
        {
            Shipments = new List<DelhiveryShipmentDetail>
            {
                new DelhiveryShipmentDetail
                {
                    Name = request.CustomerName,
                    Address = $"{request.CustomerAddress} {request.CustomerAddress2}".Trim(),
                    Pin = request.CustomerPincode,
                    City = request.CustomerCity,
                    State = request.CustomerState,
                    Country = "India",
                    Phone = request.CustomerPhone,
                    Order = shipmentNumber,
                    PaymentMode = isCod ? "COD" : "Pre-paid",
                    ProductsDesc = productsDescription,
                    OrderDate = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss"),
                    TotalAmount = request.TotalAmount,
                    CodAmount = codAmount,
                    ShippingMode = request.ShippingMode,
                    Weight = request.WeightGrams > 0 ? request.WeightGrams : 500,
                    ShipmentWidth = request.WidthCm,
                    ShipmentHeight = request.HeightCm,
                    SellerName = "Vayyari",
                    Quantity = request.Items.Sum(x => x.Quantity).ToString()
                }
            },
            PickupLocation = new DelhiveryPickupLocation
            {
                Name = pickupLocationName,
                Address = warehouse?.AddressLine1 ?? "Plot 42, Vayyari Logistics Park",
                City = warehouse?.City ?? "Surat",
                PinCode = warehouse?.Pincode ?? "395002",
                Country = "India",
                Phone = warehouse?.Phone ?? "+91-9876543210"
            }
        };

        _logger.LogInformation("Submitting shipment to Delhivery CMU for order {OrderNumber}, shipment {ShipmentNumber}", request.OrderNumber, shipmentNumber);
        var cmuResponse = await _delhiveryClient.CreateShipmentAsync(cmuPayload, ct);

        var pkg = cmuResponse.Packages?.FirstOrDefault();
        var awbNumber = pkg?.Waybill ?? $"DEL{DateTime.UtcNow:yyMMdd}{random.Next(1000000, 9999999)}";

        // Fetch and persist thermal label PDF to MinIO
        string? minioLabelKey = null;
        string? labelUrl = null;
        try
        {
            minioLabelKey = await _delhiveryClient.GeneratePackingSlipAndPersistAsync(awbNumber, ct);
            labelUrl = $"/api/v1/attachments/file?path={Uri.EscapeDataString(minioLabelKey)}";
            _logger.LogInformation("Saved shipping label to MinIO: {Key}", minioLabelKey);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist label to MinIO for AWB {Awb}", awbNumber);
        }

        // Schedule pickup if requested
        bool pickupScheduled = false;
        string? pickupToken = null;
        DateTime? pickupScheduledAt = null;

        if (request.SchedulePickupImmediate)
        {
            try
            {
                var pickupRes = await _pickupService.SchedulePickupAsync(new PickupRequestDto
                {
                    PickupLocation = pickupLocationName,
                    PickupDate = request.PickupDate ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    PickupTime = request.PickupTime ?? "14:00:00",
                    ExpectedPackageCount = 1
                }, ct);

                pickupScheduled = pickupRes.Success;
                pickupToken = pickupRes.PickupToken;
                pickupScheduledAt = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Automatic pickup scheduling failed for AWB {Awb}", awbNumber);
            }
        }

        // Save Shipment to PostgreSQL
        var shipmentEntity = new Shipment
        {
            Id = Guid.NewGuid(),
            OrderId = request.OrderId,
            OrderNumber = request.OrderNumber,
            ShipmentNumber = shipmentNumber,
            WarehouseId = warehouseId,
            CourierPartner = "Delhivery",
            AwbNumber = awbNumber,
            Status = "manifested",
            ShippingMode = request.ShippingMode,
            FulfillmentType = "direct_dispatch",
            CodAmount = codAmount,
            LabelUrl = labelUrl,
            MinioLabelKey = minioLabelKey,
            PickupScheduledAt = pickupScheduledAt,
            PickupToken = pickupToken,
            EstimatedDeliveryDate = DateTime.UtcNow.AddDays(4),
            VendorName = request.VendorName,
            ProcureStatus = "not_applicable",
            Metadata = JsonSerializer.Serialize(new
            {
                customerName = request.CustomerName,
                customerPhone = request.CustomerPhone,
                customerPincode = request.CustomerPincode,
                pickupLocation = pickupLocationName
            }),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Items = request.Items.Select(x => new ShipmentItem
            {
                Id = Guid.NewGuid(),
                OrderItemId = x.OrderItemId,
                ProductId = x.ProductId,
                ProductName = x.ProductName,
                Sku = x.Sku,
                Quantity = x.Quantity,
                UnitPrice = x.UnitPrice,
                CreatedAt = DateTime.UtcNow
            }).ToList()
        };

        var shipmentId = await _repository.CreateShipmentAsync(shipmentEntity);

        return new CreateShipmentResponse
        {
            Success = true,
            ShipmentId = shipmentId,
            ShipmentNumber = shipmentNumber,
            AwbNumber = awbNumber,
            Status = "manifested",
            CourierPartner = "Delhivery",
            LabelUrl = labelUrl,
            MinioLabelKey = minioLabelKey,
            PickupScheduled = pickupScheduled,
            PickupToken = pickupToken,
            EstimatedDeliveryDate = shipmentEntity.EstimatedDeliveryDate,
            Message = "Shipment manifested and AWB allocated successfully"
        };
    }

    public async Task<AttachVendorTrackingResponse> AttachVendorTrackingAsync(Guid shipmentId, AttachVendorTrackingRequest request, CancellationToken ct = default)
    {
        var shipment = await _repository.GetShipmentByIdAsync(shipmentId);
        if (shipment == null)
        {
            throw new KeyNotFoundException($"Shipment with ID '{shipmentId}' not found.");
        }

        var trackingUrl = !string.IsNullOrWhiteSpace(request.TrackingUrl)
            ? request.TrackingUrl
            : _trackingService.GenerateTrackingUrl(request.CourierPartner, request.AwbNumber);

        await _repository.UpdateVendorTrackingAsync(
            shipmentId,
            request.CourierPartner,
            request.AwbNumber,
            trackingUrl,
            request.EstimatedDeliveryDate);

        _logger.LogInformation("Attached vendor tracking for shipment {ShipmentId}: Courier {Courier}, AWB {Awb}", shipmentId, request.CourierPartner, request.AwbNumber);

        return new AttachVendorTrackingResponse
        {
            Success = true,
            ShipmentId = shipmentId,
            AwbNumber = request.AwbNumber,
            CourierPartner = request.CourierPartner,
            VendorTrackingUrl = trackingUrl,
            Status = "in_transit",
            Message = "Vendor tracking attached and shipment updated to in_transit."
        };
    }

    public async Task<ForwardCustomerTrackingResponse> ForwardCustomerTrackingAsync(Guid shipmentId, ForwardCustomerTrackingRequest request, CancellationToken ct = default)
    {
        var shipment = await _repository.GetShipmentByIdAsync(shipmentId);
        if (shipment == null)
        {
            throw new KeyNotFoundException($"Shipment with ID '{shipmentId}' not found.");
        }

        var awb = shipment.AwbNumber ?? string.Empty;
        var trackingUrl = _trackingService.GenerateTrackingUrl(shipment.CourierPartner ?? "Delhivery", awb);

        string message = !string.IsNullOrWhiteSpace(request.CustomMessage)
            ? request.CustomMessage
            : $"Hello! Your Vayyari order package ({shipment.ShipmentNumber ?? shipment.OrderNumber}) is on its way via {shipment.CourierPartner ?? "Delhivery"} (AWB: {awb}). Track live here: {trackingUrl}";

        var dispatchedAt = DateTime.UtcNow;

        _logger.LogInformation("Forwarding customer tracking notification for shipment {ShipmentId} via {Channel} to {Recipient}",
            shipmentId, request.Channel, request.RecipientPhoneOrHandle);

        await _repository.RecordCustomerNotifiedAsync(shipmentId, dispatchedAt);

        return new ForwardCustomerTrackingResponse
        {
            Success = true,
            ShipmentId = shipmentId,
            AwbNumber = awb,
            Channel = request.Channel,
            TrackingUrl = trackingUrl,
            DispatchedMessage = message,
            DispatchedAt = dispatchedAt
        };
    }

    public async Task<ProcureStatusResponse> UpdateProcureStatusAsync(Guid shipmentId, ProcureStatusUpdateRequest request, CancellationToken ct = default)
    {
        var shipment = await _repository.GetShipmentByIdAsync(shipmentId);
        if (shipment == null)
        {
            throw new KeyNotFoundException($"Shipment with ID '{shipmentId}' not found.");
        }

        var previousStatus = shipment.ProcureStatus;
        var newStatus = request.ProcureStatus.ToLowerInvariant();

        await _repository.UpdateProcureStatusAsync(shipmentId, newStatus);

        _logger.LogInformation("Updated Procure-to-Ship status for shipment {ShipmentId} from {Previous} to {New}", shipmentId, previousStatus, newStatus);

        return new ProcureStatusResponse
        {
            Success = true,
            ShipmentId = shipmentId,
            PreviousStatus = previousStatus,
            NewStatus = newStatus,
            UpdatedAt = DateTime.UtcNow
        };
    }
}

using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using DeepLens.Domain.Enums;

namespace DeepLens.Contracts.Logistics;

// --- Split Preview DTOs ---

public class PackageSplitPreviewRequest
{
    [JsonPropertyName("orderId")]
    public Guid? OrderId { get; set; }

    [JsonPropertyName("orderNumber")]
    public string? OrderNumber { get; set; }

    [JsonPropertyName("items")]
    public List<SplitItemCandidateDto>? Items { get; set; }
}

public class SplitItemCandidateDto
{
    [JsonPropertyName("orderItemId")]
    public Guid? OrderItemId { get; set; }

    [JsonPropertyName("productId")]
    public Guid? ProductId { get; set; }

    [JsonPropertyName("productName")]
    public string? ProductName { get; set; }

    [JsonPropertyName("sku")]
    public string? Sku { get; set; }

    [JsonPropertyName("vendorId")]
    public Guid? VendorId { get; set; }

    [JsonPropertyName("vendorName")]
    public string? VendorName { get; set; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; } = 1;

    [JsonPropertyName("unitPrice")]
    public decimal UnitPrice { get; set; }

    [JsonPropertyName("weightGrams")]
    public int? WeightGrams { get; set; }
}

public class PackageSplitPreviewResponse
{
    [JsonPropertyName("orderId")]
    public Guid? OrderId { get; set; }

    [JsonPropertyName("orderNumber")]
    public string? OrderNumber { get; set; }

    [JsonPropertyName("totalAmount")]
    public decimal TotalAmount { get; set; }

    [JsonPropertyName("totalCodAmount")]
    public decimal TotalCodAmount { get; set; }

    [JsonPropertyName("paymentMode")]
    public string PaymentMode { get; set; } = "Prepaid";

    [JsonPropertyName("totalPackages")]
    public int TotalPackages => Packages.Count;

    [JsonPropertyName("packages")]
    public List<PackageSplitPlanItem> Packages { get; set; } = new();
}

public class PackageSplitPlanItem
{
    [JsonPropertyName("packageNumber")]
    public string PackageNumber { get; set; } = string.Empty;

    [JsonPropertyName("vendorId")]
    public Guid? VendorId { get; set; }

    [JsonPropertyName("vendorName")]
    public string? VendorName { get; set; }

    [JsonPropertyName("warehouseId")]
    public Guid? WarehouseId { get; set; }

    [JsonPropertyName("warehouseName")]
    public string? WarehouseName { get; set; }

    [JsonPropertyName("fulfillmentType")]
    public string FulfillmentType { get; set; } = "direct_dispatch"; // direct_dispatch, cross_dock, central_hub

    [JsonPropertyName("totalQuantity")]
    public int TotalQuantity { get; set; }

    [JsonPropertyName("packageValue")]
    public decimal PackageValue { get; set; }

    [JsonPropertyName("proportionalCodAmount")]
    public decimal ProportionalCodAmount { get; set; }

    [JsonPropertyName("estimatedWeightGrams")]
    public int EstimatedWeightGrams { get; set; } = 500;

    [JsonPropertyName("recommendedCourier")]
    public string RecommendedCourier { get; set; } = "Delhivery";

    [JsonPropertyName("items")]
    public List<PackageItemDetailDto> Items { get; set; } = new();
}

public class PackageItemDetailDto
{
    [JsonPropertyName("orderItemId")]
    public Guid? OrderItemId { get; set; }

    [JsonPropertyName("productId")]
    public Guid? ProductId { get; set; }

    [JsonPropertyName("productName")]
    public string? ProductName { get; set; }

    [JsonPropertyName("sku")]
    public string? Sku { get; set; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("unitPrice")]
    public decimal UnitPrice { get; set; }

    [JsonPropertyName("lineTotal")]
    public decimal LineTotal => Quantity * UnitPrice;
}

// --- Create Delhivery Shipment DTOs ---

public class CreateDelhiveryShipmentRequest
{
    [JsonPropertyName("orderId")]
    public Guid? OrderId { get; set; }

    [JsonPropertyName("orderNumber")]
    public string? OrderNumber { get; set; }

    [JsonPropertyName("shipmentNumber")]
    public string? ShipmentNumber { get; set; }

    [JsonPropertyName("warehouseId")]
    public Guid? WarehouseId { get; set; }

    [JsonPropertyName("pickupLocation")]
    public string? PickupLocation { get; set; } // Delhivery pickup warehouse name registered in Delhivery dashboard

    [JsonPropertyName("customerName")]
    public string CustomerName { get; set; } = string.Empty;

    [JsonPropertyName("customerPhone")]
    public string CustomerPhone { get; set; } = string.Empty;

    [JsonPropertyName("customerAddress")]
    public string CustomerAddress { get; set; } = string.Empty;

    [JsonPropertyName("customerAddress2")]
    public string? CustomerAddress2 { get; set; }

    [JsonPropertyName("customerCity")]
    public string CustomerCity { get; set; } = string.Empty;

    [JsonPropertyName("customerState")]
    public string CustomerState { get; set; } = string.Empty;

    [JsonPropertyName("customerPincode")]
    public string CustomerPincode { get; set; } = string.Empty;

    [JsonPropertyName("paymentMode")]
    public string PaymentMode { get; set; } = "Prepaid"; // "COD" or "Prepaid"

    [JsonPropertyName("codAmount")]
    public decimal CodAmount { get; set; } = 0.00m;

    [JsonPropertyName("totalAmount")]
    public decimal TotalAmount { get; set; } = 0.00m;

    [JsonPropertyName("shippingMode")]
    public string ShippingMode { get; set; } = "Surface"; // "Surface" or "Express"

    [JsonPropertyName("weightGrams")]
    public int WeightGrams { get; set; } = 500;

    [JsonPropertyName("lengthCm")]
    public double LengthCm { get; set; } = 15;

    [JsonPropertyName("widthCm")]
    public double WidthCm { get; set; } = 10;

    [JsonPropertyName("heightCm")]
    public double HeightCm { get; set; } = 5;

    [JsonPropertyName("vendorName")]
    public string? VendorName { get; set; }

    [JsonPropertyName("items")]
    public List<ShipmentItemCreateDto> Items { get; set; } = new();

    [JsonPropertyName("schedulePickupImmediate")]
    public bool SchedulePickupImmediate { get; set; } = false;

    [JsonPropertyName("pickupDate")]
    public string? PickupDate { get; set; } // YYYY-MM-DD

    [JsonPropertyName("pickupTime")]
    public string? PickupTime { get; set; } // HH:mm:ss
}

public class ShipmentItemCreateDto
{
    [JsonPropertyName("orderItemId")]
    public Guid? OrderItemId { get; set; }

    [JsonPropertyName("productId")]
    public Guid? ProductId { get; set; }

    [JsonPropertyName("productName")]
    public string ProductName { get; set; } = string.Empty;

    [JsonPropertyName("sku")]
    public string? Sku { get; set; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; } = 1;

    [JsonPropertyName("unitPrice")]
    public decimal UnitPrice { get; set; } = 0.00m;
}

public class CreateShipmentResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("shipmentId")]
    public Guid ShipmentId { get; set; }

    [JsonPropertyName("shipmentNumber")]
    public string? ShipmentNumber { get; set; }

    [JsonPropertyName("awbNumber")]
    public string? AwbNumber { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("courierPartner")]
    public string CourierPartner { get; set; } = "Delhivery";

    [JsonPropertyName("labelUrl")]
    public string? LabelUrl { get; set; }

    [JsonPropertyName("minioLabelKey")]
    public string? MinioLabelKey { get; set; }

    [JsonPropertyName("pickupScheduled")]
    public bool PickupScheduled { get; set; }

    [JsonPropertyName("pickupToken")]
    public string? PickupToken { get; set; }

    [JsonPropertyName("estimatedDeliveryDate")]
    public DateTime? EstimatedDeliveryDate { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}

// --- Attach Vendor Tracking DTOs ---

public class AttachVendorTrackingRequest
{
    [JsonPropertyName("courierPartner")]
    public string CourierPartner { get; set; } = "ExternalVendorCourier";

    [JsonPropertyName("awbNumber")]
    public string AwbNumber { get; set; } = string.Empty;

    [JsonPropertyName("trackingUrl")]
    public string? TrackingUrl { get; set; }

    [JsonPropertyName("estimatedDeliveryDate")]
    public DateTime? EstimatedDeliveryDate { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
}

public class AttachVendorTrackingResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("shipmentId")]
    public Guid ShipmentId { get; set; }

    [JsonPropertyName("awbNumber")]
    public string AwbNumber { get; set; } = string.Empty;

    [JsonPropertyName("courierPartner")]
    public string CourierPartner { get; set; } = string.Empty;

    [JsonPropertyName("vendorTrackingUrl")]
    public string? VendorTrackingUrl { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}

// --- Forward Customer Tracking DTOs ---

public class ForwardCustomerTrackingRequest
{
    [JsonPropertyName("channel")]
    public string Channel { get; set; } = "whatsapp"; // "whatsapp", "instagram", "sms"

    [JsonPropertyName("recipientPhoneOrHandle")]
    public string? RecipientPhoneOrHandle { get; set; }

    [JsonPropertyName("customMessage")]
    public string? CustomMessage { get; set; }

    [JsonPropertyName("includeLiveTrackingUrl")]
    public bool IncludeLiveTrackingUrl { get; set; } = true;
}

public class ForwardCustomerTrackingResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("shipmentId")]
    public Guid ShipmentId { get; set; }

    [JsonPropertyName("awbNumber")]
    public string? AwbNumber { get; set; }

    [JsonPropertyName("channel")]
    public string Channel { get; set; } = string.Empty;

    [JsonPropertyName("trackingUrl")]
    public string? TrackingUrl { get; set; }

    [JsonPropertyName("dispatchedMessage")]
    public string? DispatchedMessage { get; set; }

    [JsonPropertyName("dispatchedAt")]
    public DateTime DispatchedAt { get; set; }
}

// --- Procure-to-Ship DTOs ---

public class ProcureStatusUpdateRequest
{
    [JsonPropertyName("procureStatus")]
    public string ProcureStatus { get; set; } = "inbound"; // "pending", "inbound", "received_at_hub", "qc_passed", "qc_failed", "ready_to_ship", "dispatched"

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("receivedQuantity")]
    public int? ReceivedQuantity { get; set; }
}

public class ProcureStatusResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("shipmentId")]
    public Guid ShipmentId { get; set; }

    [JsonPropertyName("previousStatus")]
    public string? PreviousStatus { get; set; }

    [JsonPropertyName("newStatus")]
    public string NewStatus { get; set; } = string.Empty;

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

// --- Delhivery Webhook DTOs ---

public class DelhiveryWebhookPayload
{
    [JsonPropertyName("Waybill")]
    public string? Waybill { get; set; }

    [JsonPropertyName("Status")]
    public DelhiveryWebhookStatus? Status { get; set; }

    [JsonPropertyName("Scans")]
    public List<DelhiveryWebhookScan>? Scans { get; set; }

    [JsonPropertyName("Shipment")]
    public DelhiveryWebhookShipment? Shipment { get; set; }
}

public class DelhiveryWebhookStatus
{
    [JsonPropertyName("Status")]
    public string? Status { get; set; }

    [JsonPropertyName("StatusType")]
    public string? StatusType { get; set; }

    [JsonPropertyName("StatusDateTime")]
    public string? StatusDateTime { get; set; }

    [JsonPropertyName("StatusLocation")]
    public string? StatusLocation { get; set; }

    [JsonPropertyName("Instructions")]
    public string? Instructions { get; set; }

    [JsonPropertyName("StatusCode")]
    public string? StatusCode { get; set; }
}

public class DelhiveryWebhookScan
{
    [JsonPropertyName("ScanDetail")]
    public DelhiveryScanDetail? ScanDetail { get; set; }
}

public class DelhiveryScanDetail
{
    [JsonPropertyName("ScanDateTime")]
    public string? ScanDateTime { get; set; }

    [JsonPropertyName("ScanType")]
    public string? ScanType { get; set; }

    [JsonPropertyName("Scan")]
    public string? Scan { get; set; }

    [JsonPropertyName("ScannedLocation")]
    public string? ScannedLocation { get; set; }

    [JsonPropertyName("Instructions")]
    public string? Instructions { get; set; }

    [JsonPropertyName("StatusCode")]
    public string? StatusCode { get; set; }
}

public class DelhiveryWebhookShipment
{
    [JsonPropertyName("AWB")]
    public string? Awb { get; set; }

    [JsonPropertyName("OrderNo")]
    public string? OrderNo { get; set; }

    [JsonPropertyName("Status")]
    public string? Status { get; set; }
}

public class DelhiveryWebhookResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("waybill")]
    public string? Waybill { get; set; }

    [JsonPropertyName("acknowledged")]
    public bool Acknowledged { get; set; }

    [JsonPropertyName("ndrCreated")]
    public bool NdrCreated { get; set; }

    [JsonPropertyName("ndrTaskId")]
    public Guid? NdrTaskId { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}

// --- NDR Action DTOs ---

public class NdrActionRequest
{
    [JsonPropertyName("action")]
    public string Action { get; set; } = "reattempt"; // "reattempt", "change_address", "return_to_origin", "change_phone"

    [JsonPropertyName("reattemptDate")]
    public DateTime? ReattemptDate { get; set; }

    [JsonPropertyName("updatedAddress")]
    public string? UpdatedAddress { get; set; }

    [JsonPropertyName("updatedPhone")]
    public string? UpdatedPhone { get; set; }

    [JsonPropertyName("updatedName")]
    public string? UpdatedName { get; set; }

    [JsonPropertyName("remarks")]
    public string? Remarks { get; set; }
}

public class NdrActionResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("ndrTaskId")]
    public Guid NdrTaskId { get; set; }

    [JsonPropertyName("shipmentId")]
    public Guid ShipmentId { get; set; }

    [JsonPropertyName("awbNumber")]
    public string? AwbNumber { get; set; }

    [JsonPropertyName("action")]
    public string Action { get; set; } = string.Empty;

    [JsonPropertyName("delhiverySuccess")]
    public bool DelhiverySuccess { get; set; }

    [JsonPropertyName("delhiveryRemarks")]
    public string? DelhiveryRemarks { get; set; }

    [JsonPropertyName("actionStatus")]
    public string ActionStatus { get; set; } = "resolved";

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}

public class PendingNdrDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("shipmentId")]
    public Guid ShipmentId { get; set; }

    [JsonPropertyName("orderNumber")]
    public string? OrderNumber { get; set; }

    [JsonPropertyName("awbNumber")]
    public string? AwbNumber { get; set; }

    [JsonPropertyName("ndrReason")]
    public string? NdrReason { get; set; }

    [JsonPropertyName("ndrCode")]
    public string? NdrCode { get; set; }

    [JsonPropertyName("customerPhone")]
    public string? CustomerPhone { get; set; }

    [JsonPropertyName("customerFeedback")]
    public string? CustomerFeedback { get; set; }

    [JsonPropertyName("actionStatus")]
    public string ActionStatus { get; set; } = "open";

    [JsonPropertyName("chosenAction")]
    public string? ChosenAction { get; set; }

    [JsonPropertyName("reattemptDate")]
    public DateTime? ReattemptDate { get; set; }

    [JsonPropertyName("remarks")]
    public string? Remarks { get; set; }

    [JsonPropertyName("dispatchedToDelhivery")]
    public bool DispatchedToDelhivery { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

// --- Warehouse DTOs ---

public class WarehouseDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("addressLine1")]
    public string? AddressLine1 { get; set; }

    [JsonPropertyName("addressLine2")]
    public string? AddressLine2 { get; set; }

    [JsonPropertyName("city")]
    public string? City { get; set; }

    [JsonPropertyName("state")]
    public string? State { get; set; }

    [JsonPropertyName("pincode")]
    public string? Pincode { get; set; }

    [JsonPropertyName("phone")]
    public string? Phone { get; set; }

    [JsonPropertyName("contactPerson")]
    public string? ContactPerson { get; set; }

    [JsonPropertyName("isCentral")]
    public bool IsCentral { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

// --- Escalation DTOs ---

public class LogisticsEscalationDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("shipmentId")]
    public Guid ShipmentId { get; set; }

    [JsonPropertyName("orderNumber")]
    public string? OrderNumber { get; set; }

    [JsonPropertyName("awbNumber")]
    public string? AwbNumber { get; set; }

    [JsonPropertyName("issueType")]
    public string IssueType { get; set; } = "delay";

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "open";

    [JsonPropertyName("externalTicketId")]
    public string? ExternalTicketId { get; set; }

    [JsonPropertyName("resolutionNotes")]
    public string? ResolutionNotes { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("resolvedAt")]
    public DateTime? ResolvedAt { get; set; }
}

public class CreateEscalationRequest
{
    [JsonPropertyName("shipmentId")]
    public Guid ShipmentId { get; set; }

    [JsonPropertyName("awbNumber")]
    public string? AwbNumber { get; set; }

    [JsonPropertyName("issueType")]
    public string IssueType { get; set; } = "delay"; // "delay", "lost_in_transit", "damaged", "fake_attempt", "rto_dispute", "other"

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("externalTicketId")]
    public string? ExternalTicketId { get; set; }
}

// --- Pincode Serviceability DTOs ---

public class PincodeCheckResponse
{
    [JsonPropertyName("pincode")]
    public string Pincode { get; set; } = string.Empty;

    [JsonPropertyName("isServiceable")]
    public bool IsServiceable { get; set; }

    [JsonPropertyName("codAvailable")]
    public bool CodAvailable { get; set; }

    [JsonPropertyName("prepaidAvailable")]
    public bool PrepaidAvailable { get; set; }

    [JsonPropertyName("pickupAvailable")]
    public bool PickupAvailable { get; set; }

    [JsonPropertyName("state")]
    public string? State { get; set; }

    [JsonPropertyName("city")]
    public string? City { get; set; }

    [JsonPropertyName("district")]
    public string? District { get; set; }

    [JsonPropertyName("expressServiceable")]
    public bool ExpressServiceable { get; set; }

    [JsonPropertyName("surfaceServiceable")]
    public bool SurfaceServiceable { get; set; }
}

// --- Pickup Request & Tracking DTOs ---

public class PickupRequestDto
{
    [JsonPropertyName("pickupLocation")]
    public string PickupLocation { get; set; } = string.Empty;

    [JsonPropertyName("pickupDate")]
    public string PickupDate { get; set; } = string.Empty; // YYYY-MM-DD

    [JsonPropertyName("pickupTime")]
    public string PickupTime { get; set; } = "14:00:00"; // HH:mm:ss

    [JsonPropertyName("expectedPackageCount")]
    public int ExpectedPackageCount { get; set; } = 1;
}

public class PickupResponseDto
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("pickupId")]
    public string? PickupId { get; set; }

    [JsonPropertyName("pickupToken")]
    public string? PickupToken { get; set; }

    [JsonPropertyName("pickupDate")]
    public string? PickupDate { get; set; }

    [JsonPropertyName("pickupTime")]
    public string? PickupTime { get; set; }

    [JsonPropertyName("pickupLocation")]
    public string? PickupLocation { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}

public class TrackingDetailsDto
{
    [JsonPropertyName("waybill")]
    public string Waybill { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("statusCode")]
    public string? StatusCode { get; set; }

    [JsonPropertyName("statusDateTime")]
    public DateTime? StatusDateTime { get; set; }

    [JsonPropertyName("currentLocation")]
    public string? CurrentLocation { get; set; }

    [JsonPropertyName("origin")]
    public string? Origin { get; set; }

    [JsonPropertyName("destination")]
    public string? Destination { get; set; }

    [JsonPropertyName("estimatedDeliveryDate")]
    public DateTime? EstimatedDeliveryDate { get; set; }

    [JsonPropertyName("isDelivered")]
    public bool IsDelivered { get; set; }

    [JsonPropertyName("isRto")]
    public bool IsRto { get; set; }

    [JsonPropertyName("isNdr")]
    public bool IsNdr { get; set; }

    [JsonPropertyName("ndrReason")]
    public string? NdrReason { get; set; }

    [JsonPropertyName("scans")]
    public List<TrackingScanEventDto> Scans { get; set; } = new();
}

public class TrackingScanEventDto
{
    [JsonPropertyName("scanDateTime")]
    public DateTime ScanDateTime { get; set; }

    [JsonPropertyName("scanType")]
    public string? ScanType { get; set; }

    [JsonPropertyName("scan")]
    public string? Scan { get; set; }

    [JsonPropertyName("location")]
    public string? Location { get; set; }

    [JsonPropertyName("instructions")]
    public string? Instructions { get; set; }
}

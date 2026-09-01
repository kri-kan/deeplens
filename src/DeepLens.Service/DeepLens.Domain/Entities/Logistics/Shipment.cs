using System;
using System.Collections.Generic;
using DeepLens.Domain.Enums;

namespace DeepLens.Domain.Entities.Logistics;

public class Shipment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public string? ShipmentNumber { get; set; }
    public Guid? WarehouseId { get; set; }
    public string? CourierPartner { get; set; } = "Delhivery";
    public string? AwbNumber { get; set; }
    public string Status { get; set; } = "pending";
    public string ShippingMode { get; set; } = "Surface";
    public string FulfillmentType { get; set; } = "direct_dispatch";
    public decimal CodAmount { get; set; } = 0.00m;
    public string? LabelUrl { get; set; }
    public string? MinioLabelKey { get; set; }
    public DateTime? PickupScheduledAt { get; set; }
    public string? PickupToken { get; set; }
    public DateTime? EstimatedDeliveryDate { get; set; }
    public string? VendorName { get; set; }
    public string? VendorTrackingUrl { get; set; }
    public DateTime? CustomerNotifiedAt { get; set; }
    public string ProcureStatus { get; set; } = "not_applicable";
    public string Metadata { get; set; } = "{}";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<ShipmentItem> Items { get; set; } = new();
}

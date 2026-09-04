using System;

namespace DeepLens.Domain.Entities.Logistics;

public class VendorLogisticsConfig
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? VendorId { get; set; }
    public string? VendorName { get; set; }
    public string FulfillmentMode { get; set; } = "direct_dispatch"; // direct_dispatch, cross_dock, central_hub
    public Guid? ReturnWarehouseId { get; set; }
    public string? DefaultPickupPincode { get; set; }
    public bool AutoManifest { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

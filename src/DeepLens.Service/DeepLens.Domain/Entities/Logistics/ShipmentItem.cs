using System;

namespace DeepLens.Domain.Entities.Logistics;

public class ShipmentItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ShipmentId { get; set; }
    public Guid? OrderItemId { get; set; }
    public Guid? ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? Sku { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; } = 0.00m;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

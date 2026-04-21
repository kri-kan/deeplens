using System;

namespace DeepLens.Domain.Entities.Catalog;

public class MasterPriceHistory
{
    public Guid Id { get; set; }
    public Guid MasterProductId { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal ResellerPrice { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public MasterProduct? MasterProduct { get; set; }
}

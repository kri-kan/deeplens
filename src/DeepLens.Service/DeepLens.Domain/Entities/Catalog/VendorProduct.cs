using System;
using System.Collections.Generic;

namespace DeepLens.Domain.Entities.Catalog;

public class VendorProduct
{
    public Guid Id { get; set; }
    public Guid MasterProductId { get; set; }
    public decimal VendorPrice { get; set; }
    public string? ExclusiveDescription { get; set; }
    public string? Category { get; set; }
    public string? Title { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // References to the Master media IDs (maps vendor-specific keys to MediaRegistry IDs)
    public Dictionary<string, Guid> MediaMap { get; set; } = new();

    // Navigation
    public MasterProduct? MasterProduct { get; set; }
}

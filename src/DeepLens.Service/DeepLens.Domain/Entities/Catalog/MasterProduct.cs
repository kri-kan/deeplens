using System;
using System.Collections.Generic;

namespace DeepLens.Domain.Entities.Catalog;

public class MasterProduct
{
    public Guid Id { get; set; }
    public string? MasterDescription { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal ResellerPrice { get; set; }
    public string? Category { get; set; }
    public string? Fabric { get; set; }
    public string? StitchType { get; set; }
    public string? WorkHeaviness { get; set; }
    
    // Consolidated media IDs
    public List<Guid> MediaIds { get; set; } = new();

    // Navigation
    public ICollection<VendorProduct> VendorProducts { get; set; } = new List<VendorProduct>();
    public ICollection<MasterPriceHistory> PriceHistories { get; set; } = new List<MasterPriceHistory>();
}

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
    public string? ProductCode { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<MediaEntry> Media { get; set; } = new();
    public Dictionary<string, Guid> MediaMap { get; set; } = new();
}

public class MediaEntry
{
    public Guid Id { get; set; }
    public string? Path { get; set; }
    public bool IsDefault { get; set; }
}

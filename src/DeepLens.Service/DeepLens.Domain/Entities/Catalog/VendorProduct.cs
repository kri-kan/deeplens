using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace DeepLens.Domain.Entities.Catalog;

public class VendorProduct
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("masterProductId")]
    public Guid MasterProductId { get; set; }

    [JsonPropertyName("vendorPrice")]
    public decimal VendorPrice { get; set; }

    [JsonPropertyName("exclusiveDescription")]
    public string? ExclusiveDescription { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("fabric")]
    public string? Fabric { get; set; }

    [JsonPropertyName("stitchType")]
    public string? StitchType { get; set; }

    [JsonPropertyName("workHeaviness")]
    public string? WorkHeaviness { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("productCode")]
    public string? ProductCode { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("media")]
    public List<MediaEntry> Media { get; set; } = new();

    [JsonPropertyName("mediaMap")]
    public Dictionary<string, Guid> MediaMap { get; set; } = new();
}

public class MediaEntry
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("storagePath")]
    public string? StoragePath { get; set; }

    [JsonPropertyName("color")]
    public string? Color { get; set; }

    [JsonPropertyName("isDefault")]
    public bool IsDefault { get; set; }
}


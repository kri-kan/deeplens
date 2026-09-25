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

    /// <summary>Total media count linked to this product across all attachments.</summary>
    [JsonPropertyName("mediaCount")]
    public int MediaCount { get; set; }

    /// <summary>Product tags including review flags such as 'needs-zoning-review'.</summary>
    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = new();

    [JsonPropertyName("mediaMap")]
    public Dictionary<string, Guid> MediaMap { get; set; } = new();

    /// <summary>WhatsApp group JID this product was sourced from.</summary>
    [JsonPropertyName("sourceJid")]
    public string? SourceJid { get; set; }

    /// <summary>WhatsApp message group ID for navigating to the source messages.</summary>
    [JsonPropertyName("sourceGroupId")]
    public string? SourceGroupId { get; set; }

    /// <summary>All vendor listings associated with this product.</summary>
    [JsonPropertyName("listings")]
    public List<VendorListingDto> Listings { get; set; } = new();

    /// <summary>Number of active vendor listings associated with this product.</summary>
    [JsonPropertyName("listingCount")]
    public int ListingCount { get; set; }

    [JsonPropertyName("isStarred")]
    public bool IsStarred { get; set; } = false;

    [JsonPropertyName("unifiedAttributes")]
    public Dictionary<string, object>? UnifiedAttributes { get; set; }

    [JsonPropertyName("craft")]
    public string? Craft { get; set; }

    [JsonPropertyName("motif")]
    public string? Motif { get; set; }

    [JsonPropertyName("border")]
    public string? Border { get; set; }

    [JsonPropertyName("occasions")]
    public List<string> Occasions { get; set; } = new();

    [JsonPropertyName("confidenceScore")]
    public int? ConfidenceScore { get; set; }
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

    [JsonPropertyName("mediaType")]
    public int? MediaType { get; set; }
}

/// <summary>
/// A single vendor listing row joined with the vendor's display name.
/// Returned as part of the product detail response.
/// </summary>
public class VendorListingDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("vendorId")]
    public Guid VendorId { get; set; }

    [JsonPropertyName("vendorName")]
    public string? VendorName { get; set; }

    [JsonPropertyName("price")]
    public decimal? Price { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "INR";

    [JsonPropertyName("isPlusShipping")]
    public bool IsPlusShipping { get; set; } = true;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime? UpdatedAt { get; set; }

    [JsonPropertyName("sourceGroupId")]
    public string? SourceGroupId { get; set; }

    /// <summary>JID of the WhatsApp chat this listing was sourced from. Resolved via wa.message_groups.</summary>
    [JsonPropertyName("sourceJid")]
    public string? SourceJid { get; set; }
}

using Microsoft.AspNetCore.Http;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using DeepLens.Contracts.Media;
using DeepLens.Domain.Enums;

namespace DeepLens.SearchApi.DTOs;

// ────────────────────────────────────────────────
//  Product DTOs
// ────────────────────────────────────────────────

/// <summary>
/// Multipart form request for creating a new vendor product.
/// </summary>
public class ProductRequest
{
    [JsonPropertyName("title")]
    [FromForm(Name = "title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    [FromForm(Name = "description")]
    public string? Description { get; set; }

    [JsonPropertyName("vendorPrice")]
    [FromForm(Name = "vendorPrice")]
    public decimal VendorPrice { get; set; }

    [JsonPropertyName("category")]
    [FromForm(Name = "category")]
    public MediaCategory? Category { get; set; }

    [JsonPropertyName("subCategory")]
    [FromForm(Name = "subCategory")]
    public string? SubCategory { get; set; }

    [JsonPropertyName("retention")]
    [FromForm(Name = "retention")]
    public string? Retention { get; set; }

    [JsonPropertyName("fabric")]
    [FromForm(Name = "fabric")]
    public string? Fabric { get; set; }

    [JsonPropertyName("stitchType")]
    [FromForm(Name = "stitchType")]
    public string? StitchType { get; set; }

    [JsonPropertyName("workHeaviness")]
    [FromForm(Name = "workHeaviness")]
    public string? WorkHeaviness { get; set; }

    [JsonPropertyName("color")]
    [FromForm(Name = "color")]
    public string? Color { get; set; }

    [JsonPropertyName("tags")]
    [FromForm(Name = "tags")]
    public List<string> Tags { get; set; } = new();

    [JsonPropertyName("sourcePostId")]
    [FromForm(Name = "sourcePostId")]
    public Guid? SourcePostId { get; set; }

    [JsonIgnore] // Not serialized for JSON body, handled as form-data
    [FromForm(Name = "files")]
    public List<IFormFile>? Files { get; set; }
}

/// <summary>
/// Request body for merging two or more vendor/master products.
/// </summary>
public class MergeRequest
{
    [JsonPropertyName("targetMasterId")]
    public Guid TargetMasterId { get; set; }

    [JsonPropertyName("sourceProductIds")]
    public List<Guid> SourceProductIds { get; set; } = new();

    [JsonPropertyName("isVendorProductIds")]
    public bool IsVendorProductIds { get; set; }
}

/// <summary>
/// Request body for linking an Instagram post to a product.
/// </summary>
public record InstaLinkRequest(
    [property: JsonPropertyName("postId")] Guid PostId,
    [property: JsonPropertyName("productId")] Guid ProductId,
    [property: JsonPropertyName("linkType")] InstagramLinkType LinkType = InstagramLinkType.Is
);

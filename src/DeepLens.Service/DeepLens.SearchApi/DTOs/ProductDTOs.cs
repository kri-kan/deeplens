using Microsoft.AspNetCore.Http;

namespace DeepLens.SearchApi.DTOs;

// ────────────────────────────────────────────────
//  Product DTOs
// ────────────────────────────────────────────────

/// <summary>
/// Multipart form request for creating a new vendor product.
/// </summary>
public class ProductRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal VendorPrice { get; set; }
    public string? Category { get; set; }
    public string? Retention { get; set; }
    public List<IFormFile>? Files { get; set; }
}

/// <summary>
/// Request body for merging two or more vendor/master products.
/// </summary>
public class MergeRequest
{
    public Guid TargetMasterId { get; set; }
    public List<Guid> SourceProductIds { get; set; } = new();
    public bool IsVendorProductIds { get; set; }
}

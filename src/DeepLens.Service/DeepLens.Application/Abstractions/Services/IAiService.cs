using System.Threading.Tasks;

namespace DeepLens.Application.Abstractions.Services;

public class ExtractedProductInfo
{
    public string Category { get; set; } = string.Empty;
    public string SubCategory { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public decimal? Price { get; set; }
    public bool IsPlusShipping { get; set; } = true;
    public string Fabric { get; set; } = string.Empty;
    public string StitchType { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string[] Sizes { get; set; } = System.Array.Empty<string>();
    public string[] Tags { get; set; } = System.Array.Empty<string>();
}

public interface IAiService
{
    /// <summary>
    /// Generates a YouTube Short title based on the description using Google Shorts Title Guidelines.
    /// </summary>
    /// <param name="description">The video description/caption.</param>
    /// <returns>A generated title string.</returns>
    Task<string> GenerateYoutubeShortTitleAsync(string description);

    /// <summary>
    /// Extracts structured product details from a WhatsApp text description.
    /// </summary>
    /// <param name="description">The text description of the product.</param>
    /// <param name="isManual">When true, the request is treated as high-priority in the reasoning service queue.</param>
    /// <returns>Extracted product details containing category, sub-category, price, shipping, fabric, stitch type, and tags.</returns>
    Task<ExtractedProductInfo> ExtractProductInfoAsync(string description, bool isManual = false);

    /// <summary>
    /// Generates high-converting social media share caption with Product ID enforcement from ReasoningService.
    /// </summary>
    Task<string> GenerateShareDescriptionAsync(ProductShareDescriptionDto dto, System.Threading.CancellationToken ct = default);
}

public class ProductShareDescriptionDto
{
    public string? ProductId { get; set; }
    public string? BaseSku { get; set; }
    public string? Title { get; set; }
    public decimal? VendorPrice { get; set; }
    public string? TargetPlatform { get; set; }
    public string? RawDescription { get; set; }
    public string? Category { get; set; }
    public string? Fabric { get; set; }
    public string? StitchType { get; set; }
    public string? Color { get; set; }
}

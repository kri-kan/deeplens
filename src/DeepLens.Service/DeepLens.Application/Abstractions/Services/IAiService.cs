using System.Threading.Tasks;

namespace DeepLens.Application.Abstractions.Services;

public class ExtractedProductInfo
{
    public string Category { get; set; } = string.Empty;
    public string SubCategory { get; set; } = string.Empty;
    public decimal? Price { get; set; }
    public string ShippingInfo { get; set; } = string.Empty; // "free" | "extra"
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
    /// <returns>Extracted product details containing category, sub-category, price, shipping, fabric, stitch type, and tags.</returns>
    Task<ExtractedProductInfo> ExtractProductInfoAsync(string description);
}

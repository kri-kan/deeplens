namespace DeepLens.Domain.ValueObjects;

/// <summary>
/// Thumbnail specification defining output format and quality parameters
/// </summary>
public class ThumbnailSpecification
{
    /// <summary>
    /// Unique name for this specification (e.g., "small", "medium", "large", "web-optimized")
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Maximum width in pixels (image scaled to fit within while preserving aspect ratio)
    /// </summary>
    public int MaxWidth { get; set; }
    
    /// <summary>
    /// Maximum height in pixels (image scaled to fit within while preserving aspect ratio)
    /// </summary>
    public int MaxHeight { get; set; }
    
    /// <summary>
    /// Output format: jpeg, webp, png, avif, jxl
    /// </summary>
    public ThumbnailFormat Format { get; set; } = ThumbnailFormat.WebP;
    
    /// <summary>
    /// Fit mode - always 'inside' to preserve aspect ratio (Google Image Search style)
    /// </summary>
    public FitMode FitMode { get; set; } = FitMode.Inside;
    
    /// <summary>
    /// Strip EXIF metadata from thumbnails (privacy & file size)
    /// </summary>
    public bool StripMetadata { get; set; } = true;
    
    /// <summary>
    /// Background color when flattening transparent images (hex color, e.g., "#FFFFFF")
    /// Only applied if source image has transparency and needs flattening
    /// </summary>
    public string BackgroundColor { get; set; } = "#FFFFFF";
    
    /// <summary>
    /// Format-specific options (stored as JSON for flexibility)
    /// </summary>
    public FormatOptions Options { get; set; } = new();
}

/// <summary>
/// Supported thumbnail formats
/// </summary>
public enum ThumbnailFormat
{
    Jpeg,
    WebP,
    Png,
    Avif,
    JpegXL
}

/// <summary>
/// Fit mode for resizing (always 'inside' to preserve aspect ratio)
/// </summary>
public enum FitMode
{
    /// <summary>
    /// Scale down to fit within dimensions, preserve aspect ratio (default)
    /// </summary>
    Inside,
    
    /// <summary>
    /// Scale to cover dimensions, preserve aspect ratio, may crop edges
    /// </summary>
    Cover,
    
    /// <summary>
    /// Scale to contain within dimensions, preserve aspect ratio, may have letterboxing
    /// </summary>
    Contain
}

/// <summary>
/// Format-specific options container
/// Each format has different attributes stored as strongly-typed objects
/// </summary>
public class FormatOptions
{
    public JpegOptions? Jpeg { get; set; }
    public WebPOptions? WebP { get; set; }
    public PngOptions? Png { get; set; }
    public AvifOptions? Avif { get; set; }
    public JpegXLOptions? JpegXL { get; set; }
}

/// <summary>
/// JPEG format options
/// </summary>
public class JpegOptions
{
    /// <summary>
    /// Quality: 0-100 (recommended: 70-95, default: 85)
    /// </summary>
    public int Quality { get; set; } = 85;
    
    /// <summary>
    /// Use progressive JPEG encoding (better for web)
    /// </summary>
    public bool Progressive { get; set; } = true;
    
    /// <summary>
    /// Optimize Huffman tables for smaller file size
    /// </summary>
    public bool Optimize { get; set; } = true;
    
    /// <summary>
    /// Chroma subsampling: 444 (best quality), 422 (good), 420 (smaller files)
    /// </summary>
    public string ChromaSubsampling { get; set; } = "4:2:0";
}

/// <summary>
/// WebP format options
/// </summary>
public class WebPOptions
{
    /// <summary>
    /// Quality: 0-100 (default: 85)
    /// </summary>
    public int Quality { get; set; } = 85;
    
    /// <summary>
    /// Use lossless compression (larger files, perfect quality)
    /// </summary>
    public bool Lossless { get; set; } = false;
    
    /// <summary>
    /// Compression method: 0-6 (higher = better compression but slower, default: 4)
    /// </summary>
    public int Method { get; set; } = 4;
    
    /// <summary>
    /// Alpha channel quality: 0-100 (default: 90)
    /// </summary>
    public int AlphaQuality { get; set; } = 90;
}

/// <summary>
/// PNG format options
/// </summary>
public class PngOptions
{
    /// <summary>
    /// Compression level: 0-9 (0=none, 9=best, default: 6)
    /// </summary>
    public int CompressionLevel { get; set; } = 6;
    
    /// <summary>
    /// Use Adam7 interlacing (progressive loading)
    /// </summary>
    public bool Interlace { get; set; } = false;
    
    /// <summary>
    /// PNG filter type: None, Sub, Up, Average, Paeth, All (auto-select)
    /// </summary>
    public string Filter { get; set; } = "All";
}

/// <summary>
/// AVIF format options (modern, excellent compression)
/// </summary>
public class AvifOptions
{
    /// <summary>
    /// Quality: 0-100 (default: 80, AVIF has better compression so lower values acceptable)
    /// </summary>
    public int Quality { get; set; } = 80;
    
    /// <summary>
    /// Encoding speed: 0-10 (0=slowest/best, 10=fastest/lower quality, default: 6)
    /// </summary>
    public int Speed { get; set; } = 6;
    
    /// <summary>
    /// Chroma subsampling: 444 (best), 422 (good), 420 (smaller)
    /// </summary>
    public string ChromaSubsampling { get; set; } = "4:2:0";
}

/// <summary>
/// JPEG XL format options (future format, excellent compression & quality)
/// </summary>
public class JpegXLOptions
{
    /// <summary>
    /// Quality: 0-100 (default: 85)
    /// </summary>
    public int Quality { get; set; } = 85;
    
    /// <summary>
    /// Encoding effort: 1-9 (higher = better compression but slower, default: 7)
    /// </summary>
    public int Effort { get; set; } = 7;
    
    /// <summary>
    /// Use lossless compression
    /// </summary>
    public bool Lossless { get; set; } = false;
}

using Microsoft.AspNetCore.Http;

namespace DeepLens.Contracts.Ingestion;

public record UploadImageRequest
{
    public required IFormFile File { get; init; }
    public required string SellerId { get; init; }
    public string? ExternalId { get; init; } // Seller's own unique ID
    
    public decimal? Price { get; init; }
    public string? Currency { get; init; } = "INR";
    public string? Description { get; init; } // Unstructured data
    
    public string? Category { get; init; } // e.g. "Saree"
    public List<string>? Tags { get; init; } // ["unstitched", "silk"]
    
    public string? Sku { get; init; } // User provided SKU (if any)
    public string? Color { get; init; }
    public string? Fabric { get; init; }
    public string? StitchType { get; init; } // stitched/unstitched/semi-stitched
    public string? WorkHeaviness { get; init; } // heavy/medium/low/no
    
    // Secondary Attributes (Keywords)
    public string? Occasion { get; init; } // partywear/regular/rich
    public List<string>? Patterns { get; init; } // line, checks, floral
    
    public Dictionary<string, string>? AdditionalMetadata { get; init; } // Catch-all for other flexible metadata
}

public record BulkUploadImageRequest
{
    public string? SellerId { get; init; }
    public string? Category { get; init; }
    public List<BulkImageItem> Images { get; init; } = new();
}

public record BulkImageItem
{
    public string FileName { get; init; } = string.Empty; // Maps metadata to the uploaded file
    public string? ExternalId { get; init; }
    public decimal? Price { get; init; }
    public string? Currency { get; init; }
    public string? Description { get; init; }
    public string? Sku { get; init; }
    public string? Color { get; init; }
    public string? Fabric { get; init; }
    public string? StitchType { get; init; }
    public string? WorkHeaviness { get; init; }
    public string? Occasion { get; init; }
    public List<string>? Patterns { get; init; }
    public List<string>? Tags { get; init; }
    public Dictionary<string, string>? AdditionalMetadata { get; init; }
}

public record BulkUploadResponse
{
    public int TotalProcessed { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<ImageResult> Results { get; set; } = new();
}

public record ImageResult
{
    public string FileName { get; set; } = string.Empty;
    public Guid? ImageId { get; set; }
    public bool Success { get; set; }
    public string? Error { get; set; }
}

public record UploadImageResponse
{
    public Guid ImageId { get; init; }
    public string Status { get; init; } = "Uploaded";
    public string? Message { get; init; }
}

public record ProductMergeRequest
{
    public string TargetSku { get; init; } = string.Empty;
    public string SourceSku { get; init; } = string.Empty;
    public bool DeleteSourceAfterMerge { get; init; } = true;
}

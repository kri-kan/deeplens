using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;
using DeepLens.Contracts.Media;

namespace DeepLens.Contracts.Ingestion;

public record UploadImageRequest
{
    [JsonIgnore]
    public required IFormFile File { get; init; }

    [JsonPropertyName("sellerId")]
    public required string SellerId { get; init; }

    [JsonPropertyName("externalId")]
    public string? ExternalId { get; init; }

    [JsonPropertyName("price")]
    public decimal? Price { get; init; }

    [JsonPropertyName("currency")]
    public string? Currency { get; init; } = "INR";

    [JsonPropertyName("description")]
    public string? Description { get; init; }

    [JsonPropertyName("category")]
    public MediaCategory Category { get; init; } = MediaCategory.Product;

    [JsonPropertyName("subCategory")]
    public string SubCategory { get; init; } = "General";

    [JsonPropertyName("retention")]
    public string? Retention { get; init; }

    [JsonPropertyName("tags")]
    public List<string>? Tags { get; init; }

    [JsonPropertyName("sku")]
    public string? Sku { get; init; }

    [JsonPropertyName("color")]
    public string? Color { get; init; }

    [JsonPropertyName("fabric")]
    public string? Fabric { get; init; }

    [JsonPropertyName("stitchType")]
    public string? StitchType { get; init; }

    [JsonPropertyName("workHeaviness")]
    public string? WorkHeaviness { get; init; }

    [JsonPropertyName("occasion")]
    public string? Occasion { get; init; }

    [JsonPropertyName("patterns")]
    public List<string>? Patterns { get; init; }

    [JsonPropertyName("additionalMetadata")]
    public Dictionary<string, string>? AdditionalMetadata { get; init; }

    [JsonPropertyName("sequenceId")]
    public int? SequenceId { get; set; }
}

public record BulkUploadImageRequest
{
    [JsonPropertyName("sellerId")]
    public string? SellerId { get; init; }

    [JsonPropertyName("category")]
    public MediaCategory Category { get; init; } = MediaCategory.Product;

    [JsonPropertyName("subCategory")]
    public string SubCategory { get; init; } = "General";

    [JsonPropertyName("retention")]
    public string? Retention { get; init; }

    [JsonPropertyName("images")]
    public List<BulkImageItem> Images { get; init; } = new();
}

public record BulkImageItem
{
    [JsonPropertyName("fileName")]
    public string FileName { get; init; } = string.Empty;

    [JsonPropertyName("externalId")]
    public string? ExternalId { get; init; }

    [JsonPropertyName("price")]
    public decimal? Price { get; init; }

    [JsonPropertyName("currency")]
    public string? Currency { get; init; }

    [JsonPropertyName("description")]
    public string? Description { get; init; }

    [JsonPropertyName("sku")]
    public string? Sku { get; init; }

    [JsonPropertyName("color")]
    public string? Color { get; init; }

    [JsonPropertyName("fabric")]
    public string? Fabric { get; init; }

    [JsonPropertyName("stitchType")]
    public string? StitchType { get; init; }

    [JsonPropertyName("workHeaviness")]
    public string? WorkHeaviness { get; init; }

    [JsonPropertyName("occasion")]
    public string? Occasion { get; init; }

    [JsonPropertyName("patterns")]
    public List<string>? Patterns { get; init; }

    [JsonPropertyName("tags")]
    public List<string>? Tags { get; init; }

    [JsonPropertyName("additionalMetadata")]
    public Dictionary<string, string>? AdditionalMetadata { get; init; }
}

public record BulkUploadResponse
{
    [JsonPropertyName("totalProcessed")]
    public int TotalProcessed { get; set; }

    [JsonPropertyName("successCount")]
    public int SuccessCount { get; set; }

    [JsonPropertyName("failureCount")]
    public int FailureCount { get; set; }

    [JsonPropertyName("results")]
    public List<ImageResult> Results { get; set; } = new();
}

public record ImageResult
{
    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = string.Empty;

    [JsonPropertyName("imageId")]
    public Guid? ImageId { get; set; }

    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

public record UploadImageResponse
{
    [JsonPropertyName("imageId")]
    public Guid ImageId { get; init; }

    [JsonPropertyName("status")]
    public string Status { get; init; } = "Uploaded";

    [JsonPropertyName("message")]
    public string? Message { get; init; }
}

public record ProductMergeRequest
{
    [JsonPropertyName("targetSku")]
    public string TargetSku { get; init; } = string.Empty;

    [JsonPropertyName("sourceSku")]
    public string SourceSku { get; init; } = string.Empty;

    [JsonPropertyName("deleteSourceAfterMerge")]
    public bool DeleteSourceAfterMerge { get; init; } = true;
}

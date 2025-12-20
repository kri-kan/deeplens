using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Events;

/// <summary>
/// Base class for all DeepLens Kafka events providing common properties and structure.
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "eventType")]
[JsonDerivedType(typeof(ImageUploadedEvent), "image.uploaded")]
[JsonDerivedType(typeof(FeatureExtractionRequestedEvent), "feature.extraction.requested")]
[JsonDerivedType(typeof(VectorIndexingRequestedEvent), "vector.indexing.requested")]
[JsonDerivedType(typeof(ProcessingCompletedEvent), "processing.completed")]
[JsonDerivedType(typeof(ProcessingFailedEvent), "processing.failed")]
[JsonDerivedType(typeof(ImageDeletionRequestedEvent), "image.deletion.requested")]
public class BaseEvent
{
    [JsonPropertyName("eventId")]
    public required Guid EventId { get; set; }

    [JsonPropertyName("eventType")]
    public required string EventType { get; set; }

    [JsonPropertyName("eventVersion")]
    public required string EventVersion { get; set; }

    [JsonPropertyName("timestamp")]
    public required DateTime Timestamp { get; set; }

    [JsonPropertyName("tenantId")]
    public required string TenantId { get; set; }

    [JsonPropertyName("correlationId")]
    public Guid? CorrelationId { get; set; }
}

// =============================================================================
// Image Upload Events
// =============================================================================

/// <summary>
/// Published when an image is successfully uploaded and stored.
/// Triggers the async processing pipeline.
/// </summary>
/// </summary>
public class ImageUploadedEvent : BaseEvent
{
    [JsonPropertyName("data")]
    public required ImageUploadedData Data { get; set; }

    [JsonPropertyName("processingOptions")]
    public ProcessingOptions ProcessingOptions { get; set; } = new();

    public ImageUploadedEvent()
    {
        EventType = "image.uploaded";
        EventVersion = "1.0";
        Timestamp = DateTime.UtcNow;
    }
}

public class ImageUploadedData
{
    [JsonPropertyName("imageId")]
    public required Guid ImageId { get; set; }

    [JsonPropertyName("fileName")]
    public required string FileName { get; set; }

    [JsonPropertyName("filePath")]
    public required string FilePath { get; set; }

    [JsonPropertyName("fileSize")]
    public required long FileSize { get; set; }

    [JsonPropertyName("contentType")]
    public required string ContentType { get; set; }

    [JsonPropertyName("uploadedBy")]
    public string? UploadedBy { get; set; }

    [JsonPropertyName("metadata")]
    public ImageMetadata Metadata { get; set; } = new();

    [JsonPropertyName("storageProvider")]
    public StorageProviderInfo StorageProvider { get; set; } = new() { Type = "minio" };
}

public class ProcessingOptions
{
    [JsonPropertyName("models")]
    public List<string> Models { get; set; } = new() { "resnet50" }; // Phase 1: single model

    [JsonPropertyName("priority")]
    public string Priority { get; set; } = "normal"; // high, normal, low

    [JsonPropertyName("skipDuplicateCheck")]
    public bool SkipDuplicateCheck { get; set; } = false;

    [JsonPropertyName("generateThumbnail")]
    public bool GenerateThumbnail { get; set; } = true;

    [JsonPropertyName("thumbnailQuality")]
    public int ThumbnailQuality { get; set; } = 75;

    [JsonPropertyName("thumbnailWidth")]
    public int ThumbnailWidth { get; set; } = 512;

    [JsonPropertyName("thumbnailHeight")]
    public int ThumbnailHeight { get; set; } = 512;

    [JsonPropertyName("thumbnailFormat")]
    public string ThumbnailFormat { get; set; } = "webp";
}

public class ImageMetadata
{
    [JsonPropertyName("width")]
    public int Width { get; set; }

    [JsonPropertyName("height")]
    public int Height { get; set; }

    [JsonPropertyName("format")]
    public string Format { get; set; } = string.Empty;

    [JsonPropertyName("colorProfile")]
    public string? ColorProfile { get; set; }

    [JsonPropertyName("originalFileName")]
    public string? OriginalFileName { get; set; }

    [JsonPropertyName("exifData")]
    public Dictionary<string, object>? ExifData { get; set; }
}

public class StorageProviderInfo
{
    [JsonPropertyName("type")]
    public required string Type { get; set; } // azure_blob, aws_s3, minio, etc.

    [JsonPropertyName("containerName")]
    public string? ContainerName { get; set; }

    [JsonPropertyName("blobName")]
    public string? BlobName { get; set; }

    [JsonPropertyName("bucketName")]
    public string? BucketName { get; set; }

    [JsonPropertyName("objectKey")]
    public string? ObjectKey { get; set; }
}

// =============================================================================
// Feature Extraction Events
// =============================================================================

/// <summary>
/// Published to request feature extraction for an uploaded image.
/// Consumed by the feature extraction worker.
/// </summary>
/// </summary>
public class FeatureExtractionRequestedEvent : BaseEvent
{
    [JsonPropertyName("data")]
    public required FeatureExtractionData Data { get; set; }

    [JsonPropertyName("retryPolicy")]
    public RetryPolicy RetryPolicy { get; set; } = new();

    public FeatureExtractionRequestedEvent()
    {
        EventType = "feature.extraction.requested";
        EventVersion = "1.0";
        Timestamp = DateTime.UtcNow;
    }
}

public class FeatureExtractionData
{
    [JsonPropertyName("imageId")]
    public required Guid ImageId { get; set; }

    [JsonPropertyName("imagePath")]
    public required string ImagePath { get; set; }

    [JsonPropertyName("modelName")]
    public required string ModelName { get; set; }

    [JsonPropertyName("modelVersion")]
    public string ModelVersion { get; set; } = "v2.7";

    [JsonPropertyName("expectedDimension")]
    public int ExpectedDimension { get; set; } = 2048;

    [JsonPropertyName("extractionOptions")]
    public ExtractionOptions ExtractionOptions { get; set; } = new();
}

public class ExtractionOptions
{
    [JsonPropertyName("normalize")]
    public bool Normalize { get; set; } = true;

    [JsonPropertyName("returnMetadata")]
    public bool ReturnMetadata { get; set; } = true;

    [JsonPropertyName("timeout")]
    public int TimeoutSeconds { get; set; } = 30;
}

public class RetryPolicy
{
    [JsonPropertyName("maxAttempts")]
    public int MaxAttempts { get; set; } = 3;

    [JsonPropertyName("backoffMs")]
    public int BackoffMs { get; set; } = 1000;

    [JsonPropertyName("currentAttempt")]
    public int CurrentAttempt { get; set; } = 1;
}

// =============================================================================
// Vector Indexing Events
// =============================================================================

/// <summary>
/// Published when feature extraction is complete and vector is ready for indexing.
/// Consumed by the vector indexing worker.
/// </summary>
/// </summary>
public class VectorIndexingRequestedEvent : BaseEvent
{
    [JsonPropertyName("data")]
    public required VectorIndexingData Data { get; set; }

    public VectorIndexingRequestedEvent()
    {
        EventType = "vector.indexing.requested";
        EventVersion = "1.0";
        Timestamp = DateTime.UtcNow;
    }
}

public class VectorIndexingData
{
    [JsonPropertyName("imageId")]
    public required Guid ImageId { get; set; }

    [JsonPropertyName("modelName")]
    public required string ModelName { get; set; }

    [JsonPropertyName("featureVector")]
    public required float[] FeatureVector { get; set; }

    [JsonPropertyName("vectorMetadata")]
    public VectorMetadata VectorMetadata { get; set; } = new();

    [JsonPropertyName("imageMetadata")]
    public ImageMetadata ImageMetadata { get; set; } = new();
}

public class VectorMetadata
{
    [JsonPropertyName("extractionTime")]
    public DateTime ExtractionTime { get; set; }

    [JsonPropertyName("processingTimeMs")]
    public double ProcessingTimeMs { get; set; }

    [JsonPropertyName("modelVersion")]
    public string ModelVersion { get; set; } = string.Empty;

    [JsonPropertyName("confidence")]
    public double? Confidence { get; set; }

    [JsonPropertyName("extractorVersion")]
    public string? ExtractorVersion { get; set; }

    /// <summary>
    /// Converts VectorMetadata to Dictionary for Qdrant payload
    /// </summary>
    public Dictionary<string, object> ToDictionary()
    {
        var dict = new Dictionary<string, object>
        {
            ["extraction_time"] = ExtractionTime.ToString("O"),
            ["processing_time_ms"] = ProcessingTimeMs,
            ["model_version"] = ModelVersion
        };

        if (Confidence.HasValue)
            dict["confidence"] = Confidence.Value;

        if (!string.IsNullOrEmpty(ExtractorVersion))
            dict["extractor_version"] = ExtractorVersion;

        return dict;
    }
}

// =============================================================================
// Processing Status Events
// =============================================================================

/// <summary>
/// Published when the entire processing pipeline is completed (success or failure).
/// Used for status tracking and notifications.
/// </summary>
/// </summary>
public class ProcessingCompletedEvent : BaseEvent
{
    [JsonPropertyName("data")]
    public required ProcessingCompletedData Data { get; set; }

    public ProcessingCompletedEvent()
    {
        EventType = "processing.completed";
        EventVersion = "1.0";
        Timestamp = DateTime.UtcNow;
    }
}

public class ProcessingCompletedData
{
    [JsonPropertyName("imageId")]
    public required Guid ImageId { get; set; }

    [JsonPropertyName("status")]
    public required string Status { get; set; } // success, failed, partial

    [JsonPropertyName("processingSteps")]
    public List<ProcessingStep> ProcessingSteps { get; set; } = new();

    [JsonPropertyName("totalProcessingTime")]
    public double TotalProcessingTimeMs { get; set; }

    [JsonPropertyName("searchableAfter")]
    public DateTime? SearchableAfter { get; set; }

    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }

    [JsonPropertyName("errorCode")]
    public string? ErrorCode { get; set; }
}

public class ProcessingStep
{
    [JsonPropertyName("step")]
    public required string Step { get; set; } // feature_extraction, vector_indexing, thumbnail_generation

    [JsonPropertyName("status")]
    public required string Status { get; set; } // completed, failed, skipped

    [JsonPropertyName("duration")]
    public double DurationMs { get; set; }

    [JsonPropertyName("modelName")]
    public string? ModelName { get; set; }

    [JsonPropertyName("collectionName")]
    public string? CollectionName { get; set; }

    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }
}

// =============================================================================
// Processing Failed Events
// =============================================================================

/// <summary>
/// Published when processing fails and needs retry or manual intervention.
/// </summary>
/// </summary>
public class ProcessingFailedEvent : BaseEvent
{
    [JsonPropertyName("data")]
    public required ProcessingFailedData Data { get; set; }

    public ProcessingFailedEvent()
    {
        EventType = "processing.failed";
        EventVersion = "1.0";
        Timestamp = DateTime.UtcNow;
    }
}

public class ProcessingFailedData
{
    [JsonPropertyName("imageId")]
    public required Guid ImageId { get; set; }

    [JsonPropertyName("failedStep")]
    public required string FailedStep { get; set; }

    [JsonPropertyName("errorMessage")]
    public required string ErrorMessage { get; set; }

    [JsonPropertyName("errorCode")]
    public string? ErrorCode { get; set; }

    [JsonPropertyName("stackTrace")]
    public string? StackTrace { get; set; }

    [JsonPropertyName("retryAttempt")]
    public int RetryAttempt { get; set; }

    [JsonPropertyName("canRetry")]
    public bool CanRetry { get; set; }

    [JsonPropertyName("originalEvent")]
    public object? OriginalEvent { get; set; } // The event that caused the failure
}

// =============================================================================
// Catalog & Maintenance Events
// =============================================================================

/// <summary>
/// Published when an image is marked for deletion (e.g., during SKU merging).
/// Triggers physical deletion of files and thumbnails.
/// </summary>
public class ImageDeletionRequestedEvent : BaseEvent
{
    [JsonPropertyName("data")]
    public required ImageDeletionData Data { get; set; }

    public ImageDeletionRequestedEvent()
    {
        EventType = "image.deletion.requested";
        EventVersion = "1.0";
        Timestamp = DateTime.UtcNow;
    }
}

public class ImageDeletionData
{
    [JsonPropertyName("imageId")]
    public required Guid ImageId { get; set; }

    [JsonPropertyName("storagePath")]
    public required string StoragePath { get; set; }

    [JsonPropertyName("deleteThumbnails")]
    public bool DeleteThumbnails { get; set; } = true;

    [JsonPropertyName("reason")]
    public string? Reason { get; set; } // e.g. "sku_merge", "manual_delete"
}

// =============================================================================
// Event Constants and Topic Names
// =============================================================================

public static class EventTypes
{
    public const string ImageUploaded = "image.uploaded";
    public const string FeatureExtractionRequested = "feature.extraction.requested";
    public const string VectorIndexingRequested = "vector.indexing.requested";
    public const string ProcessingCompleted = "processing.completed";
    public const string ProcessingFailed = "processing.failed";
    public const string ImageDeletionRequested = "image.deletion.requested";
}

public static class KafkaTopics
{
    public const string ImageUploaded = "deeplens.images.uploaded";
    public const string FeatureExtraction = "deeplens.features.extraction";
    public const string VectorIndexing = "deeplens.vectors.indexing";
    public const string ProcessingCompleted = "deeplens.processing.completed";
    public const string ProcessingFailed = "deeplens.processing.failed";
    public const string ImageMaintenance = "deeplens.images.maintenance";

    public static readonly string[] AllTopics = 
    {
        ImageUploaded,
        FeatureExtraction,
        VectorIndexing,
        ProcessingCompleted,
        ProcessingFailed,
        ImageMaintenance
    };
}

// =============================================================================
// Processing Status Enums
// =============================================================================

public enum ImageProcessingStatus
{
    Uploaded = 0,
    Processed = 1,
    Indexed = 2,
    PendingDelete = 98,
    Failed = 99
}

public enum ProcessingPriority
{
    Low,
    Normal,
    High
}
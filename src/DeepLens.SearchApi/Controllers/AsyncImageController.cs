using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using DeepLens.Contracts.Events;
using Confluent.Kafka;
using System.Text.Json;
using System.ComponentModel.DataAnnotations;

namespace DeepLens.SearchApi.Controllers;

/// <summary>
/// Async image upload controller providing immediate confirmation while triggering background processing.
/// Uses Kafka for decoupled, scalable image processing pipeline.
/// </summary>
[ApiController]
[Route("api/v1/images")]
public class AsyncImageController : ControllerBase
{
    private readonly ILogger<AsyncImageController> _logger;
    private readonly IProducer<string, string> _kafkaProducer;
    private readonly IImageStorageService _storageService;
    private readonly IImageMetadataService _metadataService;
    
    public AsyncImageController(
        ILogger<AsyncImageController> logger,
        IProducer<string, string> kafkaProducer,
        IImageStorageService storageService,
        IImageMetadataService metadataService)
    {
        _logger = logger;
        _kafkaProducer = kafkaProducer;
        _storageService = storageService;
        _metadataService = metadataService;
    }

    /// <summary>
    /// Uploads an image for similarity search indexing with immediate response.
    /// Processing happens asynchronously in the background.
    /// </summary>
    /// <param name="file">Image file to upload</param>
    /// <param name="request">Upload parameters</param>
    /// <returns>Immediate upload confirmation with status tracking info</returns>
    [HttpPost("upload")]
    [RequestSizeLimit(10_000_000)] // 10MB limit
    public async Task<IActionResult> UploadImageAsync(
        [FromForm] IFormFile file,
        [FromForm] UploadImageRequest request)
    {
        var uploadStartTime = DateTime.UtcNow;
        
        try
        {
            // 1. Fast validation (< 50ms)
            var validationResult = await ValidateUploadRequest(file, request);
            if (!validationResult.IsValid)
            {
                return BadRequest(new UploadImageResponse
                {
                    Success = false,
                    Message = validationResult.ErrorMessage,
                    Timestamp = DateTime.UtcNow
                });
            }

            var imageId = Guid.NewGuid();
            _logger.LogInformation("Starting upload process for ImageId: {ImageId}, TenantId: {TenantId}, FileName: {FileName}", 
                imageId, request.TenantId, file.FileName);

            // 2. Store metadata in PostgreSQL (fast - < 100ms)
            var imageMetadata = await _metadataService.CreateImageRecordAsync(
                imageId, 
                file, 
                request, 
                ImageProcessingStatus.Uploaded);

            // 3. Store file to configured storage (moderately fast - < 500ms)
            var storagePath = await _storageService.SaveImageAsync(
                file, 
                request.TenantId, 
                imageId, 
                imageMetadata);

            // 4. Publish Kafka event for async processing (fast - < 50ms)
            var uploadEvent = new ImageUploadedEvent
            {
                EventId = Guid.NewGuid(),
                TenantId = request.TenantId,
                Timestamp = DateTime.UtcNow,
                Data = new ImageUploadedData
                {
                    ImageId = imageId,
                    FileName = file.FileName,
                    FilePath = storagePath,
                    FileSize = file.Length,
                    ContentType = file.ContentType,
                    UploadedBy = request.UploadedBy,
                    Metadata = new ImageMetadata
                    {
                        Width = imageMetadata.Width,
                        Height = imageMetadata.Height,
                        Format = imageMetadata.Format,
                        OriginalFileName = file.FileName
                    },
                    StorageProvider = new StorageProviderInfo
                    {
                        Type = imageMetadata.StorageProviderType,
                        ContainerName = imageMetadata.ContainerName,
                        BlobName = imageMetadata.BlobName
                    }
                },
                ProcessingOptions = new ProcessingOptions
                {
                    Models = new List<string> { "resnet50" }, // Phase 1: single model
                    Priority = request.Priority ?? "normal",
                    SkipDuplicateCheck = request.SkipDuplicateCheck,
                    GenerateThumbnail = request.GenerateThumbnail
                }
            };

            await PublishImageUploadedEvent(uploadEvent, imageId);

            var totalUploadTime = (DateTime.UtcNow - uploadStartTime).TotalMilliseconds;

            // 5. Return immediate response (total time < 700ms)
            var response = new UploadImageResponse
            {
                Success = true,
                ImageId = imageId,
                Status = "uploaded",
                Message = "Image uploaded successfully. Processing started in background.",
                UploadTimeMs = totalUploadTime,
                EstimatedProcessingTimeSeconds = GetEstimatedProcessingTime(file.Length),
                StatusCheckUrl = Url.Action(nameof(GetImageStatus), new { imageId }),
                WebSocketUrl = $"/hub/processing-status?imageId={imageId}",
                Timestamp = DateTime.UtcNow,
                ProcessingOptions = uploadEvent.ProcessingOptions
            };

            _logger.LogInformation("Successfully uploaded ImageId: {ImageId} in {UploadTime}ms. Processing initiated.", 
                imageId, totalUploadTime);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during image upload");
            
            return StatusCode(500, new UploadImageResponse
            {
                Success = false,
                Message = "Internal server error during upload. Please try again.",
                Timestamp = DateTime.UtcNow
            });
        }
    }

    /// <summary>
    /// Gets the current processing status of an uploaded image.
    /// </summary>
    [HttpGet("{imageId}/status")]
    public async Task<IActionResult> GetImageStatus(Guid imageId)
    {
        try
        {
            var imageRecord = await _metadataService.GetImageRecordAsync(imageId);
            
            if (imageRecord == null)
            {
                return NotFound(new ImageStatusResponse
                {
                    Success = false,
                    Message = "Image not found"
                });
            }

            var status = await _metadataService.GetProcessingStatusAsync(imageId);

            return Ok(new ImageStatusResponse
            {
                Success = true,
                ImageId = imageId,
                Status = status.Status.ToString().ToLower(),
                ProcessingSteps = status.ProcessingSteps,
                EstimatedTimeRemainingSeconds = CalculateRemainingTime(status),
                SearchableAfter = status.SearchableAfter,
                LastUpdated = status.LastUpdated,
                ErrorMessage = status.ErrorMessage,
                PercentComplete = CalculatePercentComplete(status.Status)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting status for ImageId: {ImageId}", imageId);
            
            return StatusCode(500, new ImageStatusResponse
            {
                Success = false,
                Message = "Error retrieving image status"
            });
        }
    }

    /// <summary>
    /// Searches for similar images. Only returns results for completed processing.
    /// </summary>
    [HttpPost("search")]
    public async Task<IActionResult> SearchSimilarImages(
        [FromForm] IFormFile queryImage,
        [FromForm] SearchSimilarImagesRequest request)
    {
        try
        {
            // Validation
            if (queryImage == null || queryImage.Length == 0)
                return BadRequest("Query image is required");

            _logger.LogInformation("Searching for similar images. TenantId: {TenantId}, Limit: {Limit}", 
                request.TenantId, request.Limit);

            // For immediate search, we need the query image features
            // Option 1: Call Python service directly for query (fast path)
            // Option 2: Use cached features if image was previously uploaded
            
            var queryFeatures = await ExtractQueryImageFeatures(queryImage, request.TenantId);
            
            // Search in vector database
            var searchResults = await SearchVectorDatabase(
                request.TenantId, 
                "resnet50", // Phase 1: hardcoded model
                queryFeatures, 
                request.Limit,
                request.Threshold);

            var response = new SearchSimilarImagesResponse
            {
                Success = true,
                QueryProcessingTimeMs = 0, // TODO: track this
                ResultCount = searchResults.Count,
                Results = searchResults,
                Timestamp = DateTime.UtcNow
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during similarity search");
            
            return StatusCode(500, new SearchSimilarImagesResponse
            {
                Success = false,
                Message = "Error during similarity search"
            });
        }
    }

    private async Task<ValidationResult> ValidateUploadRequest(IFormFile file, UploadImageRequest request)
    {
        // File validation
        if (file == null || file.Length == 0)
            return ValidationResult.Invalid("No file provided");

        if (file.Length > 10_000_000) // 10MB
            return ValidationResult.Invalid("File too large. Maximum size is 10MB");

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/bmp" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            return ValidationResult.Invalid($"Unsupported file type: {file.ContentType}");

        // Request validation
        if (string.IsNullOrWhiteSpace(request.TenantId))
            return ValidationResult.Invalid("TenantId is required");

        // TODO: Validate tenant exists and is active
        // TODO: Check upload quotas and rate limits

        return ValidationResult.Valid();
    }

    private async Task PublishImageUploadedEvent(ImageUploadedEvent uploadEvent, Guid imageId)
    {
        try
        {
            var eventJson = JsonSerializer.Serialize(uploadEvent);
            var message = new Message<string, string>
            {
                Key = imageId.ToString(),
                Value = eventJson,
                Headers = new Headers
                {
                    { "eventType", System.Text.Encoding.UTF8.GetBytes(EventTypes.ImageUploaded) },
                    { "tenantId", System.Text.Encoding.UTF8.GetBytes(uploadEvent.TenantId) },
                    { "timestamp", System.Text.Encoding.UTF8.GetBytes(uploadEvent.Timestamp.ToString("O")) }
                }
            };

            var deliveryResult = await _kafkaProducer.ProduceAsync(KafkaTopics.ImageUploaded, message);
            
            _logger.LogDebug("Published image upload event for ImageId: {ImageId} to topic {Topic} at offset {Offset}",
                imageId, deliveryResult.Topic, deliveryResult.Offset);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish image upload event for ImageId: {ImageId}", imageId);
            throw new InvalidOperationException("Failed to initiate background processing", ex);
        }
    }

    private int GetEstimatedProcessingTime(long fileSize)
    {
        // Estimate based on file size and current system load
        // Small images: 2-3 seconds, Large images: 4-6 seconds
        var basetime = fileSize < 1_000_000 ? 2 : 4; // Base time in seconds
        
        // TODO: Add system load factor
        return basetime + 1; // Add buffer
    }

    private async Task<float[]> ExtractQueryImageFeatures(IFormFile queryImage, string tenantId)
    {
        // TODO: Call Python feature extraction service
        // This is a synchronous call for immediate search results
        
        // Placeholder - return dummy features for now
        await Task.CompletedTask;
        return new float[2048]; // ResNet50 dimension
    }

    private async Task<List<SimilarImageResult>> SearchVectorDatabase(
        string tenantId, 
        string modelName, 
        float[] queryVector, 
        int limit, 
        float threshold)
    {
        // TODO: Call VectorStoreService to search
        await Task.CompletedTask;
        return new List<SimilarImageResult>();
    }

    private TimeSpan? CalculateRemainingTime(ProcessingStatus status)
    {
        // TODO: Implement based on current processing step and historical data
        return status.Status switch
        {
            ImageProcessingStatus.Uploaded => TimeSpan.FromSeconds(3),
            ImageProcessingStatus.Processing => TimeSpan.FromSeconds(1),
            ImageProcessingStatus.Completed => TimeSpan.Zero,
            _ => null
        };
    }

    private int CalculatePercentComplete(ImageProcessingStatus status)
    {
        return status switch
        {
            ImageProcessingStatus.Uploaded => 10,
            ImageProcessingStatus.Processing => 50,
            ImageProcessingStatus.Completed => 100,
            ImageProcessingStatus.Failed => 0,
            _ => 0
        };
    }
}

// DTOs
public class UploadImageRequest
{
    [Required]
    public required string TenantId { get; set; }
    
    public string? UploadedBy { get; set; }
    public string? Priority { get; set; } = "normal";
    public bool SkipDuplicateCheck { get; set; } = false;
    public bool GenerateThumbnail { get; set; } = true;
    public Dictionary<string, string>? Tags { get; set; }
}

public class UploadImageResponse
{
    public required bool Success { get; set; }
    public Guid? ImageId { get; set; }
    public string Status { get; set; } = string.Empty;
    public required string Message { get; set; }
    public double UploadTimeMs { get; set; }
    public int EstimatedProcessingTimeSeconds { get; set; }
    public string? StatusCheckUrl { get; set; }
    public string? WebSocketUrl { get; set; }
    public required DateTime Timestamp { get; set; }
    public ProcessingOptions? ProcessingOptions { get; set; }
}

public class SearchSimilarImagesRequest
{
    [Required]
    public required string TenantId { get; set; }
    
    public int Limit { get; set; } = 10;
    public float Threshold { get; set; } = 0.7f;
    public Dictionary<string, object>? Filters { get; set; }
}

public class SearchSimilarImagesResponse
{
    public required bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public double QueryProcessingTimeMs { get; set; }
    public int ResultCount { get; set; }
    public List<SimilarImageResult> Results { get; set; } = new();
    public required DateTime Timestamp { get; set; }
}

public class SimilarImageResult
{
    public required Guid ImageId { get; set; }
    public required float SimilarityScore { get; set; }
    public string? FileName { get; set; }
    public string? ThumbnailUrl { get; set; }
    public DateTime? UploadedAt { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class ImageStatusResponse
{
    public required bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public Guid? ImageId { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<ProcessingStep> ProcessingSteps { get; set; } = new();
    public TimeSpan? EstimatedTimeRemainingSeconds { get; set; }
    public DateTime? SearchableAfter { get; set; }
    public DateTime? LastUpdated { get; set; }
    public string? ErrorMessage { get; set; }
    public int PercentComplete { get; set; }
}

// Helper classes
public class ValidationResult
{
    public bool IsValid { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;

    public static ValidationResult Valid() => new() { IsValid = true };
    public static ValidationResult Invalid(string message) => new() { IsValid = false, ErrorMessage = message };
}

public class ProcessingStatus
{
    public ImageProcessingStatus Status { get; set; }
    public List<ProcessingStep> ProcessingSteps { get; set; } = new();
    public DateTime? SearchableAfter { get; set; }
    public DateTime LastUpdated { get; set; }
    public string? ErrorMessage { get; set; }
}

// Service interfaces (to be implemented)
public interface IImageStorageService
{
    Task<string> SaveImageAsync(IFormFile file, string tenantId, Guid imageId, ImageRecord metadata);
}

public interface IImageMetadataService  
{
    Task<ImageRecord> CreateImageRecordAsync(Guid imageId, IFormFile file, UploadImageRequest request, ImageProcessingStatus status);
    Task<ImageRecord?> GetImageRecordAsync(Guid imageId);
    Task<ProcessingStatus> GetProcessingStatusAsync(Guid imageId);
}

public class ImageRecord
{
    public Guid ImageId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public int Width { get; set; }
    public int Height { get; set; }
    public string Format { get; set; } = string.Empty;
    public string StorageProviderType { get; set; } = string.Empty;
    public string? ContainerName { get; set; }
    public string? BlobName { get; set; }
    public DateTime CreatedAt { get; set; }
}
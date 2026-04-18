using Microsoft.AspNetCore.Mvc;
using DeepLens.Contracts.Ingestion;
using DeepLens.Infrastructure.Services;
using DeepLens.SearchApi.Services;
using Confluent.Kafka;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using DeepLens.Contracts.Events;

namespace DeepLens.SearchApi.Controllers;

/// <summary>
/// Handles image ingestion and metadata tagging. Single-tenant version.
/// </summary>
[ApiController]
[Route("api/v1/ingest")]
public class IngestionController : ControllerBase
{
    private readonly ILogger<IngestionController> _logger;
    private readonly IStorageService _storageService;
    private readonly IMetadataService _metadataService;
    private readonly IAttributeExtractionService _attributeService;
    private readonly IProducer<string, string> _kafkaProducer;

    public IngestionController(
        ILogger<IngestionController> logger,
        IStorageService storageService,
        IMetadataService metadataService,
        IAttributeExtractionService attributeService,
        IProducer<string, string>? kafkaProducer = null)
    {
        _logger = logger;
        _storageService = storageService;
        _metadataService = metadataService;
        _attributeService = attributeService;
        _kafkaProducer = kafkaProducer!;
    }

    /// <summary>
    /// Uploads an image, tags it with metadata, and initiates background processing.
    /// </summary>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<UploadImageResponse>> IngestImage([FromForm] UploadImageRequest request)
    {
        if (request.File == null || request.File.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded" });
        }

        try
        {
            _logger.LogInformation("Processing ingestion for Seller {SellerId}", request.SellerId);

            // 1. Save to Storage
            using var stream = request.File.OpenReadStream();
            var storagePath = await _storageService.UploadFileAsync(request.File.FileName, stream, request.File.ContentType);

            // 2. Save Metadata
            var imageId = Guid.NewGuid();
            await _metadataService.SaveIngestionDataAsync(imageId, storagePath, request.File.ContentType, request.File.Length, request);

            // 3. Default Processing Options (Simplified)
            var processingOptions = new ProcessingOptions
            {
                ThumbnailWidth = 512,
                ThumbnailHeight = 512,
                ThumbnailFormat = "webp",
                ThumbnailQuality = 80
            };

            // 4. Notify Processing Pipeline
            if (_kafkaProducer != null)
            {
                await NotifyPipeline(imageId, storagePath, request, processingOptions);
            }

            return Ok(new UploadImageResponse
            {
                ImageId = imageId,
                Status = "Uploaded",
                Message = "Image successfully ingested and queued for processing."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ingestion failed");
            return StatusCode(500, new { message = "An internal error occurred during ingestion" });
        }
    }

    /// <summary>
    /// Bulk uploads multiple images.
    /// </summary>
    [HttpPost("bulk")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<BulkUploadResponse>> BulkIngestImage([FromForm] IFormFileCollection files, [FromForm] string metadata)
    {
        if (files == null || files.Count == 0)
        {
            return BadRequest(new { message = "No files uploaded" });
        }

        BulkUploadImageRequest? bulkRequest;
        try
        {
            bulkRequest = JsonSerializer.Deserialize<BulkUploadImageRequest>(metadata, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (bulkRequest == null) throw new Exception("Invalid metadata format");
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Failed to parse metadata: {ex.Message}" });
        }

        var response = new BulkUploadResponse { TotalProcessed = files.Count };
        var results = new System.Collections.Concurrent.ConcurrentBag<ImageResult>();
        
        using var semaphore = new SemaphoreSlim(5);
        
        var tasks = files.Select(async file =>
        {
            await semaphore.WaitAsync();
            var result = new ImageResult { FileName = file.FileName };
            
            try
            {
                var itemMetadata = bulkRequest.Images.FirstOrDefault(i => i.FileName == file.FileName) 
                                 ?? new BulkImageItem { FileName = file.FileName };

                if (!string.IsNullOrEmpty(itemMetadata.Description) && 
                   (string.IsNullOrEmpty(itemMetadata.Fabric) || string.IsNullOrEmpty(itemMetadata.Color)))
                {
                    var extracted = await _attributeService.ExtractAttributesAsync(itemMetadata.Description, bulkRequest.Category ?? "Apparel");
                    
                    itemMetadata = itemMetadata with {
                        Fabric = itemMetadata.Fabric ?? extracted.Fabric,
                        Color = itemMetadata.Color ?? extracted.Color,
                        StitchType = itemMetadata.StitchType ?? extracted.StitchType,
                        WorkHeaviness = itemMetadata.WorkHeaviness ?? extracted.WorkHeaviness,
                        Patterns = itemMetadata.Patterns ?? extracted.Patterns,
                        Tags = itemMetadata.Tags ?? extracted.Tags
                    };
                }

                var singleRequest = new UploadImageRequest
                {
                    File = file,
                    SellerId = bulkRequest.SellerId ?? "Unknown",
                    ExternalId = itemMetadata.ExternalId,
                    Price = itemMetadata.Price,
                    Currency = itemMetadata.Currency ?? "INR",
                    Description = itemMetadata.Description,
                    Category = bulkRequest.Category,
                    Tags = itemMetadata.Tags,
                    Sku = itemMetadata.Sku,
                    Color = itemMetadata.Color,
                    Fabric = itemMetadata.Fabric,
                    StitchType = itemMetadata.StitchType,
                    WorkHeaviness = itemMetadata.WorkHeaviness,
                    Occasion = itemMetadata.Occasion,
                    Patterns = itemMetadata.Patterns,
                    AdditionalMetadata = itemMetadata.AdditionalMetadata
                };

                using var stream = file.OpenReadStream();
                var storagePath = await _storageService.UploadFileAsync(file.FileName, stream, file.ContentType);

                var imageId = Guid.NewGuid();
                await _metadataService.SaveIngestionDataAsync(imageId, storagePath, file.ContentType, file.Length, singleRequest);

                var processingOptions = new ProcessingOptions { ThumbnailWidth = 512, ThumbnailHeight = 512 };

                if (_kafkaProducer != null)
                {
                    if (file.ContentType.StartsWith("video/")) processingOptions.GenerateGifPreview = true;
                    await NotifyPipeline(imageId, storagePath, singleRequest, processingOptions);
                }

                result.Success = true;
                result.ImageId = imageId;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bulk item failed for file {FileName}", file.FileName);
                result.Success = false;
                result.Error = ex.Message;
            }
            finally
            {
                results.Add(result);
                semaphore.Release();
            }
        });

        await Task.WhenAll(tasks);

        response.Results = results.ToList();
        response.SuccessCount = results.Count(r => r.Success);
        response.FailureCount = results.Count(r => !r.Success);

        return Ok(response);
    }

    [HttpPost("extract")]
    public async Task<ActionResult<ExtractedAttributes>> ExtractMetadata([FromBody] ExtractionRequest request)
    {
        if (string.IsNullOrEmpty(request.Text))
            return BadRequest(new { message = "Description text is required" });

        var result = await _attributeService.ExtractAttributesAsync(request.Text, request.Category ?? "Apparel");
        return Ok(result);
    }

    public record ExtractionRequest(string Text, string? Category);

    private async Task NotifyPipeline(Guid id, string storagePath, UploadImageRequest request, ProcessingOptions processingOptions)
    {
        var contentType = request.File.ContentType;
        var isVideo = contentType.StartsWith("video/");
        
        BaseEvent evt;
        string topic;

        if (isVideo)
        {
            evt = new VideoUploadedEvent
            {
                EventId = Guid.NewGuid(),
                EventType = EventTypes.VideoUploaded,
                EventVersion = "1.0",
                Timestamp = DateTime.UtcNow,
                TenantId = "SINGLE_TENANT",
                Data = new VideoUploadedData
                {
                    VideoId = id,
                    FileName = request.File.FileName,
                    FilePath = storagePath,
                    FileSize = request.File.Length,
                    ContentType = contentType,
                    UploadedBy = "system"
                },
                ProcessingOptions = processingOptions
            };
            topic = KafkaTopics.VideoUploaded;
        }
        else
        {
            evt = new ImageUploadedEvent
            {
                EventId = Guid.NewGuid(),
                EventType = EventTypes.ImageUploaded,
                EventVersion = "1.0",
                Timestamp = DateTime.UtcNow,
                TenantId = "SINGLE_TENANT",
                Data = new ImageUploadedData
                {
                    ImageId = id,
                    FileName = request.File.FileName,
                    FilePath = storagePath,
                    FileSize = request.File.Length,
                    ContentType = contentType,
                    UploadedBy = "system",
                    Metadata = new ImageMetadata
                    {
                        OriginalFileName = request.File.FileName,
                        Format = contentType
                    }
                },
                ProcessingOptions = processingOptions
            };
            topic = KafkaTopics.ImageUploaded;
        }

        var kafkaMsg = new Message<string, string>
        {
            Key = id.ToString(),
            Value = JsonSerializer.Serialize(evt)
        };

        await _kafkaProducer.ProduceAsync(topic, kafkaMsg);
    }
}

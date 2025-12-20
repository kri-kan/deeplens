using Microsoft.AspNetCore.Mvc;
using DeepLens.Contracts.Ingestion;
using DeepLens.Infrastructure.Services;
using DeepLens.SearchApi.Services;
using Confluent.Kafka;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;

namespace DeepLens.SearchApi.Controllers;

/// <summary>
/// Handles image ingestion and metadata tagging for the multi-tenant search platform.
/// Satisfies generic E-commerce needs while handling specific patterns for sellers and SKU deduplication.
/// </summary>
[ApiController]
[Route("api/v1/ingest")]
[Authorize(Policy = "IngestPolicy")]
public class IngestionController : ControllerBase
{
    private readonly ILogger<IngestionController> _logger;
    private readonly IStorageService _storageService;
    private readonly ITenantMetadataService _metadataService;
    private readonly IAttributeExtractionService _attributeService;
    private readonly IProducer<string, string> _kafkaProducer;

    public IngestionController(
        ILogger<IngestionController> logger,
        IStorageService storageService,
        ITenantMetadataService metadataService,
        IAttributeExtractionService attributeService,
        IProducer<string, string>? kafkaProducer = null) // Kafka optional for now to allow dev testing
    {
        _logger = logger;
        _storageService = storageService;
        _metadataService = metadataService;
        _attributeService = attributeService;
        _kafkaProducer = kafkaProducer!;
    }

    /// <summary>
    /// Uploads an image from a seller, tags it with metadata, and initiates background categorization.
    /// </summary>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<UploadImageResponse>> IngestImage([FromForm] UploadImageRequest request)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized(new { message = "Invalid or missing tenant_id in token" });
        }

        if (request.File == null || request.File.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded" });
        }

        try
        {
            _logger.LogInformation("Processing ingestion for tenant {TenantId}, Seller {SellerId}", tenantId, request.SellerId);

            // 1. Save to Storage (MinIO)
            using var stream = request.File.OpenReadStream();
            var storagePath = await _storageService.UploadFileAsync(tenantId, request.File.FileName, stream, request.File.ContentType);

            // 2. Save Metadata to Tenant DB
            var imageId = Guid.NewGuid();
            await _metadataService.SaveIngestionDataAsync(tenantId, imageId, storagePath, request.File.ContentType, request.File.Length, request);

            // 3. Notify Processing Pipeline (Kafka)
            if (_kafkaProducer != null)
            {
                await NotifyPipeline(tenantId, imageId, storagePath);
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
            _logger.LogError(ex, "Ingestion failed for tenant {TenantId}", tenantId);
            return StatusCode(500, new { message = "An internal error occurred during ingestion" });
        }
    }

    /// <summary>
    /// Bulk uploads multiple images with associated metadata.
    /// Uses parallel processing with concurrency control for high throughput.
    /// </summary>
    [HttpPost("bulk")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<BulkUploadResponse>> BulkIngestImage([FromForm] IFormFileCollection files, [FromForm] string metadata)
    {
        var tenantIdClaim = User.FindFirst("tenant_id")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized(new { message = "Invalid or missing tenant_id in token" });
        }

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
        
        // Limit concurrency to avoid saturating resources (e.g., 5 parallel tasks)
        using var semaphore = new SemaphoreSlim(5);
        
        var tasks = files.Select(async file =>
        {
            await semaphore.WaitAsync();
            var result = new ImageResult { FileName = file.FileName };
            
            try
            {
                // Find matching metadata for this file
                var itemMetadata = bulkRequest.Images.FirstOrDefault(i => i.FileName == file.FileName) 
                                 ?? new BulkImageItem { FileName = file.FileName };

                // Enrich metadata if description is available but primary attributes are missing
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

                // Map BulkImageItem to UploadImageRequest for the service
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

                // 1. Upload
                using var stream = file.OpenReadStream();
                var storagePath = await _storageService.UploadFileAsync(tenantId, file.FileName, stream, file.ContentType);

                // 2. Persist
                var imageId = Guid.NewGuid();
                await _metadataService.SaveIngestionDataAsync(tenantId, imageId, storagePath, file.ContentType, file.Length, singleRequest);

                // 3. Notify
                if (_kafkaProducer != null)
                {
                    await NotifyPipeline(tenantId, imageId, storagePath);
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

    /// <summary>
    /// Ad-hoc metadata extraction from unstructured text using AI reasoning.
    /// Useful for UI previews or background enrichment.
    /// </summary>
    [HttpPost("extract")]
    public async Task<ActionResult<ExtractedAttributes>> ExtractMetadata([FromBody] ExtractionRequest request)
    {
        if (string.IsNullOrEmpty(request.Text))
            return BadRequest(new { message = "Description text is required" });

        var result = await _attributeService.ExtractAttributesAsync(request.Text, request.Category ?? "Apparel");
        return Ok(result);
    }

    public record ExtractionRequest(string Text, string? Category);

    private async Task NotifyPipeline(Guid tenantId, Guid imageId, string storagePath)
    {
        var message = new {
            TenantId = tenantId,
            ImageId = imageId,
            StoragePath = storagePath,
            Timestamp = DateTime.UtcNow
        };

        var kafkaMsg = new Message<string, string>
        {
            Key = imageId.ToString(),
            Value = JsonSerializer.Serialize(message)
        };

        await _kafkaProducer.ProduceAsync("image-ingestion", kafkaMsg);
    }
}

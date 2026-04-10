using Microsoft.AspNetCore.Mvc;
using DeepLens.Infrastructure.Services;
using Microsoft.Extensions.Logging;

namespace DeepLens.AdminApi.Controllers;

/// <summary>
/// Vector collection management for multi-tenant deployments.
/// Provides administrative operations for Qdrant collection lifecycle management.
/// </summary>
[ApiController]
[Route("api/v1/admin/collections")]
public class VectorCollectionController : ControllerBase
{
    private readonly IVectorStoreService _vectorStoreService;
    private readonly ILogger<VectorCollectionController> _logger;

    public VectorCollectionController(
        IVectorStoreService vectorStoreService, 
        ILogger<VectorCollectionController> logger)
    {
        _vectorStoreService = vectorStoreService;
        _logger = logger;
    }

    /// <summary>
    /// Creates a new vector collection for a tenant and model.
    /// Called by PowerShell tenant provisioning scripts.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateCollection([FromBody] CreateCollectionRequest request)
    {
        try
        {
            _logger.LogInformation("Creating collection for tenant {TenantId} with model {ModelName}", 
                request.TenantId, request.ModelName);

            // Validate input
            if (string.IsNullOrWhiteSpace(request.TenantId))
                return BadRequest(new { success = false, message = "TenantId is required" });

            if (string.IsNullOrWhiteSpace(request.ModelName))
                return BadRequest(new { success = false, message = "ModelName is required" });

            if (request.VectorDimension <= 0 || request.VectorDimension > 4096)
                return BadRequest(new { success = false, message = "VectorDimension must be between 1 and 4096" });

            // Check if collection already exists
            var exists = await _vectorStoreService.CollectionExistsAsync(request.TenantId, request.ModelName);
            if (exists)
            {
                var existingInfo = await _vectorStoreService.GetCollectionInfoAsync(request.TenantId, request.ModelName);
                return Ok(new CreateCollectionResponse
                {
                    Success = true,
                    Message = "Collection already exists",
                    CollectionName = existingInfo.Name,
                    VectorCount = existingInfo.VectorCount,
                    AlreadyExisted = true
                });
            }

            // Create the collection
            var success = await _vectorStoreService.CreateCollectionAsync(
                request.TenantId, 
                request.ModelName, 
                request.VectorDimension);

            if (success)
            {
                var collectionInfo = await _vectorStoreService.GetCollectionInfoAsync(request.TenantId, request.ModelName);
                
                return Ok(new CreateCollectionResponse
                {
                    Success = true,
                    Message = "Collection created successfully",
                    CollectionName = collectionInfo.Name,
                    VectorCount = 0,
                    AlreadyExisted = false
                });
            }
            else
            {
                return StatusCode(500, new { success = false, message = "Failed to create collection" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating collection for tenant {TenantId}", request.TenantId);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets information about a collection.
    /// </summary>
    [HttpGet("{tenantId}/{modelName}")]
    public async Task<IActionResult> GetCollection(string tenantId, string modelName)
    {
        try
        {
            var exists = await _vectorStoreService.CollectionExistsAsync(tenantId, modelName);
            if (!exists)
                return NotFound(new { success = false, message = "Collection not found" });

            var info = await _vectorStoreService.GetCollectionInfoAsync(tenantId, modelName);
            var stats = await _vectorStoreService.GetCollectionStatsAsync(tenantId, modelName);

            return Ok(new GetCollectionResponse
            {
                Success = true,
                CollectionName = info.Name,
                VectorCount = info.VectorCount,
                VectorDimension = info.VectorDimension,
                Status = info.Status,
                IndexedVectorCount = stats.IndexedVectorCount,
                MemoryUsageMB = stats.MemoryUsageMB
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting collection info for tenant {TenantId} model {ModelName}", 
                tenantId, modelName);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    /// <summary>
    /// Lists all collections for a tenant.
    /// </summary>
    [HttpGet("{tenantId}")]
    public async Task<IActionResult> ListCollections(string tenantId)
    {
        try
        {
            // For Phase 1, we only have ResNet50 collections
            // In Phase 2, this would enumerate all model collections
            var modelNames = new[] { "resnet50" };
            var collections = new List<CollectionSummary>();

            foreach (var modelName in modelNames)
            {
                var exists = await _vectorStoreService.CollectionExistsAsync(tenantId, modelName);
                if (exists)
                {
                    var info = await _vectorStoreService.GetCollectionInfoAsync(tenantId, modelName);
                    collections.Add(new CollectionSummary
                    {
                        ModelName = modelName,
                        CollectionName = info.Name,
                        VectorCount = info.VectorCount,
                        VectorDimension = info.VectorDimension,
                        Status = info.Status
                    });
                }
            }

            return Ok(new ListCollectionsResponse
            {
                Success = true,
                TenantId = tenantId,
                Collections = collections
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing collections for tenant {TenantId}", tenantId);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    /// <summary>
    /// Deletes a collection (use with extreme caution).
    /// </summary>
    [HttpDelete("{tenantId}/{modelName}")]
    public async Task<IActionResult> DeleteCollection(string tenantId, string modelName)
    {
        try
        {
            _logger.LogWarning("Deleting collection for tenant {TenantId} model {ModelName}", tenantId, modelName);

            var exists = await _vectorStoreService.CollectionExistsAsync(tenantId, modelName);
            if (!exists)
                return NotFound(new { success = false, message = "Collection not found" });

            var success = await _vectorStoreService.DeleteCollectionAsync(tenantId, modelName);
            
            if (success)
            {
                return Ok(new { success = true, message = "Collection deleted successfully" });
            }
            else
            {
                return StatusCode(500, new { success = false, message = "Failed to delete collection" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting collection for tenant {TenantId} model {ModelName}", 
                tenantId, modelName);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }

    /// <summary>
    /// Optimizes a collection for better search performance.
    /// </summary>
    [HttpPost("{tenantId}/{modelName}/optimize")]
    public async Task<IActionResult> OptimizeCollection(string tenantId, string modelName)
    {
        try
        {
            var exists = await _vectorStoreService.CollectionExistsAsync(tenantId, modelName);
            if (!exists)
                return NotFound(new { success = false, message = "Collection not found" });

            await _vectorStoreService.OptimizeCollectionAsync(tenantId, modelName);
            
            return Ok(new { success = true, message = "Collection optimization triggered" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error optimizing collection for tenant {TenantId} model {ModelName}", 
                tenantId, modelName);
            return StatusCode(500, new { success = false, message = "Internal server error" });
        }
    }
}

// DTOs
public class CreateCollectionRequest
{
    public required string TenantId { get; set; }
    public required string ModelName { get; set; }
    public required int VectorDimension { get; set; }
}

public class CreateCollectionResponse
{
    public required bool Success { get; set; }
    public required string Message { get; set; }
    public required string CollectionName { get; set; }
    public required int VectorCount { get; set; }
    public required bool AlreadyExisted { get; set; }
}

public class GetCollectionResponse
{
    public required bool Success { get; set; }
    public required string CollectionName { get; set; }
    public required int VectorCount { get; set; }
    public required int VectorDimension { get; set; }
    public required string Status { get; set; }
    public required int IndexedVectorCount { get; set; }
    public required long MemoryUsageMB { get; set; }
}

public class ListCollectionsResponse
{
    public required bool Success { get; set; }
    public required string TenantId { get; set; }
    public required List<CollectionSummary> Collections { get; set; }
}

public class CollectionSummary
{
    public required string ModelName { get; set; }
    public required string CollectionName { get; set; }
    public required int VectorCount { get; set; }
    public required int VectorDimension { get; set; }
    public required string Status { get; set; }
}
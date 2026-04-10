using DeepLens.Contracts.Tenants;
using Microsoft.AspNetCore.Mvc;

namespace DeepLens.AdminApi.Controllers;

/// <summary>
/// Tenant configuration management API
/// </summary>
[ApiController]
[Route("api/v1/tenants")]
public class TenantsController : ControllerBase
{
    private readonly ILogger<TenantsController> _logger;

    public TenantsController(ILogger<TenantsController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Get all tenants
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<TenantResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<TenantResponse>>> GetTenants(
        [FromQuery] bool includeDeleted = false,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Getting tenants list. IncludeDeleted: {IncludeDeleted}", includeDeleted);
        
        // TODO: Implement with repository
        return Ok(new List<TenantResponse>());
    }

    /// <summary>
    /// Get tenant by ID
    /// </summary>
    [HttpGet("{tenantId:guid}")]
    [ProducesResponseType(typeof(TenantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TenantResponse>> GetTenant(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Getting tenant: {TenantId}", tenantId);
        
        // TODO: Implement with repository
        return NotFound(new { message = $"Tenant {tenantId} not found" });
    }

    /// <summary>
    /// Create a new tenant
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(TenantResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TenantResponse>> CreateTenant(
        [FromBody] CreateTenantRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Creating tenant: {TenantName}", request.Name);
        
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Tenant name is required" });
        }

        // TODO: Implement with repository
        var tenantId = Guid.NewGuid();
        return CreatedAtAction(
            nameof(GetTenant),
            new { tenantId },
            new TenantResponse
            {
                Id = tenantId,
                Name = request.Name,
                Description = request.Description,
                IsActive = true,
                StorageConfig = request.StorageConfig ?? new StorageConfigurationDto(),
                ThumbnailConfig = request.ThumbnailConfig ?? new ThumbnailConfigurationDto(),
                MaxStorageSizeBytes = request.MaxStorageSizeBytes ?? 107374182400,
                MaxFileSizeBytes = request.MaxFileSizeBytes ?? 104857600,
                MaxImagesPerUpload = request.MaxImagesPerUpload ?? 100,
                CreatedAt = DateTime.UtcNow
            });
    }

    /// <summary>
    /// Update tenant configuration
    /// </summary>
    [HttpPut("{tenantId:guid}")]
    [ProducesResponseType(typeof(TenantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TenantResponse>> UpdateTenant(
        Guid tenantId,
        [FromBody] UpdateTenantRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Updating tenant: {TenantId}", tenantId);
        
        // TODO: Implement with repository
        return NotFound(new { message = $"Tenant {tenantId} not found" });
    }

    /// <summary>
    /// Delete tenant (soft delete)
    /// </summary>
    [HttpDelete("{tenantId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteTenant(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Deleting tenant: {TenantId}", tenantId);
        
        // TODO: Implement with repository
        return NotFound(new { message = $"Tenant {tenantId} not found" });
    }

    /// <summary>
    /// Get tenant storage configuration
    /// </summary>
    [HttpGet("{tenantId:guid}/storage-config")]
    [ProducesResponseType(typeof(StorageConfigurationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StorageConfigurationDto>> GetStorageConfiguration(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Getting storage configuration for tenant: {TenantId}", tenantId);
        
        // TODO: Implement with repository
        return NotFound(new { message = $"Tenant {tenantId} not found" });
    }

    /// <summary>
    /// Update tenant storage configuration
    /// </summary>
    [HttpPut("{tenantId:guid}/storage-config")]
    [ProducesResponseType(typeof(StorageConfigurationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StorageConfigurationDto>> UpdateStorageConfiguration(
        Guid tenantId,
        [FromBody] UpdateStorageConfigurationRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Updating storage configuration for tenant: {TenantId}", tenantId);
        
        // TODO: Implement with repository
        return NotFound(new { message = $"Tenant {tenantId} not found" });
    }

    /// <summary>
    /// Add additional storage configuration to tenant
    /// </summary>
    [HttpPost("{tenantId:guid}/storage-config")]
    [ProducesResponseType(typeof(StorageConfigurationDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StorageConfigurationDto>> AddStorageConfiguration(
        Guid tenantId,
        [FromBody] StorageConfigurationDto request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Adding storage configuration for tenant: {TenantId}, Name: {Name}", tenantId, request.Name);
        
        // TODO: Implement with repository
        return NotFound(new { message = $"Tenant {tenantId} not found" });
    }

    /// <summary>
    /// Get all storage configurations for a tenant
    /// </summary>
    [HttpGet("{tenantId:guid}/storage-configs")]
    [ProducesResponseType(typeof(List<StorageConfigurationDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<StorageConfigurationDto>>> GetStorageConfigurations(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Getting all storage configurations for tenant: {TenantId}", tenantId);
        
        // TODO: Implement with repository
        return NotFound(new { message = $"Tenant {tenantId} not found" });
    }

    /// <summary>
    /// Set a storage configuration as default
    /// </summary>
    [HttpPut("{tenantId:guid}/storage-config/{configId}/set-default")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetDefaultStorageConfiguration(
        Guid tenantId,
        string configId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Setting storage config {ConfigId} as default for tenant: {TenantId}", configId, tenantId);
        
        // TODO: Implement with repository
        // This should:
        // 1. Set IsDefault = false for all other configs
        // 2. Set IsDefault = true for the specified config
        
        return NotFound(new { message = $"Tenant {tenantId} or config {configId} not found" });
    }

    /// <summary>
    /// Delete a storage configuration
    /// </summary>
    [HttpDelete("{tenantId:guid}/storage-config/{configId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteStorageConfiguration(
        Guid tenantId,
        string configId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Deleting storage config {ConfigId} for tenant: {TenantId}", configId, tenantId);
        
        // TODO: Implement with repository
        // Should prevent deleting the default config if there are images using it
        
        return NotFound(new { message = $"Tenant {tenantId} or config {configId} not found" });
    }

    /// <summary>
    /// Get tenant thumbnail configuration
    /// </summary>
    [HttpGet("{tenantId:guid}/thumbnail-config")]
    [ProducesResponseType(typeof(ThumbnailConfigurationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ThumbnailConfigurationDto>> GetThumbnailConfiguration(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Getting thumbnail configuration for tenant: {TenantId}", tenantId);
        
        // TODO: Implement with repository
        return NotFound(new { message = $"Tenant {tenantId} not found" });
    }

    /// <summary>
    /// Update tenant thumbnail configuration
    /// </summary>
    [HttpPut("{tenantId:guid}/thumbnail-config")]
    [ProducesResponseType(typeof(ThumbnailConfigurationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ThumbnailConfigurationDto>> UpdateThumbnailConfiguration(
        Guid tenantId,
        [FromBody] UpdateThumbnailConfigurationRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Updating thumbnail configuration for tenant: {TenantId}", tenantId);
        
        // TODO: Implement with repository
        return NotFound(new { message = $"Tenant {tenantId} not found" });
    }

    /// <summary>
    /// Cleanup thumbnails for removed sizes after configuration change.
    /// Note: New thumbnail sizes will be generated on-demand when requested.
    /// This endpoint only handles deletion of thumbnails for sizes removed from config.
    /// </summary>
    [HttpPost("{tenantId:guid}/thumbnail-config/apply")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ApplyThumbnailConfiguration(
        Guid tenantId,
        [FromBody] ApplyThumbnailConfigurationRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Cleaning up removed thumbnail sizes for tenant: {TenantId}. Specs to remove: {RemovedSpecs}",
            tenantId,
            string.Join(", ", request.RemovedSpecificationNames));
        
        // TODO: Implement with background job
        // This should trigger a background job to:
        // 1. Soft delete thumbnails in blob storage (tag with deleted=true)
        // 2. MinIO lifecycle rules will handle permanent deletion after retention period
        
        return Accepted(new
        {
            message = "Thumbnail cleanup queued for processing",
            tenantId,
            removedSpecificationNames = request.RemovedSpecificationNames,
            processAllImages = request.ProcessAllImages,
            imageCount = request.ImageIds?.Count ?? 0
        });
    }
}

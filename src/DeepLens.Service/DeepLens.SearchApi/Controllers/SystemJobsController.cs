using Microsoft.AspNetCore.Mvc;
using DeepLens.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/system-jobs")]
public class SystemJobsController : ControllerBase
{
    private readonly IMetadataService _metadataService;
    private readonly ILogger<SystemJobsController> _logger;

    public SystemJobsController(IMetadataService metadataService, ILogger<SystemJobsController> logger)
    {
        _metadataService = metadataService;
        _logger = logger;
    }

    /// <summary>
    /// Gets all registered system jobs and their statuses.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetJobs()
    {
        var jobs = await _metadataService.GetSystemJobsAsync();
        return Ok(jobs);
    }

    /// <summary>
    /// Gets the count of orphaned media (files without any reference links).
    /// </summary>
    [HttpGet("orphaned-media/count")]
    public async Task<IActionResult> GetOrphanedCount()
    {
        var count = await _metadataService.GetOrphanedMediaCountAsync();
        return Ok(new { count });
    }

    /// <summary>
    /// Manually triggers the media cleanup process.
    /// Moves orphaned media to the deletion log.
    /// </summary>
    [HttpPost("cleanup-media")]
    public async Task<IActionResult> CleanupMedia()
    {
        try {
            _logger.LogInformation("Manually triggering media cleanup job");
            await _metadataService.UpdateJobStatusAsync("MediaCleanup", "Running", 0);
            
            var count = await _metadataService.TriggerMediaCleanupAsync();
            
            await _metadataService.UpdateJobStatusAsync("MediaCleanup", "Idle", 100, $"{{\"deletedCount\": {count}}}");
            return Ok(new { message = "Cleanup completed", orphanedProcessed = count });
        } catch (Exception ex) {
            _logger.LogError(ex, "Media cleanup job failed");
            await _metadataService.UpdateJobStatusAsync("MediaCleanup", "Failed", 0, $"{{\"error\": \"{ex.Message}\"}}");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

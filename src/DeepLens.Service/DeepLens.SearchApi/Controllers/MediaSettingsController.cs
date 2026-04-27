using DeepLens.Contracts.Media;
using DeepLens.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/media/settings")]
public class MediaSettingsController : ControllerBase
{
    private readonly IMetadataService _metadataService;

    public MediaSettingsController(IMetadataService metadataService)
    {
        _metadataService = metadataService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllSettings()
    {
        var settings = await _metadataService.GetAllMediaPreferencesAsync();
        return Ok(settings);
    }

    [HttpPost]
    public async Task<IActionResult> UpsertSettings([FromBody] MediaPreferenceDto dto)
    {
        var id = await _metadataService.UpsertMediaPreferenceAsync(dto);
        return Ok(new { id, message = "Media settings saved successfully." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSettings(Guid id)
    {
        var success = await _metadataService.DeleteMediaPreferenceAsync(id);
        if (!success) return NotFound("Setting not found or protected.");
        return Ok(new { message = "Media settings deleted." });
    }

    [HttpGet("lookup")]
    public async Task<IActionResult> ResolveSettings([FromQuery] MediaCategory category, [FromQuery] string subCategory = "General")
    {
        var settings = await _metadataService.ResolveMediaPreferencesAsync(category, subCategory);
        return Ok(settings);
    }

    [HttpGet("retention-options")]
    public IActionResult GetRetentionOptions()
    {
        return Ok(_metadataService.GetRetentionOptions());
    }

    [HttpGet("schema")]
    public IActionResult GetSchema()
    {
        var schema = Enum.GetValues<MediaCategory>()
            .Where(c => c != MediaCategory.Unknown)
            .ToDictionary(
                c => c.ToString(),
                c => c.GetSubCategories()
            );
        
        return Ok(schema);
    }
}

using DeepLens.Application.Abstractions.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;

namespace DeepLens.SearchApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AppSettingsController : ControllerBase
    {
        private readonly IAppSettingsService _settings;
        private readonly IMetaGraphService _metaGraph;

        public AppSettingsController(IAppSettingsService settings, IMetaGraphService metaGraph)
        {
            _settings = settings;
            _metaGraph = metaGraph;
        }

        [HttpGet]
        [Authorize(Policy = "SearchPolicy")]
        public async Task<IActionResult> GetAll()
        {
            var all = await _settings.GetAllAsync();
            var grouped = all
                .GroupBy(s => s.Section)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(s => new
                    {
                        key = s.Key,
                        value = s.Value,
                        label = s.Label,
                        description = s.Description,
                        isSecret = s.IsSecret,
                        dataType = s.DataType,
                        type = s.DataType,
                        updatedAt = s.UpdatedAt
                    })
                );
            return Ok(grouped);
        }

        [HttpGet("{section}")]
        [Authorize(Policy = "SearchPolicy")]
        public async Task<IActionResult> GetSection(string section)
        {
            var result = await _settings.GetSectionAsync(section);
            if (!result.Any())
                return NotFound(new { message = $"No settings found for section '{section}'." });

            return Ok(result.Select(s => new
            {
                key = s.Key,
                value = s.Value,
                label = s.Label,
                description = s.Description,
                isSecret = s.IsSecret,
                dataType = s.DataType,
                type = s.DataType,
                updatedAt = s.UpdatedAt
            }));
        }

        [HttpPut("{*key}")]
        [Authorize(Policy = "IngestPolicy")]
        public async Task<IActionResult> Update(string key, [FromBody] UpdateSettingRequest request)
        {
            if (key == "Meta:ExchangeShortLivedToken" && !string.IsNullOrWhiteSpace(request.Value))
            {
                await _metaGraph.ReloadFromDbAsync();
                var longLivedToken = await _metaGraph.ExchangeForLongLivedTokenAsync(request.Value);
                
                if (string.IsNullOrEmpty(longLivedToken))
                    return BadRequest(new { message = "Token exchange failed. Ensure AppId and AppSecret are correct." });

                await _settings.UpsertAsync(key, request.Value);
                return Ok(new { message = "Short-lived token exchanged successfully. Meta:AccessToken has been updated." });
            }

            var updated = await _settings.UpsertAsync(key, request.Value);
            if (updated == null)
                return NotFound(new { message = $"Key '{key}' not found. Only known keys can be updated." });

            return Ok(new { message = "Setting updated.", setting = updated });
        }

        [HttpPost("seed")]
        [Authorize(Policy = "IngestPolicy")]
        public async Task<IActionResult> Seed()
        {
            await _settings.SeedDefaultsAsync();
            return Ok(new { message = "Settings seeded." });
        }
    }

    public class UpdateSettingRequest
    {
        public string? Value { get; set; }
    }
}

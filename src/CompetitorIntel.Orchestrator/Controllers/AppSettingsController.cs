using CompetitorIntel.Orchestrator.Services;
using Microsoft.AspNetCore.Mvc;

namespace CompetitorIntel.Orchestrator.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AppSettingsController : ControllerBase
    {
        private readonly AppSettingsService _settings;

        public AppSettingsController(AppSettingsService settings)
        {
            _settings = settings;
        }

        /// <summary>
        /// Returns all settings across all sections. Secret values are masked as ••••••••.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var all = await _settings.GetAllAsync();
            // Group by section for a structured response
            var grouped = all
                .GroupBy(s => s.Section)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(s => new
                    {
                        s.Key,
                        s.Value,
                        s.Label,
                        s.Description,
                        s.IsSecret,
                        s.DataType,
                        s.UpdatedAt
                    })
                );
            return Ok(grouped);
        }

        /// <summary>
        /// Returns settings for a specific section. Secret values are masked.
        /// </summary>
        [HttpGet("{section}")]
        public async Task<IActionResult> GetSection(string section)
        {
            var result = await _settings.GetSectionAsync(section);
            if (!result.Any())
                return NotFound(new { message = $"No settings found for section '{section}'." });

            return Ok(result.Select(s => new
            {
                s.Key,
                s.Value,
                s.Label,
                s.Description,
                s.IsSecret,
                s.DataType,
                s.UpdatedAt
            }));
        }

        /// <summary>
        /// Update a single setting by its key.
        /// The key is URL-encoded, e.g. PUT /api/AppSettings/Meta%3AAccessToken
        /// </summary>
        [HttpPut("{*key}")]
        public async Task<IActionResult> Update(string key, [FromBody] UpdateSettingRequest request)
        {
            var updated = await _settings.UpsertAsync(key, request.Value);
            if (updated == null)
                return NotFound(new { message = $"Key '{key}' not found. Only known keys can be updated." });

            return Ok(new { message = "Setting updated.", setting = updated });
        }

        /// <summary>
        /// Seeds the app_settings table with defaults if empty.
        /// Safe to call repeatedly — existing rows are never overwritten.
        /// </summary>
        [HttpPost("seed")]
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

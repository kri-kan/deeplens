using DeepLens.Application.Abstractions.Services;
using DeepLens.Contracts.Ai;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/ai")]
[Authorize(Policy = "IngestPolicy")]
public class AiController : ControllerBase
{
    private readonly IAiService _aiService;
    private readonly ILogger<AiController> _logger;
    private readonly IConfiguration _configuration;

    public AiController(IAiService aiService, ILogger<AiController> logger, IConfiguration configuration)
    {
        _aiService = aiService;
        _logger = logger;
        _configuration = configuration;
    }

    [HttpPost("generate-title")]
    public async Task<ActionResult<GenerateTitleResponse>> GenerateTitle([FromBody] GenerateTitleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Description))
        {
            return BadRequest(new { message = "Description is required for title generation." });
        }

        try
        {
            var title = await _aiService.GenerateYoutubeShortTitleAsync(request.Description);
            
            return Ok(new GenerateTitleResponse
            {
                Title = title,
                Model = _configuration["Ollama:Model"] ?? "llama3"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in AI title generation");
            return StatusCode(500, new { message = ex.Message });
        }
    }
}

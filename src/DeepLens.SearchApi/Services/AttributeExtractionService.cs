using DeepLens.Contracts.Ingestion;
using System.Net.Http.Json;
using System.Text.Json;

namespace DeepLens.SearchApi.Services;

public interface IAttributeExtractionService
{
    Task<ExtractedAttributes> ExtractAttributesAsync(string description, string category);
}

public class ExtractedAttributes
{
    public string? Fabric { get; set; }
    public string? Color { get; set; }
    public string? StitchType { get; set; }
    public string? WorkHeaviness { get; set; }
    public List<string> Patterns { get; set; } = new();
    public List<string> Occasions { get; set; } = new();
    public List<string> Tags { get; set; } = new();
    public Dictionary<string, string> OtherAttributes { get; set; } = new();
}

public class LlmAttributeExtractionService : IAttributeExtractionService
{
    private readonly ILogger<LlmAttributeExtractionService> _logger;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public LlmAttributeExtractionService(ILogger<LlmAttributeExtractionService> logger, HttpClient httpClient, IConfiguration configuration)
    {
        _logger = logger;
        _httpClient = httpClient;
        _configuration = configuration;
        
        var baseUrl = _configuration["Services:ReasoningApiUrl"] ?? "http://localhost:8002";
        _httpClient.BaseAddress = new Uri(baseUrl);
    }

    public async Task<ExtractedAttributes> ExtractAttributesAsync(string description, string category)
    {
        _logger.LogInformation("Calling Reasoning Service (Phi-3) for attribute extraction...");

        try
        {
            var response = await _httpClient.PostAsJsonAsync("/extract", new {
                text = description,
                category = category
            });

            if (response.IsSuccessStatusCode)
            {
                var data = await response.Content.ReadFromJsonAsync<ReasoningResponse>();
                if (data != null)
                {
                    return new ExtractedAttributes
                    {
                        Fabric = data.Fabric,
                        Color = data.Color,
                        StitchType = data.StitchType,
                        WorkHeaviness = data.WorkHeaviness,
                        Patterns = data.Patterns ?? new(),
                        Occasions = data.Occasions ?? new(),
                        Tags = data.Tags ?? new()
                    };
                }
            }
            
            _logger.LogWarning("Reasoning Service failed with status {Status}. Falling back to basic extraction.", response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call Reasoning Service. Falling back to basic extraction.");
        }

        return BasicFallback(description);
    }

    private ExtractedAttributes BasicFallback(string description)
    {
        var result = new ExtractedAttributes();
        var lower = description.ToLowerInvariant();

        if (lower.Contains("silk")) result.Fabric = "Silk";
        if (lower.Contains("cotton")) result.Fabric = "Cotton";
        if (lower.Contains("blue")) result.Color = "Blue";
        if (lower.Contains("red")) result.Color = "Red";
        if (lower.Contains("unstitched")) result.StitchType = "Unstitched";
        if (lower.Contains("heavy")) result.WorkHeaviness = "Heavy";
        
        return result;
    }

    private class ReasoningResponse
    {
        public string? Fabric { get; set; }
        public string? Color { get; set; }
        public string? StitchType { get; set; }
        public string? WorkHeaviness { get; set; }
        public List<string>? Patterns { get; set; }
        public List<string>? Occasions { get; set; }
        public List<string>? Tags { get; set; }
    }
}

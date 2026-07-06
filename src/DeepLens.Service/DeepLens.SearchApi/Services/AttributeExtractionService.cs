using DeepLens.Contracts.Ingestion;
using System.Net.Http.Json;
using System.Text.Json;

namespace DeepLens.SearchApi.Services;

public interface IAttributeExtractionService
{
    Task<ExtractedAttributes> ExtractAttributesAsync(string description, string category);
    Task<SuggestedMetadata> SuggestGroupMetadataAsync(List<string> descriptions);
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

public class SuggestedMetadata
{
    public string Title { get; set; } = string.Empty;
    public string Keywords { get; set; } = string.Empty;
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
            _logger.LogWarning("Reasoning Service failed with status {Status}.", response.StatusCode);
            return new ExtractedAttributes();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call Reasoning Service.");
            return new ExtractedAttributes();
        }
    }

    public async Task<SuggestedMetadata> SuggestGroupMetadataAsync(List<string> descriptions)
    {
        _logger.LogInformation("Calling Reasoning Service (Phi-3) for group metadata suggestion...");

        try
        {
            var response = await _httpClient.PostAsJsonAsync("/suggest-group-metadata", new {
                descriptions = descriptions
            });

            if (response.IsSuccessStatusCode)
            {
                var data = await response.Content.ReadFromJsonAsync<SuggestResponse>();
                if (data != null)
                {
                    return new SuggestedMetadata
                    {
                        Title = data.Title ?? string.Empty,
                        Keywords = data.Keywords ?? string.Empty
                    };
                }
            }
            _logger.LogWarning("Reasoning Service failed with status {Status} for suggestion.", response.StatusCode);
            return new SuggestedMetadata { Title = string.Empty, Keywords = string.Empty };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call Reasoning Service for metadata suggestion.");
            return new SuggestedMetadata { Title = string.Empty, Keywords = string.Empty };
        }
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

    private class SuggestResponse
    {
        public string? Title { get; set; }
        public string? Keywords { get; set; }
    }
}

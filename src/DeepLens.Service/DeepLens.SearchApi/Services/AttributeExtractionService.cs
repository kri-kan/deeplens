using DeepLens.Contracts.Ingestion;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

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
                        Patterns = data.Patterns ?? new List<string>(),
                        Occasions = data.Occasions ?? new List<string>(),
                        Tags = data.Tags ?? new List<string>()
                    };
                }
            }
            _logger.LogWarning("Reasoning Service failed with status {Status}", response.StatusCode);
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
        _logger.LogInformation("Calling Reasoning Service for group metadata suggestion...");

        try
        {
            var response = await _httpClient.PostAsJsonAsync("/suggest-group-metadata", new {
                descriptions = descriptions
            });

            if (response.IsSuccessStatusCode)
            {
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var data = await response.Content.ReadFromJsonAsync<SuggestResponse>(options);
                if (data != null && (!string.IsNullOrWhiteSpace(data.Title) || !string.IsNullOrWhiteSpace(data.Keywords)))
                {
                    return new SuggestedMetadata
                    {
                        Title = data.Title ?? string.Empty,
                        Keywords = data.Keywords ?? string.Empty
                    };
                }
            }
            _logger.LogWarning("Reasoning Service returned status {Status} for suggestion. Using local heuristic fallback.", response.StatusCode);
            return CreateFallbackMetadata(descriptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call Reasoning Service for metadata suggestion. Using local heuristic fallback.");
            return CreateFallbackMetadata(descriptions);
        }
    }

    private SuggestedMetadata CreateFallbackMetadata(List<string> descriptions)
    {
        var firstDesc = descriptions.FirstOrDefault(d => !string.IsNullOrWhiteSpace(d)) ?? "New Story Collection";
        var firstLine = firstDesc.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "New Story Collection";
        var cleaned = Regex.Replace(firstLine, @"[*#_]", "").Trim();
        if (cleaned.Length > 35)
        {
            cleaned = cleaned.Substring(0, 35).Trim();
        }
        return new SuggestedMetadata
        {
            Title = string.IsNullOrWhiteSpace(cleaned) ? "New Story Collection" : cleaned,
            Keywords = ""
        };
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
        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [JsonPropertyName("keywords")]
        public string? Keywords { get; set; }
    }
}

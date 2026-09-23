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
        _httpClient.Timeout = TimeSpan.FromSeconds(15);
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
                if (data != null)
                {
                    var fallback = CreateFallbackMetadata(descriptions);
                    var title = string.IsNullOrWhiteSpace(data.Title) ? fallback.Title : data.Title;
                    var keywords = string.IsNullOrWhiteSpace(data.Keywords) ? fallback.Keywords : data.Keywords;

                    if (!string.IsNullOrWhiteSpace(title) || !string.IsNullOrWhiteSpace(keywords))
                    {
                        return new SuggestedMetadata
                        {
                            Title = title,
                            Keywords = keywords
                        };
                    }
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

    public SuggestedMetadata CreateFallbackMetadata(List<string> descriptions)
    {
        var combined = string.Join(" ", descriptions ?? new List<string>());
        
        var fashionKeywords = new[]
        {
            "saree", "sari", "lehenga", "lehanga", "kurti", "kurta", "anarkali", "salwar", "suit",
            "pattu", "silk", "kanchi", "kanchipuram", "banarasi", "paithani", "dola", "chiffon",
            "georgette", "organza", "crepe", "cotton", "velvet", "tissue", "chanderi", "bandhani",
            "zari", "embroidery", "mirror work", "handwork", "maggam", "cutdana", "sequins",
            "partywear", "bridal", "wedding", "festive", "traditional", "designerwear", "designer"
        };

        var matchedKeywords = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var kw in fashionKeywords)
        {
            if (Regex.IsMatch(combined, $@"\b{Regex.Escape(kw)}\b", RegexOptions.IgnoreCase))
            {
                matchedKeywords.Add(kw.ToLowerInvariant());
            }
        }

        // Extract hashtags
        var promoTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "vayyari", "vayyarifashions", "reels", "viral", "explore", "trending", "fyp", "dmfororders", "freeshipping", "cod"
        };
        var hashtagMatches = Regex.Matches(combined, @"#([a-zA-Z0-9_]{3,30})");
        foreach (Match match in hashtagMatches)
        {
            var tag = match.Groups[1].Value.ToLowerInvariant();
            if (!promoTags.Contains(tag))
            {
                matchedKeywords.Add(tag);
            }
        }

        string finalKeywords;
        if (matchedKeywords.Count > 0)
        {
            finalKeywords = string.Join(", ", matchedKeywords);
        }
        else
        {
            finalKeywords = "ethnic wear, traditional, partywear, new arrival";
        }

        // Clean title generation
        string title = "";
        foreach (var desc in descriptions ?? new List<string>())
        {
            var lines = (desc ?? "").Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(l => Regex.Replace(l, @"[*#_]", "").Trim())
                .Where(l => !string.IsNullOrWhiteSpace(l) && !Regex.IsMatch(l, @"^(\d{3,5}|price|rate|cod|free ship|dm for)", RegexOptions.IgnoreCase))
                .ToList();

            if (lines.Count > 0)
            {
                title = lines[0];
                if (title.Length > 35) title = title.Substring(0, 35).Trim();
                break;
            }
        }

        if (string.IsNullOrWhiteSpace(title))
        {
            if (matchedKeywords.Contains("saree") || matchedKeywords.Contains("pattu") || matchedKeywords.Contains("silk"))
                title = "Ethnic Saree Collection";
            else if (matchedKeywords.Contains("lehenga"))
                title = "Designer Lehenga Collection";
            else if (matchedKeywords.Contains("kurti"))
                title = "Curated Kurti Collection";
            else
                title = "New Story Collection";
        }

        return new SuggestedMetadata
        {
            Title = title,
            Keywords = finalKeywords
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

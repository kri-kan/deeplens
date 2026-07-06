using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using DeepLens.Application.Abstractions.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services;

public class AiService : IAiService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly IAppSettingsService _appSettings;
    private readonly ILogger<AiService> _logger;

    private const string YoutubeShortsTitlePrompt = @"You are a YouTube Shorts expert. Generate a catchy, engaging, and high-CTR title for a YouTube Short based on the following description.
Follow Google Shorts Title Guidelines:
1. Keep it concise (under 60 characters is best).
2. Use strong, relevant keywords at the beginning.
3. Include #shorts at the end.
4. Make it engaging or curiosity-driven.
5. Do not use clickbait that misleads.

Description: {0}

Return ONLY the title text without any quotes or additional explanations.";

    public AiService(HttpClient httpClient, IConfiguration configuration, IAppSettingsService appSettings, ILogger<AiService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _appSettings = appSettings;
        _logger = logger;
    }

    public async Task<string> GenerateYoutubeShortTitleAsync(string description)
    {
        var baseUrl = _configuration["Services:ReasoningApiUrl"] ?? "http://localhost:8002";

        try
        {
            _logger.LogInformation("Requesting title generation from ReasoningService at {BaseUrl}", baseUrl);
            var response = await _httpClient.PostAsJsonAsync($"{baseUrl.TrimEnd('/')}/generate-youtube-title", new { description });
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("ReasoningService API returned error: {StatusCode}. Body: {Body}", response.StatusCode, errorContent);
                throw new Exception($"Reasoning service returned error: {response.StatusCode}");
            }

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            var result = await response.Content.ReadFromJsonAsync<YoutubeTitleResponse>(options);
            var title = result?.Title?.Trim() ?? string.Empty;

            // Clean up the generated title
            title = title.Trim('\"', '\'', ' ', '\r', '\n');

            _logger.LogInformation("Generated title: {Title}", title);
            return title;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Network error while connecting to ReasoningService at {BaseUrl}", baseUrl);
            throw new Exception("Could not connect to AI service. Please check if ReasoningService is running.", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in AI title generation");
            throw new Exception("AI title generation failed due to an internal error.", ex);
        }
    }

    private class YoutubeTitleResponse
    {
        [JsonPropertyName("title")]
        public string? Title { get; set; }
    }



    public async Task<ExtractedProductInfo> ExtractProductInfoAsync(string description, bool isManual = false)
    {
        var baseUrl = _configuration["Services:ReasoningApiUrl"] ?? "http://localhost:8002";
        // priority=0 → HIGH (manual user action); priority=1 → LOW (bulk automation)
        var priorityParam = isManual ? 0 : 1;

        try
        {
            _logger.LogInformation("Requesting fast product info extraction from ReasoningService at {BaseUrl} (isManual={IsManual})", baseUrl, isManual);
            var response = await _httpClient.PostAsJsonAsync($"{baseUrl.TrimEnd('/')}/extract-product?priority={priorityParam}", new { description });
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("ReasoningService API returned error: {StatusCode}. Body: {Body}", response.StatusCode, errorContent);
                throw new Exception($"Reasoning service returned error: {response.StatusCode}");
            }

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
            
            var extractedInfo = await response.Content.ReadFromJsonAsync<ExtractedProductInfo>(options);

            if (extractedInfo == null)
            {
                throw new Exception("ReasoningService returned empty or invalid JSON structure.");
            }

            extractedInfo.Category = (extractedInfo.Category ?? "Others").Trim();
            if (extractedInfo.Category.Length > 100)
            {
                extractedInfo.Category = extractedInfo.Category.Substring(0, 100);
            }

            extractedInfo.SubCategory = (extractedInfo.SubCategory ?? "General").Trim();
            if (extractedInfo.SubCategory.Length > 100)
            {
                extractedInfo.SubCategory = extractedInfo.SubCategory.Substring(0, 100);
            }
            extractedInfo.Title = (extractedInfo.Title ?? "New Product").Trim();
            if (extractedInfo.Title.Length > 200)
            {
                extractedInfo.Title = extractedInfo.Title.Substring(0, 200);
            }
            extractedInfo.Fabric = (extractedInfo.Fabric ?? "Unknown").Trim();
            extractedInfo.StitchType = (extractedInfo.StitchType ?? "Unstitched").Trim();
            extractedInfo.Color = (extractedInfo.Color ?? "Unknown").Trim();
            extractedInfo.Sizes ??= System.Array.Empty<string>();
            extractedInfo.Tags ??= System.Array.Empty<string>();

            return extractedInfo;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to extract product info from description via ReasoningService");
            throw;
        }
    }

    private class OllamaResponse
    {
        [JsonPropertyName("model")]
        public string? Model { get; set; }

        [JsonPropertyName("response")]
        public string? Response { get; set; }

        [JsonPropertyName("done")]
        public bool Done { get; set; }
    }
}

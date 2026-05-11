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
        var settings = await _appSettings.GetSectionInternalAsync("AI");
        var baseUrl = settings.FirstOrDefault(s => s.Key == "Ai:OllamaBaseUrl")?.Value 
                     ?? _configuration["Ollama:BaseUrl"] 
                     ?? "http://localhost:11434";
        var model = settings.FirstOrDefault(s => s.Key == "Ai:OllamaModel")?.Value 
                   ?? _configuration["Ollama:Model"] 
                   ?? "llama3";

        _httpClient.BaseAddress = new Uri(baseUrl);
        var prompt = string.Format(YoutubeShortsTitlePrompt, description);

        var requestBody = new
        {
            model = model,
            prompt = prompt,
            stream = false
        };

        try
        {
            _logger.LogInformation("Requesting title generation from Ollama at {BaseUrl} using model {Model}", baseUrl, model);
            var response = await _httpClient.PostAsJsonAsync("/api/generate", requestBody);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Ollama API returned error: {StatusCode}. Body: {Body}", response.StatusCode, errorContent);
                throw new Exception($"AI service returned error: {response.StatusCode}");
            }

            var result = await response.Content.ReadFromJsonAsync<OllamaResponse>();
            var title = result?.Response?.Trim() ?? string.Empty;

            // Clean up the generated title
            title = title.Trim('\"', '\'', ' ', '\r', '\n');

            _logger.LogInformation("Generated title: {Title}", title);
            return title;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Network error while connecting to Ollama at {BaseUrl}", _httpClient.BaseAddress);
            throw new Exception("Could not connect to AI service. Please check if Ollama is running.", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in AI title generation");
            throw new Exception("AI title generation failed due to an internal error.", ex);
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

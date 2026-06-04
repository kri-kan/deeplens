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

    private const string ProductExtractionPrompt = @"You are an expert product catalog extraction AI. Analyze the given WhatsApp product description from a vendor and extract the following product details in JSON format.

WhatsApp Description:
{0}

Extract and populate these fields in the JSON response:
1. ""category"": Main product category (e.g. Saree, Dress, Kurti, Lehenga, Kids Wear, Mens Wear, Fabric, Others). If unsure, use ""Others"".
2. ""subCategory"": Subcategory or type (e.g. Silk Saree, Cotton Kurti, Georgette Dress, Semi-Stitched Lehenga).
3. ""price"": The base price as a decimal number. If no price is mentioned, use null. Ignore formatting characters like Currency symbols.
4. ""shippingInfo"": Use ""free"" if free shipping or delivery is mentioned. Use ""extra"" if shipping is extra, plus, or not free. Otherwise, use ""extra"" as default.
5. ""fabric"": The material/fabric (e.g. Silk, Georgette, Cotton, Organza, Crepe, Net, Velvet). If unknown, use ""Unknown"".
6. ""stitchType"": The stitch type (e.g. Unstitched, Semi-Stitched, Stitched, Free Size).
7. ""tags"": An array of relevant search tags/keywords (e.g. [""partywear"", ""wedding"", ""zari border""]).

Output ONLY the JSON object. Do not wrap in markdown or add explanations. Example output:
{{
  ""category"": ""Saree"",
  ""subCategory"": ""Organza Saree"",
  ""price"": 1250.00,
  ""shippingInfo"": ""free"",
  ""fabric"": ""Organza"",
  ""stitchType"": ""Unstitched"",
  ""tags"": [""organza"", ""saree"", ""floral"", ""partywear""]
}}";

    public async Task<ExtractedProductInfo> ExtractProductInfoAsync(string description)
    {
        var settings = await _appSettings.GetSectionInternalAsync("AI");
        var baseUrl = settings.FirstOrDefault(s => s.Key == "Ai:OllamaBaseUrl")?.Value 
                     ?? _configuration["Ollama:BaseUrl"] 
                     ?? "http://localhost:11434";
        var model = settings.FirstOrDefault(s => s.Key == "Ai:OllamaModel")?.Value 
                   ?? _configuration["Ollama:Model"] 
                   ?? "llama3";

        _httpClient.BaseAddress = new Uri(baseUrl);
        var prompt = string.Format(ProductExtractionPrompt, description);

        var requestBody = new
        {
            model = model,
            prompt = prompt,
            stream = false,
            format = "json"
        };

        try
        {
            _logger.LogInformation("Requesting product info extraction from Ollama at {BaseUrl} using model {Model}", baseUrl, model);
            var response = await _httpClient.PostAsJsonAsync("/api/generate", requestBody);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Ollama API returned error: {StatusCode}. Body: {Body}", response.StatusCode, errorContent);
                throw new Exception($"AI service returned error: {response.StatusCode}");
            }

            var result = await response.Content.ReadFromJsonAsync<OllamaResponse>();
            var responseText = result?.Response?.Trim() ?? string.Empty;

            _logger.LogDebug("Ollama raw response: {Response}", responseText);

            if (responseText.StartsWith("```"))
            {
                var lines = responseText.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                var jsonLines = lines.Skip(1).Take(lines.Length - 2);
                responseText = string.Join("\n", jsonLines).Trim();
            }

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
            
            var extractedInfo = JsonSerializer.Deserialize<ExtractedProductInfo>(responseText, options);

            if (extractedInfo == null)
            {
                throw new Exception("Ollama returned empty or invalid JSON structure.");
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
            extractedInfo.ShippingInfo = (extractedInfo.ShippingInfo ?? "extra").Trim().ToLower();
            extractedInfo.Fabric = (extractedInfo.Fabric ?? "Unknown").Trim();
            extractedInfo.StitchType = (extractedInfo.StitchType ?? "Unstitched").Trim();
            extractedInfo.Tags ??= System.Array.Empty<string>();

            return extractedInfo;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to extract product info from description");
            return new ExtractedProductInfo
            {
                Category = "Others",
                SubCategory = "General",
                ShippingInfo = "extra",
                Fabric = "Unknown",
                StitchType = "Unstitched",
                Tags = System.Array.Empty<string>()
            };
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

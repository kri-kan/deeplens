using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using DeepLens.Application.Abstractions.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;
using Polly.Timeout;

namespace DeepLens.Infrastructure.Services;

public class LiteLlmService : ILiteLlmService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<LiteLlmService> _logger;
    private readonly ResiliencePipeline _resiliencePipeline;

    public LiteLlmService(HttpClient httpClient, IConfiguration configuration, ILogger<LiteLlmService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;

        _resiliencePipeline = new ResiliencePipelineBuilder()
            .AddRetry(new RetryStrategyOptions
            {
                MaxRetryAttempts = 3,
                Delay = TimeSpan.FromSeconds(1),
                BackoffType = DelayBackoffType.Exponential,
                ShouldHandle = new PredicateBuilder().Handle<HttpRequestException>().Handle<TimeoutRejectedException>(),
                OnRetry = args =>
                {
                    _logger.LogWarning("LiteLLM Gateway call failed. Retrying attempt {AttemptNumber} after {Delay}...", args.AttemptNumber, args.RetryDelay);
                    return ValueTask.CompletedTask;
                }
            })
            .AddTimeout(TimeSpan.FromSeconds(90))
            .Build();
    }

    public async Task<string> GetChatCompletionAsync(string prompt, string? systemPrompt = null, bool jsonMode = true, CancellationToken cancellationToken = default)
    {
        var baseUrl = _configuration["LiteLLM:BaseUrl"] ?? "http://litellm:4000/v1";
        var apiKey = _configuration["LiteLLM:ApiKey"] ?? "sk-deeplens-master-key";
        var model = _configuration["LiteLLM:Model"] ?? "deeplens-llm";

        var messages = new List<ChatMessage>();
        if (!string.IsNullOrWhiteSpace(systemPrompt))
        {
            messages.Add(new ChatMessage { Role = "system", Content = systemPrompt });
        }
        messages.Add(new ChatMessage { Role = "user", Content = prompt });

        var requestBody = new ChatCompletionRequest
        {
            Model = model,
            Messages = messages,
            Temperature = 0.1,
            ResponseFormat = jsonMode ? new ResponseFormat { Type = "json_object" } : null
        };

        return await _resiliencePipeline.ExecuteAsync(async state =>
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/chat/completions");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = JsonContent.Create(requestBody);

            _logger.LogInformation("Sending chat completion request to LiteLLM Gateway ({BaseUrl}) with model {Model}", baseUrl, model);
            using var response = await _httpClient.SendAsync(request, cancellationToken);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("LiteLLM Gateway returned error status {StatusCode}: {ErrorBody}", response.StatusCode, errorBody);
                throw new HttpRequestException($"LiteLLM Gateway returned error: {response.StatusCode} - {errorBody}");
            }

            var result = await response.Content.ReadFromJsonAsync<ChatCompletionResponse>(cancellationToken: cancellationToken);
            var content = result?.Choices?.FirstOrDefault()?.Message?.Content;

            if (string.IsNullOrWhiteSpace(content))
            {
                _logger.LogWarning("LiteLLM Gateway returned empty content response.");
                return string.Empty;
            }

            return content;
        }, cancellationToken);
    }

    public async Task<bool> CheckHealthAsync(CancellationToken cancellationToken = default)
    {
        var baseUrl = _configuration["LiteLLM:BaseUrl"] ?? "http://litellm:4000/v1";
        var apiKey = _configuration["LiteLLM:ApiKey"] ?? "sk-deeplens-master-key";

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl.TrimEnd('/')}/models");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Health check failed for LiteLLM Gateway at {BaseUrl}", baseUrl);
            return false;
        }
    }

    private class ChatCompletionRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("messages")]
        public List<ChatMessage> Messages { get; set; } = new();

        [JsonPropertyName("temperature")]
        public double Temperature { get; set; } = 0.1;

        [JsonPropertyName("response_format")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public ResponseFormat? ResponseFormat { get; set; }
    }

    private class ResponseFormat
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = "json_object";
    }

    private class ChatMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }

    private class ChatCompletionResponse
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("choices")]
        public List<ChatChoice>? Choices { get; set; }
    }

    private class ChatChoice
    {
        [JsonPropertyName("index")]
        public int Index { get; set; }

        [JsonPropertyName("message")]
        public ChatMessage? Message { get; set; }

        [JsonPropertyName("finish_reason")]
        public string? FinishReason { get; set; }
    }
}

using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using DeepLens.Contracts.Events;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text;
using System.Net.Http;
using Confluent.Kafka;
using DeepLens.Infrastructure.Services;

namespace DeepLens.WorkerService.Workers;

/// <summary>
/// Kafka consumer that handles feature extraction. Single-tenant version.
/// </summary>
public class FeatureExtractionWorker : BackgroundService
{
    private readonly ILogger<FeatureExtractionWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IConsumer<string, string> _consumer;
    private readonly IProducer<string, string> _producer;
    private readonly HttpClient _pythonServiceClient;
    private readonly string[] _subscriptionTopics;

    public FeatureExtractionWorker(
        ILogger<FeatureExtractionWorker> logger,
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _subscriptionTopics = new[] { KafkaTopics.FeatureExtraction };

        _pythonServiceClient = httpClientFactory.CreateClient("FeatureExtractionService");
        var pythonServiceUrl = configuration.GetConnectionString("FeatureExtractionService") ?? "http://localhost:8001";
        _pythonServiceClient.BaseAddress = new Uri(pythonServiceUrl);

        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "localhost:9092",
            GroupId = "deeplens-feature-extraction-workers",
            ClientId = Environment.MachineName + "-feature-extractor",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false
        };

        var producerConfig = new ProducerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "localhost:9092",
            ClientId = Environment.MachineName + "-feature-extractor-producer"
        };

        _consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
        _producer = new ProducerBuilder<string, string>(producerConfig).Build();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();
        _logger.LogInformation("FeatureExtractionWorker starting.");
        try
        {
            _consumer.Subscribe(_subscriptionTopics);
            while (!stoppingToken.IsCancellationRequested)
            {
                var consumeResult = _consumer.Consume(TimeSpan.FromSeconds(1));
                if (consumeResult?.Message != null)
                {
                    await ProcessMessage(consumeResult, stoppingToken);
                    _consumer.Commit(consumeResult);
                }
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in FeatureExtractionWorker");
        }
        finally
        {
            _consumer.Close();
        }
    }

    private async Task ProcessMessage(ConsumeResult<string, string> consumeResult, CancellationToken cancellationToken)
    {
        try
        {
            if (consumeResult.Topic == KafkaTopics.FeatureExtraction)
            {
                await ProcessFeatureExtractionRequest(consumeResult.Message.Value, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing feature extraction message");
        }
    }

    private async Task ProcessFeatureExtractionRequest(string messageJson, CancellationToken cancellationToken)
    {
        var extractionEvent = JsonSerializer.Deserialize<FeatureExtractionRequestedEvent>(messageJson);
        if (extractionEvent == null) return;

        _logger.LogInformation("Processing feature extraction for ImageId: {ImageId}", extractionEvent.Data.ImageId);

        try
        {
            var imageBytes = await ReadImageFromStorage(extractionEvent.Data.ImagePath, cancellationToken);
            if (imageBytes == null) return;

            var extractionResponse = await CallFeatureExtractionService(imageBytes, extractionEvent.Data.ImageId.ToString(), extractionEvent.Data.ImagePath, cancellationToken);
            if (extractionResponse?.Features == null) return;

            using (var scope = _serviceProvider.CreateScope())
            {
                var metadataService = scope.ServiceProvider.GetRequiredService<IMetadataService>();
                await metadataService.UpdateMediaDimensionsAsync(extractionEvent.Data.ImageId, extractionResponse.ImageWidth ?? 0, extractionResponse.ImageHeight ?? 0);
            }

            var indexingEvent = new VectorIndexingRequestedEvent
            {
                EventId = Guid.NewGuid(),
                EventType = EventTypes.VectorIndexingRequested,
                EventVersion = "1.0",
                TenantId = "SINGLE_TENANT",
                CorrelationId = extractionEvent.CorrelationId,
                Timestamp = DateTime.UtcNow,
                Data = new VectorIndexingData
                {
                    ImageId = extractionEvent.Data.ImageId,
                    ModelName = extractionEvent.Data.ModelName,
                    FeatureVector = extractionResponse.Features.ToArray(),
                    VectorMetadata = new VectorMetadata { ModelVersion = extractionResponse.ModelName },
                    ImageMetadata = new ImageMetadata
                    {
                        Width = extractionResponse.ImageWidth ?? 0,
                        Height = extractionResponse.ImageHeight ?? 0,
                        Format = extractionResponse.ImageFormat ?? "unknown"
                    }
                }
            };

            await _producer.ProduceAsync(KafkaTopics.VectorIndexing, new Message<string, string>
            {
                Key = extractionEvent.Data.ImageId.ToString(),
                Value = JsonSerializer.Serialize(indexingEvent)
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Feature extraction failed for {ImageId}", extractionEvent.Data.ImageId);
        }
    }

    private async Task<byte[]?> ReadImageFromStorage(string imagePath, CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var storageService = scope.ServiceProvider.GetRequiredService<IStorageService>();
        using var stream = await storageService.GetFileAsync(imagePath);
        using var memoryStream = new MemoryStream();
        await stream.CopyToAsync(memoryStream, cancellationToken);
        return memoryStream.ToArray();
    }

    private async Task<ExtractFeaturesResponse?> CallFeatureExtractionService(byte[] imageBytes, string imageId, string imagePath, CancellationToken cancellationToken)
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(imageBytes);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        content.Add(fileContent, "file", "image.jpg");
        content.Add(new StringContent(imageId), "image_id");
        content.Add(new StringContent("true"), "return_metadata");

        var response = await _pythonServiceClient.PostAsync("/extract-features", content, cancellationToken);
        if (!response.IsSuccessStatusCode) return null;

        var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
        return JsonSerializer.Deserialize<ExtractFeaturesResponse>(responseJson);
    }

    public override void Dispose()
    {
        _consumer?.Dispose();
        _producer?.Dispose();
        base.Dispose();
    }
}

public class ExtractFeaturesResponse
{
    [JsonPropertyName("image_id")]
    public string? ImageId { get; set; }
    [JsonPropertyName("features")]
    public required List<float> Features { get; set; }
    [JsonPropertyName("model_name")]
    public required string ModelName { get; set; }
    [JsonPropertyName("image_width")]
    public int? ImageWidth { get; set; }
    [JsonPropertyName("image_height")]
    public int? ImageHeight { get; set; }
    [JsonPropertyName("image_format")]
    public string? ImageFormat { get; set; }
}
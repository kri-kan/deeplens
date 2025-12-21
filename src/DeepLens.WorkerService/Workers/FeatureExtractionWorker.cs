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
/// Kafka consumer that handles feature extraction requests by calling the Python ML service.
/// Publishes vector indexing events when feature extraction is complete.
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

        // Configure HTTP client for Python service
        _pythonServiceClient = httpClientFactory.CreateClient("FeatureExtractionService");
        var pythonServiceUrl = configuration.GetConnectionString("FeatureExtractionService") ?? "http://localhost:8001";
        _pythonServiceClient.BaseAddress = new Uri(pythonServiceUrl);
        _pythonServiceClient.Timeout = TimeSpan.FromSeconds(60); // Generous timeout for ML processing

        // Configure Kafka consumer
        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "localhost:9092",
            GroupId = "deeplens-feature-extraction-workers",
            ClientId = Environment.MachineName + "-feature-extractor",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false,
            SessionTimeoutMs = 45000, // Longer for ML processing
            HeartbeatIntervalMs = 3000,
            MaxPollIntervalMs = 600000, // 10 minutes for ML processing
            FetchMinBytes = 1
        };

        // Configure Kafka producer
        var producerConfig = new ProducerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "localhost:9092",
            ClientId = Environment.MachineName + "-feature-extractor-producer",
            Acks = Acks.All,
            RetryBackoffMs = 1000,
            MessageTimeoutMs = 30000,
            BatchSize = 16384,
            LingerMs = 10,
            CompressionType = CompressionType.Snappy
        };

        _consumer = new ConsumerBuilder<string, string>(consumerConfig)
            .SetErrorHandler((_, e) => _logger.LogError("Feature extraction consumer error: {Error}", e.Reason))
            .Build();

        _producer = new ProducerBuilder<string, string>(producerConfig)
            .SetErrorHandler((_, e) => _logger.LogError("Feature extraction producer error: {Error}", e.Reason))
            .Build();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("FeatureExtractionWorker starting. Subscribing to topics: {Topics}", 
            string.Join(", ", _subscriptionTopics));

        try
        {
            _consumer.Subscribe(_subscriptionTopics);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var consumeResult = _consumer.Consume(TimeSpan.FromSeconds(1));
                    
                    if (consumeResult?.Message != null)
                    {
                        await ProcessMessage(consumeResult, stoppingToken);
                    }
                }
                catch (ConsumeException ex)
                {
                    _logger.LogError(ex, "Error consuming feature extraction message from Kafka");
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("FeatureExtractionWorker stopping due to cancellation");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in FeatureExtractionWorker");
        }
        finally
        {
            try
            {
                _consumer.Close();
                _producer.Flush(TimeSpan.FromSeconds(10));
                _producer.Dispose();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error closing Kafka connections");
            }
        }
    }

    private async Task ProcessMessage(ConsumeResult<string, string> consumeResult, CancellationToken cancellationToken)
    {
        var messageId = $"{consumeResult.Topic}-{consumeResult.Partition}-{consumeResult.Offset}";
        
        using var scope = _serviceProvider.CreateScope();
        using var activity = System.Diagnostics.Activity.Current?.Source.StartActivity("ProcessFeatureExtractionRequest");
        
        try
        {
            _logger.LogDebug("Processing feature extraction message {MessageId}", messageId);

            if (consumeResult.Topic == KafkaTopics.FeatureExtraction)
            {
                await ProcessFeatureExtractionRequest(consumeResult.Message.Value, cancellationToken);
            }

            _consumer.Commit(consumeResult);
            _logger.LogDebug("Successfully processed feature extraction message {MessageId}", messageId);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "JSON deserialization error for feature extraction message {MessageId}", messageId);
            _consumer.Commit(consumeResult); // Skip malformed messages
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP error calling Python service for message {MessageId}. Will retry.", messageId);
            // Don't commit - message will be retried
            await HandleFeatureExtractionError(consumeResult.Message.Value, ex, "http_error", cancellationToken);
        }
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
        {
            _logger.LogError(ex, "Timeout calling Python service for message {MessageId}. Will retry.", messageId);
            // Don't commit - message will be retried
            await HandleFeatureExtractionError(consumeResult.Message.Value, ex, "timeout", cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing feature extraction message {MessageId}", messageId);
            await HandleFeatureExtractionError(consumeResult.Message.Value, ex, "processing_error", cancellationToken);
        }
    }

    private async Task ProcessFeatureExtractionRequest(string messageJson, CancellationToken cancellationToken)
    {
        var extractionEvent = JsonSerializer.Deserialize<FeatureExtractionRequestedEvent>(messageJson);
        
        if (extractionEvent == null)
        {
            _logger.LogError("Failed to deserialize FeatureExtractionRequestedEvent");
            return;
        }

        _logger.LogInformation("Processing feature extraction for ImageId: {ImageId}, Model: {ModelName}", 
            extractionEvent.Data.ImageId, extractionEvent.Data.ModelName);

        var startTime = DateTime.UtcNow;

        try
        {
            // Read image file from storage
            var imageBytes = await ReadImageFromStorage(extractionEvent.Data.ImagePath, cancellationToken);
            
            if (imageBytes == null || imageBytes.Length == 0)
            {
                throw new InvalidOperationException($"Failed to read image from path: {extractionEvent.Data.ImagePath}");
            }

            // Call Python feature extraction service
            var extractionResponse = await CallFeatureExtractionService(
                imageBytes, 
                extractionEvent.Data.ImageId.ToString(),
                extractionEvent.Data.ExtractionOptions.ReturnMetadata,
                cancellationToken);

            // Validate response
            if (extractionResponse?.Features == null || extractionResponse.Features.Count == 0)
            {
                throw new InvalidOperationException("Python service returned empty feature vector");
            }

            if (extractionResponse.Features.Count != extractionEvent.Data.ExpectedDimension)
            {
                _logger.LogWarning("Feature dimension mismatch. Expected: {Expected}, Got: {Actual}", 
                    extractionEvent.Data.ExpectedDimension, extractionResponse.Features.Count);
            }

            var processingTime = (DateTime.UtcNow - startTime).TotalMilliseconds;

            // Update dimensions in database
            using (var scope = _serviceProvider.CreateScope())
            {
                var metadataService = scope.ServiceProvider.GetRequiredService<DeepLens.Infrastructure.Services.ITenantMetadataService>();
                await metadataService.UpdateMediaDimensionsAsync(Guid.Parse(extractionEvent.TenantId), 
                    extractionEvent.Data.ImageId, extractionResponse.ImageWidth ?? 0, extractionResponse.ImageHeight ?? 0);
            }

            // Create vector indexing event
            var indexingEvent = new VectorIndexingRequestedEvent
            {
                EventId = Guid.NewGuid(),
                EventType = EventTypes.VectorIndexingRequested,
                EventVersion = "1.0",
                TenantId = extractionEvent.TenantId,
                CorrelationId = extractionEvent.CorrelationId,
                Timestamp = DateTime.UtcNow,
                Data = new VectorIndexingData
                {
                    ImageId = extractionEvent.Data.ImageId,
                    ModelName = extractionEvent.Data.ModelName,
                    FeatureVector = extractionResponse.Features.ToArray(),
                    VectorMetadata = new VectorMetadata
                    {
                        ExtractionTime = DateTime.UtcNow,
                        ProcessingTimeMs = extractionResponse.ProcessingTimeMs,
                        ModelVersion = extractionResponse.ModelName, // Python service returns model info
                        ExtractorVersion = "python-fastapi-v1.0"
                    },
                    ImageMetadata = new ImageMetadata
                    {
                        Width = extractionResponse.ImageWidth ?? 0,
                        Height = extractionResponse.ImageHeight ?? 0,
                        Format = extractionResponse.ImageFormat ?? "unknown"
                    }
                }
            };

            // Publish vector indexing request
            var eventJson = JsonSerializer.Serialize(indexingEvent);
            var message = new Message<string, string>
            {
                Key = extractionEvent.Data.ImageId.ToString(),
                Value = eventJson,
                Headers = new Headers
                {
                    { "eventType", Encoding.UTF8.GetBytes(EventTypes.VectorIndexingRequested) },
                    { "tenantId", Encoding.UTF8.GetBytes(extractionEvent.TenantId) },
                    { "correlationId", Encoding.UTF8.GetBytes(extractionEvent.CorrelationId?.ToString() ?? "") },
                    { "modelName", Encoding.UTF8.GetBytes(extractionEvent.Data.ModelName) }
                }
            };

            var deliveryResult = await _producer.ProduceAsync(KafkaTopics.VectorIndexing, message, cancellationToken);
            
            _logger.LogInformation("Published vector indexing request for ImageId: {ImageId} to topic {Topic} at offset {Offset}. Processing took {ProcessingTime}ms",
                extractionEvent.Data.ImageId, deliveryResult.Topic, deliveryResult.Offset, processingTime);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing feature extraction for ImageId: {ImageId}", 
                extractionEvent.Data.ImageId);
            throw; // Re-throw to trigger retry logic
        }
    }

    private async Task<byte[]?> ReadImageFromStorage(string imagePath, CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var storageService = scope.ServiceProvider.GetRequiredService<IStorageService>();
            
            // imagePath format: "tenant-{guid}/raw/yyyy/MM/dd/guid_filename.ext"
            // Extract tenantId from the path
            var parts = imagePath.Split('/', 2);
            if (parts.Length < 2 || !parts[0].StartsWith("tenant-"))
            {
                _logger.LogError("Invalid storage path format: {ImagePath}", imagePath);
                return null;
            }
            
            var tenantIdStr = parts[0].Replace("tenant-", "");
            if (!Guid.TryParse(tenantIdStr, out var tenantId))
            {
                _logger.LogError("Invalid tenant ID in path: {ImagePath}", imagePath);
                return null;
            }
            
            using var stream = await storageService.GetFileAsync(tenantId, imagePath);
            using var memoryStream = new MemoryStream();
            await stream.CopyToAsync(memoryStream, cancellationToken);
            return memoryStream.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading image from storage: {ImagePath}", imagePath);
            return null;
        }
    }

    private async Task<ExtractFeaturesResponse?> CallFeatureExtractionService(
        byte[] imageBytes, 
        string imageId, 
        bool returnMetadata,
        CancellationToken cancellationToken)
    {
        try
        {
            using var content = new MultipartFormDataContent();
            
            // Add image file
            content.Add(new ByteArrayContent(imageBytes), "file", "image.jpg");
            content.Add(new StringContent(imageId), "image_id");
            content.Add(new StringContent(returnMetadata.ToString().ToLower()), "return_metadata");

            var response = await _pythonServiceClient.PostAsync("/extract-features", content, cancellationToken);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException(
                    $"Python service returned {response.StatusCode}: {errorContent}");
            }

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
            return JsonSerializer.Deserialize<ExtractFeaturesResponse>(responseJson);
        }
        catch (HttpRequestException)
        {
            throw; // Re-throw HTTP exceptions
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling Python feature extraction service");
            throw new HttpRequestException("Failed to call Python feature extraction service", ex);
        }
    }

    private async Task HandleFeatureExtractionError(string messageJson, Exception exception, 
        string errorCode, CancellationToken cancellationToken)
    {
        try
        {
            var extractionEvent = JsonSerializer.Deserialize<FeatureExtractionRequestedEvent>(messageJson);
            if (extractionEvent == null) return;

            var failedEvent = new ProcessingFailedEvent
            {
                EventId = Guid.NewGuid(),
                EventType = EventTypes.ProcessingFailed,
                EventVersion = "1.0",
                TenantId = extractionEvent.TenantId,
                CorrelationId = extractionEvent.CorrelationId,
                Timestamp = DateTime.UtcNow,
                Data = new ProcessingFailedData
                {
                    ImageId = extractionEvent.Data.ImageId,
                    FailedStep = "feature_extraction",
                    ErrorMessage = exception.Message,
                    ErrorCode = errorCode,
                    RetryAttempt = extractionEvent.RetryPolicy.CurrentAttempt,
                    CanRetry = extractionEvent.RetryPolicy.CurrentAttempt < extractionEvent.RetryPolicy.MaxAttempts,
                    OriginalEvent = extractionEvent
                }
            };

            var eventJson = JsonSerializer.Serialize(failedEvent);
            var message = new Message<string, string>
            {
                Key = extractionEvent.Data.ImageId.ToString(),
                Value = eventJson
            };

            await _producer.ProduceAsync(KafkaTopics.ProcessingFailed, message, cancellationToken);
            
            _logger.LogInformation("Published feature extraction failed event for ImageId: {ImageId}", 
                extractionEvent.Data.ImageId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish feature extraction failed event");
        }
    }

    public override void Dispose()
    {
        try
        {
            _pythonServiceClient?.Dispose();
            _consumer?.Close();
            _consumer?.Dispose();
            _producer?.Flush(TimeSpan.FromSeconds(10));
            _producer?.Dispose();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error disposing FeatureExtractionWorker");
        }
        
        base.Dispose();
    }
}

// DTO for Python service response
public class ExtractFeaturesResponse
{
    [JsonPropertyName("image_id")]
    public string? ImageId { get; set; }

    [JsonPropertyName("features")]
    public required List<float> Features { get; set; }

    [JsonPropertyName("feature_dimension")]
    public int FeatureDimension { get; set; }

    [JsonPropertyName("model_name")]
    public required string ModelName { get; set; }

    [JsonPropertyName("processing_time_ms")]
    public double ProcessingTimeMs { get; set; }

    [JsonPropertyName("image_width")]
    public int? ImageWidth { get; set; }

    [JsonPropertyName("image_height")]
    public int? ImageHeight { get; set; }

    [JsonPropertyName("image_format")]
    public string? ImageFormat { get; set; }
}
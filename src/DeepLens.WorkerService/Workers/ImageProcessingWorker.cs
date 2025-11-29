using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using DeepLens.Contracts.Events;
using System.Text.Json;
using Confluent.Kafka;

namespace DeepLens.WorkerService.Workers;

/// <summary>
/// Kafka consumer that handles image upload events and triggers feature extraction requests.
/// Part of the async processing pipeline for DeepLens.
/// </summary>
public class ImageProcessingWorker : BackgroundService
{
    private readonly ILogger<ImageProcessingWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IConsumer<string, string> _consumer;
    private readonly IProducer<string, string> _producer;
    private readonly string[] _subscriptionTopics;

    public ImageProcessingWorker(
        ILogger<ImageProcessingWorker> logger,
        IServiceProvider serviceProvider,
        IConfiguration configuration)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _subscriptionTopics = new[] { KafkaTopics.ImageUploaded };

        // Configure Kafka consumer
        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "localhost:9092",
            GroupId = "deeplens-image-processing-workers",
            ClientId = Environment.MachineName + "-image-processor",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false, // Manual commit for better reliability
            SessionTimeoutMs = 30000,
            HeartbeatIntervalMs = 3000,
            MaxPollIntervalMs = 300000, // 5 minutes for long-running processing
            // Optimize for throughput
            FetchMinBytes = 1024,
            FetchMaxWaitMs = 500
        };

        // Configure Kafka producer  
        var producerConfig = new ProducerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "localhost:9092",
            ClientId = Environment.MachineName + "-image-processor-producer",
            // Reliability settings
            Acks = Acks.All,
            Retries = 3,
            RetryBackoffMs = 1000,
            MessageTimeoutMs = 30000,
            // Performance settings
            BatchSize = 16384,
            LingerMs = 10,
            CompressionType = CompressionType.Snappy
        };

        _consumer = new ConsumerBuilder<string, string>(consumerConfig)
            .SetErrorHandler((_, e) => _logger.LogError("Kafka consumer error: {Error}", e.Reason))
            .SetPartitionsAssignedHandler((c, partitions) =>
            {
                _logger.LogInformation("Assigned partitions: [{Partitions}]", string.Join(", ", partitions));
            })
            .Build();

        _producer = new ProducerBuilder<string, string>(producerConfig)
            .SetErrorHandler((_, e) => _logger.LogError("Kafka producer error: {Error}", e.Reason))
            .Build();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ImageProcessingWorker starting. Subscribing to topics: {Topics}", 
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
                    _logger.LogError(ex, "Error consuming message from Kafka");
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("ImageProcessingWorker stopping due to cancellation");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in ImageProcessingWorker");
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
        using var activity = System.Diagnostics.Activity.Current?.Source.StartActivity("ProcessImageUploadEvent");
        
        try
        {
            _logger.LogDebug("Processing message {MessageId} from topic {Topic}", 
                messageId, consumeResult.Topic);

            // Deserialize the event based on topic
            if (consumeResult.Topic == KafkaTopics.ImageUploaded)
            {
                await ProcessImageUploadedEvent(consumeResult.Message.Value, cancellationToken);
            }
            else
            {
                _logger.LogWarning("Unknown topic {Topic} for message {MessageId}", 
                    consumeResult.Topic, messageId);
            }

            // Commit the message after successful processing
            _consumer.Commit(consumeResult);
            
            _logger.LogDebug("Successfully processed and committed message {MessageId}", messageId);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "JSON deserialization error for message {MessageId}. Message will be skipped.", messageId);
            _consumer.Commit(consumeResult); // Skip malformed messages
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing message {MessageId}. Message will be retried.", messageId);
            
            // Don't commit - message will be retried
            // In production, implement dead letter queue after max retries
            await HandleProcessingError(consumeResult.Message.Value, ex, cancellationToken);
        }
    }

    private async Task ProcessImageUploadedEvent(string messageJson, CancellationToken cancellationToken)
    {
        var uploadEvent = JsonSerializer.Deserialize<ImageUploadedEvent>(messageJson);
        
        if (uploadEvent == null)
        {
            _logger.LogError("Failed to deserialize ImageUploadedEvent");
            return;
        }

        _logger.LogInformation("Processing image upload for ImageId: {ImageId}, TenantId: {TenantId}", 
            uploadEvent.Data.ImageId, uploadEvent.TenantId);

        // For Phase 1: Process with single ResNet50 model
        // Phase 2: Loop through uploadEvent.ProcessingOptions.Models
        var modelName = "resnet50";

        try 
        {
            // Create feature extraction request event
            var extractionEvent = new FeatureExtractionRequestedEvent
            {
                EventId = Guid.NewGuid(),
                TenantId = uploadEvent.TenantId,
                CorrelationId = uploadEvent.EventId,
                Timestamp = DateTime.UtcNow,
                Data = new FeatureExtractionData
                {
                    ImageId = uploadEvent.Data.ImageId,
                    ImagePath = uploadEvent.Data.FilePath,
                    ModelName = modelName,
                    ModelVersion = "v2.7",
                    ExpectedDimension = 2048,
                    ExtractionOptions = new ExtractionOptions
                    {
                        Normalize = true,
                        ReturnMetadata = true,
                        TimeoutSeconds = 30
                    }
                },
                RetryPolicy = new RetryPolicy
                {
                    MaxAttempts = 3,
                    BackoffMs = 1000,
                    CurrentAttempt = 1
                }
            };

            // Publish feature extraction request
            var eventJson = JsonSerializer.Serialize(extractionEvent);
            var message = new Message<string, string>
            {
                Key = uploadEvent.Data.ImageId.ToString(),
                Value = eventJson,
                Headers = new Headers
                {
                    { "eventType", System.Text.Encoding.UTF8.GetBytes(EventTypes.FeatureExtractionRequested) },
                    { "tenantId", System.Text.Encoding.UTF8.GetBytes(uploadEvent.TenantId) },
                    { "correlationId", System.Text.Encoding.UTF8.GetBytes(uploadEvent.EventId.ToString()) }
                }
            };

            var deliveryResult = await _producer.ProduceAsync(KafkaTopics.FeatureExtraction, message, cancellationToken);
            
            _logger.LogInformation("Published feature extraction request for ImageId: {ImageId} to topic {Topic} at offset {Offset}",
                uploadEvent.Data.ImageId, deliveryResult.Topic, deliveryResult.Offset);

            // Update processing status in database (optional, for status tracking)
            await UpdateProcessingStatus(uploadEvent.Data.ImageId, ImageProcessingStatus.Processing, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating feature extraction request for ImageId: {ImageId}", 
                uploadEvent.Data.ImageId);
            
            // Publish failure event
            await PublishProcessingFailedEvent(uploadEvent, "feature_extraction_request", ex.Message, cancellationToken);
            throw; // Re-throw to trigger retry logic
        }
    }

    private async Task UpdateProcessingStatus(Guid imageId, ImageProcessingStatus status, CancellationToken cancellationToken)
    {
        // TODO: Implement status tracking in database
        // This would update a processing_status table or similar
        _logger.LogDebug("Updating processing status for ImageId: {ImageId} to {Status}", imageId, status);
        await Task.CompletedTask;
    }

    private async Task PublishProcessingFailedEvent(ImageUploadedEvent originalEvent, string failedStep, 
        string errorMessage, CancellationToken cancellationToken)
    {
        try
        {
            var failedEvent = new ProcessingFailedEvent
            {
                EventId = Guid.NewGuid(),
                TenantId = originalEvent.TenantId,
                CorrelationId = originalEvent.EventId,
                Timestamp = DateTime.UtcNow,
                Data = new ProcessingFailedData
                {
                    ImageId = originalEvent.Data.ImageId,
                    FailedStep = failedStep,
                    ErrorMessage = errorMessage,
                    RetryAttempt = 1,
                    CanRetry = true,
                    OriginalEvent = originalEvent
                }
            };

            var eventJson = JsonSerializer.Serialize(failedEvent);
            var message = new Message<string, string>
            {
                Key = originalEvent.Data.ImageId.ToString(),
                Value = eventJson
            };

            await _producer.ProduceAsync(KafkaTopics.ProcessingFailed, message, cancellationToken);
            
            _logger.LogInformation("Published processing failed event for ImageId: {ImageId}", 
                originalEvent.Data.ImageId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish processing failed event for ImageId: {ImageId}", 
                originalEvent.Data.ImageId);
        }
    }

    private async Task HandleProcessingError(string messageJson, Exception exception, CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "Processing error for message: {Message}", messageJson);
        
        // TODO: Implement retry logic with exponential backoff
        // TODO: Dead letter queue after max retries
        // For now, just log the error
        
        await Task.CompletedTask;
    }

    public override void Dispose()
    {
        try
        {
            _consumer?.Close();
            _consumer?.Dispose();
            _producer?.Flush(TimeSpan.FromSeconds(10));
            _producer?.Dispose();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error disposing ImageProcessingWorker");
        }
        
        base.Dispose();
    }
}
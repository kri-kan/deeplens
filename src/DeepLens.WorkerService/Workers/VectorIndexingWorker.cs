using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using DeepLens.Contracts.Events;
using DeepLens.Infrastructure.Services;
using System.Text.Json;
using System.Text;
using Confluent.Kafka;

namespace DeepLens.WorkerService.Workers;

/// <summary>
/// Kafka consumer that handles vector indexing requests by storing vectors in Qdrant.
/// Publishes processing completion events when indexing is complete.
/// </summary>
public class VectorIndexingWorker : BackgroundService
{
    private readonly ILogger<VectorIndexingWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IConsumer<string, string> _consumer;
    private readonly IProducer<string, string> _producer;
    private readonly string[] _subscriptionTopics;

    public VectorIndexingWorker(
        ILogger<VectorIndexingWorker> logger,
        IServiceProvider serviceProvider,
        IConfiguration configuration)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _subscriptionTopics = new[] { KafkaTopics.VectorIndexing };

        // Configure Kafka consumer
        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "localhost:9092",
            GroupId = "deeplens-vector-indexing-workers",
            ClientId = Environment.MachineName + "-vector-indexer",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false,
            SessionTimeoutMs = 30000,
            HeartbeatIntervalMs = 3000,
            MaxPollIntervalMs = 300000, // 5 minutes
            FetchMinBytes = 1
        };

        // Configure Kafka producer
        var producerConfig = new ProducerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "localhost:9092",
            ClientId = Environment.MachineName + "-vector-indexer-producer",
            Acks = Acks.All,
            RetryBackoffMs = 1000,
            MessageTimeoutMs = 30000,
            BatchSize = 16384,
            LingerMs = 10,
            CompressionType = CompressionType.Snappy
        };

        _consumer = new ConsumerBuilder<string, string>(consumerConfig)
            .SetErrorHandler((_, e) => _logger.LogError("Vector indexing consumer error: {Error}", e.Reason))
            .Build();

        _producer = new ProducerBuilder<string, string>(producerConfig)
            .SetErrorHandler((_, e) => _logger.LogError("Vector indexing producer error: {Error}", e.Reason))
            .Build();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("VectorIndexingWorker starting. Subscribing to topics: {Topics}", 
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
                    _logger.LogError(ex, "Error consuming vector indexing message from Kafka");
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("VectorIndexingWorker stopping due to cancellation");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in VectorIndexingWorker");
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
        using var activity = System.Diagnostics.Activity.Current?.Source.StartActivity("ProcessVectorIndexingRequest");
        
        try
        {
            _logger.LogDebug("Processing vector indexing message {MessageId}", messageId);

            if (consumeResult.Topic == KafkaTopics.VectorIndexing)
            {
                await ProcessVectorIndexingRequest(consumeResult.Message.Value, scope.ServiceProvider, cancellationToken);
            }

            _consumer.Commit(consumeResult);
            _logger.LogDebug("Successfully processed vector indexing message {MessageId}", messageId);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "JSON deserialization error for vector indexing message {MessageId}", messageId);
            _consumer.Commit(consumeResult); // Skip malformed messages
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing vector indexing message {MessageId}", messageId);
            await HandleVectorIndexingError(consumeResult.Message.Value, ex, cancellationToken);
            // Don't commit - message will be retried
        }
    }

    private async Task ProcessVectorIndexingRequest(string messageJson, IServiceProvider serviceProvider, 
        CancellationToken cancellationToken)
    {
        var indexingEvent = JsonSerializer.Deserialize<VectorIndexingRequestedEvent>(messageJson);
        
        if (indexingEvent == null)
        {
            _logger.LogError("Failed to deserialize VectorIndexingRequestedEvent");
            return;
        }

        _logger.LogInformation("Processing vector indexing for ImageId: {ImageId}, Model: {ModelName}, Tenant: {TenantId}", 
            indexingEvent.Data.ImageId, indexingEvent.Data.ModelName, indexingEvent.TenantId);

        var startTime = DateTime.UtcNow;
        var processingSteps = new List<ProcessingStep>();

        try
        {
            // Get VectorStoreService from DI container
            var vectorStoreService = serviceProvider.GetRequiredService<IVectorStoreService>();
            
            // Ensure collection exists (create if needed)
            var collectionExists = await vectorStoreService.CollectionExistsAsync(
                indexingEvent.TenantId, 
                indexingEvent.Data.ModelName, 
                cancellationToken);

            if (!collectionExists)
            {
                _logger.LogInformation("Creating collection for tenant {TenantId} and model {ModelName}", 
                    indexingEvent.TenantId, indexingEvent.Data.ModelName);
                
                var createSuccess = await vectorStoreService.CreateCollectionAsync(
                    indexingEvent.TenantId,
                    indexingEvent.Data.ModelName,
                    indexingEvent.Data.FeatureVector.Length,
                    cancellationToken);

                if (!createSuccess)
                {
                    throw new InvalidOperationException(
                        $"Failed to create collection for tenant {indexingEvent.TenantId} and model {indexingEvent.Data.ModelName}");
                }
                
                processingSteps.Add(new ProcessingStep
                {
                    Step = "collection_creation",
                    Status = "completed",
                    DurationMs = (DateTime.UtcNow - startTime).TotalMilliseconds,
                    ModelName = indexingEvent.Data.ModelName
                });
            }

            // Get collection info for logging
            var collectionInfo = await vectorStoreService.GetCollectionInfoAsync(
                indexingEvent.TenantId, 
                indexingEvent.Data.ModelName, 
                cancellationToken);

            // Prepare vector metadata
            var vectorMetadata = indexingEvent.Data.VectorMetadata.ToDictionary();
            
            // Add image metadata
            vectorMetadata["image_width"] = indexingEvent.Data.ImageMetadata.Width;
            vectorMetadata["image_height"] = indexingEvent.Data.ImageMetadata.Height;
            vectorMetadata["image_format"] = indexingEvent.Data.ImageMetadata.Format;

            var indexStartTime = DateTime.UtcNow;
            
            // Index the vector in Qdrant
            var indexSuccess = await vectorStoreService.IndexVectorAsync(
                indexingEvent.TenantId,
                indexingEvent.Data.ModelName,
                indexingEvent.Data.ImageId.ToString(),
                indexingEvent.Data.FeatureVector,
                vectorMetadata,
                cancellationToken);

            var indexDuration = (DateTime.UtcNow - indexStartTime).TotalMilliseconds;

            if (!indexSuccess)
            {
                throw new InvalidOperationException(
                    $"Failed to index vector for image {indexingEvent.Data.ImageId}");
            }

            processingSteps.Add(new ProcessingStep
            {
                Step = "vector_indexing",
                Status = "completed",
                DurationMs = indexDuration,
                ModelName = indexingEvent.Data.ModelName,
                CollectionName = collectionInfo.Name
            });

            var totalProcessingTime = (DateTime.UtcNow - startTime).TotalMilliseconds;

            // Publish processing completion event
            var completionEvent = new ProcessingCompletedEvent
            {
                EventId = Guid.NewGuid(),
                EventType = EventTypes.ProcessingCompleted,
                EventVersion = "1.0",
                TenantId = indexingEvent.TenantId,
                CorrelationId = indexingEvent.CorrelationId,
                Timestamp = DateTime.UtcNow,
                Data = new ProcessingCompletedData
                {
                    ImageId = indexingEvent.Data.ImageId,
                    Status = "success",
                    ProcessingSteps = processingSteps,
                    TotalProcessingTimeMs = totalProcessingTime,
                    SearchableAfter = DateTime.UtcNow // Image is immediately searchable after indexing
                }
            };

            await PublishProcessingCompletedEvent(completionEvent, cancellationToken);

            _logger.LogInformation("Successfully indexed vector for ImageId: {ImageId} in collection {CollectionName}. " +
                "Indexing took {IndexDuration}ms, total processing {TotalDuration}ms",
                indexingEvent.Data.ImageId, collectionInfo.Name, indexDuration, totalProcessingTime);

            // Update processing status in database (optional)
            await UpdateProcessingStatus(indexingEvent.Data.ImageId, ImageProcessingStatus.Indexed, cancellationToken);
        }
        catch (Exception ex)
        {
            // Add failed step
            processingSteps.Add(new ProcessingStep
            {
                Step = "vector_indexing",
                Status = "failed",
                DurationMs = (DateTime.UtcNow - startTime).TotalMilliseconds,
                ModelName = indexingEvent.Data.ModelName,
                ErrorMessage = ex.Message
            });

            _logger.LogError(ex, "Error indexing vector for ImageId: {ImageId}", 
                indexingEvent.Data.ImageId);
            
            // Publish failure event
            await PublishProcessingFailedEvent(indexingEvent, ex, processingSteps, cancellationToken);
            throw; // Re-throw to trigger retry logic
        }
    }

    private async Task PublishProcessingCompletedEvent(ProcessingCompletedEvent completionEvent, 
        CancellationToken cancellationToken)
    {
        try
        {
            var eventJson = JsonSerializer.Serialize(completionEvent);
            var message = new Message<string, string>
            {
                Key = completionEvent.Data.ImageId.ToString(),
                Value = eventJson,
                Headers = new Headers
                {
                    { "eventType", Encoding.UTF8.GetBytes(EventTypes.ProcessingCompleted) },
                    { "tenantId", Encoding.UTF8.GetBytes(completionEvent.TenantId) },
                    { "correlationId", Encoding.UTF8.GetBytes(completionEvent.CorrelationId?.ToString() ?? "") },
                    { "status", Encoding.UTF8.GetBytes(completionEvent.Data.Status) }
                }
            };

            var deliveryResult = await _producer.ProduceAsync(KafkaTopics.ProcessingCompleted, message, cancellationToken);
            
            _logger.LogInformation("Published processing completed event for ImageId: {ImageId} to topic {Topic} at offset {Offset}",
                completionEvent.Data.ImageId, deliveryResult.Topic, deliveryResult.Offset);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish processing completed event for ImageId: {ImageId}", 
                completionEvent.Data.ImageId);
        }
    }

    private async Task PublishProcessingFailedEvent(VectorIndexingRequestedEvent originalEvent, Exception exception,
        List<ProcessingStep> processingSteps, CancellationToken cancellationToken)
    {
        try
        {
            var failedEvent = new ProcessingFailedEvent
            {
                EventId = Guid.NewGuid(),
                EventType = EventTypes.ProcessingFailed,
                EventVersion = "1.0",
                TenantId = originalEvent.TenantId,
                CorrelationId = originalEvent.CorrelationId,
                Timestamp = DateTime.UtcNow,
                Data = new ProcessingFailedData
                {
                    ImageId = originalEvent.Data.ImageId,
                    FailedStep = "vector_indexing",
                    ErrorMessage = exception.Message,
                    ErrorCode = exception.GetType().Name,
                    StackTrace = exception.StackTrace,
                    RetryAttempt = 1,
                    CanRetry = true,
                    OriginalEvent = originalEvent
                }
            };

            // Also publish a partial completion event if some steps succeeded
            if (processingSteps.Any(s => s.Status == "completed"))
            {
                var partialCompletionEvent = new ProcessingCompletedEvent
                {
                    EventId = Guid.NewGuid(),
                    EventType = EventTypes.ProcessingCompleted,
                    EventVersion = "1.0",
                    TenantId = originalEvent.TenantId,
                    CorrelationId = originalEvent.CorrelationId,
                    Timestamp = DateTime.UtcNow,
                    Data = new ProcessingCompletedData
                    {
                        ImageId = originalEvent.Data.ImageId,
                        Status = "partial_failed",
                        ProcessingSteps = processingSteps,
                        TotalProcessingTimeMs = processingSteps.Sum(s => s.DurationMs),
                        ErrorMessage = exception.Message,
                        ErrorCode = exception.GetType().Name
                    }
                };

                await PublishProcessingCompletedEvent(partialCompletionEvent, cancellationToken);
            }

            var eventJson = JsonSerializer.Serialize(failedEvent);
            var message = new Message<string, string>
            {
                Key = originalEvent.Data.ImageId.ToString(),
                Value = eventJson
            };

            await _producer.ProduceAsync(KafkaTopics.ProcessingFailed, message, cancellationToken);
            
            _logger.LogInformation("Published vector indexing failed event for ImageId: {ImageId}", 
                originalEvent.Data.ImageId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish vector indexing failed event for ImageId: {ImageId}", 
                originalEvent.Data.ImageId);
        }
    }

    private async Task HandleVectorIndexingError(string messageJson, Exception exception, 
        CancellationToken cancellationToken)
    {
        try
        {
            var indexingEvent = JsonSerializer.Deserialize<VectorIndexingRequestedEvent>(messageJson);
            if (indexingEvent == null) return;

            await PublishProcessingFailedEvent(indexingEvent, exception, new List<ProcessingStep>(), cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to handle vector indexing error");
        }
    }

    private async Task UpdateProcessingStatus(Guid imageId, ImageProcessingStatus status, CancellationToken cancellationToken)
    {
        // TODO: Implement status tracking in database
        _logger.LogDebug("Updating processing status for ImageId: {ImageId} to {Status}", imageId, status);
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
            _logger.LogError(ex, "Error disposing VectorIndexingWorker");
        }
        
        base.Dispose();
    }
}
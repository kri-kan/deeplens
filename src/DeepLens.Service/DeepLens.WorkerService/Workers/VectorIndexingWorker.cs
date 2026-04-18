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
/// Kafka consumer that handles vector indexing. Single-tenant version.
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

        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "localhost:9092",
            GroupId = "deeplens-vector-indexing-workers",
            ClientId = Environment.MachineName + "-vector-indexer",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false
        };

        var producerConfig = new ProducerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "localhost:9092",
            ClientId = Environment.MachineName + "-vector-indexer-producer",
            Acks = Acks.All
        };

        _consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
        _producer = new ProducerBuilder<string, string>(producerConfig).Build();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("VectorIndexingWorker starting.");
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
        finally
        {
            _consumer.Close();
        }
    }

    private async Task ProcessMessage(ConsumeResult<string, string> consumeResult, CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        try
        {
            if (consumeResult.Topic == KafkaTopics.VectorIndexing)
            {
                await ProcessVectorIndexingRequest(consumeResult.Message.Value, scope.ServiceProvider, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing vector indexing message");
        }
    }

    private async Task ProcessVectorIndexingRequest(string messageJson, IServiceProvider serviceProvider, CancellationToken cancellationToken)
    {
        var indexingEvent = JsonSerializer.Deserialize<VectorIndexingRequestedEvent>(messageJson);
        if (indexingEvent == null) return;

        _logger.LogInformation("Indexing vector for ImageId: {ImageId}", indexingEvent.Data.ImageId);

        var vectorStoreService = serviceProvider.GetRequiredService<IVectorStoreService>();
        
        // Single-tenant always uses "SINGLE_TENANT"
        var tenantId = "SINGLE_TENANT";

        var collectionExists = await vectorStoreService.CollectionExistsAsync(tenantId, indexingEvent.Data.ModelName, cancellationToken);
        if (!collectionExists)
        {
            await vectorStoreService.CreateCollectionAsync(tenantId, indexingEvent.Data.ModelName, indexingEvent.Data.FeatureVector.Length, cancellationToken);
        }

        var vectorMetadata = indexingEvent.Data.VectorMetadata.ToDictionary();
        vectorMetadata["image_width"] = indexingEvent.Data.ImageMetadata.Width;
        vectorMetadata["image_height"] = indexingEvent.Data.ImageMetadata.Height;
        vectorMetadata["image_format"] = indexingEvent.Data.ImageMetadata.Format;

        await vectorStoreService.IndexVectorAsync(
            tenantId,
            indexingEvent.Data.ModelName,
            indexingEvent.Data.ImageId.ToString(),
            indexingEvent.Data.FeatureVector,
            vectorMetadata,
            cancellationToken);

        var completionEvent = new ProcessingCompletedEvent
        {
            EventId = Guid.NewGuid(),
            EventType = EventTypes.ProcessingCompleted,
            EventVersion = "1.0",
            TenantId = tenantId,
            CorrelationId = indexingEvent.CorrelationId,
            Timestamp = DateTime.UtcNow,
            Data = new ProcessingCompletedData
            {
                ImageId = indexingEvent.Data.ImageId,
                Status = "success",
                TotalProcessingTimeMs = 0,
                SearchableAfter = DateTime.UtcNow
            }
        };

        await PublishProcessingCompletedEvent(completionEvent, cancellationToken);
    }

    private async Task PublishProcessingCompletedEvent(ProcessingCompletedEvent completionEvent, CancellationToken cancellationToken)
    {
        var eventJson = JsonSerializer.Serialize(completionEvent);
        await _producer.ProduceAsync(KafkaTopics.ProcessingCompleted, new Message<string, string>
        {
            Key = completionEvent.Data.ImageId.ToString(),
            Value = eventJson
        }, cancellationToken);
    }

    public override void Dispose()
    {
        _consumer?.Dispose();
        _producer?.Dispose();
        base.Dispose();
    }
}
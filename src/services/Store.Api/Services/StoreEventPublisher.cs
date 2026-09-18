using System.Text.Json;
using Confluent.Kafka;

namespace Store.Api.Services;

public class StoreEventPublisher : IStoreEventPublisher, IDisposable
{
    private readonly ILogger<StoreEventPublisher> _logger;
    private readonly IProducer<string, string>? _producer;

    public StoreEventPublisher(IConfiguration config, ILogger<StoreEventPublisher> logger)
    {
        _logger = logger;
        var bootstrapServers = config["Kafka:BootstrapServers"] 
            ?? config["Kafka__BootstrapServers"] 
            ?? "kafka-prod:29093";

        try
        {
            var producerConfig = new ProducerConfig
            {
                BootstrapServers = bootstrapServers,
                Acks = Acks.Leader,
                MessageTimeoutMs = 4000,
                SocketTimeoutMs = 4000,
                ReconnectBackoffMs = 1000
            };
            _producer = new ProducerBuilder<string, string>(producerConfig).Build();
            _logger.LogInformation("StoreEventPublisher initialized with Kafka: {BootstrapServers}", bootstrapServers);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to initialize Kafka producer with {BootstrapServers}. Continuing in degraded mode.", bootstrapServers);
        }
    }

    public async Task PublishAsync(string topic, string key, object payload, CancellationToken ct = default)
    {
        if (_producer == null)
        {
            _logger.LogWarning("Kafka producer unavailable. Dropped message on topic {Topic}", topic);
            return;
        }

        try
        {
            var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            var result = await _producer.ProduceAsync(topic, new Message<string, string>
            {
                Key = key,
                Value = json,
                Timestamp = new Timestamp(DateTime.UtcNow)
            }, ct);

            _logger.LogInformation("Published Kafka event to {Topic} [{Partition}@{Offset}] key={Key}", 
                topic, result.Partition.Value, result.Offset.Value, key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to produce Kafka message to {Topic} for key {Key}", topic, key);
        }
    }

    public void Dispose()
    {
        try
        {
            _producer?.Flush(TimeSpan.FromSeconds(2));
            _producer?.Dispose();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error disposing Kafka producer");
        }
    }
}

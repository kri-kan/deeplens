using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using DeepLens.Contracts.Events;
using System.Text.Json;
using System.Text;
using Confluent.Kafka;
using DeepLens.Infrastructure.Services;
using Npgsql;
using Dapper;

namespace DeepLens.WorkerService.Workers;

/// <summary>
/// Kafka consumer that handles image maintenance tasks like physical deletion of files and vector points.
/// </summary>
public class ImageMaintenanceWorker : BackgroundService
{
    private readonly ILogger<ImageMaintenanceWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IConsumer<string, string> _consumer;
    private readonly string[] _subscriptionTopics;
    private readonly string _baseConnString;

    public ImageMaintenanceWorker(
        ILogger<ImageMaintenanceWorker> logger,
        IServiceProvider serviceProvider,
        IConfiguration configuration)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _subscriptionTopics = new[] { KafkaTopics.ImageMaintenance };
        _baseConnString = configuration.GetConnectionString("DefaultConnection") 
            ?? "Host=localhost;Port=5433;Username=postgres;Password=DeepLens123!";

        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "localhost:9092",
            GroupId = "deeplens-maintenance-workers",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false
        };

        _consumer = new ConsumerBuilder<string, string>(consumerConfig)
            .SetErrorHandler((_, e) => _logger.LogError("Maintenance consumer error: {Error}", e.Reason))
            .Build();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ImageMaintenanceWorker starting. Subscribing to: {Topics}", string.Join(", ", _subscriptionTopics));

        try
        {
            _consumer.Subscribe(_subscriptionTopics);

            while (!stoppingToken.IsCancellationRequested)
            {
                var result = _consumer.Consume(TimeSpan.FromSeconds(1));
                if (result == null) continue;

                if (result.Message != null)
                {
                    _logger.LogInformation("Consumed message from topic {Topic} at offset {Offset}", result.Topic, result.Offset);
                    try 
                    {
                        await ProcessDeletion(result.Message.Value, stoppingToken);
                        _consumer.Commit(result);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing maintenance message at offset {Offset}", result.Offset);
                        _consumer.Commit(result); // Skip failing messages for now
                    }
                }
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in ImageMaintenanceWorker");
        }
        finally
        {
            _consumer.Close();
        }
    }

    private async Task ProcessDeletion(string messageJson, CancellationToken ct)
    {
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var evt = JsonSerializer.Deserialize<ImageDeletionRequestedEvent>(messageJson, options);
        if (evt == null) return;

        using var scope = _serviceProvider.CreateScope();
        var storage = scope.ServiceProvider.GetRequiredService<IStorageService>();
        var vectorStore = scope.ServiceProvider.GetRequiredService<IVectorStoreService>();
        
        var tenantId = Guid.Parse(evt.TenantId);
        
        _logger.LogInformation("Processing deletion for Image:{ImageId} Tenant:{TenantId}", evt.Data.ImageId, tenantId);

        try
        {
            // 1. Delete from Storage
            await storage.DeleteFileAsync(tenantId, evt.Data.StoragePath);

            // 2. Delete Thumbnails if requested
            if (evt.Data.DeleteThumbnails)
            {
                // Conventional path for thumbnails: {bucket}/thumbnails/{original_guid}_small.jpg
                var thumbPrefix = evt.Data.StoragePath.Replace("raw/", "thumbnails/").Split('_')[0];
                await storage.DeleteFileAsync(tenantId, $"{thumbPrefix}_small.jpg");
                await storage.DeleteFileAsync(tenantId, $"{thumbPrefix}_medium.jpg");
            }

            // 3. Delete from Vector Store (all models)
            // In a real scenario, we might want to iterate models or use a global ID
            await vectorStore.DeleteVectorAsync(evt.TenantId, "resnet50", evt.Data.ImageId.ToString(), ct);

            // 4. Update Database Queue & Record
            await MarkAsDeletedInDb(tenantId, evt.Data.ImageId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fully delete Image:{ImageId}", evt.Data.ImageId);
            // We might want to keep it in queue for retry
        }
    }

    private async Task MarkAsDeletedInDb(Guid tenantId, Guid imageId)
    {
        var builder = new NpgsqlConnectionStringBuilder(_baseConnString);
        if (tenantId == Guid.Parse("2abbd721-873e-4bf0-9cb2-c93c6894c584")) 
            builder.Database = "tenant_vayyari_metadata";
        else 
            builder.Database = $"tenant_{tenantId:N}_metadata";

        using var conn = new NpgsqlConnection(builder.ConnectionString);
        await conn.OpenAsync();
        using var trans = conn.BeginTransaction();

        try
        {
            // Remove from queue
            await conn.ExecuteAsync("DELETE FROM image_deletion_queue WHERE image_id = @Id", new { Id = imageId }, trans);
            
            // Hard delete from images table (since it's already removed from storage and vectors)
            // Alternatively, set status = 99 (Deleted)
            await conn.ExecuteAsync("DELETE FROM images WHERE id = @Id", new { Id = imageId }, trans);

            trans.Commit();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update DB for deleted image {ImageId}", imageId);
            trans.Rollback();
        }
    }
}

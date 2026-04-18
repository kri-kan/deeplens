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
/// Kafka consumer that handles image maintenance tasks. Single-tenant version.
/// </summary>
public class ImageMaintenanceWorker : BackgroundService
{
    private readonly ILogger<ImageMaintenanceWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IConsumer<string, string> _consumer;
    private readonly string[] _subscriptionTopics;
    private readonly string _connectionString;

    public ImageMaintenanceWorker(
        ILogger<ImageMaintenanceWorker> logger,
        IServiceProvider serviceProvider,
        IConfiguration configuration)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _subscriptionTopics = new[] { KafkaTopics.ImageMaintenance };
        _connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("DefaultConnection not found");

        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "localhost:9092",
            GroupId = "deeplens-maintenance-workers",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false
        };

        _consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ImageMaintenanceWorker starting.");
        try
        {
            _consumer.Subscribe(_subscriptionTopics);
            while (!stoppingToken.IsCancellationRequested)
            {
                var result = _consumer.Consume(TimeSpan.FromSeconds(1));
                if (result?.Message != null)
                {
                    await ProcessDeletion(result.Message.Value, stoppingToken);
                    _consumer.Commit(result);
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
        var evt = JsonSerializer.Deserialize<ImageDeletionRequestedEvent>(messageJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (evt == null) return;

        using var scope = _serviceProvider.CreateScope();
        var storage = scope.ServiceProvider.GetRequiredService<IStorageService>();
        var vectorStore = scope.ServiceProvider.GetRequiredService<IVectorStoreService>();
        
        _logger.LogInformation("Processing deletion for Image:{ImageId}", evt.Data.ImageId);

        try
        {
            await storage.DeleteFileAsync(evt.Data.StoragePath);

            if (evt.Data.DeleteThumbnails)
            {
                var thumbBase = evt.Data.StoragePath.Replace("raw/", "thumbnails/");
                var lastDot = thumbBase.LastIndexOf('.');
                if (lastDot > 0) thumbBase = thumbBase.Substring(0, lastDot);

                await storage.DeleteFileAsync($"{thumbBase}.webp");
            }

            await vectorStore.DeleteVectorAsync("SINGLE_TENANT", "resnet50", evt.Data.ImageId.ToString(), ct);
            await MarkAsDeletedInDb(evt.Data.ImageId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fully delete Image:{ImageId}", evt.Data.ImageId);
        }
    }

    private async Task MarkAsDeletedInDb(Guid imageId)
    {
        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        using var trans = conn.BeginTransaction();

        try
        {
            await conn.ExecuteAsync("DELETE FROM media_deletion_queue WHERE media_id = @Id", new { Id = imageId }, trans);
            await conn.ExecuteAsync("DELETE FROM media WHERE id = @Id", new { Id = imageId }, trans);
            trans.Commit();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update DB for deleted image {ImageId}", imageId);
            trans.Rollback();
        }
    }
}

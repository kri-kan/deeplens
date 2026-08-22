using System;
using System.Diagnostics;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Confluent.Kafka;
using DeepLens.Contracts.Catalog;
using DeepLens.Contracts.Events.Catalog;
using DeepLens.Shared.Telemetry;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DeepLens.WorkerService.Workers;

public class CatalogMaintenanceWorker : BackgroundService
{
    private readonly ILogger<CatalogMaintenanceWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IConsumer<string, string> _consumer;
    private readonly string[] _topics;
    private readonly SemaphoreSlim _throttler = new(4, 4);

    public CatalogMaintenanceWorker(
        ILogger<CatalogMaintenanceWorker> logger,
        IServiceProvider serviceProvider,
        IConfiguration configuration)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _topics = new[]
        {
            ProductMaintenanceTopics.ProductArchiveCommand,
            ProductMaintenanceTopics.ProductDeleteCommand
        };

        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? configuration["Kafka:BootstrapServers"] ?? "localhost:9092",
            GroupId = "deeplens-catalog-maintenance-workers",
            ClientId = $"{Environment.MachineName}-catalog-maintenance-worker",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false
        };

        _consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();
        _logger.LogInformation("CatalogMaintenanceWorker starting on topics: {Topics}", string.Join(", ", _topics));

        try
        {
            _consumer.Subscribe(_topics);

            while (!stoppingToken.IsCancellationRequested)
            {
                ConsumeResult<string, string>? consumeResult = null;
                try
                {
                    consumeResult = _consumer.Consume(TimeSpan.FromSeconds(1));
                }
                catch (ConsumeException ex)
                {
                    _logger.LogError(ex, "Kafka consumption error in CatalogMaintenanceWorker: {Reason}", ex.Error.Reason);
                    continue;
                }

                if (consumeResult?.Message != null)
                {
                    await _throttler.WaitAsync(stoppingToken);
                    _ = ProcessMessageAsync(consumeResult, stoppingToken);
                }
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in CatalogMaintenanceWorker");
        }
        finally
        {
            try
            {
                _consumer.Close();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error closing Kafka consumer");
            }
        }
    }

    private async Task ProcessMessageAsync(ConsumeResult<string, string> result, CancellationToken stoppingToken)
    {
        try
        {
            var topic = result.Topic;
            var json = result.Message.Value;

            if (topic == ProductMaintenanceTopics.ProductArchiveCommand)
            {
                await HandleArchiveCommandAsync(json, stoppingToken);
            }
            else if (topic == ProductMaintenanceTopics.ProductDeleteCommand)
            {
                await HandleDeleteCommandAsync(json, stoppingToken);
            }
            else
            {
                _logger.LogWarning("CatalogMaintenanceWorker received message from unexpected topic: {Topic}", topic);
            }

            _consumer.Commit(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing catalog maintenance message from topic {Topic}", result.Topic);
            try
            {
                _consumer.Commit(result);
            }
            catch { }
        }
        finally
        {
            _throttler.Release();
        }
    }

    private async Task HandleArchiveCommandAsync(string json, CancellationToken ct)
    {
        using var activity = DeepLensActivitySource.StartActivity("CatalogMaintenanceWorker.HandleArchive");
        var cmd = JsonSerializer.Deserialize<ProductArchiveBatchCommand>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (cmd == null || cmd.ProductIds == null || cmd.ProductIds.Count == 0)
        {
            _logger.LogWarning("CatalogMaintenanceWorker received empty or null ProductArchiveBatchCommand");
            return;
        }

        _logger.LogInformation("Processing ProductArchiveBatchCommand {BatchId} for {Count} products (RequestedBy: {RequestedBy})",
            cmd.BatchId, cmd.ProductIds.Count, cmd.RequestedBy ?? "unknown");

        var sw = Stopwatch.StartNew();
        using var scope = _serviceProvider.CreateScope();
        var productService = scope.ServiceProvider.GetRequiredService<IProductService>();

        var processedCount = await productService.ExecuteArchiveBatchInternalAsync(cmd.ProductIds, ct);
        sw.Stop();

        _logger.LogInformation("Completed ProductArchiveBatchCommand {BatchId} for {ProcessedCount} products in {ElapsedMs}ms",
            cmd.BatchId, processedCount, sw.ElapsedMilliseconds);
    }

    private async Task HandleDeleteCommandAsync(string json, CancellationToken ct)
    {
        using var activity = DeepLensActivitySource.StartActivity("CatalogMaintenanceWorker.HandleDelete");
        var cmd = JsonSerializer.Deserialize<ProductDeleteBatchCommand>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (cmd == null || cmd.ProductIds == null || cmd.ProductIds.Count == 0)
        {
            _logger.LogWarning("CatalogMaintenanceWorker received empty or null ProductDeleteBatchCommand");
            return;
        }

        _logger.LogInformation("Processing ProductDeleteBatchCommand {BatchId} for {Count} products (RequestedBy: {RequestedBy}, IsPermanent: {IsPermanent})",
            cmd.BatchId, cmd.ProductIds.Count, cmd.RequestedBy ?? "unknown", cmd.IsPermanent);

        var sw = Stopwatch.StartNew();
        using var scope = _serviceProvider.CreateScope();
        var productService = scope.ServiceProvider.GetRequiredService<IProductService>();

        var deletedCount = await productService.ExecuteDeleteBatchInternalAsync(cmd.ProductIds, ct);
        sw.Stop();

        _logger.LogInformation("Completed ProductDeleteBatchCommand {BatchId} for {DeletedCount} products in {ElapsedMs}ms",
            cmd.BatchId, deletedCount, sw.ElapsedMilliseconds);
    }
}

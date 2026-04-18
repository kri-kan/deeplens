using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using DeepLens.Contracts.Events;
using System.Text.Json;
using Confluent.Kafka;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using DeepLens.Infrastructure.Services;

namespace DeepLens.WorkerService.Workers;

/// <summary>
/// Kafka consumer that handles image upload events. Single-tenant version.
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

        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "127.0.0.1:9092",
            GroupId = "deeplens-image-processing-workers-v2",
            ClientId = Environment.MachineName + "-image-processor",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false
        };

        var producerConfig = new ProducerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "localhost:9092",
            ClientId = Environment.MachineName + "-image-processor-producer"
        };

        _consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
        _producer = new ProducerBuilder<string, string>(producerConfig).Build();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ImageProcessingWorker starting.");

        try
        {
            _consumer.Subscribe(_subscriptionTopics);

            while (!stoppingToken.IsCancellationRequested)
            {
                var consumeResult = _consumer.Consume(TimeSpan.FromSeconds(1));
                if (consumeResult?.Message != null)
                {
                    await ProcessMessage(consumeResult, stoppingToken);
                }
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in ImageProcessingWorker");
        }
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
            if (consumeResult.Topic == KafkaTopics.ImageUploaded)
            {
                await ProcessImageUploadedEvent(consumeResult.Message.Value, cancellationToken);
            }
            _consumer.Commit(consumeResult);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing image message");
        }
    }

    private async Task ProcessImageUploadedEvent(string messageJson, CancellationToken cancellationToken)
    {
        var uploadEvent = JsonSerializer.Deserialize<ImageUploadedEvent>(messageJson);
        if (uploadEvent == null) return;

        _logger.LogInformation("Processing image upload for ImageId: {ImageId}", uploadEvent.Data.ImageId);

        try 
        {
            await GenerateWebpThumbnail(uploadEvent, cancellationToken);

            var extractionEvent = new FeatureExtractionRequestedEvent
            {
                EventId = Guid.NewGuid(),
                EventType = EventTypes.FeatureExtractionRequested,
                EventVersion = "1.0",
                TenantId = "SINGLE_TENANT",
                CorrelationId = uploadEvent.EventId,
                Timestamp = DateTime.UtcNow,
                Data = new FeatureExtractionData
                {
                    ImageId = uploadEvent.Data.ImageId,
                    ImagePath = uploadEvent.Data.FilePath,
                    ModelName = "resnet50",
                    ModelVersion = "v2.7",
                    ExpectedDimension = 2048
                }
            };

            await _producer.ProduceAsync(KafkaTopics.FeatureExtraction, new Message<string, string>
            {
                Key = uploadEvent.Data.ImageId.ToString(),
                Value = JsonSerializer.Serialize(extractionEvent)
            }, cancellationToken);

            await UpdateProcessingStatus(uploadEvent.Data.ImageId, MediaProcessingStatus.Uploaded);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process image upload");
        }
    }

    private async Task UpdateProcessingStatus(Guid imageId, MediaProcessingStatus status)
    {
        using var scope = _serviceProvider.CreateScope();
        var metadataService = scope.ServiceProvider.GetRequiredService<IMetadataService>();
        await metadataService.UpdateMediaStatusAsync(imageId, (int)status);
    }

    private async Task GenerateWebpThumbnail(ImageUploadedEvent uploadEvent, CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var storageService = scope.ServiceProvider.GetRequiredService<IStorageService>();
        var metadataService = scope.ServiceProvider.GetRequiredService<IMetadataService>();
        
        try
        {
            using var rawStream = await storageService.GetFileAsync(uploadEvent.Data.FilePath);
            using var imageObj = await Image.LoadAsync(rawStream, cancellationToken);
            
            var options = uploadEvent.ProcessingOptions;
            imageObj.Mutate(x => x.Resize(new ResizeOptions {
                Size = new Size(options.ThumbnailWidth, options.ThumbnailHeight),
                Mode = ResizeMode.Max
            }));

            var thumbPath = uploadEvent.Data.FilePath.Replace("raw/", "thumbnails/");
            var lastDot = thumbPath.LastIndexOf('.');
            if (lastDot > 0) thumbPath = thumbPath.Substring(0, lastDot);
            thumbPath += ".webp";

            using var outMs = new MemoryStream();
            await imageObj.SaveAsWebpAsync(outMs, cancellationToken);
            outMs.Position = 0;

            await storageService.UploadThumbnailAsync(thumbPath, outMs, "image/webp");
            
            await metadataService.UpdateMediaDimensionsAsync(uploadEvent.Data.ImageId, imageObj.Width, imageObj.Height);
            await metadataService.UpdateMediaStatusAsync(uploadEvent.Data.ImageId, (int)MediaProcessingStatus.Processed);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate thumbnail");
        }
    }

    public override void Dispose()
    {
        _consumer?.Dispose();
        _producer?.Dispose();
        base.Dispose();
    }
}
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using DeepLens.Contracts.Events;
using System.Text.Json;
using Confluent.Kafka;
using DeepLens.Infrastructure.Services;
using FFMpegCore;
using FFMpegCore.Enums;
using FFMpegCore.Arguments;
using System.Drawing;
using DeepLens.Shared.Common;

namespace DeepLens.WorkerService.Workers;

/// <summary>
/// Kafka consumer that handles video upload events. Single-tenant version.
/// </summary>
public class VideoProcessingWorker : BackgroundService
{
    private readonly ILogger<VideoProcessingWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IConsumer<string, string> _consumer;
    private readonly string _topic;

    public VideoProcessingWorker(
        ILogger<VideoProcessingWorker> logger,
        IServiceProvider serviceProvider,
        IConfiguration configuration)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _topic = KafkaTopics.VideoUploaded;

        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "127.0.0.1:9092",
            GroupId = "deeplens-video-processing-workers",
            ClientId = Environment.MachineName + "-video-processor",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false
        };

        _consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();

        // FFmpeg setup - Use environment variable or system PATH
        var ffmpegPath = configuration["Media:FfmpegPath"];
        if (!string.IsNullOrEmpty(ffmpegPath) && Directory.Exists(ffmpegPath))
        {
            GlobalFFOptions.Configure(new FFOptions { BinaryFolder = ffmpegPath });
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("VideoProcessingWorker starting.");
        try
        {
            _consumer.Subscribe(_topic);
            while (!stoppingToken.IsCancellationRequested)
            {
                var consumeResult = _consumer.Consume(TimeSpan.FromSeconds(1));
                if (consumeResult?.Message != null)
                {
                    await ProcessVideoEvent(consumeResult, stoppingToken);
                    _consumer.Commit(consumeResult);
                }
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in VideoProcessingWorker");
        }
        finally
        {
            _consumer.Close();
        }
    }

    private async Task ProcessVideoEvent(ConsumeResult<string, string> consumeResult, CancellationToken ct)
    {
        var videoEvent = JsonSerializer.Deserialize<VideoUploadedEvent>(consumeResult.Message.Value);
        if (videoEvent == null) return;

        using var scope = _serviceProvider.CreateScope();
        var storage = scope.ServiceProvider.GetRequiredService<IStorageService>();
        var metadata = scope.ServiceProvider.GetRequiredService<IMetadataService>();
        
        var videoId = videoEvent.Data.VideoId;
        string fileName = Path.GetFileNameWithoutExtension(videoEvent.Data.FilePath);
        string hash = fileName; 

        string tempInput = Path.Combine(Path.GetTempPath(), $"{videoId}{Path.GetExtension(videoEvent.Data.FileName)}");
        
        try
        {
            using (var stream = await storage.GetFileAsync(videoEvent.Data.FilePath))
            using (var fileStream = File.Create(tempInput))
            {
                await stream.CopyToAsync(fileStream, ct);
            }

            var analysis = await FFProbe.AnalyseAsync(tempInput);
            var duration = (decimal)analysis.Duration.TotalSeconds;

            // 1. Generate Multiple Thumbnails based on TargetThumbnailSizes
            var targetSizes = videoEvent.ProcessingOptions.TargetThumbnailSizes ?? new[] { "medium" };

            foreach (var specName in targetSizes)
            {
                if (!MediaConstants.ThumbnailSpecs.Presets.TryGetValue(specName, out var preset)) continue;

                var (width, height) = preset;
                string tempThumb = Path.Combine(Path.GetTempPath(), $"{videoId}_{specName}.webp");
                
                _logger.LogInformation("Generating {SpecName} video snapshot ({Width}x{Height}) for {VideoId}", specName, width, height, videoId);

                await FFMpeg.SnapshotAsync(tempInput, tempThumb, new Size(width, height), TimeSpan.FromSeconds(duration > 2 ? 1 : 0));

                string thumbPath = StoragePathRegistry.GetThumbnailPath(hash, specName);
                var thumbTags = string.IsNullOrEmpty(videoEvent.ProcessingOptions.Retention) ? null : new Dictionary<string, string> { { MediaConstants.Retention.TagKey, videoEvent.ProcessingOptions.Retention } };
                using (var fs = File.OpenRead(tempThumb)) 
                {
                    await storage.UploadThumbnailAsync(thumbPath, fs, MediaConstants.Formats.WebP, thumbTags);
                }
                
                if (File.Exists(tempThumb)) File.Delete(tempThumb);
            }

            // 2. Generate GIF Preview if requested
            string? previewPath = null;
            if (videoEvent.ProcessingOptions.GenerateGifPreview)
            {
                string tempPreview = Path.Combine(Path.GetTempPath(), $"{videoId}_preview.gif");
                var startTime = duration > 5 ? TimeSpan.FromSeconds((double)duration * 0.2) : TimeSpan.Zero;
                
                await FFMpegArguments
                    .FromFileInput(tempInput, true, options => options.Seek(startTime))
                    .OutputToFile(tempPreview, true, options => options
                        .WithDuration(TimeSpan.FromSeconds(3))
                        .WithVideoFilters(f => f.Scale(256, -1))
                        .WithCustomArgument("-loop 0"))
                    .ProcessAsynchronously();

                previewPath = $"{MediaConstants.Paths.PreviewsDir}/{hash}.gif";
                var previewTags = string.IsNullOrEmpty(videoEvent.ProcessingOptions.Retention) ? null : new Dictionary<string, string> { { MediaConstants.Retention.TagKey, videoEvent.ProcessingOptions.Retention } };
                using (var fs = File.OpenRead(tempPreview)) 
                {
                    await storage.UploadThumbnailAsync(previewPath, fs, MediaConstants.Formats.Gif, previewTags);
                }
                
                if (File.Exists(tempPreview)) File.Delete(tempPreview);
            }

            // For default thumbnail in metadata, use the first available in TargetThumbnailSizes or Medium
            string defaultSpec = targetSizes.FirstOrDefault() ?? MediaConstants.ThumbnailSpecs.Medium;
            await metadata.UpdateVideoMetadataAsync(videoId, duration, StoragePathRegistry.GetThumbnailPath(hash, defaultSpec), previewPath);
            await metadata.UpdateMediaDimensionsAsync(videoId, analysis.PrimaryVideoStream?.Width ?? 0, analysis.PrimaryVideoStream?.Height ?? 0);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process video {VideoId}", videoId);
        }
        finally
        {
            if (File.Exists(tempInput)) File.Delete(tempInput);
        }
    }
}

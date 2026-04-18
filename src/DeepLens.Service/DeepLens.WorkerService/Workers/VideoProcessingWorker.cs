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

        // FFmpeg setup
        var ffmpegPath = @"C:\ffmpeg\ffmpeg-master-latest-win64-gpl\bin";
        if (Directory.Exists(ffmpegPath))
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
        string tempInput = Path.Combine(Path.GetTempPath(), $"{videoId}{Path.GetExtension(videoEvent.Data.FileName)}");
        string tempThumb = Path.Combine(Path.GetTempPath(), $"{videoId}_thumb.webp");
        string tempPreview = Path.Combine(Path.GetTempPath(), $"{videoId}_preview.gif");

        try
        {
            using (var stream = await storage.GetFileAsync(videoEvent.Data.FilePath))
            using (var fileStream = File.Create(tempInput))
            {
                await stream.CopyToAsync(fileStream, ct);
            }

            var analysis = await FFProbe.AnalyseAsync(tempInput);
            var duration = (decimal)analysis.Duration.TotalSeconds;

            int thumbWidth = videoEvent.ProcessingOptions.ThumbnailWidth > 0 ? videoEvent.ProcessingOptions.ThumbnailWidth : 512;
            int thumbHeight = videoEvent.ProcessingOptions.ThumbnailHeight > 0 ? videoEvent.ProcessingOptions.ThumbnailHeight : 512;

            await FFMpeg.SnapshotAsync(tempInput, tempThumb, new Size(thumbWidth, thumbHeight), TimeSpan.FromSeconds(duration > 2 ? 1 : 0));

            if (videoEvent.ProcessingOptions.GenerateGifPreview)
            {
                var startTime = duration > 5 ? TimeSpan.FromSeconds((double)duration * 0.2) : TimeSpan.Zero;
                await FFMpegArguments
                    .FromFileInput(tempInput, true, options => options.Seek(startTime))
                    .OutputToFile(tempPreview, true, options => options
                        .WithDuration(TimeSpan.FromSeconds(3))
                        .WithVideoFilters(f => f.Scale(256, -1))
                        .WithCustomArgument("-loop 0"))
                    .ProcessAsynchronously();
            }

            string thumbPath = videoEvent.Data.FilePath.Replace("raw/", "thumbnails/").Replace(Path.GetExtension(videoEvent.Data.FileName), ".webp");
            string previewPath = videoEvent.Data.FilePath.Replace("raw/", "previews/").Replace(Path.GetExtension(videoEvent.Data.FileName), ".gif");

            using (var fs = File.OpenRead(tempThumb)) await storage.UploadThumbnailAsync(thumbPath, fs, "image/webp");
            if (File.Exists(tempPreview)) using (var fs = File.OpenRead(tempPreview)) await storage.UploadThumbnailAsync(previewPath, fs, "image/gif");

            await metadata.UpdateVideoMetadataAsync(videoId, duration, thumbPath, File.Exists(tempPreview) ? previewPath : null);
            await metadata.UpdateMediaDimensionsAsync(videoId, analysis.PrimaryVideoStream?.Width ?? 0, analysis.PrimaryVideoStream?.Height ?? 0);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process video {VideoId}", videoId);
        }
        finally
        {
            if (File.Exists(tempInput)) File.Delete(tempInput);
            if (File.Exists(tempThumb)) File.Delete(tempThumb);
            if (File.Exists(tempPreview)) File.Delete(tempPreview);
        }
    }
}

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
/// Kafka consumer that handles video upload events, extracts metadata, 
/// and generates GIF previews and poster frames.
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
        Console.WriteLine("===== VideoProcessingWorker CONSTRUCTOR CALLED =====");
        try
        {
            _logger = logger;
            _logger.LogInformation("VideoProcessingWorker constructor starting...");
            _serviceProvider = serviceProvider;
            _topic = KafkaTopics.VideoUploaded;
            _logger.LogInformation("VideoProcessingWorker will subscribe to topic: {Topic}", _topic);

            var consumerConfig = new ConsumerConfig
            {
                BootstrapServers = configuration.GetConnectionString("Kafka") ?? "127.0.0.1:9092",
                GroupId = "deeplens-video-processing-workers",
                ClientId = Environment.MachineName + "-video-processor",
                AutoOffsetReset = AutoOffsetReset.Earliest,
                EnableAutoCommit = false,
                SessionTimeoutMs = 30000,
                MaxPollIntervalMs = 600000 // 10 minutes for potentially heavy video processing
            };

            _logger.LogInformation("Building Kafka consumer for video processing...");
            _consumer = new ConsumerBuilder<string, string>(consumerConfig)
                .SetErrorHandler((_, e) => _logger.LogError("Kafka consumer error: {Error}", e.Reason))
                .Build();
            _logger.LogInformation("Kafka consumer built successfully");
                
            // Setup FFMpeg path
            _logger.LogInformation("Configuring FFmpeg...");
            var ffmpegPath = @"C:\ffmpeg\ffmpeg-master-latest-win64-gpl\bin";
            if (Directory.Exists(ffmpegPath))
            {
                GlobalFFOptions.Configure(new FFOptions { BinaryFolder = ffmpegPath });
                _logger.LogInformation("FFmpeg configured at: {Path}", ffmpegPath);
            }
            else
            {
                _logger.LogWarning("FFmpeg path not found: {Path}", ffmpegPath);
            }
            _logger.LogInformation("VideoProcessingWorker constructor completed successfully");
            Console.WriteLine("===== VideoProcessingWorker CONSTRUCTOR COMPLETED =====");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"===== VideoProcessingWorker CONSTRUCTOR EXCEPTION: {ex.Message} =====");
            Console.WriteLine($"===== Stack: {ex.StackTrace} =====");
            _logger?.LogError(ex, "VideoProcessingWorker constructor failed");
            throw;
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        Console.WriteLine("===== VideoProcessingWorker ExecuteAsync CALLED =====");
        _logger.LogInformation("VideoProcessingWorker starting. Subscribing to: {Topic}", _topic);

        try
        {
            // Check if FFmpeg is available
            try
            {
                var ffmpegPath = FFMpegCore.GlobalFFOptions.GetFFMpegBinaryPath();
                _logger.LogInformation("FFmpeg found at: {Path}", ffmpegPath);
                Console.WriteLine($"===== FFmpeg found at: {ffmpegPath} =====");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "FFmpeg not found! Video processing requires FFmpeg. Please install FFmpeg and add it to PATH, or set GlobalFFOptions.Configure() with the binary path.");
                _logger.LogWarning("VideoProcessingWorker will subscribe to Kafka but will fail to process videos until FFmpeg is installed.");
                Console.WriteLine($"===== FFmpeg not found: {ex.Message} =====");
            }

            Console.WriteLine("===== About to subscribe to Kafka topic =====");
            _consumer.Subscribe(_topic);
            Console.WriteLine($"===== Subscribed to topic: {_topic} =====");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var consumeResult = _consumer.Consume(TimeSpan.FromSeconds(1));
                    
                    if (consumeResult?.Message != null)
                    {
                        Console.WriteLine($"===== Received message from Kafka =====");
                        await ProcessVideoEvent(consumeResult, stoppingToken);
                        _consumer.Commit(consumeResult);
                    }
                }
                catch (ConsumeException ex)
                {
                    _logger.LogError(ex, "Error consuming video message from Kafka");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unexpected error in video processing loop. If this is related to FFmpeg, please ensure FFmpeg is installed.");
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("VideoProcessingWorker stopping due to cancellation");
            Console.WriteLine("===== VideoProcessingWorker cancelled =====");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"===== VideoProcessingWorker ExecuteAsync EXCEPTION: {ex.Message} =====");
            Console.WriteLine($"===== Stack: {ex.StackTrace} =====");
            _logger.LogError(ex, "Fatal error in VideoProcessingWorker ExecuteAsync");
            throw;
        }
        finally
        {
            Console.WriteLine("===== VideoProcessingWorker ExecuteAsync FINALLY =====");
            _consumer.Close();
        }
    }

    private async Task ProcessVideoEvent(ConsumeResult<string, string> consumeResult, CancellationToken ct)
    {
        var videoEvent = JsonSerializer.Deserialize<VideoUploadedEvent>(consumeResult.Message.Value);
        if (videoEvent == null) return;

        _logger.LogInformation("Processing video for Tenant: {TenantId}, VideoId: {VideoId}", 
            videoEvent.TenantId, videoEvent.Data.VideoId);

        using var scope = _serviceProvider.CreateScope();
        var storage = scope.ServiceProvider.GetRequiredService<IStorageService>();
        var metadata = scope.ServiceProvider.GetRequiredService<ITenantMetadataService>();
        
        var tenantId = Guid.Parse(videoEvent.TenantId);
        var videoId = videoEvent.Data.VideoId;
        
        // Temp files for processing
        string tempInput = Path.Combine(Path.GetTempPath(), $"{videoId}{Path.GetExtension(videoEvent.Data.FileName)}");
        string tempThumb = Path.Combine(Path.GetTempPath(), $"{videoId}_thumb.webp");
        string tempPreview = Path.Combine(Path.GetTempPath(), $"{videoId}_preview.gif");

        try
        {
            // 1. Download video from MinIO
            using (var stream = await storage.GetFileAsync(tenantId, videoEvent.Data.FilePath))
            using (var fileStream = File.Create(tempInput))
            {
                await stream.CopyToAsync(fileStream, ct);
            }

            // 2. Analyze video
            var analysis = await FFProbe.AnalyseAsync(tempInput);
            var duration = (decimal)analysis.Duration.TotalSeconds;
            
            _logger.LogInformation("Video analysis complete. Duration: {Duration}s. Format: {Format}", 
                duration, analysis.Format.FormatName);

            // 3. Generate Poster Frame (Thumbnail)
            int thumbWidth = videoEvent.ProcessingOptions.ThumbnailWidth > 0 ? videoEvent.ProcessingOptions.ThumbnailWidth : 512;
            int thumbHeight = videoEvent.ProcessingOptions.ThumbnailHeight > 0 ? videoEvent.ProcessingOptions.ThumbnailHeight : 512;

            await FFMpeg.SnapshotAsync(tempInput, tempThumb, new Size(thumbWidth, thumbHeight), TimeSpan.FromSeconds(duration > 2 ? 1 : 0));

            // 4. Generate GIF Preview (3 seconds trailers)
            if (videoEvent.ProcessingOptions.GenerateGifPreview)
            {
                var startTime = duration > 5 ? TimeSpan.FromSeconds((double)duration * 0.2) : TimeSpan.Zero;
                await FFMpegArguments
                    .FromFileInput(tempInput, true, options => options
                        .Seek(startTime))
                    .OutputToFile(tempPreview, true, options => options
                        .WithDuration(TimeSpan.FromSeconds(3))
                        .WithVideoFilters(filterOptions => filterOptions
                            .Scale(256, -1)) // Scale to 256px width
                        .WithCustomArgument("-loop 0"))
                    .ProcessAsynchronously();
            }

            // 5. Upload to MinIO
            string thumbPath = videoEvent.Data.FilePath.Replace("raw/", "thumbnails/").Replace(Path.GetExtension(videoEvent.Data.FileName), ".webp");
            string previewPath = videoEvent.Data.FilePath.Replace("raw/", "previews/").Replace(Path.GetExtension(videoEvent.Data.FileName), ".gif");

            using (var fs = File.OpenRead(tempThumb))
            {
                await storage.UploadThumbnailAsync(tenantId, thumbPath, fs, "image/webp");
            }

            if (File.Exists(tempPreview))
            {
                using (var fs = File.OpenRead(tempPreview))
                {
                    // Use UploadThumbnailAsync to respect the path structure for previews
                    await storage.UploadThumbnailAsync(tenantId, previewPath, fs, "image/gif");
                }
            }

            // 6. Update Database
            await metadata.UpdateVideoMetadataAsync(tenantId, videoId, duration, thumbPath, File.Exists(tempPreview) ? previewPath : null);
            await metadata.UpdateMediaDimensionsAsync(tenantId, videoId, analysis.PrimaryVideoStream?.Width ?? 0, analysis.PrimaryVideoStream?.Height ?? 0);

            _logger.LogInformation("Successfully processed video {VideoId}", videoId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process video {VideoId}", videoId);
            // Optionally publish ProcessingFailedEvent here
        }
        finally
        {
            // Cleanup temp files
            if (File.Exists(tempInput)) File.Delete(tempInput);
            if (File.Exists(tempThumb)) File.Delete(tempThumb);
            if (File.Exists(tempPreview)) File.Delete(tempPreview);
        }
    }
}

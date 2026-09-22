using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services;

/// <summary>
/// High-performance video compression helper using FFmpeg.
/// Transcodes raw video streams into Instagram-optimized H.264 profile (1080p, CRF 22, +faststart).
/// </summary>
public static class VideoCompressorHelper
{
    private static readonly string[] PossibleFfmpegPaths = new[]
    {
        "/usr/local/bin/ffmpeg",
        "/usr/bin/ffmpeg",
        "/home/krikan/.local/bin/ffmpeg",
        "ffmpeg"
    };

    private static string? _resolvedFfmpegPath;

    public static string GetFfmpegPath()
    {
        if (_resolvedFfmpegPath != null) return _resolvedFfmpegPath;

        foreach (var path in PossibleFfmpegPaths)
        {
            if (File.Exists(path))
            {
                _resolvedFfmpegPath = path;
                return path;
            }
        }

        _resolvedFfmpegPath = "ffmpeg";
        return _resolvedFfmpegPath;
    }

    /// <summary>
    /// Compresses a video input stream to an Instagram-optimized MP4 stream in-place.
    /// If compression is successful and reduces file size, returns the compressed stream and new size.
    /// Otherwise returns false with original stream preserved.
    /// </summary>
    public static async Task<(bool Success, MemoryStream? CompressedStream, long CompressedSize, string? Error)> CompressVideoAsync(
        Stream inputStream,
        ILogger? logger = null,
        int crf = 22,
        string maxrate = "6.5M",
        string bufsize = "10M",
        CancellationToken ct = default)
    {
        var tempIn = Path.Combine(Path.GetTempPath(), $"vin_{Guid.NewGuid():N}.tmp");
        var tempOut = Path.Combine(Path.GetTempPath(), $"vout_{Guid.NewGuid():N}.mp4");

        try
        {
            inputStream.Position = 0;
            await using (var fs = new FileStream(tempIn, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                await inputStream.CopyToAsync(fs, ct);
            }

            var originalLength = new FileInfo(tempIn).Length;
            if (originalLength < 1024 * 1024) // < 1MB, skip re-encoding
            {
                return (false, null, originalLength, "Video is already under 1MB");
            }

            var ffmpegBin = GetFfmpegPath();
            var args = $"-y -i \"{tempIn}\" -c:v libx264 -preset fast -crf {crf} -maxrate {maxrate} -bufsize {bufsize} -vf \"scale=min(1080\\,iw):-2\" -c:a aac -b:a 128k -ar 48000 -movflags +faststart \"{tempOut}\"";

            var startInfo = new ProcessStartInfo
            {
                FileName = ffmpegBin,
                Arguments = args,
                RedirectStandardError = true,
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = startInfo };
            process.Start();

            var stderrTask = process.StandardError.ReadToEndAsync(ct);
            await process.WaitForExitAsync(ct);
            var stderr = await stderrTask;

            if (process.ExitCode == 0 && File.Exists(tempOut))
            {
                var compressedLength = new FileInfo(tempOut).Length;

                if (compressedLength < originalLength && compressedLength > 1024)
                {
                    var ms = new MemoryStream();
                    await using (var outFs = new FileStream(tempOut, FileMode.Open, FileAccess.Read))
                    {
                        await outFs.CopyToAsync(ms, ct);
                    }
                    ms.Position = 0;

                    logger?.LogInformation("Video successfully compressed: {OrigMB:F2} MB -> {NewMB:F2} MB ({Savings:F1}% saved)",
                        originalLength / (1024.0 * 1024.0),
                        compressedLength / (1024.0 * 1024.0),
                        (1.0 - (double)compressedLength / originalLength) * 100.0);

                    return (true, ms, compressedLength, null);
                }
                else
                {
                    return (false, null, originalLength, "Compression did not reduce file size");
                }
            }

            return (false, null, originalLength, $"FFmpeg failed with exit code {process.ExitCode}: {stderr}");
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "Failed to compress video stream via FFmpeg, falling back to original");
            return (false, null, 0, ex.Message);
        }
        finally
        {
            try { if (File.Exists(tempIn)) File.Delete(tempIn); } catch { }
            try { if (File.Exists(tempOut)) File.Delete(tempOut); } catch { }
        }
    }
}

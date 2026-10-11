using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services;

/// <summary>
/// High-performance PDF rasterizer using poppler's pdftoppm.
/// Converts single-page or first-page PDF documents (such as shipping labels)
/// into high-resolution PNG image streams for fast, native mobile previews.
/// </summary>
public static class PdfRasterizer
{
    private static readonly string[] PossiblePdftoppmPaths = new[]
    {
        "/usr/bin/pdftoppm",
        "/usr/local/bin/pdftoppm",
        "pdftoppm"
    };

    private static string? _resolvedPath;

    public static string GetPdftoppmPath()
    {
        if (_resolvedPath != null) return _resolvedPath;

        foreach (var path in PossiblePdftoppmPaths)
        {
            if (File.Exists(path))
            {
                _resolvedPath = path;
                return path;
            }
        }

        _resolvedPath = "pdftoppm";
        return _resolvedPath;
    }

    /// <summary>
    /// Checks whether pdftoppm is accessible in the current execution environment.
    /// </summary>
    public static bool IsAvailable()
    {
        try
        {
            var exe = GetPdftoppmPath();
            if (File.Exists(exe)) return true;

            using var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = exe,
                    Arguments = "-v",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            process.Start();
            process.WaitForExit(1000);
            return process.ExitCode == 0;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Converts PDF bytes into a PNG image byte array using pdftoppm.
    /// Uses 200 DPI by default for crisp thermal barcode and text readability.
    /// </summary>
    public static async Task<byte[]?> ConvertPdfToPngAsync(
        byte[] pdfBytes,
        int dpi = 200,
        ILogger? logger = null,
        CancellationToken ct = default)
    {
        if (pdfBytes == null || pdfBytes.Length == 0)
        {
            logger?.LogWarning("ConvertPdfToPngAsync called with empty PDF bytes.");
            return null;
        }

        var tempPdf = Path.Combine(Path.GetTempPath(), $"lbl_{Guid.NewGuid():N}.pdf");
        var tempPngBase = Path.Combine(Path.GetTempPath(), $"lbl_png_{Guid.NewGuid():N}");
        var expectedPngPath = $"{tempPngBase}.png";

        try
        {
            await File.WriteAllBytesAsync(tempPdf, pdfBytes, ct);

            var exe = GetPdftoppmPath();
            var args = $"-png -r {dpi} -singlefile \"{tempPdf}\" \"{tempPngBase}\"";

            logger?.LogDebug("Executing pdftoppm: {Exe} {Args}", exe, args);

            using var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = exe,
                    Arguments = args,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };

            process.Start();

            // Wait for exit or cancellation with a 15-second timeout
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(15));

            await process.WaitForExitAsync(cts.Token);

            if (process.ExitCode != 0)
            {
                var stderr = await process.StandardError.ReadToEndAsync(ct);
                logger?.LogError("pdftoppm failed with exit code {ExitCode}: {StdErr}", process.ExitCode, stderr);
                return null;
            }

            if (!File.Exists(expectedPngPath))
            {
                logger?.LogError("pdftoppm succeeded but expected output file {Path} does not exist.", expectedPngPath);
                return null;
            }

            var pngBytes = await File.ReadAllBytesAsync(expectedPngPath, ct);
            logger?.LogInformation("Rendered PDF to PNG ({Size} bytes, {Dpi} DPI)", pngBytes.Length, dpi);
            return pngBytes;
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            logger?.LogWarning("PDF rasterization was cancelled.");
            return null;
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "Exception during PDF to PNG conversion.");
            return null;
        }
        finally
        {
            try { if (File.Exists(tempPdf)) File.Delete(tempPdf); } catch { /* ignore */ }
            try { if (File.Exists(expectedPngPath)) File.Delete(expectedPngPath); } catch { /* ignore */ }
        }
    }
}

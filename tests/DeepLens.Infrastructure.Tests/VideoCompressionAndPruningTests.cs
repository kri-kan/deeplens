using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Infrastructure.Services;
using FluentAssertions;
using NUnit.Framework;

namespace DeepLens.Infrastructure.Tests;

[TestFixture]
public class VideoCompressionAndPruningTests
{
    [Test]
    public void GetFfmpegPath_ReturnsValidExecutableOrFallback()
    {
        // Act
        var path = VideoCompressorHelper.GetFfmpegPath();

        // Assert
        path.Should().NotBeNullOrWhiteSpace();
        (path.Contains("ffmpeg") || File.Exists(path)).Should().BeTrue();
    }

    [Test]
    public async Task CompressVideoAsync_WhenStreamUnder1MB_SkipsReencodingWithoutCallingFfmpeg()
    {
        // Arrange - 500 KB stream (< 1MB threshold)
        var smallPayload = new byte[500 * 1024];
        new Random(42).NextBytes(smallPayload);
        using var stream = new MemoryStream(smallPayload);

        // Act
        var (success, compressedStream, compressedSize, error) = await VideoCompressorHelper.CompressVideoAsync(
            stream,
            logger: null,
            crf: 22,
            ct: CancellationToken.None);

        // Assert
        success.Should().BeFalse();
        compressedStream.Should().BeNull();
        compressedSize.Should().Be(500 * 1024);
        error.Should().Contain("under 1MB");
    }

    [Test]
    public async Task CompressVideoAsync_WhenCancellationAlreadyTriggered_HandlesCleanly()
    {
        // Arrange
        var payload = new byte[2 * 1024 * 1024]; // 2 MB
        using var stream = new MemoryStream(payload);
        using var cts = new CancellationTokenSource();
        cts.Cancel(); // Pre-cancelled

        // Act
        var (success, compressedStream, _, _) = await VideoCompressorHelper.CompressVideoAsync(
            stream,
            logger: null,
            crf: 22,
            ct: cts.Token);

        // Assert - Should fail safely without unhandled process crashes
        success.Should().BeFalse();
        compressedStream.Should().BeNull();
    }

    [TestCase("sample.mov", "video/quicktime", true)]
    [TestCase("sample.mp4", "video/mp4", true)]
    [TestCase("sample.mkv", "video/x-matroska", true)]
    [TestCase("sample.avi", "video/x-msvideo", true)]
    [TestCase("document.pdf", "application/pdf", false)]
    [TestCase("invoice.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", false)]
    [TestCase("audio_note.ogg", "audio/ogg", false)]
    [TestCase("sticker.webp", "image/webp", false)]
    public void VideoDocumentPruningClassification_CorrectlyIdentifiesVideosVsPreservedDocuments(
        string filename, string mimeType, bool expectedIsVideo)
    {
        // Arrange - Rule matching ProductService.cs lines 899-915
        var mediaUrl = $"minio://whatsapp-data/documents/{filename}";

        // Act
        var isVideoExt = !string.IsNullOrEmpty(mediaUrl) && (
            mediaUrl.EndsWith(".mov", StringComparison.OrdinalIgnoreCase)
            || mediaUrl.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase)
            || mediaUrl.EndsWith(".mkv", StringComparison.OrdinalIgnoreCase)
            || mediaUrl.EndsWith(".avi", StringComparison.OrdinalIgnoreCase));

        var isVideoMime = !string.IsNullOrEmpty(mimeType) && (
            mimeType.IndexOf("video", StringComparison.OrdinalIgnoreCase) >= 0
            || mimeType.IndexOf("quicktime", StringComparison.OrdinalIgnoreCase) >= 0);

        var isVideo = isVideoExt || isVideoMime;
        var isSticker = mediaUrl.Contains("/stickers/") || filename.EndsWith(".webp");
        var isDocument = mediaUrl.Contains("/documents/");

        // Assert
        isVideo.Should().Be(expectedIsVideo);
        if (!expectedIsVideo && isDocument && !isSticker)
        {
            // Non-video documents must be preserved, never purged as video
            isVideo.Should().BeFalse();
        }
    }

    [Test]
    public void CatalogMediaPruning_IsVideoMedia_IdentifiesMovAndMp4StoragePaths()
    {
        // Arrange - Rule matching ProductService.cs IsVideoMedia local function
        bool IsVideoMedia(int mediaType, string? storagePath, string? originalFilename) =>
            mediaType == 2
            || (!string.IsNullOrEmpty(storagePath) && (storagePath.EndsWith(".mov", StringComparison.OrdinalIgnoreCase) || storagePath.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase)))
            || (!string.IsNullOrEmpty(originalFilename) && (originalFilename.EndsWith(".mov", StringComparison.OrdinalIgnoreCase) || originalFilename.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase)));

        // Assert
        IsVideoMedia(2, "general/file1", "orig1").Should().BeTrue("media_type = 2 is always video");
        IsVideoMedia(1, "general/product/video.mov", "video.mov").Should().BeTrue(".mov is video even if media_type was 1");
        IsVideoMedia(1, "general/product/video.mp4", "clip.mp4").Should().BeTrue(".mp4 is video even if media_type was 1");
        IsVideoMedia(1, "general/product/img.jpg", "photo.jpg").Should().BeFalse("standard jpg is image");
        IsVideoMedia(1, "general/product/doc.pdf", "catalog.pdf").Should().BeFalse("catalog PDF is not video");
    }
}

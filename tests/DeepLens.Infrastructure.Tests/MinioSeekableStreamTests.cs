using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Infrastructure.Services;
using FluentAssertions;
using Moq;
using NUnit.Framework;

namespace DeepLens.Infrastructure.Tests;

[TestFixture]
public class MinioSeekableStreamTests
{
    private Mock<IStorageService> _storageServiceMock;

    [SetUp]
    public void SetUp()
    {
        _storageServiceMock = new Mock<IStorageService>();
    }

    [Test]
    public async Task ReadAsync_Should_Read_Correct_Chunks_Directly_Into_Buffer()
    {
        // Arrange
        string path = "test-bucket/test-video.mp4";
        long totalLength = 100;
        var stream = new MinioSeekableStream(_storageServiceMock.Object, path, totalLength);

        byte[] expectedData = new byte[] { 10, 20, 30, 40, 50 };
        _storageServiceMock
            .Setup(s => s.ReadRangeToBufferAsync(path, 0, It.IsAny<byte[]>(), 0, 5, It.IsAny<CancellationToken>()))
            .Callback<string, long, byte[], int, int, CancellationToken>((p, offset, buf, bufOffset, count, ct) =>
            {
                Array.Copy(expectedData, 0, buf, bufOffset, 5);
            })
            .ReturnsAsync(5);

        byte[] targetBuffer = new byte[10];

        // Act
        int readBytes = await stream.ReadAsync(targetBuffer, 0, 5, CancellationToken.None);

        // Assert
        readBytes.Should().Be(5);
        stream.Position.Should().Be(5);
        targetBuffer[0].Should().Be(10);
        targetBuffer[4].Should().Be(50);
        _storageServiceMock.Verify(s => s.ReadRangeToBufferAsync(path, 0, targetBuffer, 0, 5, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public void Seek_Should_Update_Position_Correctly()
    {
        // Arrange
        var stream = new MinioSeekableStream(_storageServiceMock.Object, "dummy-path", 1000);

        // Act & Assert
        stream.Seek(200, SeekOrigin.Begin).Should().Be(200);
        stream.Position.Should().Be(200);

        stream.Seek(50, SeekOrigin.Current).Should().Be(250);
        stream.Position.Should().Be(250);

        stream.Seek(-100, SeekOrigin.End).Should().Be(900);
        stream.Position.Should().Be(900);
    }

    [Test]
    public async Task ReadAsync_Should_Return_Zero_When_Position_Equals_Length()
    {
        // Arrange
        var stream = new MinioSeekableStream(_storageServiceMock.Object, "dummy-path", 100);
        stream.Position = 100;

        byte[] buffer = new byte[10];

        // Act
        int read = await stream.ReadAsync(buffer, 0, 10);

        // Assert
        read.Should().Be(0);
        _storageServiceMock.Verify(s => s.ReadRangeToBufferAsync(It.IsAny<string>(), It.IsAny<long>(), It.IsAny<byte[]>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task ReadAsync_Should_Cap_Count_To_Remaining_Bytes()
    {
        // Arrange
        string path = "dummy-path";
        var stream = new MinioSeekableStream(_storageServiceMock.Object, path, 10);
        stream.Position = 8; // Only 2 bytes remaining

        _storageServiceMock
            .Setup(s => s.ReadRangeToBufferAsync(path, 8, It.IsAny<byte[]>(), 0, 2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(2);

        byte[] buffer = new byte[10];

        // Act
        int read = await stream.ReadAsync(buffer, 0, 10);

        // Assert
        read.Should().Be(2);
        stream.Position.Should().Be(10);
        _storageServiceMock.Verify(s => s.ReadRangeToBufferAsync(path, 8, buffer, 0, 2, It.IsAny<CancellationToken>()), Times.Once);
    }
}

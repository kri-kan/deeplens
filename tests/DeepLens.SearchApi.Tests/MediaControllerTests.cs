using DeepLens.Infrastructure.Services;
using DeepLens.SearchApi.Controllers;
using DeepLens.SearchApi.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Moq;
using FluentAssertions;

namespace DeepLens.SearchApi.Tests;

[TestFixture]
public class MediaControllerTests
{
    private Mock<ITenantMetadataService> _metadataServiceMock;
    private Mock<IStorageService> _storageServiceMock;
    private Mock<IDistributedCache> _cacheMock;
    private Mock<ILogger<MediaController>> _loggerMock;
    private MediaController _controller;

    [SetUp]
    public void SetUp()
    {
        _metadataServiceMock = new Mock<ITenantMetadataService>();
        _storageServiceMock = new Mock<IStorageService>();
        _cacheMock = new Mock<IDistributedCache>();
        _loggerMock = new Mock<ILogger<MediaController>>();

        _controller = new MediaController(
            _metadataServiceMock.Object,
            _storageServiceMock.Object,
            _cacheMock.Object,
            _loggerMock.Object
        );
    }

    [Test]
    public async Task GetThumbnail_Should_ReturnBadRequest_ForInvalidTenantId()
    {
        // Act
        var result = await _controller.GetThumbnail(Guid.NewGuid(), "invalid-guid");

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Test]
    public async Task GetThumbnail_Should_ReturnFromCache_IfAvailable()
    {
        // Arrange
        Guid mediaId = Guid.NewGuid();
        Guid tenantId = Guid.NewGuid();
        byte[] cachedData = new byte[] { 1, 2, 3 };

        _cacheMock.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(cachedData);

        // Act
        var result = await _controller.GetThumbnail(mediaId, tenantId.ToString());

        // Assert
        var fileResult = result.Should().BeOfType<FileContentResult>().Subject;
        fileResult.ContentType.Should().Be("image/webP"); // WebP can be webp or webP depending on how it's returned
        fileResult.FileContents.Should().Equal(cachedData);
        
        _storageServiceMock.Verify(s => s.GetFileAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }
}

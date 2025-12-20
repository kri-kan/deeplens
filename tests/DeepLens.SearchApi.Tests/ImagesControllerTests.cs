using DeepLens.Infrastructure.Services;
using DeepLens.SearchApi.Controllers;
using DeepLens.SearchApi.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Moq;

namespace DeepLens.SearchApi.Tests;

[TestFixture]
public class ImagesControllerTests
{
    private Mock<ITenantMetadataService> _metadataServiceMock;
    private Mock<IStorageService> _storageServiceMock;
    private Mock<IDistributedCache> _cacheMock;
    private Mock<ILogger<ImagesController>> _loggerMock;
    private ImagesController _controller;

    [SetUp]
    public void SetUp()
    {
        _metadataServiceMock = new Mock<ITenantMetadataService>();
        _storageServiceMock = new Mock<IStorageService>();
        _cacheMock = new Mock<IDistributedCache>();
        _loggerMock = new Mock<ILogger<ImagesController>>();

        _controller = new ImagesController(
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
        Guid imageId = Guid.NewGuid();
        Guid tenantId = Guid.NewGuid();
        byte[] cachedData = new byte[] { 1, 2, 3 };

        _cacheMock.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(cachedData);

        // Act
        var result = await _controller.GetThumbnail(imageId, tenantId.ToString());

        // Assert
        var fileResult = result.Should().BeOfType<FileContentResult>().Subject;
        fileResult.ContentType.Should().Be("image/webp");
        fileResult.FileContents.Should().Equal(cachedData);
        
        _storageServiceMock.Verify(s => s.GetFileAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }
}

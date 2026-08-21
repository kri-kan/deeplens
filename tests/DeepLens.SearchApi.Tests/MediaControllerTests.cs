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
    private Mock<IMetadataService> _metadataServiceMock;
    private Mock<IStorageService> _storageServiceMock;
    private Mock<IDistributedCache> _cacheMock;
    private Mock<ILogger<MediaController>> _loggerMock;
    private Mock<DeepLens.Application.Abstractions.Services.IAppSettingsService> _settingsMock;
    private MediaController _controller;

    [SetUp]
    public void SetUp()
    {
        _metadataServiceMock = new Mock<IMetadataService>();
        _storageServiceMock = new Mock<IStorageService>();
        _cacheMock = new Mock<IDistributedCache>();
        _loggerMock = new Mock<ILogger<MediaController>>();
        _settingsMock = new Mock<DeepLens.Application.Abstractions.Services.IAppSettingsService>();

        _controller = new MediaController(
            _metadataServiceMock.Object,
            _storageServiceMock.Object,
            _cacheMock.Object,
            _loggerMock.Object,
            _settingsMock.Object
        );
    }

    [Test]
    public async Task GetThumbnail_Should_ReturnNotFound_WhenMediaNotFound()
    {
        // Arrange
        Guid mediaId = Guid.NewGuid();
        _metadataServiceMock.Setup(m => m.GetMediaByIdAsync(mediaId))
            .ReturnsAsync((DeepLens.Infrastructure.Services.MediaDto?)null);

        // Act
        var result = await _controller.GetThumbnail(mediaId);

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }

    [Test]
    public async Task GetThumbnailByPath_Should_ReturnBadRequest_WhenPathEmpty()
    {
        // Act
        var result = await _controller.GetThumbnailByPath("");

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }
}

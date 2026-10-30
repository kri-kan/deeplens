using System;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Contracts.Catalog;
using DeepLens.Infrastructure.Services;
using DeepLens.SearchApi.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;
using FluentAssertions;

namespace DeepLens.SearchApi.Tests;

[TestFixture]
public class CatalogControllerTests
{
    private Mock<IMetadataService> _metadataServiceMock;
    private Mock<IProductService> _productServiceMock;
    private Mock<ILogger<CatalogController>> _loggerMock;
    private CatalogController _controller;

    [SetUp]
    public void Setup()
    {
        _metadataServiceMock = new Mock<IMetadataService>();
        _productServiceMock = new Mock<IProductService>();
        _loggerMock = new Mock<ILogger<CatalogController>>();

        _controller = new CatalogController(
            _metadataServiceMock.Object,
            _productServiceMock.Object,
            _loggerMock.Object);
    }

    [Test]
    public async Task StarProduct_WhenServiceSucceeds_ReturnsOk()
    {
        // Arrange
        var productId = Guid.NewGuid();
        _productServiceMock
            .Setup(s => s.StarProductAsync(productId, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.StarProduct(productId, new StarProductRequest { IsStarred = true }, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkResult>();
        _productServiceMock.Verify(s => s.StarProductAsync(productId, true, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task StarProduct_WhenServiceReturnsFalse_ReturnsNotFound()
    {
        // Arrange
        var productId = Guid.NewGuid();
        _productServiceMock
            .Setup(s => s.StarProductAsync(productId, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.StarProduct(productId, new StarProductRequest { IsStarred = true }, CancellationToken.None);

        // Assert
        result.Should().BeOfType<NotFoundResult>();
        _productServiceMock.Verify(s => s.StarProductAsync(productId, true, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task StarProduct_UnstarProduct_WhenServiceSucceeds_ReturnsOk()
    {
        // Arrange
        var productId = Guid.NewGuid();
        _productServiceMock
            .Setup(s => s.StarProductAsync(productId, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.StarProduct(productId, new StarProductRequest { IsStarred = false }, CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkResult>();
        _productServiceMock.Verify(s => s.StarProductAsync(productId, false, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Test]
    public async Task ToggleMediaReviewRequired_WhenServiceSucceeds_ReturnsOk()
    {
        // Arrange
        var productId = Guid.NewGuid();
        _productServiceMock
            .Setup(s => s.ToggleMediaReviewRequiredAsync(productId, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.ToggleMediaReviewRequired(
            productId,
            new ToggleMediaReviewRequiredRequest { IsMediaReviewRequired = true },
            CancellationToken.None);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
    }

    [Test]
    public async Task ToggleMediaReviewRequired_WhenServiceFails_ReturnsNotFound()
    {
        // Arrange
        var productId = Guid.NewGuid();
        _productServiceMock
            .Setup(s => s.ToggleMediaReviewRequiredAsync(productId, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.ToggleMediaReviewRequired(
            productId,
            new ToggleMediaReviewRequiredRequest { IsMediaReviewRequired = true },
            CancellationToken.None);

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }
}

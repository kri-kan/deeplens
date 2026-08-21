using System.Security.Claims;
using System.Text.Json;
using Confluent.Kafka;
using DeepLens.Contracts.Events;
using DeepLens.Contracts.Ingestion;
using DeepLens.Infrastructure.Services;
using DeepLens.SearchApi.Controllers;
using DeepLens.SearchApi.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace DeepLens.SearchApi.Tests;

[TestFixture]
public class IngestionControllerTests
{
    private Mock<IStorageService> _storageServiceMock;
    private Mock<IMetadataService> _metadataServiceMock;
    private Mock<IAttributeExtractionService> _attributeServiceMock;
    private Mock<IProducer<string, string>> _kafkaProducerMock;
    private Mock<ILogger<IngestionController>> _loggerMock;
    private IngestionController _controller;

    private readonly Guid _tenantId = Guid.NewGuid();

    [SetUp]
    public void SetUp()
    {
        _storageServiceMock = new Mock<IStorageService>();
        _metadataServiceMock = new Mock<IMetadataService>();
        _attributeServiceMock = new Mock<IAttributeExtractionService>();
        _kafkaProducerMock = new Mock<IProducer<string, string>>();
        _loggerMock = new Mock<ILogger<IngestionController>>();

        _controller = new IngestionController(
            _loggerMock.Object,
            _storageServiceMock.Object,
            _metadataServiceMock.Object,
            _attributeServiceMock.Object,
            _kafkaProducerMock.Object
        );

        // Mock User Claims
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("tenant_id", _tenantId.ToString()),
            new Claim("scope", "deeplens.api")
        }));

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };
    }

    [Test]
    public async Task IngestImage_Should_CallNotifyPipeline_WithCorrectOptions()
    {
        // Arrange
        var fileMock = new Mock<IFormFile>();
        fileMock.Setup(f => f.FileName).Returns("test.jpg");
        fileMock.Setup(f => f.Length).Returns(1024);
        fileMock.Setup(f => f.ContentType).Returns("image/jpeg");
        fileMock.Setup(f => f.OpenReadStream()).Returns(new MemoryStream());

        var request = new UploadImageRequest
        {
            File = fileMock.Object,
            SellerId = "seller123",
            Sku = "SKU001"
        };

        _metadataServiceMock.Setup(m => m.ResolveMediaPreferencesAsync(It.IsAny<DeepLens.Contracts.Media.MediaCategory>(), It.IsAny<string>()))
            .ReturnsAsync(new DeepLens.Contracts.Media.MediaPreferenceDto
            {
                ThumbnailSizes = new[] { "medium" },
                Retention = "30d"
            });

        _storageServiceMock.Setup(s => s.UploadFileAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<DeepLens.Contracts.Media.StorageContext>(), It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync("raw/test.jpg");

        // Act
        var result = await _controller.IngestImage(request);

        // Assert
        result.Result.Should().BeAssignableTo<ObjectResult>();
        
        // Verify Kafka notification
        _kafkaProducerMock.Verify(p => p.ProduceAsync(
            It.Is<string>(t => t == KafkaTopics.ImageUploaded),
            It.Is<Message<string, string>>(m => VerifyEventOptions(m.Value)),
            It.IsAny<CancellationToken>()
        ), Times.Once);
    }

    private bool VerifyEventOptions(string eventJson)
    {
        var evt = JsonSerializer.Deserialize<ImageUploadedEvent>(eventJson);
        return evt != null && 
               evt.ProcessingOptions.GenerateThumbnail == true;
    }
}

using DeepLens.Application.Abstractions.Data;
using DeepLens.Application.Abstractions.IdGeneration;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Application.Orders.Commands.CreateOrder;
using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;
using FluentAssertions;

namespace DeepLens.Application.Tests;

[TestFixture]
public class CreateOrderCommandHandlerTests
{
    private Mock<ISequencedIdGenerator> _idGeneratorMock;
    private Mock<IOrderRepository> _orderRepositoryMock;
    private Mock<IInstagramSidecarService> _sidecarMock;
    private Mock<ILogger<CreateOrderCommandHandler>> _loggerMock;
    private CreateOrderCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _idGeneratorMock = new Mock<ISequencedIdGenerator>();
        _orderRepositoryMock = new Mock<IOrderRepository>();
        _sidecarMock = new Mock<IInstagramSidecarService>();
        _loggerMock = new Mock<ILogger<CreateOrderCommandHandler>>();

        _handler = new CreateOrderCommandHandler(
            _idGeneratorMock.Object,
            _orderRepositoryMock.Object,
            _sidecarMock.Object,
            _loggerMock.Object);
    }

    [Test]
    public async Task Handle_ValidRequest_ReturnsSuccessWithOrderId()
    {
        // Arrange
        long generatedId = 1001L;
        var orderIdStr = "ORD-2026-0001";
        _idGeneratorMock.Setup(g => g.GetNextOrderIdAsync())
            .ReturnsAsync((generatedId, orderIdStr));

        var command = new CreateOrderCommand(
            Source: "Instagram",
            PaymentMode: "UPI",
            ItemCount: 2);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Value.OrderId.Should().Be(orderIdStr);

        _orderRepositoryMock.Verify(r => r.CreateOrderRecordAsync(
            generatedId,
            orderIdStr,
            It.IsAny<int?>(),
            It.IsAny<int?>(),
            It.IsAny<string?>(),
            It.IsAny<string?>(),
            It.IsAny<string?>(),
            It.IsAny<Guid?>()), Times.Once);
    }

    [Test]
    public async Task Handle_RepositoryThrowsException_ReturnsFailureResult()
    {
        // Arrange
        _idGeneratorMock.Setup(g => g.GetNextOrderIdAsync())
            .ThrowsAsync(new Exception("Database connection failed"));

        var command = new CreateOrderCommand();

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Code.Should().Be("Order.CreateError");
        result.Error.Description.Should().Be("Database connection failed");
    }
}

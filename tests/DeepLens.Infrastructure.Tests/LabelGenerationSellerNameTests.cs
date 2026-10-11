using System;
using System.Collections.Generic;
using System.Data;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Orders;
using DeepLens.Infrastructure.Clients.Delhivery;
using DeepLens.Infrastructure.Persistence.Repositories.Logistics;
using DeepLens.Infrastructure.Services.Logistics;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;

namespace DeepLens.Infrastructure.Tests;

[TestFixture]
public class LabelGenerationSellerNameTests
{
    private Mock<IOrderRepository> _orderRepoMock;
    private Mock<ILogisticsRepository> _logisticsRepoMock;
    private Mock<IDbConnectionFactory> _dbConnFactoryMock;
    private Mock<IDelhiveryClient> _delhiveryClientMock;
    private Mock<ILogger<GenerateGroupLabelCommandHandler>> _loggerMock;
    private Mock<IDbConnection> _dbConnMock;
    private GenerateGroupLabelCommandHandler _handler;

    [SetUp]
    public void Setup()
    {
        _orderRepoMock = new Mock<IOrderRepository>();
        _logisticsRepoMock = new Mock<ILogisticsRepository>();
        _dbConnFactoryMock = new Mock<IDbConnectionFactory>();
        _delhiveryClientMock = new Mock<IDelhiveryClient>();
        _loggerMock = new Mock<ILogger<GenerateGroupLabelCommandHandler>>();
        _dbConnMock = new Mock<IDbConnection>();

        _dbConnFactoryMock.Setup(f => f.CreateConnectionAsync())
            .ReturnsAsync(_dbConnMock.Object);

        _handler = new GenerateGroupLabelCommandHandler(
            _orderRepoMock.Object,
            _logisticsRepoMock.Object,
            _dbConnFactoryMock.Object,
            _delhiveryClientMock.Object,
            _loggerMock.Object);
    }

    [Test]
    public async Task CustomerOrder_SetsSellerNameToFromVayyariFashions()
    {
        // Arrange
        var orderId = "ORD-001";
        var grpId = "ORD-001-G1";
        var order = new OrderDetailDto
        {
            Id = orderId,
            OrderType = "Customer",
            ResellerName = null,
            CustomerName = "Ananya Sharma",
            CustomerAddress = "123 Main Road",
            Groups = new List<OrderGroupDto>
            {
                new OrderGroupDto { OrderGrpId = grpId }
            }
        };

        _orderRepoMock.Setup(r => r.GetDetailsAsync(orderId))
            .ReturnsAsync(order);

        DelhiveryCmuPayload? capturedPayload = null;
        _delhiveryClientMock.Setup(c => c.CreateShipmentAsync(It.IsAny<DelhiveryCmuPayload>(), It.IsAny<CancellationToken>()))
            .Callback<DelhiveryCmuPayload, CancellationToken>((p, ct) => capturedPayload = p)
            .ReturnsAsync(new DelhiveryCmuResponse
            {
                Packages = new List<DelhiveryPackageResponse>
                {
                    new DelhiveryPackageResponse { Waybill = "WB123456" }
                }
            });

        _delhiveryClientMock.Setup(c => c.GeneratePackingSlipAndPersistAsync("WB123456", It.IsAny<CancellationToken>()))
            .ReturnsAsync("labels/WB123456.pdf");

        // Act
        var command = new GenerateGroupLabelCommand(grpId);
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        capturedPayload.Should().NotBeNull();
        capturedPayload!.Shipments.Should().HaveCount(1);
        capturedPayload.Shipments[0].SellerName.Should().Be("From: VAYYARI Fashions");
    }

    [Test]
    public async Task ResellerOrder_WithResellerName_SetsSellerNameToFromResellerName()
    {
        // Arrange
        var orderId = "ORD-002";
        var grpId = "ORD-002-G1";
        var order = new OrderDetailDto
        {
            Id = orderId,
            OrderType = "Reseller",
            ResellerName = "Priya Silk Sarees & Boutique",
            CustomerName = "Deepa Patel",
            CustomerAddress = "456 Fashion Street",
            Groups = new List<OrderGroupDto>
            {
                new OrderGroupDto { OrderGrpId = grpId }
            }
        };

        _orderRepoMock.Setup(r => r.GetDetailsAsync(orderId))
            .ReturnsAsync(order);

        DelhiveryCmuPayload? capturedPayload = null;
        _delhiveryClientMock.Setup(c => c.CreateShipmentAsync(It.IsAny<DelhiveryCmuPayload>(), It.IsAny<CancellationToken>()))
            .Callback<DelhiveryCmuPayload, CancellationToken>((p, ct) => capturedPayload = p)
            .ReturnsAsync(new DelhiveryCmuResponse
            {
                Packages = new List<DelhiveryPackageResponse>
                {
                    new DelhiveryPackageResponse { Waybill = "WB234567" }
                }
            });

        _delhiveryClientMock.Setup(c => c.GeneratePackingSlipAndPersistAsync("WB234567", It.IsAny<CancellationToken>()))
            .ReturnsAsync("labels/WB234567.pdf");

        // Act
        var command = new GenerateGroupLabelCommand(grpId);
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        capturedPayload.Should().NotBeNull();
        capturedPayload!.Shipments.Should().HaveCount(1);
        capturedPayload.Shipments[0].SellerName.Should().Be("From: Priya Silk Sarees & Boutique");
    }

    [Test]
    public async Task ResellerOrder_WithoutResellerName_SetsSellerNameToEmpty()
    {
        // Arrange
        var orderId = "ORD-003";
        var grpId = "ORD-003-G1";
        var order = new OrderDetailDto
        {
            Id = orderId,
            OrderType = "Reseller",
            ResellerName = "   ",
            CustomerName = "Kavita Rao",
            CustomerAddress = "789 Silk Avenue",
            Groups = new List<OrderGroupDto>
            {
                new OrderGroupDto { OrderGrpId = grpId }
            }
        };

        _orderRepoMock.Setup(r => r.GetDetailsAsync(orderId))
            .ReturnsAsync(order);

        DelhiveryCmuPayload? capturedPayload = null;
        _delhiveryClientMock.Setup(c => c.CreateShipmentAsync(It.IsAny<DelhiveryCmuPayload>(), It.IsAny<CancellationToken>()))
            .Callback<DelhiveryCmuPayload, CancellationToken>((p, ct) => capturedPayload = p)
            .ReturnsAsync(new DelhiveryCmuResponse
            {
                Packages = new List<DelhiveryPackageResponse>
                {
                    new DelhiveryPackageResponse { Waybill = "WB345678" }
                }
            });

        _delhiveryClientMock.Setup(c => c.GeneratePackingSlipAndPersistAsync("WB345678", It.IsAny<CancellationToken>()))
            .ReturnsAsync("labels/WB345678.pdf");

        // Act
        var command = new GenerateGroupLabelCommand(grpId);
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        capturedPayload.Should().NotBeNull();
        capturedPayload!.Shipments.Should().HaveCount(1);
        capturedPayload.Shipments[0].SellerName.Should().Be(string.Empty);
    }

    [Test]
    public async Task CommandOverrides_TakePrecedenceOverPersistedOrder()
    {
        // Arrange
        var orderId = "ORD-004";
        var grpId = "ORD-004-G1";
        var order = new OrderDetailDto
        {
            Id = orderId,
            OrderType = "Customer", // Persisted as Customer
            ResellerName = null,
            CustomerName = "Meera Nair",
            CustomerAddress = "321 Lotus Lane",
            Groups = new List<OrderGroupDto>
            {
                new OrderGroupDto { OrderGrpId = grpId }
            }
        };

        _orderRepoMock.Setup(r => r.GetDetailsAsync(orderId))
            .ReturnsAsync(order);

        DelhiveryCmuPayload? capturedPayload = null;
        _delhiveryClientMock.Setup(c => c.CreateShipmentAsync(It.IsAny<DelhiveryCmuPayload>(), It.IsAny<CancellationToken>()))
            .Callback<DelhiveryCmuPayload, CancellationToken>((p, ct) => capturedPayload = p)
            .ReturnsAsync(new DelhiveryCmuResponse
            {
                Packages = new List<DelhiveryPackageResponse>
                {
                    new DelhiveryPackageResponse { Waybill = "WB456789" }
                }
            });

        _delhiveryClientMock.Setup(c => c.GeneratePackingSlipAndPersistAsync("WB456789", It.IsAny<CancellationToken>()))
            .ReturnsAsync("labels/WB456789.pdf");

        // Act - Request explicitly specifies Reseller with boutique name
        var command = new GenerateGroupLabelCommand(
            OrderGrpId: grpId,
            OrderType: "Reseller",
            ResellerName: "Sita Collections");
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        capturedPayload.Should().NotBeNull();
        capturedPayload!.Shipments.Should().HaveCount(1);
        capturedPayload.Shipments[0].SellerName.Should().Be("From: Sita Collections");
        capturedPayload.Shipments[0].SellerAddress.Should().Be(string.Empty);
    }

    [Test]
    public async Task ExplicitSellerNameAndAddress_OverridesAreRespected()
    {
        // Arrange
        var orderId = "ORD-005";
        var grpId = "ORD-005-G1";
        var order = new OrderDetailDto
        {
            Id = orderId,
            OrderType = "Customer",
            CustomerName = "Pooja Reddy",
            CustomerAddress = "500 Jubilee Hills",
            Groups = new List<OrderGroupDto>
            {
                new OrderGroupDto { OrderGrpId = grpId }
            }
        };

        _orderRepoMock.Setup(r => r.GetDetailsAsync(orderId))
            .ReturnsAsync(order);

        DelhiveryCmuPayload? capturedPayload = null;
        _delhiveryClientMock.Setup(c => c.CreateShipmentAsync(It.IsAny<DelhiveryCmuPayload>(), It.IsAny<CancellationToken>()))
            .Callback<DelhiveryCmuPayload, CancellationToken>((p, ct) => capturedPayload = p)
            .ReturnsAsync(new DelhiveryCmuResponse
            {
                Packages = new List<DelhiveryPackageResponse>
                {
                    new DelhiveryPackageResponse { Waybill = "WB567890" }
                }
            });

        _delhiveryClientMock.Setup(c => c.GeneratePackingSlipAndPersistAsync("WB567890", It.IsAny<CancellationToken>()))
            .ReturnsAsync("labels/WB567890.pdf");

        // Act - Request explicitly specifies custom SellerName and custom SellerAddress
        var command = new GenerateGroupLabelCommand(
            OrderGrpId: grpId,
            SellerName: "Special Boutique Dispatch",
            SellerAddress: "PO Box 99, Surat Trade Center");
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue();
        capturedPayload.Should().NotBeNull();
        capturedPayload!.Shipments.Should().HaveCount(1);
        capturedPayload.Shipments[0].SellerName.Should().Be("Special Boutique Dispatch");
        capturedPayload.Shipments[0].SellerAddress.Should().Be("PO Box 99, Surat Trade Center");
        capturedPayload.Shipments[0].ReturnAddress.Should().Be("Central Fulfillment Hub");
        capturedPayload.PickupLocation!.Address.Should().Be("Central Fulfillment Hub");
    }

    [Test]
    public async Task SellerAddress_DefaultsToEmptyStringWhenNull()
    {
        // Arrange
        var orderId = "ORD-006";
        var grpId = "ORD-006-G1";
        var order = new OrderDetailDto
        {
            Id = orderId,
            OrderType = "Customer",
            CustomerName = "Lakshmi Sundaram",
            CustomerAddress = "100 MG Road",
            Groups = new List<OrderGroupDto>
            {
                new OrderGroupDto { OrderGrpId = grpId }
            }
        };

        _orderRepoMock.Setup(r => r.GetDetailsAsync(orderId))
            .ReturnsAsync(order);

        DelhiveryCmuPayload? capturedPayload = null;
        _delhiveryClientMock.Setup(c => c.CreateShipmentAsync(It.IsAny<DelhiveryCmuPayload>(), It.IsAny<CancellationToken>()))
            .Callback<DelhiveryCmuPayload, CancellationToken>((p, ct) => capturedPayload = p)
            .ReturnsAsync(new DelhiveryCmuResponse
            {
                Packages = new List<DelhiveryPackageResponse>
                {
                    new DelhiveryPackageResponse { Waybill = "WB678901" }
                }
            });

        _delhiveryClientMock.Setup(c => c.GeneratePackingSlipAndPersistAsync("WB678901", It.IsAny<CancellationToken>()))
            .ReturnsAsync("labels/WB678901.pdf");

        // Act - SellerAddress is not provided (null)
        var command = new GenerateGroupLabelCommand(OrderGrpId: grpId);
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert - seller_add, return_add, and pickup_location.add must all be suppressed as "" (empty string)
        result.IsSuccess.Should().BeTrue();
        capturedPayload.Should().NotBeNull();
        capturedPayload!.Shipments[0].SellerAddress.Should().Be(string.Empty);
        capturedPayload.Shipments[0].ReturnAddress.Should().Be(string.Empty);
        capturedPayload.PickupLocation!.Address.Should().Be(string.Empty);
    }
}

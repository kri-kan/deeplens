using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Application.Abstractions.IdGeneration;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Contracts.Orders;
using DeepLens.Domain.Enums;
using DeepLens.SearchApi.DTOs;
using DeepLens.SearchApi.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;

namespace DeepLens.SearchApi.Tests;

[TestFixture]
public class IdGeneratorServiceTests
{
    private Mock<ISequencedIdGenerator> _sequencedIdGeneratorMock;
    private Mock<IOrderRepository> _orderRepositoryMock;
    private Mock<IInstagramSidecarService> _instagramSidecarMock;
    private Mock<IAttachmentService> _attachmentServiceMock;
    private Mock<ILogger<IdGeneratorService>> _loggerMock;
    private IdGeneratorService _service;

    [SetUp]
    public void Setup()
    {
        _sequencedIdGeneratorMock = new Mock<ISequencedIdGenerator>();
        _orderRepositoryMock = new Mock<IOrderRepository>();
        _instagramSidecarMock = new Mock<IInstagramSidecarService>();
        _attachmentServiceMock = new Mock<IAttachmentService>();
        _loggerMock = new Mock<ILogger<IdGeneratorService>>();

        _service = new IdGeneratorService(
            _sequencedIdGeneratorMock.Object,
            _orderRepositoryMock.Object,
            _instagramSidecarMock.Object,
            _attachmentServiceMock.Object,
            _loggerMock.Object);
    }

    [Test]
    public async Task CloneOrderAsync_StripsSharingAndTrackingMetadataFromComments()
    {
        // Arrange
        var sourceOrderId = "00020";
        var newOrderId = "00021";

        var commentsObj = new JsonObject
        {
            ["isShared"] = true,
            ["sharedAt"] = "2026-10-10T12:00:00Z",
            ["isAddressShared"] = true,
            ["addressSharedAt"] = "2026-10-10T12:00:00Z",
            ["isLabelShared"] = true,
            ["labelSharedAt"] = "2026-10-10T12:00:00Z",
            ["status"] = "delivered",
            ["awbNumber"] = "35003110014884",
            ["trackingNumber"] = "TRK123456",
            ["labelUrl"] = "labels/35003110014884.pdf",
            ["shipmentId"] = "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            ["sareeCode"] = "SR-9012",
            ["customNote"] = "Handle with care, gift wrap"
        };

        var sourceOrder = new OrderDetailDto
        {
            Id = sourceOrderId,
            CustomerName = "Deepika Rao",
            CustomerPhone = "9876543210",
            PaymentMode = PaymentMode.Prepaid,
            Status = OrderStatus.Delivered,
            NeedLabel = true,
            TotalAmount = 2500m,
            Items = new List<OrderItemDetailDto>
            {
                new OrderItemDetailDto
                {
                    Id = 1,
                    ProductId = "PROD-101",
                    ProductTitle = "Kanjivaram Silk Saree",
                    Quantity = 1,
                    UnitPrice = 2500m,
                    Subtotal = 2500m,
                    Comments = commentsObj.ToJsonString()
                }
            }
        };

        _orderRepositoryMock.Setup(r => r.GetDetailsAsync(sourceOrderId))
            .ReturnsAsync(sourceOrder);

        _sequencedIdGeneratorMock.Setup(g => g.GetNextOrderIdAsync())
            .ReturnsAsync((101L, newOrderId));

        string? capturedSavedComment = null;
        _orderRepositoryMock.Setup(r => r.AddOrderItemAsync(
                It.IsAny<int>(),
                It.IsAny<int>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<int>(),
                It.IsAny<decimal>(),
                It.IsAny<decimal>(),
                It.IsAny<Guid?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>()))
            .Callback<int, int, string?, string?, string?, int, decimal, decimal, Guid?, string?, string?, string?>(
                (internalId, idx, prodId, title, comments, qty, unitPrice, subtotal, vendorId, sourceType, itemId, orderGrpId) =>
                {
                    capturedSavedComment = comments;
                })
            .Returns(Task.CompletedTask);

        _orderRepositoryMock.Setup(r => r.UpdateDetailsAsync(
                newOrderId,
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<int?>(),
                It.IsAny<string?>(),
                It.IsAny<int?>(),
                It.IsAny<string?>(),
                It.IsAny<Guid?>(),
                It.IsAny<string?>(),
                It.IsAny<decimal?>(),
                It.IsAny<decimal?>(),
                It.IsAny<decimal?>(),
                It.IsAny<decimal?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<bool?>(),
                It.IsAny<OrderStatus?>(),
                It.IsAny<bool?>(),
                It.IsAny<string?>(),
                It.IsAny<string?>(),
                It.IsAny<bool?>()))
            .ReturnsAsync(true);

        _orderRepositoryMock.Setup(r => r.GetInternalIdAsync(newOrderId))
            .ReturnsAsync(101);

        // Act
        await _service.CloneOrderAsync(sourceOrderId);

        // Assert - verify captured item comments via AddOrderItemAsync
        capturedSavedComment.Should().NotBeNull();
        var parsed = JsonNode.Parse(capturedSavedComment!)?.AsObject();
        parsed.Should().NotBeNull();

        // Legitimate business properties must be preserved
        parsed!["sareeCode"]?.GetValue<string>().Should().Be("SR-9012");
        parsed["customNote"]?.GetValue<string>().Should().Be("Handle with care, gift wrap");

        // Tracking and sharing flags must be scrubbed
        parsed.ContainsKey("isShared").Should().BeFalse();
        parsed.ContainsKey("sharedAt").Should().BeFalse();
        parsed.ContainsKey("isAddressShared").Should().BeFalse();
        parsed.ContainsKey("addressSharedAt").Should().BeFalse();
        parsed.ContainsKey("isLabelShared").Should().BeFalse();
        parsed.ContainsKey("labelSharedAt").Should().BeFalse();
        parsed.ContainsKey("status").Should().BeFalse();
        parsed.ContainsKey("awbNumber").Should().BeFalse();
        parsed.ContainsKey("trackingNumber").Should().BeFalse();
        parsed.ContainsKey("labelUrl").Should().BeFalse();
        parsed.ContainsKey("shipmentId").Should().BeFalse();
    }

    [Test]
    public async Task CloneOrderAsync_PreservesPlainTextCommentsUnchanged()
    {
        // Arrange
        var sourceOrderId = "00020";
        var newOrderId = "00022";
        var plainTextComment = "Customer wants fall and pico stitching done before dispatch";

        var sourceOrder = new OrderDetailDto
        {
            Id = sourceOrderId,
            CustomerName = "Ananya Sharma",
            PaymentMode = PaymentMode.Prepaid,
            Status = OrderStatus.Confirmed,
            NeedLabel = false,
            TotalAmount = 1800m,
            Items = new List<OrderItemDetailDto>
            {
                new OrderItemDetailDto
                {
                    Id = 1,
                    ProductId = "PROD-202",
                    ProductTitle = "Banarasi Silk Saree",
                    Quantity = 1,
                    UnitPrice = 1800m,
                    Subtotal = 1800m,
                    Comments = plainTextComment
                }
            }
        };

        _orderRepositoryMock.Setup(r => r.GetDetailsAsync(sourceOrderId))
            .ReturnsAsync(sourceOrder);

        _sequencedIdGeneratorMock.Setup(g => g.GetNextOrderIdAsync())
            .ReturnsAsync((102L, newOrderId));

        _orderRepositoryMock.Setup(r => r.UpdateDetailsAsync(
                It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<int?>(),
                It.IsAny<string?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<Guid?>(),
                It.IsAny<string?>(), It.IsAny<decimal?>(), It.IsAny<decimal?>(), It.IsAny<decimal?>(),
                It.IsAny<decimal?>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(),
                It.IsAny<string?>(), It.IsAny<bool?>(), It.IsAny<OrderStatus?>(), It.IsAny<bool?>(),
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<bool?>()))
            .ReturnsAsync(true);

        _orderRepositoryMock.Setup(r => r.GetInternalIdAsync(newOrderId))
            .ReturnsAsync(102);

        // Act
        await _service.CloneOrderAsync(sourceOrderId);

        // Assert - AddOrderItemAsync received the plain text comment verbatim
        _orderRepositoryMock.Verify(r => r.AddOrderItemAsync(
            102,
            1,
            "PROD-202",
            "Banarasi Silk Saree",
            plainTextComment,
            1,
            1800m,
            1800m,
            It.IsAny<Guid?>(),
            It.IsAny<string?>(),
            It.IsAny<string?>(),
            It.IsAny<string?>()
        ), Times.Once);
    }

    [Test]
    public async Task CloneOrderAsync_ResetsFinancials_AndComputesCodBalanceWhenCod()
    {
        // Arrange
        var sourceOrderId = "00020";
        var newOrderId = "00023";

        var sourceOrder = new OrderDetailDto
        {
            Id = sourceOrderId,
            CustomerName = "Pooja Reddy",
            CustomerPhone = "9988776655",
            PaymentMode = PaymentMode.COD,
            Status = OrderStatus.Delivered,
            NeedLabel = true,
            AdvancePaid = 500m,
            TransactionId = "TXN_ORIGINAL_123",
            TotalAmount = 3000m,
            ShippingCharges = 150m,
            OrderType = "Reseller",
            ResellerName = "Sree Boutiques",
            IsAddressReviewed = true,
            Items = new List<OrderItemDetailDto>
            {
                new OrderItemDetailDto
                {
                    Id = 1,
                    ProductId = "PROD-303",
                    ProductTitle = "Chanderi Cotton Saree",
                    Quantity = 2,
                    UnitPrice = 1400m,
                    Subtotal = 2800m,
                    Comments = "{\"isShared\":true,\"sareeCode\":\"CH-11\"}"
                }
            }
        };

        _orderRepositoryMock.Setup(r => r.GetDetailsAsync(sourceOrderId))
            .ReturnsAsync(sourceOrder);

        _sequencedIdGeneratorMock.Setup(g => g.GetNextOrderIdAsync())
            .ReturnsAsync((103L, newOrderId));

        _orderRepositoryMock.Setup(r => r.UpdateDetailsAsync(
                It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<int?>(),
                It.IsAny<string?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<Guid?>(),
                It.IsAny<string?>(), It.IsAny<decimal?>(), It.IsAny<decimal?>(), It.IsAny<decimal?>(),
                It.IsAny<decimal?>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(),
                It.IsAny<string?>(), It.IsAny<bool?>(), It.IsAny<OrderStatus?>(), It.IsAny<bool?>(),
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<bool?>()))
            .ReturnsAsync(true);

        _orderRepositoryMock.Setup(r => r.GetInternalIdAsync(newOrderId))
            .ReturnsAsync(103);

        // Act
        await _service.CloneOrderAsync(sourceOrderId);

        // Assert
        // grandTotal = 2800 (items) + 150 (shipping) = 2950m
        // codBalance = 2950m
        // advancePaid = null, transactionId = null, needLabel = false, status = Unconfirmed, isAddressReviewed = false
        // OrderType = "Reseller", ResellerName = "Sree Boutiques" preserved
        _orderRepositoryMock.Verify(r => r.UpdateDetailsAsync(
            newOrderId,
            sourceOrder.CustomerPhone,
            It.IsAny<string?>(),
            It.IsAny<int?>(),
            It.IsAny<string?>(),
            (int)PaymentMode.COD,
            null, // TransactionId reset to null
            It.IsAny<Guid?>(),
            "Pooja Reddy",
            null, // AdvancePaid reset to null
            2950m, // CodBalance set to grandTotal
            2950m, // TotalAmount set to grandTotal
            150m, // Shipping charges preserved
            It.IsAny<string?>(),
            It.IsAny<string?>(),
            It.IsAny<string?>(),
            It.IsAny<string?>(),
            It.IsAny<bool?>(),
            OrderStatus.Unconfirmed,
            false, // NeedLabel reset to false
            "Reseller",
            "Sree Boutiques",
            false // IsAddressReviewed reset to false
        ), Times.Once);
    }

    [Test]
    public async Task UpdateOrderDetailsAsync_DoesNotOverrideNeedLabelFalse_WhenClientGroupSpecifiesFalse()
    {
        // Arrange
        var orderId = "00020";
        var grpId = "00020-G1";

        var updateDto = new OrderUpdateDto
        {
            PaymentMode = PaymentMode.COD,
            NeedLabel = false,
            Status = OrderStatus.Confirmed,
            Groups = new List<OrderGroupDto>
            {
                new OrderGroupDto
                {
                    OrderGrpId = grpId,
                    VendorName = "Surat Textiles",
                    NeedLabel = false,
                    AwbNumber = null,
                    LabelUrl = null,
                    Status = "confirmed"
                }
            },
            Items = new List<OrderItemUpdateDto>
            {
                new OrderItemUpdateDto
                {
                    ProductId = "P-1",
                    VendorName = "Surat Textiles",
                    Quantity = 1,
                    UnitPrice = 1000m,
                    Subtotal = 1000m
                }
            }
        };

        _orderRepositoryMock.Setup(r => r.UpdateDetailsAsync(
                It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<int?>(),
                It.IsAny<string?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<Guid?>(),
                It.IsAny<string?>(), It.IsAny<decimal?>(), It.IsAny<decimal?>(), It.IsAny<decimal?>(),
                It.IsAny<decimal?>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(),
                It.IsAny<string?>(), It.IsAny<bool?>(), It.IsAny<OrderStatus?>(), It.IsAny<bool?>(),
                It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<bool?>()))
            .ReturnsAsync(true);

        _orderRepositoryMock.Setup(r => r.GetInternalIdAsync(orderId))
            .ReturnsAsync(72);

        OrderGroupDto? savedGroup = null;
        _orderRepositoryMock.Setup(r => r.CreateOrUpdateOrderGroupAsync(It.IsAny<OrderGroupDto>()))
            .Callback<OrderGroupDto>(g => savedGroup = g)
            .Returns(Task.CompletedTask);

        // Act
        var result = await _service.UpdateOrderDetailsAsync(orderId, updateDto);

        // Assert
        result.Should().BeTrue();
        savedGroup.Should().NotBeNull();
        savedGroup!.NeedLabel.Should().BeFalse("even for COD orders, explicit NeedLabel = false must not be overridden to true");
        savedGroup.AwbNumber.Should().BeNull();
        savedGroup.LabelUrl.Should().BeNull();
    }
}

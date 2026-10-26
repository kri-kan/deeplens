using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.SearchApi.Models;
using DeepLens.SearchApi.Services;
using Moq;
using NUnit.Framework;

namespace DeepLens.SearchApi.Tests;

// Compatibility alias for xUnit-style [Fact]
[AttributeUsage(AttributeTargets.Method)]
public class FactAttribute : TestAttribute { }

[TestFixture]
public class ProductMergeServiceTests
{
    private Dictionary<Guid, CatalogProduct> _productStore = null!;
    private Mock<ICatalogProductRepository> _repositoryMock = null!;
    private ProductMergeService _mergeService = null!;

    // Test-scoped Assert helper matching brief syntax
    private static class Assert
    {
        public static void Equal<T>(T expected, T actual) =>
            NUnit.Framework.Assert.That(actual, Is.EqualTo(expected));

        public static void True(bool condition) =>
            NUnit.Framework.Assert.That(condition, Is.True);

        public static void False(bool condition) =>
            NUnit.Framework.Assert.That(condition, Is.False);

        public static Task<T> ThrowsAsync<T>(Func<Task> code) where T : Exception =>
            Task.FromResult(NUnit.Framework.Assert.ThrowsAsync<T>(async () => await code())!);
    }

    [SetUp]
    public void Setup()
    {
        _productStore = new Dictionary<Guid, CatalogProduct>();
        _repositoryMock = new Mock<ICatalogProductRepository>();

        _repositoryMock
            .Setup(r => r.GetProductsByIdsAsync(It.IsAny<IEnumerable<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IEnumerable<Guid> ids, CancellationToken _) =>
                ids.Where(id => _productStore.ContainsKey(id)).Select(id => _productStore[id]).ToList());

        _repositoryMock
            .Setup(r => r.UpdateProductAsync(It.IsAny<CatalogProduct>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((CatalogProduct p, CancellationToken _) =>
            {
                _productStore[p.Id] = p;
                return p;
            });

        _repositoryMock
            .Setup(r => r.RecordMergeAuditAsync(It.IsAny<Guid>(), It.IsAny<IEnumerable<Guid>>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        _mergeService = new ProductMergeService(_repositoryMock.Object);
    }

    private CatalogProduct CreateProduct(bool isPublished, DateTime? createdAt = null, DateTime? mediaUpdatedAt = null)
    {
        var product = new CatalogProduct
        {
            Id = Guid.NewGuid(),
            IsPublished = isPublished,
            // Unpublished products are newer by default to verify anchoring preference over recency
            CreatedAt = createdAt ?? (isPublished ? DateTime.UtcNow.AddDays(-10) : DateTime.UtcNow),
            MediaUpdatedAt = mediaUpdatedAt,
            StorePublishUpdatedAt = isPublished ? DateTime.UtcNow.AddDays(-10) : null
        };
        _productStore[product.Id] = product;
        return product;
    }

    [Fact]
    public async Task MergeProductsAsync_WhenSourceIsPublished_ForcesPublishedProductAsWinner()
    {
        var publishedProduct = CreateProduct(isPublished: true);
        var unpublishedProduct = CreateProduct(isPublished: false);
        var result = await _mergeService.MergeAsync(new[] { publishedProduct.Id, unpublishedProduct.Id });
        
        Assert.Equal(publishedProduct.Id, result.WinnerId);
        Assert.True(result.IsAnchored);
    }

    [Fact]
    public async Task MergeProductsAsync_WhenTargetIsPublishedAndSourceIsPublished_ThrowsInvalidOperationException()
    {
        var published1 = CreateProduct(isPublished: true);
        var published2 = CreateProduct(isPublished: true);

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await _mergeService.MergeAsync(new[] { published1.Id, published2.Id });
        });
    }

    [Fact]
    public async Task MergeProductsAsync_WhenNoProductsPublished_SelectsNewestAsWinner()
    {
        var olderProduct = CreateProduct(isPublished: false, createdAt: DateTime.UtcNow.AddDays(-5));
        var newerProduct = CreateProduct(isPublished: false, createdAt: DateTime.UtcNow);

        var result = await _mergeService.MergeAsync(new[] { olderProduct.Id, newerProduct.Id });

        Assert.Equal(newerProduct.Id, result.WinnerId);
        Assert.False(result.IsAnchored);
    }

    [Fact]
    public async Task MergeProductsAsync_WhenExplicitTargetSpecifiedAndNonePublished_UsesTargetId()
    {
        var productA = CreateProduct(isPublished: false, createdAt: DateTime.UtcNow.AddDays(-5));
        var productB = CreateProduct(isPublished: false, createdAt: DateTime.UtcNow);

        var request = new ProductMergeRequest(new[] { productA.Id, productB.Id }, targetId: productA.Id);
        var result = await _mergeService.MergeAsync(request);

        Assert.Equal(productA.Id, result.WinnerId);
        Assert.False(result.IsAnchored);
    }

    [Fact]
    public async Task MergeProductsAsync_OnSuccessfulMerge_UpdatesMediaUpdatedAtOnWinner()
    {
        var initialMediaTime = DateTime.UtcNow.AddDays(-2);
        var publishedProduct = CreateProduct(isPublished: true, mediaUpdatedAt: initialMediaTime);
        var unpublishedProduct = CreateProduct(isPublished: false);

        var beforeMerge = DateTime.UtcNow.AddSeconds(-1);
        var result = await _mergeService.MergeAsync(new[] { publishedProduct.Id, unpublishedProduct.Id });
        var afterMerge = DateTime.UtcNow.AddSeconds(1);

        Assert.True(result.MediaUpdatedAt >= beforeMerge && result.MediaUpdatedAt <= afterMerge);
        Assert.Equal(publishedProduct.Id, result.WinnerId);

        // Verify updated in repository
        _repositoryMock.Verify(r => r.UpdateProductAsync(It.Is<CatalogProduct>(p => p.Id == publishedProduct.Id && p.MediaUpdatedAt == result.MediaUpdatedAt), It.IsAny<CancellationToken>()), Times.Once);
        _repositoryMock.Verify(r => r.RecordMergeAuditAsync(publishedProduct.Id, It.Is<IEnumerable<Guid>>(ids => ids.Contains(unpublishedProduct.Id)), true, It.IsAny<CancellationToken>()), Times.Once);
    }
}

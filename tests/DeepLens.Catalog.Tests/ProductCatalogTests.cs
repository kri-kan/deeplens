using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DeepLens.Contracts.Catalog;
using DeepLens.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;

namespace DeepLens.Catalog.Tests;

[TestFixture]
public class ProductCatalogTests
{
    private string _connectionString = "Host=192.168.0.170;Port=5432;Username=postgres;Password=Krikank1$;Database=deeplens_platform";
    private ProductService _productService = null!;

    [OneTimeSetUp]
    public void Setup()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> {
                { "ConnectionStrings:DefaultConnection", _connectionString }
            }).Build();

        var logger = new Mock<ILogger<ProductService>>().Object;
        var storage = new Mock<IStorageService>().Object;
        var shareRepo = new Mock<DeepLens.Application.Abstractions.Repositories.IProductShareLogRepository>().Object;
        var prodRepo = new Mock<DeepLens.Application.Abstractions.Repositories.IProductRepository>().Object;
        var ai = new Mock<DeepLens.Application.Abstractions.Services.IAiService>().Object;

        _productService = new ProductService(config, logger, storage, shareRepo, prodRepo, ai);
    }

    [Test]
    public async Task GetCatalogAsync_DefaultPaging_ReturnsProductsAndTotalCount()
    {
        var filter = new ProductCatalogFilter
        {
            Take = 20,
            Skip = 0
        };

        var result = await _productService.GetCatalogAsync(filter);

        Assert.That(result, Is.Not.Null);
        Assert.That(result.TotalCount, Is.GreaterThan(0));
        var list = result.Products.ToList();
        Assert.That(list.Count, Is.GreaterThan(0));
        Assert.That(list.Count, Is.LessThanOrEqualTo(20));

        foreach (var p in list)
        {
            Assert.That(p.Id, Is.Not.EqualTo(Guid.Empty));
            Assert.That(p.MasterProductId, Is.EqualTo(p.Id));
            Assert.That(p.Title, Is.Not.Null);
            Assert.That(p.ListingCount, Is.GreaterThanOrEqualTo(0));
            Assert.That(p.MediaCount, Is.GreaterThanOrEqualTo(0));
            Assert.That(p.CreatedAt, Is.GreaterThan(DateTime.MinValue));

            if (p.MediaCount > 0)
            {
                Assert.That(p.Media, Is.Not.Null);
                Assert.That(p.Media.Count, Is.GreaterThan(0));
                var primary = p.Media.First();
                Assert.That(primary.StoragePath, Is.Not.Null.And.Not.Empty);
            }
        }
    }

    [Test]
    public async Task GetCatalogAsync_Pagination_ReturnsDisjointPages()
    {
        var page1 = await _productService.GetCatalogAsync(new ProductCatalogFilter { Take = 5, Skip = 0 });
        var page2 = await _productService.GetCatalogAsync(new ProductCatalogFilter { Take = 5, Skip = 5 });

        Assert.That(page1.TotalCount, Is.EqualTo(page2.TotalCount));
        Assert.That(page1.Products.Count(), Is.EqualTo(5));
        Assert.That(page2.Products.Count(), Is.EqualTo(5));

        var ids1 = page1.Products.Select(p => p.Id).ToHashSet();
        var ids2 = page2.Products.Select(p => p.Id).ToHashSet();

        Assert.That(ids1.Overlaps(ids2), Is.False, "Page 1 and Page 2 should not share any product IDs");
    }

    [Test]
    public async Task GetCatalogAsync_StatusFilter_FiltersActiveAndArchived()
    {
        var active = await _productService.GetCatalogAsync(new ProductCatalogFilter { Status = "active", Take = 10 });
        var all = await _productService.GetCatalogAsync(new ProductCatalogFilter { Status = "all", Take = 10 });

        Assert.That(active, Is.Not.Null);
        Assert.That(all, Is.Not.Null);
        Assert.That(all.TotalCount, Is.GreaterThanOrEqualTo(active.TotalCount));
    }

    [Test]
    public async Task GetCatalogAsync_IsStarred_FilterWorks()
    {
        var starred = await _productService.GetCatalogAsync(new ProductCatalogFilter { IsStarred = true, Take = 10 });
        Assert.That(starred, Is.Not.Null);

        foreach (var p in starred.Products)
        {
            Assert.That(p.IsStarred, Is.True);
        }

        var unstarred = await _productService.GetCatalogAsync(new ProductCatalogFilter { IsStarred = false, Take = 10 });
        Assert.That(unstarred, Is.Not.Null);

        foreach (var p in unstarred.Products)
        {
            Assert.That(p.IsStarred, Is.False);
        }
    }

    [Test]
    public async Task GetCatalogAsync_SortByPrice_SortsCorrectly()
    {
        var lowResult = await _productService.GetCatalogAsync(new ProductCatalogFilter { SortBy = "price_low", Take = 10 });
        var lowList = lowResult.Products.Where(p => p.VendorPrice > 0).ToList();

        for (int i = 0; i < lowList.Count - 1; i++)
        {
            Assert.That(lowList[i].VendorPrice, Is.LessThanOrEqualTo(lowList[i + 1].VendorPrice));
        }

        var highResult = await _productService.GetCatalogAsync(new ProductCatalogFilter { SortBy = "price_high", Take = 10 });
        var highList = highResult.Products.Where(p => p.VendorPrice > 0).ToList();

        for (int i = 0; i < highList.Count - 1; i++)
        {
            Assert.That(highList[i].VendorPrice, Is.GreaterThanOrEqualTo(highList[i + 1].VendorPrice));
        }
    }

    [Test]
    public async Task GetCatalogAsync_SortByMedia_SortsCorrectly()
    {
        var mediaHigh = await _productService.GetCatalogAsync(new ProductCatalogFilter { SortBy = "most_media", Take = 10 });
        var list = mediaHigh.Products.ToList();

        for (int i = 0; i < list.Count - 1; i++)
        {
            Assert.That(list[i].MediaCount, Is.GreaterThanOrEqualTo(list[i + 1].MediaCount));
        }
    }

    [Test]
    public async Task GetCatalogAsync_PriceRange_FilterWorks()
    {
        var min = 500;
        var max = 3000;

        var result = await _productService.GetCatalogAsync(new ProductCatalogFilter
        {
            MinPrice = min,
            MaxPrice = max,
            Take = 20
        });

        Assert.That(result, Is.Not.Null);
        foreach (var p in result.Products)
        {
            Assert.That(p.VendorPrice, Is.GreaterThanOrEqualTo(min));
            Assert.That(p.VendorPrice, Is.LessThanOrEqualTo(max));
        }
    }

    [Test]
    public async Task GetCatalogAsync_SearchQuery_MatchesExistingProduct()
    {
        // First get an active product code
        var firstPage = await _productService.GetCatalogAsync(new ProductCatalogFilter { Take = 1 });
        var sampleProduct = firstPage.Products.FirstOrDefault();
        Assert.That(sampleProduct, Is.Not.Null);
        Assert.That(sampleProduct!.ProductCode, Is.Not.Null.And.Not.Empty);

        var searchResult = await _productService.GetCatalogAsync(new ProductCatalogFilter
        {
            Query = sampleProduct.ProductCode,
            Take = 5
        });

        Assert.That(searchResult.TotalCount, Is.GreaterThan(0));
        Assert.That(searchResult.Products.Any(p => p.Id == sampleProduct.Id), Is.True);
    }
}

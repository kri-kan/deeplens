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
public class ProductFacetFilteringTests
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
        var storage = new Mock<DeepLens.Infrastructure.Services.IStorageService>().Object;
        var shareRepo = new Mock<DeepLens.Application.Abstractions.Repositories.IProductShareLogRepository>().Object;
        var prodRepo = new Mock<DeepLens.Application.Abstractions.Repositories.IProductRepository>().Object;
        var ai = new Mock<DeepLens.Application.Abstractions.Services.IAiService>().Object;

        _productService = new ProductService(config, logger, storage, shareRepo, prodRepo, ai);
    }

    [Test]
    public async Task GetFilterOptionsAsync_Returns_Populated_MultiDimensional_Facets()
    {
        var options = await _productService.GetFilterOptionsAsync();

        Assert.That(options, Is.Not.Null);
        Assert.That(options.Fabrics, Is.Not.Null.And.Not.Empty, "Fabrics should be populated");
        Assert.That(options.Crafts, Is.Not.Null.And.Not.Empty, "Crafts should be populated from taxonomy_facets");
        Assert.That(options.Motifs, Is.Not.Null.And.Not.Empty, "Motifs should be populated from taxonomy_facets");
        Assert.That(options.Borders, Is.Not.Null.And.Not.Empty, "Borders should be populated from taxonomy_facets");
        Assert.That(options.StitchTypes, Is.Not.Null.And.Not.Empty, "StitchTypes should be populated from taxonomy_facets");
        Assert.That(options.Occasions, Is.Not.Null.And.Not.Empty, "Occasions should be populated from taxonomy_facets");
        Assert.That(options.BlouseTypes, Is.Not.Null.And.Not.Empty, "BlouseTypes should be populated from taxonomy_facets");
        Assert.That(options.Vendors, Is.Not.Null.And.Not.Empty, "Vendors should be populated");
        Assert.That(options.MaxPrice, Is.GreaterThan(options.MinPrice), "MaxPrice should be greater than MinPrice");
    }

    [Test]
    public async Task GetCatalogAsync_With_Facet_Filters_Executes_Successfully()
    {
        // Test filtering by Occasions and Crafts
        var filter = new ProductCatalogFilter
        {
            Take = 5,
            Skip = 0,
            Occasions = new[] { "Festive Celebrations" },
            Crafts = new[] { "Digital High-Definition Print", "Jacquard Weaving" },
            Borders = new[] { "Jacquard Rich Pallu", "Woven Zari Border" },
            StitchTypes = new[] { "Unstitched" },
            BlouseTypes = new[] { "Unstitched Running Blouse" }
        };

        var result = await _productService.GetCatalogAsync(filter);

        Assert.That(result, Is.Not.Null);
        Assert.That(result.TotalCount, Is.GreaterThanOrEqualTo(0));
        Assert.That(result.Products, Is.Not.Null);
    }
}

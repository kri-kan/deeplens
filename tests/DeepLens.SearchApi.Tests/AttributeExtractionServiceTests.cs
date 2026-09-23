using DeepLens.SearchApi.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;

namespace DeepLens.SearchApi.Tests;

[TestFixture]
public class AttributeExtractionServiceTests
{
    private LlmAttributeExtractionService _service = null!;

    [SetUp]
    public void SetUp()
    {
        var mockLogger = new Mock<ILogger<LlmAttributeExtractionService>>();
        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Services:ReasoningApiUrl"]).Returns("http://localhost:8002");
        var httpClient = new HttpClient();

        _service = new LlmAttributeExtractionService(mockLogger.Object, httpClient, mockConfig.Object);
    }

    [Test]
    public void CreateFallbackMetadata_WithSareeDescription_ExtractsRelevantKeywordsAndTitle()
    {
        var descriptions = new List<string>
        {
            "Pure Kanchi Pattu saree in navy blue with heavy gold zari border. Price 4500.",
            "Bridal silk saree with rich pallu design #kanchipattu #weddingcollection"
        };

        var result = _service.CreateFallbackMetadata(descriptions);

        Assert.That(result, Is.Not.Null);
        Assert.That(string.IsNullOrWhiteSpace(result.Title), Is.False);
        Assert.That(result.Keywords.Contains("kanchi", StringComparison.OrdinalIgnoreCase), Is.True);
        Assert.That(result.Keywords.Contains("pattu", StringComparison.OrdinalIgnoreCase), Is.True);
        Assert.That(result.Keywords.Contains("saree", StringComparison.OrdinalIgnoreCase), Is.True);
        Assert.That(result.Keywords.Contains("silk", StringComparison.OrdinalIgnoreCase), Is.True);
        Assert.That(result.Keywords.Contains("zari", StringComparison.OrdinalIgnoreCase), Is.True);
    }

    [Test]
    public void CreateFallbackMetadata_WithLehengaDescription_ExtractsLehengaKeywordsAndTitle()
    {
        var descriptions = new List<string>
        {
            "Designer bridal lehenga with heavy embroidery and sequins work #bridalwear"
        };

        var result = _service.CreateFallbackMetadata(descriptions);

        Assert.That(result, Is.Not.Null);
        Assert.That(result.Keywords.Contains("lehenga", StringComparison.OrdinalIgnoreCase), Is.True);
        Assert.That(result.Keywords.Contains("embroidery", StringComparison.OrdinalIgnoreCase), Is.True);
        Assert.That(result.Keywords.Contains("sequins", StringComparison.OrdinalIgnoreCase), Is.True);
        Assert.That(result.Keywords.Contains("bridal", StringComparison.OrdinalIgnoreCase), Is.True);
    }

    [Test]
    public void CreateFallbackMetadata_WithPriceOnlyOrEmptyDescriptions_FallsBackCleanlyWithoutThrowing()
    {
        var descriptions = new List<string>
        {
            "1199/-\nFree shipping\nCod available",
            "DM for orders #viral #reels"
        };

        var result = _service.CreateFallbackMetadata(descriptions);

        Assert.That(result, Is.Not.Null);
        Assert.That(string.IsNullOrWhiteSpace(result.Title), Is.False);
        Assert.That(string.IsNullOrWhiteSpace(result.Keywords), Is.False);
        Assert.That(result.Keywords.Contains("ethnic wear", StringComparison.OrdinalIgnoreCase), Is.True);
    }

    [Test]
    public void CreateFallbackMetadata_FiltersOutPromotionalHashtags()
    {
        var descriptions = new List<string>
        {
            "Beautiful ethnic collection #vayyari #explore #trending #georgettesaree #dmfororders"
        };

        var result = _service.CreateFallbackMetadata(descriptions);

        Assert.That(result, Is.Not.Null);
        Assert.That(result.Keywords.Contains("georgette", StringComparison.OrdinalIgnoreCase), Is.True);
        Assert.That(result.Keywords.Contains("vayyari", StringComparison.OrdinalIgnoreCase), Is.False);
        Assert.That(result.Keywords.Contains("trending", StringComparison.OrdinalIgnoreCase), Is.False);
    }
}

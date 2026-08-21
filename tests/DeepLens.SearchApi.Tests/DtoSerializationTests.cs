using System.Text.Json;
using NUnit.Framework;
using DeepLens.Contracts.Catalog;

namespace DeepLens.SearchApi.Tests;

[TestFixture]
public class DtoSerializationTests
{
    private readonly JsonSerializerOptions _camelCaseOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    [Test]
    public void ProductCorrectionDto_Serializes_To_CamelCase_Property_Names()
    {
        var dto = new ProductCorrectionDto
        {
            CategoryName = "Sarees",
            Fabric = "Silk",
            Price = 2999.99m,
            UseForTraining = true
        };

        var json = JsonSerializer.Serialize(dto, _camelCaseOptions);

        Assert.That(json, Contains.Substring("\"categoryName\":"));
        Assert.That(json, Contains.Substring("\"fabric\":"));
        Assert.That(json, Contains.Substring("\"price\":"));
        Assert.That(json, Contains.Substring("\"useForTraining\":"));
        Assert.That(json, Does.Not.Contain("\"CategoryName\":"));
    }
}

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

    [Test]
    public void ProductCatalogFilter_SerializesAndDeserializes_MultiDimensionalFacetProperties()
    {
        var filter = new ProductCatalogFilter
        {
            Fabrics = new[] { "Silk", "Cotton" },
            Crafts = new[] { "Bandhani & Tie-Dye", "Ajrakh Block Print" },
            Motifs = new[] { "Paisley / Kalka", "Floral Jaal & Bel" },
            Borders = new[] { "Jacquard Rich Pallu", "Woven Zari Border" },
            StitchTypes = new[] { "Unstitched", "Semi-Stitched" },
            Occasions = new[] { "Festive Celebrations", "Wedding & Bridal Trousseau" },
            BlouseTypes = new[] { "Unstitched Running Blouse", "Contrast Blouse" }
        };

        var json = JsonSerializer.Serialize(filter, _camelCaseOptions);

        Assert.That(json, Contains.Substring("\"fabrics\":"));
        Assert.That(json, Contains.Substring("\"crafts\":"));
        Assert.That(json, Contains.Substring("\"motifs\":"));
        Assert.That(json, Contains.Substring("\"borders\":"));
        Assert.That(json, Contains.Substring("\"stitchTypes\":"));
        Assert.That(json, Contains.Substring("\"occasions\":"));
        Assert.That(json, Contains.Substring("\"blouseTypes\":"));

        var deserialized = JsonSerializer.Deserialize<ProductCatalogFilter>(json, _camelCaseOptions);
        Assert.That(deserialized, Is.Not.Null);
        Assert.That(deserialized!.Crafts, Is.EquivalentTo(filter.Crafts));
        Assert.That(deserialized.Motifs, Is.EquivalentTo(filter.Motifs));
        Assert.That(deserialized.Borders, Is.EquivalentTo(filter.Borders));
        Assert.That(deserialized.StitchTypes, Is.EquivalentTo(filter.StitchTypes));
        Assert.That(deserialized.Occasions, Is.EquivalentTo(filter.Occasions));
        Assert.That(deserialized.BlouseTypes, Is.EquivalentTo(filter.BlouseTypes));
    }

    [Test]
    public void ProductFilterOptions_SerializesAndDeserializes_MultiDimensionalFacetOptions()
    {
        var options = new ProductFilterOptions
        {
            Fabrics = new List<string> { "Silk", "Chiffon" },
            Crafts = new List<string> { "Jacquard Weaving", "Kalamkari Art" },
            Motifs = new List<string> { "Temple / Gopuram", "Peacock / Mayil" },
            Borders = new List<string> { "Temple Border", "Cutwork Scallop Border" },
            StitchTypes = new List<string> { "Unstitched", "Pre-Stitched" },
            Occasions = new List<string> { "Party & Cocktail Wear", "Festive Celebrations" },
            BlouseTypes = new List<string> { "Unstitched Running Blouse", "Embroidered / Khatli Blouse" },
            Vendors = new List<string> { "Vendor A" },
            MinPrice = 500,
            MaxPrice = 15000
        };

        var json = JsonSerializer.Serialize(options, _camelCaseOptions);

        Assert.That(json, Contains.Substring("\"crafts\":"));
        Assert.That(json, Contains.Substring("\"motifs\":"));
        Assert.That(json, Contains.Substring("\"borders\":"));
        Assert.That(json, Contains.Substring("\"stitchTypes\":"));
        Assert.That(json, Contains.Substring("\"occasions\":"));
        Assert.That(json, Contains.Substring("\"blouseTypes\":"));

        var deserialized = JsonSerializer.Deserialize<ProductFilterOptions>(json, _camelCaseOptions);
        Assert.That(deserialized, Is.Not.Null);
        Assert.That(deserialized!.Crafts, Is.EquivalentTo(options.Crafts));
        Assert.That(deserialized.Motifs, Is.EquivalentTo(options.Motifs));
        Assert.That(deserialized.Borders, Is.EquivalentTo(options.Borders));
        Assert.That(deserialized.StitchTypes, Is.EquivalentTo(options.StitchTypes));
        Assert.That(deserialized.Occasions, Is.EquivalentTo(options.Occasions));
        Assert.That(deserialized.BlouseTypes, Is.EquivalentTo(options.BlouseTypes));
        Assert.That(deserialized.MinPrice, Is.EqualTo(500));
        Assert.That(deserialized.MaxPrice, Is.EqualTo(15000));
    }
}

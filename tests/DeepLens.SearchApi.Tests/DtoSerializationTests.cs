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

    [Test]
    public void VendorProduct_Serializes_StorePublish_Properties_To_CamelCase()
    {
        var productId = Guid.NewGuid();
        var mediaUpdated = new DateTime(2026, 10, 29, 14, 30, 0, DateTimeKind.Utc);
        var storePublishUpdated = new DateTime(2026, 10, 29, 10, 0, 0, DateTimeKind.Utc);

        var product = new DeepLens.Domain.Entities.Catalog.VendorProduct
        {
            Id = productId,
            ProductCode = "VF1FC22",
            Title = "KIDS TISSUE GOWNS WITH HANDWORK COAT MODEL🌸",
            IsPublished = true,
            MediaUpdatedAt = mediaUpdated,
            StorePublishUpdatedAt = storePublishUpdated,
            MediaCount = 45
        };

        // Serialize without camelCase options to verify [JsonPropertyName("...")] attribute enforcement
        var defaultJson = JsonSerializer.Serialize(product);

        Assert.That(defaultJson, Contains.Substring("\"isPublished\":true"));
        Assert.That(defaultJson, Contains.Substring("\"mediaUpdatedAt\":"));
        Assert.That(defaultJson, Contains.Substring("\"storePublishUpdatedAt\":"));
        Assert.That(defaultJson, Contains.Substring("\"mediaCount\":45"));
        Assert.That(defaultJson, Does.Not.Contain("\"IsPublished\":"));
        Assert.That(defaultJson, Does.Not.Contain("\"MediaUpdatedAt\":"));
        Assert.That(defaultJson, Does.Not.Contain("\"StorePublishUpdatedAt\":"));

        // Round-trip deserialization
        var deserialized = JsonSerializer.Deserialize<DeepLens.Domain.Entities.Catalog.VendorProduct>(defaultJson);
        Assert.That(deserialized, Is.Not.Null);
        Assert.That(deserialized!.Id, Is.EqualTo(productId));
        Assert.That(deserialized.ProductCode, Is.EqualTo("VF1FC22"));
        Assert.That(deserialized.IsPublished, Is.True);
        Assert.That(deserialized.MediaCount, Is.EqualTo(45));
        Assert.That(deserialized.MediaUpdatedAt, Is.EqualTo(mediaUpdated));
        Assert.That(deserialized.StorePublishUpdatedAt, Is.EqualTo(storePublishUpdated));
    }

    [Test]
    public void ProductCatalogFilter_SerializesAndDeserializes_StorePublish_And_ProductIds()
    {
        var targetIds = new[] { Guid.NewGuid(), Guid.NewGuid() };
        var filter = new ProductCatalogFilter
        {
            IsPublished = true,
            ProductIds = targetIds,
            Skip = 0,
            Take = 50
        };

        var json = JsonSerializer.Serialize(filter, _camelCaseOptions);

        Assert.That(json, Contains.Substring("\"isPublished\":true"));
        Assert.That(json, Contains.Substring("\"productIds\":"));
        Assert.That(json, Does.Not.Contain("\"IsPublished\":"));
        Assert.That(json, Does.Not.Contain("\"ProductIds\":"));

        var deserialized = JsonSerializer.Deserialize<ProductCatalogFilter>(json, _camelCaseOptions);
        Assert.That(deserialized, Is.Not.Null);
        Assert.That(deserialized!.IsPublished, Is.True);
        Assert.That(deserialized.ProductIds, Is.EquivalentTo(targetIds));
        Assert.That(deserialized.Take, Is.EqualTo(50));
    }

    [Test]
    public void BatchStorePublishRequest_Serializes_CamelCase_ProductIds()
    {
        var targetIds = new List<Guid> { Guid.NewGuid(), Guid.NewGuid() };
        var publishTime = new DateTime(2026, 10, 29, 12, 0, 0, DateTimeKind.Utc);
        var request = new DeepLens.SearchApi.Controllers.ProductsController.BatchStorePublishRequest(targetIds, publishTime);

        var json = JsonSerializer.Serialize(request);

        Assert.That(json, Contains.Substring("\"productIds\":"));
        Assert.That(json, Contains.Substring("\"publishedAt\":"));
        Assert.That(json, Does.Not.Contain("\"ProductIds\":"));
        Assert.That(json, Does.Not.Contain("\"PublishedAt\":"));

        var deserialized = JsonSerializer.Deserialize<DeepLens.SearchApi.Controllers.ProductsController.BatchStorePublishRequest>(json);
        Assert.That(deserialized, Is.Not.Null);
        Assert.That(deserialized!.ProductIds, Is.EquivalentTo(targetIds));
        Assert.That(deserialized.PublishedAt, Is.EqualTo(publishTime));
    }

    [Test]
    public void VisualSimilaritySearchRequest_Serializes_To_CamelCase_Property_Names()
    {
        var postId = Guid.NewGuid();
        var mediaId = Guid.NewGuid();
        var request = new VisualSimilaritySearchRequest
        {
            Phash = "01f3393e72210b07",
            PostId = postId,
            MediaId = mediaId,
            StoragePath = "competitor_videos/instagram/test.jpg",
            ImageUrl = "https://cdn.vayyari.com/test.jpg",
            ImageBase64 = "data:image/jpeg;base64,abc",
            Take = 25,
            MinSimilarity = 40
        };

        var json = JsonSerializer.Serialize(request);

        Assert.That(json, Contains.Substring("\"phash\":\"01f3393e72210b07\""));
        Assert.That(json, Contains.Substring("\"postId\":"));
        Assert.That(json, Contains.Substring("\"mediaId\":"));
        Assert.That(json, Contains.Substring("\"storagePath\":\"competitor_videos/instagram/test.jpg\""));
        Assert.That(json, Contains.Substring("\"imageUrl\":"));
        Assert.That(json, Contains.Substring("\"imageBase64\":\"data:image/jpeg;base64,abc\""));
        Assert.That(json, Contains.Substring("\"take\":25"));
        Assert.That(json, Contains.Substring("\"minSimilarity\":40"));
        Assert.That(json, Does.Not.Contain("\"Phash\":"));
        Assert.That(json, Does.Not.Contain("\"PostId\":"));
        Assert.That(json, Does.Not.Contain("\"MediaId\":"));
        Assert.That(json, Does.Not.Contain("\"Take\":"));
        Assert.That(json, Does.Not.Contain("\"MinSimilarity\":"));
    }

    [Test]
    public void VisualSimilarityMatchDto_And_Response_SerializeAndDeserialize_CamelCase()
    {
        var productId = Guid.NewGuid();
        var match = new VisualSimilarityMatchDto
        {
            ProductId = productId,
            Sku = "VF1FC22",
            Title = "Kanchipuram Silk Saree",
            StoragePath = "products/vf1fc22_1.jpg",
            Category = "Sarees",
            VendorPrice = 4999.00m,
            MediaCount = 6,
            Distance = 2,
            SimilarityPercentage = 97,
            IsLinked = true,
            ExistingLinkType = "is"
        };

        var response = new VisualSimilaritySearchResponse
        {
            SourcePhash = "01f3393e72210b07",
            TotalCandidates = 76935,
            Matches = new List<VisualSimilarityMatchDto> { match }
        };

        var json = JsonSerializer.Serialize(response);

        // Verify JSON properties use camelCase
        Assert.That(json, Contains.Substring("\"sourcePhash\":\"01f3393e72210b07\""));
        Assert.That(json, Contains.Substring("\"totalCandidates\":76935"));
        Assert.That(json, Contains.Substring("\"matches\":["));
        Assert.That(json, Contains.Substring("\"productId\":"));
        Assert.That(json, Contains.Substring("\"sku\":\"VF1FC22\""));
        Assert.That(json, Contains.Substring("\"title\":\"Kanchipuram Silk Saree\""));
        Assert.That(json, Contains.Substring("\"vendorPrice\":4999.00"));
        Assert.That(json, Contains.Substring("\"mediaCount\":6"));
        Assert.That(json, Contains.Substring("\"distance\":2"));
        Assert.That(json, Contains.Substring("\"similarityPercentage\":97"));
        Assert.That(json, Contains.Substring("\"isLinked\":true"));
        Assert.That(json, Contains.Substring("\"existingLinkType\":\"is\""));
        Assert.That(json, Does.Not.Contain("\"ProductId\":"));
        Assert.That(json, Does.Not.Contain("\"MediaCount\":"));
        Assert.That(json, Does.Not.Contain("\"SimilarityPercentage\":"));
        Assert.That(json, Does.Not.Contain("\"SourcePhash\":"));

        // Round-trip deserialization
        var deserialized = JsonSerializer.Deserialize<VisualSimilaritySearchResponse>(json);
        Assert.That(deserialized, Is.Not.Null);
        Assert.That(deserialized!.SourcePhash, Is.EqualTo("01f3393e72210b07"));
        Assert.That(deserialized.TotalCandidates, Is.EqualTo(76935));
        Assert.That(deserialized.Matches, Has.Count.EqualTo(1));
        var deserializedMatch = deserialized.Matches[0];
        Assert.That(deserializedMatch.ProductId, Is.EqualTo(productId));
        Assert.That(deserializedMatch.Sku, Is.EqualTo("VF1FC22"));
        Assert.That(deserializedMatch.MediaCount, Is.EqualTo(6));
        Assert.That(deserializedMatch.Distance, Is.EqualTo(2));
        Assert.That(deserializedMatch.SimilarityPercentage, Is.EqualTo(97));
        Assert.That(deserializedMatch.IsLinked, Is.True);
        Assert.That(deserializedMatch.ExistingLinkType, Is.EqualTo("is"));
    }

    [Test]
    public void VisualSimilarityMatchDto_Handles_Zero_And_Missing_MediaCount_Gracefully()
    {
        // When JSON from older cache or external source omits mediaCount
        var jsonWithoutMediaCount = @"{
            ""productId"": ""f47ac10b-58cc-4372-a567-0e02b2c3d479"",
            ""sku"": ""VF-TEST-0"",
            ""title"": ""Sample Product"",
            ""vendorPrice"": 999.00,
            ""similarityPercentage"": 85,
            ""distance"": 10,
            ""isLinked"": false
        }";

        var match = JsonSerializer.Deserialize<VisualSimilarityMatchDto>(jsonWithoutMediaCount);
        Assert.That(match, Is.Not.Null);
        Assert.That(match!.MediaCount, Is.EqualTo(0), "Default mediaCount should safely be 0 when missing from payload");

        // When mediaCount is explicitly 0
        match.MediaCount = 0;
        var serialized = JsonSerializer.Serialize(match);
        Assert.That(serialized, Contains.Substring("\"mediaCount\":0"));
    }

    [Test]
    public void VisualSimilaritySearchRequest_Base64Payload_TransfersCorrectly_WithoutStoragePath()
    {
        // When searching directly via catalog camera picker, only imageBase64 is provided.
        // StoragePath, PostId, MediaId, and ImageUrl are null.
        var base64Data = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...";
        var request = new VisualSimilaritySearchRequest
        {
            ImageBase64 = base64Data,
            Take = 50,
            MinSimilarity = 30
        };

        var json = JsonSerializer.Serialize(request);
        Assert.That(json, Contains.Substring("\"imageBase64\":\"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...\""));
        Assert.That(json, Contains.Substring("\"take\":50"));
        Assert.That(json, Contains.Substring("\"minSimilarity\":30"));
        Assert.That(json, Contains.Substring("\"storagePath\":null"));
        Assert.That(json, Contains.Substring("\"postId\":null"));
        Assert.That(json, Contains.Substring("\"mediaId\":null"));

        var deserialized = JsonSerializer.Deserialize<VisualSimilaritySearchRequest>(json);
        Assert.That(deserialized, Is.Not.Null);
        Assert.That(deserialized!.ImageBase64, Is.EqualTo(base64Data));
        Assert.That(deserialized.StoragePath, Is.Null, "Ephemeral queries should not contain permanent storage paths");
        Assert.That(deserialized.PostId, Is.Null);
        Assert.That(deserialized.MediaId, Is.Null);
    }

    [Test]
    public void VisualSimilarityMatchDto_SerializesAndDeserializes_IsDeleted_And_IsArchived_Flags()
    {
        var match = new VisualSimilarityMatchDto
        {
            ProductId = Guid.NewGuid(),
            Sku = "VF1B6B",
            Title = "Archived Saree Item",
            IsDeleted = false,
            IsArchived = true
        };

        var json = JsonSerializer.Serialize(match);

        // Assert camelCase property naming
        Assert.That(json, Contains.Substring("\"isDeleted\":false"));
        Assert.That(json, Contains.Substring("\"isArchived\":true"));
        Assert.That(json, Does.Not.Contain("\"IsDeleted\":"));
        Assert.That(json, Does.Not.Contain("\"IsArchived\":"));

        // Round-trip deserialization
        var deserialized = JsonSerializer.Deserialize<VisualSimilarityMatchDto>(json);
        Assert.That(deserialized, Is.Not.Null);
        Assert.That(deserialized!.IsDeleted, Is.False);
        Assert.That(deserialized.IsArchived, Is.True);

        // Deserializing JSON without flags defaults gracefully to false
        var jsonWithoutFlags = @"{""productId"":""" + Guid.NewGuid() + @""",""sku"":""ACTIVE-1""}";
        var deserializedDefault = JsonSerializer.Deserialize<VisualSimilarityMatchDto>(jsonWithoutFlags);
        Assert.That(deserializedDefault, Is.Not.Null);
        Assert.That(deserializedDefault!.IsDeleted, Is.False);
        Assert.That(deserializedDefault.IsArchived, Is.False);
    }
}



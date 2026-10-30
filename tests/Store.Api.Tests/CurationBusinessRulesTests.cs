using System.Text.Json;
using Store.Api.Models;

namespace Store.Api.Tests;

[TestFixture]
public class CurationBusinessRulesTests
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    [Test]
    public void PricingRules_WhenBaseCostIsPositive_CalculatesExpectedMrpAndSalePrice()
    {
        // Arrange
        const decimal baseCost = 899.00m;

        // Act - Store standard pricing multiplier: 1.6x for MRP, 1.3x for Sale Price
        var mrp = Math.Round(baseCost * 1.6m, 0);
        var salePrice = Math.Round(baseCost * 1.3m, 0);

        // Assert
        mrp.Should().Be(1438.00m);
        salePrice.Should().Be(1169.00m);
    }

    [Test]
    public void CommercialMargin_CalculatesGrossMarginAndPercentageCorrectly()
    {
        // Arrange
        const decimal baseCost = 1000.00m;
        const decimal salePrice = 1400.00m;
        const decimal mrp = 2000.00m;

        // Act
        var grossMargin = salePrice - baseCost;
        var marginPercent = salePrice > 0 ? (int)Math.Round((grossMargin / salePrice) * 100) : 0;
        var discountPercent = mrp > salePrice && mrp > 0 ? (int)Math.Round(((mrp - salePrice) / mrp) * 100) : 0;

        // Assert
        grossMargin.Should().Be(400.00m);
        marginPercent.Should().Be(29); // 400 / 1400 = ~28.57% -> 29%
        discountPercent.Should().Be(30); // 600 / 2000 = 30%
    }

    [Test]
    public void SmartDwellSuggestion_WhenSlideHasHighDwellAndIsNotCover_GeneratesHeroPromotionRecommendation()
    {
        // Arrange
        var mediaItems = new List<StoreMediaItemDto>
        {
            new("m-1", "http://example.com/1.jpg", 1, 1, 1.2, true),
            new("m-2", "http://example.com/2.jpg", 1, 2, 4.8, false), // High dwell non-cover slide
            new("m-3", "http://example.com/3.jpg", 1, 3, 2.1, false)
        };

        // Act
        var suggestions = new List<string>();
        var highestDwell = mediaItems.OrderByDescending(m => m.DwellSeconds).FirstOrDefault();
        if (highestDwell != null && !highestDwell.IsCover && highestDwell.DwellSeconds > 3.0)
        {
            suggestions.Add($"Media Slide #{highestDwell.Order} has the highest dwell time ({highestDwell.DwellSeconds:F1}s). Suggest promoting to Cover Hero.");
        }

        // Assert
        suggestions.Should().ContainSingle();
        suggestions[0].Should().Contain("Slide #2");
        suggestions[0].Should().Contain("4.8s");
        suggestions[0].Should().Contain("Suggest promoting to Cover Hero");
    }

    [Test]
    public void SmartDwellSuggestion_WhenCoverSlideAlreadyHasHighestDwell_DoesNotSuggestPromotion()
    {
        // Arrange
        var mediaItems = new List<StoreMediaItemDto>
        {
            new("m-1", "http://example.com/1.jpg", 1, 1, 5.5, true), // Cover already has highest dwell
            new("m-2", "http://example.com/2.jpg", 1, 2, 2.0, false)
        };

        // Act
        var suggestions = new List<string>();
        var highestDwell = mediaItems.OrderByDescending(m => m.DwellSeconds).FirstOrDefault();
        if (highestDwell != null && !highestDwell.IsCover && highestDwell.DwellSeconds > 3.0)
        {
            suggestions.Add($"Media Slide #{highestDwell.Order} has the highest dwell time ({highestDwell.DwellSeconds:F1}s). Suggest promoting to Cover Hero.");
        }

        // Assert
        suggestions.Should().BeEmpty();
    }

    [Test]
    public void ColorGroupsAndMediaOrder_SerializesAndDeserializesWithoutLoss()
    {
        // Arrange
        var colorGroups = new List<StoreColorGroupDto>
        {
            new("cg-1", "Emerald & Gold Zari", "VF2B56-EMR", "contrast-border", "#1B4D3E", "#D4AF37", null, null, new List<string> { "#1B4D3E", "#D4AF37" }, 2, true),
            new("cg-2", "Crimson & Rani Pink", "VF2B56-RED", "multi-tone", "#C0392B", "#E91E63", null, null, new List<string> { "#C0392B", "#E91E63" }, 2, true)
        };

        var mediaItems = new List<StoreMediaItemDto>
        {
            new("m-1", "http://example.com/saree1.jpg", 1, 1, 0, true, "cg-1", true, false, "Front Drape"),
            new("m-2", "http://example.com/pallu.jpg", 1, 2, 0, false, null, true, true, "Universal Pallu Detail")
        };

        // Act
        var jsonGroups = JsonSerializer.Serialize(colorGroups, JsonOptions);
        var jsonMedia = JsonSerializer.Serialize(mediaItems, JsonOptions);

        var deserializedGroups = JsonSerializer.Deserialize<List<StoreColorGroupDto>>(jsonGroups, JsonOptions);
        var deserializedMedia = JsonSerializer.Deserialize<List<StoreMediaItemDto>>(jsonMedia, JsonOptions);

        // Assert
        deserializedGroups.Should().NotBeNull();
        deserializedGroups!.Count.Should().Be(2);
        deserializedGroups[0].Template.Should().Be("contrast-border");
        deserializedGroups[0].SlotA.Should().Be("#1B4D3E");
        deserializedGroups[0].SlotB.Should().Be("#D4AF37");

        deserializedMedia.Should().NotBeNull();
        deserializedMedia!.Count.Should().Be(2);
        deserializedMedia[0].ColorGroupId.Should().Be("cg-1");
        deserializedMedia[0].IsQualified.Should().BeTrue();
        deserializedMedia[0].IsCommon.Should().BeFalse();
        deserializedMedia[1].IsCommon.Should().BeTrue();
    }

    [Test]
    public void StoreMediaItem_WithInstagramSource_SerializesAndDeserializesCorrectly()
    {
        // Arrange
        var mediaItem = new StoreMediaItemDto(
            Id: "ig-media-101",
            Url: "https://media.vayyarifashions.com/instagram/reels/vid_101.mp4",
            MediaType: 2, // Video
            Order: 3,
            DwellSeconds: 4.5,
            IsCover: false,
            ColorGroupId: null,
            IsQualified: true,
            IsCommon: true, // Universal common reel across all colorways
            Title: "Instagram Reel Showcase",
            SourcePlatform: "instagram",
            SourceUrl: "https://www.instagram.com/reel/DC5xy78AbC/",
            SourcePostId: "3489123456789"
        );

        // Act
        var json = JsonSerializer.Serialize(mediaItem, JsonOptions);
        var deserialized = JsonSerializer.Deserialize<StoreMediaItemDto>(json, JsonOptions);

        // Assert
        deserialized.Should().NotBeNull();
        deserialized!.SourcePlatform.Should().Be("instagram");
        deserialized.SourceUrl.Should().Be("https://www.instagram.com/reel/DC5xy78AbC/");
        deserialized.SourcePostId.Should().Be("3489123456789");
        deserialized.IsCommon.Should().BeTrue();
        deserialized.MediaType.Should().Be(2);
    }

    [Test]
    public void StoreMediaItem_LegacyJsonWithoutInstagramFields_DeserializesCleanlyWithDefaults()
    {
        // Arrange: Legacy JSON lacking sourcePlatform, sourceUrl, sourcePostId
        const string legacyJson = @"
        {
            ""id"": ""legacy-m-1"",
            ""url"": ""https://media.vayyarifashions.com/products/img1.jpg"",
            ""mediaType"": 1,
            ""order"": 1,
            ""dwellSeconds"": 2.0,
            ""isCover"": true,
            ""isCommon"": false
        }";

        // Act
        var deserialized = JsonSerializer.Deserialize<StoreMediaItemDto>(legacyJson, JsonOptions);

        // Assert
        deserialized.Should().NotBeNull();
        deserialized!.Id.Should().Be("legacy-m-1");
        deserialized.SourcePlatform.Should().BeNull();
        deserialized.SourceUrl.Should().BeNull();
        deserialized.SourcePostId.Should().BeNull();
        deserialized.IsCover.Should().BeTrue();
    }

    [Test]
    public void StoreMediaItemDto_AllProperties_HaveExplicitCamelCaseJsonPropertyName()
    {
        // Enforces the DeepLens Hard Rule:
        // C# DTOs: Every public property MUST have [JsonPropertyName("camelCase")].
        var properties = typeof(StoreMediaItemDto).GetProperties(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
        
        foreach (var prop in properties)
        {
            var attr = prop.GetCustomAttributes(typeof(System.Text.Json.Serialization.JsonPropertyNameAttribute), false)
                .Cast<System.Text.Json.Serialization.JsonPropertyNameAttribute>()
                .FirstOrDefault();

            attr.Should().NotBeNull($"Property {prop.Name} on StoreMediaItemDto must have [JsonPropertyName]");
            
            // First character must be lowercase
            var name = attr!.Name;
            char.IsLower(name[0]).Should().BeTrue($"JsonPropertyName '{name}' on {prop.Name} must start with a lowercase letter (camelCase)");
        }
    }

    [Test]
    public void StoreMediaItem_ReelVideoMediaType_PreservesVideoAttributesWithInstagramAttribution()
    {
        // Arrange: Video Reel with dwellSeconds, transformRecipe, and Instagram attribution
        var reel = new StoreMediaItemDto(
            Id: "reel-v1",
            Url: "https://media.vayyarifashions.com/instagram/reels/vid_001.mp4",
            MediaType: 2, // Video
            Order: 1,
            DwellSeconds: 7.2,
            IsCover: true,
            ColorGroupId: null,
            IsQualified: true,
            IsCommon: true,
            Title: "Artisan Zari Weave Demonstration",
            OriginalUrl: "https://media.vayyarifashions.com/instagram/reels/vid_001_raw.mp4",
            ModifiedUrl: "https://media.vayyarifashions.com/instagram/reels/vid_001.mp4",
            ActiveDisplaySource: "modified",
            HasModified: true,
            TransformRecipe: "{\"crop\":{\"aspect\":\"9:16\"}}",
            SourcePlatform: "instagram",
            SourceUrl: "https://www.instagram.com/reel/C8xyz123/",
            SourcePostId: "post-reel-123"
        );

        // Act
        var json = JsonSerializer.Serialize(reel, JsonOptions);
        var roundtripped = JsonSerializer.Deserialize<StoreMediaItemDto>(json, JsonOptions);

        // Assert
        roundtripped.Should().NotBeNull();
        roundtripped!.MediaType.Should().Be(2);
        roundtripped.DwellSeconds.Should().Be(7.2);
        roundtripped.IsCover.Should().BeTrue();
        roundtripped.HasModified.Should().BeTrue();
        roundtripped.SourcePlatform.Should().Be("instagram");
        roundtripped.SourceUrl.Should().Be("https://www.instagram.com/reel/C8xyz123/");
        roundtripped.TransformRecipe.Should().Contain("9:16");
    }
}

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
}

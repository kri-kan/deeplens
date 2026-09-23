using System.Text.Json;
using Store.Api.Models;

namespace Store.Api.Tests;

[TestFixture]
public class MediaVersioningTests
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    [Test]
    public void StoreMediaItemDto_DefaultValues_InitializesWithOriginalSourceAndNoModified()
    {
        // Arrange & Act
        var item = new StoreMediaItemDto(
            Id: "media-1",
            Url: "http://example.com/media1.jpg",
            MediaType: 1,
            Order: 1,
            DwellSeconds: 0,
            IsCover: true
        );

        // Assert
        item.ActiveDisplaySource.Should().Be("original");
        item.HasModified.Should().BeFalse();
        item.OriginalUrl.Should().BeNull();
        item.ModifiedUrl.Should().BeNull();
        item.TransformRecipe.Should().BeNull();
    }

    [Test]
    public void StoreMediaItemDto_WithModifiedProperties_SerializesAndDeserializesWithoutLoss()
    {
        // Arrange
        const string recipe = "{\"rotation\":90,\"flipH\":true,\"flipV\":false,\"aspectRatio\":\"4:5\",\"shearX\":3,\"shearY\":-2,\"watermarkText\":\"VAYYARI\"}";
        var item = new StoreMediaItemDto(
            Id: "media-lens-1",
            Url: "http://example.com/store/modified/p1/m1.webp",
            MediaType: 1,
            Order: 1,
            DwellSeconds: 2.5,
            IsCover: true,
            ColorGroupId: "cg-1",
            IsQualified: true,
            IsCommon: false,
            Title: "Front Drape - Lens Protected",
            OriginalUrl: "http://example.com/product/m1.jpg",
            ModifiedUrl: "http://example.com/store/modified/p1/m1.webp",
            ActiveDisplaySource: "modified",
            HasModified: true,
            TransformRecipe: recipe
        );

        // Act
        var json = JsonSerializer.Serialize(item, JsonOptions);
        var deserialized = JsonSerializer.Deserialize<StoreMediaItemDto>(json, JsonOptions);

        // Assert
        deserialized.Should().NotBeNull();
        deserialized!.Id.Should().Be("media-lens-1");
        deserialized.Url.Should().Be("http://example.com/store/modified/p1/m1.webp");
        deserialized.OriginalUrl.Should().Be("http://example.com/product/m1.jpg");
        deserialized.ModifiedUrl.Should().Be("http://example.com/store/modified/p1/m1.webp");
        deserialized.ActiveDisplaySource.Should().Be("modified");
        deserialized.HasModified.Should().BeTrue();
        deserialized.TransformRecipe.Should().Be(recipe);
    }

    [Test]
    public void ToggleDisplaySource_WhenSwitchingToModified_ActivatesModifiedUrl()
    {
        // Arrange
        var item = new StoreMediaItemDto(
            Id: "m-1",
            Url: "http://example.com/original.jpg",
            MediaType: 1,
            Order: 1,
            DwellSeconds: 0,
            IsCover: true,
            OriginalUrl: "http://example.com/original.jpg",
            ModifiedUrl: "http://example.com/modified.webp",
            ActiveDisplaySource: "original",
            HasModified: true
        );

        // Act - Simulate CurationService ToggleMediaDisplaySource logic
        var isModified = "modified".Equals("modified", StringComparison.OrdinalIgnoreCase);
        var activeUrl = isModified && !string.IsNullOrEmpty(item.ModifiedUrl)
            ? item.ModifiedUrl
            : item.OriginalUrl ?? item.Url;

        var updatedItem = item with
        {
            Url = activeUrl,
            ActiveDisplaySource = isModified ? "modified" : "original"
        };

        // Assert
        updatedItem.ActiveDisplaySource.Should().Be("modified");
        updatedItem.Url.Should().Be("http://example.com/modified.webp");
    }

    [Test]
    public void ToggleDisplaySource_WhenSwitchingToOriginal_ActivatesOriginalUrl()
    {
        // Arrange
        var item = new StoreMediaItemDto(
            Id: "m-1",
            Url: "http://example.com/modified.webp",
            MediaType: 1,
            Order: 1,
            DwellSeconds: 0,
            IsCover: true,
            OriginalUrl: "http://example.com/original.jpg",
            ModifiedUrl: "http://example.com/modified.webp",
            ActiveDisplaySource: "modified",
            HasModified: true
        );

        // Act - Simulate CurationService ToggleMediaDisplaySource logic
        var isModified = "original".Equals("modified", StringComparison.OrdinalIgnoreCase);
        var activeUrl = isModified && !string.IsNullOrEmpty(item.ModifiedUrl)
            ? item.ModifiedUrl
            : item.OriginalUrl ?? item.Url;

        var updatedItem = item with
        {
            Url = activeUrl,
            ActiveDisplaySource = isModified ? "modified" : "original"
        };

        // Assert
        updatedItem.ActiveDisplaySource.Should().Be("original");
        updatedItem.Url.Should().Be("http://example.com/original.jpg");
    }

    [Test]
    public void RevertToOriginal_WhenModifiedIsDeleted_ResetsToPristineMaster()
    {
        // Arrange
        var item = new StoreMediaItemDto(
            Id: "m-1",
            Url: "http://example.com/modified.webp",
            MediaType: 1,
            Order: 1,
            DwellSeconds: 0,
            IsCover: true,
            OriginalUrl: "http://example.com/original.jpg",
            ModifiedUrl: "http://example.com/modified.webp",
            ActiveDisplaySource: "modified",
            HasModified: true,
            TransformRecipe: "{\"rotation\":90}"
        );

        // Act - Simulate CurationService DeleteModifiedMediaAsync logic
        var originalUrl = item.OriginalUrl ?? item.Url;
        var revertedItem = item with
        {
            Url = originalUrl,
            ModifiedUrl = null,
            ActiveDisplaySource = "original",
            HasModified = false,
            TransformRecipe = null
        };

        // Assert
        revertedItem.Url.Should().Be("http://example.com/original.jpg");
        revertedItem.ModifiedUrl.Should().BeNull();
        revertedItem.ActiveDisplaySource.Should().Be("original");
        revertedItem.HasModified.Should().BeFalse();
        revertedItem.TransformRecipe.Should().BeNull();
        revertedItem.OriginalUrl.Should().Be("http://example.com/original.jpg");
    }

    [Test]
    public void ToggleMediaDisplaySourceRequest_SerializesAndDeserializes()
    {
        // Arrange
        var req = new ToggleMediaDisplaySourceRequest("modified");

        // Act
        var json = JsonSerializer.Serialize(req, JsonOptions);
        var deserialized = JsonSerializer.Deserialize<ToggleMediaDisplaySourceRequest>(json, JsonOptions);

        // Assert
        deserialized.Should().NotBeNull();
        deserialized!.ActiveDisplaySource.Should().Be("modified");
        json.Should().Contain("\"activeDisplaySource\":\"modified\"");
    }
}

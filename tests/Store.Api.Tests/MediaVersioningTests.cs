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

    [Test]
    public void MediaUrlResolution_ConstructsReachablePublicUrl_WithoutLegacyDomainOrRawInternalHost()
    {
        // Arrange
        const string publicBaseUrl = "http://adminapi.vayyarifashions.com/store-assets";
        const string storageKey = "products/vf2b58/1_03ecc5fe.jpg";

        // Act
        var resolvedPublicUrl = $"{publicBaseUrl.TrimEnd('/')}/{storageKey}";

        // Assert
        resolvedPublicUrl.Should().StartWith("http://adminapi.vayyarifashions.com/store-assets/");
        resolvedPublicUrl.Should().NotContain("media.vayyarifashions.com", "media subdomain is not a valid DNS hostname");
        resolvedPublicUrl.Should().NotContain("minio:9000", "internal container hostnames must never be returned to mobile clients");
        resolvedPublicUrl.Should().NotContain("127.0.0.1:9000", "loopback addresses cannot be reached from mobile devices");
    }

    [Test]
    public void StoreProductDto_WithAdminApiMediaUrls_PreservesPublicGatewayRouting()
    {
        // Arrange
        var mediaItems = new List<StoreMediaItemDto>
        {
            new(
                Id: "media-valid-1",
                Url: "http://adminapi.vayyarifashions.com/store-assets/products/vf2b58/1_03ecc5fe.jpg",
                MediaType: 1,
                Order: 1,
                DwellSeconds: 0,
                IsCover: true,
                OriginalUrl: "http://adminapi.vayyarifashions.com/store-assets/products/vf2b58/1_03ecc5fe.jpg"
            )
        };

        // Act
        var json = JsonSerializer.Serialize(mediaItems, JsonOptions);

        // Assert
        json.Should().Contain("http://adminapi.vayyarifashions.com/store-assets");
        json.Should().NotContain("media.vayyarifashions.com");
    }
}

// ──────────────────────────────────────────────────────────────
// PruneOrphanedMedia contract tests (pure logic, no I/O)
// ──────────────────────────────────────────────────────────────
[TestFixture]
public class MediaPruneLogicTests
{
    private record AssetRow(Guid Id, string PublicUrl, Guid? ParentAssetId);

    /// <summary>
    /// Simulates the core loop from PruneOrphanedMediaAsync to verify set-difference logic.
    /// </summary>
    private static (IReadOnlyList<AssetRow> Orphaned, IReadOnlyList<AssetRow> Surviving)
        RunPruneLogic(IEnumerable<AssetRow> rows, ISet<string> survivingPublicUrls)
    {
        var rowList = rows.ToList();

        var orphanedIds = new HashSet<Guid>();
        foreach (var row in rowList.Where(r => !survivingPublicUrls.Contains(r.PublicUrl)))
            orphanedIds.Add(row.Id);

        // Pull in modified derivatives whose parent is orphaned
        foreach (var row in rowList)
        {
            if (row.ParentAssetId.HasValue && orphanedIds.Contains(row.ParentAssetId.Value))
                orphanedIds.Add(row.Id);
        }

        var orphaned  = rowList.Where(r => orphanedIds.Contains(r.Id)).ToList();
        var surviving = rowList.Where(r => !orphanedIds.Contains(r.Id)).ToList();
        return (orphaned, surviving);
    }

    [Test]
    public void PruneLogic_NoUrlsRemoved_ReturnsEmptyOrphanSet()
    {
        var url1 = "http://store/products/vf1fc22/1_aaa.jpg";
        var url2 = "http://store/products/vf1fc22/2_bbb.jpg";
        var rows = new[]
        {
            new AssetRow(Guid.NewGuid(), url1, null),
            new AssetRow(Guid.NewGuid(), url2, null),
        };

        var (orphaned, surviving) = RunPruneLogic(rows, new HashSet<string> { url1, url2 });

        orphaned.Should().BeEmpty();
        surviving.Should().HaveCount(2);
    }

    [Test]
    public void PruneLogic_SomeUrlsRemoved_CorrectlyIdentifiesOrphans()
    {
        var keepUrl   = "http://store/products/vf1fc22/1_aaa.jpg";
        var removeUrl = "http://store/products/vf1fc22/2_bbb.jpg";
        var keepId    = Guid.NewGuid();
        var removeId  = Guid.NewGuid();
        var rows = new[]
        {
            new AssetRow(keepId,   keepUrl,   null),
            new AssetRow(removeId, removeUrl, null),
        };

        var (orphaned, surviving) = RunPruneLogic(rows, new HashSet<string> { keepUrl });

        orphaned.Should().ContainSingle(r => r.Id == removeId);
        surviving.Should().ContainSingle(r => r.Id == keepId);
    }

    [Test]
    public void PruneLogic_ModifiedDerivativeOfOrphanedOriginal_IsAlsoPruned()
    {
        var originalUrl  = "http://store/products/vf1fc22/1_aaa.jpg";
        var modifiedUrl  = "http://store/store/modified/abc/1_modified.webp";
        var originalId   = Guid.NewGuid();
        var modifiedId   = Guid.NewGuid();

        var rows = new[]
        {
            new AssetRow(originalId, originalUrl, null),
            new AssetRow(modifiedId, modifiedUrl, originalId),  // modified derivative
        };

        // survivingPublicUrls is empty — original is removed from catalog
        var (orphaned, surviving) = RunPruneLogic(rows, new HashSet<string>());

        orphaned.Should().HaveCount(2, "both original and its modified derivative should be pruned");
        orphaned.Select(r => r.Id).Should().Contain(new[] { originalId, modifiedId });
        surviving.Should().BeEmpty();
    }

    [Test]
    public void PruneLogic_VF1FC22Scenario_77To45MediaReduction_Prunes32Orphans()
    {
        // Simulate 77 original rows from first publish; new publish sends only 45 URLs
        const int previousCount = 77;
        const int newCount      = 45;
        const int expectedPruned = previousCount - newCount;  // 32

        var allRows   = Enumerable.Range(1, previousCount)
            .Select(i => new AssetRow(Guid.NewGuid(), $"http://store/products/vf1fc22/{i}_hash.jpg", null))
            .ToList();

        // Surviving: first 45 URLs
        var survivingUrls = allRows.Take(newCount).Select(r => r.PublicUrl).ToHashSet();

        var (orphaned, surviving) = RunPruneLogic(allRows, survivingUrls);

        orphaned.Should().HaveCount(expectedPruned);
        surviving.Should().HaveCount(newCount);
    }

    [Test]
    public void PruneLogic_AllUrlsSurviving_IsNoOp()
    {
        var rows = Enumerable.Range(1, 10)
            .Select(i => new AssetRow(Guid.NewGuid(), $"http://store/products/abc/{i}.jpg", null))
            .ToList();

        var survivingUrls = rows.Select(r => r.PublicUrl).ToHashSet();
        var (orphaned, _) = RunPruneLogic(rows, survivingUrls);

        orphaned.Should().BeEmpty("no-op when all URLs survive");
    }

    [Test]
    public void CatalogMediaIdReconciliation_PreservesSwatchGroupAndModifications_AcrossPublishes()
    {
        // Arrange - Media previously curated with a swatch and a crop/transform
        var mediaId1 = "0be57b43-d5fe-4608-8706-2477e4134079";
        var existingMedia = new List<StoreMediaItemDto>
        {
            new StoreMediaItemDto(
                Id: "m_1_abc",
                Url: "http://store/products/vf1fc22/1_abc.jpg",
                MediaType: 1,
                Order: 1,
                DwellSeconds: 4.5,
                IsCover: true,
                ColorGroupId: "cg-emerald",
                IsQualified: true,
                IsCommon: false,
                Title: "Front View",
                CatalogMediaId: mediaId1,
                OriginalUrl: "http://store/products/vf1fc22/1_abc.jpg",
                ModifiedUrl: "http://store/store/modified/abc/m1_mod.webp",
                ActiveDisplaySource: "modified",
                HasModified: true,
                TransformRecipe: "{\"crop\":{\"x\":10,\"y\":10}}"
            )
        };

        // Incoming update from catalog has new order (was #1, now #3 due to splits/merges), but same catalogMediaId
        var incomingItem = new PublishMediaItemDto(
            CatalogMediaId: mediaId1,
            Url: "http://catalog/media/0be57b43.jpg",
            MediaType: 1
        );

        // Act - Simulate reconciliation loop in CurationService
        var matched = existingMedia.FirstOrDefault(m =>
            (!string.IsNullOrEmpty(incomingItem.CatalogMediaId) && m.CatalogMediaId == incomingItem.CatalogMediaId) ||
            (!string.IsNullOrEmpty(incomingItem.Url) && (m.SourceUrl == incomingItem.Url || m.Url == incomingItem.Url))
        );

        matched.Should().NotBeNull();
        var reconciled = matched! with
        {
            Order = 3,
            IsCover = false,
            CatalogMediaId = incomingItem.CatalogMediaId,
            SourceUrl = incomingItem.Url
        };

        // Assert - Curation, swatch assignment, and modified image are 100% preserved
        reconciled.ColorGroupId.Should().Be("cg-emerald");
        reconciled.HasModified.Should().BeTrue();
        reconciled.ModifiedUrl.Should().Be("http://store/store/modified/abc/m1_mod.webp");
        reconciled.ActiveDisplaySource.Should().Be("modified");
        reconciled.TransformRecipe.Should().Be("{\"crop\":{\"x\":10,\"y\":10}}");
        reconciled.Order.Should().Be(3);
        reconciled.CatalogMediaId.Should().Be(mediaId1);
    }
}

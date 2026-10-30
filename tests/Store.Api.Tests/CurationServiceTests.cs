using Dapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using NUnit.Framework;
using FluentAssertions;
using Store.Api.Models;
using Store.Api.Services;

namespace Store.Api.Tests;

[TestFixture]
public class CurationServiceTests
{
    private readonly string _storeConnStr =
        Environment.GetEnvironmentVariable("STORE_DB_CONNECTION")
        ?? "Host=192.168.0.170;Port=5432;Database=deeplens_store;Username=postgres;Password=Krikank1$";

    private CurationService _curationService = null!;
    private readonly Guid _testParentId = Guid.Parse("00000000-0000-0000-0000-000000009999");
    private readonly Guid _testVariant1Id = Guid.Parse("00000000-0000-0000-0000-000000009901");
    private readonly Guid _testVariant2Id = Guid.Parse("00000000-0000-0000-0000-000000009902");

    [SetUp]
    public async Task Setup()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "ConnectionStrings:StoreDb", _storeConnStr }
        };

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var mediaStorage = new FakeMediaStorageService();
        var eventPublisher = new FakeStoreEventPublisher();
        var logger = NullLogger<CurationService>.Instance;

        _curationService = new CurationService(config, mediaStorage, eventPublisher, logger);

        // Seed test variants under the same parent
        await using var conn = new NpgsqlConnection(_storeConnStr);
        await conn.OpenAsync();

        await conn.ExecuteAsync(@"
            DELETE FROM product_waitlists WHERE product_id IN (@V1, @V2);
            DELETE FROM product_audits WHERE product_id IN (@V1, @V2);
            DELETE FROM products WHERE id IN (@V1, @V2);",
            new { V1 = _testVariant1Id, V2 = _testVariant2Id });

        const string insertSql = @"
            INSERT INTO products (
                id, vayyari_product_id, product_code, title, description, category_name, fabric,
                base_cost, mrp, sale_price, lifecycle_status, stock_quantity,
                colorway_name, color_hex, swatch_template, media_order, tags, is_published, published_at,
                parent_catalog_id, parent_product_code, created_at, updated_at
            ) VALUES (
                @Id, @Id, @ProductCode, @Title, @Description, 'Kanjeevaram', 'Silk',
                1000, 2000, 1500, @LifecycleStatus, @StockQuantity,
                @ColorwayName, @ColorHex, 'solid',
                @MediaOrder::jsonb, '[]'::jsonb, true, NOW(),
                @ParentCatalogId, 'VFX999', NOW(), NOW()
            );";

        var mediaOrder1 = "[{\"id\":\"m1\",\"url\":\"http://test.com/v1-hero.jpg\",\"mediaType\":1,\"order\":1,\"dwellSeconds\":0,\"isCover\":true}]";
        var mediaOrder2 = "[{\"id\":\"m2\",\"url\":\"http://test.com/v2-hero.jpg\",\"mediaType\":1,\"order\":1,\"dwellSeconds\":0,\"isCover\":true}]";

        await conn.ExecuteAsync(insertSql, new
        {
            Id = _testVariant1Id,
            ProductCode = "VFX99901",
            Title = "Test Saree - Royal Blue",
            Description = "Silk Saree in Blue",
            LifecycleStatus = "available",
            StockQuantity = 5,
            ColorwayName = "Royal Blue",
            ColorHex = "#0000FF",
            MediaOrder = mediaOrder1,
            ParentCatalogId = _testParentId
        });

        await conn.ExecuteAsync(insertSql, new
        {
            Id = _testVariant2Id,
            ProductCode = "VFX99902",
            Title = "Test Saree - Emerald Green",
            Description = "Silk Saree in Green",
            LifecycleStatus = "out_of_stock",
            StockQuantity = 0,
            ColorwayName = "Emerald Green",
            ColorHex = "#008000",
            MediaOrder = mediaOrder2,
            ParentCatalogId = _testParentId
        });
    }

    [TearDown]
    public async Task TearDown()
    {
        await using var conn = new NpgsqlConnection(_storeConnStr);
        await conn.OpenAsync();

        await conn.ExecuteAsync(@"
            DELETE FROM product_waitlists WHERE product_id IN (@V1, @V2);
            DELETE FROM product_audits WHERE product_id IN (@V1, @V2);
            DELETE FROM products WHERE id IN (@V1, @V2);",
            new { V1 = _testVariant1Id, V2 = _testVariant2Id });
    }

    [Test]
    public async Task GetProductByCodeAsync_WhenGivenLegacyUnsuffixedCode_ResolvesVariant01()
    {
        var dto = await _curationService.GetProductByCodeAsync("VFX999");
        dto.Should().NotBeNull();
        dto!.ProductCode.Should().Be("VFX99901");
        dto.Title.Should().Be("Test Saree - Royal Blue");
    }

    [Test]
    public async Task GetProductByCodeAsync_WhenGivenExactVariantCode_ResolvesDirectly()
    {
        var dto = await _curationService.GetProductByCodeAsync("VFX99902");
        dto.Should().NotBeNull();
        dto!.ProductCode.Should().Be("VFX99902");
        dto.LifecycleStatus.Should().Be("out_of_stock");
    }

    [Test]
    public async Task GetInStoreProductsAsync_AggregatesSiblingSwatches()
    {
        var products = await _curationService.GetInStoreProductsAsync(search: "VFX999");
        products.Should().NotBeEmpty();

        var variant1 = products.FirstOrDefault(p => p.ProductCode == "VFX99901");
        variant1.Should().NotBeNull();
        variant1!.SiblingSwatches.Should().NotBeNull();
        variant1.SiblingSwatches!.Count.Should().BeGreaterOrEqualTo(2);

        variant1.SiblingSwatches.Should().Contain(s => s.ProductCode == "VFX99901" && s.ColorHex == "#0000FF");
        variant1.SiblingSwatches.Should().Contain(s => s.ProductCode == "VFX99902" && s.ColorHex == "#008000");
    }

    [Test]
    public async Task UpdateLifecycleStatusAsync_ParentCascadeAndReactivation_PreservesVariantState()
    {
        // 1. Pause parent umbrella product with 48h timeout
        var pauseReq = new UpdateLifecycleRequest(
            ParentId: _testParentId,
            Status: "paused",
            TimeoutHours: 48
        );

        var pauseSuccess = await _curationService.UpdateLifecycleStatusAsync(pauseReq, "admin@vayyari.com");
        pauseSuccess.Should().BeTrue();

        // Verify both variants are paused and previous statuses recorded
        var v1Paused = await _curationService.GetProductByCodeAsync("VFX99901");
        v1Paused!.LifecycleStatus.Should().Be("paused");
        v1Paused.PreviousLifecycleStatus.Should().Be("available");
        v1Paused.TakeDownExpiresAt.Should().NotBeNull();

        var v2Paused = await _curationService.GetProductByCodeAsync("VFX99902");
        v2Paused!.LifecycleStatus.Should().Be("paused");
        v2Paused.PreviousLifecycleStatus.Should().Be("out_of_stock");

        // 2. Reactivate parent umbrella product
        var reactivateReq = new UpdateLifecycleRequest(
            ParentId: _testParentId,
            Status: "available"
        );

        var reactivateSuccess = await _curationService.UpdateLifecycleStatusAsync(reactivateReq, "admin@vayyari.com");
        reactivateSuccess.Should().BeTrue();

        // Verify state-preserving reactivation:
        // Variant 1 was available -> becomes available
        var v1Reactivated = await _curationService.GetProductByCodeAsync("VFX99901");
        v1Reactivated!.LifecycleStatus.Should().Be("available");
        v1Reactivated.TakeDownExpiresAt.Should().BeNull();

        // Variant 2 was out_of_stock -> remains out_of_stock!
        var v2Reactivated = await _curationService.GetProductByCodeAsync("VFX99902");
        v2Reactivated!.LifecycleStatus.Should().Be("out_of_stock");
        v2Reactivated.TakeDownExpiresAt.Should().BeNull();
    }

    [Test]
    public async Task JoinWaitlistAsync_InsertsWaitlistAndCountsDemand()
    {
        var customerId = Guid.NewGuid();
        var joined = await _curationService.JoinWaitlistAsync(_testVariant2Id, customerId);
        joined.Should().BeTrue();

        // Idempotent join
        var joinedAgain = await _curationService.JoinWaitlistAsync(_testVariant2Id, customerId);
        joinedAgain.Should().BeTrue();

        var dto = await _curationService.GetProductByCodeAsync("VFX99902");
        dto.Should().NotBeNull();
        dto!.WaitlistCount.Should().BeGreaterOrEqualTo(1);
    }

    [Test]
    public async Task GetReEvaluationQueueAsync_ReturnsExpiredPausedProducts()
    {
        // Set variant 1 to paused with expired timestamp
        await using (var conn = new NpgsqlConnection(_storeConnStr))
        {
            await conn.OpenAsync();
            await conn.ExecuteAsync(@"
                UPDATE products 
                SET lifecycle_status = 'paused', 
                    take_down_expires_at = NOW() - INTERVAL '1 hour',
                    is_re_evaluation_pending = true
                WHERE id = @Id;", new { Id = _testVariant1Id });
        }

        var queue = await _curationService.GetReEvaluationQueueAsync();
        queue.Should().Contain(p => p.Id == _testVariant1Id);

        // Reset back to available
        await _curationService.UpdateLifecycleStatusAsync(
            new UpdateLifecycleRequest(ProductId: _testVariant1Id, Status: "available"),
            "admin@vayyari.com");
    }

    [Test]
    public async Task BatchPublishProductsAsync_WhenProductAlreadyExists_UpdatesPublishedAtToNow()
    {
        // 1. Manually backdate published_at to 2 days ago
        await using (var conn = new NpgsqlConnection(_storeConnStr))
        {
            await conn.OpenAsync();
            await conn.ExecuteAsync(@"
                UPDATE products 
                SET published_at = NOW() - INTERVAL '2 days',
                    updated_at = NOW() - INTERVAL '2 days'
                WHERE id = @Id;", new { Id = _testVariant1Id });
        }

        // Verify it was backdated
        var preCheck = await _curationService.GetProductByCodeAsync("VFX99901");
        preCheck.Should().NotBeNull();
        preCheck!.PublishedAt.Should().BeBefore(DateTime.UtcNow.AddDays(-1));

        // 2. Publish updated product batch
        var publishRequests = new List<PublishProductRequest>
        {
            new(
                VayyariProductId: _testVariant1Id,
                ProductCode: "VFX99901",
                Title: "Test Saree - Royal Blue Updated",
                Description: "Updated Silk Saree",
                CategoryName: "Saree",
                Fabric: "Pure Silk",
                BaseCost: 1100,
                MediaUrls: new List<string> { "http://test.com/v1-updated.jpg" }
            )
        };

        var publishedCount = await _curationService.BatchPublishProductsAsync(publishRequests, "admin@vayyari.com");
        publishedCount.Should().Be(1);

        // 3. Verify published_at was updated to NOW() on conflict
        var postCheck = await _curationService.GetProductByCodeAsync("VFX99901");
        postCheck.Should().NotBeNull();
        postCheck!.PublishedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(10));
    }


    private class FakeMediaStorageService : IMediaStorageService
    {
        public Task<StoreMediaItemDto> IngestProductMediaAsync(Guid productId, string productCode, string sourceUrl, int order, bool isCover, string? catalogMediaId = null, CancellationToken ct = default)
            => Task.FromResult(new StoreMediaItemDto(catalogMediaId ?? Guid.NewGuid().ToString(), sourceUrl, 1, order, 0, isCover, CatalogMediaId: catalogMediaId, SourceUrl: sourceUrl));
        public Task<string> UploadModifiedMediaAsync(Guid productId, string mediaId, Stream imageStream, string mimeType, CancellationToken ct = default)
            => Task.FromResult($"http://fake-storage/{mediaId}.webp");
        public Task DeleteModifiedMediaAsync(string fileUrl, CancellationToken ct = default) => Task.CompletedTask;
        public Task EnsureBucketExistsAsync(CancellationToken ct = default) => Task.CompletedTask;
        public Task PruneOrphanedMediaAsync(Guid productId, ISet<string> survivingPublicUrls, CancellationToken ct = default) => Task.CompletedTask;
    }

    private class FakeStoreEventPublisher : IStoreEventPublisher
    {
        public List<(string Topic, string Key, object Payload)> PublishedEvents { get; } = new();
        public Task PublishAsync(string topic, string key, object payload, CancellationToken ct = default)
        {
            PublishedEvents.Add((topic, key, payload));
            return Task.CompletedTask;
        }
    }
}

using Dapper;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using NUnit.Framework;
using Store.Api.Models;
using Store.Api.Services;

namespace Store.Api.Tests;

[TestFixture]
public class StoreFuzzySearchTests
{
    private readonly string _storeConnStr =
        Environment.GetEnvironmentVariable("STORE_DB_CONNECTION")
        ?? "Host=192.168.0.170;Port=5432;Database=deeplens_store;Username=postgres;Password=Krikank1$";

    private CurationService _curationService = null!;
    private readonly Guid _publishedProductId = Guid.Parse("00000000-0000-0000-0000-000000008801");
    private readonly Guid _unpublishedProductId = Guid.Parse("00000000-0000-0000-0000-000000008802");

    [SetUp]
    public async Task Setup()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "ConnectionStrings:StoreDb", _storeConnStr }
            })
            .Build();

        var mediaStorage = new FakeMediaStorageService();
        var eventPublisher = new FakeStoreEventPublisher();
        var logger = NullLogger<CurationService>.Instance;

        _curationService = new CurationService(config, mediaStorage, eventPublisher, logger);

        await using var conn = new NpgsqlConnection(_storeConnStr);
        await conn.OpenAsync();

        // Clean up test data
        await conn.ExecuteAsync(@"
            DELETE FROM product_waitlists WHERE product_id IN (@P1, @P2);
            DELETE FROM product_audits WHERE product_id IN (@P1, @P2);
            DELETE FROM products WHERE id IN (@P1, @P2);",
            new { P1 = _publishedProductId, P2 = _unpublishedProductId });

        // Seed: 1 published product and 1 unpublished draft product with similar titles
        const string insertSql = @"
            INSERT INTO products (
                id, vayyari_product_id, product_code, title, description, category_name, fabric,
                base_cost, mrp, sale_price, lifecycle_status, stock_quantity,
                colorway_name, color_hex, swatch_template, media_order, tags, is_published, published_at,
                created_at, updated_at
            ) VALUES 
            (
                @P1, @P1, 'VAY-KANJ-8801', 'Magnificent Kanjivaram Bridal Silk Saree', 'Pure zari brocade', 'Sarees', 'Kanjivaram Silk',
                2000, 4000, 3200, 'available', 5,
                'Royal Crimson', '#800020', 'solid', '[]', '[]', true, NOW(),
                NOW(), NOW()
            ),
            (
                @P2, @P2, 'VAY-KANJ-8802', 'Magnificent Kanjivaram Draft Saree', 'Unpublished draft', 'Sarees', 'Kanjivaram Silk',
                2000, 4000, 3200, 'available', 0,
                'Emerald Green', '#005020', 'solid', '[]', '[]', false, NOW(),
                NOW(), NOW()
            );";

        await conn.ExecuteAsync(insertSql, new { P1 = _publishedProductId, P2 = _unpublishedProductId });
    }

    [TearDown]
    public async Task Teardown()
    {
        await using var conn = new NpgsqlConnection(_storeConnStr);
        await conn.OpenAsync();
        await conn.ExecuteAsync(@"
            DELETE FROM product_waitlists WHERE product_id IN (@P1, @P2);
            DELETE FROM product_audits WHERE product_id IN (@P1, @P2);
            DELETE FROM products WHERE id IN (@P1, @P2);",
            new { P1 = _publishedProductId, P2 = _unpublishedProductId });
    }

    [Test]
    public async Task Search_WithTypoQuery_FindsPublishedProductViaTrigramFuzzyMatch()
    {
        // Act: Search with common typo "kanjivarm" (missing 'a')
        var results = await _curationService.GetInStoreProductsAsync(search: "kanjivarm");

        // Assert: Should match published product
        results.Should().NotBeEmpty();
        results.Should().Contain(p => p.Id == _publishedProductId);
        results.First(p => p.Id == _publishedProductId).Title.Should().Contain("Kanjivaram");
    }

    [Test]
    public async Task Search_ByFabricTypo_MatchesProduct()
    {
        // Act: Search by fabric typo "silk" or "kanjivaram"
        var results = await _curationService.GetInStoreProductsAsync(search: "Kanjivarm");

        // Assert
        results.Should().Contain(p => p.Id == _publishedProductId);
    }

    [Test]
    public async Task Search_MustNeverReturnUnpublishedProducts_EvenWithExactMatch()
    {
        // Act: Search for exact word present in unpublished product title ("Draft")
        var results = await _curationService.GetInStoreProductsAsync(search: "Draft");

        // Assert: Unpublished product MUST NOT appear in customer store search
        results.Should().NotContain(p => p.Id == _unpublishedProductId);
    }

    [Test]
    public async Task Database_PartialGinIndex_ExistsWithPublishedPredicate()
    {
        await using var conn = new NpgsqlConnection(_storeConnStr);
        await conn.OpenAsync();

        // Verify index definition in pg_indexes
        var indexDef = await conn.QueryFirstOrDefaultAsync<string>(@"
            SELECT indexdef 
            FROM pg_indexes 
            WHERE tablename = 'products' AND indexname = 'idx_store_products_active_fuzzy';");

        indexDef.Should().NotBeNull("Partial GIN index 'idx_store_products_active_fuzzy' must exist");
        indexDef.Should().Contain("USING gin");
        indexDef.Should().Contain("WHERE (is_published = true)");
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
        public Task PublishAsync(string topic, string key, object payload, CancellationToken ct = default) => Task.CompletedTask;
    }
}

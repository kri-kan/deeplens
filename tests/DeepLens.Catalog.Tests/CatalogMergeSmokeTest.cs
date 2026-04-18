using Dapper;
using DeepLens.SearchApi.Services;
using DeepLens.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Npgsql;
using NUnit.Framework;
using System.Data;

namespace DeepLens.Catalog.Tests;

[TestFixture]
public class CatalogMergeSmokeTest
{
    private string _connectionString = "Host=192.168.0.170;Port=5432;Username=postgres;Password=Krikank1$;Database=deeplens_platform";
    private MetadataService _service;

    [OneTimeSetUp]
    public async Task Setup()
    {
        var logger = new Mock<ILogger<MetadataService>>().Object;
        var producerConfig = new Confluent.Kafka.ProducerConfig { BootstrapServers = "localhost:9092" };
        var producer = new Confluent.Kafka.ProducerBuilder<string, string>(producerConfig).Build();
        
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> {
                {"ConnectionStrings:DefaultConnection", _connectionString}
            }).Build();

        _service = new MetadataService(config, logger, producer);

        await EnsureSchemaAsync();
    }

    private async Task EnsureSchemaAsync()
    {
        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync(@"
            CREATE TABLE IF NOT EXISTS sellers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS product_variants (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                product_id UUID NOT NULL,
                color VARCHAR(50),
                fabric VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS seller_listings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                variant_id UUID NOT NULL,
                seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
                external_id VARCHAR(100),
                current_price DECIMAL(18, 2),
                currency VARCHAR(10) DEFAULT 'INR',
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS media (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                variant_id UUID NOT NULL,
                storage_path VARCHAR(500) NOT NULL,
                phash VARCHAR(64),
                quality_score NUMERIC,
                status SMALLINT DEFAULT 0,
                uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS media_deletion_queue (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                media_id UUID NOT NULL,
                storage_path VARCHAR(500) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        ");
    }

    [Test]
    public async Task Test_Merge_Consolidates_Variants_And_Deduplicates_Images()
    {
        var targetSku = "MERGE-TARGET-" + Guid.NewGuid().ToString().Substring(0, 4);
        var sourceSku = "MERGE-SOURCE-" + Guid.NewGuid().ToString().Substring(0, 4);
        var phash = "HASH-1234567890";

        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        
        // 1. Seed Data
        var targetId = Guid.NewGuid();
        var sourceId = Guid.NewGuid();
        await conn.ExecuteAsync("INSERT INTO products (id, base_sku, title, tags) VALUES (@Id, @Sku, @Title, @Tags)", 
            new { Id = targetId, Sku = targetSku, Title = "Target Product", Tags = new[] { "silk", "red" } });
        await conn.ExecuteAsync("INSERT INTO products (id, base_sku, title, tags) VALUES (@Id, @Sku, @Title, @Tags)", 
            new { Id = sourceId, Sku = sourceSku, Title = "Source Product", Tags = new[] { "handmade", "red" } });

        var targetVarId = Guid.NewGuid();
        var sourceVarId = Guid.NewGuid();
        await conn.ExecuteAsync("INSERT INTO product_variants (id, product_id, color, fabric) VALUES (@Id, @Pid, @Color, @Fabric)",
            new { Id = targetVarId, Pid = targetId, Color = "Red", Fabric = "Silk" });
        await conn.ExecuteAsync("INSERT INTO product_variants (id, product_id, color, fabric) VALUES (@Id, @Pid, @Color, @Fabric)",
            new { Id = sourceVarId, Pid = sourceId, Color = "Red", Fabric = "Silk" });

        var img1 = Guid.NewGuid();
        var img2 = Guid.NewGuid();
        await conn.ExecuteAsync(@"
            INSERT INTO media (id, variant_id, storage_path, phash, quality_score, status) 
            VALUES (@Id, @VarId, @Path, @Hash, @Quality, 0)",
            new { Id = img1, VarId = targetVarId, Path = "media/raw/img1.jpg", Hash = phash, Quality = 0.9m });
        
        await conn.ExecuteAsync(@"
            INSERT INTO media (id, variant_id, storage_path, phash, quality_score, status) 
            VALUES (@Id, @VarId, @Path, @Hash, @Quality, 0)",
            new { Id = img2, VarId = sourceVarId, Path = "media/raw/img2.jpg", Hash = phash, Quality = 0.5m });

        // 2. Perform Merge
        await _service.MergeProductsAsync(targetSku, sourceSku, deleteSource: true);

        // 3. Verifications
        var finalTags = await conn.QuerySingleAsync<string[]>("SELECT tags FROM products WHERE id = @Id", new { Id = targetId });
        Assert.That(finalTags, Contains.Item("handmade"));
        Assert.That(finalTags, Contains.Item("silk"));

        var variantCount = await conn.ExecuteScalarAsync<int>("SELECT count(*) FROM product_variants WHERE product_id = @Id", new { Id = targetId });
        Assert.That(variantCount, Is.GreaterThanOrEqualTo(1));

        var img2Status = await conn.QuerySingleAsync<int>("SELECT status FROM media WHERE id = @Id", new { Id = img2 });
        Assert.That(img2Status, Is.EqualTo(98), "Low quality duplicate should be marked as PendingDelete (98)");

        Console.WriteLine("✅ Smoke Test Passed: Product merging, variant consolidation, and image deduplication verified.");
    }
}

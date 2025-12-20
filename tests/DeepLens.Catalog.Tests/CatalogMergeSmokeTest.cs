using Dapper;
using DeepLens.SearchApi.Services;
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
    private string _connectionString = "Host=localhost;Port=5433;Username=postgres;Password=DeepLens123!;Database=tenant_vayyari_metadata";
    private TenantMetadataService _service;
    private Guid _vayyariId = Guid.Parse("2abbd721-873e-4bf0-9cb2-c93c6894c584");

    [OneTimeSetUp]
    public async Task Setup()
    {
        var config = new ConfigurationBuilder().Build();
        var logger = new Mock<ILogger<TenantMetadataService>>().Object;
        
        var producerConfig = new Confluent.Kafka.ProducerConfig { BootstrapServers = "localhost:9092" };
        var producer = new Confluent.Kafka.ProducerBuilder<string, string>(producerConfig).Build();
        
        _service = new TenantMetadataService(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> {
                {"ConnectionStrings:DefaultConnection", "Host=localhost;Port=5433;Username=postgres;Password=DeepLens123!"}
            }).Build(), logger, producer);

        await EnsureSchemaAsync();
    }

    private async Task EnsureSchemaAsync()
    {
        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        // Dropping and recreating tables that are known to be problematic during schema transitions
        // in this local dev environment.
        await conn.ExecuteAsync(@"
            DROP TABLE IF EXISTS price_history CASCADE;
            DROP TABLE IF EXISTS image_deletion_queue CASCADE;
            DROP TABLE IF EXISTS seller_listings CASCADE;
            DROP TABLE IF EXISTS sellers CASCADE;

            CREATE TABLE sellers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                external_id VARCHAR(100) UNIQUE,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE seller_listings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                variant_id UUID NOT NULL,
                seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
                external_id VARCHAR(100),
                current_price DECIMAL(18, 2),
                currency VARCHAR(10) DEFAULT 'INR',
                is_favorite BOOLEAN DEFAULT FALSE,
                description TEXT,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE price_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                listing_id UUID REFERENCES seller_listings(id) ON DELETE CASCADE,
                price DECIMAL(18, 2) NOT NULL,
                currency VARCHAR(10) NOT NULL,
                effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE image_deletion_queue (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                image_id UUID NOT NULL,
                storage_path VARCHAR(500) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            -- Ensure core tables have latest columns
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='tags') THEN
                    ALTER TABLE products ADD COLUMN tags TEXT[];
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='unified_attributes') THEN
                    ALTER TABLE products ADD COLUMN unified_attributes JSONB;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='images' AND column_name='phash') THEN
                    ALTER TABLE images ADD COLUMN phash VARCHAR(64);
                    ALTER TABLE images ADD COLUMN quality_score NUMERIC;
                    ALTER TABLE images ADD COLUMN status SMALLINT DEFAULT 0;
                END IF;
            END $$;");
    }

    [Test]
    public async Task Test_Merge_Consolidates_Variants_And_Deduplicates_Images()
    {
        try 
        {
            // 1. Seed Data
        var targetSku = "MERGE-TARGET-" + Guid.NewGuid().ToString().Substring(0, 4);
        var sourceSku = "MERGE-SOURCE-" + Guid.NewGuid().ToString().Substring(0, 4);
        var phash = "HASH-1234567890";

        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        
        // Cleanup old test data
        await conn.ExecuteAsync("DELETE FROM products WHERE base_sku IN (@T, @S)", new { T = targetSku, S = sourceSku });

        // Create Products
        var targetId = Guid.NewGuid();
        var sourceId = Guid.NewGuid();
        await conn.ExecuteAsync("INSERT INTO products (id, base_sku, title, tags) VALUES (@Id, @Sku, @Title, @Tags)", 
            new { Id = targetId, Sku = targetSku, Title = "Target Product", Tags = new[] { "silk", "red" } });
        await conn.ExecuteAsync("INSERT INTO products (id, base_sku, title, tags) VALUES (@Id, @Sku, @Title, @Tags)", 
            new { Id = sourceId, Sku = sourceSku, Title = "Source Product", Tags = new[] { "handmade", "red" } });

        // Create Identical Variants
        var targetVarId = Guid.NewGuid();
        var sourceVarId = Guid.NewGuid();
        await conn.ExecuteAsync("INSERT INTO product_variants (id, product_id, color, fabric) VALUES (@Id, @Pid, @Color, @Fabric)",
            new { Id = targetVarId, Pid = targetId, Color = "Red", Fabric = "Silk" });
        await conn.ExecuteAsync("INSERT INTO product_variants (id, product_id, color, fabric) VALUES (@Id, @Pid, @Color, @Fabric)",
            new { Id = sourceVarId, Pid = sourceId, Color = "Red", Fabric = "Silk" });

        // Create Duplicate Images (different IDs, same PHash)
        var img1 = Guid.NewGuid();
        var img2 = Guid.NewGuid();
        await conn.ExecuteAsync(@"
            INSERT INTO images (id, variant_id, storage_path, phash, quality_score, status) 
            VALUES (@Id, @VarId, @Path, @Hash, @Quality, 0)",
            new { Id = img1, VarId = targetVarId, Path = "tenant-vayyari/raw/img1.jpg", Hash = phash, Quality = 0.9m });
        
        await conn.ExecuteAsync(@"
            INSERT INTO images (id, variant_id, storage_path, phash, quality_score, status) 
            VALUES (@Id, @VarId, @Path, @Hash, @Quality, 0)",
            new { Id = img2, VarId = sourceVarId, Path = "tenant-vayyari/raw/img2.jpg", Hash = phash, Quality = 0.5m });

        // 2. Perform Merge
        await _service.MergeProductsAsync(_vayyariId, targetSku, sourceSku, deleteSource: true);

        // 3. Verifications
        
        // A. Tags should be unioned: silk, red, handmade
        var finalTags = await conn.QuerySingleAsync<string[]>("SELECT tags FROM products WHERE id = @Id", new { Id = targetId });
        Assert.That(finalTags, Contains.Item("handmade"));
        Assert.That(finalTags, Contains.Item("silk"));
        Assert.That(finalTags.Length, Is.EqualTo(3));

        // B. Variants should be merged (Source variant deleted)
        var variantCount = await conn.ExecuteScalarAsync<int>("SELECT count(*) FROM product_variants WHERE product_id = @Id", new { Id = targetId });
        Assert.That(variantCount, Is.EqualTo(1));

        // C. Image Deduplication (img2 should be marked for deletion because quality 0.5 < 0.9)
        var img2Status = await conn.QuerySingleAsync<int>("SELECT status FROM images WHERE id = @Id", new { Id = img2 });
        Assert.That(img2Status, Is.EqualTo(98), "Low quality duplicate should be marked as PendingDelete (98)");

        // D. Deletion Queue
        var queueCount = await conn.ExecuteScalarAsync<int>("SELECT count(*) FROM image_deletion_queue WHERE image_id = @Id", new { Id = img2 });
        Assert.That(queueCount, Is.EqualTo(1), "Image should be in the deletion queue");

        Console.WriteLine("✅ Smoke Test Passed: Product merging, variant consolidation, and image deduplication verified.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ TEST FAILED: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
            throw;
        }
    }
}

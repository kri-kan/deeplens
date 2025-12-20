using Dapper;
using System.Text.Json;
using Npgsql;
using DeepLens.Contracts.Ingestion;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Data;

namespace DeepLens.SearchApi.Services;

public interface ITenantMetadataService
{
    Task SaveIngestionDataAsync(Guid tenantId, Guid imageId, string storagePath, string mimeType, long fileSize, UploadImageRequest request);
    Task MergeProductsAsync(Guid tenantId, string targetSku, string sourceSku, bool deleteSource);
    Task SetDefaultImageAsync(Guid tenantId, Guid imageId, bool isDefault);
}

public class TenantMetadataService : ITenantMetadataService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<TenantMetadataService> _logger;

    public TenantMetadataService(IConfiguration configuration, ILogger<TenantMetadataService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    private string GetTenantConnectionString(Guid tenantId)
    {
        var baseConnString = _configuration.GetConnectionString("DefaultConnection") 
            ?? "Host=localhost;Port=5433;Username=postgres;Password=DeepLens123!";
        
        var builder = new NpgsqlConnectionStringBuilder(baseConnString);
        
        // Use a hardcoded map for our known test tenants for now
        if (tenantId == Guid.Parse("2abbd721-873e-4bf0-9cb2-c93c6894c584")) // Actual Vayyari ID
        {
            builder.Database = "tenant_vayyari_metadata";
        }
        else
        {
            builder.Database = $"tenant_{tenantId:N}_metadata";
        }
        
        return builder.ConnectionString;
    }

    private IDbConnection GetConnection(Guid tenantId)
    {
        return new NpgsqlConnection(GetTenantConnectionString(tenantId));
    }

    public async Task SaveIngestionDataAsync(Guid tenantId, Guid imageId, string storagePath, string contentType, long fileSize, UploadImageRequest request)
    {
        using var connection = GetConnection(tenantId);
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            // 1. Get or Create Product (SKU)
            var productId = await GetOrCreateProduct(connection, request);

            // 2. Get or Create Variant (Sub-SKU/Color)
            var variantId = await GetOrCreateVariant(connection, productId, request);

            // 3. Save Image Record
            const string imageSql = @"
                INSERT INTO images (id, variant_id, storage_path, original_filename, file_size_bytes, mime_type, status)
                VALUES (@Id, @VariantId, @StoragePath, @OriginalFilename, @FileSize, @MimeType, 0)";
            
            await connection.ExecuteAsync(imageSql, new {
                Id = imageId,
                VariantId = variantId,
                StoragePath = storagePath,
                OriginalFilename = request.File.FileName,
                FileSize = fileSize,
                MimeType = contentType
            }, transaction);

            // 4. Save Seller Listing (The "Offer")
            const string listingSql = @"
                INSERT INTO seller_listings (variant_id, seller_id, external_id, price, currency, description)
                VALUES (@VariantId, @SellerId, @ExternalId, @Price, @Currency, @Description)";
            
            await connection.ExecuteAsync(listingSql, new {
                VariantId = variantId,
                SellerId = request.SellerId,
                ExternalId = request.ExternalId,
                Price = request.Price,
                Currency = request.Currency ?? "INR",
                Description = request.Description
            }, transaction);

            transaction.Commit();
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            _logger.LogError(ex, "Failed to save metadata for tenant {TenantId}", tenantId);
            throw;
        }
    }

    public async Task SetDefaultImageAsync(Guid tenantId, Guid imageId, bool isDefault)
    {
        using var db = GetConnection(tenantId);
        await db.ExecuteAsync("UPDATE images SET is_default = @IsDefault WHERE id = @Id", new { IsDefault = isDefault, Id = imageId });
    }

    public async Task MergeProductsAsync(Guid tenantId, string targetSku, string sourceSku, bool deleteSource)
    {
        using var db = GetConnection(tenantId);
        db.Open();
        using var trans = db.BeginTransaction();

        try
        {
            var targetId = await db.QuerySingleOrDefaultAsync<Guid?>("SELECT id FROM products WHERE base_sku = @Sku", new { Sku = targetSku }, trans);
            var sourceId = await db.QuerySingleOrDefaultAsync<Guid?>("SELECT id FROM products WHERE base_sku = @Sku", new { Sku = sourceSku }, trans);

            if (targetId == null || sourceId == null)
            {
                throw new InvalidOperationException("Both target and source SKUs must exist");
            }

            // 1. Re-parent variants from source to target
            await db.ExecuteAsync("UPDATE product_variants SET product_id = @TargetId WHERE product_id = @SourceId", 
                new { TargetId = targetId, SourceId = sourceId }, trans);

            // 2. Simple Deduplication of Images by PHash or StoragePath
            // We'll mark images that are duplicates within variants
            var duplicates = await db.QueryAsync<Guid>(@"
                WITH ImageQuality AS (
                    SELECT id, phash, quality_score, row_number() OVER(PARTITION BY phash ORDER BY quality_score DESC NULLS LAST, uploaded_at ASC) as rank
                    FROM images 
                    WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = @TargetId)
                    AND phash IS NOT NULL
                )
                SELECT id FROM ImageQuality WHERE rank > 1", new { TargetId = targetId }, trans);

            foreach (var duplicateId in duplicates)
            {
                // In a real system, we'd delete the file from MinIO too
                await db.ExecuteAsync("DELETE FROM images WHERE id = @Id", new { Id = duplicateId }, trans);
            }

            if (deleteSource)
            {
                await db.ExecuteAsync("DELETE FROM products WHERE id = @Id", new { Id = sourceId }, trans);
            }

            trans.Commit();
        }
        catch
        {
            trans.Rollback();
            throw;
        }
    }

    private async Task<Guid> GetOrCreateProduct(IDbConnection db, UploadImageRequest request)
    {
        if (!string.IsNullOrEmpty(request.Sku))
        {
            var existingId = await db.QuerySingleOrDefaultAsync<Guid?>(
                "SELECT id FROM products WHERE base_sku = @Sku", new { Sku = request.Sku });
            
            if (existingId.HasValue) return existingId.Value;
        }

        // Create new
        var productId = Guid.NewGuid();
        const string sql = @"
            INSERT INTO products (id, base_sku, title, tags)
            VALUES (@Id, @Sku, @Title, @Tags)
            RETURNING id";
        
        return await db.ExecuteScalarAsync<Guid>(sql, new {
            Id = productId,
            Sku = request.Sku ?? $"SKU-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}",
            Title = request.Description?.Substring(0, Math.Min(request.Description.Length, 100)) ?? "New Product",
            Tags = request.Tags?.ToArray()
        });
    }

    private async Task<Guid> GetOrCreateVariant(IDbConnection db, Guid productId, UploadImageRequest request)
    {
        if (!string.IsNullOrEmpty(request.Color) || !string.IsNullOrEmpty(request.Fabric))
        {
            var existingId = await db.QuerySingleOrDefaultAsync<Guid?>(@"
                SELECT id FROM product_variants 
                WHERE product_id = @ProductId 
                AND (color = @Color OR (@Color IS NULL AND color IS NULL))
                AND (fabric = @Fabric OR (@Fabric IS NULL AND fabric IS NULL))
                AND (stitch_type = @StitchType OR (@StitchType IS NULL AND stitch_type IS NULL))
                AND (work_heaviness = @WorkHeaviness OR (@WorkHeaviness IS NULL AND work_heaviness IS NULL))", 
                new { 
                    ProductId = productId, 
                    Color = request.Color,
                    Fabric = request.Fabric,
                    StitchType = request.StitchType,
                    WorkHeaviness = request.WorkHeaviness
                });
            
            if (existingId.HasValue) return existingId.Value;
        }

        var variantId = Guid.NewGuid();
        
        var keywords = new List<string>();
        if (!string.IsNullOrEmpty(request.Occasion)) keywords.Add(request.Occasion);
        if (request.Patterns != null) keywords.AddRange(request.Patterns);
        if (request.Tags != null) keywords.AddRange(request.Tags);

        var attributesJson = request.AdditionalMetadata != null ? JsonSerializer.Serialize(request.AdditionalMetadata) : null;

        const string sql = @"
            INSERT INTO product_variants (id, product_id, color, fabric, stitch_type, work_heaviness, search_keywords, attributes_json)
            VALUES (@Id, @ProductId, @Color, @Fabric, @StitchType, @WorkHeaviness, @SearchKeywords, @AttributesJson::jsonb)
            RETURNING id";
        
        return await db.ExecuteScalarAsync<Guid>(sql, new {
            Id = variantId,
            ProductId = productId,
            Color = request.Color,
            Fabric = request.Fabric,
            StitchType = request.StitchType,
            WorkHeaviness = request.WorkHeaviness,
            SearchKeywords = keywords.Distinct().ToArray(),
            AttributesJson = attributesJson
        });
    }
}

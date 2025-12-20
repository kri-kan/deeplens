using Dapper;
using System.Text.Json;
using Npgsql;
using DeepLens.Contracts.Ingestion;
using DeepLens.Contracts.Events;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Data;
using Confluent.Kafka;

namespace DeepLens.Infrastructure.Services;

public interface ITenantMetadataService
{
    Task SaveIngestionDataAsync(Guid tenantId, Guid imageId, string storagePath, string mimeType, long fileSize, UploadImageRequest request);
    Task MergeProductsAsync(Guid tenantId, string targetSku, string sourceSku, bool deleteSource);
    Task SetDefaultImageAsync(Guid tenantId, Guid imageId, bool isDefault);
    Task SetFavoriteListingAsync(Guid tenantId, Guid listingId, bool isFavorite);
    Task UpdateImageDimensionsAsync(Guid tenantId, Guid imageId, int width, int height);
    Task UpdateImageStatusAsync(Guid tenantId, Guid imageId, int status);
    Task<IEnumerable<ImageDto>> ListImagesAsync(Guid tenantId, int page, int pageSize);
    Task<DeepLens.Contracts.Tenants.ThumbnailConfigurationDto?> GetThumbnailSettingsAsync(Guid tenantId);
}

public class TenantMetadataService : ITenantMetadataService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<TenantMetadataService> _logger;
    private readonly IProducer<string, string>? _kafkaProducer;

    public TenantMetadataService(IConfiguration configuration, ILogger<TenantMetadataService> logger, IProducer<string, string>? kafkaProducer = null)
    {
        _configuration = configuration;
        _logger = logger;
        _kafkaProducer = kafkaProducer;
    }

    private string GetTenantConnectionString(Guid tenantId)
    {
        var baseConnString = _configuration.GetConnectionString("DefaultConnection") 
            ?? "Host=localhost;Port=5433;Username=postgres;Password=DeepLens123!";
        
        var builder = new NpgsqlConnectionStringBuilder(baseConnString);
        
        if (tenantId == Guid.Parse("2abbd721-873e-4bf0-9cb2-c93c6894c584")) // Vayyari ID
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
            // 1. Resolve Seller
            var sellerId = await GetOrCreateSeller(connection, request.SellerId, transaction);

            // 2. Get or Create Product (Master SKU)
            var productId = await GetOrCreateProduct(connection, request, transaction);

            // 3. Get or Create Variant (Sub-SKU)
            var variantId = await GetOrCreateVariant(connection, productId, request, transaction);

            // 4. Save Image Record
            const string imageSql = @"
                INSERT INTO images (id, variant_id, storage_path, original_filename, file_size_bytes, mime_type, phash, quality_score, status)
                VALUES (@Id, @VariantId, @StoragePath, @OriginalFilename, @FileSize, @MimeType, @PHash, @Quality, 0)";
            
            await connection.ExecuteAsync(imageSql, new {
                Id = imageId,
                VariantId = variantId,
                StoragePath = storagePath,
                OriginalFilename = request.File.FileName,
                FileSize = fileSize,
                MimeType = contentType,
                PHash = (string?)null, // To be filled by async pipeline
                Quality = (decimal?)null
            }, transaction);

            // 5. Save/Update Seller Listing & Price History
            await UpsertSellerListing(connection, variantId, sellerId, request, transaction);

            transaction.Commit();
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            _logger.LogError(ex, "Failed to save ingestion metadata for tenant {TenantId}", tenantId);
            throw;
        }
    }

    public async Task SetFavoriteListingAsync(Guid tenantId, Guid listingId, bool isFavorite)
    {
        using var db = GetConnection(tenantId);
        await db.ExecuteAsync("UPDATE seller_listings SET is_favorite = @IsFavorite WHERE id = @Id", new { IsFavorite = isFavorite, Id = listingId });
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
            var target = await db.QuerySingleOrDefaultAsync<(Guid Id, string[] Tags, string UnifiedAttributes)>(
                "SELECT id, tags, unified_attributes FROM products WHERE base_sku = @Sku", new { Sku = targetSku }, trans);
            
            var source = await db.QuerySingleOrDefaultAsync<(Guid Id, string[] Tags, string UnifiedAttributes)>(
                "SELECT id, tags, unified_attributes FROM products WHERE base_sku = @Sku", new { Sku = sourceSku }, trans);

            if (target.Id == default || source.Id == default)
                throw new InvalidOperationException("SKU not found");

            // 1. Unified Attributes (Union of tags)
            var consolidatedTags = (target.Tags ?? Array.Empty<string>())
                .Union(source.Tags ?? Array.Empty<string>())
                .Distinct()
                .ToArray();

            await db.ExecuteAsync("UPDATE products SET tags = @Tags WHERE id = @Id", 
                new { Tags = consolidatedTags, Id = target.Id }, trans);

            // 2. Harmonize Variants
            var sourceVariants = await db.QueryAsync<(Guid Id, string Color, string Fabric, string Stitch, string Work)>(
                "SELECT id, color, fabric, stitch_type, work_heaviness FROM product_variants WHERE product_id = @Id", 
                new { Id = source.Id }, trans);

            foreach (var sVar in sourceVariants)
            {
                // Find if target already has this color/fabric combo
                var targetVarId = await db.QuerySingleOrDefaultAsync<Guid?>(@"
                    SELECT id FROM product_variants 
                    WHERE product_id = @TargetId 
                    AND (color = @Color OR (color IS NULL AND @Color IS NULL))
                    AND (fabric = @Fabric OR (fabric IS NULL AND @Fabric IS NULL))", 
                    new { TargetId = target.Id, Color = sVar.Color, Fabric = sVar.Fabric }, trans);

                if (targetVarId.HasValue)
                {
                    // Merge Listings from Source Variant to Target Variant
                    await MergeListings(db, sVar.Id, targetVarId.Value, trans);
                    
                    // Move Images
                    await db.ExecuteAsync("UPDATE images SET variant_id = @TargetVarId WHERE variant_id = @SourceVarId", 
                        new { TargetVarId = targetVarId.Value, SourceVarId = sVar.Id }, trans);
                    
                    // Cleanup orphaned source variant
                    await db.ExecuteAsync("DELETE FROM product_variants WHERE id = @Id", new { Id = sVar.Id }, trans);
                }
                else
                {
                    // No match, just move the variant to the new product
                    await db.ExecuteAsync("UPDATE product_variants SET product_id = @TargetId WHERE id = @VarId", 
                        new { TargetId = target.Id, VarId = sVar.Id }, trans);
                }
            }

            // 3. Deduction & Cleanup Flow for redundant images
            await DeduplicateImages(db, target.Id, tenantId, trans);

            if (deleteSource)
                await db.ExecuteAsync("DELETE FROM products WHERE id = @Id", new { Id = source.Id }, trans);

            trans.Commit();
        }
        catch (Exception ex)
        {
            trans.Rollback();
            _logger.LogError(ex, "Merge failed for Target:{Target} Source:{Source}", targetSku, sourceSku);
            throw;
        }
    }

    private async Task MergeListings(IDbConnection db, Guid sourceVarId, Guid targetVarId, IDbTransaction trans)
    {
        var sourceListings = await db.QueryAsync<dynamic>(
            "SELECT id, seller_id, current_price, currency, description FROM seller_listings WHERE variant_id = @Id", 
            new { Id = sourceVarId }, trans);

        foreach (var sl in sourceListings)
        {
            // Check if seller already has a listing on target variant
            var existingListingId = await db.QuerySingleOrDefaultAsync<Guid?>(
                "SELECT id FROM seller_listings WHERE variant_id = @VarId AND seller_id = @SellerId", 
                new { VarId = targetVarId, SellerId = (Guid)sl.seller_id }, trans);

            if (existingListingId.HasValue)
            {
                // Move old price to history if it changed
                await ArchivePriceIfChanged(db, existingListingId.Value, (decimal)sl.current_price, (string)sl.currency, trans);
                
                // Update existing listing with potentially newer description
                await db.ExecuteAsync("UPDATE seller_listings SET current_price = @Price, description = @Desc, updated_at = NOW() WHERE id = @Id",
                    new { Price = (decimal)sl.current_price, Desc = (string)sl.description, Id = existingListingId.Value }, trans);
                
                // Delete the moving listing
                await db.ExecuteAsync("DELETE FROM seller_listings WHERE id = @Id", new { Id = (Guid)sl.id }, trans);
            }
            else
            {
                // Just move it
                await db.ExecuteAsync("UPDATE seller_listings SET variant_id = @TargetId WHERE id = @Id",
                    new { TargetId = targetVarId, Id = (Guid)sl.id }, trans);
            }
        }
    }

    private async Task DeduplicateImages(IDbConnection db, Guid productId, Guid tenantId, IDbTransaction trans)
    {
        // Identify duplicates by phash within variants of this product
        var duplicates = await db.QueryAsync<(Guid Id, string Path)>(@"
            WITH RankedImages AS (
                SELECT id, storage_path, 
                       row_number() OVER(PARTITION BY variant_id, phash ORDER BY quality_score DESC NULLS LAST, uploaded_at ASC) as rank
                FROM images 
                WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = @Id)
                AND phash IS NOT NULL
            )
            SELECT id, storage_path FROM RankedImages WHERE rank > 1", new { Id = productId }, trans);

        foreach (var dup in duplicates)
        {
            // 1. Mark for deletion in DB
            await db.ExecuteAsync("UPDATE images SET status = 98 WHERE id = @Id", new { Id = dup.Id }, trans);

            // 2. Add to reliable Deletion Queue
            await db.ExecuteAsync(@"
                INSERT INTO image_deletion_queue (image_id, storage_path) 
                VALUES (@Id, @Path)", new { Id = dup.Id, Path = dup.Path }, trans);

            // 3. Emit Kafka event for async cleanup
            if (_kafkaProducer != null)
            {
                var evt = new ImageDeletionRequestedEvent
                {
                    EventId = Guid.NewGuid(),
                    EventType = EventTypes.ImageDeletionRequested,
                    EventVersion = "1.0",
                    Timestamp = DateTime.UtcNow,
                    TenantId = tenantId.ToString(),
                    Data = new ImageDeletionData {
                        ImageId = dup.Id,
                        StoragePath = dup.Path,
                        Reason = "sku_merge_dedupe"
                    }
                };
                
                await _kafkaProducer.ProduceAsync(KafkaTopics.ImageMaintenance, new Message<string, string> {
                    Key = dup.Id.ToString(),
                    Value = JsonSerializer.Serialize(evt)
                });
            }
        }
    }

    private async Task<Guid> GetOrCreateSeller(IDbConnection db, string externalId, IDbTransaction trans)
    {
        var id = await db.QuerySingleOrDefaultAsync<Guid?>(
            "SELECT id FROM sellers WHERE external_id = @Id", new { Id = externalId }, trans);
        
        if (id.HasValue) return id.Value;

        var newId = Guid.NewGuid();
        await db.ExecuteAsync("INSERT INTO sellers (id, external_id, name) VALUES (@Id, @ExtId, @Name)", 
            new { Id = newId, ExtId = externalId, Name = $"Seller {externalId}" }, trans);
        
        return newId;
    }

    private async Task<Guid> GetOrCreateProduct(IDbConnection db, UploadImageRequest request, IDbTransaction trans)
    {
        if (!string.IsNullOrEmpty(request.Sku))
        {
            var existingId = await db.QuerySingleOrDefaultAsync<Guid?>(
                "SELECT id FROM products WHERE base_sku = @Sku", new { Sku = request.Sku }, trans);
            
            if (existingId.HasValue) 
            {
                // Update tags union
                if (request.Tags?.Any() == true)
                {
                    await db.ExecuteAsync("UPDATE products SET tags = Array_Cat(tags, @NewTags) WHERE id = @Id", 
                        new { NewTags = request.Tags.ToArray(), Id = existingId.Value }, trans);
                }
                return existingId.Value;
            }
        }

        var productId = Guid.NewGuid();
        const string sql = @"
            INSERT INTO products (id, base_sku, title, tags)
            VALUES (@Id, @Sku, @Title, @Tags)
            RETURNING id";
        
        return await db.ExecuteScalarAsync<Guid>(sql, new {
            Id = productId,
            Sku = request.Sku ?? $"SKU-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}",
            Title = request.Description?.Substring(0, Math.Min(request.Description.Length, 100)) ?? "New Product",
            Tags = request.Tags?.ToArray() ?? Array.Empty<string>()
        }, trans);
    }

    private async Task<Guid> GetOrCreateVariant(IDbConnection db, Guid productId, UploadImageRequest request, IDbTransaction trans)
    {
        var existingId = await db.QuerySingleOrDefaultAsync<Guid?>(@"
            SELECT id FROM product_variants 
            WHERE product_id = @ProductId 
            AND (color = @Color OR (color IS NULL AND @Color IS NULL))
            AND (fabric = @Fabric OR (fabric IS NULL AND @Fabric IS NULL))", 
            new { 
                ProductId = productId, 
                Color = request.Color,
                Fabric = request.Fabric
            }, trans);
        
        if (existingId.HasValue) return existingId.Value;

        var variantId = Guid.NewGuid();
        var keywords = new List<string>();
        if (!string.IsNullOrEmpty(request.Occasion)) keywords.Add(request.Occasion);
        if (request.Patterns != null) keywords.AddRange(request.Patterns);

        const string sql = @"
            INSERT INTO product_variants (id, product_id, color, fabric, stitch_type, work_heaviness, search_keywords)
            VALUES (@Id, @ProductId, @Color, @Fabric, @StitchType, @WorkHeaviness, @SearchKeywords)
            RETURNING id";
        
        return await db.ExecuteScalarAsync<Guid>(sql, new {
            Id = variantId,
            ProductId = productId,
            Color = request.Color,
            Fabric = request.Fabric,
            StitchType = request.StitchType,
            WorkHeaviness = request.WorkHeaviness,
            SearchKeywords = keywords.Distinct().ToArray()
        }, trans);
    }

    private async Task UpsertSellerListing(IDbConnection db, Guid variantId, Guid sellerId, UploadImageRequest request, IDbTransaction trans)
    {
        var existing = await db.QuerySingleOrDefaultAsync<dynamic>(
            "SELECT id, current_price, currency FROM seller_listings WHERE variant_id = @VarId AND seller_id = @SellerId", 
            new { VarId = variantId, SellerId = sellerId }, trans);

        if (existing != null)
        {
            await ArchivePriceIfChanged(db, (Guid)existing.id, (decimal?)request.Price ?? 0, request.Currency ?? "INR", trans);

            await db.ExecuteAsync(@"
                UPDATE seller_listings 
                SET current_price = @Price, shipping_info = @Shipping, description = @Desc, updated_at = NOW() 
                WHERE id = @Id",
                new { 
                    Price = request.Price, 
                    Shipping = request.AdditionalMetadata?.GetValueOrDefault("shipping")?.ToString() ?? "plus shipping",
                    Desc = request.Description,
                    Id = (Guid)existing.id 
                }, trans);
        }
        else
        {
            await db.ExecuteAsync(@"
                INSERT INTO seller_listings (variant_id, seller_id, external_id, current_price, currency, shipping_info, description)
                VALUES (@VariantId, @SellerId, @ExtId, @Price, @Currency, @Shipping, @Description)",
                new {
                    VariantId = variantId,
                    SellerId = sellerId,
                    ExtId = request.ExternalId,
                    Price = request.Price,
                    Currency = request.Currency ?? "INR",
                    Shipping = request.AdditionalMetadata?.GetValueOrDefault("shipping")?.ToString() ?? "plus shipping",
                    Description = request.Description
                }, trans);
        }
    }

    private async Task ArchivePriceIfChanged(IDbConnection db, Guid listingId, decimal newPrice, string currency, IDbTransaction trans)
    {
        var current = await db.QuerySingleOrDefaultAsync<decimal?>(
            "SELECT current_price FROM seller_listings WHERE id = @Id", new { Id = listingId }, trans);

        if (current.HasValue && current.Value != newPrice)
        {
            await db.ExecuteAsync(@"
                INSERT INTO price_history (listing_id, price, currency) 
                VALUES (@ListingId, @Price, @Currency)", 
                new { ListingId = listingId, Price = current.Value, Currency = currency }, trans);
        }
    }

    public async Task<IEnumerable<ImageDto>> ListImagesAsync(Guid tenantId, int page, int pageSize)
    {
        using var connection = GetConnection(tenantId);
        const string sql = @"
            SELECT i.id, i.storage_path as StoragePath, i.status, i.width, i.height, i.uploaded_at as UploadedAt,
                   p.base_sku as Sku, p.title as ProductTitle
            FROM images i
            LEFT JOIN product_variants v ON i.variant_id = v.id
            LEFT JOIN products p ON v.product_id = p.id
            ORDER BY i.uploaded_at DESC
            LIMIT @PageSize OFFSET @Offset";

        return await connection.QueryAsync<ImageDto>(sql, new { 
            PageSize = pageSize, 
            Offset = (page - 1) * pageSize 
        });
    }

    public async Task UpdateImageDimensionsAsync(Guid tenantId, Guid imageId, int width, int height)
    {
        using var connection = GetConnection(tenantId);
        const string sql = "UPDATE images SET width = @Width, height = @Height WHERE id = @Id";
        await connection.ExecuteAsync(sql, new { Id = imageId, Width = width, Height = height });
    }

    public async Task UpdateImageStatusAsync(Guid tenantId, Guid imageId, int status)
    {
        using var connection = GetConnection(tenantId);
        const string sql = "UPDATE images SET status = @Status WHERE id = @Id";
        await connection.ExecuteAsync(sql, new { Id = imageId, Status = status });
    }

    public async Task<DeepLens.Contracts.Tenants.ThumbnailConfigurationDto?> GetThumbnailSettingsAsync(Guid tenantId)
    {
        try
        {
            var baseConnString = _configuration.GetConnectionString("DefaultConnection") 
                ?? "Host=localhost;Port=5433;Username=postgres;Password=DeepLens123!";
            
            var builder = new NpgsqlConnectionStringBuilder(baseConnString);
            builder.Database = "nextgen_identity"; // Query the registry/identity DB
            
            using var connection = new NpgsqlConnection(builder.ConnectionString);
            var settingsJson = await connection.QuerySingleOrDefaultAsync<string>(
                "SELECT settings FROM tenants WHERE id = @Id", new { Id = tenantId });
            
            if (string.IsNullOrEmpty(settingsJson)) return null;
            
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var settings = JsonSerializer.Deserialize<Dictionary<string, object>>(settingsJson, options);
            
            if (settings != null && settings.TryGetValue("thumbnails", out var thumbObj))
            {
                return JsonSerializer.Deserialize<DeepLens.Contracts.Tenants.ThumbnailConfigurationDto>(thumbObj.ToString()!, options);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch custom settings for tenant {TenantId}. Falling back to defaults.", tenantId);
        }
        
        return null;
    }
}

public class ImageDto
{
    public Guid Id { get; set; }
    public required string StoragePath { get; set; }
    public int Status { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public DateTime UploadedAt { get; set; }
    public string? Sku { get; set; }
    public string? ProductTitle { get; set; }
}

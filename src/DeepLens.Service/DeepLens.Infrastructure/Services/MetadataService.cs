using Dapper;
using System.Text.Json;
using System.Text.Json.Serialization;
using Npgsql;
using DeepLens.Contracts.Ingestion;
using DeepLens.Contracts.Events;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Data;
using Confluent.Kafka;
using DeepLens.Contracts.Media;
using DeepLens.Shared.Common;
using Microsoft.Extensions.Caching.Memory;

namespace DeepLens.Infrastructure.Services;

/// <summary>
/// Service for catalog metadata management. Single-tenant version.
/// </summary>
public interface IMetadataService
{
    Task SaveIngestionDataAsync(Guid id, string storagePath, string mimeType, long fileSize, UploadImageRequest request);
    Task MergeProductsAsync(string targetSku, string sourceSku, bool deleteSource);
    Task SetDefaultMediaAsync(Guid id, bool isDefault);
    Task SetFavoriteListingAsync(Guid listingId, bool isFavorite);
    Task UpdateMediaDimensionsAsync(Guid id, int width, int height);
    Task UpdateMediaStatusAsync(Guid id, int status);
    Task UpdateVideoMetadataAsync(Guid id, decimal duration, string? thumbnailPath, string? previewPath);
    Task<IEnumerable<MediaDto>> ListMediaAsync(int page, int pageSize, int? mediaType = null);
    Task<MediaPreferenceDto> ResolveMediaPreferencesAsync(MediaCategory category, string subCategory);
    Task<IEnumerable<MediaPreferenceDto>> GetAllMediaPreferencesAsync();
    Task<Guid> UpsertMediaPreferenceAsync(MediaPreferenceDto dto);
    Task<bool> DeleteMediaPreferenceAsync(Guid id);
    IEnumerable<string> GetRetentionOptions();
    Task<MediaDto?> GetMediaByIdAsync(Guid id);
    Task LinkMediaAsync(Guid mediaId, Guid entityId, string entityType, bool isPrimary = false);
    Task UnlinkMediaAsync(Guid mediaId, Guid entityId, string entityType);
    Task<int> GetOrphanedMediaCountAsync();
    Task<IEnumerable<SystemJobDto>> GetSystemJobsAsync();
    Task UpdateJobStatusAsync(string jobName, string status, int progress = 0, string? metadata = null);
    Task<int> TriggerMediaCleanupAsync();
}

public class MetadataService : IMetadataService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<MetadataService> _logger;
    private readonly IMemoryCache _cache;
    private readonly IProducer<string, string>? _kafkaProducer;
    private readonly string _connectionString;

    private const string PrefsCacheKeyPrefix = "MediaPrefs_";

    public MetadataService(
        IConfiguration configuration,
        ILogger<MetadataService> logger,
        IMemoryCache cache,
        IProducer<string, string>? kafkaProducer = null)
    {
        _configuration = configuration;
        _logger = logger;
        _cache = cache;
        _kafkaProducer = kafkaProducer;
        _connectionString = _configuration.GetConnectionString("DefaultConnection") 
                         ?? throw new InvalidOperationException("DefaultConnection string not found");
    }

    private IDbConnection GetConnection()
    {
        return new NpgsqlConnection(_connectionString);
    }

    public async Task SaveIngestionDataAsync(Guid id, string storagePath, string contentType, long fileSize, UploadImageRequest request)
    {
        using var connection = GetConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            var vendorId = await GetOrCreateVendor(connection, request.SellerId, transaction);
            var productId = await GetOrCreateProduct(connection, request, transaction);

            var mediaType = contentType.StartsWith("video/") ? 2 : 1;
            const string mediaSql = @"
                INSERT INTO media (id, storage_path, media_type, original_filename, file_size_bytes, mime_type, status, category, subcategory, color)
                VALUES (@Id, @StoragePath, @MediaType, @OriginalFilename, @FileSize, @MimeType, 0, @Category, @SubCategory, @Color)";
            
            _logger.LogInformation("Saving ingestion media record {MediaId} at path {StoragePath}", id, storagePath);
            await connection.ExecuteAsync(mediaSql, new {
                Id = id,
                StoragePath = storagePath,
                MediaType = mediaType,
                OriginalFilename = request.File.FileName,
                FileSize = fileSize,
                MimeType = contentType,
                Category = request.Category.ToString().ToLowerInvariant() ?? "product",
                SubCategory = request.SubCategory?.ToLowerInvariant(),
                Color = request.Color
            }, transaction);

            // Link to Product (The Design Gallery)
            await LinkMediaAsync(id, productId, "product", true, connection, transaction);

            var listingId = await UpsertVendorListing(connection, productId, vendorId, request, transaction);

            // Link to Listing (The Vendor Proof)
            await LinkMediaAsync(id, listingId, "vendor_listing", true, connection, transaction);

            transaction.Commit();
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            _logger.LogError(ex, "Failed to save ingestion metadata");
            throw;
        }
    }

    public async Task SetFavoriteListingAsync(Guid listingId, bool isFavorite)
    {
        using var db = GetConnection();
        await db.ExecuteAsync("UPDATE vendor_listings SET is_favorite = @IsFavorite WHERE id = @Id", new { IsFavorite = isFavorite, Id = listingId });
    }

    public async Task SetDefaultMediaAsync(Guid id, bool isDefault)
    {
        using var db = GetConnection();
        await db.ExecuteAsync("UPDATE media SET is_default = @IsDefault WHERE id = @Id", new { IsDefault = isDefault, Id = id });
    }

    public async Task MergeProductsAsync(string targetSku, string sourceSku, bool deleteSource)
    {
        using var db = GetConnection();
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

            var consolidatedTags = (target.Tags ?? Array.Empty<string>())
                .Union(source.Tags ?? Array.Empty<string>())
                .Append(sourceSku)
                .Distinct()
                .ToArray();

            await db.ExecuteAsync("UPDATE products SET tags = @Tags WHERE id = @Id", 
                new { Tags = consolidatedTags, Id = target.Id }, trans);

            // Record the merge history for redirection/audit
            await db.ExecuteAsync(@"
                INSERT INTO product_merges (source_id, target_id, metadata)
                VALUES (@SourceId, @TargetId, @Metadata)
                ON CONFLICT (source_id) DO UPDATE SET target_id = EXCLUDED.target_id",
                new { 
                    SourceId = source.Id, 
                    TargetId = target.Id, 
                    Metadata = JsonSerializer.Serialize(new { 
                        reason = "manual_merge", 
                        source_sku = sourceSku, 
                        target_sku = targetSku 
                    }) 
                }, trans);

            // Move all listings from source product to target product
            await db.ExecuteAsync("UPDATE vendor_listings SET product_id = @TargetId WHERE product_id = @SourceId",
                new { TargetId = target.Id, SourceId = source.Id }, trans);

            // Move all Instagram posts (competitor_videos) linked to this product
            await db.ExecuteAsync("UPDATE competitor_videos SET product_id = @TargetId WHERE product_id = @SourceId",
                new { TargetId = target.Id, SourceId = source.Id }, trans);

            // Move all media links from source product to target product
            await db.ExecuteAsync("UPDATE media_links SET entity_id = @TargetId WHERE entity_id = @SourceId AND entity_type = 'product'",
                new { TargetId = target.Id, SourceId = source.Id }, trans);

            // Re-link individual media to the new product (Source of truth in media table if we added product_id there)
            await db.ExecuteAsync("UPDATE media SET product_id = @TargetId WHERE product_id = @SourceId",
                new { TargetId = target.Id, SourceId = source.Id }, trans);

            await DeduplicateImages(db, target.Id, trans);

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
            "SELECT id, vendor_id as seller_id, current_price, currency, description FROM vendor_listings WHERE variant_id = @Id", 
            new { Id = sourceVarId }, trans);

        foreach (var sl in sourceListings)
        {
            var existingListingId = await db.QuerySingleOrDefaultAsync<Guid?>(
                "SELECT id FROM vendor_listings WHERE variant_id = @VarId AND vendor_id = @VendorId", 
                new { VarId = targetVarId, VendorId = (Guid)sl.seller_id }, trans);

            if (existingListingId.HasValue)
            {
                await ArchivePriceIfChanged(db, existingListingId.Value, (decimal)sl.current_price, (string)sl.currency, trans);
                await db.ExecuteAsync("UPDATE vendor_listings SET current_price = @Price, description = @Desc, updated_at = NOW() WHERE id = @Id",
                    new { Price = (decimal)sl.current_price, Desc = (string)sl.description, Id = existingListingId.Value }, trans);
                await db.ExecuteAsync("DELETE FROM vendor_listings WHERE id = @Id", new { Id = (Guid)sl.id }, trans);
            }
            else
            {
                await db.ExecuteAsync("UPDATE vendor_listings SET variant_id = @TargetId WHERE id = @Id",
                    new { TargetId = targetVarId, Id = (Guid)sl.id }, trans);
            }
        }
    }

    private async Task DeduplicateImages(IDbConnection db, Guid productId, IDbTransaction trans)
    {
        var duplicates = await db.QueryAsync<(Guid Id, string Path)>(@"
            WITH RankedImages AS (
                SELECT id, storage_path, 
                       row_number() OVER(PARTITION BY variant_id, phash ORDER BY quality_score DESC NULLS LAST, uploaded_at ASC) as rank
                FROM media 
                WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = @Id)
                AND phash IS NOT NULL
            )
            SELECT id, storage_path FROM RankedImages WHERE rank > 1", new { Id = productId }, trans);

        foreach (var dup in duplicates)
        {
            await db.ExecuteAsync("UPDATE media SET status = 98 WHERE id = @Id", new { Id = dup.Id }, trans);
            await db.ExecuteAsync(@"
                INSERT INTO media_deletion_queue (media_id, storage_path) 
                VALUES (@Id, @Path)", new { Id = dup.Id, Path = dup.Path }, trans);

            if (_kafkaProducer != null)
            {
                var evt = new ImageDeletionRequestedEvent
                {
                    EventId = Guid.NewGuid(),
                    EventType = EventTypes.ImageDeletionRequested,
                    EventVersion = "1.0",
                    Timestamp = DateTime.UtcNow,
                    TenantId = "SINGLE_TENANT",
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

    private async Task<Guid> GetOrCreateVendor(IDbConnection db, string externalId, IDbTransaction trans)
    {
        var id = await db.QuerySingleOrDefaultAsync<Guid?>(
            "SELECT id FROM vendors WHERE external_id = @Id", new { Id = externalId }, trans);
        
        if (id.HasValue) return id.Value;

        var newId = Guid.NewGuid();
        await db.ExecuteAsync("INSERT INTO vendors (id, external_id, vendor_name) VALUES (@Id, @ExtId, @Name)", 
            new { Id = newId, ExtId = externalId, Name = $"Vendor {externalId}" }, trans);
        
        return newId;
    }

    private async Task<Guid> GetOrCreateProduct(IDbConnection db, UploadImageRequest request, IDbTransaction trans)
    {
        string? sku = request.Sku;
        if (!string.IsNullOrEmpty(sku))
        {
            var existingId = await db.QuerySingleOrDefaultAsync<Guid?>(
                "SELECT id FROM products WHERE base_sku = @Sku", new { Sku = sku }, trans);
            
            if (existingId.HasValue) 
            {
                if (request.Tags?.Any() == true)
                {
                    await db.ExecuteAsync("UPDATE products SET tags = Array_Cat(tags, @NewTags) WHERE id = @Id", 
                        new { NewTags = request.Tags.ToArray(), Id = existingId.Value }, trans);
                }
                return existingId.Value;
            }
        }
        else
        {
            var nextVal = await db.QuerySingleAsync<long>("SELECT nextval('\"productId_id_seq\"')", null, trans);
            sku = $"VF{nextVal:X3}";
            request.SequenceId = (int)nextVal;
        }

        var productId = Guid.NewGuid();
        const string sql = @"
            INSERT INTO products (id, base_sku, title, tags, sequence_id, fabric, stitch_type, work_heaviness)
            VALUES (@Id, @Sku, @Title, @Tags, @SeqId, @Fabric, @Stitch, @Work)
            RETURNING id";
        
        var tags = request.Tags ?? new List<string>();
        if (!string.IsNullOrEmpty(request.SubCategory) && request.SubCategory != "General")
        {
            var tag = request.SubCategory.ToLowerInvariant();
            if (!tags.Contains(tag)) tags.Add(tag);
        }

        return await db.ExecuteScalarAsync<Guid>(sql, new {
            Id = productId,
            Sku = sku,
            Title = request.Description?.Substring(0, Math.Min(request.Description.Length, 100)) ?? "New Product",
            Tags = tags.ToArray(),
            SeqId = request.SequenceId ?? 0,
            Fabric = request.Fabric,
            Stitch = request.StitchType,
            Work = request.WorkHeaviness
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

    private async Task<Guid> UpsertVendorListing(IDbConnection db, Guid productId, Guid vendorId, UploadImageRequest request, IDbTransaction trans)
    {
        var existing = await db.QuerySingleOrDefaultAsync<dynamic>(
            "SELECT id, current_price, currency FROM vendor_listings WHERE product_id = @Pid AND vendor_id = @VendorId", 
            new { Pid = productId, VendorId = vendorId }, trans);

        if (existing != null)
        {
            var existingId = (Guid)existing.id;
            await ArchivePriceIfChanged(db, existingId, (decimal?)request.Price ?? 0, request.Currency ?? "INR", trans);

            await db.ExecuteAsync(@"
                UPDATE vendor_listings 
                SET current_price = @Price, shipping_info = @Shipping, description = @Desc, updated_at = NOW() 
                WHERE id = @Id",
                new { 
                    Price = request.Price, 
                    Shipping = request.AdditionalMetadata?.GetValueOrDefault("shipping")?.ToString() ?? "plus shipping",
                    Desc = request.Description,
                    Id = existingId 
                }, trans);
            return existingId;
        }
        else
        {
            var newId = Guid.NewGuid();
            await db.ExecuteAsync(@"
                INSERT INTO vendor_listings (id, product_id, vendor_id, external_id, current_price, currency, shipping_info, description)
                VALUES (@Id, @ProductId, @VendorId, @ExtId, @Price, @Currency, @Shipping, @Description)",
                new {
                    Id = newId,
                    ProductId = productId,
                    VendorId = vendorId,
                    ExtId = request.ExternalId,
                    Price = request.Price,
                    Currency = request.Currency ?? "INR",
                    Shipping = request.AdditionalMetadata?.GetValueOrDefault("shipping")?.ToString() ?? "plus shipping",
                    Description = request.Description
                }, trans);
            return newId;
        }
    }

    private async Task ArchivePriceIfChanged(IDbConnection db, Guid listingId, decimal newPrice, string currency, IDbTransaction trans)
    {
        var current = await db.QuerySingleOrDefaultAsync<decimal?>(
            "SELECT current_price FROM vendor_listings WHERE id = @Id", new { Id = listingId }, trans);

        if (current.HasValue && current.Value != newPrice)
        {
            await db.ExecuteAsync(@"
                INSERT INTO price_history (listing_id, price, currency) 
                VALUES (@ListingId, @Price, @Currency)", 
                new { ListingId = listingId, Price = current.Value, Currency = currency }, trans);
        }
    }

    public async Task<IEnumerable<MediaDto>> ListMediaAsync(int page, int pageSize, int? mediaType = null)
    {
        using var connection = GetConnection();
        string typeFilter = mediaType.HasValue ? "AND i.media_type = @MediaType" : "";
        string sql = @$"
            SELECT i.id, i.storage_path as StoragePath, i.media_type as MediaType, i.status, 
                   i.width, i.height, i.duration_seconds as DurationSeconds,
                   i.thumbnail_s as ThumbnailS, i.thumbnail_m as ThumbnailM, i.thumbnail_l as ThumbnailL,
                   i.blur_data as BlurData, i.preview_path as PreviewPath,
                   i.mime_type as MimeType,
                   i.uploaded_at as UploadedAt,
                   p.base_sku as Sku, p.title as ProductTitle
            FROM media i
            LEFT JOIN media_links ml ON i.id = ml.media_id AND ml.entity_type = 'product'
            LEFT JOIN products p ON ml.entity_id = p.id
            WHERE 1=1 {typeFilter}
            ORDER BY i.uploaded_at DESC
            LIMIT @PageSize OFFSET @Offset";

        return await connection.QueryAsync<MediaDto>(sql, new { 
            MediaType = mediaType,
            PageSize = pageSize, 
            Offset = (page - 1) * pageSize 
        });
    }

    public async Task UpdateMediaDimensionsAsync(Guid id, int width, int height)
    {
        using var connection = GetConnection();
        const string sql = "UPDATE media SET width = @Width, height = @Height WHERE id = @Id";
        await connection.ExecuteAsync(sql, new { Id = id, Width = width, Height = height });
    }

    public async Task UpdateMediaStatusAsync(Guid id, int status)
    {
        using var connection = GetConnection();
        const string sql = "UPDATE media SET status = @Status WHERE id = @Id";
        await connection.ExecuteAsync(sql, new { Id = id, Status = status });
    }

    public async Task<MediaDto?> GetMediaByIdAsync(Guid id)
    {
        using var connection = GetConnection();
        const string sql = @"
            SELECT i.id, i.storage_path as StoragePath, i.media_type as MediaType, i.status, 
                   i.width, i.height, i.duration_seconds as DurationSeconds,
                   i.thumbnail_s as ThumbnailS, i.thumbnail_m as ThumbnailM, i.thumbnail_l as ThumbnailL,
                   i.blur_data as BlurData, i.preview_path as PreviewPath,
                   i.mime_type as MimeType,
                   i.uploaded_at as UploadedAt,
                   p.base_sku as Sku, p.title as ProductTitle
            FROM media i
            LEFT JOIN media_links ml ON i.id = ml.media_id AND ml.entity_type = 'product'
            LEFT JOIN products p ON ml.entity_id = p.id
            WHERE i.id = @Id";

        return await connection.QueryFirstOrDefaultAsync<MediaDto>(sql, new { Id = id });
    }

    public async Task UpdateVideoMetadataAsync(Guid id, decimal duration, string? thumbnailPath, string? previewPath)
    {
        using var connection = GetConnection();
        const string sql = @"
            UPDATE media 
            SET duration_seconds = @Duration, 
                thumbnail_path = @ThumbPath, 
                preview_path = @PreviewPath,
                status = 1 
            WHERE id = @Id";
        await connection.ExecuteAsync(sql, new { 
            Id = id, 
            Duration = duration, 
            ThumbPath = thumbnailPath, 
            PreviewPath = previewPath 
        });
    }

    public async Task<MediaPreferenceDto> ResolveMediaPreferencesAsync(MediaCategory category, string subCategory)
    {
        string sub = subCategory ?? "General";
        string cacheKey = $"{PrefsCacheKeyPrefix}{category}_{sub}";

        if (_cache.TryGetValue(cacheKey, out MediaPreferenceDto? cachedPrefs) && cachedPrefs != null)
        {
            _logger.LogDebug("Cache HIT for media preferences: {CacheKey}", cacheKey);
            return cachedPrefs;
        }

        _logger.LogDebug("Cache MISS for media preferences: {CacheKey}", cacheKey);

        using var connection = GetConnection();
        const string sql = @"
            SELECT category, subcategory, thumbnail_sizes, default_retention, is_active
            FROM media_preferences 
            WHERE (category = @Category AND subcategory = @SubCategory)
               OR (category = @Category AND subcategory IS NULL)
               OR (category IS NULL AND subcategory IS NULL)
            AND is_active = TRUE
            ORDER BY 
                CASE 
                    WHEN category = @Category AND subcategory = @SubCategory THEN 1
                    WHEN category = @Category AND subcategory IS NULL THEN 2
                    WHEN category IS NULL AND subcategory IS NULL THEN 3
                    ELSE 4
                END
            LIMIT 1";

        var result = await connection.QueryFirstOrDefaultAsync<dynamic>(sql, new { 
            Category = category.ToString().ToLowerInvariant(), 
            SubCategory = sub.ToLowerInvariant() 
        });

        MediaPreferenceDto resolved;

        if (result != null)
        {
            resolved = new MediaPreferenceDto
            {
                Category = result.category,
                SubCategory = result.subcategory,
                ThumbnailSizes = (string[])result.thumbnail_sizes,
                Retention = result.default_retention,
                IsActive = result.is_active,
                IsGlobal = false
            };
        }
        else 
        {
            resolved = new MediaPreferenceDto
            {
                ThumbnailSizes = new[] { "icon", "medium", "large" },
                Retention = "days180",
                IsActive = true,
                IsGlobal = true
            };
        }

        _cache.Set(cacheKey, resolved, TimeSpan.FromMinutes(10));
        return resolved;
    }

    public async Task<IEnumerable<MediaPreferenceDto>> GetAllMediaPreferencesAsync()
    {
        using var connection = GetConnection();
        const string sql = "SELECT id, category, subcategory, thumbnail_sizes as ThumbnailSizes, default_retention as Retention, is_active as IsActive FROM media_preferences ORDER BY category NULLS FIRST, subcategory NULLS FIRST";
        return await connection.QueryAsync<MediaPreferenceDto>(sql);
    }

    public async Task<Guid> UpsertMediaPreferenceAsync(MediaPreferenceDto dto)
    {
        using var connection = GetConnection();
        
        var cat = dto.Category?.ToLowerInvariant();
        var sub = dto.SubCategory?.ToLowerInvariant();

        // 1. Try to find existing record by Cat/SubCat (Business Key)
        var existingId = await connection.QuerySingleOrDefaultAsync<Guid?>(
            "SELECT id FROM media_preferences WHERE (category = @Category OR (category IS NULL AND @Category IS NULL)) AND (subcategory = @SubCategory OR (subcategory IS NULL AND @SubCategory IS NULL))",
            new { Category = cat, SubCategory = sub });

        // 2. Use provided ID or existing ID or new ID
        var targetId = dto.Id ?? existingId ?? Guid.NewGuid();

        const string sql = @"
            INSERT INTO media_preferences (id, category, subcategory, thumbnail_sizes, default_retention, is_active, updated_at)
            VALUES (@Id, @Category, @SubCategory, @ThumbnailSizes, @Retention, @IsActive, NOW())
            ON CONFLICT (id) 
            DO UPDATE SET 
                category = EXCLUDED.category, 
                subcategory = EXCLUDED.subcategory,
                thumbnail_sizes = EXCLUDED.thumbnail_sizes, 
                default_retention = EXCLUDED.default_retention, 
                is_active = EXCLUDED.is_active,
                updated_at = NOW()
            RETURNING id";

        var res = await connection.ExecuteScalarAsync<Guid>(sql, new {
            Id = targetId,
            Category = cat,
            SubCategory = sub,
            ThumbnailSizes = dto.ThumbnailSizes,
            Retention = dto.Retention,
            IsActive = dto.IsActive
        });

        // Invalidate all related caches. Safer to purge prefix if possible, but for simplicity:
        _cache.Remove($"{PrefsCacheKeyPrefix}{cat}_{sub ?? "General"}");
        _cache.Remove($"{PrefsCacheKeyPrefix}_global"); // Invalidate potential global lookups
        
        return res;
    }

    public async Task<bool> DeleteMediaPreferenceAsync(Guid id)
    {
        using var connection = GetConnection();
        const string sql = "DELETE FROM media_preferences WHERE id = @Id RETURNING category, subcategory"; 
        var result = await connection.QueryFirstOrDefaultAsync<dynamic>(sql, new { Id = id });
        
        if (result != null)
        {
            _cache.Remove($"{PrefsCacheKeyPrefix}{result.category}_{result.subcategory ?? "General"}");
            return true;
        }
        return false;
    }

    public async Task LinkMediaAsync(Guid mediaId, Guid entityId, string entityType, bool isPrimary = false)
    {
        using var connection = GetConnection();
        await LinkMediaAsync(mediaId, entityId, entityType, isPrimary, connection);
    }

    private async Task LinkMediaAsync(Guid mediaId, Guid entityId, string entityType, bool isPrimary, IDbConnection db, IDbTransaction? trans = null)
    {
        const string sql = @"
            INSERT INTO media_links (media_id, entity_id, entity_type, is_primary)
            VALUES (@MediaId, @EntityId, @EntityType, @IsPrimary)
            ON CONFLICT DO NOTHING";
        
        await db.ExecuteAsync(sql, new { MediaId = mediaId, EntityId = entityId, EntityType = entityType, IsPrimary = isPrimary }, trans);
    }

    public async Task UnlinkMediaAsync(Guid mediaId, Guid entityId, string entityType)
    {
        using var db = GetConnection();
        await db.ExecuteAsync("DELETE FROM media_links WHERE media_id = @MediaId AND entity_id = @EntityId AND entity_type = @EntityType", 
            new { MediaId = mediaId, EntityId = entityId, EntityType = entityType });
    }

    public async Task<int> GetOrphanedMediaCountAsync()
    {
        using var db = GetConnection();
        return await db.ExecuteScalarAsync<int>(@"
            SELECT COUNT(*) FROM media i 
            WHERE NOT EXISTS (SELECT 1 FROM media_links ml WHERE ml.media_id = i.id)");
    }

    public async Task<IEnumerable<SystemJobDto>> GetSystemJobsAsync()
    {
        using var db = GetConnection();
        return await db.QueryAsync<SystemJobDto>("SELECT id, job_name as JobName, status, last_run_at as LastRunAt, progress_pct as ProgressPct, updated_at as UpdatedAt FROM system_jobs ORDER BY job_name");
    }

    public async Task UpdateJobStatusAsync(string jobName, string status, int progress = 0, string? metadata = null)
    {
        using var db = GetConnection();
        const string sql = @"
            INSERT INTO system_jobs (job_name, status, last_run_at, progress_pct, metadata, updated_at)
            VALUES (@Name, @Status, NOW(), @Progress, @Metadata::jsonb, NOW())
            ON CONFLICT (job_name) -- Assuming we add a unique constraint on job_name
            DO UPDATE SET 
                status = EXCLUDED.status, 
                last_run_at = EXCLUDED.last_run_at, 
                progress_pct = EXCLUDED.progress_pct, 
                metadata = EXCLUDED.metadata, 
                updated_at = NOW()";
        
        await db.ExecuteAsync(sql, new { Name = jobName, Status = status, Progress = progress, Metadata = metadata ?? "{}" });
    }

    public async Task<int> TriggerMediaCleanupAsync()
    {
        using var db = GetConnection();
        db.Open();
        using var trans = db.BeginTransaction();

        try {
            // 1. Identify orphaned media
            var orphaned = await db.QueryAsync<dynamic>(@"
                SELECT i.id, i.storage_path, i.thumbnail_s, i.thumbnail_m, i.thumbnail_l
                FROM media i 
                WHERE NOT EXISTS (SELECT 1 FROM media_links ml WHERE ml.media_id = i.id)", 
                null, trans);

            int count = 0;
            foreach (var m in orphaned)
            {
                // 2. Queue for deletion
                await db.ExecuteAsync(@"
                    INSERT INTO media_deletion_log (media_id, storage_path, thumbnail_s, thumbnail_m, thumbnail_l, queued_at, status)
                    VALUES (@MediaId, @Path, @ThumbS, @ThumbM, @ThumbL, NOW(), 0)",
                    new { 
                        MediaId = (Guid)m.id, 
                        Path = (string)m.storage_path,
                        ThumbS = (string?)m.thumbnail_s,
                        ThumbM = (string?)m.thumbnail_m,
                        ThumbL = (string?)m.thumbnail_l
                    }, trans);
                
                // 3. Remove from media table (Source of Truth)
                await db.ExecuteAsync("DELETE FROM media WHERE id = @Id", new { Id = (Guid)m.id }, trans);
                count++;
            }

            trans.Commit();
            return count;
        } catch {
            trans.Rollback();
            throw;
        }
    }

    public IEnumerable<string> GetRetentionOptions()
    {
        return MediaConstants.Retention.AllOptions;
    }
}

public class MediaDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("storagePath")]
    public required string StoragePath { get; set; }

    [JsonPropertyName("mediaType")]
    public int MediaType { get; set; }

    [JsonPropertyName("status")]
    public int Status { get; set; }

    [JsonPropertyName("width")]
    public int? Width { get; set; }

    [JsonPropertyName("height")]
    public int? Height { get; set; }

    [JsonPropertyName("durationSeconds")]
    public decimal? DurationSeconds { get; set; }

    [JsonPropertyName("thumbnailS")]
    public string? ThumbnailS { get; set; }

    [JsonPropertyName("thumbnailM")]
    public string? ThumbnailM { get; set; }

    [JsonPropertyName("thumbnailL")]
    public string? ThumbnailL { get; set; }

    [JsonPropertyName("blurData")]
    public string? BlurData { get; set; }

    [JsonPropertyName("previewPath")]
    public string? PreviewPath { get; set; }

    [JsonPropertyName("mimeType")]
    public string? MimeType { get; set; }

    [JsonPropertyName("uploadedAt")]
    public DateTime UploadedAt { get; set; }

    [JsonPropertyName("sku")]
    public string? Sku { get; set; }

    [JsonPropertyName("productTitle")]
    public string? ProductTitle { get; set; }
}

public class SystemJobDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("jobName")]
    public string JobName { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("lastRunAt")]
    public DateTime? LastRunAt { get; set; }

    [JsonPropertyName("progressPct")]
    public int ProgressPct { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

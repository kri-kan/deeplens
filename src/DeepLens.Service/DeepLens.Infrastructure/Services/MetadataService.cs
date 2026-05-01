using Dapper;
using System.Text.Json;
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
            var variantId = await GetOrCreateVariant(connection, productId, request, transaction);

            var mediaType = contentType.StartsWith("video/") ? 2 : 1;
            const string mediaSql = @"
                INSERT INTO media (id, variant_id, storage_path, media_type, original_filename, file_size_bytes, mime_type, phash, quality_score, status, category, subcategory)
                VALUES (@Id, @VariantId, @StoragePath, @MediaType, @OriginalFilename, @FileSize, @MimeType, @PHash, @Quality, 0, @Category, @SubCategory)";
            
            _logger.LogInformation("Saving ingestion media record {MediaId} for variant {VarId} at path {StoragePath}", id, variantId, storagePath);
            await connection.ExecuteAsync(mediaSql, new {
                Id = id,
                VariantId = variantId,
                StoragePath = storagePath,
                MediaType = mediaType,
                OriginalFilename = request.File.FileName,
                FileSize = fileSize,
                MimeType = contentType,
                PHash = (string?)null,
                Quality = (decimal?)null,
                Category = request.Category.ToString().ToLowerInvariant() ?? "product",
                SubCategory = request.SubCategory?.ToLowerInvariant()
            }, transaction);

            await UpsertVendorListing(connection, variantId, vendorId, request, transaction);

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
                .Distinct()
                .ToArray();

            await db.ExecuteAsync("UPDATE products SET tags = @Tags WHERE id = @Id", 
                new { Tags = consolidatedTags, Id = target.Id }, trans);

            var sourceVariants = await db.QueryAsync<(Guid Id, string Color, string Fabric, string Stitch, string Work)>(
                "SELECT id, color, fabric, stitch_type, work_heaviness FROM product_variants WHERE product_id = @Id", 
                new { Id = source.Id }, trans);

            foreach (var sVar in sourceVariants)
            {
                var targetVarId = await db.QuerySingleOrDefaultAsync<Guid?>(@"
                    SELECT id FROM product_variants 
                    WHERE product_id = @TargetId 
                    AND (color = @Color OR (color IS NULL AND @Color IS NULL))
                    AND (fabric = @Fabric OR (fabric IS NULL AND @Fabric IS NULL))", 
                    new { TargetId = target.Id, Color = sVar.Color, Fabric = sVar.Fabric }, trans);

                if (targetVarId.HasValue)
                {
                    await MergeListings(db, sVar.Id, targetVarId.Value, trans);
                    await db.ExecuteAsync("UPDATE media SET variant_id = @TargetVarId WHERE variant_id = @SourceVarId", 
                        new { TargetVarId = targetVarId.Value, SourceVarId = sVar.Id }, trans);
                    await db.ExecuteAsync("DELETE FROM product_variants WHERE id = @Id", new { Id = sVar.Id }, trans);
                }
                else
                {
                    await db.ExecuteAsync("UPDATE product_variants SET product_id = @TargetId WHERE id = @VarId", 
                        new { TargetId = target.Id, VarId = sVar.Id }, trans);
                }
            }

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
            sku = nextVal.ToString("X3");
        }

        var productId = Guid.NewGuid();
        const string sql = @"
            INSERT INTO products (id, base_sku, title, tags)
            VALUES (@Id, @Sku, @Title, @Tags)
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
            Tags = tags.ToArray()
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

    private async Task UpsertVendorListing(IDbConnection db, Guid variantId, Guid vendorId, UploadImageRequest request, IDbTransaction trans)
    {
        var existing = await db.QuerySingleOrDefaultAsync<dynamic>(
            "SELECT id, current_price, currency FROM vendor_listings WHERE variant_id = @VarId AND vendor_id = @VendorId", 
            new { VarId = variantId, VendorId = vendorId }, trans);

        if (existing != null)
        {
            await ArchivePriceIfChanged(db, (Guid)existing.id, (decimal?)request.Price ?? 0, request.Currency ?? "INR", trans);

            await db.ExecuteAsync(@"
                UPDATE vendor_listings 
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
                INSERT INTO vendor_listings (variant_id, vendor_id, external_id, current_price, currency, shipping_info, description)
                VALUES (@VariantId, @VendorId, @ExtId, @Price, @Currency, @Shipping, @Description)",
                new {
                    VariantId = variantId,
                    VendorId = vendorId,
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
                   i.thumbnail_path as ThumbnailPath, i.preview_path as PreviewPath,
                   i.mime_type as MimeType,
                   i.uploaded_at as UploadedAt,
                   p.base_sku as Sku, p.title as ProductTitle
            FROM media i
            LEFT JOIN product_variants v ON i.variant_id = v.id
            LEFT JOIN products p ON v.product_id = p.id
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
                   i.thumbnail_path as ThumbnailPath, i.preview_path as PreviewPath,
                   i.mime_type as MimeType,
                   i.uploaded_at as UploadedAt,
                   p.base_sku as Sku, p.title as ProductTitle
            FROM media i
            LEFT JOIN product_variants v ON i.variant_id = v.id
            LEFT JOIN products p ON v.product_id = p.id
            WHERE i.id = @Id";

        return await connection.QuerySingleOrDefaultAsync<MediaDto>(sql, new { Id = id });
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

    public IEnumerable<string> GetRetentionOptions()
    {
        return MediaConstants.Retention.AllOptions;
    }
}

public class MediaDto
{
    public Guid Id { get; set; }
    public required string StoragePath { get; set; }
    public int MediaType { get; set; }
    public int Status { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public decimal? DurationSeconds { get; set; }
    public string? ThumbnailPath { get; set; }
    public string? PreviewPath { get; set; }
    public string? MimeType { get; set; }
    public DateTime UploadedAt { get; set; }
    public string? Sku { get; set; }
    public string? ProductTitle { get; set; }
}

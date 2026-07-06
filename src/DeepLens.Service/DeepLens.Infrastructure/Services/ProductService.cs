using Dapper;
using DeepLens.Contracts.Catalog;
using DeepLens.Domain.Entities.Catalog;
using DeepLens.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using System.Data;
using System.Text.Json;
using DeepLens.Contracts.Media;
using DeepLens.Shared.Common;
using Minio.DataModel.Tags;
using DeepLens.Domain.Enums;
using DeepLens.Shared.Telemetry;

namespace DeepLens.Infrastructure.Services;

public class ProductService : IProductService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<ProductService> _logger;
    private readonly DeepLens.Infrastructure.Services.IStorageService _storageService;
    private readonly DeepLens.Application.Abstractions.Repositories.IProductShareLogRepository _productShareLogRepository;
    private readonly DeepLens.Application.Abstractions.Repositories.IProductRepository _productRepository;
    private readonly string _connectionString;

    public ProductService(
        IConfiguration configuration, 
        ILogger<ProductService> logger,
        DeepLens.Infrastructure.Services.IStorageService storageService,
        DeepLens.Application.Abstractions.Repositories.IProductShareLogRepository productShareLogRepository,
        DeepLens.Application.Abstractions.Repositories.IProductRepository productRepository)
    {
        _configuration = configuration;
        _logger = logger;
        _storageService = storageService;
        _productShareLogRepository = productShareLogRepository;
        _productRepository = productRepository;
        _connectionString = _configuration.GetConnectionString("DefaultConnection") 
                         ?? throw new InvalidOperationException("DefaultConnection string not found");
    }

    private IDbConnection GetConnection() => new NpgsqlConnection(_connectionString);

    public async Task<VendorProduct> CreateProductAsync(ProductIngestionDto data, List<MediaFileDto> mediaFiles)
    {
        using var connection = GetConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            // 0. Generate Hex ID (Product Code) from sequence
            var nextVal = await connection.QuerySingleAsync<long>("SELECT nextval('productid_id_seq')", null, transaction);
            var hexId = $"VF{nextVal:X3}";
            data.SequenceId = (int)nextVal;

            // 0. Resolve Category from Master List
            var categoryId = data.CategoryId;
            string categorySlug = data.CategorySlug ?? "general";

            if (!categoryId.HasValue || string.IsNullOrEmpty(data.CategorySlug))
            {
                var categoryRecord = await connection.QueryFirstOrDefaultAsync<CategoryDto>(
                    "SELECT id, slug FROM categories WHERE slug = @slug OR name = @slug", 
                    new { slug = data.CategorySlug ?? "general" }, transaction);
                
                categoryId = categoryRecord?.Id ?? Guid.Parse("44a3aeed-7a91-43f2-aa4e-69e76cc29146");
                categorySlug = categoryRecord?.Slug ?? "general";
            }

            // 1. Create Product (Master)
            var masterId = Guid.NewGuid();
            const string masterSql = @"
                INSERT INTO products (id, category_id, title, base_sku, tags, sequence_id, created_at, fabric, stitch_type, work_heaviness, description)
                VALUES (@Id, @CategoryId, @Title, @Sku, @Tags, @SeqId, @CreatedAt, @Fabric, @Stitch, @Work, @Description)
                RETURNING id";
            
            // Auto-tag with subcategory for catalog filtering
            var tags = data.Tags ?? new List<string>();
            if (!string.IsNullOrEmpty(data.SubCategory) && data.SubCategory != "General")
            {
                var tag = data.SubCategory.ToLowerInvariant();
                if (!tags.Contains(tag)) tags.Add(tag);
            }

            await connection.ExecuteAsync(masterSql, new {
                Id = masterId,
                CategoryId = categoryId,
                Title = data.Title ?? "New Product",
                Sku = hexId,
                Tags = tags.ToArray(),
                SeqId = data.SequenceId ?? 0,
                CreatedAt = DateTime.UtcNow,
                Fabric = data.Fabric,
                Stitch = data.StitchType,
                Work = data.WorkHeaviness,
                Description = data.Description
            }, transaction);

            // 2. Create Listing (Vendor Product)
            var vendorProductId = Guid.NewGuid();
            var vendorId = await GetOrCreateDefaultVendor(connection, transaction);

            const string vendorSql = @"
                INSERT INTO vendor_listings (id, vendor_id, product_id, current_price, description, external_id)
                VALUES (@Id, @VendorId, @Pid, @Price, @Desc, @ExtId)";

            await connection.ExecuteAsync(vendorSql, new {
                Id = vendorProductId,
                VendorId = vendorId,
                Pid = masterId,
                Price = data.VendorPrice,
                Desc = data.Description,
                ExtId = vendorProductId.ToString()
            }, transaction);

            // 3. Storage & Registry
            var mediaIds = new List<Guid>();
            var mediaMap = new Dictionary<string, Guid>();

            foreach (var file in mediaFiles)
            {
                var context = new GenericContext(MediaCategory.Product, categorySlug);
                var storageTags = string.IsNullOrEmpty(data.Retention) ? null : new Dictionary<string, string> { { MediaConstants.Retention.TagKey, data.Retention } };
                var storagePath = await _storageService.UploadFileAsync(file.FileName, file.Content, file.ContentType, context, storageTags);
                
                var mediaId = Guid.NewGuid();
                const string mediaSql = @"
                    INSERT INTO media (id, storage_path, mime_type, file_size_bytes, media_type, status, category, subcategory, color)
                    VALUES (@Id, @Path, @Mime, 0, 1, 0, @Category, @SubCategory, @Color)";

                _logger.LogInformation("Creating media record {MediaId} at path {StoragePath}", mediaId, storagePath);
                await connection.ExecuteAsync(mediaSql, new {
                    Id = mediaId,
                    Path = storagePath,
                    Mime = file.ContentType,
                    Category = categorySlug,
                    SubCategory = data.SubCategory,
                    Color = file.Color ?? data.Color
                }, transaction);

                // Link to Product (The Design Gallery)
                await connection.ExecuteAsync(@"
                    INSERT INTO media_links (media_id, entity_id, entity_type, is_primary)
                    VALUES (@MediaId, @EntityId, 'product', TRUE)",
                    new { MediaId = mediaId, EntityId = masterId }, transaction);

                // Link to Listing (The Vendor Proof)
                await connection.ExecuteAsync(@"
                    INSERT INTO media_links (media_id, entity_id, entity_type, is_primary)
                    VALUES (@MediaId, @EntityId, 'vendor_listing', TRUE)",
                    new { MediaId = mediaId, EntityId = vendorProductId }, transaction);

                mediaIds.Add(mediaId);
                if (!string.IsNullOrEmpty(file.VendorMediaId))
                {
                    mediaMap[file.VendorMediaId] = mediaId;
                }
            }

            // 4. Handle Instagram Linking if SourcePostId is provided
            if (data.SourcePostId.HasValue)
            {
                var postId = data.SourcePostId.Value;

                var existingIsProduct = await connection.QueryFirstOrDefaultAsync<Guid?>(
                    "SELECT product_id FROM instagram_product_links WHERE post_id = @PostId AND link_type = 'is'", 
                    new { PostId = postId }, transaction);
                
                if (existingIsProduct.HasValue)
                {
                    throw new InvalidOperationException("This post is already linked to another product as 'is'.");
                }

                var post = await connection.QuerySingleOrDefaultAsync<InstagramPostMetadata>(
                    "SELECT storage_path as StoragePath, title as Title FROM competitor_videos WHERE id = @Id", new { Id = postId }, transaction);

                if (post != null)
                {
                    // Link the Instagram media if it has a storage path
                    if (!string.IsNullOrEmpty(post.StoragePath))
                    {
                        var mediaId = await connection.QueryFirstOrDefaultAsync<Guid?>(
                            "SELECT id FROM media WHERE storage_path = @Path LIMIT 1", 
                            new { Path = post.StoragePath }, transaction) ?? Guid.NewGuid();

                        var exists = await connection.ExecuteScalarAsync<bool>(
                            "SELECT EXISTS(SELECT 1 FROM media WHERE id = @Id)", 
                            new { Id = mediaId }, transaction);

                        if (!exists)
                        {
                            await connection.ExecuteAsync(@"
                                INSERT INTO media (id, storage_path, mime_type, file_size_bytes, media_type, status, category, subcategory)
                                VALUES (@Id, @Path, 'image/jpeg', 0, 1, 0, 'instagram', 'posts')",
                                new { Id = mediaId, Path = post.StoragePath }, transaction);
                        }

                        await connection.ExecuteAsync(@"
                            INSERT INTO media_links (media_id, entity_id, entity_type, is_primary)
                            VALUES (@MediaId, @EntityId, 'product', FALSE)
                            ON CONFLICT DO NOTHING",
                            new { MediaId = mediaId, EntityId = masterId }, transaction);
                    }

                    // Create semantic link
                    await connection.ExecuteAsync(@"
                        INSERT INTO instagram_product_links (post_id, product_id, link_type)
                        VALUES (@PostId, @ProductId, 'is')
                        ON CONFLICT (post_id, product_id) DO UPDATE SET link_type = 'is'",
                        new { PostId = postId, ProductId = masterId }, transaction);

                    // Propagate all media (including carousels/videos)
                    await PropagateMediaLinksAsync(connection, postId, masterId, transaction);
                }
            }

            transaction.Commit();

            return new VendorProduct
            {
                Id = vendorProductId,
                MasterProductId = masterId,
                VendorPrice = data.VendorPrice,
                ExclusiveDescription = data.Description,
                Category = data.Category.ToString(),
                ProductCode = hexId,
                MediaMap = mediaMap,
                Fabric = data.Fabric,
                StitchType = data.StitchType,
                WorkHeaviness = data.WorkHeaviness
            };
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            _logger.LogError(ex, "Failed to create product");
            throw;
        }
    }

    public async Task<ProductCatalogResult> GetCatalogAsync(ProductCatalogFilter filter)
    {
        using var db = GetConnection();
        var sql = @"
            SELECT 
                p.id as ""MasterProductId"",
                p.title as ""Title"",
                p.base_sku as ""ProductCode"",
                p.tags as ""Tags"",
                p.fabric as ""Fabric"",
                p.stitch_type as ""StitchType"",
                p.work_heaviness as ""WorkHeaviness"",
                p.created_at as ""CreatedAt"",
                p.is_starred as ""IsStarred"",
                p.description as ""Description"",
                c.name as ""Category"",
                (SELECT current_price FROM vendor_listings WHERE product_id = p.id LIMIT 1) as ""VendorPrice"",
                COALESCE((SELECT description FROM wa.message_groups WHERE deeplens_product_id = p.id LIMIT 1), (SELECT description FROM vendor_listings WHERE product_id = p.id LIMIT 1)) as ""VendorDescription"",
                COALESCE((
                    SELECT json_agg(json_build_object('id', m.id, 'storagePath', m.storage_path, 'color', m.color, 'isDefault', ml.is_primary, 'mediaType', m.media_type))
                    FROM media m 
                    JOIN media_links ml ON m.id = ml.media_id
                    WHERE ml.entity_id = p.id AND ml.entity_type = 'product'
                ), '[]'::json)::text as ""MediaJson"",
                (SELECT COUNT(*) FROM public.vendor_listings WHERE product_id = p.id AND is_active = true) as ""ListingCount""
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id";

        var parameters = new DynamicParameters();
        parameters.Add("Take", filter.Take);
        parameters.Add("Skip", filter.Skip);

        var whereClause = " WHERE p.is_deleted = FALSE";

        if (!string.IsNullOrEmpty(filter.Query))
        {
            whereClause += @" AND (
                p.title ILIKE @SearchQuery 
                OR p.base_sku ILIKE @SearchQuery 
                OR p.tags::text ILIKE @SearchQuery 
                OR p.description ILIKE @SearchQuery
                OR EXISTS (
                    SELECT 1 
                    FROM product_merges pm 
                    JOIN products pm_src ON pm.source_id = pm_src.id 
                    WHERE pm.target_id = p.id AND pm_src.base_sku ILIKE @SearchQuery
                )
            )";
            parameters.Add("SearchQuery", $"%{filter.Query}%");
        }

        if (!string.IsNullOrEmpty(filter.Category))
        {
            // Match against formal category slug OR tags
            whereClause += " AND (c.slug = @Category OR c.name = @Category OR p.tags::text[] @> ARRAY[@Category]::text[])";
            parameters.Add("Category", filter.Category);
        }

        if (filter.StartDate.HasValue)
        {
            whereClause += " AND p.created_at >= @StartDate";
            parameters.Add("StartDate", filter.StartDate.Value);
        }

        if (filter.EndDate.HasValue)
        {
            whereClause += " AND p.created_at <= @EndDate";
            parameters.Add("EndDate", filter.EndDate.Value);
        }

        if (filter.Fabrics != null && filter.Fabrics.Length > 0)
        {
            whereClause += " AND p.fabric = ANY(@Fabrics)";
            parameters.Add("Fabrics", filter.Fabrics);
        }

        if (filter.VendorNames != null && filter.VendorNames.Length > 0)
        {
            whereClause += @" AND EXISTS (
                SELECT 1 FROM vendor_listings vl
                JOIN vendors v ON v.id = vl.vendor_id
                WHERE vl.product_id = p.id AND v.vendor_name = ANY(@VendorNames)
            )";
            parameters.Add("VendorNames", filter.VendorNames);
        }

        if (filter.MinPrice.HasValue)
        {
            whereClause += " AND (SELECT current_price FROM vendor_listings WHERE product_id = p.id LIMIT 1) >= @MinPrice";
            parameters.Add("MinPrice", (decimal)filter.MinPrice.Value);
        }

        if (filter.MaxPrice.HasValue)
        {
            whereClause += " AND (SELECT current_price FROM vendor_listings WHERE product_id = p.id LIMIT 1) <= @MaxPrice";
            parameters.Add("MaxPrice", (decimal)filter.MaxPrice.Value);
        }

        sql += whereClause;

        sql += filter.SortBy switch
        {
            "price_low" => " ORDER BY (SELECT current_price FROM vendor_listings WHERE product_id = p.id LIMIT 1) ASC NULLS LAST",
            "price_high" => " ORDER BY (SELECT current_price FROM vendor_listings WHERE product_id = p.id LIMIT 1) DESC NULLS LAST",
            "oldest" => " ORDER BY p.created_at ASC",
            "listings_most" => " ORDER BY (SELECT COUNT(*) FROM vendor_listings WHERE product_id = p.id AND is_active = true) DESC",
            "listings_least" => " ORDER BY (SELECT COUNT(*) FROM vendor_listings WHERE product_id = p.id AND is_active = true) ASC",
            _ => " ORDER BY p.created_at DESC"
        };

        sql += " LIMIT @Take OFFSET @Skip";

        var results = await db.QueryAsync<ProductCatalogQueryResult>(sql, parameters);
        
        var products = results.Select(r => {
            var vp = new VendorProduct
            {
                Id = r.MasterProductId,
                MasterProductId = r.MasterProductId,
                Title = r.Title ?? "Untitled Product",
                ProductCode = r.ProductCode,
                VendorPrice = r.VendorPrice ?? 0,
                ExclusiveDescription = r.VendorDescription,
                Description = r.Description,
                CreatedAt = r.CreatedAt,
                Fabric = r.Fabric,
                StitchType = r.StitchType,
                WorkHeaviness = r.WorkHeaviness,
                Category = r.Category,
                ListingCount = r.ListingCount,
                IsStarred = r.IsStarred
            };

            if (r.Tags != null && string.IsNullOrEmpty(vp.Category))
            {
                vp.Category = ((string[])r.Tags).FirstOrDefault();
            }

            if (r.MediaJson != null)
            {
                var json = r.MediaJson.ToString();
                var mediaList = JsonSerializer.Deserialize<List<MediaEntry>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (mediaList != null) vp.Media = mediaList;
            }

            return vp;
        });

        var countSql = "SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.id" + whereClause;
        var totalCount = await db.ExecuteScalarAsync<int>(countSql, parameters);

        return new ProductCatalogResult { Products = products, TotalCount = totalCount };
    }

    public async Task<bool> DeleteProductAsync(Guid productId)
    {
        using var db = GetConnection();
        db.Open();
        using var transaction = db.BeginTransaction();
        
        try {
            // 1. Unlink media (don't delete files, as per manual review requirement)
            await db.ExecuteAsync(@"
                DELETE FROM media_links 
                WHERE entity_id = @Id
                AND entity_type = 'product'", 
                new { Id = productId }, transaction);

            // 2. Mark product as deleted (Soft Delete)
            var result = await db.ExecuteAsync("UPDATE products SET is_deleted = TRUE WHERE id = @Id", new { Id = productId }, transaction) > 0;
            
            transaction.Commit();
            return result;
        } catch (Exception ex) {
            transaction.Rollback();
            _logger.LogError(ex, "Failed to delete product {Id}", productId);
            return false;
        }
    }

    public async Task<bool> StarProductAsync(Guid productId, bool isStarred, CancellationToken ct = default)
    {
        using var activity = DeepLensActivitySource.StartActivity("StarProductAsync");
        try
        {
            return await _productRepository.UpdateProductStarredStatusAsync(productId, isStarred, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to star product {ProductId}", productId);
            return false;
        }
    }

    public async Task<bool> SetDefaultMediaAsync(Guid productId, Guid mediaId, CancellationToken ct = default)
    {
        using var activity = DeepLensActivitySource.StartActivity("SetDefaultMediaAsync");
        try
        {
            return await _productRepository.SetDefaultMediaAsync(productId, mediaId, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set default media {MediaId} for product {ProductId}", mediaId, productId);
            return false;
        }
    }

    public async Task<bool> StarMediaAsync(Guid productId, Guid mediaId)
    {
        using var db = GetConnection();
        using var transaction = db.BeginTransaction();
        try {
            // Unstar all media for this product
            await db.ExecuteAsync(@"
                UPDATE media_links SET is_primary = false 
                WHERE entity_type = 'product'
                AND entity_id = @Pid", 
                new { Pid = productId }, transaction);
            
            // Star the selected one
            await db.ExecuteAsync(@"
                UPDATE media_links SET is_primary = true 
                WHERE media_id = @Id 
                AND entity_type = 'product'
                AND entity_id = @Pid", 
                new { Id = mediaId, Pid = productId }, transaction);
            transaction.Commit();
            return true;
        } catch {
            transaction.Rollback();
            return false;
        }
    }

    public async Task<bool> ReorderMediaAsync(Guid productId, List<Guid> mediaIds)
    {
        // For now, order can be implicitly chronological or we add a sort_order column.
        return true;
    }

    public async Task<VendorProduct?> GetProductByIdAsync(Guid id)
    {
        using var db = GetConnection();
        
        // 1. Resolve potential merge redirects
        var targetId = await db.QuerySingleOrDefaultAsync<Guid?>(
            "SELECT target_id FROM product_merges WHERE source_id = @Id", new { Id = id });
        
        if (targetId.HasValue)
        {
            return await GetProductByIdAsync(targetId.Value);
        }

        const string sql = @"
            SELECT 
                p.id as ""Id"",
                p.id as ""MasterProductId"",
                p.title as ""Title"",
                p.base_sku as ""ProductCode"",
                p.tags as ""Tags"",
                p.fabric as ""Fabric"",
                p.stitch_type as ""StitchType"",
                p.work_heaviness as ""WorkHeaviness"",
                p.description as ""Description"",
                c.name as ""Category"",
                (SELECT current_price FROM vendor_listings WHERE product_id = p.id LIMIT 1) as ""VendorPrice"",
                COALESCE((SELECT description FROM wa.message_groups WHERE deeplens_product_id = p.id LIMIT 1), (SELECT description FROM vendor_listings WHERE product_id = p.id LIMIT 1)) as ""VendorDescription"",
                p.created_at as ""CreatedAt"",
                p.is_starred as ""IsStarred"",
                (SELECT jid FROM wa.message_groups WHERE deeplens_product_id = p.id LIMIT 1) as ""SourceJid"",
                (SELECT group_id FROM wa.message_groups WHERE deeplens_product_id = p.id LIMIT 1) as ""SourceGroupId"",
                COALESCE((
                    SELECT json_agg(json_build_object('id', m.id, 'storagePath', m.storage_path, 'color', m.color, 'isDefault', ml.is_primary, 'mediaType', m.media_type))
                    FROM media m 
                    JOIN media_links ml ON m.id = ml.media_id
                    WHERE ml.entity_id = p.id AND ml.entity_type = 'product'
                ), '[]'::json)::text as ""MediaJson"",
                COALESCE((
                    SELECT json_agg(json_build_object(
                        'id',            vl.id,
                        'vendorId',      vl.vendor_id,
                        'vendorName',    COALESCE(v.vendor_name, 'Unknown Vendor'),
                        'price',         vl.current_price,
                        'currency',      COALESCE(vl.currency, 'INR'),
                        'isPlusShipping',  vl.is_plus_shipping,
                        'description',   vl.description,
                        'isActive',      vl.is_active,
                        'updatedAt',     vl.updated_at,
                        'sourceGroupId', vl.source_group_id,
                        'sourceJid',     (SELECT jid FROM wa.message_groups WHERE group_id = vl.source_group_id LIMIT 1)
                    ) ORDER BY vl.is_active DESC, vl.updated_at DESC)
                    FROM vendor_listings vl
                    LEFT JOIN vendors v ON v.id = vl.vendor_id
                    WHERE vl.product_id = p.id
                ), '[]'::json)::text as ""ListingsJson""
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = @Id AND p.is_deleted = FALSE";

        var r = await db.QuerySingleOrDefaultAsync<ProductCatalogQueryResult>(sql, new { Id = id });
        if (r == null) return null;

        var vp = new VendorProduct {
            Id = r.MasterProductId,
            MasterProductId = r.MasterProductId,
            Title = r.Title ?? "Untitled Product",
            ProductCode = r.ProductCode,
            VendorPrice = r.VendorPrice ?? 0,
            ExclusiveDescription = r.VendorDescription,
            Description = r.Description,
            CreatedAt = r.CreatedAt,
            Fabric = r.Fabric,
            StitchType = r.StitchType,
            WorkHeaviness = r.WorkHeaviness,
            Category = r.Category,
            SourceJid = r.SourceJid,
            SourceGroupId = r.SourceGroupId,
            IsStarred = r.IsStarred
        };

        if (r.Tags != null && string.IsNullOrEmpty(vp.Category))
        {
            vp.Category = ((string[])r.Tags).FirstOrDefault();
        }

        if (r.MediaJson != null)
        {
            var json = r.MediaJson.ToString();
            var mediaList = JsonSerializer.Deserialize<List<MediaEntry>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (mediaList != null) vp.Media = mediaList;
        }

        if (r.ListingsJson != null)
        {
            try
            {
                var listings = JsonSerializer.Deserialize<List<VendorListingDto>>(r.ListingsJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (listings != null) vp.Listings = listings;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to deserialize listings JSON for product {ProductId}", id);
            }
        }

        return vp;
    }


    public async Task<MergePreviewDto> GetMergePreviewAsync(Guid sourceId, Guid targetId)
    {
        var source = await GetProductByIdAsync(sourceId);
        var target = await GetProductByIdAsync(targetId);

        if (source == null || target == null)
            throw new InvalidOperationException("Source or Target product not found");

        return new MergePreviewDto
        {
            Source = source,
            Target = target,
            CombinedImageCount = source.Media.Count + target.Media.Count,
            CombinedListingCount = 1 // Since they are merged into one design
        };
    }

    public async Task<bool> LinkInstagramPostAsync(Guid postId, Guid productId, InstagramLinkType linkType)
    {
        using var db = GetConnection();
        // 1. Ensure only one 'is' link per post
        if (linkType == InstagramLinkType.Is)
        {
            var existingIsProduct = await db.QueryFirstOrDefaultAsync<Guid?>(
                "SELECT product_id FROM instagram_product_links WHERE post_id = @PostId AND link_type = 'is'", 
                new { PostId = postId });
            
            if (existingIsProduct.HasValue && existingIsProduct.Value != productId)
            {
                throw new InvalidOperationException("This post is already linked to another product as 'is'. A post can only have one 'is' link.");
            }
        }

        const string sql = @"
            INSERT INTO instagram_product_links (post_id, product_id, link_type)
            VALUES (@PostId, @ProductId, @LinkType)
            ON CONFLICT (post_id, product_id) 
            DO UPDATE SET link_type = EXCLUDED.link_type, updated_at = NOW()";
        
        var success = await db.ExecuteAsync(sql, new { PostId = postId, ProductId = productId, LinkType = linkType.ToString().ToLower() }) > 0;

        if (success && linkType == InstagramLinkType.Is)
        {
            // Link media to the product
            var post = await db.QuerySingleOrDefaultAsync<InstagramPostMetadata>(
                "SELECT storage_path as StoragePath FROM competitor_videos WHERE id = @Id", new { Id = postId });

            if (post != null && !string.IsNullOrEmpty(post.StoragePath))
            {
                // Propagate all media (including carousels/videos)
                await PropagateMediaLinksAsync(db, postId, productId);
            }
        }

        return success;
    }

    public async Task<IEnumerable<InstagramProductLinkDto>> GetInstagramLinksAsync(Guid postId)
    {
        using var db = GetConnection();
        const string sql = @"
            SELECT l.id as ""Id"", l.post_id as ""PostId"", l.product_id as ""ProductId"", l.link_type as ""LinkType"", 
                   p.title as ""ProductTitle"", p.base_sku as ""ProductCode"",
                   (SELECT current_price FROM vendor_listings WHERE product_id = p.id LIMIT 1) as ""Price"",
                   COALESCE((
                       SELECT json_agg(json_build_object('id', m.id, 'storagePath', m.storage_path, 'color', m.color, 'isDefault', ml.is_primary))
                       FROM media m 
                       JOIN media_links ml ON m.id = ml.media_id
                       WHERE ml.entity_id = p.id AND ml.entity_type = 'product'
                   ), '[]'::json)::text as ""MediaJson""
            FROM instagram_product_links l
            JOIN products p ON l.product_id = p.id
            WHERE l.post_id = @PostId";
        
        var results = await db.QueryAsync<InstagramProductLinkDto>(sql, new { PostId = postId });
        
        foreach (var res in results)
        {
            if (!string.IsNullOrEmpty(res.MediaJson))
            {
                try {
                    res.Media = JsonSerializer.Deserialize<List<MediaEntry>>(res.MediaJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
                } catch (Exception ex) {
                    _logger.LogWarning(ex, "Failed to deserialize media JSON for product {ProductId}", res.ProductId);
                    res.Media = new();
                }
            }
        }

        return results;
    }

    public async Task<bool> UnlinkInstagramPostAsync(Guid postId, Guid productId)
    {
        using var db = GetConnection();
        db.Open();
        using var transaction = db.BeginTransaction();
        
        try
        {
            // 1. Verify link exists
            var link = await db.QueryFirstOrDefaultAsync<InstagramProductLinkInfo>(
                "SELECT link_type as LinkType FROM instagram_product_links WHERE post_id = @PostId AND product_id = @ProductId",
                new { PostId = postId, ProductId = productId }, transaction);
                
            if (link == null) return false;

            // 2. Validate if it's the sole source of existence
            if (link.LinkType == "is")
            {
                var otherIsLinksCount = await db.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM instagram_product_links WHERE product_id = @ProductId AND link_type = 'is' AND post_id != @PostId",
                    new { ProductId = productId, PostId = postId }, transaction);

                var vendorListingsCount = await db.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM vendor_listings WHERE product_id = @ProductId",
                    new { ProductId = productId }, transaction);

                if (otherIsLinksCount == 0 && vendorListingsCount == 0)
                {
                    throw new InvalidOperationException("Cannot unlink: This Instagram post is the sole source of the product's existence. Please delete the product from the catalog instead.");
                }
            }

            // 3. Delete the semantic link
            await db.ExecuteAsync(
                "DELETE FROM instagram_product_links WHERE post_id = @PostId AND product_id = @ProductId",
                new { PostId = postId, ProductId = productId }, transaction);

            // 4. Remove the media link if applicable
            var post = await db.QuerySingleOrDefaultAsync<InstagramPostMetadata>(
                "SELECT storage_path as StoragePath FROM competitor_videos WHERE id = @Id", new { Id = postId }, transaction);

            if (post != null && !string.IsNullOrEmpty(post.StoragePath))
            {
                await db.ExecuteAsync(@"
                    DELETE FROM media_links 
                    WHERE entity_id = @ProductId AND entity_type = 'product'
                    AND media_id = (SELECT id FROM media WHERE storage_path = @Path LIMIT 1)",
                    new { ProductId = productId, Path = post.StoragePath }, transaction);
            }

            transaction.Commit();
            return true;
        }
        catch (Exception)
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<VendorProduct> CreateProductFromPostAsync(Guid postId, ProductIngestionDto data)
    {
        using var connection = GetConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try {
            // 1. Fetch post metadata
            var post = await connection.QuerySingleOrDefaultAsync<InstagramPostMetadata>(
                "SELECT storage_path as StoragePath, title as Title, description as Description FROM competitor_videos WHERE id = @Id", new { Id = postId }, transaction);
            
            if (post == null) throw new InvalidOperationException("Post not found");

            // 1.5. Ensure post doesn't already have an 'is' link
            var existingIsProduct = await connection.QueryFirstOrDefaultAsync<Guid?>(
                "SELECT product_id FROM instagram_product_links WHERE post_id = @PostId AND link_type = 'is'", 
                new { PostId = postId }, transaction);
            
            if (existingIsProduct.HasValue)
            {
                throw new InvalidOperationException("This post is already linked to another product as 'is'.");
            }

            // 2. Create Product
            var nextVal = await connection.QuerySingleAsync<long>("SELECT nextval('productid_id_seq')", null, transaction);
            var hexId = $"VF{nextVal:X3}";
            var masterId = Guid.NewGuid();

            const string masterSql = @"
                INSERT INTO products (id, title, base_sku, tags, sequence_id, created_at, fabric, stitch_type, work_heaviness, category_id, description)
                VALUES (@Id, @Title, @Sku, @Tags, @SeqId, @CreatedAt, @Fabric, @Stitch, @Work, @CategoryId, @Description)";

            var tags = data.Tags ?? new List<string>();
            await connection.ExecuteAsync(masterSql, new {
                Id = masterId,
                Title = data.Title ?? post.Title ?? "New Product from IG",
                Sku = hexId,
                Tags = tags.ToArray(),
                SeqId = (int)nextVal,
                CreatedAt = DateTime.UtcNow,
                Fabric = data.Fabric,
                Stitch = data.StitchType,
                Work = data.WorkHeaviness,
                CategoryId = data.CategoryId,
                Description = data.Description ?? post.Description
            }, transaction);

            // 3. Propagate all media (including carousels/videos)
            await PropagateMediaLinksAsync(connection, postId, masterId, transaction);

            // 4. Create semantic link
            await connection.ExecuteAsync(@"
                INSERT INTO instagram_product_links (post_id, product_id, link_type)
                VALUES (@PostId, @ProductId, 'is')",
                new { PostId = postId, ProductId = masterId }, transaction);

            transaction.Commit();

            return new VendorProduct {
                Id = masterId, // Since no vendor listing yet, we return the master ID
                MasterProductId = masterId,
                ProductCode = hexId,
                Title = data.Title ?? post.Title
            };
        } catch (Exception ex) {
            transaction.Rollback();
            _logger.LogError(ex, "Failed to create product from post {PostId}", postId);
            throw;
        }
    }

    public async Task<IEnumerable<VendorProduct>> GetProductsAsync(int skip = 0, int take = 20)
    {
        var result = await GetCatalogAsync(new ProductCatalogFilter { Skip = skip, Take = take });
        return result.Products;
    }

    private async Task<Guid> GetOrCreateDefaultVendor(IDbConnection db, IDbTransaction trans)
    {
        var id = await db.QuerySingleOrDefaultAsync<Guid?>("SELECT id FROM vendors LIMIT 1", null, trans);
        if (id.HasValue) return id.Value;

        var newId = Guid.NewGuid();
        await db.ExecuteAsync("INSERT INTO vendors (id, vendor_name) VALUES (@Id, 'Default Vendor')", 
            new { Id = newId }, trans);
        return newId;
    }

    private async Task PropagateMediaLinksAsync(IDbConnection conn, Guid postId, Guid productId, IDbTransaction? transaction = null)
    {
        const string sql = @"
            INSERT INTO media_links (media_id, entity_id, entity_type, is_primary, display_order)
            SELECT ml.media_id, @ProductId, 'product', ml.is_primary, ml.display_order
            FROM media_links ml
            WHERE ml.entity_id = @PostId AND ml.entity_type = 'competitor_video'
            ON CONFLICT DO NOTHING";
        
        await conn.ExecuteAsync(sql, new { PostId = postId, ProductId = productId }, transaction);
    }

    public async Task<bool> MergeVendorProductsAsync(Guid targetMasterId, List<Guid> sourceMasterProductIds) => true;
    public async Task<bool> MergeByVendorProductIdsAsync(Guid targetMasterId, List<Guid> vendorProductIds) => true;
    public async Task<int> MergeClustersAsync(List<ProductClusterDto> clusters) => clusters.Count;
    public async Task UpdateMasterPriceAsync(Guid masterProductId, decimal sellingPrice, decimal resellerPrice) { }
    public async Task<IEnumerable<CategoryDto>> GetCategoriesAsync()
    {
        using var connection = GetConnection();
        var sql = "SELECT id, name, slug FROM public.categories ORDER BY name ASC";
        return await connection.QueryAsync<CategoryDto>(sql);
    }

    public async Task<bool> ChangeCategoryAsync(Guid productId, string categorySlug)
    {
        using var connection = GetConnection();
        
        var categoryId = await connection.QueryFirstOrDefaultAsync<Guid?>(
            "SELECT id FROM public.categories WHERE slug = @slug OR name = @slug",
            new { slug = categorySlug });

        if (!categoryId.HasValue)
        {
            throw new Exception($"Category not found: {categorySlug}");
        }

        var sql = @"
            UPDATE public.products 
            SET category_id = @CategoryId 
            WHERE id = @ProductId";

        var rowsAffected = await connection.ExecuteAsync(sql, new { CategoryId = categoryId, ProductId = productId });
        return rowsAffected > 0;
    }

    public async Task<ProductFilterOptions> GetFilterOptionsAsync()
    {
        using var db = GetConnection();

        var fabrics = (await db.QueryAsync<string>(
            @"SELECT DISTINCT fabric FROM products
              WHERE is_deleted = FALSE
              AND fabric IS NOT NULL
              AND fabric != 'Unknown'
              AND fabric != ''
              ORDER BY fabric ASC"
        )).ToList();

        var vendors = (await db.QueryAsync<string>(
            @"SELECT DISTINCT v.vendor_name FROM vendors v
              JOIN vendor_listings vl ON vl.vendor_id = v.id
              JOIN products p ON p.id = vl.product_id
              WHERE p.is_deleted = FALSE
              AND v.vendor_name IS NOT NULL
              ORDER BY v.vendor_name ASC"
        )).ToList();

        var priceRange = await db.QueryFirstOrDefaultAsync(
            @"SELECT
                COALESCE(CAST(MIN(current_price) AS int), 0) as MinPrice,
                COALESCE(CAST(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY current_price) AS int), 20000) as MaxPrice
              FROM vendor_listings
              WHERE current_price > 0 AND current_price < 1000000"
        );

        return new ProductFilterOptions
        {
            Fabrics = fabrics,
            Vendors = vendors,
            MinPrice = (int)(priceRange?.MinPrice ?? 0),
            MaxPrice = (int)(priceRange?.MaxPrice ?? 20000)
        };
    }

    public async Task<int> BackfillFabricAsync()
    {
        using var db = GetConnection();
        return await db.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM products WHERE is_deleted = FALSE AND (fabric IS NULL OR fabric = 'Unknown' OR fabric = '')"
        );
    }

    private record InstagramPostMetadata(string? StoragePath, string? Title, string? Description);
    private record InstagramProductLinkInfo(string LinkType);
    private class ProductCatalogQueryResult
    {
        public Guid MasterProductId { get; init; }
        public string? Title { get; init; }
        public string? ProductCode { get; init; }
        public string[]? Tags { get; init; }
        public string? Fabric { get; init; }
        public string? StitchType { get; init; }
        public string? WorkHeaviness { get; init; }
        public DateTime CreatedAt { get; init; }
        public bool IsStarred { get; init; }
        public string? Description { get; init; }
        public string? Category { get; init; }
        public decimal? VendorPrice { get; init; }
        public string? VendorDescription { get; init; }
        public string? MediaJson { get; init; }
        public string? ListingsJson { get; init; }
        public string? SourceJid { get; init; }
        public string? SourceGroupId { get; init; }
        public int ListingCount { get; init; }
    }

    public async Task<ProductShareLogDto> RecordShareAsync(Guid productId, string platform, string? descriptionUsed, CancellationToken ct = default)
    {
        using var activity = DeepLensActivitySource.StartActivity("ProductService.RecordShareAsync");
        
        try 
        {
            var log = new ProductShareLog
            {
                Id = Guid.NewGuid(),
                ProductId = productId,
                Platform = platform,
                SharedAt = DateTimeOffset.UtcNow,
                DescriptionUsed = descriptionUsed
            };

            await _productShareLogRepository.AddAsync(log, ct);

            return new ProductShareLogDto
            {
                Id = log.Id,
                ProductId = log.ProductId,
                Platform = log.Platform,
                SharedAt = log.SharedAt,
                DescriptionUsed = log.DescriptionUsed
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record product share for ProductId {ProductId}", productId);
            throw;
        }
    }

    public async Task<string> GenerateShareDescriptionAsync(Guid productId, string? targetPlatform, CancellationToken ct = default)
    {
        using var activity = DeepLensActivitySource.StartActivity("ProductService.GenerateShareDescriptionAsync");
        
        try
        {
            var product = await GetProductByIdAsync(productId);
            if (product == null)
            {
                throw new InvalidOperationException($"Product {productId} not found");
            }

            // TODO: Integrate dynamic generation via AI reasoning service instead of mock.
            // Mocking the AI service generation for now.
            var platformText = targetPlatform ?? "social media";
            return $"Check out our amazing {product.Title}! Available now for {product.VendorPrice} INR. Perfect for your {platformText} followers!";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate share description for ProductId {ProductId}", productId);
            throw;
        }
    }
}

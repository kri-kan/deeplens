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

namespace DeepLens.Infrastructure.Services;

public class ProductService : IProductService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<ProductService> _logger;
    private readonly DeepLens.Infrastructure.Services.IStorageService _storageService;
    private readonly string _connectionString;

    public ProductService(
        IConfiguration configuration, 
        ILogger<ProductService> logger,
        DeepLens.Infrastructure.Services.IStorageService storageService)
    {
        _configuration = configuration;
        _logger = logger;
        _storageService = storageService;
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

            // 1. Create Product (Master)
            var masterId = Guid.NewGuid();
            const string masterSql = @"
                INSERT INTO products (id, title, base_sku, tags, sequence_id, created_at, fabric, stitch_type, work_heaviness, description)
                VALUES (@Id, @Title, @Sku, @Tags, @SeqId, @CreatedAt, @Fabric, @Stitch, @Work, @Description)
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
                Title = data.MasterTitle ?? "New Product",
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
                var context = StorageContext.Create(data.Category, data.SubCategory);
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
                    Category = context.Bucket,
                    SubCategory = context.Folder,
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
                p.id as masterproductid,
                p.title as title,
                p.base_sku as productcode,
                p.tags as tags,
                p.fabric as fabric,
                p.stitch_type as stitchtype,
                p.work_heaviness as workheaviness,
                p.created_at as CreatedAt,
                p.description as description,
                c.name as category,
                (SELECT current_price FROM vendor_listings WHERE product_id = p.id LIMIT 1) as vendorprice,
                (SELECT description FROM vendor_listings WHERE product_id = p.id LIMIT 1) as vendordescription,
                COALESCE((
                    SELECT json_agg(json_build_object('id', m.id, 'path', m.storage_path, 'color', m.color, 'is_default', ml.is_primary))
                    FROM media m 
                    JOIN media_links ml ON m.id = ml.media_id
                    WHERE ml.entity_id = p.id AND ml.entity_type = 'product'
                ), '[]'::json) as media_json
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_deleted = FALSE";

        var parameters = new DynamicParameters();
        parameters.Add("Take", filter.Take);
        parameters.Add("Skip", filter.Skip);

        if (!string.IsNullOrEmpty(filter.Query))
        {
            sql += " AND (p.title ILIKE @SearchQuery OR p.base_sku ILIKE @SearchQuery OR p.tags::text ILIKE @SearchQuery OR p.description ILIKE @SearchQuery)";
            parameters.Add("SearchQuery", $"%{filter.Query}%");
        }

        if (!string.IsNullOrEmpty(filter.Category))
        {
            // Match against formal category slug OR tags
            sql += " AND (c.slug = @Category OR c.name = @Category OR p.tags::text[] @> ARRAY[@Category]::text[])";
            parameters.Add("Category", filter.Category);
        }

        if (filter.StartDate.HasValue)
        {
            sql += " AND p.created_at >= @StartDate";
            parameters.Add("StartDate", filter.StartDate.Value);
        }

        if (filter.EndDate.HasValue)
        {
            sql += " AND p.created_at <= @EndDate";
            parameters.Add("EndDate", filter.EndDate.Value);
        }

        sql += filter.SortBy switch
        {
            "price_low" => " ORDER BY (SELECT current_price FROM vendor_listings WHERE product_id = p.id LIMIT 1) ASC NULLS LAST",
            "price_high" => " ORDER BY (SELECT current_price FROM vendor_listings WHERE product_id = p.id LIMIT 1) DESC NULLS LAST",
            _ => " ORDER BY p.created_at DESC"
        };

        sql += " LIMIT @Take OFFSET @Skip";

        var results = await db.QueryAsync<dynamic>(sql, parameters);
        
        var products = results.Select(r => {
            var vp = new VendorProduct
            {
                Id = r.masterproductid ?? Guid.Empty,
                MasterProductId = r.masterproductid ?? Guid.Empty,
                Title = r.title,
                ProductCode = r.productcode,
                VendorPrice = r.vendorprice ?? 0m,
                ExclusiveDescription = r.vendordescription,
                Description = r.description,
                CreatedAt = r.createdat,
                Fabric = r.fabric,
                StitchType = r.stitchtype,
                WorkHeaviness = r.workheaviness,
                Category = r.category
            };

            if (r.tags != null && string.IsNullOrEmpty(vp.Category))
            {
                vp.Category = ((string[])r.tags).FirstOrDefault();
            }

            if (r.media_json != null)
            {
                var mediaList = JsonSerializer.Deserialize<List<MediaEntry>>(r.media_json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (mediaList != null) vp.Media = mediaList;
            }

            return vp;
        });

        var countSql = "SELECT COUNT(*) FROM products p WHERE is_deleted = FALSE";
        var countParameters = new DynamicParameters();
        if (!string.IsNullOrEmpty(filter.Category))
        {
            countSql += " AND p.tags::text[] @> ARRAY[@Category]::text[]";
            countParameters.Add("Category", filter.Category);
        }

        var totalCount = await db.ExecuteScalarAsync<int>(countSql, countParameters);

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
                p.id as id,
                p.id as masterproductid,
                p.title as title,
                p.base_sku as productcode,
                p.tags as tags,
                p.fabric as fabric,
                p.stitch_type as stitchtype,
                p.work_heaviness as workheaviness,
                p.description as description,
                c.name as category,
                (SELECT current_price FROM vendor_listings WHERE product_id = p.id LIMIT 1) as vendorprice,
                (SELECT description FROM vendor_listings WHERE product_id = p.id LIMIT 1) as vendordescription,
                p.created_at as CreatedAt,
                COALESCE((
                    SELECT json_agg(json_build_object('id', m.id, 'path', m.storage_path, 'color', m.color, 'is_default', ml.is_primary))
                    FROM media m 
                    JOIN media_links ml ON m.id = ml.media_id
                    WHERE ml.entity_id = p.id AND ml.entity_type = 'product'
                ), '[]'::json) as media_json
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = @Id AND p.is_deleted = FALSE";

        var r = await db.QuerySingleOrDefaultAsync<dynamic>(sql, new { Id = id });
        if (r == null) return null;

        var vp = new VendorProduct {
            Id = r.id ?? r.masterproductid ?? Guid.Empty,
            MasterProductId = r.masterproductid ?? Guid.Empty,
            Title = r.title,
            ProductCode = r.productcode,
            VendorPrice = r.vendorprice ?? 0m,
            ExclusiveDescription = r.vendordescription,
            Description = r.description,
            CreatedAt = r.createdat,
            Fabric = r.fabric,
            StitchType = r.stitchtype,
            WorkHeaviness = r.workheaviness,
            Category = r.category
        };

        if (r.tags != null && string.IsNullOrEmpty(vp.Category))
        {
            vp.Category = ((string[])r.tags).FirstOrDefault();
        }

        if (r.media_json != null)
        {
            var mediaList = JsonSerializer.Deserialize<List<MediaEntry>>(r.media_json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (mediaList != null) vp.Media = mediaList;
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

    public async Task<bool> LinkInstagramPostAsync(Guid postId, Guid productId, string linkType)
    {
        using var db = GetConnection();
        // 1. Ensure only one 'is' link per post (by clearing others if this is an 'is' link)
        if (linkType.ToLower() == "is")
        {
            await db.ExecuteAsync("UPDATE instagram_product_links SET link_type = 'contains' WHERE post_id = @PostId AND link_type = 'is'", new { PostId = postId });
        }

        const string sql = @"
            INSERT INTO instagram_product_links (post_id, product_id, link_type)
            VALUES (@PostId, @ProductId, @LinkType)
            ON CONFLICT (post_id, product_id) 
            DO UPDATE SET link_type = EXCLUDED.link_type, updated_at = NOW()";
        
        return await db.ExecuteAsync(sql, new { PostId = postId, ProductId = productId, LinkType = linkType.ToLower() }) > 0;
    }

    public async Task<IEnumerable<InstagramProductLinkDto>> GetInstagramLinksAsync(Guid postId)
    {
        using var db = GetConnection();
        const string sql = @"
            SELECT l.id, l.post_id as PostId, l.product_id as ProductId, l.link_type as LinkType, 
                   p.title as ProductTitle, p.base_sku as ProductCode
            FROM instagram_product_links l
            JOIN products p ON l.product_id = p.id
            WHERE l.post_id = @PostId";
        
        return await db.QueryAsync<InstagramProductLinkDto>(sql, new { PostId = postId });
    }

    public async Task<VendorProduct> CreateProductFromPostAsync(Guid postId, ProductIngestionDto data)
    {
        using var connection = GetConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try {
            // 1. Fetch post metadata
            var post = await connection.QuerySingleOrDefaultAsync<dynamic>(
                "SELECT * FROM competitor_videos WHERE id = @Id", new { Id = postId }, transaction);
            
            if (post == null) throw new InvalidOperationException("Post not found");

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
                Title = data.MasterTitle ?? post.title ?? "New Product from IG",
                Sku = hexId,
                Tags = tags.ToArray(),
                SeqId = (int)nextVal,
                CreatedAt = DateTime.UtcNow,
                Fabric = data.Fabric,
                Stitch = data.StitchType,
                Work = data.WorkHeaviness,
                CategoryId = data.CategoryId,
                Description = data.Description ?? post.description
            }, transaction);

            // 3. Link existing media if storage_path exists
            if (!string.IsNullOrEmpty(post.storage_path))
            {
                // Re-use existing media record if it exists
                var mediaId = await connection.QueryFirstOrDefaultAsync<Guid?>(
                    "SELECT id FROM media WHERE storage_path = @Path LIMIT 1", 
                    new { Path = post.storage_path }, transaction) ?? Guid.NewGuid();

                var exists = await connection.ExecuteScalarAsync<bool>(
                    "SELECT EXISTS(SELECT 1 FROM media WHERE id = @Id)", 
                    new { Id = mediaId }, transaction);

                if (!exists)
                {
                    var ext = Path.GetExtension(post.storage_path).ToLower();
                    var mimeType = ext switch {
                        ".png" => "image/png",
                        ".webp" => "image/webp",
                        _ => "image/jpeg"
                    };

                    await connection.ExecuteAsync(@"
                        INSERT INTO media (id, storage_path, mime_type, file_size_bytes, media_type, status, category, subcategory, color)
                        VALUES (@Id, @Path, @Mime, 0, 1, 0, 'instagram', 'posts', @Color)",
                        new { Id = mediaId, Path = post.storage_path, Mime = mimeType, Color = data.Color }, transaction);
                }

                await connection.ExecuteAsync(@"
                    INSERT INTO media_links (media_id, entity_id, entity_type, is_primary)
                    VALUES (@MediaId, @EntityId, 'product', TRUE)",
                    new { MediaId = mediaId, EntityId = masterId }, transaction);
            }

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
                Title = data.MasterTitle ?? post.title
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

    public async Task<bool> MergeVendorProductsAsync(Guid targetMasterId, List<Guid> sourceMasterProductIds) => true;
    public async Task<bool> MergeByVendorProductIdsAsync(Guid targetMasterId, List<Guid> vendorProductIds) => true;
    public async Task<int> MergeClustersAsync(List<ProductClusterDto> clusters) => clusters.Count;
    public async Task UpdateMasterPriceAsync(Guid masterProductId, decimal sellingPrice, decimal resellerPrice) { }
    public async Task<IEnumerable<CategoryDto>> GetCategoriesAsync()
    {
        using var db = GetConnection();
        return await db.QueryAsync<CategoryDto>("SELECT id, name, slug FROM categories ORDER BY name ASC");
    }
}

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
            var nextVal = await connection.QuerySingleAsync<long>("SELECT nextval('\"productId_id_seq\"')", null, transaction);
            var hexId = $"VF{nextVal:X3}";
            data.SequenceId = (int)nextVal;

            // 1. Create Product (Master)
            var masterId = Guid.NewGuid();
            const string masterSql = @"
                INSERT INTO products (id, title, base_sku, tags, sequence_id, created_at)
                VALUES (@Id, @Title, @Sku, @Tags, @SeqId, @CreatedAt)
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
                CreatedAt = DateTime.UtcNow
            }, transaction);

            // 2. Create Variant
            var variantId = Guid.NewGuid();
            await connection.ExecuteAsync("INSERT INTO product_variants (id, product_id) VALUES (@Id, @Pid)", 
                new { Id = variantId, Pid = masterId }, transaction);

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
                    INSERT INTO media (id, variant_id, storage_path, mime_type, file_size_bytes, media_type, status, category, subcategory)
                    VALUES (@Id, @VarId, @Path, @Mime, 0, 1, 0, @Category, @SubCategory)";

                _logger.LogInformation("Creating media record {MediaId} for variant {VarId} at path {StoragePath}", mediaId, variantId, storagePath);
                await connection.ExecuteAsync(mediaSql, new {
                    Id = mediaId,
                    VarId = variantId,
                    Path = storagePath,
                    Mime = file.ContentType,
                    Category = context.Bucket,
                    SubCategory = context.Folder
                }, transaction);

                mediaIds.Add(mediaId);
                if (!string.IsNullOrEmpty(file.VendorMediaId))
                {
                    mediaMap[file.VendorMediaId] = mediaId;
                }
            }

            // 4. Create Listing (Vendor Product)
            var vendorProductId = Guid.NewGuid();
            var vendorId = await GetOrCreateDefaultVendor(connection, transaction);

            const string vendorSql = @"
                INSERT INTO vendor_listings (id, vendor_id, variant_id, current_price, description, external_id)
                VALUES (@Id, @VendorId, @VarId, @Price, @Desc, @ExtId)";

            await connection.ExecuteAsync(vendorSql, new {
                Id = vendorProductId,
                VendorId = vendorId,
                VarId = variantId,
                Price = data.VendorPrice,
                Desc = data.Description,
                ExtId = vendorProductId.ToString()
            }, transaction);

            transaction.Commit();

            return new VendorProduct
            {
                Id = vendorProductId,
                MasterProductId = masterId,
                VendorPrice = data.VendorPrice,
                ExclusiveDescription = data.Description,
                Category = data.Category.ToString(),
                ProductCode = hexId,
                MediaMap = mediaMap
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
                sl.id as id,
                p.id as masterproductid,
                p.title as title,
                p.base_sku as productcode,
                p.tags as tags,
                sl.current_price as vendorprice,
                sl.description as description,
                p.created_at as CreatedAt,
                COALESCE((
                    SELECT json_agg(json_build_object('id', m.id, 'path', m.storage_path, 'is_default', m.is_default))
                    FROM media m 
                    WHERE m.variant_id = pv.id
                ), '[]'::json) as media_json
            FROM products p
            JOIN product_variants pv ON p.id = pv.product_id
            JOIN vendor_listings sl ON pv.id = sl.variant_id
            WHERE p.is_deleted = FALSE";

        var parameters = new DynamicParameters();
        parameters.Add("Take", filter.Take);
        parameters.Add("Skip", filter.Skip);

        if (!string.IsNullOrEmpty(filter.Category))
        {
            sql += " AND p.tags::text[] @> ARRAY[@Category]::text[]";
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
            "price_low" => " ORDER BY sl.current_price ASC",
            "price_high" => " ORDER BY sl.current_price DESC",
            _ => " ORDER BY p.created_at DESC"
        };

        sql += " LIMIT @Take OFFSET @Skip";

        var results = await db.QueryAsync<dynamic>(sql, parameters);
        
        var products = results.Select(r => {
            var vp = new VendorProduct
            {
                Id = r.id ?? Guid.Empty,
                MasterProductId = r.masterproductid ?? Guid.Empty,
                Title = r.title,
                ProductCode = r.productcode,
                VendorPrice = r.vendorprice ?? 0m,
                ExclusiveDescription = r.description,
                CreatedAt = r.createdat
            };

            if (r.tags != null)
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
            // 1. Get all media paths for this product
            var media = await db.QueryAsync<(string storage_path, string thumbnail_s, string thumbnail_m, string thumbnail_l)>(@"
                SELECT storage_path, thumbnail_s, thumbnail_m, thumbnail_l 
                FROM media 
                WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = @Id)", 
                new { Id = productId }, transaction);

            // 2. Delete media from storage
            foreach (var m in media)
            {
                if (!string.IsNullOrEmpty(m.storage_path)) {
                    try { await _storageService.DeleteFileAsync(m.storage_path); } catch { }
                }
                if (!string.IsNullOrEmpty(m.thumbnail_s)) {
                    try { await _storageService.DeleteFileAsync(m.thumbnail_s); } catch { }
                }
                if (!string.IsNullOrEmpty(m.thumbnail_m)) {
                    try { await _storageService.DeleteFileAsync(m.thumbnail_m); } catch { }
                }
                if (!string.IsNullOrEmpty(m.thumbnail_l)) {
                    try { await _storageService.DeleteFileAsync(m.thumbnail_l); } catch { }
                }
            }

            // 3. Delete media records
            await db.ExecuteAsync(@"
                DELETE FROM media 
                WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = @Id)", 
                new { Id = productId }, transaction);

            // 4. Mark product as deleted (Soft Delete)
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
            // Unstar all media for this product's variants
            await db.ExecuteAsync(@"
                UPDATE media SET is_default = false 
                WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = @Pid)", 
                new { Pid = productId }, transaction);
            
            // Star the selected one
            await db.ExecuteAsync("UPDATE media SET is_default = true WHERE id = @Id", new { Id = mediaId }, transaction);
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
        const string sql = @"
            SELECT 
                sl.id as id,
                p.id as masterproductid,
                p.title as title,
                p.base_sku as productcode,
                p.tags as tags,
                sl.current_price as vendorprice,
                sl.description as description,
                p.created_at as CreatedAt,
                COALESCE((
                    SELECT json_agg(json_build_object('id', m.id, 'path', m.storage_path, 'is_default', m.is_default))
                    FROM media m 
                    WHERE m.variant_id = pv.id
                ), '[]'::json) as media_json
            FROM products p
            JOIN product_variants pv ON p.id = pv.product_id
            JOIN vendor_listings sl ON pv.id = sl.variant_id
            WHERE sl.id = @Id AND p.is_deleted = FALSE";

        var r = await db.QuerySingleOrDefaultAsync<dynamic>(sql, new { Id = id });
        if (r == null) return null;

        var vp = new VendorProduct
        {
            Id = r.id ?? Guid.Empty,
            MasterProductId = r.masterproductid ?? Guid.Empty,
            Title = r.title,
            ProductCode = r.productcode,
            VendorPrice = r.vendorprice ?? 0m,
            ExclusiveDescription = r.description,
            CreatedAt = r.createdat
        };

        if (r.tags != null)
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
}

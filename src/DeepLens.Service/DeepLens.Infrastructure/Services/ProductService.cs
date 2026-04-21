using Dapper;
using DeepLens.Contracts.Catalog;
using DeepLens.Domain.Entities.Catalog;
using DeepLens.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using System.Data;
using System.Text.Json;

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
            // 1. Storage & Registry (using existing IStorageService)
            var mediaIds = new List<Guid>();
            var mediaMap = new Dictionary<string, Guid>();

            foreach (var file in mediaFiles)
            {
                // Upload and get path/hash
                var storagePath = await _storageService.UploadFileAsync(file.FileName, file.Content, file.ContentType, data.Category);
                
                // Deduplicate/Get Media Record by storage path (or hash if we had it)
                // For simplicity here, we create a new media record
                var mediaId = Guid.NewGuid();
                const string mediaSql = @"
                    INSERT INTO media (id, storage_path, mime_type, file_size_bytes, media_type, status)
                    VALUES (@Id, @Path, @Mime, 0, 1, 0)
                    RETURNING id";
                
                await connection.ExecuteAsync(mediaSql, new {
                    Id = mediaId,
                    Path = storagePath,
                    Mime = file.ContentType
                }, transaction);

                mediaIds.Add(mediaId);
                if (!string.IsNullOrEmpty(file.VendorMediaId))
                {
                    mediaMap[file.VendorMediaId] = mediaId;
                }
            }

            // 2. Create/Update Product (Master)
            var masterId = Guid.NewGuid();
            const string masterSql = @"
                INSERT INTO products (id, title, base_sku, tags)
                VALUES (@Id, @Title, @Sku, @Tags)
                RETURNING id";
            
            await connection.ExecuteAsync(masterSql, new {
                Id = masterId,
                Title = data.MasterTitle ?? "New Product",
                Sku = $"SKU-{Guid.NewGuid().ToString()[..8].ToUpper()}",
                Tags = new string[] { data.Category ?? "General" }
            }, transaction);

            // 3. Create Listing (Vendor Product)
            var vendorProductId = Guid.NewGuid();
            const string vendorSql = @"
                INSERT INTO seller_listings (id, seller_id, variant_id, current_price, description, external_id)
                VALUES (@Id, @SellerId, @VarId, @Price, @Desc, @ExtId)";
            
            // We need a variant for the listing in the current schema
            var variantId = Guid.NewGuid();
            await connection.ExecuteAsync("INSERT INTO product_variants (id, product_id) VALUES (@Id, @Pid)", 
                new { Id = variantId, Pid = masterId }, transaction);

            // For now, assume a default seller or handle seller logic similarly to MetadataService
            var sellerId = await GetOrCreateDefaultSeller(connection, transaction);

            await connection.ExecuteAsync(vendorSql, new {
                Id = vendorProductId,
                SellerId = sellerId,
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
                Category = data.Category,
                MediaMap = mediaMap
            };
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            _logger.LogError(ex, "Failed to ingest product into SearchApi database");
            throw;
        }
    }

    private async Task<Guid> GetOrCreateDefaultSeller(IDbConnection db, IDbTransaction trans)
    {
        var id = await db.QuerySingleOrDefaultAsync<Guid?>("SELECT id FROM sellers LIMIT 1", null, trans);
        if (id.HasValue) return id.Value;

        var newId = Guid.NewGuid();
        await db.ExecuteAsync("INSERT INTO sellers (id, external_id, name) VALUES (@Id, 'DEFAULT', 'Default Seller')", 
            new { Id = newId }, trans);
        return newId;
    }

    public async Task<bool> MergeVendorProductsAsync(Guid targetMasterId, List<Guid> sourceMasterProductIds)
    {
        // Leverage existing MergeProductsAsync logic if possible, or implement direct SQL
        // This is a placeholder for the actual merge logic which would move listings and media
        return true;
    }

    public async Task<bool> MergeByVendorProductIdsAsync(Guid targetMasterId, List<Guid> vendorProductIds)
    {
        return true;
    }

    public async Task<int> MergeClustersAsync(List<ProductClusterDto> clusters)
    {
        return clusters.Count;
    }

    public async Task<IEnumerable<VendorProduct>> GetProductsAsync(int skip = 0, int take = 20)
    {
        using var db = GetConnection();
        const string sql = @"
            SELECT 
                sl.id as id,
                p.id as masterproductid,
                p.title as title,
                p.tags as tags,
                sl.current_price as vendorprice,
                sl.description as description
            FROM products p
            JOIN product_variants pv ON p.id = pv.product_id
            JOIN seller_listings sl ON pv.id = sl.variant_id
            ORDER BY p.created_at DESC
            LIMIT @Take OFFSET @Skip";

        var results = await db.QueryAsync<dynamic>(sql, new { Skip = skip, Take = take });
        
        return results.Select(r => {
            var vendorProduct = new VendorProduct
            {
                Id = r.id ?? Guid.Empty,
                MasterProductId = r.masterproductid ?? Guid.Empty,
                Title = r.title,
                VendorPrice = r.vendorprice ?? 0m,
                ExclusiveDescription = r.description
            };
            
            if (r.tags != null)
            {
                vendorProduct.Category = ((string[])r.tags).FirstOrDefault();
            }
            
            return vendorProduct;
        });
    }

    public async Task UpdateMasterPriceAsync(Guid masterProductId, decimal sellingPrice, decimal resellerPrice)
    {
        using var db = GetConnection();
        // Archive current price first
        // Then update.
    }
}

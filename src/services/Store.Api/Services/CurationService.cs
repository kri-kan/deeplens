using System.Text.Json;
using Dapper;
using Npgsql;
using Store.Api.Models;

namespace Store.Api.Services;

public class CurationService : ICurationService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private readonly string _connectionString;
    private readonly IMediaStorageService _mediaStorage;
    private readonly IStoreEventPublisher _eventPublisher;
    private readonly ILogger<CurationService> _logger;

    public CurationService(
        IConfiguration config,
        IMediaStorageService mediaStorage,
        IStoreEventPublisher eventPublisher,
        ILogger<CurationService> logger)
    {
        _mediaStorage = mediaStorage;
        _eventPublisher = eventPublisher;
        _logger = logger;

        _connectionString = config.GetConnectionString("StoreDb")
            ?? config["ConnectionStrings:StoreDb"]
            ?? config["ConnectionStrings__StoreDb"]
            ?? "Host=192.168.0.170;Port=5432;Database=deeplens_store;Username=postgres;Password=Krikank1$";
    }

    public async Task<int> BatchPublishProductsAsync(List<PublishProductRequest> requests, string authorEmail)
    {
        if (requests == null || requests.Count == 0) return 0;

        var count = 0;
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        foreach (var req in requests)
        {
            // 1. Check existing product by vayyari_product_id
            const string findSql = @"SELECT id, mrp, sale_price FROM products WHERE vayyari_product_id = @VayyariId LIMIT 1;";
            var existing = await conn.QuerySingleOrDefaultAsync<(Guid Id, decimal Mrp, decimal SalePrice)?>(findSql, new { VayyariId = req.VayyariProductId });
            var productId = existing?.Id ?? Guid.NewGuid();

            // 2. Ingest media into MinIO store-assets & register in central media_assets
            var mediaTasks = req.MediaUrls.Select((url, idx) => 
                _mediaStorage.IngestProductMediaAsync(productId, req.ProductCode, url, idx + 1, idx == 0)
            );
            var mediaList = (await Task.WhenAll(mediaTasks)).ToList();

            var mrp = req.BaseCost > 0 ? Math.Round(req.BaseCost * 1.6m, 0) : 9999m;
            var salePrice = req.BaseCost > 0 ? Math.Round(req.BaseCost * 1.3m, 0) : 7999m;

            var tags = new List<string> { req.CategoryName, req.Fabric ?? "Ethnic" }.Where(t => !string.IsNullOrEmpty(t)).ToList();
            var mediaJson = JsonSerializer.Serialize(mediaList);
            var tagsJson = JsonSerializer.Serialize(tags);

            // 3. Upsert product into deeplens_store.products
            const string upsertSql = @"
                INSERT INTO products (
                    id, vayyari_product_id, product_code, title, description, category_name, fabric,
                    base_cost, mrp, sale_price, lifecycle_status, stock_quantity,
                    colorway_name, color_hex, swatch_template, media_order, tags, is_published, published_at,
                    created_at, updated_at
                ) VALUES (
                    @Id, @VayyariProductId, @ProductCode, @Title, @Description, @CategoryName, @Fabric,
                    @BaseCost, @Mrp, @SalePrice, 'available', 10,
                    'Standard', '#1B4D3E', 'solid', @MediaOrder::jsonb, @Tags::jsonb, true, NOW(),
                    NOW(), NOW()
                )
                ON CONFLICT (vayyari_product_id) DO UPDATE SET
                    product_code = EXCLUDED.product_code,
                    title = EXCLUDED.title,
                    description = COALESCE(EXCLUDED.description, products.description),
                    category_name = EXCLUDED.category_name,
                    fabric = COALESCE(EXCLUDED.fabric, products.fabric),
                    base_cost = EXCLUDED.base_cost,
                    mrp = CASE WHEN products.mrp > 0 THEN products.mrp ELSE EXCLUDED.mrp END,
                    sale_price = CASE WHEN products.sale_price > 0 THEN products.sale_price ELSE EXCLUDED.sale_price END,
                    media_order = EXCLUDED.media_order,
                    tags = EXCLUDED.tags,
                    is_published = true,
                    updated_at = NOW()
                RETURNING id;";

            var savedId = await conn.ExecuteScalarAsync<Guid>(upsertSql, new
            {
                Id = productId,
                VayyariProductId = req.VayyariProductId,
                ProductCode = req.ProductCode,
                Title = req.Title,
                Description = req.Description,
                CategoryName = req.CategoryName,
                Fabric = req.Fabric,
                BaseCost = req.BaseCost,
                Mrp = mrp,
                SalePrice = salePrice,
                MediaOrder = mediaJson,
                Tags = tagsJson
            });

            // 4. Record audit entry
            const string auditSql = @"
                INSERT INTO product_audits (
                    id, product_id, action_type, field_name, old_value, new_value, author_email, created_at
                ) VALUES (
                    gen_random_uuid(), @ProductId, @ActionType, 'publish', @OldValue, 'published_in_store', @AuthorEmail, NOW()
                );";

            await conn.ExecuteAsync(auditSql, new
            {
                ProductId = savedId,
                ActionType = existing == null ? "created" : "re_synced",
                OldValue = existing == null ? null : "synced",
                AuthorEmail = authorEmail
            });

            count++;
        }

        _logger.LogInformation("Batch published {Count} products directly into PostgreSQL & MinIO by {Author}", count, authorEmail);
        return count;
    }

    public async Task<List<StoreProductDto>> GetInStoreProductsAsync(string? category = null, string? search = null, string? lifecycle = null)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        var sql = @"
            SELECT 
                id, vayyari_product_id AS VayyariProductId, product_code AS ProductCode,
                title, description, category_name AS CategoryName, fabric,
                base_cost AS BaseCost, mrp, sale_price AS SalePrice,
                lifecycle_status AS LifecycleStatus, stock_quantity AS StockQuantity,
                color_group_id AS ColorGroupId, colorway_name AS ColorwayName, color_hex AS ColorHex,
                swatch_template AS SwatchTemplate,
                color_groups::text AS ColorGroupsJson,
                media_order::text AS MediaOrderJson, tags::text AS TagsJson,
                is_published AS IsPublished, published_at AS PublishedAt
            FROM products
            WHERE is_published = true
              AND (@Category IS NULL OR LOWER(category_name) = LOWER(@Category) OR @Category = 'All')
              AND (@Lifecycle IS NULL OR LOWER(lifecycle_status) = LOWER(@Lifecycle) OR @Lifecycle = 'All')
              AND (@Search IS NULL OR 
                   title ILIKE '%' || @Search || '%' OR 
                   product_code ILIKE '%' || @Search || '%' OR 
                   category_name ILIKE '%' || @Search || '%')
            ORDER BY published_at DESC;";

        var rows = await conn.QueryAsync<ProductDbRow>(sql, new
        {
            Category = string.IsNullOrWhiteSpace(category) ? null : category,
            Lifecycle = string.IsNullOrWhiteSpace(lifecycle) ? null : lifecycle,
            Search = string.IsNullOrWhiteSpace(search) ? null : search.Trim()
        });

        return rows.Select(MapToDto).ToList();
    }

    public async Task<StoreProductCurationDto?> GetProductCurationAsync(Guid id)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string sql = @"
            SELECT 
                id, vayyari_product_id AS VayyariProductId, product_code AS ProductCode,
                title, description, category_name AS CategoryName, fabric,
                base_cost AS BaseCost, mrp, sale_price AS SalePrice,
                lifecycle_status AS LifecycleStatus, stock_quantity AS StockQuantity,
                color_group_id AS ColorGroupId, colorway_name AS ColorwayName, color_hex AS ColorHex,
                swatch_template AS SwatchTemplate,
                color_groups::text AS ColorGroupsJson,
                media_order::text AS MediaOrderJson, tags::text AS TagsJson,
                is_published AS IsPublished, published_at AS PublishedAt
            FROM products
            WHERE id = @Id OR vayyari_product_id = @Id
            LIMIT 1;";

        var row = await conn.QuerySingleOrDefaultAsync<ProductDbRow>(sql, new { Id = id });
        if (row == null) return null;

        var product = MapToDto(row);

        const string auditSql = @"
            SELECT 
                id, product_id AS StoreProductId, action_type AS ActionType,
                field_name AS FieldName, old_value AS OldValue, new_value AS NewValue,
                author_email AS AuthorEmail, created_at AS CreatedAt
            FROM product_audits
            WHERE product_id = @ProductId
            ORDER BY created_at DESC;";

        var audits = (await conn.QueryAsync<StoreProductAuditDto>(auditSql, new { ProductId = product.Id })).ToList();

        // Calculate dwell suggestions
        var suggestions = new List<string>();
        var highestDwell = product.MediaOrder.OrderByDescending(m => m.DwellSeconds).FirstOrDefault();
        if (highestDwell != null && !highestDwell.IsCover && highestDwell.DwellSeconds > 3.0)
        {
            suggestions.Add($"Media Slide #{highestDwell.Order} has the highest dwell time ({highestDwell.DwellSeconds:F1}s). Suggest promoting to Cover Hero.");
        }

        return new StoreProductCurationDto(
            Product: product,
            AuditHistory: audits,
            SmartDwellSuggestions: suggestions
        );
    }

    public async Task<bool> UpdateProductCurationAsync(Guid id, UpdateCurationRequest req, string authorEmail)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string findSql = @"
            SELECT 
                id, vayyari_product_id AS VayyariProductId, product_code AS ProductCode,
                title, description, category_name AS CategoryName, fabric,
                base_cost AS BaseCost, mrp, sale_price AS SalePrice,
                lifecycle_status AS LifecycleStatus, stock_quantity AS StockQuantity,
                color_group_id AS ColorGroupId, colorway_name AS ColorwayName, color_hex AS ColorHex,
                media_order::text AS MediaOrderJson, tags::text AS TagsJson,
                is_published AS IsPublished, published_at AS PublishedAt
            FROM products
            WHERE id = @Id OR vayyari_product_id = @Id
            LIMIT 1;";

        var current = await conn.QuerySingleOrDefaultAsync<ProductDbRow>(findSql, new { Id = id });
        if (current == null) return false;

        var realId = current.Id;

        // Log field audits
        if (req.LifecycleStatus != null && req.LifecycleStatus != current.LifecycleStatus)
        {
            await LogAuditAsync(conn, realId, "lifecycle_changed", "lifecycleStatus", current.LifecycleStatus, req.LifecycleStatus, authorEmail);
        }
        if (req.SalePrice.HasValue && req.SalePrice.Value != current.SalePrice)
        {
            await LogAuditAsync(conn, realId, "price_updated", "salePrice", $"₹{current.SalePrice:N0}", $"₹{req.SalePrice.Value:N0}", authorEmail);
        }
        if (req.Mrp.HasValue && req.Mrp.Value != current.Mrp)
        {
            await LogAuditAsync(conn, realId, "price_updated", "mrp", $"₹{current.Mrp:N0}", $"₹{req.Mrp.Value:N0}", authorEmail);
        }
        if (req.ColorwayName != null && req.ColorwayName != current.ColorwayName)
        {
            await LogAuditAsync(conn, realId, "colorway_updated", "colorwayName", current.ColorwayName, req.ColorwayName, authorEmail);
        }

        string? mediaOrderJson = req.MediaOrder != null ? JsonSerializer.Serialize(req.MediaOrder) : null;
        string? colorGroupsJson = req.ColorGroups != null ? JsonSerializer.Serialize(req.ColorGroups) : null;
        string? tagsJson = req.Tags != null ? JsonSerializer.Serialize(req.Tags) : null;

        const string updateSql = @"
            UPDATE products SET
                lifecycle_status = COALESCE(@LifecycleStatus, lifecycle_status),
                stock_quantity = COALESCE(@StockQuantity, stock_quantity),
                mrp = COALESCE(@Mrp, mrp),
                sale_price = COALESCE(@SalePrice, sale_price),
                description = COALESCE(@Description, description),
                color_group_id = COALESCE(@ColorGroupId, color_group_id),
                colorway_name = COALESCE(@ColorwayName, colorway_name),
                color_hex = COALESCE(@ColorHex, color_hex),
                swatch_template = COALESCE(@SwatchTemplate, swatch_template),
                color_groups = CASE WHEN @ColorGroups::jsonb IS NOT NULL THEN @ColorGroups::jsonb ELSE color_groups END,
                media_order = CASE WHEN @MediaOrder::jsonb IS NOT NULL THEN @MediaOrder::jsonb ELSE media_order END,
                tags = CASE WHEN @Tags::jsonb IS NOT NULL THEN @Tags::jsonb ELSE tags END,
                updated_at = NOW()
            WHERE id = @Id;";

        await conn.ExecuteAsync(updateSql, new
        {
            Id = realId,
            LifecycleStatus = req.LifecycleStatus,
            StockQuantity = req.StockQuantity,
            Mrp = req.Mrp,
            SalePrice = req.SalePrice,
            Description = req.Description,
            ColorGroupId = req.ColorGroupId,
            ColorwayName = req.ColorwayName,
            ColorHex = req.ColorHex,
            SwatchTemplate = req.SwatchTemplate,
            ColorGroups = colorGroupsJson,
            MediaOrder = mediaOrderJson,
            Tags = tagsJson
        });

        // Publish event to Kafka
        await _eventPublisher.PublishAsync(
            "store.product.curation.updated",
            realId.ToString(),
            new
            {
                productId = realId,
                productCode = current.ProductCode,
                updatedBy = authorEmail,
                updatedAt = DateTime.UtcNow
            }
        );

        _logger.LogInformation("Successfully updated curation in PostgreSQL for product {Id} ({Code}) by {Author}", realId, current.ProductCode, authorEmail);
        return true;
    }

    public async Task<StoreMediaItemDto?> SaveModifiedMediaAsync(
        Guid productId,
        string mediaId,
        Stream imageStream,
        string mimeType,
        string? recipeJson,
        string authorEmail,
        CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        const string findSql = @"
            SELECT id, product_code, media_order::text AS MediaOrderJson
            FROM products
            WHERE id = @Id OR vayyari_product_id = @Id
            LIMIT 1;";

        var prod = await conn.QuerySingleOrDefaultAsync<(Guid Id, string ProductCode, string? MediaOrderJson)?>(findSql, new { Id = productId });
        if (prod == null) return null;

        var mediaList = string.IsNullOrEmpty(prod.Value.MediaOrderJson)
            ? new List<StoreMediaItemDto>()
            : JsonSerializer.Deserialize<List<StoreMediaItemDto>>(prod.Value.MediaOrderJson, JsonOptions) ?? new();

        var itemIndex = mediaList.FindIndex(m => m.Id == mediaId);
        if (itemIndex < 0) return null;

        var currentItem = mediaList[itemIndex];

        // 1. Upload modified image to MinIO
        var modifiedUrl = await _mediaStorage.UploadModifiedMediaAsync(prod.Value.Id, mediaId, imageStream, mimeType, ct);

        // 2. Preserve original URL
        var originalUrl = currentItem.OriginalUrl ?? currentItem.Url;

        // 3. Update StoreMediaItemDto
        var updatedItem = currentItem with
        {
            Url = modifiedUrl,
            OriginalUrl = originalUrl,
            ModifiedUrl = modifiedUrl,
            ActiveDisplaySource = "modified",
            HasModified = true,
            TransformRecipe = recipeJson
        };

        mediaList[itemIndex] = updatedItem;

        // 4. Persist updated media_order
        var updatedMediaJson = JsonSerializer.Serialize(mediaList);
        const string updateSql = @"UPDATE products SET media_order = @MediaOrder::jsonb, updated_at = NOW() WHERE id = @Id;";
        await conn.ExecuteAsync(updateSql, new { MediaOrder = updatedMediaJson, Id = prod.Value.Id });

        await LogAuditAsync(conn, prod.Value.Id, "media_modified", "mediaOrder", currentItem.Url, modifiedUrl, authorEmail);
        _logger.LogInformation("Updated modified media for product {ProductCode}, mediaId {MediaId}", prod.Value.ProductCode, mediaId);

        return updatedItem;
    }

    public async Task<StoreMediaItemDto?> DeleteModifiedMediaAsync(
        Guid productId,
        string mediaId,
        string authorEmail,
        CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        const string findSql = @"
            SELECT id, product_code, media_order::text AS MediaOrderJson
            FROM products
            WHERE id = @Id OR vayyari_product_id = @Id
            LIMIT 1;";

        var prod = await conn.QuerySingleOrDefaultAsync<(Guid Id, string ProductCode, string? MediaOrderJson)?>(findSql, new { Id = productId });
        if (prod == null) return null;

        var mediaList = string.IsNullOrEmpty(prod.Value.MediaOrderJson)
            ? new List<StoreMediaItemDto>()
            : JsonSerializer.Deserialize<List<StoreMediaItemDto>>(prod.Value.MediaOrderJson, JsonOptions) ?? new();

        var itemIndex = mediaList.FindIndex(m => m.Id == mediaId);
        if (itemIndex < 0) return null;

        var currentItem = mediaList[itemIndex];
        if (string.IsNullOrEmpty(currentItem.ModifiedUrl)) return currentItem;

        // 1. Delete from MinIO
        await _mediaStorage.DeleteModifiedMediaAsync(currentItem.ModifiedUrl, ct);

        // 2. Revert to original
        var originalUrl = currentItem.OriginalUrl ?? currentItem.Url;
        var updatedItem = currentItem with
        {
            Url = originalUrl,
            ModifiedUrl = null,
            ActiveDisplaySource = "original",
            HasModified = false,
            TransformRecipe = null
        };

        mediaList[itemIndex] = updatedItem;

        // 3. Persist
        var updatedMediaJson = JsonSerializer.Serialize(mediaList);
        const string updateSql = @"UPDATE products SET media_order = @MediaOrder::jsonb, updated_at = NOW() WHERE id = @Id;";
        await conn.ExecuteAsync(updateSql, new { MediaOrder = updatedMediaJson, Id = prod.Value.Id });

        await LogAuditAsync(conn, prod.Value.Id, "media_reverted", "mediaOrder", currentItem.ModifiedUrl, originalUrl, authorEmail);
        _logger.LogInformation("Reverted modified media to original for product {ProductCode}, mediaId {MediaId}", prod.Value.ProductCode, mediaId);

        return updatedItem;
    }

    public async Task<StoreMediaItemDto?> ToggleMediaDisplaySourceAsync(
        Guid productId,
        string mediaId,
        string activeDisplaySource,
        string authorEmail,
        CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        const string findSql = @"
            SELECT id, product_code, media_order::text AS MediaOrderJson
            FROM products
            WHERE id = @Id OR vayyari_product_id = @Id
            LIMIT 1;";

        var prod = await conn.QuerySingleOrDefaultAsync<(Guid Id, string ProductCode, string? MediaOrderJson)?>(findSql, new { Id = productId });
        if (prod == null) return null;

        var mediaList = string.IsNullOrEmpty(prod.Value.MediaOrderJson)
            ? new List<StoreMediaItemDto>()
            : JsonSerializer.Deserialize<List<StoreMediaItemDto>>(prod.Value.MediaOrderJson, JsonOptions) ?? new();

        var itemIndex = mediaList.FindIndex(m => m.Id == mediaId);
        if (itemIndex < 0) return null;

        var currentItem = mediaList[itemIndex];
        var isModified = activeDisplaySource.Equals("modified", StringComparison.OrdinalIgnoreCase);

        var activeUrl = isModified && !string.IsNullOrEmpty(currentItem.ModifiedUrl)
            ? currentItem.ModifiedUrl
            : currentItem.OriginalUrl ?? currentItem.Url;

        var updatedItem = currentItem with
        {
            Url = activeUrl,
            ActiveDisplaySource = isModified ? "modified" : "original"
        };

        mediaList[itemIndex] = updatedItem;

        var updatedMediaJson = JsonSerializer.Serialize(mediaList);
        const string updateSql = @"UPDATE products SET media_order = @MediaOrder::jsonb, updated_at = NOW() WHERE id = @Id;";
        await conn.ExecuteAsync(updateSql, new { MediaOrder = updatedMediaJson, Id = prod.Value.Id });

        await LogAuditAsync(conn, prod.Value.Id, "media_display_toggled", "activeDisplaySource", currentItem.ActiveDisplaySource, activeDisplaySource, authorEmail);

        return updatedItem;
    }

    private static async Task LogAuditAsync(NpgsqlConnection conn, Guid productId, string actionType, string fieldName, string? oldValue, string? newValue, string author)
    {
        const string sql = @"
            INSERT INTO product_audits (
                id, product_id, action_type, field_name, old_value, new_value, author_email, created_at
            ) VALUES (
                gen_random_uuid(), @ProductId, @ActionType, @FieldName, @OldValue, @NewValue, @Author, NOW()
            );";

        await conn.ExecuteAsync(sql, new
        {
            ProductId = productId,
            ActionType = actionType,
            FieldName = fieldName,
            OldValue = oldValue,
            NewValue = newValue,
            Author = author
        });
    }

    private static StoreProductDto MapToDto(ProductDbRow r)
    {
        var media = string.IsNullOrEmpty(r.MediaOrderJson)
            ? new List<StoreMediaItemDto>()
            : JsonSerializer.Deserialize<List<StoreMediaItemDto>>(r.MediaOrderJson, JsonOptions) ?? new();

        var colorGroups = string.IsNullOrEmpty(r.ColorGroupsJson)
            ? null
            : JsonSerializer.Deserialize<List<StoreColorGroupDto>>(r.ColorGroupsJson, JsonOptions);

        var tags = string.IsNullOrEmpty(r.TagsJson)
            ? new List<string>()
            : JsonSerializer.Deserialize<List<string>>(r.TagsJson, JsonOptions) ?? new();

        return new StoreProductDto(
            Id: r.Id,
            VayyariProductId: r.VayyariProductId,
            ProductCode: r.ProductCode,
            Title: r.Title,
            Description: r.Description,
            CategoryName: r.CategoryName,
            Fabric: r.Fabric,
            BaseCost: r.BaseCost,
            Mrp: r.Mrp,
            SalePrice: r.SalePrice,
            LifecycleStatus: r.LifecycleStatus,
            StockQuantity: r.StockQuantity,
            ColorGroupId: r.ColorGroupId,
            ColorwayName: r.ColorwayName,
            ColorHex: r.ColorHex,
            SwatchTemplate: r.SwatchTemplate,
            ColorGroups: colorGroups,
            MediaOrder: media,
            Tags: tags,
            IsPublished: r.IsPublished,
            PublishedAt: r.PublishedAt
        );
    }

    private class ProductDbRow
    {
        public Guid Id { get; set; }
        public Guid VayyariProductId { get; set; }
        public string ProductCode { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public string? Fabric { get; set; }
        public decimal BaseCost { get; set; }
        public decimal Mrp { get; set; }
        public decimal SalePrice { get; set; }
        public string LifecycleStatus { get; set; } = string.Empty;
        public int StockQuantity { get; set; }
        public Guid? ColorGroupId { get; set; }
        public string ColorwayName { get; set; } = string.Empty;
        public string ColorHex { get; set; } = string.Empty;
        public string? SwatchTemplate { get; set; }
        public string? ColorGroupsJson { get; set; }
        public string? MediaOrderJson { get; set; }
        public string? TagsJson { get; set; }
        public bool IsPublished { get; set; }
        public DateTime PublishedAt { get; set; }
    }
}

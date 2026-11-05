using System.Text.Json;
using Dapper;
using Npgsql;
using Store.Api.Models;
using DeepLens.Contracts.Events;

namespace Store.Api.Services;

public class CurationService : ICurationService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private readonly string _connectionString;
    private readonly IMediaStorageService _mediaStorage;
    private readonly IStoreEventPublisher _eventPublisher;
    private readonly ILogger<CurationService> _logger;

    static CurationService()
    {
        DefaultTypeMap.MatchNamesWithUnderscores = true;
    }

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
            // 1. Check existing product by vayyari_product_id, parent_catalog_id, or product_code
            const string findSql = @"
                SELECT id, mrp, sale_price, media_order::text AS MediaOrderJson, parent_catalog_id AS ParentCatalogId
                FROM products 
                WHERE vayyari_product_id = @VayyariId 
                   OR parent_catalog_id = @VayyariId 
                   OR LOWER(product_code) = LOWER(@ProductCode) 
                   OR LOWER(parent_product_code) = LOWER(@ProductCode)
                ORDER BY product_code ASC 
                LIMIT 1;";

            var existing = await conn.QuerySingleOrDefaultAsync<ExistingProductRecord>(findSql, new 
            { 
                VayyariId = req.VayyariProductId,
                ProductCode = req.ProductCode
            });
            var productId = existing?.Id ?? Guid.NewGuid();

            var existingMedia = string.IsNullOrEmpty(existing?.MediaOrderJson)
                ? new List<StoreMediaItemDto>()
                : JsonSerializer.Deserialize<List<StoreMediaItemDto>>(existing.MediaOrderJson, JsonOptions) ?? new();

            // Prepare normalized incoming media items (supporting both mediaItems and legacy mediaUrls)
            var incomingItems = req.MediaItems != null && req.MediaItems.Count > 0
                ? req.MediaItems
                : (req.MediaUrls ?? new List<string>()).Select(u => new PublishMediaItemDto(null, u, 1)).ToList();

            // 2. Ingest or reuse media into MinIO store-assets, matching by catalogMediaId or sourceUrl
            var mediaTasks = incomingItems.Select(async (item, idx) =>
            {
                var order = idx + 1;
                var isCover = idx == 0;

                // Check if we already have this exact asset in existing product media
                var matched = existingMedia.FirstOrDefault(m =>
                    (!string.IsNullOrEmpty(item.CatalogMediaId) && m.CatalogMediaId == item.CatalogMediaId) ||
                    (!string.IsNullOrEmpty(item.Url) && (m.SourceUrl == item.Url || m.Url == item.Url))
                );

                if (matched != null)
                {
                    // Existing asset! Retain existing swatch grouping (colorGroupId), modifications, and flags
                    return matched with
                    {
                        Order = order,
                        IsCover = isCover,
                        CatalogMediaId = item.CatalogMediaId ?? matched.CatalogMediaId,
                        SourceUrl = item.Url ?? matched.SourceUrl
                    };
                }

                // New media asset to ingest
                return await _mediaStorage.IngestProductMediaAsync(
                    productId,
                    req.ProductCode,
                    item.Url,
                    order,
                    isCover,
                    item.CatalogMediaId
                );
            });

            var mediaList = (await Task.WhenAll(mediaTasks)).ToList();

            // 2b. Prune any MinIO objects + media_assets rows that are no longer in the incoming set.
            //     This covers original copies AND any modified/transformed derivatives linked to them.
            var survivingUrls = mediaList.Select(m => m.Url).ToHashSet();
            await _mediaStorage.PruneOrphanedMediaAsync(productId, survivingUrls);

            var mrp = req.BaseCost > 0 ? Math.Round(req.BaseCost * 1.6m, 0) : 9999m;
            var salePrice = req.BaseCost > 0 ? Math.Round(req.BaseCost * 1.3m, 0) : 7999m;

            var tags = new List<string> { req.CategoryName, req.Fabric ?? "Ethnic" }.Where(t => !string.IsNullOrEmpty(t)).ToList();
            var mediaJson = JsonSerializer.Serialize(mediaList);
            var tagsJson = JsonSerializer.Serialize(tags);

            // 3. Upsert product into deeplens_store.products
            Guid savedId;
            if (existing != null)
            {
                savedId = existing.Id;
                const string updateSql = @"
                    UPDATE products SET
                        product_code = @ProductCode,
                        title = @Title,
                        description = COALESCE(@Description, description),
                        category_name = @CategoryName,
                        fabric = COALESCE(@Fabric, fabric),
                        base_cost = @BaseCost,
                        mrp = CASE WHEN mrp > 0 THEN mrp ELSE @Mrp END,
                        sale_price = CASE WHEN sale_price > 0 THEN sale_price ELSE @SalePrice END,
                        media_order = @MediaOrder::jsonb,
                        tags = @Tags::jsonb,
                        is_published = true,
                        published_at = NOW(),
                        is_review_pending = true,
                        review_reason = 'media_updated',
                        updated_at = NOW()
                    WHERE id = @Id;";

                await conn.ExecuteAsync(updateSql, new
                {
                    Id = savedId,
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

                // Cascade review pending to sibling variants
                const string cascadeReviewSql = @"
                    UPDATE products 
                    SET is_review_pending = true, review_reason = 'media_updated', updated_at = NOW()
                    WHERE (parent_catalog_id = @VayyariId OR (@ParentCatalogId IS NOT NULL AND parent_catalog_id = @ParentCatalogId))
                      AND id != @Id;";

                await conn.ExecuteAsync(cascadeReviewSql, new
                {
                    VayyariId = req.VayyariProductId,
                    ParentCatalogId = existing.ParentCatalogId,
                    Id = savedId
                });
            }
            else
            {
                savedId = productId;
                const string insertSql = @"
                    INSERT INTO products (
                        id, vayyari_product_id, product_code, title, description, category_name, fabric,
                        base_cost, mrp, sale_price, lifecycle_status, stock_quantity,
                        colorway_name, color_hex, swatch_template, media_order, tags, is_published, published_at,
                        is_review_pending, review_reason,
                        created_at, updated_at
                    ) VALUES (
                        @Id, @VayyariProductId, @ProductCode, @Title, @Description, @CategoryName, @Fabric,
                        @BaseCost, @Mrp, @SalePrice, 'available', 10,
                        'Standard', '#1B4D3E', 'solid', @MediaOrder::jsonb, @Tags::jsonb, true, NOW(),
                        false, NULL,
                        NOW(), NOW()
                    );";

                await conn.ExecuteAsync(insertSql, new
                {
                    Id = savedId,
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
            }

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

    public async Task<StoreProductDto?> GetProductByCodeAsync(string code)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        var trimmedCode = code.Trim();
        var isGuid = Guid.TryParse(trimmedCode, out var guidVal);

        const string sql = @"
            WITH siblings AS (
                SELECT 
                    p2.parent_catalog_id,
                    json_agg(
                        json_build_object(
                            'productCode', p2.product_code,
                            'colorHex', p2.color_hex,
                            'colorwayName', p2.colorway_name,
                            'heroImageUrl', p2.media_order->0->>'url'
                        ) ORDER BY p2.product_code
                    ) AS sibling_swatches
                FROM products p2
                WHERE p2.is_published = true 
                  AND p2.parent_catalog_id IS NOT NULL
                  AND p2.lifecycle_status != 'deleted'
                GROUP BY p2.parent_catalog_id
            ),
            waitlist_counts AS (
                SELECT product_id, COUNT(*) AS waitlist_count
                FROM product_waitlists
                GROUP BY product_id
            )
            SELECT 
                p.id, p.vayyari_product_id AS VayyariProductId, p.product_code AS ProductCode,
                p.title, p.description, p.category_name AS CategoryName, p.fabric,
                p.base_cost AS BaseCost, p.mrp, p.sale_price AS SalePrice,
                p.lifecycle_status AS LifecycleStatus, p.stock_quantity AS StockQuantity,
                p.color_group_id AS ColorGroupId, p.colorway_name AS ColorwayName, p.color_hex AS ColorHex,
                p.swatch_template AS SwatchTemplate,
                p.parent_catalog_id AS ParentCatalogId,
                p.catalog_color_group_id AS CatalogColorGroupId,
                p.parent_product_code AS ParentProductCode,
                p.previous_lifecycle_status AS PreviousLifecycleStatus,
                p.take_down_expires_at AS TakeDownExpiresAt,
                COALESCE(p.is_re_evaluation_pending, false) AS IsReEvaluationPending,
                COALESCE(p.is_review_pending, false) AS IsReviewPending,
                p.review_reason AS ReviewReason,
                COALESCE(w.waitlist_count, 0) AS WaitlistCount,
                p.color_groups::text AS ColorGroupsJson,
                p.media_order::text AS MediaOrderJson, 
                p.tags::text AS TagsJson,
                p.skus::text AS SkusJson,
                p.is_published AS IsPublished, 
                p.published_at AS PublishedAt,
                s.sibling_swatches::text AS SiblingSwatchesJson
            FROM products p
            LEFT JOIN siblings s ON p.parent_catalog_id = s.parent_catalog_id
            LEFT JOIN waitlist_counts w ON p.id = w.product_id
            WHERE LOWER(p.product_code) = LOWER(@Code)
               OR (LOWER(p.product_code) = LOWER(@Code || '01'))
               OR (@IsGuid = true AND (p.id = @GuidVal OR p.vayyari_product_id = @GuidVal))
            ORDER BY (CASE WHEN LOWER(p.product_code) = LOWER(@Code) THEN 0 ELSE 1 END)
            LIMIT 1;";

        var row = await conn.QuerySingleOrDefaultAsync<ProductDbRow>(sql, new
        {
            Code = trimmedCode,
            IsGuid = isGuid,
            GuidVal = isGuid ? guidVal : Guid.Empty
        });

        return row != null ? MapToDto(row) : null;
    }

    public async Task<bool> UpdateLifecycleStatusAsync(UpdateLifecycleRequest req, string authorEmail)
    {
        if (req == null || string.IsNullOrWhiteSpace(req.Status)) return false;
        if (!req.ProductId.HasValue && !req.ParentId.HasValue) return false;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        DateTime? expiresAt = req.TakeDownExpiresAt;
        if (!expiresAt.HasValue && req.TimeoutHours.HasValue)
        {
            expiresAt = DateTime.UtcNow.AddHours(req.TimeoutHours.Value);
        }
        else if (!expiresAt.HasValue && req.TimeoutDays.HasValue)
        {
            expiresAt = DateTime.UtcNow.AddDays(req.TimeoutDays.Value);
        }

        var normalizedStatus = req.Status.Trim().ToLowerInvariant();

        const string updateSql = @"
            UPDATE products
            SET
                lifecycle_status = CASE 
                    WHEN @Status = 'paused' THEN 'paused'
                    WHEN @Status IN ('available', 'reactivate') AND lifecycle_status = 'paused' 
                        THEN COALESCE(previous_lifecycle_status, 'available')
                    ELSE @Status
                END,
                previous_lifecycle_status = CASE
                    WHEN @Status = 'paused' THEN 
                        CASE WHEN lifecycle_status != 'paused' THEN lifecycle_status ELSE previous_lifecycle_status END
                    WHEN @Status IN ('available', 'reactivate') AND lifecycle_status = 'paused' THEN NULL
                    ELSE previous_lifecycle_status
                END,
                take_down_expires_at = CASE
                    WHEN @Status = 'paused' THEN @TakeDownExpiresAt::timestamptz
                    ELSE NULL
                END,
                is_re_evaluation_pending = FALSE,
                updated_at = NOW()
            WHERE (@ParentId IS NOT NULL AND (parent_catalog_id = @ParentId OR id = @ParentId))
               OR (@ProductId IS NOT NULL AND (id = @ProductId OR vayyari_product_id = @ProductId))
            RETURNING id, product_code, lifecycle_status, previous_lifecycle_status;";

        var updatedRows = (await conn.QueryAsync<(Guid Id, string ProductCode, string LifecycleStatus, string? PreviousStatus)>(updateSql, new
        {
            ParentId = req.ParentId,
            ProductId = req.ProductId,
            Status = normalizedStatus,
            TakeDownExpiresAt = expiresAt
        })).ToList();

        if (updatedRows.Count == 0) return false;

        foreach (var row in updatedRows)
        {
            await LogAuditAsync(conn, row.Id, "lifecycle_changed", "lifecycleStatus", row.PreviousStatus, row.LifecycleStatus, authorEmail);
            await _eventPublisher.PublishAsync(
                "store.product.curation.updated",
                row.Id.ToString(),
                new
                {
                    productId = row.Id,
                    productCode = row.ProductCode,
                    lifecycleStatus = row.LifecycleStatus,
                    updatedBy = authorEmail,
                    updatedAt = DateTime.UtcNow
                }
            );
        }

        _logger.LogInformation("Updated lifecycle status to {Status} for {Count} products by {Author}", req.Status, updatedRows.Count, authorEmail);
        return true;
    }

    public async Task<bool> JoinWaitlistAsync(Guid productId, Guid customerId)
    {
        if (productId == Guid.Empty || customerId == Guid.Empty) return false;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string findSql = @"SELECT id FROM products WHERE id = @Id OR vayyari_product_id = @Id LIMIT 1;";
        var realId = await conn.ExecuteScalarAsync<Guid?>(findSql, new { Id = productId });
        if (!realId.HasValue) return false;

        const string insertSql = @"
            INSERT INTO product_waitlists (id, product_id, customer_id, created_at)
            VALUES (gen_random_uuid(), @ProductId, @CustomerId, NOW())
            ON CONFLICT (product_id, customer_id) DO NOTHING;";

        await conn.ExecuteAsync(insertSql, new
        {
            ProductId = realId.Value,
            CustomerId = customerId
        });

        _logger.LogInformation("Customer {CustomerId} joined waitlist for product {ProductId}", customerId, realId.Value);
        return true;
    }

    public async Task<List<StoreProductDto>> GetReEvaluationQueueAsync()
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        await conn.ExecuteAsync(@"
            UPDATE products 
            SET is_re_evaluation_pending = TRUE, updated_at = NOW() 
            WHERE lifecycle_status = 'paused' 
              AND take_down_expires_at <= NOW() 
              AND is_re_evaluation_pending = FALSE;");

        const string sql = @"
            WITH siblings AS (
                SELECT 
                    p2.parent_catalog_id,
                    json_agg(
                        json_build_object(
                            'productCode', p2.product_code,
                            'colorHex', p2.color_hex,
                            'colorwayName', p2.colorway_name,
                            'heroImageUrl', p2.media_order->0->>'url'
                        ) ORDER BY p2.product_code
                    ) AS sibling_swatches
                FROM products p2
                WHERE p2.is_published = true 
                  AND p2.parent_catalog_id IS NOT NULL
                  AND p2.lifecycle_status != 'deleted'
                GROUP BY p2.parent_catalog_id
            ),
            waitlist_counts AS (
                SELECT product_id, COUNT(*) AS waitlist_count
                FROM product_waitlists
                GROUP BY product_id
            )
            SELECT 
                p.id, p.vayyari_product_id AS VayyariProductId, p.product_code AS ProductCode,
                p.title, p.description, p.category_name AS CategoryName, p.fabric,
                p.base_cost AS BaseCost, p.mrp, p.sale_price AS SalePrice,
                p.lifecycle_status AS LifecycleStatus, p.stock_quantity AS StockQuantity,
                p.color_group_id AS ColorGroupId, p.colorway_name AS ColorwayName, p.color_hex AS ColorHex,
                p.swatch_template AS SwatchTemplate,
                p.parent_catalog_id AS ParentCatalogId,
                p.catalog_color_group_id AS CatalogColorGroupId,
                p.parent_product_code AS ParentProductCode,
                p.previous_lifecycle_status AS PreviousLifecycleStatus,
                p.take_down_expires_at AS TakeDownExpiresAt,
                COALESCE(p.is_re_evaluation_pending, false) AS IsReEvaluationPending,
                COALESCE(p.is_review_pending, false) AS IsReviewPending,
                p.review_reason AS ReviewReason,
                COALESCE(w.waitlist_count, 0) AS WaitlistCount,
                p.color_groups::text AS ColorGroupsJson,
                p.media_order::text AS MediaOrderJson, 
                p.tags::text AS TagsJson,
                p.skus::text AS SkusJson,
                p.is_published AS IsPublished, 
                p.published_at AS PublishedAt,
                s.sibling_swatches::text AS SiblingSwatchesJson
            FROM products p
            LEFT JOIN siblings s ON p.parent_catalog_id = s.parent_catalog_id
            LEFT JOIN waitlist_counts w ON p.id = w.product_id
            WHERE p.lifecycle_status = 'paused' 
              AND (p.take_down_expires_at <= NOW() OR p.is_re_evaluation_pending = TRUE)
            ORDER BY p.take_down_expires_at ASC NULLS LAST;";

        var rows = await conn.QueryAsync<ProductDbRow>(sql);
        return rows.Select(MapToDto).ToList();
    }

    public async Task<List<StoreProductDto>> GetInStoreProductsAsync(string? category = null, string? search = null, string? lifecycle = null)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        var sql = @"
            WITH siblings AS (
                SELECT 
                    p2.parent_catalog_id,
                    json_agg(
                        json_build_object(
                            'productCode', p2.product_code,
                            'colorHex', p2.color_hex,
                            'colorwayName', p2.colorway_name,
                            'heroImageUrl', p2.media_order->0->>'url'
                        ) ORDER BY p2.product_code
                    ) AS sibling_swatches
                FROM products p2
                WHERE p2.is_published = true 
                  AND p2.parent_catalog_id IS NOT NULL
                  AND p2.lifecycle_status != 'deleted'
                GROUP BY p2.parent_catalog_id
            ),
            waitlist_counts AS (
                SELECT product_id, COUNT(*) AS waitlist_count
                FROM product_waitlists
                GROUP BY product_id
            )
            SELECT 
                p.id, p.vayyari_product_id AS VayyariProductId, p.product_code AS ProductCode,
                p.title, p.description, p.category_name AS CategoryName, p.fabric,
                p.base_cost AS BaseCost, p.mrp, p.sale_price AS SalePrice,
                p.lifecycle_status AS LifecycleStatus, p.stock_quantity AS StockQuantity,
                p.color_group_id AS ColorGroupId, p.colorway_name AS ColorwayName, p.color_hex AS ColorHex,
                p.swatch_template AS SwatchTemplate,
                p.parent_catalog_id AS ParentCatalogId,
                p.catalog_color_group_id AS CatalogColorGroupId,
                p.parent_product_code AS ParentProductCode,
                p.previous_lifecycle_status AS PreviousLifecycleStatus,
                p.take_down_expires_at AS TakeDownExpiresAt,
                COALESCE(p.is_re_evaluation_pending, false) AS IsReEvaluationPending,
                COALESCE(p.is_review_pending, false) AS IsReviewPending,
                p.review_reason AS ReviewReason,
                COALESCE(w.waitlist_count, 0) AS WaitlistCount,
                p.color_groups::text AS ColorGroupsJson,
                p.media_order::text AS MediaOrderJson, 
                p.tags::text AS TagsJson,
                p.skus::text AS SkusJson,
                p.is_published AS IsPublished, 
                p.published_at AS PublishedAt,
                s.sibling_swatches::text AS SiblingSwatchesJson
            FROM products p
            LEFT JOIN siblings s ON p.parent_catalog_id = s.parent_catalog_id
            LEFT JOIN waitlist_counts w ON p.id = w.product_id
            WHERE p.is_published = true
              AND (@Category IS NULL OR LOWER(p.category_name) = LOWER(@Category) OR @Category = 'All')
              AND (@Lifecycle IS NULL OR LOWER(p.lifecycle_status) = LOWER(@Lifecycle) OR @Lifecycle = 'All')
              AND (@Search IS NULL OR 
                   p.title ILIKE '%' || @Search || '%' OR 
                   p.product_code ILIKE '%' || @Search || '%' OR 
                   p.category_name ILIKE '%' || @Search || '%' OR
                   COALESCE(p.fabric, '') ILIKE '%' || @Search || '%' OR
                   p.colorway_name ILIKE '%' || @Search || '%' OR
                   word_similarity(@Search, p.title) > 0.35 OR
                   word_similarity(@Search, p.product_code) > 0.40 OR
                   word_similarity(@Search, COALESCE(p.fabric, '')) > 0.35 OR
                   word_similarity(@Search, p.colorway_name) > 0.35)
            ORDER BY 
              CASE WHEN @Search IS NOT NULL THEN GREATEST(
                similarity(p.title, @Search), 
                similarity(p.product_code, @Search),
                similarity(COALESCE(p.fabric, ''), @Search)
              ) ELSE 0 END DESC,
              p.published_at DESC;";

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
            WITH siblings AS (
                SELECT 
                    p2.parent_catalog_id,
                    json_agg(
                        json_build_object(
                            'productCode', p2.product_code,
                            'colorHex', p2.color_hex,
                            'colorwayName', p2.colorway_name,
                            'heroImageUrl', p2.media_order->0->>'url'
                        ) ORDER BY p2.product_code
                    ) AS sibling_swatches
                FROM products p2
                WHERE p2.is_published = true 
                  AND p2.parent_catalog_id IS NOT NULL
                  AND p2.lifecycle_status != 'deleted'
                GROUP BY p2.parent_catalog_id
            ),
            waitlist_counts AS (
                SELECT product_id, COUNT(*) AS waitlist_count
                FROM product_waitlists
                GROUP BY product_id
            )
            SELECT 
                p.id, p.vayyari_product_id AS VayyariProductId, p.product_code AS ProductCode,
                p.title, p.description, p.category_name AS CategoryName, p.fabric,
                p.base_cost AS BaseCost, p.mrp, p.sale_price AS SalePrice,
                p.lifecycle_status AS LifecycleStatus, p.stock_quantity AS StockQuantity,
                p.color_group_id AS ColorGroupId, p.colorway_name AS ColorwayName, p.color_hex AS ColorHex,
                p.swatch_template AS SwatchTemplate,
                p.parent_catalog_id AS ParentCatalogId,
                p.catalog_color_group_id AS CatalogColorGroupId,
                p.parent_product_code AS ParentProductCode,
                p.previous_lifecycle_status AS PreviousLifecycleStatus,
                p.take_down_expires_at AS TakeDownExpiresAt,
                COALESCE(p.is_re_evaluation_pending, false) AS IsReEvaluationPending,
                COALESCE(p.is_review_pending, false) AS IsReviewPending,
                p.review_reason AS ReviewReason,
                COALESCE(w.waitlist_count, 0) AS WaitlistCount,
                p.color_groups::text AS ColorGroupsJson,
                p.media_order::text AS MediaOrderJson, 
                p.tags::text AS TagsJson,
                p.skus::text AS SkusJson,
                p.is_published AS IsPublished, 
                p.published_at AS PublishedAt,
                s.sibling_swatches::text AS SiblingSwatchesJson
            FROM products p
            LEFT JOIN siblings s ON p.parent_catalog_id = s.parent_catalog_id
            LEFT JOIN waitlist_counts w ON p.id = w.product_id
            WHERE p.id = @Id OR p.vayyari_product_id = @Id
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
                COALESCE(is_review_pending, false) AS IsReviewPending,
                review_reason AS ReviewReason,
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
        if (current.IsReviewPending)
        {
            await LogAuditAsync(conn, realId, "review_cleared", "isReviewPending", "true", "false", authorEmail);
        }

        string? mediaOrderJson = req.MediaOrder != null ? JsonSerializer.Serialize(req.MediaOrder) : null;
        string? colorGroupsJson = req.ColorGroups != null ? JsonSerializer.Serialize(req.ColorGroups) : null;
        string? tagsJson = req.Tags != null ? JsonSerializer.Serialize(req.Tags) : null;
        string? skusJson = req.Skus != null ? JsonSerializer.Serialize(req.Skus) : null;

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
                skus = CASE WHEN @Skus::jsonb IS NOT NULL THEN @Skus::jsonb ELSE skus END,
                is_review_pending = false,
                review_reason = NULL,
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
            Tags = tagsJson,
            Skus = skusJson
        });

        // Cascade review resolution to siblings
        const string cascadeSiblingsSql = @"
            UPDATE products 
            SET is_review_pending = false, review_reason = NULL, updated_at = NOW()
            WHERE id != @Id 
              AND parent_catalog_id IS NOT NULL 
              AND parent_catalog_id = (SELECT COALESCE(parent_catalog_id, vayyari_product_id) FROM products WHERE id = @Id);";

        await conn.ExecuteAsync(cascadeSiblingsSql, new { Id = realId });

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

    public async Task<bool> DismissReviewAsync(Guid id)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        const string dismissSql = @"
            UPDATE products 
            SET is_review_pending = false, review_reason = NULL, updated_at = NOW() 
            WHERE id = @Id 
               OR (parent_catalog_id IS NOT NULL AND parent_catalog_id = (SELECT COALESCE(parent_catalog_id, vayyari_product_id) FROM products WHERE id = @Id));";
        var affected = await conn.ExecuteAsync(dismissSql, new { Id = id });
        _logger.LogInformation("DismissReviewAsync for {Id} affected {Count} product records", id, affected);
        return affected > 0;
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

        var siblingSwatches = string.IsNullOrEmpty(r.SiblingSwatchesJson)
            ? new List<SiblingSwatchDto>()
            : JsonSerializer.Deserialize<List<SiblingSwatchDto>>(r.SiblingSwatchesJson, JsonOptions) ?? new();

        var skus = string.IsNullOrEmpty(r.SkusJson)
            ? null
            : JsonSerializer.Deserialize<List<StoreSkuDto>>(r.SkusJson, JsonOptions);

        if ((skus == null || skus.Count == 0) && colorGroups != null && colorGroups.Count > 0)
        {
            skus = colorGroups.Select((cg, idx) => new StoreSkuDto(
                Id: cg.Id,
                SkuCode: cg.ColorwayCode ?? $"{r.ProductCode}{(idx + 1):D2}",
                ColorwayName: cg.Name,
                ColorHex: cg.SlotA ?? "#1B4D3E",
                SecondaryHex: cg.SlotB,
                ColorGroupId: cg.Id,
                Price: cg.Price,
                Mrp: cg.Mrp,
                IsPriceInherited: !cg.Price.HasValue,
                StockQuantity: cg.StockQuantity ?? 10,
                AllowWaitlist: cg.AllowWaitlist ?? true,
                CustomMessage: cg.CustomMessage,
                ThumbnailUrl: media.FirstOrDefault(m => m.ColorGroupId == cg.Id)?.Url ?? media.FirstOrDefault()?.Url
            )).ToList();
        }

        var effectiveSkuCount = Math.Max(
            siblingSwatches.Count,
            Math.Max(skus?.Count ?? 0, colorGroups?.Count ?? 0)
        );
        var swatchesCount = effectiveSkuCount > 0 ? effectiveSkuCount : 1;

        // If siblingSwatches has only 1 element (itself) but the product has multiple color groups / SKUs curated inside,
        // synthesize sibling swatches so tile preview dots and PDP show all curated colorways
        if (siblingSwatches.Count <= 1 && colorGroups != null && colorGroups.Count > 1)
        {
            siblingSwatches = colorGroups.Select((cg, idx) => new SiblingSwatchDto(
                ProductCode: cg.ColorwayCode ?? $"{r.ProductCode}{(idx + 1):D2}",
                ColorHex: cg.SlotA ?? "#1B4D3E",
                ColorwayName: cg.Name,
                HeroImageUrl: media.FirstOrDefault(m => m.ColorGroupId == cg.Id)?.Url ?? media.FirstOrDefault()?.Url
            )).ToList();
        }

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
            PublishedAt: r.PublishedAt,
            ParentCatalogId: r.ParentCatalogId,
            CatalogColorGroupId: r.CatalogColorGroupId,
            ParentProductCode: r.ParentProductCode,
            PreviousLifecycleStatus: r.PreviousLifecycleStatus,
            TakeDownExpiresAt: r.TakeDownExpiresAt,
            IsReEvaluationPending: r.IsReEvaluationPending,
            WaitlistCount: r.WaitlistCount,
            SiblingSwatches: siblingSwatches,
            SwatchesCount: swatchesCount,
            Skus: skus,
            IsReviewPending: r.IsReviewPending,
            ReviewReason: r.ReviewReason
        );
    }

    public async Task<PublishJobDto> CreatePublishJobAsync(SubmitPublishJobRequest request, string authorEmail, CancellationToken ct = default)
    {
        var jobId = Guid.NewGuid();
        var action = string.IsNullOrWhiteSpace(request.Action) ? "initial_publish" : request.Action.ToLowerInvariant();
        var totalCount = request.ProductIds?.Count ?? 0;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        const string sql = @"
            INSERT INTO publish_jobs (
                id, action, status, total_count, processed_count, failed_count, requested_by, created_at, updated_at
            ) VALUES (
                @Id, @Action, 'queued', @TotalCount, 0, 0, @RequestedBy, NOW(), NOW()
            )
            RETURNING id, action, status, total_count AS TotalCount, processed_count AS ProcessedCount, 
                      failed_count AS FailedCount, error_details::text AS ErrorDetails, 
                      requested_by AS RequestedBy, created_at AS CreatedAt, updated_at AS UpdatedAt;";

        var job = await conn.QuerySingleAsync<PublishJobDto>(sql, new
        {
            Id = jobId,
            Action = action,
            TotalCount = totalCount,
            RequestedBy = authorEmail
        });

        // Publish event for each product in the batch
        if (request.ProductIds != null && request.ProductIds.Count > 0)
        {
            foreach (var productId in request.ProductIds)
            {
                var evt = new StoreProductPublishRequestedEvent(
                    EventId: Guid.NewGuid(),
                    JobId: jobId,
                    Action: action,
                    ProductId: productId,
                    ProductCode: string.Empty,
                    RequestedBy: authorEmail,
                    Timestamp: DateTime.UtcNow
                );

                await _eventPublisher.PublishAsync(
                    StorePublishTopics.PublishRequested,
                    productId.ToString(),
                    evt,
                    ct
                );
            }
        }

        _logger.LogInformation("Created publish job {JobId} ({Action}) for {Count} products by {Author}", jobId, action, totalCount, authorEmail);
        return job;
    }

    public async Task<PublishJobDto?> GetPublishJobAsync(Guid jobId, CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        const string sql = @"
            SELECT id, action, status, total_count AS TotalCount, processed_count AS ProcessedCount, 
                   failed_count AS FailedCount, error_details::text AS ErrorDetails, 
                   requested_by AS RequestedBy, created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM publish_jobs
            WHERE id = @Id;";

        return await conn.QuerySingleOrDefaultAsync<PublishJobDto>(sql, new { Id = jobId });
    }

    public async Task<List<PublishJobDto>> GetRecentPublishJobsAsync(int limit = 20, CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        const string sql = @"
            SELECT id, action, status, total_count AS TotalCount, processed_count AS ProcessedCount, 
                   failed_count AS FailedCount, error_details::text AS ErrorDetails, 
                   requested_by AS RequestedBy, created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM publish_jobs
            ORDER BY created_at DESC
            LIMIT @Limit;";

        var rows = await conn.QueryAsync<PublishJobDto>(sql, new { Limit = Math.Clamp(limit, 1, 100) });
        return rows.ToList();
    }

    public async Task<List<PublishFailureDto>> GetPublishFailuresAsync(CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        // 1. Fetch published product IDs from store to filter out already resolved/published items
        const string publishedSql = @"
            SELECT COALESCE(parent_catalog_id, vayyari_product_id) AS ProductId
            FROM products
            WHERE is_published = true AND (parent_catalog_id IS NOT NULL OR vayyari_product_id IS NOT NULL);";
        var publishedIds = (await conn.QueryAsync<Guid>(publishedSql)).ToHashSet();

        // 2. Fetch jobs with failed_count > 0
        const string failedJobsSql = @"
            SELECT id, action, error_details::text AS ErrorDetailsJson, created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM publish_jobs
            WHERE failed_count > 0
            ORDER BY updated_at DESC
            LIMIT 50;";

        var rows = await conn.QueryAsync(failedJobsSql);
        var failuresByProduct = new Dictionary<Guid, PublishFailureDto>();

        foreach (var row in rows)
        {
            string? errorJson = row.errordetailsjson;
            if (string.IsNullOrWhiteSpace(errorJson) || errorJson == "[]") continue;

            try
            {
                using var doc = JsonDocument.Parse(errorJson);
                if (doc.RootElement.ValueKind != JsonValueKind.Array) continue;

                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    if (!el.TryGetProperty("productId", out var pIdProp)) continue;
                    if (!Guid.TryParse(pIdProp.GetString(), out var productId)) continue;

                    // If product was subsequently published successfully, ignore failure
                    if (publishedIds.Contains(productId)) continue;

                    // Check if already marked as retried or dismissed
                    var isRetried = el.TryGetProperty("retried", out var rProp) && rProp.GetBoolean();
                    if (isRetried) continue;

                    var isDismissed = el.TryGetProperty("dismissed", out var dProp) && dProp.GetBoolean();
                    if (isDismissed) continue;

                    // Only take the latest failure for this product
                    if (failuresByProduct.ContainsKey(productId)) continue;

                    var pCode = el.TryGetProperty("productCode", out var pcProp) ? pcProp.GetString() ?? "" : "";
                    var title = el.TryGetProperty("title", out var tProp) ? tProp.GetString() ?? pCode : pCode;
                    var category = el.TryGetProperty("category", out var cProp) ? cProp.GetString() ?? "Saree" : "Saree";
                    var fabric = el.TryGetProperty("fabric", out var fProp) ? fProp.GetString() ?? "Silk" : "Silk";
                    var price = el.TryGetProperty("price", out var prProp) && prProp.TryGetDecimal(out var pVal) ? pVal : 8000m;
                    var img = el.TryGetProperty("primaryImageUri", out var imgProp) ? imgProp.GetString() ?? "" : "";
                    var mCount = el.TryGetProperty("mediaCount", out var mcProp) && mcProp.TryGetInt32(out var mcVal) ? mcVal : 0;
                    var err = el.TryGetProperty("error", out var eProp) ? eProp.GetString() ?? "Publish failed" : "Publish failed";
                    var failedAt = el.TryGetProperty("failedAt", out var faProp) && faProp.TryGetDateTime(out var faVal) ? faVal : (DateTime)row.updatedat;
                    var action = el.TryGetProperty("action", out var aProp) ? aProp.GetString() ?? (string)row.action : (string)row.action;

                    failuresByProduct[productId] = new PublishFailureDto(
                        JobId: (Guid)row.id,
                        ProductId: productId,
                        ProductCode: pCode,
                        Title: title,
                        Category: category,
                        Fabric: fabric,
                        Price: price,
                        PrimaryImageUri: img,
                        MediaCount: mCount,
                        ErrorMessage: err,
                        FailedAt: failedAt,
                        Action: action,
                        CanRetry: true
                    );
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse error_details JSON for publish job {JobId}", (Guid)row.id);
            }
        }

        return failuresByProduct.Values.OrderByDescending(f => f.FailedAt).ToList();
    }

    public async Task<PublishJobDto> RetryPublishFailuresAsync(RetryPublishBatchRequest request, string authorEmail, CancellationToken ct = default)
    {
        if (request.ProductIds == null || request.ProductIds.Count == 0)
        {
            throw new ArgumentException("At least one product ID is required to retry.");
        }

        var action = !string.IsNullOrWhiteSpace(request.Action) ? request.Action : "initial_publish";

        // Create new publish job
        var submitReq = new SubmitPublishJobRequest(
            Action: action,
            ProductIds: request.ProductIds,
            Options: new SubmitPublishJobOptions()
        );

        var newJob = await CreatePublishJobAsync(submitReq, authorEmail, ct);

        // Mark retried = true in previous failed jobs
        try
        {
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync(ct);

            const string failedJobsSql = @"
                SELECT id, error_details::text AS ErrorDetailsJson
                FROM publish_jobs
                WHERE failed_count > 0
                ORDER BY updated_at DESC
                LIMIT 50;";

            var rows = await conn.QueryAsync(failedJobsSql);
            var retrySet = request.ProductIds.ToHashSet();

            foreach (var row in rows)
            {
                string? json = row.errordetailsjson;
                if (string.IsNullOrWhiteSpace(json) || json == "[]") continue;

                var modified = false;
                var updatedElements = new List<Dictionary<string, object?>>();

                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.ValueKind != JsonValueKind.Array) continue;

                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    var dict = JsonSerializer.Deserialize<Dictionary<string, object?>>(el.GetRawText());
                    if (dict != null && dict.TryGetValue("productId", out var pVal) && pVal != null)
                    {
                        if (Guid.TryParse(pVal.ToString(), out var pGuid) && retrySet.Contains(pGuid))
                        {
                            dict["retried"] = true;
                            dict["retriedAt"] = DateTime.UtcNow;
                            dict["retriedJobId"] = newJob.Id;
                            modified = true;
                        }
                    }
                    if (dict != null) updatedElements.Add(dict);
                }

                if (modified)
                {
                    const string updateJobErrSql = @"
                        UPDATE publish_jobs 
                        SET error_details = @NewJson::jsonb, updated_at = NOW() 
                        WHERE id = @JobId;";
                    await conn.ExecuteAsync(updateJobErrSql, new 
                    { 
                        JobId = (Guid)row.id, 
                        NewJson = JsonSerializer.Serialize(updatedElements) 
                    });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to update retried flag on previous publish_jobs.");
        }

        return newJob;
    }

    public async Task<int> DismissPublishFailuresAsync(List<Guid> productIds, CancellationToken ct = default)
    {
        if (productIds == null || productIds.Count == 0) return 0;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        const string failedJobsSql = @"
            SELECT id, error_details::text AS ErrorDetailsJson
            FROM publish_jobs
            WHERE failed_count > 0
            ORDER BY updated_at DESC
            LIMIT 50;";

        var rows = await conn.QueryAsync(failedJobsSql);
        var dismissSet = productIds.ToHashSet();
        var dismissedCount = 0;

        foreach (var row in rows)
        {
            string? json = row.errordetailsjson;
            if (string.IsNullOrWhiteSpace(json) || json == "[]") continue;

            var modified = false;
            var updatedElements = new List<Dictionary<string, object?>>();

            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) continue;

            foreach (var el in doc.RootElement.EnumerateArray())
            {
                var dict = JsonSerializer.Deserialize<Dictionary<string, object?>>(el.GetRawText());
                if (dict != null && dict.TryGetValue("productId", out var pVal) && pVal != null)
                {
                    if (Guid.TryParse(pVal.ToString(), out var pGuid) && dismissSet.Contains(pGuid))
                    {
                        dict["dismissed"] = true;
                        dict["dismissedAt"] = DateTime.UtcNow;
                        modified = true;
                        dismissedCount++;
                    }
                }
                if (dict != null) updatedElements.Add(dict);
            }

            if (modified)
            {
                const string updateJobErrSql = @"
                    UPDATE publish_jobs 
                    SET error_details = @NewJson::jsonb, updated_at = NOW() 
                    WHERE id = @JobId;";
                await conn.ExecuteAsync(updateJobErrSql, new 
                { 
                    JobId = (Guid)row.id, 
                    NewJson = JsonSerializer.Serialize(updatedElements) 
                });
            }
        }

        _logger.LogInformation("Dismissed {Count} publish failures across publish_jobs", dismissedCount);
        return dismissedCount;
    }


    private class ExistingProductRecord
    {
        public Guid Id { get; set; }
        public decimal Mrp { get; set; }
        public decimal SalePrice { get; set; }
        public string? MediaOrderJson { get; set; }
        public Guid? ParentCatalogId { get; set; }
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
        public Guid? ParentCatalogId { get; set; }
        public Guid? CatalogColorGroupId { get; set; }
        public string? ParentProductCode { get; set; }
        public string? PreviousLifecycleStatus { get; set; }
        public DateTime? TakeDownExpiresAt { get; set; }
        public bool IsReEvaluationPending { get; set; }
        public bool IsReviewPending { get; set; }
        public string? ReviewReason { get; set; }
        public int WaitlistCount { get; set; }
        public string? ColorGroupsJson { get; set; }
        public string? MediaOrderJson { get; set; }
        public string? TagsJson { get; set; }
        public string? SkusJson { get; set; }
        public bool IsPublished { get; set; }
        public DateTime PublishedAt { get; set; }
        public string? SiblingSwatchesJson { get; set; }
    }
}

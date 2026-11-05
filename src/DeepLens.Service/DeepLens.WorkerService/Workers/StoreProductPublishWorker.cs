using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Confluent.Kafka;
using Dapper;
using DeepLens.Contracts.Events;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Minio;
using Minio.DataModel.Args;
using Npgsql;

namespace DeepLens.WorkerService.Workers;

public class StoreProductPublishWorker : BackgroundService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private readonly ILogger<StoreProductPublishWorker> _logger;
    private readonly string _platformConnStr;
    private readonly string _storeConnStr;
    private readonly IConsumer<string, string> _consumer;
    private readonly IProducer<string, string> _producer;
    private readonly IMinioClient? _minioClient;
    private readonly HttpClient _httpClient;
    private readonly string _storeBucketName;
    private readonly string _publicBaseUrl;
    private readonly SemaphoreSlim _concurrencyLimiter = new(5, 5); // Bounded concurrency: max 5 parallel products

    public StoreProductPublishWorker(
        ILogger<StoreProductPublishWorker> logger,
        IConfiguration config,
        IHttpClientFactory? httpFactory = null)
    {
        _logger = logger;
        _platformConnStr = config.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("DefaultConnection (deeplens_platform) not configured.");
        _storeConnStr = config.GetConnectionString("StoreDb") 
            ?? config.GetConnectionString("StoreConnection")
            ?? "Host=192.168.0.170;Port=5432;Database=deeplens_store;Username=postgres;Password=Krikank1$";

        _httpClient = httpFactory?.CreateClient() ?? new HttpClient();

        var kafkaBootstrap = config.GetConnectionString("Kafka") 
            ?? config["Kafka:BootstrapServers"] 
            ?? "localhost:9092";

        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = kafkaBootstrap,
            GroupId = "deeplens-store-publish-workers",
            ClientId = $"{Environment.MachineName}-store-publish-worker",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false
        };
        _consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();

        var producerConfig = new ProducerConfig
        {
            BootstrapServers = kafkaBootstrap,
            ClientId = $"{Environment.MachineName}-store-publish-producer"
        };
        _producer = new ProducerBuilder<string, string>(producerConfig).Build();

        // MinIO Setup
        var minioEndpoint = config["Minio:Endpoint"] ?? "192.168.0.170:9000";
        var minioAccess = config["Minio:AccessKey"] ?? "krikan";
        var minioSecret = config["Minio:SecretKey"] ?? "Krikank1$";
        _storeBucketName = config["Minio:StoreBucket"] ?? "store-assets";
        _publicBaseUrl = config["Minio:PublicBaseUrl"] ?? "http://adminapi.vayyarifashions.com/store-assets";

        try
        {
            _minioClient = new MinioClient()
                .WithEndpoint(minioEndpoint)
                .WithCredentials(minioAccess, minioSecret)
                .Build();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not initialize MinIO client in StoreProductPublishWorker.");
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();
        _logger.LogInformation("StoreProductPublishWorker started. Subscribing to topic {Topic}", StorePublishTopics.PublishRequested);

        _consumer.Subscribe(StorePublishTopics.PublishRequested);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var consumeResult = _consumer.Consume(TimeSpan.FromSeconds(1));
                if (consumeResult == null || string.IsNullOrWhiteSpace(consumeResult.Message.Value))
                {
                    continue;
                }

                var messageValue = consumeResult.Message.Value;

                // Process with bounded concurrency
                await _concurrencyLimiter.WaitAsync(stoppingToken);
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await ProcessPublishMessageAsync(messageValue, stoppingToken);
                        _consumer.Commit(consumeResult);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing publish message: {Msg}", messageValue);
                    }
                    finally
                    {
                        _concurrencyLimiter.Release();
                    }
                }, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in StoreProductPublishWorker consumer loop.");
                await Task.Delay(1000, stoppingToken);
            }
        }

        _consumer.Close();
        _logger.LogInformation("StoreProductPublishWorker stopped.");
    }

    private async Task ProcessPublishMessageAsync(string json, CancellationToken ct)
    {
        var evt = JsonSerializer.Deserialize<StoreProductPublishRequestedEvent>(json, JsonOptions);
        if (evt == null || evt.ProductId == Guid.Empty)
        {
            _logger.LogWarning("Invalid StoreProductPublishRequestedEvent received: {Json}", json);
            return;
        }

        _logger.LogInformation("Processing publish request for Product {ProductId} (Action: {Action}, Job: {JobId})", 
            evt.ProductId, evt.Action, evt.JobId);

        var newlyCopiedMediaKeys = new List<string>();
        CatalogProductRecord? catalogProduct = null;
        string productCode = !string.IsNullOrWhiteSpace(evt.ProductCode) ? evt.ProductCode : "PROD";
        NpgsqlTransaction? storeTx = null;

        await using var storeConn = new NpgsqlConnection(_storeConnStr);
        await storeConn.OpenAsync(ct);

        // 1. Mark job as in_progress if still queued
        const string markJobSql = @"
            UPDATE publish_jobs 
            SET status = 'in_progress', updated_at = NOW() 
            WHERE id = @JobId AND status = 'queued';";
        await storeConn.ExecuteAsync(markJobSql, new { JobId = evt.JobId });

        try
        {
            // 2. Fetch Catalog Product & Media from deeplens_platform
            await using var platformConn = new NpgsqlConnection(_platformConnStr);
            await platformConn.OpenAsync(ct);

            const string fetchCatalogSql = @"
                SELECT p.id, p.base_sku AS ProductCode, p.title, p.description, 
                       COALESCE(c.name, 'Saree') AS Category, p.fabric,
                       COALESCE((SELECT MIN(current_price) FROM vendor_listings WHERE product_id = p.id AND is_active = true), 8000) AS Price,
                       ARRAY(
                           SELECT COALESCE(NULLIF(m.storage_path, ''), m.id::text)
                           FROM media m
                           JOIN media_links ml ON m.id = ml.media_id
                           WHERE ml.entity_id = p.id AND ml.entity_type = 'product'
                           ORDER BY ml.is_primary DESC, m.uploaded_at ASC
                           LIMIT 15
                       ) AS MediaUrls
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.id = @ProductId;";

            catalogProduct = await platformConn.QuerySingleOrDefaultAsync<CatalogProductRecord>(fetchCatalogSql, new { ProductId = evt.ProductId });
            if (catalogProduct == null)
            {
                throw new InvalidOperationException($"Catalog product {evt.ProductId} not found in deeplens_platform.");
            }

            productCode = !string.IsNullOrWhiteSpace(evt.ProductCode) ? evt.ProductCode : catalogProduct.ProductCode;

            // 3. Check existing product in deeplens_store
            const string findStoreSql = @"
                SELECT id, mrp, sale_price, media_order::text AS MediaOrderJson, parent_catalog_id AS ParentCatalogId
                FROM products 
                WHERE parent_catalog_id = @ProductId 
                   OR vayyari_product_id = @ProductId 
                   OR LOWER(product_code) = LOWER(@ProductCode) 
                   OR LOWER(parent_product_code) = LOWER(@ProductCode)
                ORDER BY product_code ASC 
                LIMIT 1;";

            var existingStore = await storeConn.QuerySingleOrDefaultAsync<StoreProductRecord>(findStoreSql, new 
            { 
                ProductId = evt.ProductId,
                ProductCode = productCode
            });

            var storeProductId = existingStore?.Id ?? Guid.NewGuid();

            // 4. Resolve media items & ingest into MinIO store-assets
            var incomingUrls = catalogProduct.MediaUrls ?? Array.Empty<string>();
            var mediaList = new List<WorkerMediaItemDto>();

            for (var i = 0; i < incomingUrls.Length; i++)
            {
                var url = incomingUrls[i];
                var order = i + 1;
                var isCover = i == 0;
                var ingested = await IngestMediaAsync(storeProductId, productCode, url, order, isCover, newlyCopiedMediaKeys, ct);
                mediaList.Add(ingested);
            }

            var mediaJson = JsonSerializer.Serialize(mediaList);
            var tags = new List<string> { catalogProduct.Category, catalogProduct.Fabric ?? "Ethnic" }
                .Where(t => !string.IsNullOrEmpty(t)).ToList();
            var tagsJson = JsonSerializer.Serialize(tags);

            var mrp = catalogProduct.Price > 0 ? Math.Round(catalogProduct.Price * 1.6m, 0) : 9999m;
            var salePrice = catalogProduct.Price > 0 ? Math.Round(catalogProduct.Price * 1.3m, 0) : 7999m;

            var isSyncUpdates = evt.Action == "sync_updates" || existingStore != null;

            // 5. ATOMIC LOCAL TRANSACTION IN deeplens_store
            storeTx = await storeConn.BeginTransactionAsync(ct);

            if (existingStore != null)
            {
                // UPDATE path: update primary product and cascade review pending
                const string updateSql = @"
                    UPDATE products SET
                        title = @Title,
                        category_name = @CategoryName,
                        fabric = COALESCE(@Fabric, fabric),
                        base_cost = @BaseCost,
                        media_order = @MediaOrder::jsonb,
                        tags = @Tags::jsonb,
                        is_published = true,
                        published_at = NOW(),
                        is_review_pending = true,
                        review_reason = 'media_updated',
                        updated_at = NOW()
                    WHERE id = @Id;";

                await storeConn.ExecuteAsync(updateSql, new
                {
                    Id = existingStore.Id,
                    Title = catalogProduct.Title,
                    CategoryName = catalogProduct.Category,
                    Fabric = catalogProduct.Fabric,
                    BaseCost = catalogProduct.Price,
                    MediaOrder = mediaJson,
                    Tags = tagsJson
                }, transaction: storeTx);

                // Cascade review pending to sibling variants
                const string cascadeSql = @"
                    UPDATE products 
                    SET is_review_pending = true, review_reason = 'media_updated', updated_at = NOW()
                    WHERE (parent_catalog_id = @ProductId OR (@ParentCatalogId IS NOT NULL AND parent_catalog_id = @ParentCatalogId))
                      AND id != @Id;";

                await storeConn.ExecuteAsync(cascadeSql, new
                {
                    ProductId = evt.ProductId,
                    ParentCatalogId = existingStore.ParentCatalogId,
                    Id = existingStore.Id
                }, transaction: storeTx);
            }
            else
            {
                // INSERT path: create new store product
                const string insertSql = @"
                    INSERT INTO products (
                        id, vayyari_product_id, parent_catalog_id, product_code, title, description, category_name, fabric,
                        base_cost, mrp, sale_price, lifecycle_status, stock_quantity,
                        colorway_name, color_hex, swatch_template, media_order, tags, is_published, published_at,
                        is_review_pending, review_reason,
                        created_at, updated_at
                    ) VALUES (
                        @Id, @ProductId, @ProductId, @ProductCode, @Title, @Description, @CategoryName, @Fabric,
                        @BaseCost, @Mrp, @SalePrice, 'available', 10,
                        'Standard', '#1B4D3E', 'solid', @MediaOrder::jsonb, @Tags::jsonb, true, NOW(),
                        false, NULL,
                        NOW(), NOW()
                    );";

                await storeConn.ExecuteAsync(insertSql, new
                {
                    Id = storeProductId,
                    ProductId = evt.ProductId,
                    ProductCode = productCode,
                    Title = catalogProduct.Title,
                    Description = catalogProduct.Description,
                    CategoryName = catalogProduct.Category,
                    Fabric = catalogProduct.Fabric,
                    BaseCost = catalogProduct.Price,
                    Mrp = mrp,
                    SalePrice = salePrice,
                    MediaOrder = mediaJson,
                    Tags = tagsJson
                }, transaction: storeTx);
            }

            // 6. Synchronize deeplens_platform.products BEFORE committing store transaction
            const string syncPlatformSql = @"
                UPDATE products 
                SET is_published = TRUE,
                    store_publish_updated_at = NOW(),
                    updated_at = NOW()
                WHERE id = @ProductId;";
            var affectedPlatform = await platformConn.ExecuteAsync(syncPlatformSql, new { ProductId = evt.ProductId });
            if (affectedPlatform == 0)
            {
                throw new InvalidOperationException($"Catalog product {evt.ProductId} could not be updated in deeplens_platform (0 rows affected).");
            }

            // 7. COMMIT store transaction only after platform sync succeeded
            await storeTx.CommitAsync(ct);
            storeTx = null;

            // 8. Update Publish Job counters
            const string incrementSuccessSql = @"
                UPDATE publish_jobs 
                SET processed_count = processed_count + 1,
                    status = CASE WHEN processed_count + failed_count + 1 >= total_count 
                                  THEN (CASE WHEN failed_count > 0 THEN 'partial' ELSE 'completed' END)
                                  ELSE 'in_progress' END,
                    updated_at = NOW()
                WHERE id = @JobId;";
            await storeConn.ExecuteAsync(incrementSuccessSql, new { JobId = evt.JobId });

            // 9. Emit StoreProductSyncCompletedEvent to Kafka
            var completedEvt = new StoreProductSyncCompletedEvent(
                EventId: Guid.NewGuid(),
                JobId: evt.JobId,
                Action: evt.Action,
                ProductId: evt.ProductId,
                ProductCode: productCode,
                IsReviewPending: isSyncUpdates,
                ReviewReason: isSyncUpdates ? "media_updated" : null,
                PublishedAt: DateTime.UtcNow,
                SyncedMediaCount: mediaList.Count,
                Timestamp: DateTime.UtcNow
            );

            await _producer.ProduceAsync(
                StorePublishTopics.SyncCompleted,
                new Message<string, string>
                {
                    Key = evt.ProductId.ToString(),
                    Value = JsonSerializer.Serialize(completedEvt)
                },
                ct
            );

            _logger.LogInformation("Successfully completed atomic publish for Product {ProductId} ({ProductCode})", 
                evt.ProductId, productCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish Product {ProductId} for Job {JobId}. Executing complete rollback.", evt.ProductId, evt.JobId);

            // 1. Rollback store transaction if active
            if (storeTx != null)
            {
                try
                {
                    await storeTx.RollbackAsync(ct);
                    _logger.LogInformation("Rolled back store database transaction for Product {ProductId}", evt.ProductId);
                }
                catch (Exception rbEx)
                {
                    _logger.LogError(rbEx, "Error during storeTx rollback for Product {ProductId}", evt.ProductId);
                }
            }

            // 2. Delete newly copied MinIO media objects to prevent orphans
            if (_minioClient != null && newlyCopiedMediaKeys.Count > 0)
            {
                foreach (var key in newlyCopiedMediaKeys)
                {
                    try
                    {
                        await _minioClient.RemoveObjectAsync(new RemoveObjectArgs()
                            .WithBucket(_storeBucketName)
                            .WithObject(key), CancellationToken.None);
                        _logger.LogInformation("Deleted orphaned MinIO object {Key} after publish rollback", key);
                    }
                    catch (Exception minioEx)
                    {
                        _logger.LogWarning(minioEx, "Failed to remove orphaned MinIO object {Key}", key);
                    }
                }
            }

            // 3. Ensure platform record is NOT marked published
            try
            {
                await using var platformConn = new NpgsqlConnection(_platformConnStr);
                await platformConn.OpenAsync(ct);
                const string revertPlatformSql = @"
                    UPDATE products 
                    SET is_published = FALSE, updated_at = NOW() 
                    WHERE id = @ProductId 
                      AND (store_publish_updated_at IS NULL);";
                await platformConn.ExecuteAsync(revertPlatformSql, new { ProductId = evt.ProductId });
            }
            catch (Exception platEx)
            {
                _logger.LogWarning(platEx, "Could not check/revert platform is_published for Product {ProductId}", evt.ProductId);
            }

            // 4. Record rich error in publish_jobs
            try
            {
                await using var storeConnErr = new NpgsqlConnection(_storeConnStr);
                await storeConnErr.OpenAsync(ct);

                var primaryUrl = catalogProduct?.MediaUrls?.FirstOrDefault() ?? string.Empty;

                var errorObj = JsonSerializer.Serialize(new
                {
                    jobId = evt.JobId,
                    productId = evt.ProductId,
                    productCode = productCode,
                    title = catalogProduct?.Title ?? productCode,
                    category = catalogProduct?.Category ?? "Saree",
                    fabric = catalogProduct?.Fabric ?? "Silk",
                    price = catalogProduct?.Price ?? 8000m,
                    primaryImageUri = primaryUrl,
                    mediaCount = catalogProduct?.MediaUrls?.Length ?? 0,
                    error = ex.Message,
                    action = evt.Action,
                    failedAt = DateTime.UtcNow,
                    canRetry = true,
                    retried = false
                });

                const string incrementFailSql = @"
                    UPDATE publish_jobs 
                    SET failed_count = failed_count + 1,
                        error_details = COALESCE(error_details, '[]'::jsonb) || @ErrorJson::jsonb,
                        status = CASE 
                            WHEN processed_count + failed_count + 1 >= total_count 
                            THEN (CASE WHEN processed_count > 0 THEN 'partial' ELSE 'failed' END)
                            ELSE 'in_progress' 
                        END,
                        updated_at = NOW()
                    WHERE id = @JobId;";
                await storeConnErr.ExecuteAsync(incrementFailSql, new { JobId = evt.JobId, ErrorJson = errorObj });

                var failedEvt = new StoreProductPublishFailedEvent(
                    EventId: Guid.NewGuid(),
                    JobId: evt.JobId,
                    ProductId: evt.ProductId,
                    ProductCode: productCode,
                    ErrorMessage: ex.Message,
                    Timestamp: DateTime.UtcNow
                );

                await _producer.ProduceAsync(
                    StorePublishTopics.PublishFailed,
                    new Message<string, string>
                    {
                        Key = evt.ProductId.ToString(),
                        Value = JsonSerializer.Serialize(failedEvt)
                    },
                    ct
                );
            }
            catch (Exception recordEx)
            {
                _logger.LogError(recordEx, "Failed to record publish failure in publish_jobs for Product {ProductId}", evt.ProductId);
            }
        }
    }

    private async Task<WorkerMediaItemDto> IngestMediaAsync(
        Guid productId,
        string productCode,
        string sourceUrl,
        int order,
        bool isCover,
        List<string> newlyCopiedMediaKeys,
        CancellationToken ct)
    {
        var mediaId = $"m_{order}_{productId:N}"[..12];

        // 1. If URL is already in store-assets bucket, reuse directly
        if (!string.IsNullOrWhiteSpace(sourceUrl) && sourceUrl.Contains($"/{_storeBucketName}/"))
        {
            return new WorkerMediaItemDto(mediaId, sourceUrl, 1, order, 0.0, isCover, sourceUrl);
        }

        // 2. Try MinIO Server-Side Copy for internal MinIO objects or relative storage paths
        if (_minioClient != null && !string.IsNullOrWhiteSpace(sourceUrl))
        {
            try
            {
                string? sourceBucket = null;
                string? sourceKey = null;

                if (!sourceUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && 
                    !sourceUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                {
                    // Relative storage path: e.g. "general/product_a0e4349c.../image.jpg"
                    var parts = sourceUrl.TrimStart('/').Split('/', 2);
                    if (parts.Length == 2)
                    {
                        sourceBucket = parts[0];
                        sourceKey = parts[1];
                    }
                }
                else if (sourceUrl.Contains(":9000/"))
                {
                    var uri = new Uri(sourceUrl);
                    var parts = uri.AbsolutePath.TrimStart('/').Split('/', 2);
                    if (parts.Length == 2)
                    {
                        sourceBucket = parts[0];
                        sourceKey = parts[1];
                    }
                }

                if (!string.IsNullOrEmpty(sourceBucket) && !string.IsNullOrEmpty(sourceKey))
                {
                    var cleanCode = productCode.Trim().ToLowerInvariant();
                    var destKey = $"products/{cleanCode}/{order}_{Path.GetFileName(sourceKey)}";

                    var copyArgs = new CopyObjectArgs()
                        .WithBucket(_storeBucketName)
                        .WithObject(destKey)
                        .WithCopyObjectSource(new CopySourceObjectArgs()
                            .WithBucket(sourceBucket)
                            .WithObject(sourceKey));

                    await _minioClient.CopyObjectAsync(copyArgs, ct);
                    newlyCopiedMediaKeys.Add(destKey);
                    var publicUrl = $"{_publicBaseUrl.TrimEnd('/')}/{destKey}";
                    _logger.LogInformation("Server-side MinIO copy succeeded: {SourceBucket}/{SourceKey} -> {Dest}", 
                        sourceBucket, sourceKey, publicUrl);

                    return new WorkerMediaItemDto(mediaId, publicUrl, 1, order, 0.0, isCover, sourceUrl);
                }
            }
            catch (Exception copyEx)
            {
                _logger.LogWarning(copyEx, "MinIO server-side copy failed for {Url}. Falling back to streaming.", sourceUrl);
            }
        }

        // 3. Fallback: stream download and upload to MinIO
        try
        {
            var bytes = await _httpClient.GetByteArrayAsync(sourceUrl, ct);
            if (bytes.Length > 0 && _minioClient != null)
            {
                var hashBytes = SHA256.HashData(bytes);
                var shortHash = Convert.ToHexString(hashBytes).ToLowerInvariant()[..8];
                var cleanCode = productCode.Trim().ToLowerInvariant();
                var storageKey = $"products/{cleanCode}/{order}_{shortHash}.jpg";

                using var stream = new MemoryStream(bytes);
                var putArgs = new PutObjectArgs()
                    .WithBucket(_storeBucketName)
                    .WithObject(storageKey)
                    .WithStreamData(stream)
                    .WithObjectSize(stream.Length)
                    .WithContentType("image/jpeg");

                await _minioClient.PutObjectAsync(putArgs, ct);
                newlyCopiedMediaKeys.Add(storageKey);
                var publicUrl = $"{_publicBaseUrl.TrimEnd('/')}/{storageKey}";
                return new WorkerMediaItemDto(mediaId, publicUrl, 1, order, 0.0, isCover, sourceUrl);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to download media {Url}. Preserving original URL.", sourceUrl);
        }

        // 4. Fallback preserving original URL
        return new WorkerMediaItemDto(mediaId, sourceUrl, 1, order, 0.0, isCover, sourceUrl);
    }

    private record CatalogProductRecord
    {
        public Guid Id { get; init; }
        public string ProductCode { get; init; } = string.Empty;
        public string Title { get; init; } = string.Empty;
        public string? Description { get; init; }
        public string Category { get; init; } = string.Empty;
        public string? Fabric { get; init; }
        public decimal Price { get; init; }
        public string[]? MediaUrls { get; init; }
    }

    private record StoreProductRecord
    {
        public Guid Id { get; init; }
        public decimal Mrp { get; init; }
        public decimal SalePrice { get; init; }
        public string? MediaOrderJson { get; init; }
        public Guid? ParentCatalogId { get; init; }
    }

    public record WorkerMediaItemDto(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("url")] string Url,
        [property: JsonPropertyName("mediaType")] int MediaType,
        [property: JsonPropertyName("order")] int Order,
        [property: JsonPropertyName("dwellSeconds")] double DwellSeconds,
        [property: JsonPropertyName("isCover")] bool IsCover,
        [property: JsonPropertyName("sourceUrl")] string SourceUrl
    );
}

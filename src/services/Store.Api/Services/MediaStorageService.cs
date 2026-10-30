using System.Security.Cryptography;
using Dapper;
using Minio;
using Minio.DataModel.Args;
using Npgsql;
using Store.Api.Models;

namespace Store.Api.Services;

public class MediaStorageService : IMediaStorageService
{
    private readonly IMinioClient _minioClient;
    private readonly HttpClient _httpClient;
    private readonly IStoreEventPublisher _eventPublisher;
    private readonly ILogger<MediaStorageService> _logger;
    private readonly string _connectionString;
    private readonly string _bucketName;
    private readonly string _publicBaseUrl;
    private readonly string _derivativeTopic;

    public MediaStorageService(
        IMinioClient minioClient,
        HttpClient httpClient,
        IStoreEventPublisher eventPublisher,
        IConfiguration config,
        ILogger<MediaStorageService> logger)
    {
        _minioClient = minioClient;
        _httpClient = httpClient;
        _eventPublisher = eventPublisher;
        _logger = logger;

        _connectionString = config.GetConnectionString("StoreDb")
            ?? config["ConnectionStrings:StoreDb"]
            ?? config["ConnectionStrings__StoreDb"]
            ?? "Host=192.168.0.170;Port=5432;Database=deeplens_store;Username=postgres;Password=Krikank1$";

        _bucketName = config["Minio:BucketName"]
            ?? config["Minio__BucketName"]
            ?? "store-assets";

        _publicBaseUrl = config["Minio:PublicBaseUrl"]
            ?? config["Minio__PublicBaseUrl"]
            ?? $"http://192.168.0.170:9000/{_bucketName}";

        _derivativeTopic = config["Kafka:MediaDerivativeTopic"]
            ?? config["Kafka__MediaDerivativeTopic"]
            ?? "store.media.derivative.requested";
    }

    public async Task EnsureBucketExistsAsync(CancellationToken ct = default)
    {
        try
        {
            var exists = await _minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(_bucketName), ct);
            if (!exists)
            {
                await _minioClient.MakeBucketAsync(new MakeBucketArgs().WithBucket(_bucketName), ct);
                _logger.LogInformation("Created MinIO bucket: {Bucket}", _bucketName);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not verify/create MinIO bucket {Bucket}", _bucketName);
        }
    }

    public async Task<StoreMediaItemDto> IngestProductMediaAsync(
        Guid productId,
        string productCode,
        string sourceUrl,
        int order,
        bool isCover,
        string? catalogMediaId = null,
        CancellationToken ct = default)
    {
        var mediaId = !string.IsNullOrWhiteSpace(catalogMediaId) 
            ? catalogMediaId 
            : $"m_{order}_{productId:N}"[..12];

        // 1. If URL is already in store-assets bucket, no need to duplicate
        if (!string.IsNullOrWhiteSpace(sourceUrl) && sourceUrl.Contains($"/{_bucketName}/"))
        {
            return new StoreMediaItemDto(
                Id: mediaId,
                Url: sourceUrl,
                MediaType: 1,
                Order: order,
                DwellSeconds: 0.0,
                IsCover: isCover,
                CatalogMediaId: catalogMediaId,
                SourceUrl: sourceUrl
            );
        }

        try
        {
            _logger.LogInformation("Streaming media asset for product {ProductCode} from {Url}", productCode, sourceUrl);

            // 2. Download from source URL
            var bytes = await _httpClient.GetByteArrayAsync(sourceUrl, ct);
            if (bytes.Length == 0)
            {
                throw new InvalidOperationException($"Downloaded 0 bytes from {sourceUrl}");
            }

            // 3. Compute SHA256 checksum
            var hashBytes = SHA256.HashData(bytes);
            var hash = Convert.ToHexString(hashBytes).ToLowerInvariant();
            var shortHash = hash.Length > 8 ? hash[..8] : hash;

            // 4. Generate clean MinIO storage key: products/{code}/{order}_{hash}.jpg
            var cleanCode = productCode.Trim().ToLowerInvariant();
            var storageKey = $"products/{cleanCode}/{order}_{shortHash}.jpg";
            var mimeType = "image/jpeg";

            // 5. Upload to MinIO bucket
            using (var stream = new MemoryStream(bytes))
            {
                var putArgs = new PutObjectArgs()
                    .WithBucket(_bucketName)
                    .WithObject(storageKey)
                    .WithStreamData(stream)
                    .WithObjectSize(stream.Length)
                    .WithContentType(mimeType);

                await _minioClient.PutObjectAsync(putArgs, ct);
            }

            var publicUrl = $"{_publicBaseUrl.TrimEnd('/')}/{storageKey}";

            // 6. Record asset in PostgreSQL media_assets central registry
            Guid assetId;
            Guid? catalogMediaGuid = Guid.TryParse(catalogMediaId, out var parsedGuid) ? parsedGuid : null;

            await using (var conn = new NpgsqlConnection(_connectionString))
            {
                await conn.OpenAsync(ct);
                const string sql = @"
                    INSERT INTO media_assets (
                        id, bucket_name, storage_key, public_url, sha256_hash, byte_size,
                        mime_type, media_type, owner_type, owner_id, derivative_type, processing_status,
                        catalog_media_id, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), @BucketName, @StorageKey, @PublicUrl, @Sha256Hash, @ByteSize,
                        @MimeType, 'image', 'product', @ProductId, 'original', 'ready',
                        @CatalogMediaId, NOW(), NOW()
                    )
                    ON CONFLICT (storage_key) DO UPDATE SET
                        public_url = EXCLUDED.public_url,
                        byte_size = EXCLUDED.byte_size,
                        owner_id = EXCLUDED.owner_id,
                        catalog_media_id = COALESCE(EXCLUDED.catalog_media_id, media_assets.catalog_media_id),
                        processing_status = 'ready',
                        updated_at = NOW()
                    RETURNING id;";

                assetId = await conn.ExecuteScalarAsync<Guid>(sql, new
                {
                    BucketName = _bucketName,
                    StorageKey = storageKey,
                    PublicUrl = publicUrl,
                    Sha256Hash = hash,
                    ByteSize = (long)bytes.Length,
                    MimeType = mimeType,
                    ProductId = productId,
                    CatalogMediaId = catalogMediaGuid
                });
            }

            // 7. Publish async derivative generation request to Kafka
            await _eventPublisher.PublishAsync(
                _derivativeTopic,
                productId.ToString(),
                new
                {
                    eventId = Guid.NewGuid(),
                    assetId = assetId,
                    bucketName = _bucketName,
                    storageKey = storageKey,
                    publicUrl = publicUrl,
                    ownerId = productId,
                    ownerType = "product",
                    productCode = productCode,
                    sha256Hash = hash,
                    byteSize = bytes.Length,
                    order = order,
                    isCover = isCover,
                    catalogMediaId = catalogMediaId,
                    requestedAt = DateTime.UtcNow
                },
                ct
            );

            _logger.LogInformation("Successfully ingested media to MinIO: {PublicUrl} (Asset ID: {AssetId})", publicUrl, assetId);

            return new StoreMediaItemDto(
                Id: mediaId,
                Url: publicUrl,
                MediaType: 1,
                Order: order,
                DwellSeconds: 0.0,
                IsCover: isCover,
                CatalogMediaId: catalogMediaId,
                SourceUrl: sourceUrl
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to ingest media {Url} to MinIO for {ProductCode}. Preserving original URL.", sourceUrl, productCode);
            return new StoreMediaItemDto(
                Id: mediaId,
                Url: sourceUrl,
                MediaType: 1,
                Order: order,
                DwellSeconds: 0.0,
                IsCover: isCover,
                CatalogMediaId: catalogMediaId,
                SourceUrl: sourceUrl
            );
        }
    }

    public async Task<string> UploadModifiedMediaAsync(
        Guid productId,
        string mediaId,
        Stream stream,
        string mimeType,
        CancellationToken ct = default)
    {
        var ext = mimeType.Contains("webp") ? "webp" : "jpg";
        var storageKey = $"store/modified/{productId}/{mediaId}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.{ext}";

        await _minioClient.PutObjectAsync(new PutObjectArgs()
            .WithBucket(_bucketName)
            .WithObject(storageKey)
            .WithStreamData(stream)
            .WithObjectSize(stream.Length)
            .WithContentType(mimeType),
            ct);

        var publicUrl = $"{_publicBaseUrl.TrimEnd('/')}/{storageKey}";
        _logger.LogInformation("Uploaded client-modified media to MinIO: {PublicUrl}", publicUrl);
        return publicUrl;
    }

    public async Task DeleteModifiedMediaAsync(string modifiedUrl, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(modifiedUrl)) return;
        try
        {
            var uri = new Uri(modifiedUrl);
            var path = uri.AbsolutePath.TrimStart('/');
            if (path.StartsWith($"{_bucketName}/", StringComparison.OrdinalIgnoreCase))
            {
                path = path[(_bucketName.Length + 1)..];
            }

            await _minioClient.RemoveObjectAsync(new RemoveObjectArgs()
                .WithBucket(_bucketName)
                .WithObject(path),
                ct);

            _logger.LogInformation("Deleted modified media object from MinIO: {StorageKey}", path);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete modified media from MinIO: {Url}", modifiedUrl);
        }
    }

    /// <inheritdoc />
    public async Task PruneOrphanedMediaAsync(
        Guid productId,
        ISet<string> survivingPublicUrls,
        CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        // Fetch all non-deleted rows for this product (originals AND modified derivatives via parent FK)
        const string fetchSql = @"
            SELECT id, storage_key, public_url, parent_asset_id
            FROM media_assets
            WHERE owner_id = @ProductId
              AND is_deleted = false;";

        var rows = (await conn.QueryAsync<(Guid Id, string StorageKey, string PublicUrl, Guid? ParentAssetId)>(
            fetchSql, new { ProductId = productId })).ToList();

        // Rows whose public_url is no longer in the surviving set
        var orphanedIds = new HashSet<Guid>();
        foreach (var row in rows.Where(r => !survivingPublicUrls.Contains(r.PublicUrl)))
            orphanedIds.Add(row.Id);

        // Also collect modified derivatives (store/modified/{productId}/...) whose parent original is being pruned
        foreach (var row in rows)
        {
            if (row.ParentAssetId.HasValue && orphanedIds.Contains(row.ParentAssetId.Value))
                orphanedIds.Add(row.Id);
        }

        if (orphanedIds.Count == 0)
        {
            _logger.LogInformation("PruneOrphanedMedia: no orphaned assets for product {ProductId}", productId);
            return;
        }

        // Delete from MinIO
        int minioDeleted = 0;
        foreach (var row in rows.Where(r => orphanedIds.Contains(r.Id)))
        {
            try
            {
                await _minioClient.RemoveObjectAsync(new RemoveObjectArgs()
                    .WithBucket(_bucketName)
                    .WithObject(row.StorageKey),
                    ct);
                minioDeleted++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "PruneOrphanedMedia: failed to delete MinIO object {Key}", row.StorageKey);
            }
        }

        // Bulk soft-delete in one SQL statement
        const string softDeleteSql = @"
            UPDATE media_assets
            SET is_deleted = true, updated_at = NOW()
            WHERE id = ANY(@Ids);";

        var dbDeleted = await conn.ExecuteAsync(softDeleteSql, new { Ids = orphanedIds.ToArray() });

        _logger.LogInformation(
            "PruneOrphanedMedia: pruned {DbDeleted} media_assets rows ({MinioDeleted} MinIO objects) for product {ProductId}",
            dbDeleted, minioDeleted, productId);
    }
}

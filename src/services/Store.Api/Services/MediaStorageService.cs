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
        CancellationToken ct = default)
    {
        var mediaId = $"m_{order}_{productId:N}"[..12];

        // 1. If URL is already in store-assets bucket, no need to duplicate
        if (!string.IsNullOrWhiteSpace(sourceUrl) && sourceUrl.Contains($"/{_bucketName}/"))
        {
            return new StoreMediaItemDto(
                Id: mediaId,
                Url: sourceUrl,
                MediaType: 1,
                Order: order,
                DwellSeconds: 0.0,
                IsCover: isCover
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
            await using (var conn = new NpgsqlConnection(_connectionString))
            {
                await conn.OpenAsync(ct);
                const string sql = @"
                    INSERT INTO media_assets (
                        id, bucket_name, storage_key, public_url, sha256_hash, byte_size,
                        mime_type, media_type, owner_type, owner_id, derivative_type, processing_status,
                        created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), @BucketName, @StorageKey, @PublicUrl, @Sha256Hash, @ByteSize,
                        @MimeType, 'image', 'product', @ProductId, 'original', 'ready',
                        NOW(), NOW()
                    )
                    ON CONFLICT (storage_key) DO UPDATE SET
                        public_url = EXCLUDED.public_url,
                        byte_size = EXCLUDED.byte_size,
                        owner_id = EXCLUDED.owner_id,
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
                    ProductId = productId
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
                IsCover: isCover
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
                IsCover: isCover
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
}

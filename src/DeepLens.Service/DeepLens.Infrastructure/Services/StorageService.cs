using Minio;
using Minio.DataModel.Args;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services;

/// <summary>
/// Service for storage management (MinIO). Single-tenant version.
/// </summary>
public interface IStorageService
{
    Task<string> UploadFileAsync(string fileName, Stream data, string contentType, string? category = null);
    Task<string> UploadToPathAsync(string storagePath, Stream data, string contentType, string? category = null, Dictionary<string, string>? tags = null);
    Task<string> UploadThumbnailAsync(string storagePath, Stream data, string contentType);
    Task<Stream> GetFileAsync(string storagePath);
    Task SetObjectTagsAsync(string storagePath, Dictionary<string, string> tags);
    Task MarkForDeletionAsync(string storagePath);
    Task DeleteFileAsync(string storagePath);
}

public class MinioStorageService : IStorageService
{
    private readonly IMinioClient _minioClient;
    private readonly ILogger<MinioStorageService> _logger;
    private const string DefaultBucket = "deeplens-storage";

    public MinioStorageService(IMinioClient minioClient, ILogger<MinioStorageService> logger)
    {
        _minioClient = minioClient;
        _logger = logger;
    }

    private async Task EnsureBucketExistsAsync()
    {
        var beArgs = new BucketExistsArgs().WithBucket(DefaultBucket);
        bool found = await _minioClient.BucketExistsAsync(beArgs);
        if (!found)
        {
            var mbArgs = new MakeBucketArgs().WithBucket(DefaultBucket);
            await _minioClient.MakeBucketAsync(mbArgs);
        }
    }

    public async Task<string> UploadFileAsync(string fileName, Stream data, string contentType, string? category = null)
    {
        // Use SHA256 for content-addressable storage
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        byte[] hashBytes = await sha256.ComputeHashAsync(data);
        string hash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
        data.Position = 0;

        string extension = System.IO.Path.GetExtension(fileName);
        
        // Use the shared registry to determine the path
        string fullPath = DeepLens.Shared.Common.StoragePathRegistry.GetProductPath(category, hash, extension);
        
        return await UploadToPathAsync(fullPath, data, contentType, category);
    }

    public async Task<string> UploadToPathAsync(string storagePath, Stream data, string contentType, string? category = null, Dictionary<string, string>? tags = null)
    {
        var parts = storagePath.Split('/', 2);
        string bucketName = parts.Length > 1 ? parts[0] : DefaultBucket;
        string objectName = parts.Length > 1 ? parts[1] : storagePath;

        var beArgs = new BucketExistsArgs().WithBucket(bucketName);
        if (!await _minioClient.BucketExistsAsync(beArgs))
        {
            await _minioClient.MakeBucketAsync(new MakeBucketArgs().WithBucket(bucketName));
        }

        var putArgs = new PutObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName)
            .WithStreamData(data)
            .WithObjectSize(data.Length)
            .WithContentType(contentType);

        await _minioClient.PutObjectAsync(putArgs);

        // Build tags: start from caller-supplied tags, then add auto-derived tags.
        var finalTags = new Dictionary<string, string>(tags ?? new Dictionary<string, string>());

        // Auto-calculate period tag if not already set by caller
        if (!finalTags.ContainsKey("period"))
        {
            int quarter = (DateTime.UtcNow.Month + 2) / 3;
            finalTags["period"] = $"Q{quarter}{DateTime.UtcNow:yy}";
        }

        if (!string.IsNullOrWhiteSpace(category) && !finalTags.ContainsKey("category"))
        {
            finalTags["category"] = category.ToLowerInvariant().Trim();
        }

        if (finalTags.Count > 0)
        {
            await SetObjectTagsAsync(storagePath, finalTags);
        }
        
        _logger.LogInformation("Uploaded file to MinIO: {Bucket}/{Path} with Tags: {Tags}", bucketName, objectName, string.Join(", ", finalTags.Select(t => $"{t.Key}={t.Value}")));
        
        return storagePath; // Now returning the full path starting with bucket
    }

    public async Task<string> UploadThumbnailAsync(string storagePath, Stream data, string contentType)
    {
        await EnsureBucketExistsAsync();

        var putArgs = new PutObjectArgs()
            .WithBucket(DefaultBucket)
            .WithObject(storagePath)
            .WithStreamData(data)
            .WithObjectSize(data.Length)
            .WithContentType(contentType);

        await _minioClient.PutObjectAsync(putArgs);
        return $"{DefaultBucket}/{storagePath}";
    }

    public async Task<Stream> GetFileAsync(string storagePath)
    {
        string bucketName;
        string objectName;
        
        // Handle paths that might or might not include the bucket prefix
        var parts = storagePath.Split('/', 2);
        if (parts.Length > 1 && (parts[0] == DefaultBucket || parts[0].StartsWith("tenant-")))
        {
            bucketName = parts[0];
            objectName = parts[1];
        }
        else
        {
            bucketName = DefaultBucket;
            objectName = storagePath;
        }

        var memoryStream = new MemoryStream();
        var getArgs = new GetObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName)
            .WithCallbackStream(s => s.CopyTo(memoryStream));

        await _minioClient.GetObjectAsync(getArgs);
        memoryStream.Position = 0;
        return memoryStream;
    }

    public async Task MarkForDeletionAsync(string storagePath)
    {
        await SetObjectTagsAsync(storagePath, new Dictionary<string, string> { { "status", "deleted" } });
        _logger.LogInformation("Marked object for deletion: {Path}", storagePath);
    }

    public async Task SetObjectTagsAsync(string storagePath, Dictionary<string, string> tags)
    {
        if (tags == null || tags.Count == 0) return;

        var parts = storagePath.Split('/', 2);
        string bucketName = parts.Length > 1 ? parts[0] : DefaultBucket;
        string objectName = parts.Length > 1 ? parts[1] : storagePath;

        try 
        {
            var tagging = new Minio.DataModel.Tags.Tagging(tags, false);
            var args = new SetObjectTagsArgs()
                .WithBucket(bucketName)
                .WithObject(objectName)
                .WithTagging(tagging);

            await _minioClient.SetObjectTagsAsync(args);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to set tags for {Path} using SDK", storagePath);
        }
    }

    public async Task DeleteFileAsync(string storagePath)
    {
        var parts = storagePath.Split('/', 2);
        string bucketName;
        string objectName;

        if (parts.Length < 2)
        {
            bucketName = DefaultBucket;
            objectName = storagePath;
        }
        else
        {
            bucketName = parts[0];
            objectName = parts[1];
        }

        var rmArgs = new RemoveObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName);

        await _minioClient.RemoveObjectAsync(rmArgs);
        _logger.LogInformation("Deleted file from MinIO: {Bucket}/{Path}", bucketName, objectName);
    }
}

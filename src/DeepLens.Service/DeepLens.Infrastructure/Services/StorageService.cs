using Minio;
using Minio.DataModel.Args;
using Minio.DataModel.ILM;
using Minio.DataModel.Tags;
using Microsoft.Extensions.Logging;
using DeepLens.Contracts.Media;
using DeepLens.Shared.Common;
using System.Collections.Generic;

namespace DeepLens.Infrastructure.Services;

/// <summary>
/// Service for storage management (MinIO). Single-tenant version.
/// </summary>
public interface IStorageService
{
    Task<string> UploadFileAsync(string fileName, Stream data, string contentType, StorageContext context, Dictionary<string, string>? tags = null);
    Task<string> UploadToPathAsync(string storagePath, Stream data, string contentType, Dictionary<string, string>? tags = null);
    Task<string> UploadThumbnailAsync(string storagePath, Stream data, string contentType, Dictionary<string, string>? tags = null);
    Task<Stream> GetFileAsync(string storagePath);
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

    private async Task EnsureBucketExistsAsync(string? bucketName = null)
    {
        string target = bucketName ?? DefaultBucket;
        var beArgs = new BucketExistsArgs().WithBucket(target);
        bool found = await _minioClient.BucketExistsAsync(beArgs);
        if (!found)
        {
            var mbArgs = new MakeBucketArgs().WithBucket(target);
            await _minioClient.MakeBucketAsync(mbArgs);
            await InitializeLifecyclePoliciesAsync(target);
        }
    }

    private async Task InitializeLifecyclePoliciesAsync(string bucketName)
    {
        try
        {
            _logger.LogInformation("Initializing lifecycle policies for bucket: {Bucket}", bucketName);
            
            var rules = new List<LifecycleRule>();
            
            // Create a rule for each standard retention period
            foreach (var daysStr in MediaConstants.Retention.AllOptions)
            {
                if (daysStr == MediaConstants.Retention.Infinite) continue;
                
                // Parse "days30" -> 30
                string numericPart = daysStr.Replace("days", "", StringComparison.OrdinalIgnoreCase);
                if (!int.TryParse(numericPart, out int days)) continue;

                rules.Add(new LifecycleRule
                {
                    ID = $"ExpireAfter{days}Days",
                    Status = "Enabled",
                    Filter = new RuleFilter
                    {
                        Tag = new Tagging(new Dictionary<string, string> { { MediaConstants.Retention.TagKey, daysStr } }, false)
                    },
                    Expiration = new Expiration
                    {
                        Days = days
                    }
                });
            }

            var lifecycleConfig = new LifecycleConfiguration(rules);
            var args = new SetBucketLifecycleArgs()
                .WithBucket(bucketName)
                .WithLifecycleConfiguration(lifecycleConfig);

            await _minioClient.SetBucketLifecycleAsync(args);
            _logger.LogInformation("Successfully applied {Count} lifecycle rules to {Bucket}", rules.Count, bucketName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set lifecycle policies for bucket {Bucket}. Lifecycle tags may not work automatically.", bucketName);
        }
    }

    public async Task<string> UploadFileAsync(string fileName, Stream data, string contentType, StorageContext context, Dictionary<string, string>? tags = null)
    {
        // Use GUID for globally unique filenames to avoid collision and deletion issues
        string identifier = $"{Guid.NewGuid():N}{System.IO.Path.GetExtension(fileName)}";
        
        string fullPath = StoragePathRegistry.GetPath(context, identifier);
        return await UploadToPathAsync(fullPath, data, contentType, tags);
    }

    public async Task<string> UploadToPathAsync(string storagePath, Stream data, string contentType, Dictionary<string, string>? tags = null)
    {
        var parts = storagePath.Split('/', 2);
        string bucketName = parts.Length > 1 ? parts[0] : DefaultBucket;
        string objectName = parts.Length > 1 ? parts[1] : storagePath;

        if (!await _minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(bucketName)))
        {
            await EnsureBucketExistsAsync(bucketName);
        }

        var putArgs = new PutObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName)
            .WithStreamData(data)
            .WithObjectSize(data.Length)
            .WithContentType(contentType);

        if (tags != null && tags.Count > 0)
        {
            putArgs.WithTagging(new Tagging(tags, false));
        }

        await _minioClient.PutObjectAsync(putArgs);
        
        _logger.LogInformation("Uploaded file to MinIO: {Bucket}/{Path}", bucketName, objectName);
        
        return storagePath; // Now returning the full path starting with bucket
    }

    public async Task<string> UploadThumbnailAsync(string storagePath, Stream data, string contentType, Dictionary<string, string>? tags = null)
    {
        await EnsureBucketExistsAsync();

        var putArgs = new PutObjectArgs()
            .WithBucket(DefaultBucket)
            .WithObject(storagePath)
            .WithStreamData(data)
            .WithObjectSize(data.Length)
            .WithContentType(contentType);
        
        if (tags != null && tags.Count > 0)
        {
            putArgs.WithTagging(new Tagging(tags, false));
        }

        await _minioClient.PutObjectAsync(putArgs);

        return $"{DefaultBucket}/{storagePath}";
    }

    public async Task<Stream> GetFileAsync(string storagePath)
    {
        // Handle paths that include the bucket prefix
        var parts = storagePath.Split('/', 2);
        
        string bucketName = DefaultBucket;
        string objectName = storagePath;

        if (parts.Length > 1)
        {
            // Try to see if the first part is a bucket
            try {
                if (await _minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(parts[0])))
                {
                    bucketName = parts[0];
                    objectName = parts[1];
                }
            } catch {
                // Fallback to default bucket if check fails
            }
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


    public async Task DeleteFileAsync(string storagePath)
    {
        var parts = storagePath.Split('/', 2);
        string bucketName = DefaultBucket;
        string objectName = storagePath;

        if (parts.Length > 1)
        {
            try {
                if (await _minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(parts[0])))
                {
                    bucketName = parts[0];
                    objectName = parts[1];
                }
            } catch { }
        }

        var rmArgs = new RemoveObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName);

        await _minioClient.RemoveObjectAsync(rmArgs);
        _logger.LogInformation("Deleted file from MinIO: {Bucket}/{Path}", bucketName, objectName);
    }
}

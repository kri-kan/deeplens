using Minio;
using Minio.DataModel.Args;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services;

/// <summary>
/// Service for storage management (MinIO). Single-tenant version.
/// </summary>
public interface IStorageService
{
    Task<string> UploadFileAsync(string fileName, Stream data, string contentType);
    Task<string> UploadThumbnailAsync(string storagePath, Stream data, string contentType);
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

    public async Task<string> UploadFileAsync(string fileName, Stream data, string contentType)
    {
        await EnsureBucketExistsAsync();

        // Generate unique path
        var path = $"raw/{DateTime.UtcNow:yyyy/MM/dd}/{Guid.NewGuid()}_{fileName}";

        var putArgs = new PutObjectArgs()
            .WithBucket(DefaultBucket)
            .WithObject(path)
            .WithStreamData(data)
            .WithObjectSize(data.Length)
            .WithContentType(contentType);

        await _minioClient.PutObjectAsync(putArgs);
        
        _logger.LogInformation("Uploaded file to MinIO: {Bucket}/{Path}", DefaultBucket, path);
        
        return $"{DefaultBucket}/{path}";
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

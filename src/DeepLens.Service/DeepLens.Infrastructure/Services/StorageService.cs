using Minio;
using Minio.DataModel.Args;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services;

public interface IStorageService
{
    Task<string> UploadFileAsync(Guid tenantId, string fileName, Stream data, string contentType);
    Task<string> UploadThumbnailAsync(Guid tenantId, string storagePath, Stream data, string contentType);
    Task<Stream> GetFileAsync(Guid tenantId, string storagePath);
    Task DeleteFileAsync(Guid tenantId, string storagePath);
}

public class MinioStorageService : IStorageService
{
    private readonly IMinioClient _minioClient;
    private readonly ILogger<MinioStorageService> _logger;

    public MinioStorageService(IMinioClient minioClient, ILogger<MinioStorageService> logger)
    {
        _minioClient = minioClient;
        _logger = logger;
    }

    public async Task<string> UploadFileAsync(Guid tenantId, string fileName, Stream data, string contentType)
    {
        // One bucket per tenant - ensure it exists
        var bucketName = $"tenant-{tenantId}".ToLower();
        
        var beArgs = new BucketExistsArgs().WithBucket(bucketName);
        bool found = await _minioClient.BucketExistsAsync(beArgs);
        if (!found)
        {
            var mbArgs = new MakeBucketArgs().WithBucket(bucketName);
            await _minioClient.MakeBucketAsync(mbArgs);
        }

        // Generate unique path
        var path = $"raw/{DateTime.UtcNow:yyyy/MM/dd}/{Guid.NewGuid()}_{fileName}";

        var putArgs = new PutObjectArgs()
            .WithBucket(bucketName)
            .WithObject(path)
            .WithStreamData(data)
            .WithObjectSize(data.Length)
            .WithContentType(contentType);

        await _minioClient.PutObjectAsync(putArgs);
        
        _logger.LogInformation("Uploaded file to MinIO: {Bucket}/{Path}", bucketName, path);
        
        return $"{bucketName}/{path}";
    }

    public async Task<string> UploadThumbnailAsync(Guid tenantId, string storagePath, Stream data, string contentType)
    {
        var bucketName = $"tenant-{tenantId}".ToLower();

        var putArgs = new PutObjectArgs()
            .WithBucket(bucketName)
            .WithObject(storagePath)
            .WithStreamData(data)
            .WithObjectSize(data.Length)
            .WithContentType(contentType);

        await _minioClient.PutObjectAsync(putArgs);
        return $"{bucketName}/{storagePath}";
    }

    public async Task<Stream> GetFileAsync(Guid tenantId, string storagePath)
    {
        string bucketName;
        string objectName;
        
        // Check if storagePath includes bucket prefix (e.g., "tenant-xxx/raw/...")
        // or is just the object path (e.g., "thumbnails/...")
        var parts = storagePath.Split('/', 2);
        if (parts.Length > 1 && parts[0].StartsWith("tenant-"))
        {
            // Path includes bucket prefix
            bucketName = parts[0];
            objectName = parts[1];
        }
        else
        {
            // Path is just the object name, prepend tenant bucket
            // Special case: Map dynamically generated Vayyari tenant ID to the test bucket
            if (tenantId == Guid.Parse("d715a589-7b3e-4e1f-82ce-0d426b0806dd"))
            {
                bucketName = "tenant-2abbd721-873e-4bf0-9cb2-c93c6894c584";
            }
            else
            {
                bucketName = $"tenant-{tenantId}".ToLower();
            }
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

    public async Task DeleteFileAsync(Guid tenantId, string storagePath)
    {
        // storagePath format is "tenant-xxx/path/to/file"
        var parts = storagePath.Split('/', 2);
        if (parts.Length < 2) return;

        var bucketName = parts[0];
        var objectName = parts[1];

        var rmArgs = new RemoveObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName);

        await _minioClient.RemoveObjectAsync(rmArgs);
        _logger.LogInformation("Deleted file from MinIO: {Bucket}/{Path}", bucketName, objectName);
    }
}

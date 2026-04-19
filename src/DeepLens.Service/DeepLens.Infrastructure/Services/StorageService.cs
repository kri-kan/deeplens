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
    Task<string> UploadToPathAsync(string storagePath, Stream data, string contentType);
    Task<string> UploadThumbnailAsync(string storagePath, Stream data, string contentType);
    Task<Stream> GetFileAsync(string storagePath);
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

    public async Task<string> UploadFileAsync(string fileName, Stream data, string contentType)
    {
        await EnsureBucketExistsAsync();

        // Standard dynamic path for generic uploads
        var path = $"raw/{DateTime.UtcNow:yyyy/MM/dd}/{Guid.NewGuid()}_{fileName}";
        return await UploadToPathAsync(path, data, contentType);
    }

    public async Task<string> UploadToPathAsync(string storagePath, Stream data, string contentType)
    {
        await EnsureBucketExistsAsync();

        var putArgs = new PutObjectArgs()
            .WithBucket(DefaultBucket)
            .WithObject(storagePath)
            .WithStreamData(data)
            .WithObjectSize(data.Length)
            .WithContentType(contentType);

        await _minioClient.PutObjectAsync(putArgs);
        
        _logger.LogInformation("Uploaded file to MinIO: {Bucket}/{Path}", DefaultBucket, storagePath);
        
        return $"{DefaultBucket}/{storagePath}";
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
        var parts = storagePath.Split('/', 2);
        string bucketName = parts.Length > 1 ? parts[0] : DefaultBucket;
        string objectName = parts.Length > 1 ? parts[1] : storagePath;

        // Minio SDK 6.x does not support SetObjectTaggingAsync - use mc CLI via docker exec
        var objectPath = $"local/{bucketName}/{objectName}";
        var psi = new System.Diagnostics.ProcessStartInfo("docker", $"exec minio mc tag set {objectPath} \"status=deleted\"")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };

        using var process = System.Diagnostics.Process.Start(psi)!;
        await process.WaitForExitAsync();

        if (process.ExitCode == 0)
            _logger.LogInformation("Marked object for deletion: {Path}", objectPath);
        else
        {
            var err = await process.StandardError.ReadToEndAsync();
            _logger.LogWarning("Failed to tag object for deletion: {Path} - {Error}", objectPath, err);
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

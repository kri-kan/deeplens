using Minio;
using Minio.DataModel.Args;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services;

public interface IStorageService
{
    Task<string> UploadFileAsync(Guid tenantId, string fileName, Stream data, string contentType);
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
}

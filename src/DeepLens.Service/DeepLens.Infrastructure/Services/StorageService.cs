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
    Task<Stream> GetFileRangeAsync(string storagePath, long offset, long length);
    Task<int> ReadRangeToBufferAsync(string storagePath, long offset, byte[] buffer, int bufferOffset, int count, CancellationToken ct = default);
    Task<long> GetFileLengthAsync(string storagePath);
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

    private async Task<(string BucketName, string ObjectName)> ResolveStoragePathAsync(string storagePath)
    {
        // Auto-heal double prefix and minio:// scheme format
        if (storagePath.Contains("minio://"))
        {
            var minioIndex = storagePath.IndexOf("minio://");
            storagePath = storagePath.Substring(minioIndex + 8);
        }

        var parts = storagePath.Split('/', 2);
        
        string bucketName = DefaultBucket;
        string objectName = storagePath;

        if (parts.Length > 1)
        {
            if (parts[0] == "photos" || parts[0] == "videos" || parts[0] == "stickers" || parts[0] == "documents" || parts[0] == "audios")
            {
                bucketName = "whatsapp-data";
                objectName = storagePath;
            }
            else
            {
                try {
                    if (await _minioClient.BucketExistsAsync(new BucketExistsArgs().WithBucket(parts[0])))
                    {
                        bucketName = parts[0];
                        objectName = parts[1];
                    }
                } catch { }
            }
        }

        return (bucketName, objectName);
    }

    public async Task<Stream> GetFileAsync(string storagePath)
    {
        long length = await GetFileLengthAsync(storagePath);
        return new MinioSeekableStream(this, storagePath, length);
    }

    public async Task<Stream> GetFileRangeAsync(string storagePath, long offset, long length)
    {
        long totalLength = await GetFileLengthAsync(storagePath);
        long endPosition = Math.Min(offset + length, totalLength);
        return new MinioSeekableStream(this, storagePath, endPosition) { Position = offset };
    }

    public async Task<int> ReadRangeToBufferAsync(string storagePath, long offset, byte[] buffer, int bufferOffset, int count, CancellationToken ct = default)
    {
        var (bucketName, objectName) = await ResolveStoragePathAsync(storagePath);
        int totalRead = 0;

        var getArgs = new GetObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName)
            .WithOffsetAndLength(offset, count)
            .WithCallbackStream(async (stream, cancellationToken) =>
            {
                int bytesRead;
                while (totalRead < count && (bytesRead = await stream.ReadAsync(buffer, bufferOffset + totalRead, count - totalRead, cancellationToken)) > 0)
                {
                    totalRead += bytesRead;
                }
            });

        await _minioClient.GetObjectAsync(getArgs, ct);
        return totalRead;
    }

    public async Task<long> GetFileLengthAsync(string storagePath)
    {
        var (bucketName, objectName) = await ResolveStoragePathAsync(storagePath);

        var statArgs = new StatObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName);

        var stat = await _minioClient.StatObjectAsync(statArgs);
        return stat.Size;
    }

    public async Task DeleteFileAsync(string storagePath)
    {
        var (bucketName, objectName) = await ResolveStoragePathAsync(storagePath);

        var rmArgs = new RemoveObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName);

        await _minioClient.RemoveObjectAsync(rmArgs);
        _logger.LogInformation("Deleted file from MinIO: {Bucket}/{Path}", bucketName, objectName);
    }
}

public class MinioSeekableStream : Stream
{
    private readonly IStorageService _storageService;
    private readonly string _storagePath;
    private readonly long _length;
    private long _position;

    public MinioSeekableStream(IStorageService storageService, string storagePath, long length)
    {
        _storageService = storageService;
        _storagePath = storagePath;
        _length = length;
        _position = 0;
    }

    public override bool CanRead => true;
    public override bool CanSeek => true;
    public override bool CanWrite => false;
    public override long Length => _length;
    public override long Position { get => _position; set => _position = value; }

    public override void Flush() { }

    public override int Read(byte[] buffer, int offset, int count)
    {
        return ReadAsync(buffer, offset, count, CancellationToken.None).GetAwaiter().GetResult();
    }

    public override async Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
    {
        if (_position >= _length) return 0;
        
        long remaining = _length - _position;
        int toRead = (int)Math.Min(count, remaining);
        
        int read = await _storageService.ReadRangeToBufferAsync(_storagePath, _position, buffer, offset, toRead, cancellationToken);
        _position += read;
        return read;
    }

    public override long Seek(long offset, SeekOrigin origin)
    {
        switch (origin)
        {
            case SeekOrigin.Begin: _position = offset; break;
            case SeekOrigin.Current: _position += offset; break;
            case SeekOrigin.End: _position = _length + offset; break;
        }
        return _position;
    }

    public override void SetLength(long value) => throw new NotSupportedException();
    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
}

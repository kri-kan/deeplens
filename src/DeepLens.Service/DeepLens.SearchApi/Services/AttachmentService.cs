using System.Data;
using System.IO;
using Dapper;
using Minio;
using Minio.DataModel.Args;
using Npgsql;
using DeepLens.Shared.Common;
using DeepLens.Infrastructure.Services;

namespace DeepLens.SearchApi.Services;

public interface IAttachmentService
{
    Task<Guid> UploadAttachmentAsync(Stream fileStream, string fileName, string contentType, string? entityType = null, string? entityId = null, string? tag = null);
    Task<bool> LinkAttachmentToEntityAsync(Guid attachmentId, string entityType, string entityId, string? tag = null);
    Task<bool> DeleteAttachmentAsync(Guid attachmentId);
}

public class AttachmentService : IAttachmentService
{
    private readonly IConfiguration _config;
    private readonly IMinioClient _minioClient;
    private readonly IStorageService _storageService;
    private readonly string _connectionString;

    public AttachmentService(IConfiguration config, IMinioClient minioClient, IStorageService storageService)
    {
        _config = config;
        _minioClient = minioClient;
        _storageService = storageService;
        _connectionString = _config.GetConnectionString("DefaultConnection") ?? throw new ArgumentNullException("Connection string not found");
    }

    private async Task<IDbConnection> GetConnectionAsync()
    {
        var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        return conn;
    }

    private string DetermineBucket(string? entityType)
    {
        // For now, everything goes to the main storage bucket, 
        // but we can split to 'vayyari-assets' here if needed.
        return "deeplens-storage";
    }

    public async Task<Guid> UploadAttachmentAsync(Stream fileStream, string fileName, string contentType, string? entityType = null, string? entityId = null, string? tag = null)
    {
        string bucketName = DetermineBucket(entityType);
        
        // 1. Ensure bucket exists
        var beArgs = new BucketExistsArgs().WithBucket(bucketName);
        bool found = await _minioClient.BucketExistsAsync(beArgs);
        if (!found)
        {
            var mbArgs = new MakeBucketArgs().WithBucket(bucketName);
            await _minioClient.MakeBucketAsync(mbArgs);
        }

        // 2. Generate path using the Registry if entity info is provided
        string objectKey;
        if (!string.IsNullOrEmpty(entityType) && !string.IsNullOrEmpty(entityId))
        {
            if (entityType.Equals("order", StringComparison.OrdinalIgnoreCase))
            {
                // If tag is receipt or transaction, use transaction path
                string type = (tag?.ToLower() == "receipt" || tag?.ToLower() == "transaction") 
                    ? StoragePathRegistry.OrderAttachmentTypes.Transaction 
                    : StoragePathRegistry.OrderAttachmentTypes.Comment;
                
                objectKey = StoragePathRegistry.GetOrderPath(entityId, type, fileName);
            }
            else if (entityType.Equals("product", StringComparison.OrdinalIgnoreCase))
            {
                string hash = Guid.NewGuid().ToString("N");
                string extension = Path.GetExtension(fileName);
                objectKey = StoragePathRegistry.GetProductPath(tag ?? "general", hash, extension);
            }
            else
            {
                objectKey = $"{entityType}/{entityId}/{Guid.NewGuid():N}_{fileName}";
            }
        }
        else
        {
            // Fallback for untagged uploads
            objectKey = $"uploads/{DateTime.UtcNow:yyyy/MM/dd}/{Guid.NewGuid():N}_{fileName}";
        }

        // 3. Upload to MinIO
        var putObjectArgs = new PutObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectKey)
            .WithStreamData(fileStream)
            .WithObjectSize(fileStream.Length)
            .WithContentType(contentType);

        await _minioClient.PutObjectAsync(putObjectArgs);

        // 4. Save metadata to Database
        var attachmentId = Guid.NewGuid();
        using var conn = await GetConnectionAsync();
        await conn.ExecuteAsync(@"
            INSERT INTO attachments (id, bucket_name, object_key, content_type, file_size_bytes, original_filename)
            VALUES (@Id, @Bucket, @Key, @ContentType, @Size, @FileName)",
            new { 
                Id = attachmentId, 
                Bucket = bucketName, 
                Key = objectKey, 
                ContentType = contentType, 
                Size = fileStream.Length, 
                FileName = fileName 
            });

        return attachmentId;
    }

    public async Task<bool> LinkAttachmentToEntityAsync(Guid attachmentId, string entityType, string entityId, string? tag = null)
    {
        using var conn = await GetConnectionAsync();
        var result = await conn.ExecuteAsync(@"
            INSERT INTO entity_attachments (attachment_id, entity_type, entity_id, tag)
            VALUES (@AttachmentId, @EntityType, @EntityId, @Tag)
            ON CONFLICT DO NOTHING",
            new { 
                AttachmentId = attachmentId, 
                EntityType = entityType, 
                EntityId = entityId, 
                Tag = tag
            });
            
        return result > 0;
    }

    public async Task<bool> DeleteAttachmentAsync(Guid attachmentId)
    {
        using var conn = await GetConnectionAsync();
        
        // 1. Get attachment info to find storage path
        var attachment = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT bucket_name, object_key FROM attachments WHERE id = @Id", 
            new { Id = attachmentId });

        if (attachment == null) return false;

        string path = $"{attachment.bucket_name}/{attachment.object_key}";

        // 2. Mark for deletion in MinIO
        await _storageService.MarkForDeletionAsync(path);

        // 3. Remove from database (both link and metadata)
        // Note: Using CASCADE or separate deletes depends on schema.
        await conn.ExecuteAsync("DELETE FROM entity_attachments WHERE attachment_id = @Id", new { Id = attachmentId });
        var result = await conn.ExecuteAsync("DELETE FROM attachments WHERE id = @Id", new { Id = attachmentId });

        return result > 0;
    }
}

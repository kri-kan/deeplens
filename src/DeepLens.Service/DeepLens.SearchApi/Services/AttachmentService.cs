using System.Data;
using System.IO;
using Dapper;
using Minio;
using Minio.DataModel.Args;
using Npgsql;
using DeepLens.Shared.Common;
using DeepLens.Infrastructure.Services;
using DeepLens.Contracts.Media;

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
    private readonly IMetadataService _metadataService;
    private readonly string _connectionString;

    public AttachmentService(IConfiguration config, IMinioClient minioClient, IStorageService storageService, IMetadataService metadataService)
    {
        _config = config;
        _minioClient = minioClient;
        _storageService = storageService;
        _metadataService = metadataService;
        _connectionString = _config.GetConnectionString("DefaultConnection") ?? throw new ArgumentNullException("Connection string not found");
    }

    private async Task<IDbConnection> GetConnectionAsync()
    {
        var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        return conn;
    }


    public async Task<Guid> UploadAttachmentAsync(Stream fileStream, string fileName, string contentType, string? entityType = null, string? entityId = null, string? tag = null)
    {
        // Use generalized storage service logic
        // For orders: bucket="order", subCategory=tag (transaction/reference/comments)
        var context = StorageContext.Create(MediaCategory.Order, tag ?? "Transaction");
        string fullPath = await _storageService.UploadFileAsync(fileName, fileStream, contentType, context);
        
        // Deconstruct path for DB storage (if schema requires separate bucket/key)
        var parts = fullPath.Split('/', 2);
        string bucketName = parts[0];
        string objectKey = parts[1];

        // 4. Save metadata to Database
        var attachmentId = Guid.NewGuid();
        using var conn = await GetConnectionAsync();
        const string insertSql = @"
            INSERT INTO attachments (id, bucket_name, object_key, content_type, file_size_bytes, original_filename, category, subcategory)
            VALUES (@Id, @Bucket, @Key, @ContentType, @Size, @FileName, @Category, @SubCategory)";

        await conn.ExecuteAsync(insertSql,
            new { 
                Id = attachmentId, 
                Bucket = bucketName, 
                Key = objectKey, 
                ContentType = contentType, 
                Size = fileStream.Length, 
                FileName = fileName,
                Category = context.Bucket,
                SubCategory = context.Folder
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

        // 2. Delete from MinIO
        await _storageService.DeleteFileAsync(path);

        // 3. Remove from database (both link and metadata)
        // Note: Using CASCADE or separate deletes depends on schema.
        await conn.ExecuteAsync("DELETE FROM entity_attachments WHERE attachment_id = @Id", new { Id = attachmentId });
        var result = await conn.ExecuteAsync("DELETE FROM attachments WHERE id = @Id", new { Id = attachmentId });

        return result > 0;
    }
}

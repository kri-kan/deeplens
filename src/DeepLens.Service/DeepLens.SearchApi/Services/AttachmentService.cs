using System.Data;
using System.IO;
using Dapper;
using Minio;
using Minio.DataModel.Args;
using Npgsql;
using DeepLens.Shared.Common;
using DeepLens.Infrastructure.Services;
using DeepLens.Contracts.Media;

using System.Text.Json.Serialization;

namespace DeepLens.SearchApi.Services;

public class AttachmentUploadResult
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = string.Empty;

    [JsonPropertyName("bucketName")]
    public string BucketName { get; set; } = string.Empty;

    [JsonPropertyName("objectKey")]
    public string ObjectKey { get; set; } = string.Empty;

    [JsonPropertyName("storagePath")]
    public string StoragePath { get; set; } = string.Empty;

    [JsonPropertyName("downloadUrl")]
    public string DownloadUrl { get; set; } = string.Empty;
}

public interface IAttachmentService
{
    Task<Guid> UploadAttachmentAsync(Stream fileStream, string fileName, string contentType, string? entityType = null, string? entityId = null, string? tag = null);
    Task<AttachmentUploadResult> UploadAttachmentWithResultAsync(Stream fileStream, string fileName, string contentType, string? entityType = null, string? entityId = null, string? tag = null);
    Task<bool> LinkAttachmentToEntityAsync(Guid attachmentId, string entityType, string entityId, string? tag = null);
    Task<bool> DeleteAttachmentAsync(Guid attachmentId);
    Task<bool> DeleteAttachmentByPathAsync(string storagePath);
}

public class AttachmentService : IAttachmentService
{
    private readonly IConfiguration _config;
    private readonly IMinioClient _minioClient;
    private readonly IStorageService _storageService;
    private readonly IMetadataService _metadataService;
    private readonly ILogger<AttachmentService> _logger;
    private readonly string _connectionString;

    public AttachmentService(
        IConfiguration config, 
        IMinioClient minioClient, 
        IStorageService storageService, 
        IMetadataService metadataService,
        ILogger<AttachmentService> logger)
    {
        _config = config;
        _minioClient = minioClient;
        _storageService = storageService;
        _metadataService = metadataService;
        _logger = logger;
        _connectionString = _config.GetConnectionString("DefaultConnection") ?? throw new ArgumentNullException("Connection string not found");
    }

    private async Task<IDbConnection> GetConnectionAsync()
    {
        var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        return conn;
    }

    public async Task<AttachmentUploadResult> UploadAttachmentWithResultAsync(Stream fileStream, string fileName, string contentType, string? entityType = null, string? entityId = null, string? tag = null)
    {
        // Use generalized storage service logic
        // For orders: bucket="order", subCategory=tag (transaction/reference/comments)
        var context = StorageContext.Create(MediaCategory.Order, tag ?? "Reference");
        string fullPath = await _storageService.UploadFileAsync(fileName, fileStream, contentType, context);
        
        // Deconstruct path for DB storage (if schema requires separate bucket/key)
        var parts = fullPath.Split('/', 2);
        string bucketName = parts[0];
        string objectKey = parts[1];

        // Save metadata to Database
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

        string downloadUrl = $"/api/v1/Attachment/download?path={Uri.EscapeDataString(fullPath)}";
        return new AttachmentUploadResult
        {
            Id = attachmentId,
            FileName = fileName,
            BucketName = bucketName,
            ObjectKey = objectKey,
            StoragePath = fullPath,
            DownloadUrl = downloadUrl
        };
    }

    public async Task<Guid> UploadAttachmentAsync(Stream fileStream, string fileName, string contentType, string? entityType = null, string? entityId = null, string? tag = null)
    {
        var result = await UploadAttachmentWithResultAsync(fileStream, fileName, contentType, entityType, entityId, tag);
        return result.Id;
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
        try
        {
            await _storageService.DeleteFileAsync(path);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete physical file from storage for path: {Path}", path);
        }

        // 3. Remove from database (both link and metadata)
        await conn.ExecuteAsync("DELETE FROM entity_attachments WHERE attachment_id = @Id", new { Id = attachmentId });
        var result = await conn.ExecuteAsync("DELETE FROM attachments WHERE id = @Id", new { Id = attachmentId });

        _logger.LogInformation("Hard-deleted attachment {AttachmentId} ({Path}) from database and MinIO", attachmentId, path);
        return result > 0;
    }

    public async Task<bool> DeleteAttachmentByPathAsync(string inputPath)
    {
        if (string.IsNullOrWhiteSpace(inputPath)) return false;

        string cleanPath = inputPath.Trim();
        // Extract inner path if URL contains ?path=
        if (cleanPath.Contains("path=", StringComparison.OrdinalIgnoreCase))
        {
            var idx = cleanPath.IndexOf("path=", StringComparison.OrdinalIgnoreCase);
            var sub = cleanPath.Substring(idx + 5);
            var endIdx = sub.IndexOf('&');
            if (endIdx > 0) sub = sub.Substring(0, endIdx);
            cleanPath = Uri.UnescapeDataString(sub);
        }

        // Strip leading slash or protocol if present
        if (cleanPath.StartsWith("/")) cleanPath = cleanPath.TrimStart('/');

        if (Guid.TryParse(cleanPath, out var guid))
        {
            return await DeleteAttachmentAsync(guid);
        }

        using var conn = await GetConnectionAsync();

        // Check if there is an attachment matching bucket_name/object_key or object_key
        var parts = cleanPath.Split('/', 2);
        string bucket = parts.Length > 1 ? parts[0] : "";
        string key = parts.Length > 1 ? parts[1] : cleanPath;

        var attachment = await conn.QueryFirstOrDefaultAsync<dynamic>(@"
            SELECT id, bucket_name, object_key 
            FROM attachments 
            WHERE (bucket_name = @Bucket AND object_key = @Key)
               OR object_key = @CleanPath
               OR object_key = @Key
            LIMIT 1",
            new { Bucket = bucket, Key = key, CleanPath = cleanPath });

        if (attachment != null)
        {
            Guid attId = (Guid)attachment.id;
            string fullPath = $"{attachment.bucket_name}/{attachment.object_key}";

            try
            {
                await _storageService.DeleteFileAsync(fullPath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete physical file from storage for path: {Path}", fullPath);
            }

            await conn.ExecuteAsync("DELETE FROM entity_attachments WHERE attachment_id = @Id", new { Id = attId });
            await conn.ExecuteAsync("DELETE FROM attachments WHERE id = @Id", new { Id = attId });
            _logger.LogInformation("Hard-deleted attachment by path {CleanPath} (ID: {AttachmentId})", cleanPath, attId);
            return true;
        }

        // If not found in attachments table, attempt physical delete from MinIO directly
        try
        {
            await _storageService.DeleteFileAsync(cleanPath);
            _logger.LogInformation("Hard-deleted unindexed physical file from MinIO storage: {CleanPath}", cleanPath);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete physical file directly for path: {Path}", cleanPath);
            return false;
        }
    }
}

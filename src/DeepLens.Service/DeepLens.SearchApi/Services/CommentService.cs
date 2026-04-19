using System.Data;
using Dapper;
using Npgsql;

namespace DeepLens.SearchApi.Services;

public interface ICommentService
{
    Task<IEnumerable<object>> GetCommentsAsync(string entityType, string entityId);
    Task<Guid> AddCommentAsync(string entityType, string entityId, string content, Guid[]? attachmentIds = null, Guid? authorId = null);
    Task<bool> UpdateCommentAsync(Guid commentId, string content, Guid[]? attachmentIds = null);
    Task<bool> DeleteCommentAsync(Guid commentId);
}

public class CommentService : ICommentService
{
    private readonly string _connectionString;

    public CommentService(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("DefaultConnection") ?? throw new ArgumentNullException("Connection string not found");
    }

    private async Task<IDbConnection> GetConnectionAsync()
    {
        var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        return conn;
    }

    public async Task<IEnumerable<object>> GetCommentsAsync(string entityType, string entityId)
    {
        using var conn = await GetConnectionAsync();
        return await conn.QueryAsync(@"
            SELECT 
                c.id, 
                c.content, 
                c.attachment_ids as attachmentIds, 
                c.created_at as createdAt,
                -- We can join with attachments here if needed to return full metadata
                (
                    SELECT json_agg(json_build_object('id', a.id, 'name', a.original_filename, 'bucket', a.bucket_name, 'key', a.object_key))
                    FROM attachments a
                    WHERE a.id = ANY(c.attachment_ids)
                ) as attachments
            FROM comments c
            WHERE c.entity_type = @Type AND c.entity_id = @Id
            ORDER BY c.created_at ASC",
            new { Type = entityType, Id = entityId });
    }

    public async Task<Guid> AddCommentAsync(string entityType, string entityId, string content, Guid[]? attachmentIds = null, Guid? authorId = null)
    {
        using var conn = await GetConnectionAsync();
        var commentId = Guid.NewGuid();
        
        await conn.ExecuteAsync(@"
            INSERT INTO comments (id, entity_type, entity_id, content, attachment_ids, author_id)
            VALUES (@Id, @Type, @EntityId, @Content, @AttachmentIds, @AuthorId)",
            new { 
                Id = commentId, 
                Type = entityType, 
                EntityId = entityId, 
                Content = content, 
                AttachmentIds = attachmentIds ?? new Guid[0],
                AuthorId = authorId
            });
            
        return commentId;
    }

    public async Task<bool> UpdateCommentAsync(Guid commentId, string content, Guid[]? attachmentIds = null)
    {
        using var conn = await GetConnectionAsync();
        var result = await conn.ExecuteAsync(@"
            UPDATE comments 
            SET content = @Content, 
                attachment_ids = COALESCE(@AttachmentIds, attachment_ids),
                updated_at = NOW()
            WHERE id = @Id",
            new { Id = commentId, Content = content, AttachmentIds = attachmentIds });
            
        return result > 0;
    }

    public async Task<bool> DeleteCommentAsync(Guid commentId)
    {
        using var conn = await GetConnectionAsync();
        var result = await conn.ExecuteAsync("DELETE FROM comments WHERE id = @Id", new { Id = commentId });
        return result > 0;
    }
}

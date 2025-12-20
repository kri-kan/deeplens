using Dapper;
using NextGen.Identity.Core.Entities;
using NextGen.Identity.Core.Interfaces;
using System.Diagnostics;

namespace NextGen.Identity.Data.Repositories;

public class TenantRepository : ITenantRepository
{
    private readonly DbConnectionFactory _connectionFactory;

    public TenantRepository(DbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<Tenant?> GetByIdAsync(Guid id)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseQuery);
        activity?.SetTag(Telemetry.Tags.DbTable, "tenants");
        activity?.SetTag(Telemetry.Tags.DbOperation, "select");
        activity?.SetTag(Telemetry.Tags.TenantId, id);

        const string sql = @"
            SELECT id, name, description, slug, database_name AS databasename, 
                   connection_string AS connectionstring,
                   qdrant_container_name AS qdrantcontainername, qdrant_http_port AS qdranthttp port,
                   qdrant_grpc_port AS qdrantgrpcport, minio_endpoint AS minioendpoint,
                   minio_bucket_name AS miniobucketname, status, tier,
                   max_storage_bytes AS maxstoragebytes, max_users AS maxusers,
                   max_api_calls_per_day AS maxapicallsperday, settings,
                   created_at AS createdat, updated_at AS updatedat, 
                   deleted_at AS deletedat, created_by AS createdby
            FROM tenants
            WHERE id = @Id AND deleted_at IS NULL";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<Tenant>(sql, new { Id = id });
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task<Tenant?> GetBySlugAsync(string slug)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseQuery);
        activity?.SetTag(Telemetry.Tags.DbTable, "tenants");
        activity?.SetTag(Telemetry.Tags.DbOperation, "select");
        activity?.SetTag("tenant.slug", slug);

        const string sql = @"
            SELECT id, name, description, slug, database_name AS databasename, 
                   connection_string AS connectionstring,
                   qdrant_container_name AS qdrantcontainername, qdrant_http_port AS qdanthttpport,
                   qdrant_grpc_port AS qdrantgrpcport, minio_endpoint AS minioendpoint,
                   minio_bucket_name AS miniobucketname, status, tier,
                   max_storage_bytes AS maxstoragebytes, max_users AS maxusers,
                   max_api_calls_per_day AS maxapicallsperday, settings,
                   created_at AS createdat, updated_at AS updatedat, 
                   deleted_at AS deletedat, created_by AS createdby
            FROM tenants
            WHERE slug = @Slug AND deleted_at IS NULL";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<Tenant>(sql, new { Slug = slug });
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task<List<Tenant>> GetAllAsync()
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseQuery);
        activity?.SetTag(Telemetry.Tags.DbTable, "tenants");
        activity?.SetTag(Telemetry.Tags.DbOperation, "select");

        const string sql = @"
            SELECT id, name, description, slug, database_name AS databasename, 
                   connection_string AS connectionstring,
                   qdrant_container_name AS qdrantcontainername, qdrant_http_port AS qdanthttpport,
                   qdrant_grpc_port AS qdrantgrpcport, minio_endpoint AS minioendpoint,
                   minio_bucket_name AS miniobucketname, status, tier,
                   max_storage_bytes AS maxstoragebytes, max_users AS maxusers,
                   max_api_calls_per_day AS maxapicallsperday, settings,
                   created_at AS createdat, updated_at AS updatedat, 
                   deleted_at AS deletedat, created_by AS createdby
            FROM tenants
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            var result = await connection.QueryAsync<Tenant>(sql);
            activity?.SetTag("result.count", result.Count());
            return result.ToList();
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task<Tenant> CreateAsync(Tenant tenant)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseCommand);
        activity?.SetTag(Telemetry.Tags.DbTable, "tenants");
        activity?.SetTag(Telemetry.Tags.DbOperation, "insert");
        activity?.SetTag("tenant.slug", tenant.Slug);

        const string sql = @"
            INSERT INTO tenants (id, name, description, slug, database_name, connection_string,
                               qdrant_container_name, qdrant_http_port, qdrant_grpc_port,
                               minio_endpoint, minio_bucket_name, status, tier,
                               max_storage_bytes, max_users, max_api_calls_per_day, settings,
                               created_at, created_by)
            VALUES (@Id, @Name, @Description, @Slug, @DatabaseName, @ConnectionString,
                    @QdrantContainerName, @QdrantHttpPort, @QdrantGrpcPort,
                    @MinioEndpoint, @MinioBucketName, @Status, @Tier,
                    @MaxStorageBytes, @MaxUsers, @MaxApiCallsPerDay, @Settings,
                    @CreatedAt, @CreatedBy)
            RETURNING id";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            tenant.Id = await connection.ExecuteScalarAsync<Guid>(sql, tenant);
            activity?.SetTag(Telemetry.Tags.TenantId, tenant.Id);
            return tenant;
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task UpdateAsync(Tenant tenant)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseCommand);
        activity?.SetTag(Telemetry.Tags.DbTable, "tenants");
        activity?.SetTag(Telemetry.Tags.DbOperation, "update");
        activity?.SetTag(Telemetry.Tags.TenantId, tenant.Id);

        const string sql = @"
            UPDATE tenants
            SET name = @Name,
                description = @Description,
                status = @Status,
                tier = @Tier,
                max_storage_bytes = @MaxStorageBytes,
                max_users = @MaxUsers,
                max_api_calls_per_day = @MaxApiCallsPerDay,
                settings = @Settings,
                updated_at = @UpdatedAt
            WHERE id = @Id";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.ExecuteAsync(sql, tenant);
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }

    public async Task DeleteAsync(Guid id)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseCommand);
        activity?.SetTag(Telemetry.Tags.DbTable, "tenants");
        activity?.SetTag(Telemetry.Tags.DbOperation, "delete");
        activity?.SetTag(Telemetry.Tags.TenantId, id);

        const string sql = @"DELETE FROM tenants WHERE id = @Id";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.ExecuteAsync(sql, new { Id = id });
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag(Telemetry.Tags.ErrorMessage, ex.Message);
            throw;
        }
    }
}

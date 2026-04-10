using Dapper;
using NextGen.Identity.Core.Entities;
using NextGen.Identity.Core.Interfaces;
using System.Diagnostics;

namespace NextGen.Identity.Data.Repositories;

public class TenantApiKeyRepository : ITenantApiKeyRepository
{
    private readonly DbConnectionFactory _connectionFactory;

    public TenantApiKeyRepository(DbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<TenantApiKey?> GetByIdAsync(Guid id)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseQuery);
        activity?.SetTag(Telemetry.Tags.DbTable, "tenant_api_keys");
        activity?.SetTag(Telemetry.Tags.DbOperation, "select");

        const string sql = @"
            SELECT id, tenant_id AS tenantid, name, key_hash AS keyhash, key_prefix AS keyprefix,
                   scopes, created_at AS createdat, expires_at AS expiresat, 
                   last_used_at AS lastusedat, is_active AS isactive, created_by AS createdby
            FROM tenant_api_keys
            WHERE id = @Id";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<TenantApiKey>(sql, new { Id = id });
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            throw;
        }
    }

    public async Task<TenantApiKey?> GetByPrefixAsync(string prefix)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseQuery);
        activity?.SetTag(Telemetry.Tags.DbTable, "tenant_api_keys");
        activity?.SetTag(Telemetry.Tags.DbOperation, "select");

        const string sql = @"
            SELECT id, tenant_id AS tenantid, name, key_hash AS keyhash, key_prefix AS keyprefix,
                   scopes, created_at AS createdat, expires_at AS expiresat, 
                   last_used_at AS lastusedat, is_active AS isactive, created_by AS createdby
            FROM tenant_api_keys
            WHERE key_prefix = @Prefix AND is_active = TRUE";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<TenantApiKey>(sql, new { Prefix = prefix });
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            throw;
        }
    }

    public async Task<List<TenantApiKey>> GetByTenantIdAsync(Guid tenantId)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseQuery);
        activity?.SetTag(Telemetry.Tags.DbTable, "tenant_api_keys");
        activity?.SetTag(Telemetry.Tags.DbOperation, "select");
        activity?.SetTag(Telemetry.Tags.TenantId, tenantId);

        const string sql = @"
            SELECT id, tenant_id AS tenantid, name, key_hash AS keyhash, key_prefix AS keyprefix,
                   scopes, created_at AS createdat, expires_at AS expiresat, 
                   last_used_at AS lastusedat, is_active AS isactive, created_by AS createdby
            FROM tenant_api_keys
            WHERE tenant_id = @TenantId
            ORDER BY created_at DESC";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            var result = await connection.QueryAsync<TenantApiKey>(sql, new { TenantId = tenantId });
            return result.ToList();
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            throw;
        }
    }

    public async Task<TenantApiKey> CreateAsync(TenantApiKey apiKey)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseCommand);
        activity?.SetTag(Telemetry.Tags.DbTable, "tenant_api_keys");
        activity?.SetTag(Telemetry.Tags.DbOperation, "insert");

        const string sql = @"
            INSERT INTO tenant_api_keys (id, tenant_id, name, key_hash, key_prefix, scopes, created_at, expires_at, is_active, created_by)
            VALUES (@Id, @TenantId, @Name, @KeyHash, @KeyPrefix, @Scopes, @CreatedAt, @ExpiresAt, @IsActive, @CreatedBy)
            RETURNING id";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            apiKey.Id = await connection.ExecuteScalarAsync<Guid>(sql, new {
                apiKey.Id,
                apiKey.TenantId,
                apiKey.Name,
                apiKey.KeyHash,
                apiKey.KeyPrefix,
                apiKey.Scopes,
                apiKey.CreatedAt,
                apiKey.ExpiresAt,
                apiKey.IsActive,
                apiKey.CreatedBy
            });
            return apiKey;
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            throw;
        }
    }

    public async Task UpdateAsync(TenantApiKey apiKey)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseCommand);
        activity?.SetTag(Telemetry.Tags.DbTable, "tenant_api_keys");
        activity?.SetTag(Telemetry.Tags.DbOperation, "update");

        const string sql = @"
            UPDATE tenant_api_keys
            SET last_used_at = @LastUsedAt,
                is_active = @IsActive
            WHERE id = @Id";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.ExecuteAsync(sql, new {
                apiKey.LastUsedAt,
                apiKey.IsActive,
                apiKey.Id
            });
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            throw;
        }
    }

    public async Task DeleteAsync(Guid id)
    {
        using var activity = Telemetry.ActivitySource.StartActivity(Telemetry.Operations.DatabaseCommand);
        activity?.SetTag(Telemetry.Tags.DbTable, "tenant_api_keys");
        activity?.SetTag(Telemetry.Tags.DbOperation, "delete");

        const string sql = @"DELETE FROM tenant_api_keys WHERE id = @Id";

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            await connection.ExecuteAsync(sql, new { Id = id });
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            throw;
        }
    }
}

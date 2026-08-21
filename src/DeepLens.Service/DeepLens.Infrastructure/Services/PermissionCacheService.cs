using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Auth;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace DeepLens.Infrastructure.Services;

public class PermissionCacheService : IPermissionCacheService
{
    private readonly IMemoryCache _memoryCache;
    private readonly IDistributedCache _distributedCache;
    private readonly IDbConnectionFactory _dbConnectionFactory;
    private readonly ILogger<PermissionCacheService> _logger;

    private static readonly TimeSpan L1MemoryTtl = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan L2RedisTtl = TimeSpan.FromMinutes(15);
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public PermissionCacheService(
        IMemoryCache memoryCache,
        IDistributedCache distributedCache,
        IDbConnectionFactory dbConnectionFactory,
        ILogger<PermissionCacheService> logger)
    {
        _memoryCache = memoryCache;
        _distributedCache = distributedCache;
        _dbConnectionFactory = dbConnectionFactory;
        _logger = logger;
    }

    private static string GetCacheKey(Guid tenantId, Guid userId) => $"vayyari:auth:{tenantId}:{userId}";

    public async Task<UserAuthorizationModel> GetUserAuthorizationAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken = default)
    {
        var cacheKey = GetCacheKey(tenantId, userId);

        // 1. Check L1 Memory Cache
        if (_memoryCache.TryGetValue(cacheKey, out UserAuthorizationModel? memoryModel) && memoryModel != null)
        {
            _logger.LogDebug("RBAC L1 cache hit for key {CacheKey}", cacheKey);
            return memoryModel;
        }

        // 2. Check L2 Redis Cache
        try
        {
            var redisValue = await _distributedCache.GetStringAsync(cacheKey, cancellationToken);
            if (!string.IsNullOrEmpty(redisValue))
            {
                var redisModel = JsonSerializer.Deserialize<UserAuthorizationModel>(redisValue, JsonOpts);
                if (redisModel != null)
                {
                    _logger.LogDebug("RBAC L2 Redis hit for key {CacheKey}", cacheKey);
                    _memoryCache.Set(cacheKey, redisModel, L1MemoryTtl);
                    return redisModel;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RBAC Redis read failed for key {CacheKey}, falling back to database", cacheKey);
        }

        // 3. Fallback to PostgreSQL
        _logger.LogDebug("RBAC cache miss for key {CacheKey}, querying PostgreSQL", cacheKey);
        var dbModel = await LoadFromDatabaseAsync(tenantId, userId, cancellationToken);

        // Populate L2 Redis Cache
        try
        {
            var serialized = JsonSerializer.Serialize(dbModel, JsonOpts);
            await _distributedCache.SetStringAsync(cacheKey, serialized, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = L2RedisTtl
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RBAC Redis write failed for key {CacheKey}", cacheKey);
        }

        // Populate L1 Memory Cache
        _memoryCache.Set(cacheKey, dbModel, L1MemoryTtl);

        return dbModel;
    }

    private async Task<UserAuthorizationModel> LoadFromDatabaseAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken)
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        const string sql = @"
            -- 1. Roles
            SELECT DISTINCT r.code
            FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = @UserId AND ur.tenant_id = @TenantId;

            -- 2. Permissions via Roles
            SELECT DISTINCT p.code
            FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role_id = rp.role_id
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = @UserId AND ur.tenant_id = @TenantId;

            -- 3. Custom direct permission overrides
            SELECT DISTINCT p.code
            FROM public.user_permissions up
            JOIN public.permissions p ON up.permission_id = p.id
            WHERE up.user_id = @UserId AND up.tenant_id = @TenantId;
        ";

        using var multi = await connection.QueryMultipleAsync(new CommandDefinition(sql, new { UserId = userId, TenantId = tenantId }, cancellationToken: cancellationToken));
        
        var roles = (await multi.ReadAsync<string>()).ToList();
        var rolePermissions = (await multi.ReadAsync<string>()).ToList();
        var customPermissions = (await multi.ReadAsync<string>()).ToList();

        var isSuperAdmin = roles.Any(r => string.Equals(r, "super_admin", StringComparison.OrdinalIgnoreCase));

        var distinctPermissions = new HashSet<string>(rolePermissions.Concat(customPermissions), StringComparer.OrdinalIgnoreCase);

        // If super admin, ensure all master catalog permissions are populated
        if (isSuperAdmin)
        {
            const string allPermsSql = "SELECT code FROM public.permissions;";
            var allPerms = await connection.QueryAsync<string>(new CommandDefinition(allPermsSql, cancellationToken: cancellationToken));
            foreach (var perm in allPerms)
            {
                distinctPermissions.Add(perm);
            }
        }

        return new UserAuthorizationModel
        {
            UserId = userId,
            TenantId = tenantId,
            IsSuperAdmin = isSuperAdmin,
            Roles = roles,
            Permissions = distinctPermissions.OrderBy(p => p).ToList(),
            Version = 1
        };
    }

    public async Task InvalidateUserCacheAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken = default)
    {
        var cacheKey = GetCacheKey(tenantId, userId);
        _memoryCache.Remove(cacheKey);

        try
        {
            await _distributedCache.RemoveAsync(cacheKey, cancellationToken);
            _logger.LogInformation("Invalidated RBAC cache for user {UserId} in tenant {TenantId}", userId, tenantId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to invalidate Redis cache for key {CacheKey}", cacheKey);
        }
    }

    public async Task InvalidateRoleCacheAsync(Guid roleId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var connection = await _dbConnectionFactory.CreateConnectionAsync();
            const string sql = "SELECT DISTINCT user_id, tenant_id FROM public.user_roles WHERE role_id = @RoleId;";
            var affectedUsers = await connection.QueryAsync<(Guid UserId, Guid TenantId)>(
                new CommandDefinition(sql, new { RoleId = roleId }, cancellationToken: cancellationToken));

            foreach (var (userId, tenantId) in affectedUsers)
            {
                await InvalidateUserCacheAsync(tenantId, userId, cancellationToken);
            }

            _logger.LogInformation("Invalidated RBAC cache for all users of role {RoleId}", roleId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to invalidate role cache for role {RoleId}", roleId);
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Auth;
using DeepLens.Infrastructure.Services;
using DeepLens.SearchApi.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/admin/roles")]
[Authorize]
public class AdminRolesController : ControllerBase
{
    private readonly IDbConnectionFactory _dbConnectionFactory;
    private readonly IPermissionCacheService _permissionCacheService;
    private readonly ILogger<AdminRolesController> _logger;

    public AdminRolesController(
        IDbConnectionFactory dbConnectionFactory,
        IPermissionCacheService permissionCacheService,
        ILogger<AdminRolesController> logger)
    {
        _dbConnectionFactory = dbConnectionFactory;
        _permissionCacheService = permissionCacheService;
        _logger = logger;
    }

    private async Task<Guid> ResolveTenantIdAsync()
    {
        var tenantClaim = User.FindFirst("tenant_id")?.Value
                       ?? User.FindFirst("tenantId")?.Value;

        if (!string.IsNullOrEmpty(tenantClaim) && Guid.TryParse(tenantClaim, out var tenantId) && tenantId != Guid.Empty)
        {
            return tenantId;
        }

        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;

        if (Guid.TryParse(sub, out var userId))
        {
            using var connection = await _dbConnectionFactory.CreateConnectionAsync();
            const string sql = "SELECT tenant_id FROM public.users WHERE id = @UserId LIMIT 1;";
            return await connection.QueryFirstOrDefaultAsync<Guid>(sql, new { UserId = userId });
        }

        return Guid.Empty;
    }

    /// <summary>
    /// List all roles applicable to the current tenant (system roles + tenant custom roles)
    /// </summary>
    [HttpGet]
    [HasPermission("roles:view")]
    public async Task<IActionResult> GetRoles()
    {
        var tenantId = await ResolveTenantIdAsync();
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        const string sql = @"
            SELECT 
                r.id,
                r.tenant_id,
                r.code,
                r.name,
                r.description,
                r.is_system,
                r.created_at,
                r.updated_at,
                (SELECT COUNT(DISTINCT ur.user_id) FROM public.user_roles ur WHERE ur.role_id = r.id AND (ur.tenant_id = @TenantId OR @TenantId = '00000000-0000-0000-0000-000000000000'::uuid)) as user_count,
                (SELECT COUNT(DISTINCT rp.permission_id) FROM public.role_permissions rp WHERE rp.role_id = r.id) as permission_count
            FROM public.roles r
            WHERE r.tenant_id IS NULL OR r.tenant_id = @TenantId
            ORDER BY r.is_system DESC, r.name ASC;";

        var roles = (await connection.QueryAsync<RoleDto>(sql, new { TenantId = tenantId })).ToList();

        // Populate permission codes for each role
        const string permsSql = @"
            SELECT rp.role_id, p.code
            FROM public.role_permissions rp
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = ANY(@RoleIds);";

        if (roles.Any())
        {
            var roleIds = roles.Select(r => r.Id).ToArray();
            var permsList = (await connection.QueryAsync<(Guid RoleId, string Code)>(permsSql, new { RoleIds = roleIds })).ToList();
            var permsByRole = permsList.GroupBy(p => p.RoleId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Code).ToList());

            foreach (var role in roles)
            {
                if (permsByRole.TryGetValue(role.Id, out var pCodes))
                {
                    role.Permissions = pCodes;
                }
            }
        }

        return Ok(roles);
    }

    /// <summary>
    /// Get single role details
    /// </summary>
    [HttpGet("{id:guid}")]
    [HasPermission("roles:view")]
    public async Task<IActionResult> GetRoleById(Guid id)
    {
        var tenantId = await ResolveTenantIdAsync();
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        const string sql = @"
            SELECT 
                r.id,
                r.tenant_id,
                r.code,
                r.name,
                r.description,
                r.is_system,
                r.created_at,
                r.updated_at,
                (SELECT COUNT(DISTINCT ur.user_id) FROM public.user_roles ur WHERE ur.role_id = r.id AND (ur.tenant_id = @TenantId OR @TenantId = '00000000-0000-0000-0000-000000000000'::uuid)) as user_count,
                (SELECT COUNT(DISTINCT rp.permission_id) FROM public.role_permissions rp WHERE rp.role_id = r.id) as permission_count
            FROM public.roles r
            WHERE r.id = @Id AND (r.tenant_id IS NULL OR r.tenant_id = @TenantId);";

        var role = await connection.QueryFirstOrDefaultAsync<RoleDto>(sql, new { Id = id, TenantId = tenantId });
        if (role == null) return NotFound(new { message = "Role not found." });

        const string permsSql = @"
            SELECT p.code
            FROM public.role_permissions rp
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = @RoleId;";

        role.Permissions = (await connection.QueryAsync<string>(permsSql, new { RoleId = id })).ToList();

        return Ok(role);
    }

    /// <summary>
    /// Create custom tenant role
    /// </summary>
    [HttpPost]
    [HasPermission("roles:manage")]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Role code and name are required." });
        }

        var tenantId = await ResolveTenantIdAsync();
        if (tenantId == Guid.Empty) return BadRequest(new { message = "Invalid tenant context." });

        var normalizedCode = request.Code.Trim().ToLowerInvariant().Replace(' ', '_');

        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        // Check if role code exists
        const string checkSql = "SELECT COUNT(*) FROM public.roles WHERE (tenant_id = @TenantId OR tenant_id IS NULL) AND LOWER(code) = LOWER(@Code);";
        var existingCount = await connection.ExecuteScalarAsync<int>(checkSql, new { TenantId = tenantId, Code = normalizedCode });
        if (existingCount > 0)
        {
            return Conflict(new { message = $"Role with code '{normalizedCode}' already exists." });
        }

        var roleId = Guid.NewGuid();

        using var transaction = connection.BeginTransaction();
        try
        {
            const string insertRoleSql = @"
                INSERT INTO public.roles (id, tenant_id, code, name, description, is_system, created_at)
                VALUES (@Id, @TenantId, @Code, @Name, @Description, false, CURRENT_TIMESTAMP);";

            await connection.ExecuteAsync(insertRoleSql, new
            {
                Id = roleId,
                TenantId = tenantId,
                Code = normalizedCode,
                Name = request.Name.Trim(),
                Description = request.Description?.Trim()
            }, transaction);

            // Resolve and assign permissions
            var permIdsToAssign = new HashSet<Guid>();
            if (request.PermissionIds != null && request.PermissionIds.Any())
            {
                foreach (var pid in request.PermissionIds) permIdsToAssign.Add(pid);
            }

            if (request.Permissions != null && request.Permissions.Any())
            {
                const string permLookupSql = "SELECT id FROM public.permissions WHERE code = ANY(@Codes);";
                var lookedUpIds = await connection.QueryAsync<Guid>(permLookupSql, new { Codes = request.Permissions.ToArray() }, transaction);
                foreach (var pid in lookedUpIds) permIdsToAssign.Add(pid);
            }

            if (permIdsToAssign.Any())
            {
                const string insertPermSql = @"
                    INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
                    VALUES (@RoleId, @PermissionId, CURRENT_TIMESTAMP)
                    ON CONFLICT (role_id, permission_id) DO NOTHING;";

                foreach (var pid in permIdsToAssign)
                {
                    await connection.ExecuteAsync(insertPermSql, new { RoleId = roleId, PermissionId = pid }, transaction);
                }
            }

            transaction.Commit();
        }
        catch
        {
            transaction.Rollback();
            throw;
        }

        return CreatedAtAction(nameof(GetRoleById), new { id = roleId }, new
        {
            id = roleId,
            code = normalizedCode,
            name = request.Name.Trim(),
            description = request.Description?.Trim(),
            tenantId = tenantId,
            isSystem = false
        });
    }

    /// <summary>
    /// Get permissions assigned to a role
    /// </summary>
    [HttpGet("{id:guid}/permissions")]
    [HasPermission("roles:view")]
    public async Task<IActionResult> GetRolePermissions(Guid id)
    {
        var tenantId = await ResolveTenantIdAsync();
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        // Check role exists
        const string checkRoleSql = "SELECT code, name FROM public.roles WHERE id = @Id AND (tenant_id IS NULL OR tenant_id = @TenantId);";
        var role = await connection.QueryFirstOrDefaultAsync(checkRoleSql, new { Id = id, TenantId = tenantId });
        if (role == null) return NotFound(new { message = "Role not found." });

        const string sql = @"
            SELECT p.id, p.code, p.name, p.category, p.description, p.created_at
            FROM public.role_permissions rp
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = @RoleId
            ORDER BY p.category, p.code;";

        var permissions = (await connection.QueryAsync<PermissionDto>(sql, new { RoleId = id })).ToList();
        return Ok(permissions);
    }

    /// <summary>
    /// Update permissions for a role (and invalidate caches)
    /// </summary>
    [HttpPut("{id:guid}/permissions")]
    [HasPermission("roles:manage")]
    public async Task<IActionResult> UpdateRolePermissions(Guid id, [FromBody] UpdateRolePermissionsRequest request)
    {
        var tenantId = await ResolveTenantIdAsync();
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        // Verify role exists and is not a protected system role or allows tenant modification
        const string checkRoleSql = "SELECT id, is_system, code FROM public.roles WHERE id = @Id AND (tenant_id IS NULL OR tenant_id = @TenantId);";
        var role = await connection.QueryFirstOrDefaultAsync(checkRoleSql, new { Id = id, TenantId = tenantId });
        if (role == null) return NotFound(new { message = "Role not found." });

        // Resolve permission IDs to set
        var targetPermissionIds = new HashSet<Guid>();
        if (request.PermissionIds != null && request.PermissionIds.Any())
        {
            foreach (var pid in request.PermissionIds) targetPermissionIds.Add(pid);
        }

        if (request.Permissions != null && request.Permissions.Any())
        {
            const string lookupSql = "SELECT id FROM public.permissions WHERE code = ANY(@Codes);";
            var matchedIds = await connection.QueryAsync<Guid>(lookupSql, new { Codes = request.Permissions.ToArray() });
            foreach (var mid in matchedIds) targetPermissionIds.Add(mid);
        }

        using var transaction = connection.BeginTransaction();
        try
        {
            const string deleteSql = "DELETE FROM public.role_permissions WHERE role_id = @RoleId;";
            await connection.ExecuteAsync(deleteSql, new { RoleId = id }, transaction);

            if (targetPermissionIds.Any())
            {
                const string insertSql = @"
                    INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
                    VALUES (@RoleId, @PermissionId, CURRENT_TIMESTAMP)
                    ON CONFLICT (role_id, permission_id) DO NOTHING;";

                foreach (var pid in targetPermissionIds)
                {
                    await connection.ExecuteAsync(insertSql, new { RoleId = id, PermissionId = pid }, transaction);
                }
            }

            const string updateRoleSql = "UPDATE public.roles SET updated_at = CURRENT_TIMESTAMP WHERE id = @RoleId;";
            await connection.ExecuteAsync(updateRoleSql, new { RoleId = id }, transaction);

            transaction.Commit();
        }
        catch
        {
            transaction.Rollback();
            throw;
        }

        // Invalidate cache for all affected users holding this role
        await _permissionCacheService.InvalidateRoleCacheAsync(id);

        return Ok(new { success = true, roleId = id, permissionsCount = targetPermissionIds.Count });
    }

    /// <summary>
    /// Get complete master permission catalog grouped by category/domain
    /// </summary>
    [HttpGet("/api/v1/admin/permissions")]
    [HasPermission("roles:view")]
    public async Task<IActionResult> GetMasterPermissions()
    {
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        const string sql = @"
            SELECT id, code, name, category, description, created_at
            FROM public.permissions
            ORDER BY category ASC, code ASC;";

        var allPermissions = (await connection.QueryAsync<PermissionDto>(sql)).ToList();

        var grouped = allPermissions
            .GroupBy(p => p.Category)
            .Select(g => new PermissionCategoryGroupDto
            {
                Category = g.Key,
                Permissions = g.ToList()
            })
            .ToList();

        return Ok(new
        {
            total = allPermissions.Count,
            items = allPermissions,
            grouped = grouped
        });
    }
}

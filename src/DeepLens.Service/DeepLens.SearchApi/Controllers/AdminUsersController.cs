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
[Route("api/v1/admin/users")]
[Authorize]
public class AdminUsersController : ControllerBase
{
    private readonly IDbConnectionFactory _dbConnectionFactory;
    private readonly IPermissionCacheService _permissionCacheService;
    private readonly ILogger<AdminUsersController> _logger;

    public AdminUsersController(
        IDbConnectionFactory dbConnectionFactory,
        IPermissionCacheService permissionCacheService,
        ILogger<AdminUsersController> logger)
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

    private Guid GetCurrentUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var uid) ? uid : Guid.Empty;
    }

    /// <summary>
    /// List users with pagination, search, role filtering, and active status
    /// </summary>
    [HttpGet]
    [HasPermission("users:view")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search = null,
        [FromQuery] string? role = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var tenantId = await ResolveTenantIdAsync();
        if (tenantId == Guid.Empty) return BadRequest(new { message = "Invalid tenant context." });

        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;
        var offset = (page - 1) * pageSize;

        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        var conditions = new List<string> { "u.tenant_id = @TenantId", "u.deleted_at IS NULL" };
        var parameters = new DynamicParameters();
        parameters.Add("TenantId", tenantId);
        parameters.Add("Limit", pageSize);
        parameters.Add("Offset", offset);

        if (!string.IsNullOrWhiteSpace(search))
        {
            conditions.Add("(u.first_name ILIKE @Search OR u.last_name ILIKE @Search OR u.email ILIKE @Search)");
            parameters.Add("Search", $"%{search.Trim()}%");
        }

        if (isActive.HasValue)
        {
            conditions.Add("u.is_active = @IsActive");
            parameters.Add("IsActive", isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            conditions.Add(@"EXISTS (
                SELECT 1 FROM public.user_roles ur 
                JOIN public.roles r ON ur.role_id = r.id 
                WHERE ur.user_id = u.id AND (r.code ILIKE @Role OR r.name ILIKE @Role)
            )");
            parameters.Add("Role", role.Trim());
        }

        var whereClause = string.Join(" AND ", conditions);

        var countSql = $"SELECT COUNT(*) FROM public.users u WHERE {whereClause};";
        var totalCount = await connection.ExecuteScalarAsync<int>(countSql, parameters);

        var usersSql = $@"
            SELECT u.id, u.tenant_id, u.email, u.first_name, u.last_name, u.email_confirmed, u.is_active, u.created_at, u.last_login_at
            FROM public.users u
            WHERE {whereClause}
            ORDER BY u.created_at DESC
            LIMIT @Limit OFFSET @Offset;";

        var rawUsers = (await connection.QueryAsync(usersSql, parameters)).ToList();

        if (!rawUsers.Any())
        {
            return Ok(new PagedResult<UserAdminDto>
            {
                Items = Array.Empty<UserAdminDto>(),
                TotalCount = 0,
                Page = page,
                PageSize = pageSize
            });
        }

        var userIds = rawUsers.Select(u => (Guid)u.id).ToList();

        // Query roles for these users
        const string rolesSql = @"
            SELECT ur.user_id, r.id as role_id, r.code, r.name, r.description, r.is_system
            FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = ANY(@UserIds);";

        var rolesList = (await connection.QueryAsync(rolesSql, new { UserIds = userIds.ToArray() })).ToList();
        var rolesByUser = rolesList.GroupBy(r => (Guid)r.user_id)
            .ToDictionary(g => g.Key, g => g.Select(r => (string)r.code).ToList());

        var resultItems = rawUsers.Select(u =>
        {
            var uid = (Guid)u.id;
            var assignedRoleCodes = rolesByUser.TryGetValue(uid, out var userRoles) ? userRoles : new List<string>();
            return new UserAdminDto
            {
                Id = uid,
                TenantId = (Guid)u.tenant_id,
                Email = (string)u.email,
                FirstName = (string)u.first_name,
                LastName = (string)u.last_name,
                EmailConfirmed = (bool)u.email_confirmed,
                IsActive = (bool)u.is_active,
                CreatedAt = (DateTime)u.created_at,
                LastLoginAt = (DateTime?)u.last_login_at,
                Roles = assignedRoleCodes
            };
        }).ToList();

        return Ok(new PagedResult<UserAdminDto>
        {
            Items = resultItems,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    /// <summary>
    /// Get user details and assigned roles/permissions
    /// </summary>
    [HttpGet("{id}")]
    [HasPermission("users:view")]
    public async Task<IActionResult> GetUserById(string id)
    {
        if (!Guid.TryParse(id, out var userGuid)) return NotFound(new { message = "User not found." });

        var tenantId = await ResolveTenantIdAsync();
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        const string userSql = @"
            SELECT id, tenant_id, email, first_name, last_name, email_confirmed, is_active, created_at, last_login_at
            FROM public.users
            WHERE id = @Id AND tenant_id = @TenantId AND deleted_at IS NULL;";

        var user = await connection.QueryFirstOrDefaultAsync(userSql, new { Id = userGuid, TenantId = tenantId });
        if (user == null) return NotFound(new { message = "User not found." });

        // Query assigned roles
        const string rolesSql = @"
            SELECT r.id, r.tenant_id, r.code, r.name, r.description, r.is_system, r.created_at
            FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = @UserId AND ur.tenant_id = @TenantId;";

        var assignedRoles = (await connection.QueryAsync<RoleDto>(rolesSql, new { UserId = userGuid, TenantId = tenantId })).ToList();

        // Effective permissions from cache/db
        var auth = await _permissionCacheService.GetUserAuthorizationAsync(tenantId, userGuid);

        // Custom permissions
        const string customPermSql = @"
            SELECT p.code
            FROM public.user_permissions up
            JOIN public.permissions p ON up.permission_id = p.id
            WHERE up.user_id = @UserId AND up.tenant_id = @TenantId;";

        var customPerms = (await connection.QueryAsync<string>(customPermSql, new { UserId = userGuid, TenantId = tenantId })).ToList();

        var dto = new UserAdminDto
        {
            Id = (Guid)user.id,
            TenantId = (Guid)user.tenant_id,
            Email = (string)user.email,
            FirstName = (string)user.first_name,
            LastName = (string)user.last_name,
            EmailConfirmed = (bool)user.email_confirmed,
            IsActive = (bool)user.is_active,
            CreatedAt = (DateTime)user.created_at,
            LastLoginAt = (DateTime?)user.last_login_at,
            Roles = auth.Roles,
            AssignedRoles = assignedRoles,
            Permissions = auth.Permissions,
            CustomPermissions = customPerms
        };

        return Ok(dto);
    }

    /// <summary>
    /// Toggle or update user active status
    /// </summary>
    [HttpPatch("{id}/status")]
    [HasPermission("users:manage")]
    public async Task<IActionResult> UpdateUserStatus(string id, [FromBody] UpdateUserStatusRequest request)
    {
        if (!Guid.TryParse(id, out var userGuid)) return NotFound(new { message = "User not found." });

        var tenantId = await ResolveTenantIdAsync();
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        const string sql = @"
            UPDATE public.users 
            SET is_active = @IsActive, updated_at = CURRENT_TIMESTAMP 
            WHERE id = @Id AND tenant_id = @TenantId AND deleted_at IS NULL;";

        var affected = await connection.ExecuteAsync(sql, new { Id = userGuid, TenantId = tenantId, IsActive = request.IsActive });
        if (affected == 0) return NotFound(new { message = "User not found." });

        await _permissionCacheService.InvalidateUserCacheAsync(tenantId, userGuid);
        return Ok(new { success = true, isActive = request.IsActive });
    }

    /// <summary>
    /// Assign/update roles for user
    /// </summary>
    [HttpPut("{id}/roles")]
    [HasPermission("users:manage")]
    public async Task<IActionResult> UpdateUserRoles(string id, [FromBody] UpdateUserRolesRequest request)
    {
        if (!Guid.TryParse(id, out var userGuid)) return NotFound(new { message = "User not found." });

        var tenantId = await ResolveTenantIdAsync();
        var currentUserId = GetCurrentUserId();
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        // Check user exists
        const string checkUserSql = "SELECT id FROM public.users WHERE id = @Id AND tenant_id = @TenantId AND deleted_at IS NULL;";
        var userExists = await connection.ExecuteScalarAsync<Guid?>(checkUserSql, new { Id = userGuid, TenantId = tenantId });
        if (!userExists.HasValue) return NotFound(new { message = "User not found." });

        // Resolve role IDs to assign
        var targetRoleIds = new HashSet<Guid>();
        if (request.RoleIds != null && request.RoleIds.Any())
        {
            foreach (var rid in request.RoleIds) targetRoleIds.Add(rid);
        }

        if (request.Roles != null && request.Roles.Any())
        {
            const string lookupSql = @"
                SELECT id FROM public.roles 
                WHERE (tenant_id IS NULL OR tenant_id = @TenantId) 
                  AND (code = ANY(@Codes) OR name = ANY(@Codes));";

            var matchedIds = await connection.QueryAsync<Guid>(lookupSql, new { TenantId = tenantId, Codes = request.Roles.ToArray() });
            foreach (var mid in matchedIds) targetRoleIds.Add(mid);
        }

        using var transaction = connection.BeginTransaction();
        try
        {
            // Remove existing user roles
            const string deleteSql = "DELETE FROM public.user_roles WHERE user_id = @UserId AND tenant_id = @TenantId;";
            await connection.ExecuteAsync(deleteSql, new { UserId = userGuid, TenantId = tenantId }, transaction);

            // Insert new user roles
            if (targetRoleIds.Any())
            {
                const string insertSql = @"
                    INSERT INTO public.user_roles (user_id, role_id, tenant_id, assigned_at, assigned_by)
                    VALUES (@UserId, @RoleId, @TenantId, CURRENT_TIMESTAMP, @AssignedBy)
                    ON CONFLICT (user_id, role_id) DO NOTHING;";

                foreach (var roleId in targetRoleIds)
                {
                    await connection.ExecuteAsync(insertSql, new
                    {
                        UserId = userGuid,
                        RoleId = roleId,
                        TenantId = tenantId,
                        AssignedBy = currentUserId != Guid.Empty ? currentUserId : (Guid?)null
                    }, transaction);
                }
            }

            transaction.Commit();
        }
        catch
        {
            transaction.Rollback();
            throw;
        }

        // Invalidate cache immediately
        await _permissionCacheService.InvalidateUserCacheAsync(tenantId, userGuid);

        var updatedAuth = await _permissionCacheService.GetUserAuthorizationAsync(tenantId, userGuid);
        return Ok(new
        {
            success = true,
            userId = userGuid,
            roles = updatedAuth.Roles,
            permissions = updatedAuth.Permissions
        });
    }

    /// <summary>
    /// Override custom permissions for user
    /// </summary>
    [HttpPut("{id}/permissions")]
    [HasPermission("users:manage")]
    public async Task<IActionResult> UpdateUserPermissions(string id, [FromBody] UpdateUserPermissionsRequest request)
    {
        if (!Guid.TryParse(id, out var userGuid)) return NotFound(new { message = "User not found." });

        var tenantId = await ResolveTenantIdAsync();
        var currentUserId = GetCurrentUserId();
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        // Check user exists
        const string checkUserSql = "SELECT id FROM public.users WHERE id = @Id AND tenant_id = @TenantId AND deleted_at IS NULL;";
        var userExists = await connection.ExecuteScalarAsync<Guid?>(checkUserSql, new { Id = userGuid, TenantId = tenantId });
        if (!userExists.HasValue) return NotFound(new { message = "User not found." });

        // Resolve permission IDs
        var targetPermissionIds = new HashSet<Guid>();
        if (request.PermissionIds != null && request.PermissionIds.Any())
        {
            foreach (var pid in request.PermissionIds) targetPermissionIds.Add(pid);
        }

        if (request.Permissions != null && request.Permissions.Any())
        {
            const string lookupPermSql = "SELECT id FROM public.permissions WHERE code = ANY(@Codes);";
            var matchedIds = await connection.QueryAsync<Guid>(lookupPermSql, new { Codes = request.Permissions.ToArray() });
            foreach (var mid in matchedIds) targetPermissionIds.Add(mid);
        }

        using var transaction = connection.BeginTransaction();
        try
        {
            // Remove existing user permission overrides
            const string deleteSql = "DELETE FROM public.user_permissions WHERE user_id = @UserId AND tenant_id = @TenantId;";
            await connection.ExecuteAsync(deleteSql, new { UserId = userGuid, TenantId = tenantId }, transaction);

            // Insert new overrides
            if (targetPermissionIds.Any())
            {
                const string insertSql = @"
                    INSERT INTO public.user_permissions (user_id, permission_id, tenant_id, granted_at, granted_by)
                    VALUES (@UserId, @PermissionId, @TenantId, CURRENT_TIMESTAMP, @GrantedBy)
                    ON CONFLICT (user_id, permission_id) DO NOTHING;";

                foreach (var permId in targetPermissionIds)
                {
                    await connection.ExecuteAsync(insertSql, new
                    {
                        UserId = userGuid,
                        PermissionId = permId,
                        TenantId = tenantId,
                        GrantedBy = currentUserId != Guid.Empty ? currentUserId : (Guid?)null
                    }, transaction);
                }
            }

            transaction.Commit();
        }
        catch
        {
            transaction.Rollback();
            throw;
        }

        // Invalidate cache immediately
        await _permissionCacheService.InvalidateUserCacheAsync(tenantId, userGuid);

        var updatedAuth = await _permissionCacheService.GetUserAuthorizationAsync(tenantId, userGuid);
        return Ok(new
        {
            success = true,
            userId = userGuid,
            roles = updatedAuth.Roles,
            permissions = updatedAuth.Permissions
        });
    }
}

using System;
using System.Collections.Generic;
using System.Data;
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

    private bool IsSuperAdmin()
    {
        return User.IsInRole("super_admin") ||
               User.HasClaim(c => c.Type == "is_super_admin" && c.Value == "true") ||
               User.HasClaim(c => c.Type == "role" && string.Equals(c.Value, "super_admin", StringComparison.OrdinalIgnoreCase)) ||
               User.HasClaim(c => c.Type == ClaimTypes.Role && string.Equals(c.Value, "super_admin", StringComparison.OrdinalIgnoreCase));
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

    private async Task<dynamic?> FindUserRecordAsync(IDbConnection connection, string id, Guid callerTenantId, bool isSuperAdmin)
    {
        var isGuid = Guid.TryParse(id, out var userGuid);
        var parsedGuid = isGuid ? userGuid : Guid.Empty;

        string sql;
        if (isSuperAdmin)
        {
            sql = @"
                SELECT id, tenant_id, email, first_name, last_name, email_confirmed, is_active, created_at, last_login_at
                FROM public.users
                WHERE ((@IsGuid = true AND id = @UserGuid) OR LOWER(email) = LOWER(@Identifier))
                  AND deleted_at IS NULL
                LIMIT 1;";
            return await connection.QueryFirstOrDefaultAsync(sql, new { IsGuid = isGuid, UserGuid = parsedGuid, Identifier = id.Trim() });
        }

        sql = @"
            SELECT id, tenant_id, email, first_name, last_name, email_confirmed, is_active, created_at, last_login_at
            FROM public.users
            WHERE ((@IsGuid = true AND id = @UserGuid) OR LOWER(email) = LOWER(@Identifier))
              AND (tenant_id = @TenantId OR @TenantId = '00000000-0000-0000-0000-000000000000'::uuid OR tenant_id IS NULL)
              AND deleted_at IS NULL
            LIMIT 1;";
        return await connection.QueryFirstOrDefaultAsync(sql, new { IsGuid = isGuid, UserGuid = parsedGuid, Identifier = id.Trim(), TenantId = callerTenantId });
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
        var isSuperAdmin = IsSuperAdmin();
        var tenantId = await ResolveTenantIdAsync();
        if (tenantId == Guid.Empty && !isSuperAdmin) return BadRequest(new { message = "Invalid tenant context." });

        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;
        var offset = (page - 1) * pageSize;

        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        var conditions = new List<string> { "u.deleted_at IS NULL" };
        var parameters = new DynamicParameters();
        parameters.Add("Limit", pageSize);
        parameters.Add("Offset", offset);

        if (!isSuperAdmin || tenantId != Guid.Empty)
        {
            conditions.Add("(u.tenant_id = @TenantId OR @TenantId = '00000000-0000-0000-0000-000000000000'::uuid)");
            parameters.Add("TenantId", tenantId);
        }

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
                SELECT 1 FROM public.user_roles ur2
                JOIN public.roles r2 ON ur2.role_id = r2.id
                WHERE ur2.user_id = u.id AND (r2.code = @RoleCode OR r2.name ILIKE @RoleCode)
            )");
            parameters.Add("RoleCode", role.Trim());
        }

        var whereClause = string.Join(" AND ", conditions);

        var countSql = $"SELECT COUNT(1) FROM public.users u WHERE {whereClause};";
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
                Items = new List<UserAdminDto>(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            });
        }

        var userIds = rawUsers.Select(u => (Guid)u.id).Distinct().ToList();

        // Fetch roles for retrieved users
        const string rolesSql = @"
            SELECT ur.user_id, r.code, r.name
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
        if (string.IsNullOrWhiteSpace(id)) return NotFound(new { message = "User not found." });

        var isSuperAdmin = IsSuperAdmin();
        var tenantId = await ResolveTenantIdAsync();
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        var user = await FindUserRecordAsync(connection, id, tenantId, isSuperAdmin);
        if (user == null) return NotFound(new { message = "User not found." });

        var userGuid = (Guid)user.id;
        var userTenantId = (Guid)user.tenant_id;

        // Query assigned roles
        const string rolesSql = @"
            SELECT r.id, r.tenant_id, r.code, r.name, r.description, r.is_system, r.created_at
            FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = @UserId AND (ur.tenant_id = @TenantId OR ur.tenant_id = @UserTenantId OR @IsSuperAdmin = true);";

        var assignedRoles = (await connection.QueryAsync<RoleDto>(rolesSql, new
        {
            UserId = userGuid,
            TenantId = tenantId,
            UserTenantId = userTenantId,
            IsSuperAdmin = isSuperAdmin
        })).ToList();

        // Effective permissions from cache/db using user's actual tenant
        var auth = await _permissionCacheService.GetUserAuthorizationAsync(userTenantId, userGuid);

        // Custom direct permissions
        const string customPermSql = @"
            SELECT p.code
            FROM public.user_permissions up
            JOIN public.permissions p ON up.permission_id = p.id
            WHERE up.user_id = @UserId AND (up.tenant_id = @TenantId OR up.tenant_id = @UserTenantId OR @IsSuperAdmin = true);";

        var customPerms = (await connection.QueryAsync<string>(customPermSql, new
        {
            UserId = userGuid,
            TenantId = tenantId,
            UserTenantId = userTenantId,
            IsSuperAdmin = isSuperAdmin
        })).ToList();

        var dto = new UserAdminDto
        {
            Id = userGuid,
            TenantId = userTenantId,
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
        if (string.IsNullOrWhiteSpace(id)) return NotFound(new { message = "User not found." });

        var isSuperAdmin = IsSuperAdmin();
        var tenantId = await ResolveTenantIdAsync();
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        var user = await FindUserRecordAsync(connection, id, tenantId, isSuperAdmin);
        if (user == null) return NotFound(new { message = "User not found." });

        var userGuid = (Guid)user.id;
        var userTenantId = (Guid)user.tenant_id;

        const string sql = @"
            UPDATE public.users 
            SET is_active = @IsActive, updated_at = CURRENT_TIMESTAMP 
            WHERE id = @Id;";

        var affected = await connection.ExecuteAsync(sql, new { Id = userGuid, IsActive = request.IsActive });
        if (affected == 0) return NotFound(new { message = "User not found." });

        await _permissionCacheService.InvalidateUserCacheAsync(userTenantId, userGuid);
        if (tenantId != userTenantId && tenantId != Guid.Empty)
        {
            await _permissionCacheService.InvalidateUserCacheAsync(tenantId, userGuid);
        }

        return Ok(new { success = true, isActive = request.IsActive });
    }

    /// <summary>
    /// Assign/update roles for user
    /// </summary>
    [HttpPut("{id}/roles")]
    [HasPermission("users:manage")]
    public async Task<IActionResult> UpdateUserRoles(string id, [FromBody] UpdateUserRolesRequest request)
    {
        if (string.IsNullOrWhiteSpace(id)) return NotFound(new { message = "User not found." });

        var isSuperAdmin = IsSuperAdmin();
        var tenantId = await ResolveTenantIdAsync();
        var currentUserId = GetCurrentUserId();
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        var user = await FindUserRecordAsync(connection, id, tenantId, isSuperAdmin);
        if (user == null) return NotFound(new { message = "User not found." });

        var userGuid = (Guid)user.id;
        var userTenantId = (Guid)user.tenant_id;

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
                WHERE (tenant_id IS NULL OR tenant_id = @UserTenantId OR tenant_id = @TenantId) 
                  AND (code = ANY(@Codes) OR name = ANY(@Codes));";

            var matchedIds = await connection.QueryAsync<Guid>(lookupSql, new
            {
                UserTenantId = userTenantId,
                TenantId = tenantId,
                Codes = request.Roles.ToArray()
            });
            foreach (var mid in matchedIds) targetRoleIds.Add(mid);
        }

        using var transaction = connection.BeginTransaction();
        try
        {
            // Remove existing user roles for this user
            const string deleteSql = "DELETE FROM public.user_roles WHERE user_id = @UserId;";
            await connection.ExecuteAsync(deleteSql, new { UserId = userGuid }, transaction);

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
                        TenantId = userTenantId,
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
        await _permissionCacheService.InvalidateUserCacheAsync(userTenantId, userGuid);
        if (tenantId != userTenantId && tenantId != Guid.Empty)
        {
            await _permissionCacheService.InvalidateUserCacheAsync(tenantId, userGuid);
        }

        var updatedAuth = await _permissionCacheService.GetUserAuthorizationAsync(userTenantId, userGuid);
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
        if (string.IsNullOrWhiteSpace(id)) return NotFound(new { message = "User not found." });

        var isSuperAdmin = IsSuperAdmin();
        var tenantId = await ResolveTenantIdAsync();
        var currentUserId = GetCurrentUserId();
        using var connection = await _dbConnectionFactory.CreateConnectionAsync();

        var user = await FindUserRecordAsync(connection, id, tenantId, isSuperAdmin);
        if (user == null) return NotFound(new { message = "User not found." });

        var userGuid = (Guid)user.id;
        var userTenantId = (Guid)user.tenant_id;

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
            const string deleteSql = "DELETE FROM public.user_permissions WHERE user_id = @UserId;";
            await connection.ExecuteAsync(deleteSql, new { UserId = userGuid }, transaction);

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
                        TenantId = userTenantId,
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
        await _permissionCacheService.InvalidateUserCacheAsync(userTenantId, userGuid);
        if (tenantId != userTenantId && tenantId != Guid.Empty)
        {
            await _permissionCacheService.InvalidateUserCacheAsync(tenantId, userGuid);
        }

        var updatedAuth = await _permissionCacheService.GetUserAuthorizationAsync(userTenantId, userGuid);
        return Ok(new
        {
            success = true,
            userId = userGuid,
            roles = updatedAuth.Roles,
            permissions = updatedAuth.Permissions
        });
    }
}

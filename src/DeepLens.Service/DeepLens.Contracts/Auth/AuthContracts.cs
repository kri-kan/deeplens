using System;
using System.Collections.Generic;

namespace DeepLens.Contracts.Auth;

public class UserAuthorizationModel
{
    public Guid UserId { get; set; }
    public Guid TenantId { get; set; }
    public bool IsSuperAdmin { get; set; }
    public List<string> Roles { get; set; } = new();
    public List<string> Permissions { get; set; } = new();
    public int Version { get; set; } = 1;
}

public class RoleDto
{
    public Guid Id { get; set; }
    public Guid? TenantId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSystem { get; set; }
    public int UserCount { get; set; }
    public int PermissionCount { get; set; }
    public List<string> Permissions { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class PermissionDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PermissionCategoryGroupDto
{
    public string Category { get; set; } = string.Empty;
    public List<PermissionDto> Permissions { get; set; } = new();
}

public class UserAdminDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public bool EmailConfirmed { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public List<string> Roles { get; set; } = new();
    public List<RoleDto> AssignedRoles { get; set; } = new();
    public List<string> Permissions { get; set; } = new();
    public List<string> CustomPermissions { get; set; } = new();
}

public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}

public class CreateRoleRequest
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string>? Permissions { get; set; }
    public List<Guid>? PermissionIds { get; set; }
}

public class UpdateRolePermissionsRequest
{
    public List<string>? Permissions { get; set; }
    public List<Guid>? PermissionIds { get; set; }
}

public class UpdateUserRolesRequest
{
    public List<string>? Roles { get; set; }
    public List<Guid>? RoleIds { get; set; }
}

public class UpdateUserPermissionsRequest
{
    public List<string>? Permissions { get; set; }
    public List<Guid>? PermissionIds { get; set; }
}

public class UpdateUserStatusRequest
{
    public bool IsActive { get; set; }
}

public class UserCapabilitiesResponse
{
    public Guid UserId { get; set; }
    public Guid TenantId { get; set; }
    public bool IsSuperAdmin { get; set; }
    public List<string> Roles { get; set; } = new();
    public List<string> Permissions { get; set; } = new();
    public int Version { get; set; } = 1;
}

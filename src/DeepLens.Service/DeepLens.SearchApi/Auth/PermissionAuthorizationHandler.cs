using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;

namespace DeepLens.SearchApi.Auth;

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        if (context.User.Identity == null || !context.User.Identity.IsAuthenticated)
        {
            return Task.CompletedTask;
        }

        // Super Admin bypass: super_admin role has access to all capabilities
        if (context.User.IsInRole("super_admin") ||
            context.User.HasClaim(c => c.Type == "is_super_admin" && c.Value == "true") ||
            context.User.HasClaim(c => c.Type == "role" && string.Equals(c.Value, "super_admin", StringComparison.OrdinalIgnoreCase)) ||
            context.User.HasClaim(c => c.Type == ClaimTypes.Role && string.Equals(c.Value, "super_admin", StringComparison.OrdinalIgnoreCase)))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // Check specific permission claim
        var hasPermission = context.User.Claims.Any(c => 
            c.Type == "permission" && 
            string.Equals(c.Value, requirement.Permission, StringComparison.OrdinalIgnoreCase));

        if (hasPermission)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

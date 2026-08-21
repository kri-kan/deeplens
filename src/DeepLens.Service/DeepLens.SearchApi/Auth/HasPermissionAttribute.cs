using System;
using Microsoft.AspNetCore.Authorization;

namespace DeepLens.SearchApi.Auth;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
public class HasPermissionAttribute : AuthorizeAttribute
{
    public const string PolicyPrefix = "Permission:";

    public HasPermissionAttribute(string permission)
    {
        Permission = permission;
        Policy = $"{PolicyPrefix}{permission}";
    }

    public string Permission { get; }
}

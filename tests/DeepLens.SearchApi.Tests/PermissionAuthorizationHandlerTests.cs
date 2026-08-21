using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using DeepLens.SearchApi.Auth;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using NUnit.Framework;

namespace DeepLens.SearchApi.Tests;

[TestFixture]
public class PermissionAuthorizationHandlerTests
{
    private PermissionAuthorizationHandler _handler;

    [SetUp]
    public void Setup()
    {
        _handler = new PermissionAuthorizationHandler();
    }

    [Test]
    public async Task HandleRequirementAsync_SuperAdminRole_Succeeds()
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "user-1"),
            new Claim("role", "super_admin")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var requirement = new PermissionRequirement("catalog:merge");
        var context = new AuthorizationHandlerContext(new[] { requirement }, principal, null);

        await _handler.HandleAsync(context);

        context.HasSucceeded.Should().BeTrue();
    }

    [Test]
    public async Task HandleRequirementAsync_HasExactPermission_Succeeds()
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "user-2"),
            new Claim("permission", "catalog:view"),
            new Claim("permission", "catalog:edit")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var requirement = new PermissionRequirement("catalog:view");
        var context = new AuthorizationHandlerContext(new[] { requirement }, principal, null);

        await _handler.HandleAsync(context);

        context.HasSucceeded.Should().BeTrue();
    }

    [Test]
    public async Task HandleRequirementAsync_LacksPermission_Fails()
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "user-3"),
            new Claim("permission", "catalog:view")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var requirement = new PermissionRequirement("whatsapp:broadcast");
        var context = new AuthorizationHandlerContext(new[] { requirement }, principal, null);

        await _handler.HandleAsync(context);

        context.HasSucceeded.Should().BeFalse();
    }
}

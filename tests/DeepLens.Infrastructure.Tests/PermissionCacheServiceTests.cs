using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Contracts.Auth;
using DeepLens.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;

namespace DeepLens.Infrastructure.Tests;

[TestFixture]
public class PermissionCacheServiceTests
{
    private IMemoryCache _memoryCache;
    private Mock<IDistributedCache> _distributedCacheMock;
    private Mock<IDbConnectionFactory> _dbConnectionFactoryMock;
    private Mock<ILogger<PermissionCacheService>> _loggerMock;
    private PermissionCacheService _service;

    [SetUp]
    public void Setup()
    {
        _memoryCache = new MemoryCache(new MemoryCacheOptions());
        _distributedCacheMock = new Mock<IDistributedCache>();
        _dbConnectionFactoryMock = new Mock<IDbConnectionFactory>();
        _loggerMock = new Mock<ILogger<PermissionCacheService>>();

        _service = new PermissionCacheService(
            _memoryCache,
            _distributedCacheMock.Object,
            _dbConnectionFactoryMock.Object,
            _loggerMock.Object);
    }

    [TearDown]
    public void TearDown()
    {
        _memoryCache.Dispose();
    }

    [Test]
    public async Task GetUserAuthorizationAsync_L1Hit_ReturnsFromMemoryWithoutL2OrDb()
    {
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var cachedModel = new UserAuthorizationModel
        {
            UserId = userId,
            TenantId = tenantId,
            IsSuperAdmin = true,
            Roles = new List<string> { "super_admin" },
            Permissions = new List<string> { "catalog:view", "catalog:edit" }
        };

        _memoryCache.Set($"vayyari:auth:{tenantId}:{userId}", cachedModel);

        var result = await _service.GetUserAuthorizationAsync(tenantId, userId);

        result.Should().NotBeNull();
        result.UserId.Should().Be(userId);
        result.IsSuperAdmin.Should().BeTrue();
        result.Roles.Should().Contain("super_admin");

        _distributedCacheMock.Verify(d => d.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _dbConnectionFactoryMock.Verify(d => d.CreateConnectionAsync(), Times.Never);
    }

    [Test]
    public async Task GetUserAuthorizationAsync_L2Hit_PopulatesL1AndReturns()
    {
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var cachedModel = new UserAuthorizationModel
        {
            UserId = userId,
            TenantId = tenantId,
            IsSuperAdmin = false,
            Roles = new List<string> { "catalog_manager" },
            Permissions = new List<string> { "catalog:view" }
        };

        var json = JsonSerializer.Serialize(cachedModel);
        var bytes = Encoding.UTF8.GetBytes(json);

        _distributedCacheMock.Setup(d => d.GetAsync($"vayyari:auth:{tenantId}:{userId}", It.IsAny<CancellationToken>()))
            .ReturnsAsync(bytes);

        var result = await _service.GetUserAuthorizationAsync(tenantId, userId);

        result.Should().NotBeNull();
        result.Roles.Should().Contain("catalog_manager");

        // Should now be in L1 memory cache
        _memoryCache.TryGetValue($"vayyari:auth:{tenantId}:{userId}", out UserAuthorizationModel? memoryModel).Should().BeTrue();
        memoryModel.Should().NotBeNull();
        memoryModel!.Roles.Should().Contain("catalog_manager");

        _dbConnectionFactoryMock.Verify(d => d.CreateConnectionAsync(), Times.Never);
    }

    [Test]
    public async Task InvalidateUserCacheAsync_RemovesFromBothL1AndL2()
    {
        var tenantId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var key = $"vayyari:auth:{tenantId}:{userId}";

        _memoryCache.Set(key, new UserAuthorizationModel());

        await _service.InvalidateUserCacheAsync(tenantId, userId);

        _memoryCache.TryGetValue(key, out _).Should().BeFalse();
        _distributedCacheMock.Verify(d => d.RemoveAsync(key, It.IsAny<CancellationToken>()), Times.Once);
    }
}

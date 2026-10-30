using System;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using DeepLens.Infrastructure.Persistence;
using DeepLens.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NUnit.Framework;

namespace DeepLens.Catalog.Tests;

[TestFixture]
public class ProductRepositoryIntegrationTests
{
    private const string ConnectionString = "Host=192.168.0.170;Port=5432;Username=postgres;Password=Krikank1$;Database=deeplens_platform";
    private DbContextOptions<DeepLensDbContext> _dbOptions = null!;

    [OneTimeSetUp]
    public void Setup()
    {
        _dbOptions = new DbContextOptionsBuilder<DeepLensDbContext>()
            .UseNpgsql(ConnectionString)
            .UseSnakeCaseNamingConvention()
            .Options;
    }

    [Test]
    public async Task UpdateProductStarredStatusAsync_ExistingProduct_UpdatesAndReturnsTrue()
    {
        // 1. Get an existing product ID from the database
        await using var conn = new NpgsqlConnection(ConnectionString);
        var productId = await conn.QueryFirstOrDefaultAsync<Guid>("SELECT id FROM products LIMIT 1");
        if (productId == Guid.Empty)
        {
            Assert.Ignore("No products found in database to test starring.");
        }

        await using var dbContext = new DeepLensDbContext(_dbOptions);
        var repository = new ProductRepository(dbContext);

        // 2. Star product
        var starResult = await repository.UpdateProductStarredStatusAsync(productId, true, CancellationToken.None);
        Assert.That(starResult, Is.True, "UpdateProductStarredStatusAsync should return true when starring an existing product");

        var isStarredInDb = await conn.QuerySingleAsync<bool>("SELECT is_starred FROM products WHERE id = @Id", new { Id = productId });
        Assert.That(isStarredInDb, Is.True, "Database column is_starred should be true");

        // 3. Unstar product
        var unstarResult = await repository.UpdateProductStarredStatusAsync(productId, false, CancellationToken.None);
        Assert.That(unstarResult, Is.True, "UpdateProductStarredStatusAsync should return true when unstarring an existing product");

        isStarredInDb = await conn.QuerySingleAsync<bool>("SELECT is_starred FROM products WHERE id = @Id", new { Id = productId });
        Assert.That(isStarredInDb, Is.False, "Database column is_starred should be false");
    }

    [Test]
    public async Task UpdateProductStarredStatusAsync_WhenEntityAlreadyTrackedInDbContext_SynchronizesAndReturnsTrue()
    {
        await using var conn = new NpgsqlConnection(ConnectionString);
        var productId = await conn.QueryFirstOrDefaultAsync<Guid>("SELECT id FROM products LIMIT 1");
        if (productId == Guid.Empty)
        {
            Assert.Ignore("No products found in database to test starring.");
        }

        await using var dbContext = new DeepLensDbContext(_dbOptions);
        // Pre-load the entity into DbContext ChangeTracker
        var product = await dbContext.Products.FindAsync(productId);
        Assert.That(product, Is.Not.Null);

        var repository = new ProductRepository(dbContext);

        // Act: Star the product while already tracked in DbContext
        var result = await repository.UpdateProductStarredStatusAsync(productId, true, CancellationToken.None);

        Assert.That(result, Is.True, "Should return true even if entity was already tracked in DbContext");
        Assert.That(product!.IsStarred, Is.True, "Tracked entity in-memory state should be synchronized");
    }

    [Test]
    public async Task UpdateProductStarredStatusAsync_NonExistentProduct_ReturnsFalse()
    {
        var nonExistentId = Guid.NewGuid();

        await using var dbContext = new DeepLensDbContext(_dbOptions);
        var repository = new ProductRepository(dbContext);

        var result = await repository.UpdateProductStarredStatusAsync(nonExistentId, true, CancellationToken.None);
        Assert.That(result, Is.False, "UpdateProductStarredStatusAsync should return false for non-existent product");
    }
}

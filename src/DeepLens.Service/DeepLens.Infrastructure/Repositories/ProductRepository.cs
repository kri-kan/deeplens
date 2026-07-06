using System;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Application.Abstractions.Repositories;
using DeepLens.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DeepLens.Infrastructure.Repositories;

public class ProductRepository : IProductRepository
{
    private readonly DeepLensDbContext _dbContext;

    public ProductRepository(DeepLensDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> UpdateProductStarredStatusAsync(Guid productId, bool isStarred, CancellationToken ct = default)
    {
        var product = await _dbContext.Products.FindAsync(new object[] { productId }, ct);
        if (product == null) return false;
        
        product.IsStarred = isStarred;
        int rowsAffected = await _dbContext.SaveChangesAsync(ct);
            
        return rowsAffected > 0;
    }

    public async Task<bool> SetDefaultMediaAsync(Guid productId, Guid mediaId, CancellationToken ct = default)
    {
        // Execute raw SQL since media_links isn't an EF entity
        await _dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE media_links SET is_primary = false WHERE entity_type = 'product' AND entity_id = {productId}", ct);
            
        int rowsAffected = await _dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE media_links SET is_primary = true WHERE media_id = {mediaId} AND entity_type = 'product' AND entity_id = {productId}", ct);
            
        return rowsAffected > 0;
    }
}

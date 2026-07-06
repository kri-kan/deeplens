using System.Threading;
using System.Threading.Tasks;
using DeepLens.Application.Abstractions.Repositories;
using DeepLens.Domain.Entities.Catalog;
using DeepLens.Infrastructure.Persistence;

namespace DeepLens.Infrastructure.Repositories;

public class ProductShareLogRepository : IProductShareLogRepository
{
    private readonly DeepLensDbContext _dbContext;

    public ProductShareLogRepository(DeepLensDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(ProductShareLog log, CancellationToken ct = default)
    {
        await _dbContext.ProductShareLogs.AddAsync(log, ct);
        await _dbContext.SaveChangesAsync(ct);
    }
}

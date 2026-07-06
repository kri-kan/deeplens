using System.Threading;
using System.Threading.Tasks;
using DeepLens.Domain.Entities.Catalog;

namespace DeepLens.Application.Abstractions.Repositories;

public interface IProductShareLogRepository
{
    Task AddAsync(ProductShareLog log, CancellationToken ct = default);
}

using System;
using System.Threading;
using System.Threading.Tasks;

namespace DeepLens.Application.Abstractions.Repositories;

public interface IProductRepository
{
    Task<bool> UpdateProductStarredStatusAsync(Guid productId, bool isStarred, CancellationToken ct = default);
    Task<bool> SetDefaultMediaAsync(Guid productId, Guid mediaId, CancellationToken ct = default);
}

using System;
using System.Threading;
using System.Threading.Tasks;
using DeepLens.Contracts.Auth;

namespace DeepLens.Infrastructure.Services;

public interface IPermissionCacheService
{
    Task<UserAuthorizationModel> GetUserAuthorizationAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken = default);
    Task InvalidateUserCacheAsync(Guid tenantId, Guid userId, CancellationToken cancellationToken = default);
    Task InvalidateRoleCacheAsync(Guid roleId, CancellationToken cancellationToken = default);
}

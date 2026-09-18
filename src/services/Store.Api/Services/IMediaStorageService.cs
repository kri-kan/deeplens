using Store.Api.Models;

namespace Store.Api.Services;

public interface IMediaStorageService
{
    Task<StoreMediaItemDto> IngestProductMediaAsync(
        Guid productId,
        string productCode,
        string sourceUrl,
        int order,
        bool isCover,
        CancellationToken ct = default);

    Task EnsureBucketExistsAsync(CancellationToken ct = default);
}

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

    Task<string> UploadModifiedMediaAsync(
        Guid productId,
        string mediaId,
        Stream stream,
        string mimeType,
        CancellationToken ct = default);

    Task DeleteModifiedMediaAsync(
        string modifiedUrl,
        CancellationToken ct = default);
}

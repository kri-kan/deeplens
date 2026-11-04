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
        string? catalogMediaId = null,
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

    /// <summary>
    /// Deletes any media_assets rows (and their MinIO objects) for the given product that are NOT
    /// represented by a URL in <paramref name="survivingPublicUrls"/>.  This covers both the
    /// 'original' copies stored under products/{code}/ and any 'modified' derivatives stored under
    /// store/modified/{productId}/.  Called during Publish Updates so that photos removed from the
    /// catalog don't accumulate as orphaned objects in MinIO.
    /// </summary>
    Task PruneOrphanedMediaAsync(
        Guid productId,
        ISet<string> survivingPublicUrls,
        CancellationToken ct = default);

    /// <summary>
    /// Generates a scoped presigned PUT URL for client-direct uploads.
    /// </summary>
    Task<string> GeneratePresignedUploadUrlAsync(
        string bucket,
        string objectKey,
        int expirySeconds = 900);

    /// <summary>
    /// Generates a scoped presigned GET URL for temporary inspection.
    /// </summary>
    Task<string> GeneratePresignedDownloadUrlAsync(
        string bucket,
        string objectKey,
        int expirySeconds = 1800);

    /// <summary>
    /// Checks whether an object physically exists in the target MinIO bucket.
    /// </summary>
    Task<bool> CheckObjectExistsAsync(
        string bucket,
        string objectKey,
        CancellationToken ct = default);
}

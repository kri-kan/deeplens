using Store.Api.Models;

namespace Store.Api.Services;

public interface ICurationService
{
    Task<int> BatchPublishProductsAsync(List<PublishProductRequest> requests, string authorEmail);
    Task<List<StoreProductDto>> GetInStoreProductsAsync(string? category = null, string? search = null, string? lifecycle = null);
    Task<StoreProductCurationDto?> GetProductCurationAsync(Guid id);
    Task<bool> UpdateProductCurationAsync(Guid id, UpdateCurationRequest request, string authorEmail);
    Task<StoreProductDto?> GetProductByCodeAsync(string code);
    Task<bool> UpdateLifecycleStatusAsync(UpdateLifecycleRequest request, string authorEmail);
    Task<bool> JoinWaitlistAsync(Guid productId, Guid customerId);
    Task<List<StoreProductDto>> GetReEvaluationQueueAsync();
    Task<StoreMediaItemDto?> SaveModifiedMediaAsync(Guid productId, string mediaId, Stream imageStream, string mimeType, string? recipeJson, string authorEmail, CancellationToken ct = default);
    Task<StoreMediaItemDto?> DeleteModifiedMediaAsync(Guid productId, string mediaId, string authorEmail, CancellationToken ct = default);
    Task<StoreMediaItemDto?> ToggleMediaDisplaySourceAsync(Guid productId, string mediaId, string activeDisplaySource, string authorEmail, CancellationToken ct = default);
    Task<bool> DismissReviewAsync(Guid id);
    Task<PublishJobDto> CreatePublishJobAsync(SubmitPublishJobRequest request, string authorEmail, CancellationToken ct = default);
    Task<PublishJobDto?> GetPublishJobAsync(Guid jobId, CancellationToken ct = default);
    Task<List<PublishJobDto>> GetRecentPublishJobsAsync(int limit = 20, int offset = 0, CancellationToken ct = default);
    Task<List<PublishFailureDto>> GetPublishFailuresAsync(CancellationToken ct = default);
    Task<PublishJobDto> RetryPublishFailuresAsync(RetryPublishBatchRequest request, string authorEmail, CancellationToken ct = default);
    Task<int> DismissPublishFailuresAsync(List<Guid> productIds, CancellationToken ct = default);
}


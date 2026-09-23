using Store.Api.Models;

namespace Store.Api.Services;

public interface ICurationService
{
    Task<int> BatchPublishProductsAsync(List<PublishProductRequest> requests, string authorEmail);
    Task<List<StoreProductDto>> GetInStoreProductsAsync(string? category = null, string? search = null, string? lifecycle = null);
    Task<StoreProductCurationDto?> GetProductCurationAsync(Guid id);
    Task<bool> UpdateProductCurationAsync(Guid id, UpdateCurationRequest request, string authorEmail);
    Task<StoreMediaItemDto?> SaveModifiedMediaAsync(Guid productId, string mediaId, Stream imageStream, string mimeType, string? recipeJson, string authorEmail, CancellationToken ct = default);
    Task<StoreMediaItemDto?> DeleteModifiedMediaAsync(Guid productId, string mediaId, string authorEmail, CancellationToken ct = default);
    Task<StoreMediaItemDto?> ToggleMediaDisplaySourceAsync(Guid productId, string mediaId, string activeDisplaySource, string authorEmail, CancellationToken ct = default);
}

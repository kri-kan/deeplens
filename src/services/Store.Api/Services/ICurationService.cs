using Store.Api.Models;

namespace Store.Api.Services;

public interface ICurationService
{
    Task<int> BatchPublishProductsAsync(List<PublishProductRequest> requests, string authorEmail);
    Task<List<StoreProductDto>> GetInStoreProductsAsync(string? category = null, string? search = null, string? lifecycle = null);
    Task<StoreProductCurationDto?> GetProductCurationAsync(Guid id);
    Task<bool> UpdateProductCurationAsync(Guid id, UpdateCurationRequest request, string authorEmail);
}

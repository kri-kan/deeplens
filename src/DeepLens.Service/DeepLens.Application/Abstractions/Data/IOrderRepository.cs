using DeepLens.Contracts.Orders;

namespace DeepLens.Application.Abstractions.Data;

public interface IOrderRepository
{
    Task<int> CreateOrderRecordAsync(long id, string orderId, int? sourceId, int? paymentModeId, string? sourceHandle, string? instagramUserId, string? customerPhone);
    Task<IEnumerable<OrderHistoryDto>> GetRecentHistoryAsync(int limit);
    Task<object?> GetDetailsAsync(string orderId);
    Task<bool> UpdateDetailsAsync(string orderId, string? phone, string? address, int? sourceId, string? sourceHandle, int? paymentModeId, string? transactionId);
    Task DeleteItemsAsync(int orderInternalId);
    Task AddOrderItemAsync(int orderInternalId, int index, string? productId, string? comments);
    Task<int> GetInternalIdAsync(string orderId);
}

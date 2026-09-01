using DeepLens.Contracts.Orders;

namespace DeepLens.Application.Abstractions.Data;

public interface IOrderRepository
{
    Task<int> CreateOrderRecordAsync(long id, string orderId, int? sourceId, int? paymentModeId, string? sourceHandle, string? instagramUserId, string? customerPhone, Guid? customerId = null);
    Task<IEnumerable<OrderHistoryDto>> GetRecentHistoryAsync(int limit);
    Task<OrderDetailDto?> GetDetailsAsync(string orderId);
    Task<bool> UpdateDetailsAsync(
        string orderId, 
        string? phone, 
        string? address, 
        int? sourceId, 
        string? sourceHandle, 
        int? paymentModeId, 
        string? transactionId, 
        Guid? customerId = null,
        string? customerName = null,
        decimal? advancePaid = null,
        decimal? codBalance = null,
        decimal? totalAmount = null,
        decimal? shippingCharges = null,
        string? shippingStreet = null,
        string? shippingCity = null,
        string? shippingState = null,
        string? shippingPincode = null,
        bool? isServiceable = null);
    Task DeleteItemsAsync(int orderInternalId);
    Task AddOrderItemAsync(int orderInternalId, int index, string? productId, string? comments, int quantity = 1, decimal unitPrice = 0, decimal subtotal = 0, Guid? vendorId = null, string? sourceType = "catalog");
    Task<int> GetInternalIdAsync(string orderId);
    Task<bool> SoftDeleteOrderAsync(string orderId);
}

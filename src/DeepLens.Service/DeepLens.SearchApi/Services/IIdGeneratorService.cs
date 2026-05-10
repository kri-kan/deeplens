using DeepLens.SearchApi.DTOs;
using DeepLens.Contracts.Orders;
using DeepLens.Domain.Enums;

namespace DeepLens.SearchApi.Services;

/// <summary>
/// Service to generate custom human-readable incrementing IDs for different entities.
/// </summary>
public interface IIdGeneratorService
{
    Task<string> GenerateOrderIdAsync(OrderSource? source = null, PaymentMode? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null);
    Task<(string OrderId, IEnumerable<string> ItemIds)> GenerateOrderWithItemsAsync(int itemCount, OrderSource? source = null, PaymentMode? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null);
    string GenerateOrderItemId(string orderId, int itemIndex);
    Task<string> GenerateProductIdAsync();
    Task<IEnumerable<OrderHistoryDto>> GetRecentOrderHistoryAsync(int limit = 20);
    Task<OrderDetailDto?> GetOrderDetailsAsync(string orderId);
    Task<bool> UpdateOrderDetailsAsync(string orderId, string? customerPhone = null, string? customerAddress = null, OrderSource? source = null, string? sourceHandle = null, PaymentMode? paymentMode = null, IEnumerable<OrderItemUpdateDto>? items = null, string? transactionId = null);
}

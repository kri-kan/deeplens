using DeepLens.SearchApi.DTOs;
using DeepLens.Contracts.Orders;

namespace DeepLens.SearchApi.Services;

/// <summary>
/// Service to generate custom human-readable incrementing IDs for different entities.
/// </summary>
public interface IIdGeneratorService
{
    Task<string> GenerateOrderIdAsync(string? source = null, string? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null);
    Task<(string OrderId, IEnumerable<string> ItemIds)> GenerateOrderWithItemsAsync(int itemCount, string? source = null, string? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null);
    string GenerateOrderItemId(string orderId, int itemIndex);
    Task<string> GenerateProductIdAsync();
    Task<IEnumerable<OrderHistoryDto>> GetRecentOrderHistoryAsync(int limit = 20);
    Task<object?> GetOrderDetailsAsync(string orderId);
    Task<bool> UpdateOrderDetailsAsync(string orderId, string? phone = null, string? address = null, string? source = null, string? sourceHandle = null, string? paymentMode = null, IEnumerable<OrderItemUpdateDto>? items = null, string? transactionId = null);
}

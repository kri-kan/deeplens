namespace DeepLens.SearchApi.Services;

/// <summary>
/// Service to generate custom human-readable incrementing IDs for different entities.
/// Single-tenant implementation.
/// </summary>
public interface IIdGeneratorService
{
    /// <summary>
    /// Generates a new unique alphanumeric Order ID.
    /// </summary>
    Task<string> GenerateOrderIdAsync(string? source = null, string? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null);
    
    /// <summary>
    /// Generates a new unique alphanumeric Order ID and its items.
    /// </summary>
    Task<(string OrderId, IEnumerable<string> ItemIds)> GenerateOrderWithItemsAsync(int itemCount, string? source = null, string? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null);

    /// <summary>
    /// Generates a sub-ID for an order item.
    /// </summary>
    string GenerateOrderItemId(string orderId, int itemIndex);

    /// <summary>
    /// Generates a new Product ID with 'VF' prefix and alphanumeric suffix.
    /// </summary>
    Task<string> GenerateProductIdAsync();
    
    /// <summary>
    /// Gets recent order IDs from the database.
    /// </summary>
    Task<IEnumerable<OrderHistoryDto>> GetRecentOrderHistoryAsync(int limit = 20);
    
    /// <summary>
    /// Gets specific order details including its items.
    /// </summary>
    Task<object?> GetOrderDetailsAsync(string orderId);

    /// <summary>
    /// Updates details for an existing order.
    /// </summary>
    Task<bool> UpdateOrderDetailsAsync(string orderId, string? phone = null, string? address = null, string? source = null, string? sourceHandle = null, string? paymentMode = null, IEnumerable<DeepLens.SearchApi.Controllers.OrderItemUpdateDto>? items = null, string? transactionId = null);
}

using DeepLens.Contracts.Orders;
using DeepLens.Domain.Enums;

namespace DeepLens.Application.Abstractions.Data;

public interface IOrderRepository
{
    Task<int> CreateOrderRecordAsync(
        long id, 
        string orderId, 
        int? sourceId, 
        int? paymentModeId, 
        string? sourceHandle, 
        string? instagramUserId, 
        string? customerPhone, 
        Guid? customerId = null,
        OrderStatus status = OrderStatus.Unconfirmed,
        bool needLabel = false);

    Task<IEnumerable<OrderHistoryDto>> GetRecentHistoryAsync(int limit, bool showDeleted = false);
    Task<PagedOrderHistoryResult> GetSearchOrdersAsync(
        int page = 1,
        int limit = 20,
        string? search = null,
        int? sourceId = null,
        int? paymentModeId = null,
        bool showDeleted = false,
        string sortBy = "date",
        string sortOrder = "desc");
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
        bool? isServiceable = null,
        OrderStatus? status = null,
        bool? needLabel = null);
    Task DeleteItemsAsync(int orderInternalId);
    Task AddOrderItemAsync(
        int orderInternalId, 
        int index, 
        string? productId, 
        string? productTitle, 
        string? comments, 
        int quantity = 1, 
        decimal unitPrice = 0, 
        decimal subtotal = 0, 
        Guid? vendorId = null, 
        string? sourceType = "catalog",
        string? itemId = null,
        string? orderGrpId = null);
    Task CreateOrUpdateOrderGroupAsync(OrderGroupDto group);
    Task UpdateGroupLabelInfoAsync(string orderGrpId, string awbNumber, string labelUrl, string status = "generated");
    Task<bool> ConfirmOrderAsync(string orderId);
    Task<IEnumerable<OrderGroupDto>> GetOrderGroupsByStageAsync(string stage);
    Task<bool> UpdateGroupNeedLabelAsync(string orderGrpId, bool needLabel);
    Task<bool> CancelGroupLabelAsync(string orderGrpId, string? awbNumber = null);
    Task<bool> MarkGroupProcessedAsync(string orderGrpId);
    Task<string> FetchGroupDeliveryStatusAsync(string orderGrpId);
    Task<int> GetInternalIdAsync(string orderId);
    Task<bool> SoftDeleteOrderAsync(string orderId);
}


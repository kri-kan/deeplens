using DeepLens.Application.Abstractions.Data;
using DeepLens.Application.Abstractions.IdGeneration;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Contracts.Orders;
using DeepLens.Domain.Enums;
using DeepLens.SearchApi.DTOs;
using DeepLens.SearchApi.Services;
using Microsoft.Extensions.Logging;

namespace DeepLens.SearchApi.Services;

public class IdGeneratorService : IIdGeneratorService
{
    private readonly ISequencedIdGenerator _sequencedIdGenerator;
    private readonly IOrderRepository _orderRepository;
    private readonly IInstagramSidecarService _instagramSidecar;
    private readonly IAttachmentService _attachmentService;
    private readonly ILogger<IdGeneratorService> _logger;

    public IdGeneratorService(
        ISequencedIdGenerator sequencedIdGenerator, 
        IOrderRepository orderRepository, 
        IInstagramSidecarService instagramSidecar, 
        IAttachmentService attachmentService,
        ILogger<IdGeneratorService> logger)
    {
        _sequencedIdGenerator = sequencedIdGenerator;
        _orderRepository = orderRepository;
        _instagramSidecar = instagramSidecar;
        _attachmentService = attachmentService;
        _logger = logger;
    }

    public async Task<string> GenerateOrderIdAsync(OrderSource? source = null, PaymentMode? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null, Guid? customerId = null)
    {
        var result = await _sequencedIdGenerator.GetNextOrderIdAsync();
        
        int? sourceId = source.HasValue && source.Value != OrderSource.None ? (int)source.Value : null;
        int? paymentModeId = paymentMode.HasValue && paymentMode.Value != PaymentMode.None ? (int)paymentMode.Value : null;
        string? customerPhone = source == OrderSource.WhatsApp ? sourceHandle : null;

        await _orderRepository.CreateOrderRecordAsync(
            result.Id, 
            result.OrderId, 
            sourceId, 
            paymentModeId, 
            sourceHandle, 
            instagramUserId, 
            customerPhone,
            customerId);

        return result.OrderId;
    }

    public async Task<(string OrderId, IEnumerable<string> ItemIds)> GenerateOrderWithItemsAsync(int itemCount, OrderSource? source = null, PaymentMode? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null, Guid? customerId = null)
    {
        var orderId = await GenerateOrderIdAsync(source, paymentMode, sourceHandle, instagramUserId, customerId);
        var itemIds = Enumerable.Range(1, itemCount).Select(i => GenerateOrderItemId(orderId, i));
        return (orderId, itemIds);
    }

    public string GenerateOrderItemId(string orderId, int itemIndex)
    {
        return $"{orderId}-{itemIndex:D2}";
    }

    public async Task<string> GenerateProductIdAsync()
    {
        return await _sequencedIdGenerator.GetNextProductIdAsync();
    }

    public async Task<IEnumerable<OrderHistoryDto>> GetRecentOrderHistoryAsync(int limit = 20, bool showDeleted = false)
    {
        return await _orderRepository.GetRecentHistoryAsync(limit, showDeleted);
    }

    public async Task<PagedOrderHistoryResult> GetSearchOrdersAsync(
        int page = 1,
        int limit = 20,
        string? search = null,
        OrderSource? source = null,
        PaymentMode? paymentMode = null,
        bool showDeleted = false,
        string sortBy = "date",
        string sortOrder = "desc")
    {
        int? sourceId = source.HasValue && source.Value != OrderSource.None ? (int)source.Value : null;
        int? paymentModeId = paymentMode.HasValue && paymentMode.Value != PaymentMode.None ? (int)paymentMode.Value : null;

        return await _orderRepository.GetSearchOrdersAsync(
            page,
            limit,
            search,
            sourceId,
            paymentModeId,
            showDeleted,
            sortBy,
            sortOrder);
    }

    public async Task<OrderDetailDto?> GetOrderDetailsAsync(string orderId)
    {
        return await _orderRepository.GetDetailsAsync(orderId);
    }

    public async Task<bool> UpdateOrderDetailsAsync(string orderId, OrderUpdateDto details)
    {
        int? sourceId = details.Source.HasValue && details.Source.Value != OrderSource.None ? (int)details.Source.Value : null;
        int? paymentModeId = details.PaymentMode.HasValue && details.PaymentMode.Value != PaymentMode.None ? (int)details.PaymentMode.Value : null;
        string? phone = details.CustomerPhone ?? (details.Source == OrderSource.WhatsApp ? details.SourceHandle : null);

        decimal? calculatedTotal = details.TotalAmount;
        if (!calculatedTotal.HasValue && details.Items != null && details.Items.Count > 0)
        {
            var itemsSum = details.Items.Sum(i => i.Subtotal > 0 ? i.Subtotal : (i.UnitPrice * i.Quantity));
            calculatedTotal = itemsSum + (details.ShippingCharges ?? 0);
        }

        var result = await _orderRepository.UpdateDetailsAsync(
            orderId, 
            phone, 
            details.CustomerAddress, 
            sourceId, 
            details.SourceHandle, 
            paymentModeId, 
            details.TransactionId, 
            details.CustomerId,
            details.CustomerName,
            details.AdvancePaid,
            details.CodBalance,
            calculatedTotal,
            details.ShippingCharges,
            details.ShippingStreet,
            details.ShippingCity,
            details.ShippingState,
            details.ShippingPincode,
            details.IsServiceable);

        if (details.Items != null)
        {
            var internalId = await _orderRepository.GetInternalIdAsync(orderId);

            // Orphaned data prevention: Clean up previous attachments no longer retained in updated items
            try
            {
                var previousDetails = await _orderRepository.GetDetailsAsync(orderId);
                if (previousDetails?.Items != null && previousDetails.Items.Count > 0)
                {
                    var previousAttachments = previousDetails.Items
                        .Where(i => i.Attachments != null)
                        .SelectMany(i => i.Attachments!)
                        .ToList();

                    if (previousAttachments.Count > 0)
                    {
                        var updatedComments = details.Items
                            .Where(i => !string.IsNullOrEmpty(i.Comments))
                            .Select(i => i.Comments!)
                            .ToList();

                        foreach (var prevAtt in previousAttachments)
                        {
                            string attIdStr = prevAtt.Id.ToString();
                            string attKey = prevAtt.Key ?? "";
                            bool isRetained = updatedComments.Any(c => 
                                c.Contains(attIdStr, StringComparison.OrdinalIgnoreCase) ||
                                (!string.IsNullOrEmpty(attKey) && c.Contains(attKey, StringComparison.OrdinalIgnoreCase)));

                            if (!isRetained)
                            {
                                _logger.LogInformation("Hard-deleting orphaned attachment {AttachmentId} ({Key}) from order {OrderId}", 
                                    prevAtt.Id, attKey, orderId);
                                await _attachmentService.DeleteAttachmentAsync(prevAtt.Id);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed cleaning orphaned attachments for order {OrderId}", orderId);
            }

            await _orderRepository.DeleteItemsAsync(internalId);
            
            int index = 1;
            foreach (var item in details.Items)
            {
                var prodId = item.ProductId;
                var productTitle = item.ProductTitle;
                var comments = item.Comments;
                var unitPrice = item.UnitPrice;
                var qty = item.Quantity > 0 ? item.Quantity : 1;
                var subtotal = item.Subtotal > 0 ? item.Subtotal : (unitPrice * qty);

                await _orderRepository.AddOrderItemAsync(
                    internalId, 
                    index++, 
                    prodId, 
                    productTitle,
                    comments,
                    qty,
                    unitPrice,
                    subtotal,
                    item.VendorId,
                    item.SourceType);
            }
        }

        return result;
    }

    public async Task<bool> SoftDeleteOrderAsync(string orderId)
    {
        return await _orderRepository.SoftDeleteOrderAsync(orderId);
    }
}

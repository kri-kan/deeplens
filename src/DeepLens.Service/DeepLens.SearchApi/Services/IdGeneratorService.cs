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

    public async Task<OrderDetailDto?> CloneOrderAsync(string orderId)
    {
        var source = await GetOrderDetailsAsync(orderId);
        if (source == null) return null;

        var newOrderId = await GenerateOrderIdAsync(
            source.Source,
            source.PaymentMode,
            source.SourceHandle,
            source.InstagramUserId,
            source.CustomerId);

        var clonedItems = new List<OrderItemUpdateDto>();
        if (source.Items != null && source.Items.Count > 0)
        {
            foreach (var item in source.Items)
            {
                clonedItems.Add(new OrderItemUpdateDto
                {
                    ProductId = item.ProductId,
                    ProductTitle = item.ProductTitle,
                    Quantity = item.Quantity > 0 ? item.Quantity : 1,
                    UnitPrice = item.UnitPrice,
                    Subtotal = item.Subtotal > 0 ? item.Subtotal : (item.UnitPrice * (item.Quantity > 0 ? item.Quantity : 1)),
                    VendorId = item.VendorId,
                    VendorName = null,
                    SourceType = item.SourceType,
                    Comments = item.Comments,
                    LabelUrl = null
                });
            }
        }

        var updateDto = new OrderUpdateDto
        {
            CustomerName = source.CustomerName,
            CustomerPhone = source.CustomerPhone,
            CustomerAddress = source.CustomerAddress,
            ShippingStreet = source.ShippingStreet,
            ShippingCity = source.ShippingCity,
            ShippingState = source.ShippingState,
            ShippingPincode = source.ShippingPincode,
            IsServiceable = source.IsServiceable,
            TotalAmount = source.TotalAmount,
            ShippingCharges = source.ShippingCharges,
            AdvancePaid = null,
            CodBalance = source.PaymentMode == PaymentMode.COD ? source.TotalAmount : null,
            CustomerId = source.CustomerId,
            Source = source.Source,
            SourceHandle = source.SourceHandle,
            PaymentMode = source.PaymentMode,
            TransactionId = null,
            Status = OrderStatus.Unconfirmed,
            NeedLabel = source.NeedLabel,
            Items = clonedItems,
            Groups = null
        };

        await UpdateOrderDetailsAsync(newOrderId, updateDto);

        _logger.LogInformation("Cloned order {SourceOrderId} to new unconfirmed order {NewOrderId} with {ItemCount} items",
            orderId, newOrderId, clonedItems.Count);

        return await GetOrderDetailsAsync(newOrderId);
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
            details.IsServiceable,
            details.Status,
            details.NeedLabel);

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
            
            // Group items by vendor to create Order Group IDs
            string ResolveVendorForGroup(OrderItemUpdateDto item)
            {
                var vn = (item.VendorName ?? string.Empty).Trim();
                if (!string.IsNullOrEmpty(vn) && !vn.Equals("Unassigned", StringComparison.OrdinalIgnoreCase)) return vn;
                if (!string.IsNullOrEmpty(item.Comments))
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(item.Comments);
                        if (doc.RootElement.TryGetProperty("vendor", out var vp))
                        {
                            var vStr = vp.GetString()?.Trim();
                            if (!string.IsNullOrEmpty(vStr) && !vStr.Equals("Unassigned", StringComparison.OrdinalIgnoreCase)) return vStr;
                        }
                    }
                    catch { }
                }
                if (item.VendorId.HasValue) return $"Vendor {item.VendorId.Value.ToString().Substring(0, 8)}";
                return "Unassigned";
            }

            var groupedByVendor = details.Items.GroupBy(ResolveVendorForGroup).ToList();
            int grpIndex = 1;

            foreach (var grp in groupedByVendor)
            {
                var grpId = $"{orderId}-G{grpIndex}";
                var needLabelForGroup = (details.NeedLabel ?? false) || (details.PaymentMode == PaymentMode.COD);
                var groupVendorName = grp.Key;

                var matchingClientGroup = details.Groups?.FirstOrDefault(g => 
                    (!string.IsNullOrEmpty(g.OrderGrpId) && g.OrderGrpId.Equals(grpId, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(g.VendorName) && g.VendorName.Equals(groupVendorName, StringComparison.OrdinalIgnoreCase)) ||
                    (groupVendorName.Equals("Unassigned", StringComparison.OrdinalIgnoreCase) && (string.IsNullOrEmpty(g.VendorName) || g.VendorName.Equals("Unassigned", StringComparison.OrdinalIgnoreCase))));

                var groupStatus = matchingClientGroup?.Status ?? (details.Status == OrderStatus.Confirmed ? "confirmed" : "unconfirmed");

                await _orderRepository.CreateOrUpdateOrderGroupAsync(new OrderGroupDto
                {
                    OrderGrpId = grpId,
                    OrderId = orderId,
                    VendorId = grp.FirstOrDefault(i => i.VendorId.HasValue)?.VendorId,
                    VendorName = groupVendorName,
                    NeedLabel = needLabelForGroup,
                    Status = groupStatus
                });

                int itemIdx = 1;
                foreach (var item in grp)
                {
                    var prodId = item.ProductId;
                    var productTitle = item.ProductTitle;
                    var comments = item.Comments;
                    var unitPrice = item.UnitPrice;
                    var qty = item.Quantity > 0 ? item.Quantity : 1;
                    var subtotal = item.Subtotal > 0 ? item.Subtotal : (unitPrice * qty);
                    var itemId = item.ItemId ?? $"{grpId}-I{itemIdx++}";

                    await _orderRepository.AddOrderItemAsync(
                        internalId, 
                        itemIdx, 
                        prodId, 
                        productTitle,
                        comments,
                        qty,
                        unitPrice,
                        subtotal,
                        item.VendorId,
                        item.SourceType,
                        itemId,
                        grpId);
                }

                grpIndex++;
            }
        }

        return result;
    }

    public async Task<bool> SoftDeleteOrderAsync(string orderId)
    {
        return await _orderRepository.SoftDeleteOrderAsync(orderId);
    }
}

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
    private readonly ILogger<IdGeneratorService> _logger;

    public IdGeneratorService(
        ISequencedIdGenerator sequencedIdGenerator, 
        IOrderRepository orderRepository, 
        IInstagramSidecarService instagramSidecar, 
        ILogger<IdGeneratorService> logger)
    {
        _sequencedIdGenerator = sequencedIdGenerator;
        _orderRepository = orderRepository;
        _instagramSidecar = instagramSidecar;
        _logger = logger;
    }

    public async Task<string> GenerateOrderIdAsync(OrderSource? source = null, PaymentMode? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null, Guid? customerId = null)
    {
        var result = await _sequencedIdGenerator.GetNextOrderIdAsync();
        
        int? sourceId = source.HasValue ? (int)source.Value : null;
        int? paymentModeId = paymentMode.HasValue ? (int)paymentMode.Value : null;
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

    public async Task<IEnumerable<OrderHistoryDto>> GetRecentOrderHistoryAsync(int limit = 20)
    {
        return await _orderRepository.GetRecentHistoryAsync(limit);
    }

    public async Task<OrderDetailDto?> GetOrderDetailsAsync(string orderId)
    {
        return await _orderRepository.GetDetailsAsync(orderId);
    }

    public async Task<bool> UpdateOrderDetailsAsync(string orderId, OrderUpdateDto details)
    {
        int? sourceId = details.Source.HasValue ? (int)details.Source.Value : null;
        int? paymentModeId = details.PaymentMode.HasValue ? (int)details.PaymentMode.Value : null;

        var result = await _orderRepository.UpdateDetailsAsync(
            orderId, 
            details.CustomerPhone, 
            details.CustomerAddress, 
            sourceId, 
            details.SourceHandle, 
            paymentModeId, 
            details.TransactionId, 
            details.CustomerId,
            details.CustomerName,
            details.AdvancePaid,
            details.CodBalance,
            details.TotalAmount,
            details.ShippingCharges,
            details.ShippingStreet,
            details.ShippingCity,
            details.ShippingState,
            details.ShippingPincode,
            details.IsServiceable);

        if (details.Items != null)
        {
            var internalId = await _orderRepository.GetInternalIdAsync(orderId);
            await _orderRepository.DeleteItemsAsync(internalId);
            
            int index = 1;
            foreach (var item in details.Items)
            {
                await _orderRepository.AddOrderItemAsync(
                    internalId, 
                    index++, 
                    item.ProductId, 
                    item.Comments,
                    item.Quantity > 0 ? item.Quantity : 1,
                    item.UnitPrice,
                    item.Subtotal > 0 ? item.Subtotal : (item.UnitPrice * (item.Quantity > 0 ? item.Quantity : 1)),
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

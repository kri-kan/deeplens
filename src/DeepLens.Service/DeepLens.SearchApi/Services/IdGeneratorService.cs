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

    public async Task<string> GenerateOrderIdAsync(OrderSource? source = null, PaymentMode? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null)
    {
        return await _sequencedIdGenerator.GetNextOrderIdAsync();
    }

    public async Task<(string OrderId, IEnumerable<string> ItemIds)> GenerateOrderWithItemsAsync(int itemCount, OrderSource? source = null, PaymentMode? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null)
    {
        var orderId = await GenerateOrderIdAsync(source, paymentMode, sourceHandle, instagramUserId);
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

    public async Task<bool> UpdateOrderDetailsAsync(string orderId, string? customerPhone = null, string? customerAddress = null, OrderSource? source = null, string? sourceHandle = null, PaymentMode? paymentMode = null, IEnumerable<OrderItemUpdateDto>? items = null, string? transactionId = null)
    {
        int? sourceId = source.HasValue ? (int)source.Value : null;
        int? paymentModeId = paymentMode.HasValue ? (int)paymentMode.Value : null;

        var result = await _orderRepository.UpdateDetailsAsync(orderId, customerPhone, customerAddress, sourceId, sourceHandle, paymentModeId, transactionId);

        if (items != null)
        {
            var internalId = await _orderRepository.GetInternalIdAsync(orderId);
            await _orderRepository.DeleteItemsAsync(internalId);
            
            int index = 1;
            foreach (var item in items)
            {
                await _orderRepository.AddOrderItemAsync(internalId, index++, item.ProductId, item.Comments);
            }
        }

        return result;
    }
}

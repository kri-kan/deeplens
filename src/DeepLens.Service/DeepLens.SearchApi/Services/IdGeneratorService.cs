using DeepLens.Application.Abstractions.Data;
using DeepLens.Application.Abstractions.IdGeneration;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Contracts.Orders;
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

    public async Task<string> GenerateOrderIdAsync(string? source = null, string? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null)
    {
        return await _sequencedIdGenerator.GetNextOrderIdAsync();
    }

    public async Task<(string OrderId, IEnumerable<string> ItemIds)> GenerateOrderWithItemsAsync(int itemCount, string? source = null, string? paymentMode = null, string? sourceHandle = null, string? instagramUserId = null)
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

    public async Task<object?> GetOrderDetailsAsync(string orderId)
    {
        return await _orderRepository.GetDetailsAsync(orderId);
    }

    public async Task<bool> UpdateOrderDetailsAsync(string orderId, string? phone = null, string? address = null, string? source = null, string? sourceHandle = null, string? paymentMode = null, IEnumerable<OrderItemUpdateDto>? items = null, string? transactionId = null)
    {
        int? sourceId = null;
        if (!string.IsNullOrEmpty(source) && Enum.TryParse<DeepLens.Domain.Enums.OrderSource>(source, true, out var srcEnum))
            sourceId = (int)srcEnum;

        int? paymentModeId = null;
        if (!string.IsNullOrEmpty(paymentMode) && Enum.TryParse<DeepLens.Domain.Enums.PaymentMode>(paymentMode, true, out var payEnum))
            paymentModeId = (int)payEnum;

        var result = await _orderRepository.UpdateDetailsAsync(orderId, phone, address, sourceId, sourceHandle, paymentModeId, transactionId);

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

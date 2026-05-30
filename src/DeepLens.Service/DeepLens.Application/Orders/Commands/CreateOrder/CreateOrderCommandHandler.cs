using DeepLens.Application.Abstractions.Data;
using DeepLens.Application.Abstractions.IdGeneration;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Shared.Common.Models;
using MediatR;
using Microsoft.Extensions.Logging;

namespace DeepLens.Application.Orders.Commands.CreateOrder;

public class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, Result<CreateOrderResponse>>
{
    private readonly ISequencedIdGenerator _idGenerator;
    private readonly IOrderRepository _orderRepository;
    private readonly IInstagramSidecarService _instagramSidecar;
    private readonly ILogger<CreateOrderCommandHandler> _logger;

    public CreateOrderCommandHandler(
        ISequencedIdGenerator idGenerator, 
        IOrderRepository orderRepository, 
        IInstagramSidecarService instagramSidecar, 
        ILogger<CreateOrderCommandHandler> logger)
    {
        _idGenerator = idGenerator;
        _orderRepository = orderRepository;
        _instagramSidecar = instagramSidecar;
        _logger = logger;
    }

    public async Task<Result<CreateOrderResponse>> Handle(CreateOrderCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _idGenerator.GetNextOrderIdAsync();
            var orderIdStr = result.OrderId;
            
            int? sourceId = null;
            if (!string.IsNullOrEmpty(request.Source) && Enum.TryParse<DeepLens.Domain.Enums.OrderSource>(request.Source, true, out var srcEnum))
                sourceId = (int)srcEnum;

            int? paymentModeId = null;
            if (!string.IsNullOrEmpty(request.PaymentMode) && Enum.TryParse<DeepLens.Domain.Enums.PaymentMode>(request.PaymentMode, true, out var payEnum))
                paymentModeId = (int)payEnum;

            await _orderRepository.CreateOrderRecordAsync(result.Id, orderIdStr, sourceId, paymentModeId, null, null, null);

            return Result<CreateOrderResponse>.Success(new CreateOrderResponse(orderIdStr));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating order");
            return Result<CreateOrderResponse>.Failure(new Error("Order.CreateError", ex.Message));
        }
    }
}

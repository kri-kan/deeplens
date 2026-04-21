using MediatR;
using DeepLens.Shared.Common.Models;

namespace DeepLens.Application.Orders.Commands.CreateOrder;

public record CreateOrderCommand(
    string? Source = null,
    string? PaymentMode = null,
    string? SourceHandle = null,
    string? InstagramUserId = null,
    int ItemCount = 0) : IRequest<Result<CreateOrderResponse>>;

public record CreateOrderResponse(string OrderId, IEnumerable<string>? ItemIds = null);

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using DeepLens.SearchApi.Services;
using DeepLens.SearchApi.DTOs;
using DeepLens.Contracts.Orders;
using DeepLens.Domain.Enums;

namespace DeepLens.SearchApi.Controllers;

/// <summary>
/// API to generate custom IDs for orders and products.
/// Single-tenant version.
/// </summary>
[ApiController]
[Route("api/v1/orderid")]
public class OrderIdController : ControllerBase
{
    private readonly IIdGeneratorService _idGenerator;
    private readonly DeepLens.Application.Abstractions.Data.IOrderRepository _orderRepository;
    private readonly MediatR.IMediator _mediator;
    private readonly ILogger<OrderIdController> _logger;

    public OrderIdController(
        IIdGeneratorService idGenerator, 
        DeepLens.Application.Abstractions.Data.IOrderRepository orderRepository,
        MediatR.IMediator mediator,
        ILogger<OrderIdController> logger)
    {
        _idGenerator = idGenerator;
        _orderRepository = orderRepository;
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Gets the most recent order IDs from the database.
    /// </summary>
    [HttpGet("{orderId}")]
    public async Task<ActionResult<OrderDetailDto>> GetOrder(string orderId)
    {
        var order = await _idGenerator.GetOrderDetailsAsync(orderId);
        if (order == null) return NotFound(new { message = $"Order ID {orderId} not found" });
        return Ok(order);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetRecentOrders([FromQuery] int limit = 20, [FromQuery] bool showDeleted = false)
    {
        var history = await _idGenerator.GetRecentOrderHistoryAsync(limit, showDeleted);
        return Ok(history);
    }

    /// <summary>
    /// Search and paginate all orders with filtering and sorting.
    /// </summary>
    [HttpGet("all")]
    public async Task<ActionResult<PagedOrderHistoryResult>> GetAllOrders(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? q = null,
        [FromQuery] OrderSource? source = null,
        [FromQuery] PaymentMode? paymentMode = null,
        [FromQuery] bool showDeleted = false,
        [FromQuery] string sortBy = "date",
        [FromQuery] string sortOrder = "desc")
    {
        var result = await _idGenerator.GetSearchOrdersAsync(page, limit, q, source, paymentMode, showDeleted, sortBy, sortOrder);
        return Ok(result);
    }

    /// <summary>
    /// Generates a new unique Order ID.
    /// </summary>
    [HttpPost("order")]
    public async Task<IActionResult> GenerateOrderId([FromQuery] OrderSource? source, [FromQuery] PaymentMode? paymentMode, [FromQuery] string? sourceHandle, [FromQuery] string? instagramUserId, [FromQuery] Guid? customerId)
    {
        var orderId = await _idGenerator.GenerateOrderIdAsync(source, paymentMode, sourceHandle, instagramUserId, customerId);
        return Ok(new { orderId });
    }

    /// <summary>
    /// Generates a new unique Order ID and a set of item sub-IDs.
    /// Can accept parameters in query string or in JSON request body.
    /// </summary>
    [HttpPost("orderwithitems")]
    public async Task<IActionResult> GenerateOrderWithItems(
        [FromQuery] int itemCount = 1, 
        [FromQuery] OrderSource? source = null, 
        [FromQuery] PaymentMode? paymentMode = null, 
        [FromQuery] string? sourceHandle = null, 
        [FromQuery] string? instagramUserId = null, 
        [FromQuery] Guid? customerId = null,
        [FromBody(EmptyBodyBehavior = Microsoft.AspNetCore.Mvc.ModelBinding.EmptyBodyBehavior.Allow)] OrderUpdateDto? body = null)
    {
        var effectiveSource = body?.Source ?? source;
        var effectivePaymentMode = body?.PaymentMode ?? paymentMode;
        var effectiveSourceHandle = !string.IsNullOrWhiteSpace(body?.SourceHandle) ? body.SourceHandle : sourceHandle;
        var effectiveCustomerId = body?.CustomerId ?? customerId;
        var effectiveItemCount = (body?.Items != null && body.Items.Count > 0) 
            ? body.Items.Count 
            : (body != null ? 0 : itemCount);

        if (effectiveItemCount > 100)
            return BadRequest(new { message = "Item count must be between 0 and 100" });

        string orderId;
        IEnumerable<string> itemIds;

        if (effectiveItemCount > 0)
        {
            (orderId, itemIds) = await _idGenerator.GenerateOrderWithItemsAsync(
                effectiveItemCount, 
                effectiveSource, 
                effectivePaymentMode, 
                effectiveSourceHandle, 
                instagramUserId, 
                effectiveCustomerId);
        }
        else
        {
            orderId = await _idGenerator.GenerateOrderIdAsync(
                effectiveSource, 
                effectivePaymentMode, 
                effectiveSourceHandle, 
                instagramUserId, 
                effectiveCustomerId);
            itemIds = Array.Empty<string>();
        }

        if (body != null)
        {
            body.Source ??= effectiveSource;
            body.PaymentMode ??= effectivePaymentMode;
            body.SourceHandle ??= effectiveSourceHandle;
            if (string.IsNullOrWhiteSpace(body.CustomerPhone) && effectiveSource == OrderSource.WhatsApp)
            {
                body.CustomerPhone = effectiveSourceHandle;
            }

            await _idGenerator.UpdateOrderDetailsAsync(orderId, body);
        }

        return Ok(new { id = orderId, orderId, itemIds });
    }

    /// <summary>
    /// Generates a new unique Product ID.
    /// </summary>
    [HttpPost("product")]
    public async Task<IActionResult> GenerateProductId()
    {
        var productId = await _idGenerator.GenerateProductIdAsync();
        return Ok(new { productId });
    }

    /// <summary>
    /// Generates a sub-ID for an existing Order ID.
    /// </summary>
    [HttpGet("order-item")]
    public IActionResult GenerateOrderItemId([FromQuery] string orderId, [FromQuery] int itemIndex)
    {
        if (string.IsNullOrWhiteSpace(orderId)) return BadRequest(new { message = "OrderId is required" });
        if (itemIndex < 1) return BadRequest(new { message = "Item index must be >= 1" });

        var itemId = _idGenerator.GenerateOrderItemId(orderId, itemIndex);
        return Ok(new { itemId });
    }

    /// <summary>
    /// Updates details (phone, address, items) for an existing order ID.
    /// </summary>
    [HttpPut("order/{orderId}")]
    public async Task<IActionResult> UpdateOrderDetails(string orderId, [FromBody] OrderUpdateDto details)
    {
        var success = await _idGenerator.UpdateOrderDetailsAsync(orderId, details);
            
        if (!success) return NotFound(new { message = $"Order ID {orderId} not found" });
        return Ok(new { message = "Details updated successfully" });
    }

    /// <summary>
    /// Confirms an unconfirmed order, transitioning it to Confirmed status.
    /// </summary>
    [HttpPost("order/{orderId}/confirm")]
    public async Task<IActionResult> ConfirmOrder(string orderId)
    {
        var success = await _orderRepository.ConfirmOrderAsync(orderId);
        if (!success) return NotFound(new { message = $"Order ID {orderId} not found" });
        return Ok(new { message = "Order confirmed successfully", status = "Confirmed" });
    }

    /// <summary>
    /// Generates Delhivery shipping label for a specific order group.
    /// </summary>
    [HttpPost("groups/{grpId}/label")]
    public async Task<IActionResult> GenerateGroupLabel(string grpId, [FromBody] GenerateGroupLabelRequest? request = null)
    {
        var command = new DeepLens.Infrastructure.Services.Logistics.GenerateGroupLabelCommand(
            grpId,
            request?.PickupLocation,
            request?.ShippingMode,
            request?.WeightGrams,
            request?.LengthCm,
            request?.WidthCm,
            request?.HeightCm,
            request?.PaymentMode,
            request?.CodAmount,
            request?.TotalAmount,
            request?.OrderId,
            request?.Quantity,
            request?.ProductsDesc);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            return BadRequest(new { error = result.Error.Code, message = result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Gets order groups for the specified processing stage (confirmed, processed, delivered).
    /// </summary>
    [HttpGet("groups/processing")]
    public async Task<ActionResult<IEnumerable<OrderGroupDto>>> GetProcessingGroups([FromQuery] string stage = "confirmed")
    {
        var groups = await _orderRepository.GetOrderGroupsByStageAsync(stage);
        return Ok(groups);
    }

    /// <summary>
    /// Toggles the need_label setting for an order group.
    /// </summary>
    [HttpPut("groups/{grpId}/need-label")]
    public async Task<IActionResult> UpdateGroupNeedLabel(string grpId, [FromBody] NeedLabelUpdateRequest request)
    {
        var success = await _orderRepository.UpdateGroupNeedLabelAsync(grpId, request.NeedLabel);
        if (!success) return NotFound(new { message = $"Group {grpId} not found" });
        return Ok(new { message = "Need label updated", needLabel = request.NeedLabel });
    }

    /// <summary>
    /// Marks an order group as processed.
    /// </summary>
    [HttpPost("groups/{grpId}/process")]
    public async Task<IActionResult> MarkGroupProcessed(string grpId)
    {
        var success = await _orderRepository.MarkGroupProcessedAsync(grpId);
        if (!success) return NotFound(new { message = $"Group {grpId} not found" });
        return Ok(new { message = "Order group processed successfully", status = "processed" });
    }

    /// <summary>
    /// Fetches live carrier tracking delivery status for an order group.
    /// </summary>
    [HttpPost("groups/{grpId}/fetch-delivery-status")]
    public async Task<IActionResult> FetchGroupDeliveryStatus(string grpId)
    {
        var subStatus = await _orderRepository.FetchGroupDeliveryStatusAsync(grpId);
        return Ok(new { message = "Delivery status fetched", trackingSubStatus = subStatus });
    }

    /// <summary>
    /// Cancels a generated group shipping label with Delhivery, hard-deletes the PDF from MinIO storage,
    /// sets status to cancelled while retaining the AWB number for audit.
    /// </summary>
    [HttpPost("groups/{grpId}/label/cancel")]
    public async Task<IActionResult> CancelGroupLabel(string grpId, [FromBody] CancelGroupLabelRequest? request)
    {
        var command = new DeepLens.Infrastructure.Services.Logistics.CancelGroupLabelCommand(
            grpId,
            request?.AwbNumber,
            request?.Reason);
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
        {
            return BadRequest(new { error = result.Error.Code, message = result.Error.Description });
        }

        return Ok(result.Value);
    }

    /// <summary>
    /// Soft deletes an order by its ID.
    /// </summary>
    [HttpDelete("order/{orderId}")]
    public async Task<IActionResult> DeleteOrder(string orderId)
    {
        var success = await _idGenerator.SoftDeleteOrderAsync(orderId);
        if (!success) return NotFound(new { message = $"Order ID {orderId} not found" });
        return Ok(new { message = "Order deleted successfully" });
    }
}

public class NeedLabelUpdateRequest
{
    public bool NeedLabel { get; set; }
}

public class GenerateGroupLabelRequest
{
    public string? PickupLocation { get; set; }
    public string? ShippingMode { get; set; }
    public int? WeightGrams { get; set; }
    public double? LengthCm { get; set; }
    public double? WidthCm { get; set; }
    public double? HeightCm { get; set; }
    public string? PaymentMode { get; set; }
    public decimal? CodAmount { get; set; }
    public decimal? TotalAmount { get; set; }
    public string? OrderId { get; set; }
    public int? Quantity { get; set; }
    public string? ProductsDesc { get; set; }
}

public class CancelGroupLabelRequest
{
    public string? AwbNumber { get; set; }
    public string? Reason { get; set; }
}

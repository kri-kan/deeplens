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
    private readonly ILogger<OrderIdController> _logger;

    public OrderIdController(IIdGeneratorService idGenerator, ILogger<OrderIdController> logger)
    {
        _idGenerator = idGenerator;
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
    public async Task<IActionResult> GetRecentOrders([FromQuery] int limit = 20)
    {
        var history = await _idGenerator.GetRecentOrderHistoryAsync(limit);
        return Ok(history);
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
    /// </summary>
    [HttpPost("orderwithitems")]
    public async Task<IActionResult> GenerateOrderWithItems([FromQuery] int itemCount = 1, [FromQuery] OrderSource? source = null, [FromQuery] PaymentMode? paymentMode = null, [FromQuery] string? sourceHandle = null, [FromQuery] string? instagramUserId = null, [FromQuery] Guid? customerId = null)
    {
        if (itemCount < 1 || itemCount > 100)
            return BadRequest(new { message = "Item count must be between 1 and 100" });

        var (orderId, itemIds) = await _idGenerator.GenerateOrderWithItemsAsync(itemCount, source, paymentMode, sourceHandle, instagramUserId, customerId);

        return Ok(new { orderId, itemIds });
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
        var success = await _idGenerator.UpdateOrderDetailsAsync(
            orderId, 
            details.CustomerPhone, 
            details.CustomerAddress, 
            details.Source,
            details.SourceHandle,
            details.PaymentMode,
            details.Items,
            details.TransactionId,
            details.CustomerId);
            
        if (!success) return NotFound(new { message = $"Order ID {orderId} not found" });
        return Ok(new { message = "Details updated successfully" });
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

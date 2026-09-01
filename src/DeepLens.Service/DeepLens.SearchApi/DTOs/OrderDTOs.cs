using System.Text.Json.Serialization;
using DeepLens.Domain.Enums;

namespace DeepLens.SearchApi.DTOs;

// ────────────────────────────────────────────────
//  Order DTOs
// ────────────────────────────────────────────────

/// <summary>
/// Request body for updating mutable fields on an existing order.
/// </summary>
public class OrderUpdateDto
{
    [JsonPropertyName("customerName")]
    public string? CustomerName { get; set; }

    [JsonPropertyName("customerPhone")]
    public string? CustomerPhone { get; set; }

    [JsonPropertyName("customerAddress")]
    public string? CustomerAddress { get; set; }

    [JsonPropertyName("shippingStreet")]
    public string? ShippingStreet { get; set; }

    [JsonPropertyName("shippingCity")]
    public string? ShippingCity { get; set; }

    [JsonPropertyName("shippingState")]
    public string? ShippingState { get; set; }

    [JsonPropertyName("shippingPincode")]
    public string? ShippingPincode { get; set; }

    [JsonPropertyName("isServiceable")]
    public bool? IsServiceable { get; set; }

    [JsonPropertyName("totalAmount")]
    public decimal? TotalAmount { get; set; }

    [JsonPropertyName("advancePaid")]
    public decimal? AdvancePaid { get; set; }

    [JsonPropertyName("codBalance")]
    public decimal? CodBalance { get; set; }

    [JsonPropertyName("shippingCharges")]
    public decimal? ShippingCharges { get; set; }

    [JsonPropertyName("customerId")]
    public Guid? CustomerId { get; set; }

    [JsonPropertyName("source")]
    public OrderSource? Source { get; set; }

    [JsonPropertyName("sourceHandle")]
    public string? SourceHandle { get; set; }

    [JsonPropertyName("paymentMode")]
    public PaymentMode? PaymentMode { get; set; }

    [JsonPropertyName("transactionId")]
    public string? TransactionId { get; set; }

    [JsonPropertyName("items")]
    public List<OrderItemUpdateDto>? Items { get; set; }
}

/// <summary>
/// Represents a single order line item for create/update operations.
/// </summary>
public class OrderItemUpdateDto
{
    [JsonPropertyName("productId")]
    public string? ProductId { get; set; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; } = 1;

    [JsonPropertyName("unitPrice")]
    public decimal UnitPrice { get; set; }

    [JsonPropertyName("subtotal")]
    public decimal Subtotal { get; set; }

    [JsonPropertyName("vendorId")]
    public Guid? VendorId { get; set; }

    [JsonPropertyName("sourceType")]
    public string? SourceType { get; set; }

    [JsonPropertyName("comments")]
    public string? Comments { get; set; }
}

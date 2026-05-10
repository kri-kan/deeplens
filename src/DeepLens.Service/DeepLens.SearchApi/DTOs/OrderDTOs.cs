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
    [JsonPropertyName("customerPhone")]
    public string? CustomerPhone { get; set; }

    [JsonPropertyName("customerAddress")]
    public string? CustomerAddress { get; set; }

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

    [JsonPropertyName("comments")]
    public string? Comments { get; set; }
}

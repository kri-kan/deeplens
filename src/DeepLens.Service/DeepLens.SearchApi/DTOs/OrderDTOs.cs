using System.Text.Json.Serialization;

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
    public string? Phone { get; set; }

    [JsonPropertyName("customerAddress")]
    public string? Address { get; set; }

    [JsonPropertyName("source")]
    public string? Source { get; set; }

    [JsonPropertyName("sourceHandle")]
    public string? SourceHandle { get; set; }

    [JsonPropertyName("paymentMode")]
    public string? PaymentMode { get; set; }

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

namespace DeepLens.SearchApi.DTOs;

// ────────────────────────────────────────────────
//  Order DTOs
// ────────────────────────────────────────────────

/// <summary>
/// Request body for updating mutable fields on an existing order.
/// </summary>
public class OrderUpdateDto
{
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Source { get; set; }
    public string? SourceHandle { get; set; }
    public string? PaymentMode { get; set; }
    public string? TransactionId { get; set; }
    public List<OrderItemUpdateDto>? Items { get; set; }
}

/// <summary>
/// Represents a single order line item for create/update operations.
/// </summary>
public class OrderItemUpdateDto
{
    public string? ProductId { get; set; }
    public string? Comments { get; set; }
}

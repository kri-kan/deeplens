namespace DeepLens.Contracts.Orders;

public class OrderHistoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public string? SourceHandle { get; set; }
    public string? InstagramHandle { get; set; }
    public string? InstagramUserId { get; set; }
    public string? CustomerAddress { get; set; }
    public string? TransactionId { get; set; }
    public DateTime Timestamp { get; set; }
}

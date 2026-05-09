using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Orders;

public class OrderHistoryDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("source")]
    public string Source { get; set; } = string.Empty;

    [JsonPropertyName("paymentMethod")]
    public string PaymentMethod { get; set; } = string.Empty;

    [JsonPropertyName("customerPhone")]
    public string? CustomerPhone { get; set; }

    [JsonPropertyName("sourceHandle")]
    public string? SourceHandle { get; set; }

    [JsonPropertyName("instagramHandle")]
    public string? InstagramHandle { get; set; }

    [JsonPropertyName("instagramUserId")]
    public string? InstagramUserId { get; set; }

    [JsonPropertyName("customerAddress")]
    public string? CustomerAddress { get; set; }

    [JsonPropertyName("transactionId")]
    public string? TransactionId { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }
}

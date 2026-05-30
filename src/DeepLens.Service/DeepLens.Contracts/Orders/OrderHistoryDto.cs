using System;
using System.Text.Json.Serialization;
using DeepLens.Domain.Enums;

namespace DeepLens.Contracts.Orders;

public class OrderHistoryDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("source")]
    public OrderSource Source { get; set; }

    [JsonPropertyName("paymentMode")]
    public PaymentMode PaymentMode { get; set; }

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

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("isDeleted")]
    public bool IsDeleted { get; set; }

    [JsonPropertyName("customerId")]
    public Guid? CustomerId { get; set; }
}

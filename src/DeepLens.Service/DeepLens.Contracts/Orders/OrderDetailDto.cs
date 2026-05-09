using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Orders;

public class OrderDetailDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("source")]
    public string? Source { get; set; }

    [JsonPropertyName("paymentMethod")]
    public string? PaymentMethod { get; set; }

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

    [JsonPropertyName("attachments")]
    public List<AttachmentDto>? Attachments { get; set; }

    [JsonPropertyName("items")]
    public List<OrderItemDetailDto>? Items { get; set; }
}

public class OrderItemDetailDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("productId")]
    public string? ProductId { get; set; }

    [JsonPropertyName("comments")]
    public string? Comments { get; set; }

    [JsonPropertyName("attachments")]
    public List<AttachmentDto>? Attachments { get; set; }
}

public class AttachmentDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("bucket")]
    public string? Bucket { get; set; }

    [JsonPropertyName("key")]
    public string? Key { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("tag")]
    public string? Tag { get; set; }

    [JsonPropertyName("mimeType")]
    public string? MimeType { get; set; }
}

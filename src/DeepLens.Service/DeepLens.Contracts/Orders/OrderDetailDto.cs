using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using DeepLens.Domain.Enums;

namespace DeepLens.Contracts.Orders;

public class OrderDetailDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("source")]
    public OrderSource? Source { get; set; }

    [JsonPropertyName("paymentMode")]
    public PaymentMode? PaymentMode { get; set; }

    [JsonPropertyName("customerPhone")]
    public string? CustomerPhone { get; set; }

    [JsonPropertyName("sourceHandle")]
    public string? SourceHandle { get; set; }

    [JsonPropertyName("customerId")]
    public Guid? CustomerId { get; set; }

    [JsonPropertyName("instagramHandle")]
    public string? InstagramHandle { get; set; }

    [JsonPropertyName("instagramUserId")]
    public string? InstagramUserId { get; set; }

    [JsonPropertyName("customerName")]
    public string? CustomerName { get; set; }

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

    [JsonPropertyName("transactionId")]
    public string? TransactionId { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }

    [JsonPropertyName("attachments")]
    public List<AttachmentDto>? Attachments { get; set; }

    [JsonPropertyName("items")]
    public List<OrderItemDetailDto>? Items { get; set; }

    [JsonPropertyName("isDeleted")]
    public bool IsDeleted { get; set; }
}

public class OrderItemDetailDto
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

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

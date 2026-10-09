using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Orders;

public class OrderGroupDto
{
    [JsonPropertyName("orderGrpId")]
    public string OrderGrpId { get; set; } = string.Empty;

    [JsonPropertyName("orderId")]
    public string OrderId { get; set; } = string.Empty;

    [JsonPropertyName("vendorId")]
    public Guid? VendorId { get; set; }

    [JsonPropertyName("vendorName")]
    public string? VendorName { get; set; }

    [JsonPropertyName("needLabel")]
    public bool NeedLabel { get; set; }

    [JsonPropertyName("awbNumber")]
    public string? AwbNumber { get; set; }

    [JsonPropertyName("labelUrl")]
    public string? LabelUrl { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "unconfirmed";

    [JsonPropertyName("trackingSubStatus")]
    public string? TrackingSubStatus { get; set; }

    [JsonPropertyName("paymentMode")]
    public string? PaymentMode { get; set; }

    [JsonPropertyName("customerName")]
    public string? CustomerName { get; set; }

    [JsonPropertyName("customerPhone")]
    public string? CustomerPhone { get; set; }

    [JsonPropertyName("customerAddress")]
    public string? CustomerAddress { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime? CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime? UpdatedAt { get; set; }

    [JsonPropertyName("items")]
    public List<OrderItemDetailDto> Items { get; set; } = new();
}

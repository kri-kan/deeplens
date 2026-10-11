using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Orders;

public class GroupShipmentHistoryDto
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("orderGrpId")]
    public string? OrderGrpId { get; set; }

    [JsonPropertyName("awbNumber")]
    public string AwbNumber { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "cancelled";

    [JsonPropertyName("courierPartner")]
    public string? CourierPartner { get; set; } = "Delhivery";

    [JsonPropertyName("shippingMode")]
    public string? ShippingMode { get; set; }

    [JsonPropertyName("metadata")]
    public JsonDocument? Metadata { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime? CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime? UpdatedAt { get; set; }
}

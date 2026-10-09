using System.Text.Json.Serialization;

namespace DeepLens.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum OrderSource
{
    None = 0,
    WhatsApp = 1,
    Instagram = 2
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PaymentMode
{
    None = 0,
    COD = 1,
    Prepaid = 2
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum OrderStatus
{
    Unconfirmed = 0,
    Confirmed = 1,
    Processing = 2,
    Dispatched = 3,
    Delivered = 4,
    Cancelled = 5
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum LabelStatus
{
    NotRequired = 0,
    Pending = 1,
    Generated = 2,
    Failed = 3
}


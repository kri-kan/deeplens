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

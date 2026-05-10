using System.Text.Json.Serialization;

namespace DeepLens.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CommentEntityType
{
    Order = 1,
    Product = 2,
    InstagramPost = 3,
    OrderItem = 4
}

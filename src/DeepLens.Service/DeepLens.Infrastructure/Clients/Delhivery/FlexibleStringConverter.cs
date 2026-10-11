using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace DeepLens.Infrastructure.Clients.Delhivery;

/// <summary>
/// Custom JsonConverter that deserializes JSON values into a C# string,
/// supporting strings, numbers (int, long, double, decimal), booleans, and nulls.
/// </summary>
public class FlexibleStringConverter : JsonConverter<string?>
{
    public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        switch (reader.TokenType)
        {
            case JsonTokenType.String:
                return reader.GetString();
            case JsonTokenType.Number:
                if (reader.TryGetInt64(out var longVal))
                {
                    return longVal.ToString(CultureInfo.InvariantCulture);
                }
                if (reader.TryGetDouble(out var doubleVal))
                {
                    return doubleVal.ToString(CultureInfo.InvariantCulture);
                }
                return reader.GetDecimal().ToString(CultureInfo.InvariantCulture);
            case JsonTokenType.True:
                return "true";
            case JsonTokenType.False:
                return "false";
            case JsonTokenType.Null:
                return null;
            case JsonTokenType.StartObject:
            case JsonTokenType.StartArray:
                using (var doc = JsonDocument.ParseValue(ref reader))
                {
                    return doc.RootElement.GetRawText();
                }
            default:
                return null;
        }
    }

    public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
    {
        if (value == null)
        {
            writer.WriteNullValue();
        }
        else
        {
            writer.WriteStringValue(value);
        }
    }
}

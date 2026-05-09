using System.Text.Json.Serialization;

namespace DeepLens.Contracts.Common;

public record CountryCodeDto(
    [property: JsonPropertyName("code")] string Code, 
    [property: JsonPropertyName("name")] string Name, 
    [property: JsonPropertyName("dialCode")] string DialCode
);

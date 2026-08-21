using System.Text.Json;
using System.Text.Json.Serialization;
using NUnit.Framework;

namespace DeepLens.Infrastructure.Tests;

[TestFixture]
public class MetaRateLimitingTests
{
    private class MetaAppUsageHeaderDto
    {
        [JsonPropertyName("call_count")]
        public int CallCount { get; set; }

        [JsonPropertyName("total_cputime")]
        public int TotalCpuTime { get; set; }

        [JsonPropertyName("total_time")]
        public int TotalTime { get; set; }
    }

    [Test]
    public void MetaAppUsageHeader_Deserializes_SnakeCase_Correctly()
    {
        // Given snake_case JSON from Meta Graph API response headers
        var jsonHeader = "{\"call_count\": 45, \"total_cputime\": 12, \"total_time\": 8}";

        // When deserializing
        var result = JsonSerializer.Deserialize<MetaAppUsageHeaderDto>(jsonHeader);

        // Then properties are correctly mapped
        Assert.That(result, Is.Not.Null);
        Assert.That(result!.CallCount, Is.EqualTo(45));
        Assert.That(result.TotalCpuTime, Is.EqualTo(12));
        Assert.That(result.TotalTime, Is.EqualTo(8));
    }

    [Test]
    public void MetaAppUsageHeader_Handles_Missing_Fields_Gracefully()
    {
        var partialHeader = "{\"call_count\": 80}";

        var result = JsonSerializer.Deserialize<MetaAppUsageHeaderDto>(partialHeader);

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.CallCount, Is.EqualTo(80));
        Assert.That(result.TotalCpuTime, Is.EqualTo(0));
        Assert.That(result.TotalTime, Is.EqualTo(0));
    }
}

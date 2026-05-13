using System.Text.Json.Serialization;

namespace DeepLens.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum InstagramJobType
{
    Profile = 0,
    Media = 1,
    Followers = 2,
    Following = 3,
    Backfill = 4,
    Manual = 5,
    Routine = 6
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum InstagramJobStatus
{
    Pending = 0,
    Running = 1,
    Completed = 2,
    Failed = 3,
    Cancelled = 4
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum InstagramLinkType
{
    Is = 0,     // The post IS the product (primary)
    Shows = 1,  // The post SHOWS the product (reference)
    Inspo = 2   // The post is INSPIRATION for the product
}

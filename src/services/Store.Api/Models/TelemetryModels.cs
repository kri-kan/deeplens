using System.Text.Json.Serialization;

namespace Store.Api.Models;

public class DeviceRegistrationDto
{
    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("fingerprintHash")]
    public string? FingerprintHash { get; set; }

    [JsonPropertyName("platform")]
    public string Platform { get; set; } = "web";

    [JsonPropertyName("os")]
    public string? Os { get; set; }

    [JsonPropertyName("model")]
    public string? Model { get; set; }

    [JsonPropertyName("browser")]
    public string? Browser { get; set; }

    [JsonPropertyName("screenResolution")]
    public string? ScreenResolution { get; set; }

    [JsonPropertyName("userId")]
    public string? UserId { get; set; }

    [JsonPropertyName("metadata")]
    public Dictionary<string, object>? Metadata { get; set; }
}

public class TelemetrySignalDto
{
    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("sessionId")]
    public string? SessionId { get; set; }

    [JsonPropertyName("userId")]
    public string? UserId { get; set; }

    [JsonPropertyName("signalType")]
    public string SignalType { get; set; } = string.Empty;

    [JsonPropertyName("properties")]
    public Dictionary<string, object>? Properties { get; set; }

    [JsonPropertyName("clientTimestamp")]
    public DateTime? ClientTimestamp { get; set; }
}

public class BatchTelemetrySignalsRequest
{
    [JsonPropertyName("device")]
    public DeviceRegistrationDto? Device { get; set; }

    [JsonPropertyName("signals")]
    public List<TelemetrySignalDto> Signals { get; set; } = new();
}

public class StoreDeviceDto
{
    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("fingerprintHash")]
    public string? FingerprintHash { get; set; }

    [JsonPropertyName("platform")]
    public string Platform { get; set; } = string.Empty;

    [JsonPropertyName("os")]
    public string? Os { get; set; }

    [JsonPropertyName("model")]
    public string? Model { get; set; }

    [JsonPropertyName("browser")]
    public string? Browser { get; set; }

    [JsonPropertyName("screenResolution")]
    public string? ScreenResolution { get; set; }

    [JsonPropertyName("firstSeenAt")]
    public DateTime FirstSeenAt { get; set; }

    [JsonPropertyName("lastSeenAt")]
    public DateTime LastSeenAt { get; set; }

    [JsonPropertyName("lastIp")]
    public string? LastIp { get; set; }

    [JsonPropertyName("lastUserId")]
    public string? LastUserId { get; set; }

    [JsonPropertyName("totalEvents")]
    public int TotalEvents { get; set; }
}

public class DeviceFleetStatsDto
{
    [JsonPropertyName("totalDevices")]
    public int TotalDevices { get; set; }

    [JsonPropertyName("activeToday")]
    public int ActiveToday { get; set; }

    [JsonPropertyName("activeLast7Days")]
    public int ActiveLast7Days { get; set; }

    [JsonPropertyName("platformBreakdown")]
    public Dictionary<string, int> PlatformBreakdown { get; set; } = new();

    [JsonPropertyName("topSignalTypes")]
    public Dictionary<string, int> TopSignalTypes { get; set; } = new();

    [JsonPropertyName("recentDevices")]
    public List<StoreDeviceDto> RecentDevices { get; set; } = new();
}

public class StitchIdentityRequest
{
    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("linkSource")]
    public string LinkSource { get; set; } = "otp_login";

    [JsonPropertyName("confidenceScore")]
    public double ConfidenceScore { get; set; } = 1.0;
}

public class IdentityLinkDto
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("confidenceScore")]
    public double ConfidenceScore { get; set; }

    [JsonPropertyName("linkSource")]
    public string LinkSource { get; set; } = string.Empty;

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

public class SessionSummaryDto
{
    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("userId")]
    public string? UserId { get; set; }

    [JsonPropertyName("startTime")]
    public DateTime StartTime { get; set; }

    [JsonPropertyName("endTime")]
    public DateTime EndTime { get; set; }

    [JsonPropertyName("durationSeconds")]
    public int DurationSeconds { get; set; }

    [JsonPropertyName("landingPage")]
    public string? LandingPage { get; set; }

    [JsonPropertyName("exitPage")]
    public string? ExitPage { get; set; }

    [JsonPropertyName("utmSource")]
    public string? UtmSource { get; set; }

    [JsonPropertyName("utmCampaign")]
    public string? UtmCampaign { get; set; }

    [JsonPropertyName("totalPageViews")]
    public int TotalPageViews { get; set; }

    [JsonPropertyName("productsViewed")]
    public int ProductsViewed { get; set; }

    [JsonPropertyName("swatchesExplored")]
    public int SwatchesExplored { get; set; }

    [JsonPropertyName("bagAdditions")]
    public int BagAdditions { get; set; }

    [JsonPropertyName("reachedCheckout")]
    public bool ReachedCheckout { get; set; }

    [JsonPropertyName("converted")]
    public bool Converted { get; set; }

    [JsonPropertyName("orderId")]
    public string? OrderId { get; set; }

    [JsonPropertyName("sessionJourney")]
    public List<Dictionary<string, object>>? SessionJourney { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

public class DeviceTasteProfileDto
{
    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("primaryUserId")]
    public string? PrimaryUserId { get; set; }

    [JsonPropertyName("isIdentified")]
    public bool IsIdentified { get; set; }

    [JsonPropertyName("householdClusterId")]
    public string? HouseholdClusterId { get; set; }

    [JsonPropertyName("totalSessions")]
    public int TotalSessions { get; set; }

    [JsonPropertyName("tasteProfile")]
    public Dictionary<string, object> TasteProfile { get; set; } = new();

    [JsonPropertyName("lastSeenAt")]
    public DateTime LastSeenAt { get; set; }
}

public class RollupResultDto
{
    [JsonPropertyName("sessionsProcessed")]
    public int SessionsProcessed { get; set; }

    [JsonPropertyName("profilesUpdated")]
    public int ProfilesUpdated { get; set; }

    [JsonPropertyName("signalsPurged")]
    public int SignalsPurged { get; set; }

    [JsonPropertyName("cutoffUtc")]
    public DateTime CutoffUtc { get; set; }
}

public class HourlyDistributionItemDto
{
    [JsonPropertyName("hourIst")]
    public int HourIst { get; set; }

    [JsonPropertyName("hourLabel")]
    public string HourLabel { get; set; } = string.Empty;

    [JsonPropertyName("activeDevices")]
    public int ActiveDevices { get; set; }

    [JsonPropertyName("activeUsers")]
    public int ActiveUsers { get; set; }

    [JsonPropertyName("totalEvents")]
    public int TotalEvents { get; set; }

    [JsonPropertyName("percentageOfDailyTraffic")]
    public double PercentageOfDailyTraffic { get; set; }
}

public class HourlyActivitySummaryDto
{
    [JsonPropertyName("distribution")]
    public List<HourlyDistributionItemDto> Distribution { get; set; } = new();

    [JsonPropertyName("peakHourIst")]
    public int PeakHourIst { get; set; }

    [JsonPropertyName("peakHourLabel")]
    public string PeakHourLabel { get; set; } = string.Empty;

    [JsonPropertyName("totalEventsLast30Days")]
    public int TotalEventsLast30Days { get; set; }

    [JsonPropertyName("uniqueDevicesLast30Days")]
    public int UniqueDevicesLast30Days { get; set; }

    [JsonPropertyName("historicalHoursRetained")]
    public int HistoricalHoursRetained { get; set; }
}

public class TelemetrySignalRecordDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("deviceId")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("sessionId")]
    public string? SessionId { get; set; }

    [JsonPropertyName("userId")]
    public string? UserId { get; set; }

    [JsonPropertyName("signalType")]
    public string SignalType { get; set; } = string.Empty;

    [JsonPropertyName("properties")]
    public Dictionary<string, object>? Properties { get; set; }

    [JsonPropertyName("clientTimestamp")]
    public DateTime? ClientTimestamp { get; set; }

    [JsonPropertyName("serverTimestamp")]
    public DateTime ServerTimestamp { get; set; }

    [JsonPropertyName("ip")]
    public string? Ip { get; set; }
}

public class DailyAcquisitionItemDto
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("dateLabel")]
    public string DateLabel { get; set; } = string.Empty;

    [JsonPropertyName("dayOfWeek")]
    public string DayOfWeek { get; set; } = string.Empty;

    [JsonPropertyName("newDevices")]
    public int NewDevices { get; set; }

    [JsonPropertyName("newUsers")]
    public int NewUsers { get; set; }

    [JsonPropertyName("cumulativeDevices")]
    public int CumulativeDevices { get; set; }

    [JsonPropertyName("cumulativeUsers")]
    public int CumulativeUsers { get; set; }
}

public class DailyGrowthSummaryDto
{
    [JsonPropertyName("dailyRecords")]
    public List<DailyAcquisitionItemDto> DailyRecords { get; set; } = new();

    [JsonPropertyName("totalNewDevices")]
    public int TotalNewDevices { get; set; }

    [JsonPropertyName("totalNewUsers")]
    public int TotalNewUsers { get; set; }

    [JsonPropertyName("daysAnalyzed")]
    public int DaysAnalyzed { get; set; }

    [JsonPropertyName("rangeAnalyzed")]
    public int RangeAnalyzed { get; set; }

    [JsonPropertyName("granularity")]
    public string Granularity { get; set; } = "day";

    [JsonPropertyName("peakNewDevicesDate")]
    public string? PeakNewDevicesDate { get; set; }

    [JsonPropertyName("peakNewUsersDate")]
    public string? PeakNewUsersDate { get; set; }
}


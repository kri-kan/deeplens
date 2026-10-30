using Store.Api.Models;

namespace Store.Api.Services;

public interface ITelemetryService
{
    Task<int> RecordSignalsAsync(BatchTelemetrySignalsRequest request, string? clientIp, CancellationToken ct = default);
    Task<DeviceFleetStatsDto> GetFleetStatsAsync(CancellationToken ct = default);
    Task<IEnumerable<StoreDeviceDto>> GetDevicesAsync(string? platform, int limit = 50, int offset = 0, CancellationToken ct = default);
    Task<IdentityLinkDto> StitchDeviceToUserAsync(StitchIdentityRequest request, CancellationToken ct = default);
    Task<RollupResultDto> RollupTelemetrySignalsAsync(int retentionDays = 30, CancellationToken ct = default);
    Task<IEnumerable<SessionSummaryDto>> GetSessionSummariesAsync(string? deviceId, string? userId, int limit = 50, CancellationToken ct = default);
    Task<DeviceTasteProfileDto?> GetDeviceTasteProfileAsync(string deviceId, CancellationToken ct = default);
    Task<HourlyActivitySummaryDto> GetHourlyActivitySummaryAsync(int days = 30, CancellationToken ct = default);
    Task<DailyGrowthSummaryDto> GetDailyAcquisitionsSummaryAsync(int range = 10, string granularity = "day", CancellationToken ct = default);
    Task<IEnumerable<TelemetrySignalRecordDto>> GetDeviceSignalsAsync(string deviceId, int limit = 100, int days = 30, CancellationToken ct = default);
}

using System.Diagnostics;
using System.Text.Json;
using Dapper;
using Npgsql;
using Store.Api.Models;

namespace Store.Api.Services;

public class TelemetryService : ITelemetryService
{
    private static readonly ActivitySource Source = new("DeepLens.Store.Telemetry");
    private readonly string _connectionString;
    private readonly IStoreEventPublisher _eventPublisher;
    private readonly ILogger<TelemetryService> _logger;

    public TelemetryService(IConfiguration config, IStoreEventPublisher eventPublisher, ILogger<TelemetryService> logger)
    {
        _eventPublisher = eventPublisher;
        _logger = logger;
        _connectionString = config.GetConnectionString("StoreDb")
            ?? config["ConnectionStrings:StoreDb"]
            ?? config["ConnectionStrings__StoreDb"]
            ?? "Host=192.168.0.170;Port=5432;Database=deeplens_store;Username=postgres;Password=Krikank1$";
    }

    public async Task<int> RecordSignalsAsync(BatchTelemetrySignalsRequest request, string? clientIp, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("TelemetryService.RecordSignals");
        activity?.SetTag("signals.count", request.Signals.Count);

        if (string.IsNullOrWhiteSpace(clientIp) || clientIp == "::1" || clientIp == "127.0.0.1")
        {
            clientIp = null;
        }

        var effectiveDeviceId = request.Device?.DeviceId 
            ?? request.Signals.FirstOrDefault()?.DeviceId 
            ?? string.Empty;

        if (string.IsNullOrWhiteSpace(effectiveDeviceId))
        {
            _logger.LogWarning("RecordSignals received empty deviceId; skipping batch.");
            return 0;
        }

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            // 1. Ensure Device is registered/upserted
            const string upsertDeviceSql = @"
                INSERT INTO store_devices (
                    device_id, fingerprint_hash, platform, os, model, browser, screen_resolution,
                    first_seen_at, last_seen_at, last_ip, last_user_id, total_events, metadata
                ) VALUES (
                    @DeviceId, @FingerprintHash, @Platform, @Os, @Model, @Browser, @ScreenResolution,
                    NOW(), NOW(), @LastIp::inet, @LastUserId, @EventCount, @Metadata::jsonb
                )
                ON CONFLICT (device_id) DO UPDATE SET
                    fingerprint_hash = COALESCE(EXCLUDED.fingerprint_hash, store_devices.fingerprint_hash),
                    platform = CASE WHEN EXCLUDED.platform <> 'web' THEN EXCLUDED.platform ELSE store_devices.platform END,
                    os = COALESCE(EXCLUDED.os, store_devices.os),
                    model = COALESCE(EXCLUDED.model, store_devices.model),
                    browser = COALESCE(EXCLUDED.browser, store_devices.browser),
                    screen_resolution = COALESCE(EXCLUDED.screen_resolution, store_devices.screen_resolution),
                    last_seen_at = NOW(),
                    last_ip = COALESCE(EXCLUDED.last_ip, store_devices.last_ip),
                    last_user_id = COALESCE(EXCLUDED.last_user_id, store_devices.last_user_id),
                    total_events = store_devices.total_events + EXCLUDED.total_events,
                    metadata = COALESCE(EXCLUDED.metadata, store_devices.metadata);";

            var metadataJson = request.Device?.Metadata != null 
                ? JsonSerializer.Serialize(request.Device.Metadata) 
                : null;

            await conn.ExecuteAsync(upsertDeviceSql, new
            {
                DeviceId = effectiveDeviceId,
                FingerprintHash = request.Device?.FingerprintHash,
                Platform = !string.IsNullOrWhiteSpace(request.Device?.Platform) ? request.Device.Platform : "web",
                Os = request.Device?.Os,
                Model = request.Device?.Model,
                Browser = request.Device?.Browser,
                ScreenResolution = request.Device?.ScreenResolution,
                LastIp = clientIp,
                LastUserId = request.Device?.UserId,
                EventCount = Math.Max(1, request.Signals.Count),
                Metadata = metadataJson
            }, tx);

            // 2. Batch insert signals via single multi-row SQL command (1 network round-trip)
            if (request.Signals.Count > 0)
            {
                var sb = new System.Text.StringBuilder(
                    "INSERT INTO store_telemetry_signals (id, device_id, session_id, user_id, signal_type, properties, client_timestamp, server_timestamp, ip) VALUES ");
                var dp = new DynamicParameters();
                dp.Add("ClientIp", clientIp);

                for (int i = 0; i < request.Signals.Count; i++)
                {
                    if (i > 0) sb.Append(", ");
                    sb.Append($"(gen_random_uuid(), @DeviceId{i}, @SessionId{i}, @UserId{i}, @SignalType{i}, @Properties{i}::jsonb, @ClientTimestamp{i}, NOW(), @ClientIp::inet)");

                    var sig = request.Signals[i];
                    dp.Add($"DeviceId{i}", !string.IsNullOrWhiteSpace(sig.DeviceId) ? sig.DeviceId : effectiveDeviceId);
                    dp.Add($"SessionId{i}", sig.SessionId);
                    dp.Add($"UserId{i}", sig.UserId ?? request.Device?.UserId);
                    dp.Add($"SignalType{i}", sig.SignalType);
                    dp.Add($"Properties{i}", sig.Properties != null ? JsonSerializer.Serialize(sig.Properties) : null);
                    dp.Add($"ClientTimestamp{i}", sig.ClientTimestamp ?? DateTime.UtcNow);
                }

                await conn.ExecuteAsync(sb.ToString(), dp, tx);
            }

            await tx.CommitAsync(ct);

            // 3. Publish to Kafka asynchronously (non-blocking for fast response)
            _ = Task.Run(async () =>
            {
                try
                {
                    await _eventPublisher.PublishAsync("store.telemetry.signals", effectiveDeviceId, new
                    {
                        deviceId = effectiveDeviceId,
                        ip = clientIp,
                        count = request.Signals.Count,
                        signals = request.Signals,
                        recordedAt = DateTime.UtcNow
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to publish signals to Kafka for device {DeviceId}", effectiveDeviceId);
                }
            });

            return request.Signals.Count;
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            _logger.LogError(ex, "Failed to record telemetry batch for device {DeviceId}", effectiveDeviceId);
            throw;
        }
    }

    public async Task<DeviceFleetStatsDto> GetFleetStatsAsync(CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("TelemetryService.GetFleetStats");

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        const string totalSql = "SELECT COUNT(*) FROM store_devices;";
        const string activeTodaySql = "SELECT COUNT(*) FROM store_devices WHERE last_seen_at >= NOW() - INTERVAL '24 hours';";
        const string active7DaysSql = "SELECT COUNT(*) FROM store_devices WHERE last_seen_at >= NOW() - INTERVAL '7 days';";
        const string platformSql = "SELECT platform, COUNT(*)::int AS cnt FROM store_devices GROUP BY platform;";
        const string topSignalsSql = @"
            SELECT signal_type, COUNT(*)::int AS cnt 
            FROM store_telemetry_signals 
            GROUP BY signal_type 
            ORDER BY cnt DESC 
            LIMIT 10;";
        const string recentDevicesSql = @"
            SELECT device_id, fingerprint_hash, platform, os, model, browser, screen_resolution,
                   first_seen_at, last_seen_at, last_ip::text as last_ip, last_user_id, total_events
            FROM store_devices
            ORDER BY last_seen_at DESC
            LIMIT 10;";

        var total = await conn.ExecuteScalarAsync<int>(totalSql);
        var activeToday = await conn.ExecuteScalarAsync<int>(activeTodaySql);
        var active7Days = await conn.ExecuteScalarAsync<int>(active7DaysSql);

        var platformRows = await conn.QueryAsync<(string platform, int cnt)>(platformSql);
        var platformBreakdown = platformRows.ToDictionary(r => r.platform ?? "unknown", r => r.cnt);

        var signalRows = await conn.QueryAsync<(string signal_type, int cnt)>(topSignalsSql);
        var topSignals = signalRows.ToDictionary(r => r.signal_type, r => r.cnt);

        var recentRows = await conn.QueryAsync<StoreDeviceDbRow>(recentDevicesSql);
        var recentDevices = recentRows.Select(r => new StoreDeviceDto
        {
            DeviceId = r.device_id,
            FingerprintHash = r.fingerprint_hash,
            Platform = r.platform,
            Os = r.os,
            Model = r.model,
            Browser = r.browser,
            ScreenResolution = r.screen_resolution,
            FirstSeenAt = r.first_seen_at,
            LastSeenAt = r.last_seen_at,
            LastIp = r.last_ip,
            LastUserId = r.last_user_id,
            TotalEvents = r.total_events
        }).ToList();

        return new DeviceFleetStatsDto
        {
            TotalDevices = total,
            ActiveToday = activeToday,
            ActiveLast7Days = active7Days,
            PlatformBreakdown = platformBreakdown,
            TopSignalTypes = topSignals,
            RecentDevices = recentDevices
        };
    }

    public async Task<IEnumerable<StoreDeviceDto>> GetDevicesAsync(string? platform, int limit = 50, int offset = 0, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("TelemetryService.GetDevices");

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        string sql = @"
            SELECT device_id, fingerprint_hash, platform, os, model, browser, screen_resolution,
                   first_seen_at, last_seen_at, last_ip::text as last_ip, last_user_id, total_events
            FROM store_devices";

        if (!string.IsNullOrWhiteSpace(platform))
        {
            sql += " WHERE platform = @Platform";
        }

        sql += " ORDER BY last_seen_at DESC LIMIT @Limit OFFSET @Offset;";

        var rows = await conn.QueryAsync<StoreDeviceDbRow>(sql, new { Platform = platform, Limit = limit, Offset = offset });
        return rows.Select(r => new StoreDeviceDto
        {
            DeviceId = r.device_id,
            FingerprintHash = r.fingerprint_hash,
            Platform = r.platform,
            Os = r.os,
            Model = r.model,
            Browser = r.browser,
            ScreenResolution = r.screen_resolution,
            FirstSeenAt = r.first_seen_at,
            LastSeenAt = r.last_seen_at,
            LastIp = r.last_ip,
            LastUserId = r.last_user_id,
            TotalEvents = r.total_events
        });
    }

    public async Task<IdentityLinkDto> StitchDeviceToUserAsync(StitchIdentityRequest request, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("TelemetryService.StitchDeviceToUser");
        activity?.SetTag("identity.device_id", request.DeviceId);
        activity?.SetTag("identity.user_id", request.UserId);

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            // 0. Ensure device exists in store_devices
            const string ensureDeviceSql = @"
                INSERT INTO store_devices (device_id, fingerprint_hash, platform, os, model, browser, screen_resolution, first_seen_at, last_seen_at, total_events)
                VALUES (@DeviceId, 'fp_' || SUBSTRING(@DeviceId, 1, 16), 'unknown', 'unknown', 'unknown', 'unknown', 'unknown', NOW(), NOW(), 0)
                ON CONFLICT (device_id) DO NOTHING;";
            await conn.ExecuteAsync(ensureDeviceSql, new { DeviceId = request.DeviceId }, tx);

            // 1. Upsert identity link
            const string upsertLinkSql = @"
                INSERT INTO store_identity_links (
                    device_id, user_id, confidence_score, link_source, is_active, created_at, updated_at
                ) VALUES (
                    @DeviceId, @UserId, @ConfidenceScore, @LinkSource, TRUE, NOW(), NOW()
                )
                ON CONFLICT (device_id, user_id) DO UPDATE SET
                    confidence_score = GREATEST(store_identity_links.confidence_score, EXCLUDED.confidence_score),
                    link_source = EXCLUDED.link_source,
                    is_active = TRUE,
                    updated_at = NOW()
                RETURNING id, device_id, user_id, confidence_score, link_source, is_active, created_at;";

            var linkRow = await conn.QuerySingleAsync<IdentityLinkDbRow>(upsertLinkSql, new
            {
                DeviceId = request.DeviceId,
                UserId = request.UserId,
                ConfidenceScore = (decimal)request.ConfidenceScore,
                LinkSource = request.LinkSource
            }, tx);

            // 2. Mark device as identified and assign primary_user_id
            const string updateDeviceSql = @"
                UPDATE store_devices
                SET primary_user_id = @UserId,
                    is_identified = TRUE,
                    last_user_id = @UserId,
                    last_seen_at = NOW()
                WHERE device_id = @DeviceId;";

            await conn.ExecuteAsync(updateDeviceSql, new { DeviceId = request.DeviceId, UserId = request.UserId }, tx);

            // 3. Retroactively tag prior anonymous signals & session summaries with user_id
            const string backfillSignalsSql = @"
                UPDATE store_telemetry_signals
                SET user_id = @UserId
                WHERE device_id = @DeviceId AND user_id IS NULL;";

            const string backfillSessionsSql = @"
                UPDATE store_session_summaries
                SET user_id = @UserId
                WHERE device_id = @DeviceId AND user_id IS NULL;";

            await conn.ExecuteAsync(backfillSignalsSql, new { DeviceId = request.DeviceId, UserId = request.UserId }, tx);
            await conn.ExecuteAsync(backfillSessionsSql, new { DeviceId = request.DeviceId, UserId = request.UserId }, tx);

            await tx.CommitAsync(ct);

            // 4. Publish stitch event to Kafka
            _ = Task.Run(async () =>
            {
                try
                {
                    await _eventPublisher.PublishAsync("store.telemetry.identity_stitched", request.UserId, new
                    {
                        deviceId = request.DeviceId,
                        userId = request.UserId,
                        confidence = request.ConfidenceScore,
                        source = request.LinkSource,
                        timestamp = DateTime.UtcNow
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to publish identity stitched event for device {DeviceId}", request.DeviceId);
                }
            });

            return new IdentityLinkDto
            {
                Id = linkRow.id,
                DeviceId = linkRow.device_id,
                UserId = linkRow.user_id,
                ConfidenceScore = (double)linkRow.confidence_score,
                LinkSource = linkRow.link_source,
                IsActive = linkRow.is_active,
                CreatedAt = linkRow.created_at
            };
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            _logger.LogError(ex, "Failed to stitch device {DeviceId} to user {UserId}", request.DeviceId, request.UserId);
            throw;
        }
    }

    public async Task<RollupResultDto> RollupTelemetrySignalsAsync(int retentionDays = 30, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("TelemetryService.RollupTelemetrySignals");
        _logger.LogInformation("Starting telemetry signal rollup with {Days}-day retention cutoff...", retentionDays);

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        var cutoffUtc = DateTime.UtcNow.AddDays(-retentionDays);

        // 1. Aggregate signals into session summaries
        const string aggregateSessionsSql = @"
            WITH session_aggregates AS (
                SELECT 
                    COALESCE(session_id, 'ses_def_' || device_id) AS s_id,
                    device_id AS d_id,
                    MAX(user_id) AS u_id,
                    MIN(server_timestamp) AS s_start,
                    MAX(server_timestamp) AS s_end,
                    EXTRACT(EPOCH FROM (MAX(server_timestamp) - MIN(server_timestamp)))::int AS s_duration,
                    COUNT(*) FILTER (WHERE signal_type = 'page_view' OR signal_type = 'session_start')::int AS pv_count,
                    COUNT(*) FILTER (WHERE signal_type = 'product_viewed')::int AS pdp_count,
                    COUNT(*) FILTER (WHERE signal_type = 'swatch_selected')::int AS swatch_count,
                    COUNT(*) FILTER (WHERE signal_type = 'add_to_bag')::int AS bag_count,
                    BOOL_OR(signal_type = 'checkout_initiated' OR signal_type = 'checkout_auth_gated') AS reached_chk,
                    BOOL_OR(signal_type = 'order_placed') AS has_converted
                FROM store_telemetry_signals
                WHERE session_id IS NOT NULL AND session_id <> ''
                GROUP BY s_id, d_id
            )
            INSERT INTO store_session_summaries (
                session_id, device_id, user_id, start_time, end_time, duration_seconds,
                total_page_views, products_viewed, swatches_explored, bag_additions,
                reached_checkout, converted, created_at
            )
            SELECT 
                s_id, d_id, u_id, s_start, s_end, s_duration,
                GREATEST(1, pv_count), pdp_count, swatch_count, bag_count,
                reached_chk, has_converted, NOW()
            FROM session_aggregates
            ON CONFLICT (session_id) DO UPDATE SET
                end_time = EXCLUDED.end_time,
                duration_seconds = EXCLUDED.duration_seconds,
                user_id = COALESCE(EXCLUDED.user_id, store_session_summaries.user_id),
                total_page_views = GREATEST(store_session_summaries.total_page_views, EXCLUDED.total_page_views),
                products_viewed = GREATEST(store_session_summaries.products_viewed, EXCLUDED.products_viewed),
                swatches_explored = GREATEST(store_session_summaries.swatches_explored, EXCLUDED.swatches_explored),
                bag_additions = GREATEST(store_session_summaries.bag_additions, EXCLUDED.bag_additions),
                reached_checkout = store_session_summaries.reached_checkout OR EXCLUDED.reached_checkout,
                converted = store_session_summaries.converted OR EXCLUDED.converted;";

        var sessionsProcessed = await conn.ExecuteAsync(aggregateSessionsSql);

        // 2. Update device session counts
        const string updateDeviceSessionCountsSql = @"
            WITH counts AS (
                SELECT device_id, COUNT(DISTINCT session_id) AS sess_cnt
                FROM store_session_summaries
                GROUP BY device_id
            )
            UPDATE store_devices d
            SET total_sessions = c.sess_cnt
            FROM counts c
            WHERE d.device_id = c.device_id;";

        await conn.ExecuteAsync(updateDeviceSessionCountsSql);

        // 3. Compute taste affinity profiles per device
        const string updateTasteSql = @"
            WITH signal_counts AS (
                SELECT 
                    device_id,
                    jsonb_build_object(
                        'topSignalTypes', (
                            SELECT jsonb_object_agg(st, cnt) 
                            FROM (
                                SELECT signal_type as st, COUNT(*)::int as cnt 
                                FROM store_telemetry_signals s2 
                                WHERE s2.device_id = s.device_id 
                                GROUP BY signal_type 
                                ORDER BY cnt DESC 
                                LIMIT 5
                            ) t
                        ),
                        'lastSummarizedAt', NOW()
                    ) AS taste_vec
                FROM store_telemetry_signals s
                GROUP BY device_id
            )
            UPDATE store_devices d
            SET taste_profile = sc.taste_vec
            FROM signal_counts sc
            WHERE d.device_id = sc.device_id;";

        var profilesUpdated = await conn.ExecuteAsync(updateTasteSql);

        // 4. Compact raw signals older than cutoff into persistent hourly metrics before purging
        const string archiveHourlyMetricsSql = @"
            INSERT INTO store_telemetry_hourly_metrics (
                bucket_hour, hour_of_day_ist, day_of_week_ist, active_devices, active_users, total_events, total_sessions, updated_at
            )
            SELECT 
                date_trunc('hour', server_timestamp) AS b_hour,
                EXTRACT(HOUR FROM (server_timestamp AT TIME ZONE 'Asia/Kolkata'))::int AS h_ist,
                EXTRACT(DOW FROM (server_timestamp AT TIME ZONE 'Asia/Kolkata'))::int AS dow_ist,
                COUNT(DISTINCT device_id)::int AS act_dev,
                COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int AS act_usr,
                COUNT(*)::int AS evt_cnt,
                COUNT(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL AND session_id <> '')::int AS sess_cnt,
                NOW()
            FROM store_telemetry_signals
            WHERE server_timestamp < @CutoffUtc
            GROUP BY b_hour, h_ist, dow_ist
            ON CONFLICT (bucket_hour) DO UPDATE SET
                active_devices = EXCLUDED.active_devices,
                active_users = EXCLUDED.active_users,
                total_events = EXCLUDED.total_events,
                total_sessions = EXCLUDED.total_sessions,
                updated_at = NOW();";

        await conn.ExecuteAsync(archiveHourlyMetricsSql, new { CutoffUtc = cutoffUtc });

        // 5. Purge raw signals older than cutoff (underlying detailed records kept for last 30 days)
        const string purgeSql = "DELETE FROM store_telemetry_signals WHERE server_timestamp < @CutoffUtc;";
        var signalsPurged = await conn.ExecuteAsync(purgeSql, new { CutoffUtc = cutoffUtc });

        _logger.LogInformation("Telemetry rollup completed: {Sessions} sessions updated, {Profiles} profiles refreshed, {Purged} expired signals purged.",
            sessionsProcessed, profilesUpdated, signalsPurged);

        return new RollupResultDto
        {
            SessionsProcessed = sessionsProcessed,
            ProfilesUpdated = profilesUpdated,
            SignalsPurged = signalsPurged,
            CutoffUtc = cutoffUtc
        };
    }

    public async Task<HourlyActivitySummaryDto> GetHourlyActivitySummaryAsync(int days = 30, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("TelemetryService.GetHourlyActivitySummary");

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        const string querySql = @"
            WITH recent_signals AS (
                SELECT 
                    EXTRACT(HOUR FROM (server_timestamp AT TIME ZONE 'Asia/Kolkata'))::int AS hour_ist,
                    device_id,
                    user_id
                FROM store_telemetry_signals
                WHERE server_timestamp >= NOW() - make_interval(days => @Days)
            ),
            recent_agg AS (
                SELECT 
                    hour_ist,
                    COUNT(DISTINCT device_id)::int AS active_devices,
                    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int AS active_users,
                    COUNT(*)::int AS total_events
                FROM recent_signals
                GROUP BY hour_ist
            ),
            archived_agg AS (
                SELECT 
                    hour_of_day_ist AS hour_ist,
                    SUM(active_devices)::int AS active_devices,
                    SUM(active_users)::int AS active_users,
                    SUM(total_events)::int AS total_events
                FROM store_telemetry_hourly_metrics
                WHERE bucket_hour >= NOW() - make_interval(days => @Days)
                  AND bucket_hour < NOW() - INTERVAL '30 days'
                GROUP BY hour_of_day_ist
            ),
            combined AS (
                SELECT 
                    COALESCE(r.hour_ist, a.hour_ist) AS hour_ist,
                    COALESCE(r.active_devices, 0) + COALESCE(a.active_devices, 0) AS active_devices,
                    COALESCE(r.active_users, 0) + COALESCE(a.active_users, 0) AS active_users,
                    COALESCE(r.total_events, 0) + COALESCE(a.total_events, 0) AS total_events
                FROM recent_agg r
                FULL OUTER JOIN archived_agg a ON r.hour_ist = a.hour_ist
            )
            SELECT hour_ist, active_devices, active_users, total_events
            FROM combined
            ORDER BY hour_ist ASC;";

        var rows = (await conn.QueryAsync<(int hour_ist, int active_devices, int active_users, int total_events)>(
            querySql, new { Days = Math.Max(1, days) })).ToDictionary(r => r.hour_ist);

        var totalEventsOverall = rows.Values.Sum(r => r.total_events);
        var distribution = new List<HourlyDistributionItemDto>();
        int peakHour = 0;
        int peakEvents = -1;

        for (int h = 0; h < 24; h++)
        {
            rows.TryGetValue(h, out var entry);
            var devCount = entry.active_devices;
            var usrCount = entry.active_users;
            var evtCount = entry.total_events;

            if (evtCount > peakEvents)
            {
                peakEvents = evtCount;
                peakHour = h;
            }

            string period = h == 0 ? "12 AM" : h < 12 ? $"{h} AM" : h == 12 ? "12 PM" : $"{h - 12} PM";
            string label = $"{h:D2}:00 ({period})";

            double pct = totalEventsOverall > 0 
                ? Math.Round(((double)evtCount / totalEventsOverall) * 100, 1) 
                : 0.0;

            distribution.Add(new HourlyDistributionItemDto
            {
                HourIst = h,
                HourLabel = label,
                ActiveDevices = devCount,
                ActiveUsers = usrCount,
                TotalEvents = evtCount,
                PercentageOfDailyTraffic = pct
            });
        }

        string peakPeriod = peakHour == 0 ? "12 AM" : peakHour < 12 ? $"{peakHour} AM" : peakHour == 12 ? "12 PM" : $"{peakHour - 12} PM";

        const string countStatsSql = @"
            SELECT 
                (SELECT COUNT(*)::int FROM store_telemetry_signals WHERE server_timestamp >= NOW() - INTERVAL '30 days') AS evt_cnt,
                (SELECT COUNT(DISTINCT device_id)::int FROM store_telemetry_signals WHERE server_timestamp >= NOW() - INTERVAL '30 days') AS dev_cnt,
                (SELECT COUNT(*)::int FROM store_telemetry_hourly_metrics) AS arch_cnt;";

        var statsRow = await conn.QuerySingleAsync<(int evt_cnt, int dev_cnt, int arch_cnt)>(countStatsSql);

        return new HourlyActivitySummaryDto
        {
            Distribution = distribution,
            PeakHourIst = peakHour,
            PeakHourLabel = $"{peakHour:D2}:00 IST ({peakPeriod})",
            TotalEventsLast30Days = statsRow.evt_cnt,
            UniqueDevicesLast30Days = statsRow.dev_cnt,
            HistoricalHoursRetained = statsRow.arch_cnt
        };
    }

    public async Task<DailyGrowthSummaryDto> GetDailyAcquisitionsSummaryAsync(int range = 10, string granularity = "day", CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("TelemetryService.GetDailyAcquisitionsSummary");
        activity?.SetTag("telemetry.range", range);
        activity?.SetTag("telemetry.granularity", granularity);

        string normalizedGranularity = granularity?.ToLowerInvariant() switch
        {
            "week" => "week",
            "month" => "month",
            _ => "day"
        };

        int sanitizedRange = normalizedGranularity switch
        {
            "week" => Math.Clamp(range, 1, 104),
            "month" => Math.Clamp(range, 1, 60),
            _ => Math.Clamp(range, 1, 365)
        };

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        string querySql = normalizedGranularity switch
        {
            "week" => @"
                WITH current_bucket AS (
                    SELECT DATE_TRUNC('week', (NOW() AT TIME ZONE 'Asia/Kolkata'))::date AS cur_date
                ),
                bucket_series AS (
                    SELECT generate_series(
                        ((SELECT cur_date FROM current_bucket) - make_interval(weeks => @Range - 1))::timestamp,
                        (SELECT cur_date FROM current_bucket)::timestamp,
                        INTERVAL '1 week'
                    )::date AS bucket_date
                ),
                min_bucket AS (
                    SELECT MIN(bucket_date) AS start_date FROM bucket_series
                ),
                prior_devices AS (
                    SELECT COUNT(*)::int AS cnt
                    FROM store_devices
                    WHERE DATE_TRUNC('week', first_seen_at AT TIME ZONE 'Asia/Kolkata')::date < (SELECT start_date FROM min_bucket)
                ),
                bucket_devices AS (
                    SELECT 
                        DATE_TRUNC('week', first_seen_at AT TIME ZONE 'Asia/Kolkata')::date AS bucket_date,
                        COUNT(*)::int AS new_devices
                    FROM store_devices
                    GROUP BY bucket_date
                ),
                user_first_seen AS (
                    SELECT user_id, MIN(first_seen_at) AS first_seen_at
                    FROM (
                        SELECT id AS user_id, created_at AS first_seen_at FROM store_customers
                        UNION ALL
                        SELECT user_id, created_at AS first_seen_at FROM store_identity_links
                        UNION ALL
                        SELECT user_id, server_timestamp AS first_seen_at FROM store_telemetry_signals WHERE user_id IS NOT NULL AND user_id <> ''
                    ) u
                    GROUP BY user_id
                ),
                prior_users AS (
                    SELECT COUNT(*)::int AS cnt
                    FROM user_first_seen
                    WHERE DATE_TRUNC('week', first_seen_at AT TIME ZONE 'Asia/Kolkata')::date < (SELECT start_date FROM min_bucket)
                ),
                bucket_users AS (
                    SELECT 
                        DATE_TRUNC('week', first_seen_at AT TIME ZONE 'Asia/Kolkata')::date AS bucket_date,
                        COUNT(*)::int AS new_users
                    FROM user_first_seen
                    GROUP BY bucket_date
                )
                SELECT 
                    s.bucket_date::text AS date_str,
                    'Wk of ' || TO_CHAR(s.bucket_date, 'Mon DD') AS date_label,
                    'W' || TO_CHAR(s.bucket_date, 'IW') AS day_of_week,
                    COALESCE(d.new_devices, 0)::int AS new_devices,
                    COALESCE(u.new_users, 0)::int AS new_users,
                    ((SELECT cnt FROM prior_devices) + SUM(COALESCE(d.new_devices, 0)) OVER (ORDER BY s.bucket_date ASC))::int AS cumulative_devices,
                    ((SELECT cnt FROM prior_users) + SUM(COALESCE(u.new_users, 0)) OVER (ORDER BY s.bucket_date ASC))::int AS cumulative_users
                FROM bucket_series s
                LEFT JOIN bucket_devices d ON s.bucket_date = d.bucket_date
                LEFT JOIN bucket_users u ON s.bucket_date = u.bucket_date
                ORDER BY s.bucket_date ASC;",

            "month" => @"
                WITH current_bucket AS (
                    SELECT DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Kolkata'))::date AS cur_date
                ),
                bucket_series AS (
                    SELECT generate_series(
                        ((SELECT cur_date FROM current_bucket) - make_interval(months => @Range - 1))::timestamp,
                        (SELECT cur_date FROM current_bucket)::timestamp,
                        INTERVAL '1 month'
                    )::date AS bucket_date
                ),
                min_bucket AS (
                    SELECT MIN(bucket_date) AS start_date FROM bucket_series
                ),
                prior_devices AS (
                    SELECT COUNT(*)::int AS cnt
                    FROM store_devices
                    WHERE DATE_TRUNC('month', first_seen_at AT TIME ZONE 'Asia/Kolkata')::date < (SELECT start_date FROM min_bucket)
                ),
                bucket_devices AS (
                    SELECT 
                        DATE_TRUNC('month', first_seen_at AT TIME ZONE 'Asia/Kolkata')::date AS bucket_date,
                        COUNT(*)::int AS new_devices
                    FROM store_devices
                    GROUP BY bucket_date
                ),
                user_first_seen AS (
                    SELECT user_id, MIN(first_seen_at) AS first_seen_at
                    FROM (
                        SELECT id AS user_id, created_at AS first_seen_at FROM store_customers
                        UNION ALL
                        SELECT user_id, created_at AS first_seen_at FROM store_identity_links
                        UNION ALL
                        SELECT user_id, server_timestamp AS first_seen_at FROM store_telemetry_signals WHERE user_id IS NOT NULL AND user_id <> ''
                    ) u
                    GROUP BY user_id
                ),
                prior_users AS (
                    SELECT COUNT(*)::int AS cnt
                    FROM user_first_seen
                    WHERE DATE_TRUNC('month', first_seen_at AT TIME ZONE 'Asia/Kolkata')::date < (SELECT start_date FROM min_bucket)
                ),
                bucket_users AS (
                    SELECT 
                        DATE_TRUNC('month', first_seen_at AT TIME ZONE 'Asia/Kolkata')::date AS bucket_date,
                        COUNT(*)::int AS new_users
                    FROM user_first_seen
                    GROUP BY bucket_date
                )
                SELECT 
                    s.bucket_date::text AS date_str,
                    TO_CHAR(s.bucket_date, 'Mon YYYY') AS date_label,
                    TO_CHAR(s.bucket_date, 'YYYY') AS day_of_week,
                    COALESCE(d.new_devices, 0)::int AS new_devices,
                    COALESCE(u.new_users, 0)::int AS new_users,
                    ((SELECT cnt FROM prior_devices) + SUM(COALESCE(d.new_devices, 0)) OVER (ORDER BY s.bucket_date ASC))::int AS cumulative_devices,
                    ((SELECT cnt FROM prior_users) + SUM(COALESCE(u.new_users, 0)) OVER (ORDER BY s.bucket_date ASC))::int AS cumulative_users
                FROM bucket_series s
                LEFT JOIN bucket_devices d ON s.bucket_date = d.bucket_date
                LEFT JOIN bucket_users u ON s.bucket_date = u.bucket_date
                ORDER BY s.bucket_date ASC;",

            _ => @"
                WITH today_ist AS (
                    SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::date AS today_date
                ),
                date_series AS (
                    SELECT generate_series(
                        ((SELECT today_date FROM today_ist) - make_interval(days => @Range - 1))::timestamp,
                        (SELECT today_date FROM today_ist)::timestamp,
                        INTERVAL '1 day'
                    )::date AS date_ist
                ),
                min_date AS (
                    SELECT MIN(date_ist) AS start_date FROM date_series
                ),
                prior_devices AS (
                    SELECT COUNT(*)::int AS cnt
                    FROM store_devices
                    WHERE DATE(first_seen_at AT TIME ZONE 'Asia/Kolkata') < (SELECT start_date FROM min_date)
                ),
                daily_devices AS (
                    SELECT 
                        DATE(first_seen_at AT TIME ZONE 'Asia/Kolkata') AS date_ist,
                        COUNT(*)::int AS new_devices
                    FROM store_devices
                    GROUP BY date_ist
                ),
                user_first_seen AS (
                    SELECT user_id, MIN(first_seen_at) AS first_seen_at
                    FROM (
                        SELECT id AS user_id, created_at AS first_seen_at FROM store_customers
                        UNION ALL
                        SELECT user_id, created_at AS first_seen_at FROM store_identity_links
                        UNION ALL
                        SELECT user_id, server_timestamp AS first_seen_at FROM store_telemetry_signals WHERE user_id IS NOT NULL AND user_id <> ''
                    ) u
                    GROUP BY user_id
                ),
                prior_users AS (
                    SELECT COUNT(*)::int AS cnt
                    FROM user_first_seen
                    WHERE DATE(first_seen_at AT TIME ZONE 'Asia/Kolkata') < (SELECT start_date FROM min_date)
                ),
                daily_users AS (
                    SELECT 
                        DATE(first_seen_at AT TIME ZONE 'Asia/Kolkata') AS date_ist,
                        COUNT(*)::int AS new_users
                    FROM user_first_seen
                    GROUP BY date_ist
                )
                SELECT 
                    s.date_ist::text AS date_str,
                    TO_CHAR(s.date_ist, 'Mon DD') AS date_label,
                    TO_CHAR(s.date_ist, 'Dy') AS day_of_week,
                    COALESCE(d.new_devices, 0)::int AS new_devices,
                    COALESCE(u.new_users, 0)::int AS new_users,
                    ((SELECT cnt FROM prior_devices) + SUM(COALESCE(d.new_devices, 0)) OVER (ORDER BY s.date_ist ASC))::int AS cumulative_devices,
                    ((SELECT cnt FROM prior_users) + SUM(COALESCE(u.new_users, 0)) OVER (ORDER BY s.date_ist ASC))::int AS cumulative_users
                FROM date_series s
                LEFT JOIN daily_devices d ON s.date_ist = d.date_ist
                LEFT JOIN daily_users u ON s.date_ist = u.date_ist
                ORDER BY s.date_ist ASC;"
        };

        var rows = (await conn.QueryAsync<(
            string date_str,
            string date_label,
            string day_of_week,
            int new_devices,
            int new_users,
            int cumulative_devices,
            int cumulative_users
        )>(querySql, new { Range = sanitizedRange })).ToList();

        var dailyRecords = rows.Select(r => new DailyAcquisitionItemDto
        {
            Date = r.date_str,
            DateLabel = r.date_label,
            DayOfWeek = r.day_of_week,
            NewDevices = r.new_devices,
            NewUsers = r.new_users,
            CumulativeDevices = r.cumulative_devices,
            CumulativeUsers = r.cumulative_users
        }).ToList();

        int totalNewDevices = dailyRecords.Sum(r => r.NewDevices);
        int totalNewUsers = dailyRecords.Sum(r => r.NewUsers);

        string? peakDevicesDate = dailyRecords
            .Where(r => r.NewDevices > 0)
            .OrderByDescending(r => r.NewDevices)
            .FirstOrDefault()?.DateLabel;

        string? peakUsersDate = dailyRecords
            .Where(r => r.NewUsers > 0)
            .OrderByDescending(r => r.NewUsers)
            .FirstOrDefault()?.DateLabel;

        return new DailyGrowthSummaryDto
        {
            DailyRecords = dailyRecords,
            TotalNewDevices = totalNewDevices,
            TotalNewUsers = totalNewUsers,
            DaysAnalyzed = sanitizedRange,
            RangeAnalyzed = sanitizedRange,
            Granularity = normalizedGranularity,
            PeakNewDevicesDate = peakDevicesDate,
            PeakNewUsersDate = peakUsersDate
        };
    }

    public async Task<IEnumerable<SessionSummaryDto>> GetSessionSummariesAsync(string? deviceId, string? userId, int limit = 50, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("TelemetryService.GetSessionSummaries");

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        string sql = @"
            SELECT session_id, device_id, user_id, start_time, end_time, duration_seconds,
                   landing_page, exit_page, utm_source, utm_campaign,
                   total_page_views, products_viewed, swatches_explored, bag_additions,
                   reached_checkout, converted, order_id, session_journey::text as session_journey_raw, created_at
            FROM store_session_summaries";

        var clauses = new List<string>();
        if (!string.IsNullOrWhiteSpace(deviceId)) clauses.Add("device_id = @DeviceId");
        if (!string.IsNullOrWhiteSpace(userId)) clauses.Add("user_id = @UserId");

        if (clauses.Count > 0)
        {
            sql += " WHERE " + string.Join(" AND ", clauses);
        }

        sql += " ORDER BY start_time DESC LIMIT @Limit;";

        var rows = await conn.QueryAsync<SessionSummaryDbRow>(sql, new { DeviceId = deviceId, UserId = userId, Limit = limit });

        return rows.Select(r => new SessionSummaryDto
        {
            SessionId = r.session_id,
            DeviceId = r.device_id,
            UserId = r.user_id,
            StartTime = r.start_time,
            EndTime = r.end_time,
            DurationSeconds = r.duration_seconds,
            LandingPage = r.landing_page,
            ExitPage = r.exit_page,
            UtmSource = r.utm_source,
            UtmCampaign = r.utm_campaign,
            TotalPageViews = r.total_page_views,
            ProductsViewed = r.products_viewed,
            SwatchesExplored = r.swatches_explored,
            BagAdditions = r.bag_additions,
            ReachedCheckout = r.reached_checkout,
            Converted = r.converted,
            OrderId = r.order_id,
            CreatedAt = r.created_at
        });
    }

    public async Task<DeviceTasteProfileDto?> GetDeviceTasteProfileAsync(string deviceId, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("TelemetryService.GetDeviceTasteProfile");

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        const string sql = @"
            SELECT device_id, primary_user_id, is_identified, household_cluster_id,
                   total_sessions, taste_profile::text as taste_profile_raw, last_seen_at
            FROM store_devices
            WHERE device_id = @DeviceId;";

        var row = await conn.QuerySingleOrDefaultAsync<DeviceTasteProfileDbRow>(sql, new { DeviceId = deviceId });
        if (row == null) return null;

        var profileDict = new Dictionary<string, object>();
        if (!string.IsNullOrWhiteSpace(row.taste_profile_raw))
        {
            try
            {
                profileDict = JsonSerializer.Deserialize<Dictionary<string, object>>(row.taste_profile_raw) ?? new();
            }
            catch {}
        }

        return new DeviceTasteProfileDto
        {
            DeviceId = row.device_id,
            PrimaryUserId = row.primary_user_id,
            IsIdentified = row.is_identified,
            HouseholdClusterId = row.household_cluster_id,
            TotalSessions = row.total_sessions,
            TasteProfile = profileDict,
            LastSeenAt = row.last_seen_at
        };
    }

    public async Task<IEnumerable<TelemetrySignalRecordDto>> GetDeviceSignalsAsync(string deviceId, int limit = 100, int days = 30, CancellationToken ct = default)
    {
        using var activity = Source.StartActivity("TelemetryService.GetDeviceSignals");

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        string sql = @"
            SELECT id, device_id, session_id, user_id, signal_type, properties::text as properties_raw,
                   client_timestamp, server_timestamp, ip::text as ip
            FROM store_telemetry_signals
            WHERE device_id = @DeviceId";

        if (days > 0)
        {
            sql += " AND server_timestamp >= NOW() - (@Days || ' days')::interval";
        }

        sql += " ORDER BY server_timestamp DESC LIMIT @Limit;";

        var rows = await conn.QueryAsync<dynamic>(sql, new { DeviceId = deviceId, Limit = limit, Days = days });

        var result = new List<TelemetrySignalRecordDto>();
        foreach (var r in rows)
        {
            Dictionary<string, object>? props = null;
            if (!string.IsNullOrWhiteSpace(r.properties_raw))
            {
                try
                {
                    props = JsonSerializer.Deserialize<Dictionary<string, object>>((string)r.properties_raw);
                }
                catch {}
            }

            result.Add(new TelemetrySignalRecordDto
            {
                Id = (Guid)r.id,
                DeviceId = (string)r.device_id,
                SessionId = (string?)r.session_id,
                UserId = (string?)r.user_id,
                SignalType = (string)r.signal_type,
                Properties = props,
                ClientTimestamp = (DateTime?)r.client_timestamp,
                ServerTimestamp = (DateTime)r.server_timestamp,
                Ip = (string?)r.ip
            });
        }

        return result;
    }

    private class StoreDeviceDbRow
    {
        public string device_id { get; set; } = string.Empty;
        public string? fingerprint_hash { get; set; }
        public string platform { get; set; } = string.Empty;
        public string? os { get; set; }
        public string? model { get; set; }
        public string? browser { get; set; }
        public string? screen_resolution { get; set; }
        public DateTime first_seen_at { get; set; }
        public DateTime last_seen_at { get; set; }
        public string? last_ip { get; set; }
        public string? last_user_id { get; set; }
        public int total_events { get; set; }
    }

    private class IdentityLinkDbRow
    {
        public long id { get; set; }
        public string device_id { get; set; } = string.Empty;
        public string user_id { get; set; } = string.Empty;
        public decimal confidence_score { get; set; }
        public string link_source { get; set; } = string.Empty;
        public bool is_active { get; set; }
        public DateTime created_at { get; set; }
    }

    private class SessionSummaryDbRow
    {
        public string session_id { get; set; } = string.Empty;
        public string device_id { get; set; } = string.Empty;
        public string? user_id { get; set; }
        public DateTime start_time { get; set; }
        public DateTime end_time { get; set; }
        public int duration_seconds { get; set; }
        public string? landing_page { get; set; }
        public string? exit_page { get; set; }
        public string? utm_source { get; set; }
        public string? utm_campaign { get; set; }
        public int total_page_views { get; set; }
        public int products_viewed { get; set; }
        public int swatches_explored { get; set; }
        public int bag_additions { get; set; }
        public bool reached_checkout { get; set; }
        public bool converted { get; set; }
        public string? order_id { get; set; }
        public string? session_journey_raw { get; set; }
        public DateTime created_at { get; set; }
    }

    private class DeviceTasteProfileDbRow
    {
        public string device_id { get; set; } = string.Empty;
        public string? primary_user_id { get; set; }
        public bool is_identified { get; set; }
        public string? household_cluster_id { get; set; }
        public int total_sessions { get; set; }
        public string? taste_profile_raw { get; set; }
        public DateTime last_seen_at { get; set; }
    }
}

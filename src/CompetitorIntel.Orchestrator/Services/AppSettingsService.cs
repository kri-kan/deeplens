using CompetitorIntel.Orchestrator.Data;
using CompetitorIntel.Orchestrator.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CompetitorIntel.Orchestrator.Services
{
    public class AppSettingsService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AppSettingsService> _logger;

        private const string MASKED = "••••••••";

        public AppSettingsService(IServiceProvider serviceProvider, ILogger<AppSettingsService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        // ── Read ──────────────────────────────────────────────────────────────

        /// <summary>
        /// Returns all settings, masking secret values.
        /// </summary>
        public async Task<List<AppSetting>> GetAllAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<CompetitorContext>();
            var rows = await context.AppSettings.OrderBy(s => s.Section).ThenBy(s => s.Key).ToListAsync();
            return rows.Select(Mask).ToList();
        }

        /// <summary>
        /// Returns settings for a specific section, masking secret values.
        /// </summary>
        public async Task<List<AppSetting>> GetSectionAsync(string section)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<CompetitorContext>();
            var rows = await context.AppSettings
                .Where(s => s.Section.ToLower() == section.ToLower())
                .OrderBy(s => s.Key)
                .ToListAsync();
            return rows.Select(Mask).ToList();
        }

        /// <summary>
        /// Returns the plaintext value for a key (for internal service use).
        /// </summary>
        public async Task<string?> GetRawAsync(string key)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<CompetitorContext>();
            var row = await context.AppSettings.FirstOrDefaultAsync(s => s.Key == key);
            return row?.Value;
        }

        // ── Write ─────────────────────────────────────────────────────────────

        public async Task<AppSetting?> UpsertAsync(string key, string? value)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<CompetitorContext>();

            var existing = await context.AppSettings.FirstOrDefaultAsync(s => s.Key == key);
            if (existing == null) return null; // Only update known keys, don't allow arbitrary insert

            existing.Value = value;
            existing.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();

            _logger.LogInformation("AppSetting updated: {Key}", key);
            return Mask(existing);
        }

        // ── Seed ──────────────────────────────────────────────────────────────

        /// <summary>
        /// Inserts the default set of settings if the table is empty.
        /// Values that are already set in the table are never overwritten.
        /// </summary>
        public async Task SeedDefaultsAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<CompetitorContext>();

            // Ensure table exists (idempotent DDL)
            await context.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS app_settings (
                    key         TEXT PRIMARY KEY,
                    value       TEXT,
                    section     TEXT NOT NULL,
                    label       TEXT NOT NULL,
                    description TEXT,
                    is_secret   BOOLEAN NOT NULL DEFAULT FALSE,
                    data_type   TEXT NOT NULL DEFAULT 'string',
                    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
                )
            ");

            var defaults = GetDefaultSettings();
            foreach (var s in defaults)
            {
                var exists = await context.AppSettings.AnyAsync(a => a.Key == s.Key);
                if (!exists)
                {
                    context.AppSettings.Add(s);
                }
            }
            await context.SaveChangesAsync();
            _logger.LogInformation("AppSettings seeded with {Count} defaults.", defaults.Count);
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private static AppSetting Mask(AppSetting s)
        {
            if (!s.IsSecret || string.IsNullOrEmpty(s.Value)) return s;
            return new AppSetting
            {
                Key = s.Key,
                Value = MASKED,
                Section = s.Section,
                Label = s.Label,
                Description = s.Description,
                IsSecret = s.IsSecret,
                DataType = s.DataType,
                UpdatedAt = s.UpdatedAt
            };
        }

        private static List<AppSetting> GetDefaultSettings() => new()
        {
            // ── Meta Graph API ───────────────────────────────────────────────
            new() {
                Key = "Meta:AppId",
                Section = "Meta",
                Label = "App ID",
                Description = "Your Meta/Facebook App ID from the Developer Dashboard.",
                IsSecret = false,
                DataType = "string",
                Value = ""
            },
            new() {
                Key = "Meta:AppSecret",
                Section = "Meta",
                Label = "App Secret",
                Description = "Your Meta App Secret. Keep this private.",
                IsSecret = true,
                DataType = "string",
                Value = ""
            },
            new() {
                Key = "Meta:IgBizId",
                Section = "Meta",
                Label = "IG Business Account ID",
                Description = "The Instagram Business Account ID used as the bridge for Business Discovery API.",
                IsSecret = false,
                DataType = "string",
                Value = ""
            },
            new() {
                Key = "Meta:AccessToken",
                Section = "Meta",
                Label = "Long-Lived Access Token",
                Description = "Your 60-day long-lived user token. Refreshed automatically every 50 days.",
                IsSecret = true,
                DataType = "string",
                Value = ""
            },
            new() {
                Key = "Meta:TokenLastRefreshed",
                Section = "Meta",
                Label = "Token Last Refreshed",
                Description = "The date the access token was last refreshed. Updated automatically.",
                IsSecret = false,
                DataType = "datetime",
                Value = "2025-01-01T00:00:00Z"
            },
            new() {
                Key = "Meta:SyncIntervalMinutes",
                Section = "Meta",
                Label = "Sync Interval (minutes)",
                Description = "How often the background worker runs a full sync cycle. Default: 720 (12h).",
                IsSecret = false,
                DataType = "integer",
                Value = "720"
            },
            new() {
                Key = "Meta:EngagementRefreshLimit",
                Section = "Meta",
                Label = "Engagement Refresh Limit",
                Description = "How many recent posts to refresh engagement stats on per sync. Default: 20.",
                IsSecret = false,
                DataType = "integer",
                Value = "20"
            },

            // ── Infrastructure ───────────────────────────────────────────────
            new() {
                Key = "Infrastructure:MinioEndpoint",
                Section = "Infrastructure",
                Label = "MinIO Endpoint",
                Description = "Host and port of the MinIO server e.g. 192.168.0.170:9000.",
                IsSecret = false,
                DataType = "string",
                Value = "192.168.0.170:9000"
            },
            new() {
                Key = "Infrastructure:MinioAccessKey",
                Section = "Infrastructure",
                Label = "MinIO Access Key",
                Description = "MinIO access key (username).",
                IsSecret = false,
                DataType = "string",
                Value = ""
            },
            new() {
                Key = "Infrastructure:MinioSecretKey",
                Section = "Infrastructure",
                Label = "MinIO Secret Key",
                Description = "MinIO secret key (password).",
                IsSecret = true,
                DataType = "string",
                Value = ""
            },
            new() {
                Key = "Infrastructure:KafkaBootstrap",
                Section = "Infrastructure",
                Label = "Kafka Bootstrap Servers",
                Description = "Comma-separated Kafka broker addresses.",
                IsSecret = false,
                DataType = "string",
                Value = "192.168.0.170:9092"
            },
        };
    }
}

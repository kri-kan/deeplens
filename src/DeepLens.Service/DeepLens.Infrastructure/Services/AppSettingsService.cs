using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Domain.Entities;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;

namespace DeepLens.Infrastructure.Services
{
    public class AppSettingsService : IAppSettingsService
    {
        private readonly IDbConnectionFactory _connectionFactory;
        private readonly ILogger<AppSettingsService> _logger;
        private readonly IMemoryCache _cache;
        private const string MASKED = "••••••••";
        private const string CACHE_KEY = "AppSettings_All";

        public AppSettingsService(IDbConnectionFactory connectionFactory, ILogger<AppSettingsService> logger, IMemoryCache cache)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
            _cache = cache;
        }

        public async Task<List<AppSetting>> GetAllAsync()
        {
            if (!_cache.TryGetValue(CACHE_KEY, out List<AppSetting>? settings))
            {
                using var conn = await _connectionFactory.CreateConnectionAsync();
                var dbSettings = await conn.QueryAsync<AppSetting>("SELECT * FROM app_settings");
                settings = dbSettings.ToList();
                
                _cache.Set(CACHE_KEY, settings, TimeSpan.FromHours(1));
            }
            
            return settings!.Select(Mask).ToList();
        }

        public async Task<List<AppSetting>> GetSectionAsync(string section)
        {
            return await GetSectionInternalAsync(section, mask: true);
        }

        public async Task<List<AppSetting>> GetSectionInternalAsync(string section)
        {
            return await GetSectionInternalAsync(section, mask: false);
        }

        private async Task<List<AppSetting>> GetSectionInternalAsync(string section, bool mask)
        {
            if (!_cache.TryGetValue(CACHE_KEY, out List<AppSetting>? settings))
            {
                using var conn = await _connectionFactory.CreateConnectionAsync();
                var dbSettings = await conn.QueryAsync<AppSetting>("SELECT * FROM app_settings");
                settings = dbSettings.ToList();
                _cache.Set(CACHE_KEY, settings, TimeSpan.FromHours(1));
            }

            var filtered = settings!.Where(s => s.Section.Equals(section, StringComparison.OrdinalIgnoreCase)).ToList();
            
            if (mask)
            {
                return filtered.Select(Mask).ToList();
            }

            return filtered;
        }
        
        public async Task<AppSetting?> UpsertAsync(string key, string? value)
        {
            using var conn = await _connectionFactory.CreateConnectionAsync();
            var existing = await conn.QueryFirstOrDefaultAsync<AppSetting>("SELECT * FROM app_settings WHERE key = @Key", new { Key = key });
            
            if (existing == null) return null;
            
            // Prevent overwriting secrets with masked display value
            if (existing.IsSecret && value == MASKED)
            {
                _logger.LogInformation("Skipping update for secret key {Key} because value is MASKED", key);
                return Mask(existing);
            }

            existing.Value = value;
            existing.UpdatedAt = DateTime.UtcNow;

            await conn.ExecuteAsync("UPDATE app_settings SET value = @Value, updated_at = @UpdatedAt WHERE key = @Key", existing);

            _logger.LogInformation("AppSetting updated: {Key}", key);
            _cache.Remove(CACHE_KEY); // Invalidate cache
            
            return Mask(existing);
        }

        public async Task SeedDefaultsAsync()
        {
            using var conn = await _connectionFactory.CreateConnectionAsync();
            
            await conn.ExecuteAsync(@"
                CREATE TABLE IF NOT EXISTS app_settings (
                    key         VARCHAR(150) PRIMARY KEY,
                    value       TEXT,
                    section     VARCHAR(60) NOT NULL,
                    label       VARCHAR(100) NOT NULL,
                    description TEXT,
                    is_secret   BOOLEAN NOT NULL DEFAULT FALSE,
                    data_type   VARCHAR(20) NOT NULL DEFAULT 'string',
                    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
                )
            ");

            var defaults = GetDefaultSettings();
            bool seeded = false;
            foreach (var s in defaults)
            {
                var exists = await conn.ExecuteScalarAsync<bool>("SELECT EXISTS(SELECT 1 FROM app_settings WHERE key = @Key)", new { Key = s.Key });
                if (!exists)
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO app_settings (key, value, section, label, description, is_secret, data_type, updated_at) 
                        VALUES (@Key, @Value, @Section, @Label, @Description, @IsSecret, @DataType, @UpdatedAt)", s);
                    seeded = true;
                }
            }
            
            if (seeded)
            {
                _logger.LogInformation("AppSettings seeded with defaults.");
                _cache.Remove(CACHE_KEY);
            }
        }

        private static AppSetting Mask(AppSetting s)
        {
            if (!s.IsSecret || string.IsNullOrEmpty(s.Value) || s.Value == MASKED) return s;
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
            new() { Key = "Meta:AppId", Section = "Meta", Label = "App ID", Description = "Your Meta/Facebook App ID from the Developer Dashboard.", IsSecret = false, DataType = "string", Value = "" },
            new() { Key = "Meta:AppSecret", Section = "Meta", Label = "App Secret", Description = "Your Meta App Secret. Keep this private.", IsSecret = true, DataType = "string", Value = "" },
            new() { Key = "Meta:IgBizId", Section = "Meta", Label = "IG Business Account ID", Description = "The Instagram Business Account ID used as the bridge for Business Discovery API.", IsSecret = false, DataType = "string", Value = "" },
            new() { Key = "Meta:AccessToken", Section = "Meta", Label = "Long-Lived Access Token", Description = "Your 60-day long-lived user token. Refreshed automatically every 50 days.", IsSecret = true, DataType = "string", Value = "" },
            new() { Key = "Meta:TokenLastRefreshed", Section = "Meta", Label = "Token Last Refreshed", Description = "The date the access token was last refreshed. Updated automatically.", IsSecret = false, DataType = "datetime", Value = "2025-01-01T00:00:00Z" },
            new() { Key = "Meta:SyncIntervalMinutes", Section = "Meta", Label = "Sync Interval (minutes)", Description = "How often the background worker runs a full sync cycle. Default: 720 (12h).", IsSecret = false, DataType = "integer", Value = "720" },
            new() { Key = "Meta:EngagementRefreshLimit", Section = "Meta", Label = "Engagement Refresh Limit", Description = "How many recent posts to refresh engagement stats on per sync. Default: 20.", IsSecret = false, DataType = "integer", Value = "20" },
            new() { Key = "Meta:ThrottleIntervalMs", Section = "Meta", Label = "API Throttle Delay (ms)", Description = "Gap between subsequent Meta Graph calls to prevent rate limits. Default: 2000 (2s).", IsSecret = false, DataType = "integer", Value = "2000" },
            new() { Key = "Meta:ExchangeShortLivedToken", Section = "Meta", Label = "Short-Lived Token", Description = "Paste a short-lived user token here to automatically exchange it for a 60-day token.", IsSecret = true, DataType = "string", Value = "" },
            new() { Key = "Infrastructure:MinioEndpoint", Section = "Infrastructure", Label = "MinIO Endpoint", Description = "Host and port of the MinIO server e.g. 192.168.0.170:9000.", IsSecret = false, DataType = "string", Value = "192.168.0.170:9000" },
            new() { Key = "Infrastructure:MinioAccessKey", Section = "Infrastructure", Label = "MinIO Access Key", Description = "MinIO access key (username).", IsSecret = false, DataType = "string", Value = "" },
            new() { Key = "Infrastructure:MinioSecretKey", Section = "Infrastructure", Label = "MinIO Secret Key", Description = "MinIO secret key (password).", IsSecret = true, DataType = "string", Value = "" },
            new() { Key = "Infrastructure:KafkaBootstrap", Section = "Infrastructure", Label = "Kafka Bootstrap Servers", Description = "Comma-separated Kafka broker addresses.", IsSecret = false, DataType = "string", Value = "192.168.0.170:9092" },
            new() { Key = "Media:CacheExpiryHours", Section = "Media", Label = "Media Cache Expiry (hours)", Description = "Browser/App cache duration for images. Default: 6.", IsSecret = false, DataType = "integer", Value = "6" },
            
            // YouTube Settings
            new() { Key = "Youtube:ClientId", Section = "YouTube", Label = "Client ID", Description = "Google OAuth 2.0 Client ID.", IsSecret = false, DataType = "string", Value = "" },
            new() { Key = "Youtube:ClientSecret", Section = "YouTube", Label = "Client Secret", Description = "Google OAuth 2.0 Client Secret.", IsSecret = true, DataType = "string", Value = "" },
            new() { Key = "Youtube:AccessToken", Section = "YouTube", Label = "Access Token", Description = "Persisted OAuth access token.", IsSecret = true, DataType = "string", Value = "" },
            new() { Key = "Youtube:RefreshToken", Section = "YouTube", Label = "Refresh Token", Description = "OAuth refresh token for automated renewal.", IsSecret = true, DataType = "string", Value = "" },
            new() { Key = "Youtube:TokenLastRefreshed", Section = "YouTube", Label = "Token Last Refreshed", Description = "Date the token was last updated.", IsSecret = false, DataType = "datetime", Value = "2025-01-01T00:00:00Z" },
            new() { Key = "Youtube:DailyQuotaLimit", Section = "YouTube", Label = "Daily Quota Limit", Description = "Max units per day (default 10,000).", IsSecret = false, DataType = "integer", Value = "10000" },
            new() { Key = "Youtube:CurrentQuotaUsage", Section = "YouTube", Label = "Current Quota Usage", Description = "Units consumed today.", IsSecret = false, DataType = "integer", Value = "0" },
            new() { Key = "Youtube:DefaultCategoryId", Section = "YouTube", Label = "Default Category ID", Description = "22 is People & Blogs.", IsSecret = false, DataType = "string", Value = "22" },
            new() { Key = "Youtube:SchedulingIntervalHours", Section = "YouTube", Label = "Scheduling Interval (hours)", Description = "Hours between scheduled posts.", IsSecret = false, DataType = "integer", Value = "6" },
            new() { Key = "Youtube:RedirectUri", Section = "YouTube", Label = "Redirect URI", Description = "OAuth 2.0 redirect URI (must match Google Console).", IsSecret = false, DataType = "string", Value = "http://localhost:5002/oauth2callback" },
            
            // AI Settings
            new() { Key = "Ai:OllamaBaseUrl", Section = "AI", Label = "Ollama Base URL", Description = "The API endpoint for the Ollama instance.", IsSecret = false, DataType = "string", Value = "http://localhost:11434" },
            new() { Key = "Ai:OllamaModel", Section = "AI", Label = "Ollama Model", Description = "The model name to use for generation (e.g. llama3).", IsSecret = false, DataType = "string", Value = "llama3" }
        };
    }
}

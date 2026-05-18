using System.Data;
using System.Text.Json;
using System.Text.Json.Serialization;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Domain.Enums;
using DeepLens.Contracts.Instagram;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Distributed;
using Polly;
using Polly.Retry;
using Dapper;
using DeepLens.Application.Abstractions.Data;

namespace DeepLens.Infrastructure.Services
{
    public class MetaOptions
    {
        public string ApiVersion { get; set; } = "v20.0";
        public string BaseUrl { get; set; } = "https://graph.facebook.com";
        public string AppId { get; set; } = string.Empty;
        public string AppSecret { get; set; } = string.Empty;
        public string IgBizId { get; set; } = string.Empty;
        public string LongAccessToken { get; set; } = string.Empty;
        public DateTime TokenLastRefreshed { get; set; } = DateTime.MinValue;
        public int TokenRefreshThresholdDays { get; set; } = 50;
        public int SyncIntervalMinutes { get; set; } = 720;
        public int EngagementRefreshLimit { get; set; } = 20;
        public int ThrottleIntervalMs { get; set; } = 2000;
    }

    public class MetaGraphService : IMetaGraphService
    {
        private readonly ILogger<MetaGraphService> _logger;
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        private readonly IAppSettingsService _appSettings;
        private readonly IDistributedCache _cache;
        private readonly IDbConnectionFactory _db;
        private readonly AsyncRetryPolicy<HttpResponseMessage> _retryPolicy;
        private MetaOptions _opts;

        public string? LastRawResponse { get; private set; }
        public MetaCallDetails? LastCall { get; private set; }
        private Guid? _currentConfigId;

        public MetaGraphService(
            ILogger<MetaGraphService> logger,
            IConfiguration configuration,
            HttpClient httpClient,
            IAppSettingsService appSettings,
            IDistributedCache cache,
            IDbConnectionFactory db)
        {
            _logger = logger;
            _configuration = configuration;
            _httpClient = httpClient;
            _appSettings = appSettings;
            _cache = cache;
            _db = db;
            _opts = LoadOptionsFromConfig();

            _retryPolicy = Policy
                .Handle<HttpRequestException>()
                .OrResult<HttpResponseMessage>(r => (int)r.StatusCode >= 500 || r.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)), 
                    (result, timeSpan, retryCount, context) => {
                        _logger.LogWarning("Meta Graph API request failed. Waiting {Time}ms before retry {Count}.", timeSpan.TotalMilliseconds, retryCount);
                    });
        }

        public async Task ReloadFromDbAsync()
        {
            var opts = LoadOptionsFromConfig();

            using var conn = await _db.CreateConnectionAsync();
            
            // 1. Ensure table exists (in case SeedDefaults hasn't run or we want to be safe)
            await conn.ExecuteAsync(@"
                CREATE TABLE IF NOT EXISTS meta_configurations (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name TEXT NOT NULL,
                    app_id TEXT NOT NULL,
                    app_secret TEXT NOT NULL,
                    ig_biz_id TEXT NOT NULL,
                    long_access_token TEXT NOT NULL,
                    is_default BOOLEAN DEFAULT FALSE,
                    call_count INTEGER DEFAULT 0,
                    total_time INTEGER DEFAULT 0,
                    total_cpu INTEGER DEFAULT 0,
                    last_refreshed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )");

            // Schema Migration: long_access_token
            try {
                await conn.ExecuteAsync("ALTER TABLE meta_configurations ADD COLUMN IF NOT EXISTS long_access_token TEXT");
                await conn.ExecuteAsync("UPDATE meta_configurations SET long_access_token = access_token WHERE long_access_token IS NULL AND access_token IS NOT NULL");
            } catch { /* Ignore if it fails or already modified */ }

            // Schema Migration: Add quota columns if they don't exist
            try {
                await conn.ExecuteAsync("ALTER TABLE meta_configurations ADD COLUMN IF NOT EXISTS call_count INTEGER DEFAULT 0");
                await conn.ExecuteAsync("ALTER TABLE meta_configurations ADD COLUMN IF NOT EXISTS total_time INTEGER DEFAULT 0");
                await conn.ExecuteAsync("ALTER TABLE meta_configurations ADD COLUMN IF NOT EXISTS total_cpu INTEGER DEFAULT 0");
            } catch { /* Ignore if already exists */ }

            // 2. Migration: If table is empty, try to migrate from app_settings
            var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM meta_configurations");
            if (count == 0)
            {
                _logger.LogInformation("Migrating Meta settings from app_settings to meta_configurations...");
                var metaSettingsList = await _appSettings.GetSectionInternalAsync("Meta");
                var metaSettings = metaSettingsList.ToDictionary(s => s.Key, s => s.Value);

                if (metaSettings.TryGetValue("Meta:AppId", out var appId) && !string.IsNullOrWhiteSpace(appId))
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO meta_configurations (name, app_id, app_secret, ig_biz_id, long_access_token, is_default, last_refreshed_at)
                        VALUES (@Name, @AppId, @AppSecret, @IgBizId, @LongAccessToken, TRUE, @LastRefreshed)",
                        new {
                            Name = "Default Account",
                            AppId = appId,
                            AppSecret = metaSettings.GetValueOrDefault("Meta:AppSecret") ?? "",
                            IgBizId = metaSettings.GetValueOrDefault("Meta:IgBizId") ?? "",
                            LongAccessToken = metaSettings.GetValueOrDefault("Meta:AccessToken") ?? "",
                            LastRefreshed = DateTime.TryParse(metaSettings.GetValueOrDefault("Meta:TokenLastRefreshed"), out var d) ? d.ToUniversalTime() : DateTime.UtcNow
                        });
                }
            }

            // 3. Load Default Configuration
            var defaultConfig = await conn.QueryFirstOrDefaultAsync<dynamic>(
                "SELECT * FROM meta_configurations WHERE is_default = TRUE LIMIT 1");
            
            if (defaultConfig != null)
            {
                opts.AppId = defaultConfig.app_id;
                opts.AppSecret = defaultConfig.app_secret;
                opts.IgBizId = defaultConfig.ig_biz_id;
                opts.LongAccessToken = defaultConfig.long_access_token ?? defaultConfig.access_token;
                opts.TokenLastRefreshed = ((DateTime)defaultConfig.last_refreshed_at).ToUniversalTime();
                _currentConfigId = (Guid)defaultConfig.id;
            }
            else
            {
                _currentConfigId = null;
            }

            // 4. Overlays from app_settings for overrides (Intervals, Throttling)
            var overrides = await _appSettings.GetSectionInternalAsync("Meta");
            var overrideDict = overrides.ToDictionary(s => s.Key, s => s.Value);

            void Apply(string key, Action<string> apply)
            {
                if (overrideDict.TryGetValue(key, out var v) && !string.IsNullOrWhiteSpace(v))
                    apply(v);
            }

            Apply("Meta:SyncIntervalMinutes",    v => { if (int.TryParse(v, out var i)) opts.SyncIntervalMinutes = i; });
            Apply("Meta:EngagementRefreshLimit", v => { if (int.TryParse(v, out var i)) opts.EngagementRefreshLimit = i; });
            Apply("Meta:ThrottleIntervalMs",    v => { if (int.TryParse(v, out var i)) opts.ThrottleIntervalMs = i; });

            _opts = opts;
        }

        private MetaOptions LoadOptionsFromConfig()
        {
            var opts = new MetaOptions();
            var section = _configuration.GetSection("Meta");
            opts.ApiVersion = section["ApiVersion"] ?? opts.ApiVersion;
            opts.BaseUrl = section["BaseUrl"] ?? opts.BaseUrl;
            opts.AppId = section["AppId"] ?? opts.AppId;
            opts.AppSecret = section["AppSecret"] ?? opts.AppSecret;
            opts.IgBizId = section["IgBizId"] ?? opts.IgBizId;
            opts.LongAccessToken = section["LongAccessToken"] ?? section["AccessToken"] ?? opts.LongAccessToken;
            
            if (int.TryParse(section["TokenRefreshThresholdDays"], out var thr)) opts.TokenRefreshThresholdDays = thr;
            if (int.TryParse(section["SyncIntervalMinutes"], out var sync)) opts.SyncIntervalMinutes = sync;
            if (int.TryParse(section["EngagementRefreshLimit"], out var eng)) opts.EngagementRefreshLimit = eng;
            if (int.TryParse(section["ThrottleIntervalMs"], out var thrMs)) opts.ThrottleIntervalMs = thrMs;
            if (DateTime.TryParse(section["TokenLastRefreshed"], out var dt)) opts.TokenLastRefreshed = dt.ToUniversalTime();

            return opts;
        }

        public TokenHealthInfo GetTokenHealth()
        {
            var lastRefreshed = _opts.TokenLastRefreshed;
            var expiresAt = lastRefreshed.AddDays(60);
            var daysRemaining = (int)(expiresAt - DateTime.UtcNow).TotalDays;
            var needsRefresh = (DateTime.UtcNow - lastRefreshed).TotalDays >= _opts.TokenRefreshThresholdDays;

            return new TokenHealthInfo
            {
                LastRefreshed = lastRefreshed,
                ExpiresAt = expiresAt,
                DaysRemaining = daysRemaining,
                NeedsRefresh = needsRefresh,
                IsExpired = daysRemaining <= 0
            };
        }

        public async Task<bool> RefreshTokenAsync()
        {
            try
            {
                _logger.LogInformation("Attempting to refresh Meta long-lived token...");
                var url = $"https://graph.instagram.com/refresh_access_token" +
                          $"?grant_type=ig_refresh_token&access_token={_opts.LongAccessToken}";

                var response = await _retryPolicy.ExecuteAsync(() => _httpClient.GetAsync(url));
                var body = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<GraphTokenRefreshResponse>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (result?.AccessToken != null)
                {
                    await PersistNewTokenAsync(result.AccessToken);
                    return true;
                }

                _logger.LogWarning("Standard refresh failed. Attempting short-to-long exchange...");
                var exchangedToken = await ExchangeForLongLivedTokenAsync(_opts.LongAccessToken);
                return !string.IsNullOrEmpty(exchangedToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception during token refresh/exchange");
                return false;
            }
        }

        private async Task PersistNewTokenAsync(string token)
        {
            _opts.LongAccessToken = token;
            _opts.TokenLastRefreshed = DateTime.UtcNow;

            using var conn = await _db.CreateConnectionAsync();
            
            // Update the default configuration in the new table
            await conn.ExecuteAsync(@"
                UPDATE meta_configurations 
                SET long_access_token = @LongAccessToken, 
                    last_refreshed_at = @LastRefreshed,
                    updated_at = @LastRefreshed
                WHERE is_default = TRUE",
                new { LongAccessToken = token, LastRefreshed = _opts.TokenLastRefreshed });

            // Also update legacy app_settings for backward compatibility/sync workers that might still use it
            await _appSettings.UpsertAsync("Meta:AccessToken", token);
            await _appSettings.UpsertAsync("Meta:TokenLastRefreshed", _opts.TokenLastRefreshed.ToString("O"));
            
            _logger.LogInformation("Meta token updated and persisted to configurations and settings.");
        }

        public async Task<string?> ExchangeForLongLivedTokenAsync(string shortLivedToken, string? appId = null, string? appSecret = null)
        {
            try
            {
                var targetAppId = appId ?? _opts.AppId;
                var targetAppSecret = appSecret ?? _opts.AppSecret;

                _logger.LogInformation("Exchanging Meta token for AppId: {AppId}", targetAppId);

                var url = $"{_opts.BaseUrl}/{_opts.ApiVersion}/oauth/access_token" +
                          $"?grant_type=fb_exchange_token" +
                          $"&client_id={Uri.EscapeDataString(targetAppId)}" +
                          $"&client_secret={Uri.EscapeDataString(targetAppSecret)}" +
                          $"&fb_exchange_token={Uri.EscapeDataString(shortLivedToken)}";

                _logger.LogInformation("Token exchange URL built (secret masked). Attempting request...");
                var response = await _retryPolicy.ExecuteAsync(() => _httpClient.GetAsync(url));
                var body = await response.Content.ReadAsStringAsync();

                var result = JsonSerializer.Deserialize<GraphTokenRefreshResponse>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (result?.Error != null)
                {
                    _logger.LogError("Token exchange failed: {Msg}", result.Error.Message);
                    return null;
                }

                if (!string.IsNullOrEmpty(result?.AccessToken))
                {
                    // Only update global state if we are exchanging for the CURRENT account
                    if (targetAppId == _opts.AppId)
                    {
                        _opts.LongAccessToken = result.AccessToken;
                        _opts.TokenLastRefreshed = DateTime.UtcNow;

                        using var conn = await _db.CreateConnectionAsync();
                        await conn.ExecuteAsync(@"
                            UPDATE meta_configurations 
                            SET long_access_token = @LongAccessToken, 
                                last_refreshed_at = @LastRefreshed,
                                updated_at = @LastRefreshed
                            WHERE is_default = TRUE",
                            new { LongAccessToken = result.AccessToken, LastRefreshed = _opts.TokenLastRefreshed });

                        await _appSettings.UpsertAsync("Meta:AccessToken", result.AccessToken);
                        await _appSettings.UpsertAsync("Meta:TokenLastRefreshed", _opts.TokenLastRefreshed.ToString("O"));
                    }

                    return result.AccessToken;
                }

                _logger.LogError("Token exchange returned empty token. Response: {Body}", body);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception during token exchange");
                return null;
            }
        }

        public async Task<MetaPost?> GetPostByIdAsync(string postId)
        {
            var fields = "id,caption,media_url,thumbnail_url,permalink,like_count,comments_count,timestamp,media_type,media_product_type,children{id,media_url,thumbnail_url,media_type}";
            var url = BuildUrl($"/{postId}", fields);

            try
            {
                await RecordRequestAsync();
                var response = await _retryPolicy.ExecuteAsync(() => _httpClient.GetAsync(url));
                
                if (response.Headers.TryGetValues("x-app-usage", out var values))
                {
                    await UpdateUsageMetricsAsync(values.FirstOrDefault());
                }

                var body = await response.Content.ReadAsStringAsync();
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Graph API returned {StatusCode} for post {PostId}. Body: {Body}", response.StatusCode, postId, body);
                    return null;
                }

                var m = JsonSerializer.Deserialize<GraphMediaItem>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (m == null || string.IsNullOrEmpty(m.Id)) return null;

                return MapToMetaPost(m);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch single post {PostId} from Graph API", postId);
                return null;
            }
        }

        public async Task<MetaPost?> GetPostByDiscoveryAsync(string targetUsername, string postId)
        {
            _logger.LogInformation("Attempting to find post {PostId} via business discovery for @{Username}", postId, targetUsername);
            
            // Business discovery doesn't allow direct filtering by ID, so we fetch the recent media
            // Since refresh is usually for recent posts, 20 should be enough.
            var mediaFields = "id,caption,media_url,thumbnail_url,permalink,like_count,comments_count,timestamp,media_type,media_product_type,children{id,media_url,thumbnail_url,media_type}";
            var fields = $"business_discovery.username({targetUsername}){{media.limit(25){{{mediaFields}}}}}";
            var url = BuildUrl($"/{_opts.IgBizId}", fields);

            var discovery = await ExecuteBusinessDiscoveryAsync(url);
            if (discovery?.Media?.Data == null) return null;

            var match = discovery.Media.Data.FirstOrDefault(m => m.Id == postId);
            if (match != null)
            {
                return MapToMetaPost(match);
            }

            _logger.LogWarning("Post {PostId} not found in the first 25 media items of @{Username}", postId, targetUsername);
            return null;
        }

        private MetaPost MapToMetaPost(GraphMediaItem m)
        {
            return new MetaPost
            {
                Id = m.Id,
                Caption = m.Caption,
                MediaUrl = m.MediaUrl,
                ThumbnailUrl = m.ThumbnailUrl,
                Permalink = m.Permalink,
                LikeCount = m.LikeCount,
                CommentCount = m.CommentsCount,
                Timestamp = DateTime.TryParse(m.Timestamp, out var dt) ? dt.ToUniversalTime() : null,
                MediaType = InstagramMediaStandardizer.MapToMediaType(m.MediaType),
                MediaProductType = m.MediaProductType,
                Children = m.Children?.Data?.Select(c => new MetaPost {
                    Id = c.Id,
                    MediaUrl = c.MediaUrl,
                    ThumbnailUrl = c.ThumbnailUrl,
                    MediaType = InstagramMediaStandardizer.MapToMediaType(c.MediaType)
                }).ToList()
            };
        }

        public async Task<MetaProfile?> GetProfileAsync(string targetUsername)
        {
            string cacheKey = $"meta:profile:{targetUsername}";
            var cached = await _cache.GetStringAsync(cacheKey);
            if (cached != null) return JsonSerializer.Deserialize<MetaProfile>(cached);

            var fields = $"business_discovery.username({targetUsername}){{username,followers_count,media_count,biography,name,profile_picture_url,website,ig_id}}";
            var url = BuildUrl($"/{_opts.IgBizId}", fields);
            var discovery = await ExecuteBusinessDiscoveryAsync(url);
            
            if (discovery == null) return null;

            var profile = new MetaProfile
            {
                Username = discovery.Username,
                Name = discovery.Name,
                Biography = discovery.Biography,
                FollowersCount = discovery.FollowersCount,
                FollowingCount = discovery.FollowsCount,
                MediaCount = discovery.MediaCount,
                ProfilePictureUrl = discovery.ProfilePictureUrl,
                Website = discovery.Website,
                IsVerified = false, // Not available in business_discovery
                IsBusiness = true, // discovery only works for business accounts
                ExternalId = discovery.IgId.ToString(),
                IsOwnAccount = false
            };

            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(profile), new DistributedCacheEntryOptions {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30)
            });

            return profile;
        }

        public async Task<List<MetaPost>> GetPostsAsync(string targetUsername, int maxPosts = 50)
        {
            var mediaFields = "id,caption,media_url,thumbnail_url,permalink,like_count,comments_count,timestamp,media_type,media_product_type,children{id,media_url,thumbnail_url,media_type}";
            var allPosts = new List<MetaPost>();
            string? afterCursor = null;
            bool hasMore = true;

            // If maxPosts <= 0, we treat it as "Sync All"
            bool fetchAll = maxPosts <= 0;

            while (hasMore && (fetchAll || allPosts.Count < maxPosts))
            {
                // Business Discovery media limit per page is typically 25-50.
                // We calculate how many we still need.
                int stillNeeded = fetchAll ? 50 : Math.Min(50, maxPosts - allPosts.Count);
                if (stillNeeded <= 0 && !fetchAll) break;

                var mediaQuery = string.IsNullOrEmpty(afterCursor) 
                    ? $"media.limit({stillNeeded}){{{mediaFields}}}" 
                    : $"media.after({afterCursor}).limit({stillNeeded}){{{mediaFields}}}";

                var fields = $"business_discovery.username({targetUsername}){{{mediaQuery}}}";
                var url = BuildUrl($"/{_opts.IgBizId}", fields);

                var discovery = await ExecuteBusinessDiscoveryAsync(url);
                if (discovery?.Media?.Data == null || !discovery.Media.Data.Any()) break;

                var newPosts = discovery.Media.Data.Select(MapToMetaPost).ToList();

                allPosts.AddRange(newPosts);

                afterCursor = discovery.Media.Paging?.Cursors?.After;
                hasMore = !string.IsNullOrEmpty(afterCursor);
                
                // --- Quota-Aware Throttling ---
                var currentQuota = await GetQuotaAsync();
                if (currentQuota.Metrics.CallCount > 90)
                {
                    _logger.LogWarning("Instagram Quota is tight ({Usage}%). Slowing down sync...", currentQuota.Metrics.CallCount);
                    await Task.Delay(TimeSpan.FromSeconds(5)); // Wait 5 seconds between pages if usage is > 90%
                }
                else if (currentQuota.Metrics.CallCount > 80)
                {
                    await Task.Delay(TimeSpan.FromSeconds(2)); // Wait 2 seconds if usage > 80%
                }

                // If we hit exactly what we needed, or if we are in "all" mode, keep going if there's a cursor
                if (!fetchAll && allPosts.Count >= maxPosts) break;
            }

            return allPosts;
        }

        public async Task<List<MetaPost>> GetPostEngagementAsync(string targetUsername, int limit = 20)
        {
            var fields = $"business_discovery.username({targetUsername}){{media.limit({limit}){{id,like_count,comments_count}}}}";
            var url = BuildUrl($"/{_opts.IgBizId}", fields);
            var discovery = await ExecuteBusinessDiscoveryAsync(url);
            
            return discovery?.Media?.Data?.Select(m => new MetaPost {
                Id = m.Id,
                LikeCount = m.LikeCount,
                CommentCount = m.CommentsCount
            }).ToList() ?? new List<MetaPost>();
        }

        public int GetSyncIntervalMinutes() => _opts.SyncIntervalMinutes;
        public int GetEngagementRefreshLimit() => _opts.EngagementRefreshLimit;

        private string BuildUrl(string path, string fields)
        {
            return $"{_opts.BaseUrl}/{_opts.ApiVersion}{path}?fields={Uri.EscapeDataString(fields)}&access_token={_opts.LongAccessToken}";
        }

        public async Task<MetaQuotaInfo> GetQuotaAsync()
        {
            var metricsJson = await _cache.GetStringAsync("meta:usage_metrics_v2");
            var metrics = metricsJson != null 
                ? JsonSerializer.Deserialize<AppUsageMetrics>(metricsJson) 
                : new AppUsageMetrics();

            var requestLog = await GetRequestLogAsync();
            var lastHourCount = requestLog.Count;

            // Estimate remaining based on 200/hr limit vs reported usage %
            int estimatedRemaining = Math.Max(0, 200 - lastHourCount);
            if (metrics?.CallCount > 0)
            {
                // If header says 50%, and we made 100 calls, then limit is 200.
                // remaining = (1.0 - 0.5) * 200 = 100.
                var limitFromHeader = (lastHourCount * 100.0) / Math.Max(1, metrics.CallCount);
                estimatedRemaining = (int)Math.Min(estimatedRemaining, (1.0 - metrics.CallCount / 100.0) * limitFromHeader);
            }

            return new MetaQuotaInfo
            {
                RequestsInLastHour = lastHourCount,
                EstimatedRemainingRequests = estimatedRemaining,
                Metrics = metrics ?? new AppUsageMetrics(),
                LastUpdated = DateTime.UtcNow
            };
        }

        public async Task SyncPostCommentsAsync(Guid competitorVideoId, string accessToken)
        {
            using var conn = await _db.CreateConnectionAsync();

            // 1. Look up the target post/video
            var video = await conn.QueryFirstOrDefaultAsync<dynamic>(
                "SELECT platform, platform_video_id FROM competitor_videos WHERE id = @Id",
                new { Id = competitorVideoId });

            if (video == null)
            {
                throw new Exception($"Post not found for ID: {competitorVideoId}");
            }

            string platform = (string)video.platform;
            string platformVideoId = (string)video.platform_video_id;
            bool isInstagram = platform.Equals("instagram", StringComparison.OrdinalIgnoreCase);

            // 2. Determine the time horizon of the last successful scrape
            var lastScrapedAtVal = await conn.ExecuteScalarAsync<DateTime?>(
                "SELECT MAX(posted_at) FROM post_comments WHERE video_id = @VideoId",
                new { VideoId = competitorVideoId });

            DateTime? lastScrapedAt = lastScrapedAtVal?.ToUniversalTime();

            // 3. Set up initial API Payload Structure
            int limit = 80;
            string baseUrl = $"{_opts.BaseUrl}/{_opts.ApiVersion}/{platformVideoId}/comments";
            string nextUrl = isInstagram
                ? $"{baseUrl}?fields=id,timestamp,text,like_count,hidden,from{{id,username}}&access_token={accessToken}&limit={limit}"
                : $"{baseUrl}?filter=stream&fields=id,created_time,message,like_count,from{{id,name}}&access_token={accessToken}&limit={limit}";

            _logger.LogInformation("Starting comment sync for {PlatformVideoId} ({Platform}). Last scraped at: {LastScrapedAt}", 
                platformVideoId, platform, lastScrapedAt?.ToString("O") ?? "never");

            int totalUpserted = 0;

            // 4. Client-side pagination loop
            while (!string.IsNullOrEmpty(nextUrl))
            {
                await RecordRequestAsync();
                var response = await _retryPolicy.ExecuteAsync(() => _httpClient.GetAsync(nextUrl));
                var body = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Meta API error during comment sync: {Body}", body);
                    throw new Exception($"Meta API error: {response.StatusCode} - {response.ReasonPhrase}");
                }

                var data = JsonSerializer.Deserialize<GraphCommentsResponse>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (data?.Error != null)
                {
                    _logger.LogError("Meta API error: [{Code}] {Msg}", data.Error.Code, data.Error.Message);
                    throw new Exception($"Meta API error: {data.Error.Message}");
                }

                var comments = data?.Data;
                if (comments == null || !comments.Any())
                {
                    break;
                }

                bool hitOlderComment = false;

                foreach (var item in comments)
                {
                    if (string.IsNullOrEmpty(item.Id)) continue;

                    string dateStr = isInstagram ? item.Timestamp : item.CreatedTime;
                    if (string.IsNullOrEmpty(dateStr) || !DateTime.TryParse(dateStr, out var postedAt))
                    {
                        postedAt = DateTime.UtcNow;
                    }
                    postedAt = postedAt.ToUniversalTime();

                    // Time-Window Sync Optimization
                    if (lastScrapedAt.HasValue && postedAt <= lastScrapedAt.Value)
                    {
                        hitOlderComment = true;
                        break;
                    }

                    string? platformAccountId = item.From?.Id;
                    if (string.IsNullOrEmpty(platformAccountId)) continue;

                    string? username = isInstagram ? item.From?.Username : null;
                    string? fullName = isInstagram ? null : item.From?.Name;
                    string? commentText = isInstagram ? item.Text : item.Message;
                    long likeCount = item.LikeCount;
                    bool isHidden = item.Hidden ?? false;
                    string platformCommentId = item.Id;

                    if (conn.State != ConnectionState.Open)
                    {
                        conn.Open();
                    }

                    using var tx = conn.BeginTransaction();
                    try
                    {
                        // Step 4a. Upsert Account First
                        var accountUpsertQuery = @"
                            INSERT INTO public.instagram_accounts (platform, platform_account_id, username, full_name)
                            VALUES (@Platform, @PlatformAccountId, @Username, @FullName)
                            ON CONFLICT (platform, platform_account_id)
                            DO UPDATE SET 
                                username = COALESCE(EXCLUDED.username, public.instagram_accounts.username),
                                full_name = COALESCE(EXCLUDED.full_name, public.instagram_accounts.full_name),
                                updated_at = now()
                            RETURNING id;";
                        
                        var accountId = await conn.ExecuteScalarAsync<Guid>(accountUpsertQuery, new {
                            Platform = platform.ToUpper(),
                            PlatformAccountId = platformAccountId,
                            Username = username,
                            FullName = fullName
                        }, transaction: tx);

                        // Step 4b. Upsert Comment Second
                        var commentUpsertQuery = @"
                            INSERT INTO public.post_comments (
                                video_id, account_id, platform_comment_id, parent_platform_comment_id, 
                                comment_text, posted_at, like_count, is_hidden, raw_metadata, scraped_at
                            )
                            VALUES (@VideoId, @AccountId, @PlatformCommentId, NULL, @CommentText, @PostedAt, @LikeCount, @IsHidden, @RawMetadata::jsonb, now())
                            ON CONFLICT (platform_comment_id)
                            DO UPDATE SET
                                comment_text = EXCLUDED.comment_text,
                                like_count = EXCLUDED.like_count,
                                is_hidden = EXCLUDED.is_hidden,
                                raw_metadata = EXCLUDED.raw_metadata,
                                scraped_at = now();";

                        var rawMetadata = JsonSerializer.Serialize(item);

                        await conn.ExecuteAsync(commentUpsertQuery, new {
                            VideoId = competitorVideoId,
                            AccountId = accountId,
                            PlatformCommentId = platformCommentId,
                            CommentText = commentText ?? string.Empty,
                            PostedAt = postedAt,
                            LikeCount = likeCount,
                            IsHidden = isHidden,
                            RawMetadata = rawMetadata
                        }, transaction: tx);

                        tx.Commit();
                        totalUpserted++;
                    }
                    catch (Exception ex)
                    {
                        tx.Rollback();
                        _logger.LogError(ex, "Failed to upsert comment {PlatformCommentId}", platformCommentId);
                        // Continue with next comment
                    }
                }

                if (hitOlderComment)
                {
                    break;
                }

                nextUrl = data?.Paging?.Next ?? string.Empty;
            }

            _logger.LogInformation("Finished comment sync for {PlatformVideoId}. Upserted {TotalUpserted} comments.", platformVideoId, totalUpserted);
        }

        private async Task<List<long>> GetRequestLogAsync()
        {
            var logStr = await _cache.GetStringAsync("meta:request_log");
            if (string.IsNullOrEmpty(logStr)) return new List<long>();

            var nowTicks = DateTime.UtcNow.Ticks;
            var oneHourAgoTicks = nowTicks - TimeSpan.FromHours(1).Ticks;

            return logStr.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(long.Parse)
                .Where(t => t > oneHourAgoTicks)
                .ToList();
        }

        private async Task RecordRequestAsync()
        {
            var log = await GetRequestLogAsync();
            log.Add(DateTime.UtcNow.Ticks);
            await _cache.SetStringAsync("meta:request_log", string.Join(",", log), new DistributedCacheEntryOptions {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
            });
        }

        private async Task UpdateUsageMetricsAsync(string? usageHeader)
        {
            if (string.IsNullOrEmpty(usageHeader)) return;

            try
            {
                var rawMetrics = JsonSerializer.Deserialize<MetaAppUsageHeader>(usageHeader, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (rawMetrics != null)
                {
                    var metrics = new AppUsageMetrics
                    {
                        CallCount = rawMetrics.CallCount,
                        TotalCpuTime = rawMetrics.TotalCpuTime,
                        TotalTime = rawMetrics.TotalTime
                    };

                    await _cache.SetStringAsync("meta:usage_metrics_v2", JsonSerializer.Serialize(metrics), new DistributedCacheEntryOptions {
                        AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
                    });

                    if (_currentConfigId.HasValue)
                    {
                        using var conn = await _db.CreateConnectionAsync();
                        await conn.ExecuteAsync(@"
                            UPDATE meta_configurations 
                            SET call_count = @CallCount, 
                                total_time = @TotalTime, 
                                total_cpu = @TotalCpuTime,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = @Id",
                            new { 
                                metrics.CallCount, 
                                metrics.TotalTime, 
                                metrics.TotalCpuTime, 
                                Id = _currentConfigId.Value 
                            });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse x-app-usage header: {Header}", usageHeader);
            }
        }

        private async Task<GraphBusinessDiscovery?> ExecuteBusinessDiscoveryAsync(string url)
        {
            try
            {
                if (_opts.ThrottleIntervalMs > 0)
                {
                    _logger.LogDebug("Throttling Meta Graph call by {Ms}ms", _opts.ThrottleIntervalMs);
                    await Task.Delay(_opts.ThrottleIntervalMs);
                }

                await RecordRequestAsync();

                var response = await _retryPolicy.ExecuteAsync(() => _httpClient.GetAsync(url));
                
                // Quota Tracking
                if (response.Headers.TryGetValues("x-app-usage", out var values))
                {
                    await UpdateUsageMetricsAsync(values.FirstOrDefault());
                }
                
                LastRawResponse = await response.Content.ReadAsStringAsync();
                
                LastCall = new MetaCallDetails
                {
                    RequestUrl = url.Replace(_opts.LongAccessToken, "REDACTED"),
                    RequestPayload = null, // Business Discovery uses GET with query params
                    ResponseBody = LastRawResponse,
                    Timestamp = DateTime.UtcNow
                };

                var result = JsonSerializer.Deserialize<GraphProfileResponse>(LastRawResponse,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (result?.Error != null)
                {
                    _logger.LogError("Graph API error: [{Code}] {Msg}", result.Error.Code, result.Error.Message);
                    
                    if (result.Error.Code == 4 || result.Error.Code == 17 || result.Error.Message.Contains("limit reached"))
                    {
                        throw new Exception("INSTAGRAM_RATE_LIMIT_REACHED");
                    }
                    
                    return null;
                }

                return result?.BusinessDiscovery;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception calling Graph API");
                return null;
            }
        }


        // --- Configuration Management ---

        public async Task<List<MetaConfigurationDto>> GetConfigurationsAsync()
        {
            using var conn = await _db.CreateConnectionAsync();
            var configs = await conn.QueryAsync<MetaConfigurationDto>(@"
                SELECT id, name, app_id as AppId, app_secret as AppSecret, 
                       ig_biz_id as IgBizId, long_access_token as LongAccessToken, 
                       is_default as IsDefault, last_refreshed_at as LastRefreshedAt,
                       call_count as CallCount, total_time as TotalTime, total_cpu as TotalCpu
                FROM meta_configurations
                ORDER BY is_default DESC, name ASC");
            return configs.ToList();
        }

        public async Task<MetaConfigurationDto?> GetConfigurationAsync(Guid id)
        {
            using var conn = await _db.CreateConnectionAsync();
            return await conn.QueryFirstOrDefaultAsync<MetaConfigurationDto>(@"
                SELECT id, name, app_id as AppId, app_secret as AppSecret, 
                       ig_biz_id as IgBizId, long_access_token as LongAccessToken, 
                       is_default as IsDefault, last_refreshed_at as LastRefreshedAt,
                       call_count as CallCount, total_time as TotalTime, total_cpu as TotalCpu
                FROM meta_configurations
                WHERE id = @id", new { id });
        }

        public async Task<MetaConfigurationDto> CreateConfigurationAsync(MetaConfigurationDto config)
        {
            using var conn = await _db.CreateConnectionAsync();
            var id = Guid.NewGuid();
            
            if (config.IsDefault)
            {
                await conn.ExecuteAsync("UPDATE meta_configurations SET is_default = FALSE");
            }

            await conn.ExecuteAsync(@"
                INSERT INTO meta_configurations (id, name, app_id, app_secret, ig_biz_id, long_access_token, is_default, last_refreshed_at)
                VALUES (@Id, @Name, @AppId, @AppSecret, @IgBizId, @LongAccessToken, @IsDefault, @LastRefreshedAt)",
                new {
                    Id = id,
                    config.Name,
                    config.AppId,
                    config.AppSecret,
                    config.IgBizId,
                    config.LongAccessToken,
                    config.IsDefault,
                    LastRefreshedAt = config.LastRefreshedAt ?? DateTime.UtcNow
                });

            config.Id = id;
            if (config.IsDefault) await ReloadFromDbAsync();
            return config;
        }

        public async Task UpdateConfigurationAsync(MetaConfigurationDto config)
        {
            using var conn = await _db.CreateConnectionAsync();

            if (config.IsDefault)
            {
                await conn.ExecuteAsync("UPDATE meta_configurations SET is_default = FALSE WHERE id <> @Id", new { config.Id });
            }

            await conn.ExecuteAsync(@"
                UPDATE meta_configurations
                SET name = @Name,
                    app_id = @AppId,
                    app_secret = @AppSecret,
                    ig_biz_id = @IgBizId,
                    long_access_token = @LongAccessToken,
                    is_default = @IsDefault,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @Id",
                new {
                    config.Id,
                    config.Name,
                    config.AppId,
                    config.AppSecret,
                    config.IgBizId,
                    config.LongAccessToken,
                    config.IsDefault
                });

            if (config.IsDefault) await ReloadFromDbAsync();
        }

        public async Task DeleteConfigurationAsync(Guid id)
        {
            using var conn = await _db.CreateConnectionAsync();
            var config = await GetConfigurationAsync(id);
            if (config == null) return;

            await conn.ExecuteAsync("DELETE FROM meta_configurations WHERE id = @id", new { id });
            
            if (config.IsDefault)
            {
                // Set another one as default if any exists
                var next = await conn.QueryFirstOrDefaultAsync<Guid?>("SELECT id FROM meta_configurations LIMIT 1");
                if (next.HasValue)
                {
                    await SetDefaultConfigurationAsync(next.Value);
                }
                else
                {
                    await ReloadFromDbAsync(); // Reset to defaults from config file
                }
            }
        }

        public async Task SetDefaultConfigurationAsync(Guid id)
        {
            using var conn = await _db.CreateConnectionAsync();
            await conn.ExecuteAsync("UPDATE meta_configurations SET is_default = FALSE");
            await conn.ExecuteAsync("UPDATE meta_configurations SET is_default = TRUE WHERE id = @id", new { id });
            await ReloadFromDbAsync();
        }
        // --- Internal Graph API Models (Infrastructure Private) ---

        private class GraphProfileResponse
        {
            [JsonPropertyName("business_discovery")]
            public GraphBusinessDiscovery? BusinessDiscovery { get; set; }

            [JsonPropertyName("error")]
            public GraphError? Error { get; set; }
        }

        private class GraphBusinessDiscovery
        {
            [JsonPropertyName("username")] public string? Username { get; set; }
            [JsonPropertyName("name")] public string? Name { get; set; }
            [JsonPropertyName("biography")] public string? Biography { get; set; }
            [JsonPropertyName("followers_count")] public long FollowersCount { get; set; }
            [JsonPropertyName("follows_count")] public long FollowsCount { get; set; }
            [JsonPropertyName("media_count")] public int MediaCount { get; set; }
            [JsonPropertyName("profile_picture_url")] public string? ProfilePictureUrl { get; set; }
            [JsonPropertyName("website")] public string? Website { get; set; }
            [JsonPropertyName("ig_id")] public JsonElement IgId { get; set; }
            [JsonPropertyName("media")] public GraphMediaPage? Media { get; set; }
        }

        private class GraphMediaPage
        {
            [JsonPropertyName("data")] public List<GraphMediaItem> Data { get; set; } = new();
            [JsonPropertyName("paging")] public GraphPaging? Paging { get; set; }
        }

        private class GraphMediaItem
        {
            [JsonPropertyName("id")] public string? Id { get; set; }
            [JsonPropertyName("caption")] public string? Caption { get; set; }
            [JsonPropertyName("media_url")] public string? MediaUrl { get; set; }
            [JsonPropertyName("thumbnail_url")] public string? ThumbnailUrl { get; set; }
            [JsonPropertyName("permalink")] public string? Permalink { get; set; }
            [JsonPropertyName("like_count")] public long LikeCount { get; set; }
            [JsonPropertyName("comments_count")] public long CommentsCount { get; set; }
            [JsonPropertyName("timestamp")] public string? Timestamp { get; set; }
            [JsonPropertyName("media_type")] public string? MediaType { get; set; }
            [JsonPropertyName("media_product_type")] public string? MediaProductType { get; set; }
            [JsonPropertyName("children")] public GraphMediaPage? Children { get; set; }
        }

        private class GraphPaging
        {
            [JsonPropertyName("cursors")] public GraphCursors? Cursors { get; set; }
            [JsonPropertyName("next")] public string? Next { get; set; }
        }

        private class GraphCursors
        {
            [JsonPropertyName("before")] public string? Before { get; set; }
            [JsonPropertyName("after")] public string? After { get; set; }
        }

        private class GraphTokenRefreshResponse
        {
            [JsonPropertyName("access_token")] public string? AccessToken { get; set; }
            [JsonPropertyName("expires_in")] public long ExpiresIn { get; set; }
            [JsonPropertyName("error")] public GraphError? Error { get; set; }
        }

        private class GraphError
        {
            [JsonPropertyName("message")] public string? Message { get; set; }
            [JsonPropertyName("code")] public int Code { get; set; }
        }

        private class GraphCommentsResponse
        {
            [JsonPropertyName("data")] public List<GraphCommentItem> Data { get; set; } = new();
            [JsonPropertyName("paging")] public GraphPaging? Paging { get; set; }
            [JsonPropertyName("error")] public GraphError? Error { get; set; }
        }

        private class GraphCommentItem
        {
            [JsonPropertyName("id")] public string? Id { get; set; }
            [JsonPropertyName("timestamp")] public string? Timestamp { get; set; }
            [JsonPropertyName("created_time")] public string? CreatedTime { get; set; }
            [JsonPropertyName("text")] public string? Text { get; set; }
            [JsonPropertyName("message")] public string? Message { get; set; }
            [JsonPropertyName("like_count")] public long LikeCount { get; set; }
            [JsonPropertyName("hidden")] public bool? Hidden { get; set; }
            [JsonPropertyName("from")] public GraphCommentUser? From { get; set; }
        }

        private class GraphCommentUser
        {
            [JsonPropertyName("id")] public string? Id { get; set; }
            [JsonPropertyName("username")] public string? Username { get; set; }
            [JsonPropertyName("name")] public string? Name { get; set; }
        }

        private class MetaAppUsageHeader
        {
            [JsonPropertyName("call_count")] public int CallCount { get; set; }
            [JsonPropertyName("total_cputime")] public int TotalCpuTime { get; set; }
            [JsonPropertyName("total_time")] public int TotalTime { get; set; }
        }
    }
}

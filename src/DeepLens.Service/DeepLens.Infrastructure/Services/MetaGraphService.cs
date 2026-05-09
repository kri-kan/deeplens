using System.Data;
using System.Text.Json;
using System.Text.Json.Serialization;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Domain.Enums;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Distributed;
using Polly;
using Polly.Retry;

namespace DeepLens.Infrastructure.Services
{
    public class MetaOptions
    {
        public string ApiVersion { get; set; } = "v25.0";
        public string BaseUrl { get; set; } = "https://graph.facebook.com";
        public string AppId { get; set; } = string.Empty;
        public string AppSecret { get; set; } = string.Empty;
        public string IgBizId { get; set; } = string.Empty;
        public string AccessToken { get; set; } = string.Empty;
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
        private readonly AsyncRetryPolicy<HttpResponseMessage> _retryPolicy;
        private MetaOptions _opts;

        public string? LastRawResponse { get; private set; }
        public MetaCallDetails? LastCall { get; private set; }

        public MetaGraphService(
            ILogger<MetaGraphService> logger,
            IConfiguration configuration,
            HttpClient httpClient,
            IAppSettingsService appSettings,
            IDistributedCache cache)
        {
            _logger = logger;
            _configuration = configuration;
            _httpClient = httpClient;
            _appSettings = appSettings;
            _cache = cache;
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
            var allSettings = await _appSettings.GetAllAsync();
            var metaSettings = allSettings.Where(s => s.Key.StartsWith("Meta:")).ToDictionary(s => s.Key, s => s.Value);

            void Override(string key, Action<string> apply)
            {
                if (metaSettings.TryGetValue(key, out var v) && !string.IsNullOrWhiteSpace(v))
                    apply(v);
            }

            Override("Meta:AppId",                  v => opts.AppId = v);
            Override("Meta:AppSecret",              v => opts.AppSecret = v);
            Override("Meta:IgBizId",                v => opts.IgBizId = v);
            Override("Meta:AccessToken",            v => opts.AccessToken = v);
            Override("Meta:SyncIntervalMinutes",    v => { if (int.TryParse(v, out var i)) opts.SyncIntervalMinutes = i; });
            Override("Meta:EngagementRefreshLimit", v => { if (int.TryParse(v, out var i)) opts.EngagementRefreshLimit = i; });
            Override("Meta:TokenLastRefreshed",     v => { if (DateTime.TryParse(v, out var d)) opts.TokenLastRefreshed = d.ToUniversalTime(); });
            Override("Meta:ThrottleIntervalMs",    v => { if (int.TryParse(v, out var i)) opts.ThrottleIntervalMs = i; });

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
            opts.AccessToken = section["AccessToken"] ?? opts.AccessToken;
            
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
                          $"?grant_type=ig_refresh_token&access_token={_opts.AccessToken}";

                var response = await _retryPolicy.ExecuteAsync(() => _httpClient.GetAsync(url));
                var body = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<GraphTokenRefreshResponse>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (result?.AccessToken != null)
                {
                    await PersistNewTokenAsync(result.AccessToken);
                    return true;
                }

                _logger.LogWarning("Standard refresh failed. Attempting short-to-long exchange...");
                var exchangedToken = await ExchangeForLongLivedTokenAsync(_opts.AccessToken);
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
            _opts.AccessToken = token;
            _opts.TokenLastRefreshed = DateTime.UtcNow;
            await _appSettings.UpsertAsync("Meta:AccessToken", token);
            await _appSettings.UpsertAsync("Meta:TokenLastRefreshed", _opts.TokenLastRefreshed.ToString("O"));
            _logger.LogInformation("Meta token updated and persisted to settings.");
        }

        public async Task<string?> ExchangeForLongLivedTokenAsync(string shortLivedToken)
        {
            try
            {
                var url = $"{_opts.BaseUrl}/{_opts.ApiVersion}/oauth/access_token" +
                          $"?grant_type=fb_exchange_token" +
                          $"&client_id={_opts.AppId}" +
                          $"&client_secret={_opts.AppSecret}" +
                          $"&fb_exchange_token={shortLivedToken}";

                _logger.LogInformation("Exchanging short-lived token for long-lived Meta token...");
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
                    _opts.AccessToken = result.AccessToken;
                    _opts.TokenLastRefreshed = DateTime.UtcNow;

                    await _appSettings.UpsertAsync("Meta:AccessToken", result.AccessToken);
                    await _appSettings.UpsertAsync("Meta:TokenLastRefreshed", _opts.TokenLastRefreshed.ToString("O"));

                    _logger.LogInformation("Token exchanged and persisted to DB. Expires in {Days} days.", result.ExpiresIn / 86400);
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
                var m = JsonSerializer.Deserialize<GraphMediaItem>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (m == null || string.IsNullOrEmpty(m.Id)) return null;

                return new MetaPost
                {
                    Id = m.Id,
                    Caption = m.Caption,
                    MediaUrl = m.MediaUrl,
                    ThumbnailUrl = m.ThumbnailUrl,
                    Permalink = m.Permalink,
                    LikeCount = m.LikeCount,
                    CommentCount = m.CommentsCount,
                    Timestamp = m.Timestamp,
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch single post {PostId} from Graph API", postId);
                return null;
            }
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

                var newPosts = discovery.Media.Data.Select(m => new MetaPost {
                    Id = m.Id,
                    Caption = m.Caption,
                    MediaUrl = m.MediaUrl,
                    ThumbnailUrl = m.ThumbnailUrl,
                    Permalink = m.Permalink,
                    LikeCount = m.LikeCount,
                    CommentCount = m.CommentsCount,
                    Timestamp = m.Timestamp,
                    MediaType = InstagramMediaStandardizer.MapToMediaType(m.MediaType),
                    MediaProductType = m.MediaProductType,
                    Children = m.Children?.Data?.Select(c => new MetaPost {
                        Id = c.Id,
                        MediaUrl = c.MediaUrl,
                        ThumbnailUrl = c.ThumbnailUrl,
                        MediaType = InstagramMediaStandardizer.MapToMediaType(c.MediaType)
                    }).ToList()
                }).ToList();

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
            return $"{_opts.BaseUrl}/{_opts.ApiVersion}{path}?fields={Uri.EscapeDataString(fields)}&access_token={_opts.AccessToken}";
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
                var metrics = JsonSerializer.Deserialize<AppUsageMetrics>(usageHeader, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (metrics != null)
                {
                    await _cache.SetStringAsync("meta:usage_metrics_v2", JsonSerializer.Serialize(metrics), new DistributedCacheEntryOptions {
                        AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
                    });
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
                    RequestUrl = url.Replace(_opts.AccessToken, "REDACTED"),
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
    }
}

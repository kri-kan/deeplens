using System.Text.Json;
using System.Text.Json.Serialization;

namespace CompetitorIntel.Orchestrator.Services
{
    /// <summary>
    /// Strongly-typed config for the Meta Graph API.
    /// Values come from appsettings.json / environment variables (Meta__AccessToken etc.)
    /// </summary>
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
    }

    // ───── Graph API Response Models ─────

    public class GraphProfileResponse
    {
        [JsonPropertyName("business_discovery")]
        public GraphBusinessDiscovery? BusinessDiscovery { get; set; }

        [JsonPropertyName("error")]
        public GraphError? Error { get; set; }
    }

    public class GraphBusinessDiscovery
    {
        [JsonPropertyName("username")]
        public string? Username { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("biography")]
        public string? Biography { get; set; }

        [JsonPropertyName("followers_count")]
        public long FollowersCount { get; set; }

        [JsonPropertyName("media_count")]
        public int MediaCount { get; set; }

        [JsonPropertyName("profile_picture_url")]
        public string? ProfilePictureUrl { get; set; }

        [JsonPropertyName("website")]
        public string? Website { get; set; }

        [JsonPropertyName("media")]
        public GraphMediaPage? Media { get; set; }
    }

    public class GraphMediaPage
    {
        [JsonPropertyName("data")]
        public List<GraphMediaItem> Data { get; set; } = new();

        [JsonPropertyName("paging")]
        public GraphPaging? Paging { get; set; }
    }

    public class GraphMediaItem
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("caption")]
        public string? Caption { get; set; }

        [JsonPropertyName("media_url")]
        public string? MediaUrl { get; set; }

        [JsonPropertyName("thumbnail_url")]
        public string? ThumbnailUrl { get; set; }

        [JsonPropertyName("permalink")]
        public string? Permalink { get; set; }

        [JsonPropertyName("like_count")]
        public long LikeCount { get; set; }

        [JsonPropertyName("comments_count")]
        public long CommentsCount { get; set; }

        [JsonPropertyName("timestamp")]
        public string? Timestamp { get; set; }

        [JsonPropertyName("media_type")]
        public string? MediaType { get; set; }
    }

    public class GraphPaging
    {
        [JsonPropertyName("cursors")]
        public GraphCursors? Cursors { get; set; }

        [JsonPropertyName("next")]
        public string? Next { get; set; }
    }

    public class GraphCursors
    {
        [JsonPropertyName("before")]
        public string? Before { get; set; }

        [JsonPropertyName("after")]
        public string? After { get; set; }
    }

    public class GraphTokenRefreshResponse
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }

        [JsonPropertyName("token_type")]
        public string? TokenType { get; set; }

        [JsonPropertyName("expires_in")]
        public long ExpiresIn { get; set; }

        [JsonPropertyName("error")]
        public GraphError? Error { get; set; }
    }

    public class GraphError
    {
        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("code")]
        public int Code { get; set; }
    }

    // ───── Service ─────

    /// <summary>
    /// Low-level client for the Facebook Graph API v25.0 Business Discovery API.
    /// Handles token refresh, profile lookup, and post/engagement fetching.
    /// </summary>
    public class MetaGraphService
    {
        private readonly ILogger<MetaGraphService> _logger;
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        private MetaOptions _opts;

        public MetaGraphService(
            ILogger<MetaGraphService> logger,
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _configuration = configuration;
            _httpClient = httpClientFactory.CreateClient("MetaGraph");
            _opts = LoadOptions();
        }

        private MetaOptions LoadOptions()
        {
            var opts = new MetaOptions();
            _configuration.GetSection("Meta").Bind(opts);
            return opts;
        }

        // ── Public API ──

        /// <summary>Returns current token health info (days until 60-day expiry).</summary>
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

        /// <summary>
        /// Step B from the spec: refresh the long-lived token via graph.instagram.com.
        /// Call this every ~50 days to reset the 60-day clock.
        /// </summary>
        public async Task<bool> RefreshTokenAsync()
        {
            try
            {
                var url = $"https://graph.instagram.com/refresh_access_token" +
                          $"?grant_type=ig_refresh_token&access_token={_opts.AccessToken}";

                _logger.LogInformation("Refreshing Meta long-lived token...");
                var response = await _httpClient.GetAsync(url);
                var body = await response.Content.ReadAsStringAsync();

                var result = JsonSerializer.Deserialize<GraphTokenRefreshResponse>(body);

                if (result?.Error != null)
                {
                    _logger.LogError("Token refresh failed: {Msg}", result.Error.Message);
                    return false;
                }

                if (!string.IsNullOrEmpty(result?.AccessToken))
                {
                    // Persist new token + reset timestamp in config (runtime only; 
                    // on-disk update requires the operator to copy the token to env vars)
                    _opts.AccessToken = result.AccessToken;
                    _opts.TokenLastRefreshed = DateTime.UtcNow;
                    _logger.LogInformation("Token refreshed successfully. Expires in {Days} days.", result.ExpiresIn / 86400);
                    return true;
                }

                _logger.LogError("Token refresh returned empty token. Response: {Body}", body);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception during token refresh");
                return false;
            }
        }

        /// <summary>
        /// Step 3A: Business Discovery profile fetch.
        /// Returns follower count, media count, bio.
        /// </summary>
        public async Task<GraphBusinessDiscovery?> GetProfileAsync(string targetUsername)
        {
            var fields = $"business_discovery.username({targetUsername}){{followers_count,media_count,biography,name,profile_picture_url,website}}";
            var url = BuildUrl($"/{_opts.IgBizId}", fields);

            _logger.LogInformation("Fetching Graph API profile for @{Username}", targetUsername);
            return await ExecuteBusinessDiscoveryAsync(url);
        }

        /// <summary>
        /// Step 3B: Full initial media scrape — returns list of all post fields.
        /// Follows pagination automatically (up to maxPages pages).
        /// </summary>
        public async Task<List<GraphMediaItem>> GetPostsAsync(string targetUsername, int maxPages = 10)
        {
            var mediaFields = "id,caption,media_url,thumbnail_url,permalink,like_count,comments_count,timestamp,media_type";
            var fields = $"business_discovery.username({targetUsername}){{media{{{mediaFields}}}}}";
            var url = BuildUrl($"/{_opts.IgBizId}", fields);

            _logger.LogInformation("Fetching all posts for @{Username}", targetUsername);

            var allPosts = new List<GraphMediaItem>();
            int page = 0;

            while (!string.IsNullOrEmpty(url) && page < maxPages)
            {
                var discovery = await ExecuteBusinessDiscoveryAsync(url);
                if (discovery?.Media?.Data == null) break;

                allPosts.AddRange(discovery.Media.Data);
                page++;

                // Follow the "next" cursor if available
                url = discovery.Media.Paging?.Next;
                if (!string.IsNullOrEmpty(url))
                {
                    _logger.LogInformation("Fetching page {Page} for @{Username}", page + 1, targetUsername);
                }
            }

            _logger.LogInformation("Fetched {Count} posts for @{Username} across {Pages} pages", allPosts.Count, targetUsername, page);
            return allPosts;
        }

        /// <summary>
        /// Step 3C: Engagement refresh — only fetches id, like_count, comments_count
        /// for the most recent N posts. Used to update stats on already-known posts.
        /// </summary>
        public async Task<List<GraphMediaItem>> GetPostEngagementAsync(string targetUsername, int limit = 20)
        {
            var fields = $"business_discovery.username({targetUsername}){{media.limit({limit}){{id,like_count,comments_count}}}}";
            var url = BuildUrl($"/{_opts.IgBizId}", fields);

            _logger.LogInformation("Refreshing engagement for @{Username} (last {Limit} posts)", targetUsername, limit);

            var discovery = await ExecuteBusinessDiscoveryAsync(url);
            return discovery?.Media?.Data ?? new List<GraphMediaItem>();
        }

        // ── Helpers ──

        internal string GetAccessToken() => _opts.AccessToken;
        internal int GetSyncIntervalMinutes() => _opts.SyncIntervalMinutes;
        internal int GetEngagementRefreshLimit() => _opts.EngagementRefreshLimit;

        private string BuildUrl(string path, string fields)
        {
            return $"{_opts.BaseUrl}/{_opts.ApiVersion}{path}" +
                   $"?fields={Uri.EscapeDataString(fields)}" +
                   $"&access_token={_opts.AccessToken}";
        }

        private async Task<GraphBusinessDiscovery?> ExecuteBusinessDiscoveryAsync(string url)
        {
            try
            {
                var response = await _httpClient.GetAsync(url);
                var body = await response.Content.ReadAsStringAsync();

                var result = JsonSerializer.Deserialize<GraphProfileResponse>(body,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (result?.Error != null)
                {
                    _logger.LogError("Graph API error: [{Code}] {Msg}", result.Error.Code, result.Error.Message);
                    return null;
                }

                return result?.BusinessDiscovery;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception calling Graph API: {Url}", url.Split('?')[0]);
                return null;
            }
        }
    }

    public class TokenHealthInfo
    {
        public DateTime LastRefreshed { get; set; }
        public DateTime ExpiresAt { get; set; }
        public int DaysRemaining { get; set; }
        public bool NeedsRefresh { get; set; }
        public bool IsExpired { get; set; }
    }
}

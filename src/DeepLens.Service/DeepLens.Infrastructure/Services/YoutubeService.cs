using System.Data;
using System.Text.Json;
using Dapper;
using DeepLens.Application.Abstractions.Data;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Contracts.Youtube;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Requests;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Services;
using Google.Apis.YouTube.v3;
using Google.Apis.YouTube.v3.Data;
using Google.Apis.Upload;
using Microsoft.Extensions.Logging;
using DeepLens.Domain.Enums;

namespace DeepLens.Infrastructure.Services
{
    public class YoutubeService : IYoutubeService
    {
        private readonly IDbConnectionFactory _db;
        private readonly IAppSettingsService _appSettings;
        private readonly IStorageService _storage;
        private readonly ILogger<YoutubeService> _logger;
        
        private string? _clientId;
        private string? _clientSecret;
        private string? _accessToken;
        private string? _refreshToken;
        private string? _redirectUri;
        private DateTime _tokenLastRefreshed;
        private DateTime _quotaLastUpdated;
        private int _dailyQuotaLimit = 10000;
        private int _currentQuotaUsage = 0;
        private string _defaultCategoryId = "22";
        private string _defaultPrivacyStatus = "private";

        public YoutubeService(
            IDbConnectionFactory db,
            IAppSettingsService appSettings,
            IStorageService storage,
            ILogger<YoutubeService> logger)
        {
            _db = db;
            _appSettings = appSettings;
            _storage = storage;
            _logger = logger;
        }

        public async Task ReloadFromDbAsync()
        {
            var settings = await _appSettings.GetSectionInternalAsync("YouTube");
            var dict = settings.ToDictionary(s => s.Key, s => s.Value, StringComparer.OrdinalIgnoreCase);

            _clientId = dict.GetValueOrDefault("Youtube:ClientId", "");
            _clientSecret = dict.GetValueOrDefault("Youtube:ClientSecret", "");
            _redirectUri = dict.GetValueOrDefault("Youtube:RedirectUri", "http://localhost:5002/oauth2callback");

            _accessToken = dict.GetValueOrDefault("Youtube:AccessToken");
            _refreshToken = dict.GetValueOrDefault("Youtube:RefreshToken");
            
            if (DateTime.TryParse(dict.GetValueOrDefault("Youtube:TokenLastRefreshed"), out var dt))
                _tokenLastRefreshed = dt;

            if (DateTime.TryParse(dict.GetValueOrDefault("Youtube:QuotaLastUpdated"), out var qdt))
                _quotaLastUpdated = qdt;
                
            if (int.TryParse(dict.GetValueOrDefault("Youtube:DailyQuotaLimit"), out var limit))
                _dailyQuotaLimit = limit;
                
            if (int.TryParse(dict.GetValueOrDefault("Youtube:CurrentQuotaUsage"), out var usage))
                _currentQuotaUsage = usage;

            _defaultCategoryId = dict.GetValueOrDefault("Youtube:DefaultCategoryId", "22");
            _defaultPrivacyStatus = dict.GetValueOrDefault("Youtube:DefaultPrivacyStatus", "private");

            // TimeZoneInfo for Pacific Time (YouTube official timezone)
            var pacificZone = TimeZoneInfo.FindSystemTimeZoneById("America/Los_Angeles");
            
            // Convert to PT, ensuring UTC input
            var nowUtc = DateTime.UtcNow;
            var lastUpdatedUtc = _quotaLastUpdated;
            if (lastUpdatedUtc.Kind != DateTimeKind.Utc) lastUpdatedUtc = DateTime.SpecifyKind(lastUpdatedUtc, DateTimeKind.Utc);
            if (lastUpdatedUtc.Year < 1900) lastUpdatedUtc = nowUtc.AddDays(-1);

            var nowPt = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, pacificZone);
            var lastUpdatedPt = TimeZoneInfo.ConvertTimeFromUtc(lastUpdatedUtc, pacificZone);

            // Reset quota if day has changed in Pacific Time
            if (lastUpdatedPt.Date != nowPt.Date)
            {
                _logger.LogInformation("YouTube quota date changed (PT) from {Last} to {Current}. Resetting usage.", lastUpdatedPt.Date, nowPt.Date);
                _currentQuotaUsage = 0;
                _quotaLastUpdated = DateTime.UtcNow;
                await _appSettings.UpsertAsync("Youtube:CurrentQuotaUsage", "0");
                await _appSettings.UpsertAsync("Youtube:QuotaLastUpdated", _quotaLastUpdated.ToString("O"));
            }
        }

        public async Task<YoutubeTokenHealth> GetTokenHealthAsync()
        {
            await ReloadFromDbAsync();
            var isAuth = !string.IsNullOrEmpty(_refreshToken);
                
            return new YoutubeTokenHealth
            {
                LastRefreshed = _tokenLastRefreshed,
                NeedsRefresh = (DateTime.UtcNow - _tokenLastRefreshed).TotalHours > 1,
                IsAuthorized = isAuth
            };
        }

        public async Task<YoutubeQuotaInfo> GetQuotaAsync()
        {
            await ReloadFromDbAsync();
            var pacificZone = TimeZoneInfo.FindSystemTimeZoneById("America/Los_Angeles");
            var nowPt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, pacificZone);
            var nextMidnightPt = nowPt.Date.AddDays(1);
            var hoursUntilReset = (nextMidnightPt - nowPt).TotalHours;

            var nextResetUtc = TimeZoneInfo.ConvertTimeToUtc(nextMidnightPt, pacificZone);

            return new YoutubeQuotaInfo
            {
                DailyLimit = _dailyQuotaLimit,
                CurrentUsage = _currentQuotaUsage,
                RemainingUnits = Math.Max(0, _dailyQuotaLimit - _currentQuotaUsage),
                LastUpdated = DateTime.UtcNow,
                HoursUntilReset = Math.Round(hoursUntilReset, 1),
                NextResetTime = nextResetUtc
            };
        }

        public async Task<bool> AuthenticateAsync(string authCode, string redirectUri)
        {
            await ReloadFromDbAsync();
            
            if (string.IsNullOrEmpty(_clientId) || string.IsNullOrEmpty(_clientSecret))
            {
                _logger.LogError("YouTube ClientId or ClientSecret is missing in settings.");
                return false;
            }

            var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
            {
                ClientSecrets = new ClientSecrets { ClientId = _clientId, ClientSecret = _clientSecret },
                Scopes = new[] { YouTubeService.Scope.YoutubeUpload, YouTubeService.Scope.YoutubeReadonly }
            });

            var token = await flow.ExchangeCodeForTokenAsync("user", authCode, redirectUri, CancellationToken.None);
            
            await PersistTokenAsync(token);
            return true;
        }

        public async Task<bool> RefreshTokenAsync()
        {
            await ReloadFromDbAsync();
            
            if (string.IsNullOrEmpty(_refreshToken)) return false;

            var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
            {
                ClientSecrets = new ClientSecrets { ClientId = _clientId, ClientSecret = _clientSecret }
            });

            var token = await flow.RefreshTokenAsync("user", _refreshToken, CancellationToken.None);
            
            await PersistTokenAsync(token);
            return true;
        }

        public async Task<bool> DisconnectAsync()
        {
            _accessToken = null;
            _refreshToken = null;

            await _appSettings.UpsertAsync("Youtube:AccessToken", "");
            await _appSettings.UpsertAsync("Youtube:RefreshToken", "");
            
            _logger.LogInformation("YouTube account disconnected successfully.");
            return true;
        }

        public async Task<string> GetAuthUrlAsync(string redirectUri)
        {
            await ReloadFromDbAsync();
            
            var effectiveRedirectUri = !string.IsNullOrEmpty(redirectUri) ? redirectUri : _redirectUri;
            
            if (string.IsNullOrEmpty(_clientId)) throw new Exception("YouTube Client ID is not configured in settings.");
            if (string.IsNullOrEmpty(effectiveRedirectUri)) throw new Exception("Redirect URI is required but not provided.");

            var flow = new GoogleAuthorizationCodeFlow(new GoogleAuthorizationCodeFlow.Initializer
            {
                ClientSecrets = new ClientSecrets { ClientId = _clientId, ClientSecret = _clientSecret },
                Scopes = new[] { YouTubeService.Scope.YoutubeUpload, YouTubeService.Scope.YoutubeReadonly }
            });

            var request = new GoogleAuthorizationCodeRequestUrl(new Uri(flow.AuthorizationServerUrl))
            {
                ClientId = _clientId,
                RedirectUri = effectiveRedirectUri,
                Scope = string.Join(" ", new[] { YouTubeService.Scope.YoutubeUpload, YouTubeService.Scope.YoutubeReadonly }),
                AccessType = "offline",
                Prompt = "consent"
            };
            
            return request.Build().ToString();
        }

        private async Task PersistTokenAsync(TokenResponse token)
        {
            _accessToken = token.AccessToken;
            if (!string.IsNullOrEmpty(token.RefreshToken)) _refreshToken = token.RefreshToken;
            _tokenLastRefreshed = DateTime.UtcNow;

            await _appSettings.UpsertAsync("Youtube:AccessToken", _accessToken);
            if (!string.IsNullOrEmpty(_refreshToken))
                await _appSettings.UpsertAsync("Youtube:RefreshToken", _refreshToken);
            await _appSettings.UpsertAsync("Youtube:TokenLastRefreshed", _tokenLastRefreshed.ToString("O"));
            
            _logger.LogInformation("YouTube token persisted.");
        }

        public async Task<YoutubeUploadResponse> UploadVideoAsync(YoutubeUploadRequest request)
        {
            _logger.LogInformation("YouTube Upload Request: {Request}", JsonSerializer.Serialize(request));
            await ReloadFromDbAsync();
            
            // Check quota (1600 units for upload)
            if (_currentQuotaUsage + 1600 > _dailyQuotaLimit)
            {
                throw new InvalidOperationException("YouTube API quota exceeded for today.");
            }

            // 1. Get Actual Video Path from Media Table
            using var conn = await _db.CreateConnectionAsync();
            string? storagePath = null;

            if (request.MediaId.HasValue)
            {
                // Try direct media lookup
                storagePath = await conn.QueryFirstOrDefaultAsync<string>(@"
                    SELECT storage_path FROM media 
                    WHERE id = @MediaId AND media_type IN (2, 10)", 
                    new { MediaId = request.MediaId.Value });

                // Fallback: If not found, check if it's a competitor_video ID that has a linked video
                if (string.IsNullOrEmpty(storagePath))
                {
                    storagePath = await conn.QueryFirstOrDefaultAsync<string>(@"
                        SELECT m.storage_path 
                        FROM media m
                        JOIN media_links ml ON m.id = ml.media_id
                        WHERE ml.entity_id = @MediaId AND ml.entity_type = 'competitor_video'
                        AND m.media_type IN (2, 10)
                        ORDER BY ml.is_primary DESC, ml.display_order ASC
                        LIMIT 1", new { MediaId = request.MediaId.Value });
                }
            }

            if (string.IsNullOrEmpty(storagePath)) 
            {
                _logger.LogWarning("Video file not found for mediaId {MediaId}. Registry lookup returned null.", request.MediaId);
                throw new Exception("Video file not found in media registry. Ensure the ID points to a valid video or a post with a linked video.");
            }

            _logger.LogInformation("Found video path: {Path}. Retrieving from storage...", storagePath);
            var fileLength = await _storage.GetFileLengthAsync(storagePath);
            using var videoStream = await _storage.GetFileAsync(storagePath);

            // 2. Prepare YouTube Service
            var youtubeService = await CreateServiceAsync();

            var video = new Video
            {
                Snippet = new VideoSnippet
                {
                    Title = request.IsShort ? $"{request.Title} #Shorts" : request.Title,
                    Description = request.IsShort ? $"{request.Description}\n\n#Shorts" : request.Description,
                    Tags = request.Tags,
                    CategoryId = _defaultCategoryId,
                },
                Status = new VideoStatus
                {
                    PrivacyStatus = _defaultPrivacyStatus,
                    SelfDeclaredMadeForKids = false
                }
            };

            if (request.ScheduleTime.HasValue)
            {
                video.Status.PublishAtDateTimeOffset = request.ScheduleTime.Value.ToUniversalTime();
            }

            // 3. Execute Upload
            var videosInsertRequest = youtubeService.Videos.Insert(video, "snippet,status", videoStream, "video/*");
            videosInsertRequest.ChunkSize = ResumableUpload.MinimumChunkSize;
            
            var progress = await videosInsertRequest.UploadAsync();
            
            if (progress.Status == Google.Apis.Upload.UploadStatus.Failed)
            {
                _logger.LogError("YouTube upload failed: {Msg}", progress.Exception.Message);
                throw progress.Exception;
            }

            var uploadedVideo = videosInsertRequest.ResponseBody;
            
            // 4. Track Quota
            await TrackQuotaAsync(1600);

            var videoUrl = $"https://www.youtube.com/watch?v={uploadedVideo.Id}";
            return new YoutubeUploadResponse
            {
                VideoId = uploadedVideo.Id,
                VideoUrl = videoUrl,
                Status = video.Status.PrivacyStatus,
                ScheduledTime = request.ScheduleTime
            };
        }

        public async Task<DateTime> GetNextScheduleSlotAsync()
        {
            using var conn = await _db.CreateConnectionAsync();
            var lastScheduled = await conn.QueryFirstOrDefaultAsync<DateTime?>(@"
                SELECT MAX(scheduled_publish_time) FROM competitor_videos 
                WHERE scheduled_publish_time > NOW()");

            var intervalHours = int.Parse((await _appSettings.GetSectionAsync("YouTube"))
                .FirstOrDefault(s => s.Key == "Youtube:SchedulingIntervalHours")?.Value ?? "6");

            var nextSlot = lastScheduled?.AddHours(intervalHours) ?? DateTime.UtcNow.AddHours(1);
            
            // Round to nearest 30 mins for cleanliness
            return new DateTime(nextSlot.Year, nextSlot.Month, nextSlot.Day, nextSlot.Hour, (nextSlot.Minute / 30) * 30, 0, DateTimeKind.Utc);
        }

        private async Task<YouTubeService> CreateServiceAsync()
        {
            if ((await GetTokenHealthAsync()).NeedsRefresh)
            {
                await RefreshTokenAsync();
            }

            return new YouTubeService(new BaseClientService.Initializer
            {
                HttpClientInitializer = GoogleCredential.FromAccessToken(_accessToken),
                ApplicationName = "DeepLens"
            });
        }

        private async Task TrackQuotaAsync(int units)
        {
            _currentQuotaUsage += units;
            _quotaLastUpdated = DateTime.UtcNow;
            await _appSettings.UpsertAsync("Youtube:CurrentQuotaUsage", _currentQuotaUsage.ToString());
            await _appSettings.UpsertAsync("Youtube:QuotaLastUpdated", _quotaLastUpdated.ToString("O"));
        }
    }
}

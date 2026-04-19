using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using DeepLens.SearchApi.DTOs.Instagram;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Dapper;
using Npgsql;

namespace DeepLens.SearchApi.Services
{
    public class InstagramSidecarService : IInstagramSidecarService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<InstagramSidecarService> _logger;
        private readonly JsonSerializerOptions _jsonOptions;
        private readonly string _connectionString;
        private const int CacheExpirationDays = 90;

        public InstagramSidecarService(HttpClient httpClient, IConfiguration config, ILogger<InstagramSidecarService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _connectionString = config.GetConnectionString("DefaultConnection") 
                             ?? throw new InvalidOperationException("DefaultConnection string not found");
            
            var baseUrl = config["SidecarServices:InstagramApiUrl"] ?? "http://instagram-sidecar:8005";
            _httpClient.BaseAddress = new Uri(baseUrl);
            
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
            };
        }

        private async Task<NpgsqlConnection> GetConnectionAsync()
        {
            var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            return conn;
        }

        public async Task<InstagramProfileDto?> GetProfileAsync(string username)
        {
            try
            {
                // 1. Try Cache First
                var cachedProfile = await GetCachedProfileAsync(username);
                if (cachedProfile != null)
                {
                    _logger.LogInformation("Found cached Instagram profile for {Username}", username);
                    return cachedProfile;
                }

                // 2. Clear to scrape (either not in cache or expired)
                _logger.LogInformation("Requesting fresh Instagram profile for {Username} from sidecar", username);
                var response = await _httpClient.GetAsync($"/profile/{username}");
                
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    _logger.LogWarning("Instagram profile {Username} not found", username);
                    return null;
                }
                
                response.EnsureSuccessStatusCode();
                var profile = await response.Content.ReadFromJsonAsync<InstagramProfileDto>(_jsonOptions);

                if (profile != null)
                {
                    // 3. Update Cache
                    await SaveToCacheAsync(profile);
                }

                return profile;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching Instagram profile for {Username}", username);
                throw;
            }
        }

        private async Task<InstagramProfileDto?> GetCachedProfileAsync(string username)
        {
            using var conn = await GetConnectionAsync();
            return await conn.QuerySingleOrDefaultAsync<InstagramProfileDto>(
                @"SELECT user_id as UserId, username as Username, full_name as FullName, biography as Biography, 
                         followers_count as Followers, following_count as Following, posts_count as PostsCount, 
                         external_url as ExternalUrl, is_private as IsPrivate, is_verified as IsVerified, 
                         profile_pic_url as ProfilePicUrl
                  FROM instagram_profile_cache 
                  WHERE username = @Username AND scraped_at > NOW() - INTERVAL '1 day' * @Days",
                new { Username = username, Days = CacheExpirationDays }
            );
        }

        private async Task SaveToCacheAsync(InstagramProfileDto profile)
        {
            try 
            {
                using var conn = await GetConnectionAsync();
                await conn.ExecuteAsync(
                    @"INSERT INTO instagram_profile_cache (
                        username, user_id, full_name, biography, followers_count, 
                        following_count, posts_count, external_url, is_private, 
                        is_verified, profile_pic_url, scraped_at
                      ) VALUES (
                        @Username, @UserId, @FullName, @Biography, @Followers, 
                        @Following, @PostsCount, @ExternalUrl, @IsPrivate, 
                        @IsVerified, @ProfilePicUrl, NOW()
                      )
                      ON CONFLICT (username) DO UPDATE SET
                        user_id = EXCLUDED.user_id,
                        full_name = EXCLUDED.full_name,
                        biography = EXCLUDED.biography,
                        followers_count = EXCLUDED.followers_count,
                        following_count = EXCLUDED.following_count,
                        posts_count = EXCLUDED.posts_count,
                        external_url = EXCLUDED.external_url,
                        is_private = EXCLUDED.is_private,
                        is_verified = EXCLUDED.is_verified,
                        profile_pic_url = EXCLUDED.profile_pic_url,
                        scraped_at = NOW()",
                    profile
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to update Instagram profile cache for {Username}", profile.Username);
                // Don't fail the request if cache update fails
            }
        }

        public async Task<List<InstagramPostDto>> GetRecentPostsAsync(string username, int count = 10)
        {
            try
            {
                _logger.LogInformation("Requesting {Count} recent Instagram posts for {Username} from sidecar", count, username);
                var response = await _httpClient.GetAsync($"/profile/{username}/posts?count={count}");
                
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    _logger.LogWarning("Instagram profile {Username} not found while fetching posts", username);
                    return new List<InstagramPostDto>();
                }
                
                response.EnsureSuccessStatusCode();
                var posts = await response.Content.ReadFromJsonAsync<List<InstagramPostDto>>(_jsonOptions);
                return posts ?? new List<InstagramPostDto>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching recent Instagram posts for {Username}", username);
                return new List<InstagramPostDto>();
            }
        }
    }
}

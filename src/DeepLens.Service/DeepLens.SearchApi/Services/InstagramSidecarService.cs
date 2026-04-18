using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using DeepLens.SearchApi.DTOs.Instagram;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DeepLens.SearchApi.Services
{
    public class InstagramSidecarService : IInstagramSidecarService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<InstagramSidecarService> _logger;
        private readonly JsonSerializerOptions _jsonOptions;

        public InstagramSidecarService(HttpClient httpClient, IConfiguration config, ILogger<InstagramSidecarService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            
            var baseUrl = config["SidecarServices:InstagramApiUrl"] ?? "http://instagram-sidecar:8005";
            _httpClient.BaseAddress = new Uri(baseUrl);
            
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
            };
        }

        public async Task<InstagramProfileDto?> GetProfileAsync(string username)
        {
            try
            {
                _logger.LogInformation("Requesting Instagram profile for {Username} from sidecar", username);
                var response = await _httpClient.GetAsync($"/profile/{username}");
                
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    _logger.LogWarning("Instagram profile {Username} not found", username);
                    return null;
                }
                
                response.EnsureSuccessStatusCode();
                return await response.Content.ReadFromJsonAsync<InstagramProfileDto>(_jsonOptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching Instagram profile for {Username}", username);
                throw;
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

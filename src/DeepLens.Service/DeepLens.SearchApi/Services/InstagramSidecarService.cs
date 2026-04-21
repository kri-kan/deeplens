using DeepLens.Application.Abstractions.Services;
using DeepLens.Contracts.Instagram;

namespace DeepLens.SearchApi.Services;

public class InstagramSidecarService : IInstagramSidecarService
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;

    public InstagramSidecarService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _baseUrl = configuration["Instagram:SidecarUrl"] ?? "http://localhost:8000";
    }

    public async Task<InstagramProfileDto?> GetProfileAsync(string username)
    {
        var response = await _httpClient.GetAsync($"{_baseUrl}/profile/{username}");
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<InstagramProfileDto>();
    }

    public async Task<List<InstagramPostDto>> GetRecentPostsAsync(string username, int count = 10)
    {
        var response = await _httpClient.GetAsync($"{_baseUrl}/posts/{username}?limit={count}");
        if (!response.IsSuccessStatusCode) return new List<InstagramPostDto>();
        return await response.Content.ReadFromJsonAsync<List<InstagramPostDto>>() ?? new List<InstagramPostDto>();
    }
}

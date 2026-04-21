using DeepLens.Contracts.Instagram;

namespace DeepLens.Application.Abstractions.Services;

public interface IInstagramSidecarService
{
    Task<InstagramProfileDto?> GetProfileAsync(string username);
    Task<List<InstagramPostDto>> GetRecentPostsAsync(string username, int count = 10);
}

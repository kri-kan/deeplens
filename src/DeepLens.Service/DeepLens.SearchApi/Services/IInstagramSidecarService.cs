using System.Collections.Generic;
using System.Threading.Tasks;
using DeepLens.SearchApi.DTOs.Instagram;

namespace DeepLens.SearchApi.Services
{
    public interface IInstagramSidecarService
    {
        Task<InstagramProfileDto?> GetProfileAsync(string username);
        Task<List<InstagramPostDto>> GetRecentPostsAsync(string username, int count = 10);
    }
}

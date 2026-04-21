using DeepLens.Application.Abstractions.Services;
using DeepLens.Contracts.Instagram;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class InstaController : ControllerBase
{
    private readonly IInstagramSidecarService _instagramSidecar;

    public InstaController(IInstagramSidecarService instagramSidecar)
    {
        _instagramSidecar = instagramSidecar;
    }

    [HttpGet("profile/{username}")]
    public async Task<ActionResult<InstagramProfileDto>> GetProfile(string username)
    {
        var profile = await _instagramSidecar.GetProfileAsync(username);
        if (profile == null) return NotFound();
        return Ok(profile);
    }

    [HttpGet("posts/{username}")]
    public async Task<ActionResult<List<InstagramPostDto>>> GetPosts(string username, [FromQuery] int limit = 10)
    {
        var posts = await _instagramSidecar.GetRecentPostsAsync(username, limit);
        return Ok(posts);
    }
}

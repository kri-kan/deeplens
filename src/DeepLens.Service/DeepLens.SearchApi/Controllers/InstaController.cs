using System.Collections.Generic;
using System.Threading.Tasks;
using DeepLens.SearchApi.DTOs.Instagram;
using DeepLens.SearchApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace DeepLens.SearchApi.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class InstaController : ControllerBase
    {
        private readonly IInstagramSidecarService _instagramService;
        private readonly ILogger<InstaController> _logger;

        public InstaController(IInstagramSidecarService instagramService, ILogger<InstaController> logger)
        {
            _instagramService = instagramService;
            _logger = logger;
        }

        [HttpGet("profile/{username}")]
        public async Task<ActionResult<InstagramProfileDto>> GetProfile(string username)
        {
            if (string.IsNullOrWhiteSpace(username))
                return BadRequest("Username is required");

            try
            {
                var profile = await _instagramService.GetProfileAsync(username);
                if (profile == null)
                    return NotFound(new { message = $"Instagram profile '{username}' not found" });

                return Ok(profile);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve Instagram profile for {Username}", username);
                return StatusCode(500, new { message = "Error communicating with Instagram service", details = ex.Message });
            }
        }

        [HttpGet("profile/{username}/posts")]
        public async Task<ActionResult<List<InstagramPostDto>>> GetRecentPosts(string username, [FromQuery] int count = 10)
        {
            if (string.IsNullOrWhiteSpace(username))
                return BadRequest("Username is required");

            try
            {
                var posts = await _instagramService.GetRecentPostsAsync(username, count);
                return Ok(posts);
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve Instagram posts for {Username}", username);
                return StatusCode(500, new { message = "Error communicating with Instagram service", details = ex.Message });
            }
        }
    }
}

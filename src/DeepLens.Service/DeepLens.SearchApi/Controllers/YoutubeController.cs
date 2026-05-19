using DeepLens.Application.Abstractions.Services;
using DeepLens.Contracts.Youtube;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DeepLens.SearchApi.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [Authorize(Policy = "IngestPolicy")]
    public class YoutubeController : ControllerBase
    {
        private readonly IYoutubeService _youtube;
        private readonly ILogger<YoutubeController> _logger;

        public YoutubeController(IYoutubeService youtube, ILogger<YoutubeController> logger)
        {
            _youtube = youtube;
            _logger = logger;
        }

        [HttpGet("health")]
        public async Task<IActionResult> GetHealth()
        {
            return Ok(await _youtube.GetTokenHealthAsync());
        }

        [HttpGet("quota")]
        public async Task<IActionResult> GetQuota()
        {
            return Ok(await _youtube.GetQuotaAsync());
        }
        
        [HttpGet("auth-url")]
        public async Task<IActionResult> GetAuthUrl([FromQuery] string? redirectUri)
        {
            try 
            {
                var url = await _youtube.GetAuthUrlAsync(redirectUri ?? "");
                return Ok(new { url });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "YouTube Operation Failed");
                return BadRequest(new { 
                    success = false, 
                    error = new { 
                        code = "YOUTUBE_ERROR", 
                        message = ex.Message 
                    } 
                });
            }
        }

        [HttpPost("auth")]
        public async Task<IActionResult> Authenticate([FromQuery] string code, [FromQuery] string redirectUri)
        {
            try 
            {
                var result = await _youtube.AuthenticateAsync(code, redirectUri);
                if (result) return Ok(new { message = "Authentication successful" });
                return BadRequest(new { message = "Authentication failed" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "YouTube Operation Failed");
                return BadRequest(new { 
                    success = false, 
                    error = new { 
                        code = "YOUTUBE_ERROR", 
                        message = ex.Message 
                    } 
                });
            }
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken()
        {
            var result = await _youtube.RefreshTokenAsync();
            if (result) return Ok(new { message = "Token refreshed" });
            return BadRequest(new { message = "Token refresh failed" });
        }

        [HttpPost("disconnect")]
        public async Task<IActionResult> Disconnect()
        {
            try
            {
                var result = await _youtube.DisconnectAsync();
                return Ok(new { success = result, message = "Successfully disconnected" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to disconnect YouTube account");
                return BadRequest(new { success = false, message = "Failed to disconnect" });
            }
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadVideo([FromBody] YoutubeUploadRequest request)
        {
            try
            {
                var response = await _youtube.UploadVideoAsync(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Upload failed");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("next-slot")]
        public async Task<IActionResult> GetNextSlot()
        {
            var slot = await _youtube.GetNextScheduleSlotAsync();
            return Ok(new { nextSlot = slot });
        }
    }
}

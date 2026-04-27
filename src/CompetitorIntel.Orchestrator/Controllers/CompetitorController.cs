using CompetitorIntel.Orchestrator.Data;
using CompetitorIntel.Orchestrator.Models.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CompetitorIntel.Orchestrator.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CompetitorController : ControllerBase
    {
        private readonly CompetitorContext _context;

        public CompetitorController(CompetitorContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CompetitorWatchlist>>> GetWatchlist()
        {
            return await _context.Competitors
                .OrderByDescending(c => c.FollowerCount)
                .ToListAsync();
        }

        [HttpGet("{username}")]
        public async Task<ActionResult<dynamic>> GetProfileDetails(string username)
        {
            var profile = await _context.Competitors
                .FirstOrDefaultAsync(c => c.Username == username);

            if (profile == null) return NotFound();

            // Fetch and return profile with latest videos (mocked here for now, or use real DB table)
            return Ok(new { 
                profile, 
                videos = new List<object>() // Add video table fetch here if needed
            });
        }

        [HttpPost("{id}/config")]
        public async Task<IActionResult> UpdateConfig(Guid id, [FromBody] ConfigRequest request)
        {
            var profile = await _context.Competitors.FindAsync(id);
            if (profile == null) return NotFound();

            if (request.FrequencyProfileMins.HasValue) 
                // In a real DB, frequency_profile_mins would be a column
                // profile.FrequencyProfileMins = request.FrequencyProfileMins.Value;
                
            profile.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Configuration updated" });
        }

        [HttpGet("{id}/history")]
        public async Task<ActionResult<IEnumerable<FollowerSnapshot>>> GetHistory(Guid id)
        {
            return await _context.FollowerSnapshots
                .Where(s => s.CompetitorId == id)
                .OrderByDescending(s => s.SnapshotAt)
                .Take(30)
                .ToListAsync();
        }
    }

    public class ConfigRequest
    {
        public int? FrequencyProfileMins { get; set; }
        public int? PostsDepth { get; set; }
    }
}

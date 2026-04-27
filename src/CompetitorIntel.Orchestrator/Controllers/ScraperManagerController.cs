using CompetitorIntel.Orchestrator.Data;
using CompetitorIntel.Orchestrator.Models.Entities;
using CompetitorIntel.Orchestrator.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CompetitorIntel.Orchestrator.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScraperManagerController : ControllerBase
    {
        private readonly CompetitorContext _context;
        private readonly MetaGraphService _graph;

        public ScraperManagerController(CompetitorContext context, MetaGraphService graph)
        {
            _context = context;
            _graph = graph;
        }

        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<dynamic>>> GetActiveJobs()
        {
            var jobs = await _context.ActiveJobs
                .Include(j => j.Watchlist)
                .OrderByDescending(j => j.Priority)
                .ThenBy(j => j.QueueOrder)
                .ThenBy(j => j.NextRunAt)
                .Select(j => new {
                    j.Id,
                    Username = j.Watchlist != null ? j.Watchlist.Username : "unknown",
                    j.WatchlistId,
                    j.JobType,
                    j.Status,
                    j.Priority,
                    j.Origin,
                    j.NextRunAt,
                    j.ScrapedCount,
                    j.ErrorMessage
                })
                .ToListAsync();
            
            return Ok(jobs);
        }

        [HttpGet("history")]
        public async Task<ActionResult<IEnumerable<dynamic>>> GetJobHistory([FromQuery] int limit = 50)
        {
            var history = await _context.JobHistory
                .Include(j => j.Watchlist)
                .OrderByDescending(j => j.CompletedAt)
                .Take(limit)
                .Select(j => new {
                    j.Id,
                    Username = j.Watchlist != null ? j.Watchlist.Username : "unknown",
                    j.JobType,
                    j.Status,
                    j.ScrapedCount,
                    j.CompletedAt,
                    j.ErrorMessage
                })
                .ToListAsync();
            
            return Ok(history);
        }

        [HttpPost("job")]
        public async Task<IActionResult> CreateJob([FromBody] JobRequest request)
        {
            var job = new ScraperJobActive
            {
                WatchlistId = request.WatchlistId,
                JobType = request.JobType ?? "routine",
                Priority = request.Priority ?? 1,
                Origin = "USER",
                NextRunAt = DateTime.UtcNow, // Run immediately
                TargetDate = request.TargetDate
            };

            _context.ActiveJobs.Add(job);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Job created", JobId = job.Id });
        }

        [HttpDelete("job/{id}")]
        public async Task<IActionResult> DeleteJob(Guid id)
        {
            var job = await _context.ActiveJobs.FindAsync(id);
            if (job == null) return NotFound();

            _context.ActiveJobs.Remove(job);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Job deleted" });
        }

        [HttpPatch("job/{id}")]
        public async Task<IActionResult> UpdateJob(Guid id, [FromBody] Dictionary<string, object> updates)
        {
            var job = await _context.ActiveJobs.FindAsync(id);
            if (job == null) return NotFound();

            if (updates.ContainsKey("priority")) 
                job.Priority = Convert.ToInt32(updates["priority"]);
            
            if (updates.ContainsKey("status"))
                job.Status = updates["status"].ToString() ?? "pending";

            job.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Job updated" });
        }

        [HttpPost("heal")]
        public async Task<IActionResult> HealQueue()
        {
            // Remove jobs for disabled profiles
            var disabledProfileIds = await _context.Competitors
                .Where(c => !c.IsActive)
                .Select(c => c.Id)
                .ToListAsync();

            var orphanedJobs = await _context.ActiveJobs
                .Where(j => disabledProfileIds.Contains(j.WatchlistId))
                .ToListAsync();

            if (orphanedJobs.Any())
                _context.ActiveJobs.RemoveRange(orphanedJobs);

            await _context.SaveChangesAsync();
            return Ok(new { Pruned = orphanedJobs.Count });
        }

        // ── Token Management ────────────────────────────────────────────────

        /// <summary>
        /// Returns the health of the Meta long-lived access token.
        /// DaysRemaining < 10 means action is required.
        /// </summary>
        [HttpGet("token")]
        public IActionResult GetTokenHealth()
        {
            var health = _graph.GetTokenHealth();
            return Ok(health);
        }

        /// <summary>
        /// Manually triggers a token refresh via graph.instagram.com.
        /// Useful when the automatic 50-day threshold hasn't been hit yet
        /// but you want to refresh ahead of a deployment.
        /// </summary>
        [HttpPost("token/refresh")]
        public async Task<IActionResult> RefreshToken()
        {
            var success = await _graph.RefreshTokenAsync();
            if (!success)
                return StatusCode(502, new { message = "Token refresh failed. Check logs." });

            var health = _graph.GetTokenHealth();
            return Ok(new { message = "Token refreshed successfully.", health });
        }
    }

    public class JobRequest
    {
        public Guid WatchlistId { get; set; }
        public string? JobType { get; set; }
        public int? Priority { get; set; }
        public DateTime? TargetDate { get; set; }
    }
}

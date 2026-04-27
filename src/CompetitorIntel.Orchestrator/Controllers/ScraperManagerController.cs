using CompetitorIntel.Orchestrator.Data;
using CompetitorIntel.Orchestrator.Models.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CompetitorIntel.Orchestrator.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScraperManagerController : ControllerBase
    {
        private readonly CompetitorContext _context;

        public ScraperManagerController(CompetitorContext context)
        {
            _context = context;
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
            // Self-healing logic ported to C#
            // 1. Remove jobs for disabled profiles
            var disabledProfileIds = await _context.Competitors
                .Where(c => !c.IsActive)
                .Select(c => c.Id)
                .ToListAsync();

            var orphanedJobs = await _context.ActiveJobs
                .Where(j => disabledProfileIds.Contains(j.WatchlistId))
                .ToListAsync();

            if (orphanedJobs.Any())
            {
                _context.ActiveJobs.RemoveRange(orphanedJobs);
            }

            // 2. Add missing jobs for enabled profiles
            var enabledProfiles = await _context.Competitors
                .Where(c => c.IsActive)
                .ToListAsync();

            var activeJobWatchlistIds = await _context.ActiveJobs
                .Select(j => j.WatchlistId)
                .Distinct()
                .ToListAsync();

            int addedCount = 0;
            foreach (var profile in enabledProfiles)
            {
                if (!activeJobWatchlistIds.Contains(profile.Id))
                {
                    _context.ActiveJobs.Add(new ScraperJobActive
                    {
                        WatchlistId = profile.Id,
                        JobType = "routine",
                        Origin = "SYSTEM",
                        NextRunAt = DateTime.UtcNow
                    });
                    addedCount++;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { Healed = addedCount, Pruned = orphanedJobs.Count });
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

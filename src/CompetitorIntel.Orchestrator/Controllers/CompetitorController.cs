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

        [HttpGet("{id}/history")]
        public async Task<ActionResult<IEnumerable<FollowerSnapshot>>> GetHistory(Guid id)
        {
            return await _context.FollowerSnapshots
                .Where(s => s.CompetitorId == id)
                .OrderByDescending(s => s.SnapshotAt)
                .Take(30) // Last 30 snapshots
                .ToListAsync();
        }
    }
}

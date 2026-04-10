using CompetitorIntel.Orchestrator.Models;
using CompetitorIntel.Orchestrator.Services;
using Microsoft.AspNetCore.Mvc;

namespace CompetitorIntel.Orchestrator.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScraperController : ControllerBase
    {
        private readonly IKafkaProducerService _kafkaProducer;

        public ScraperController(IKafkaProducerService kafkaProducer)
        {
            _kafkaProducer = kafkaProducer;
        }

        [HttpPost("trigger")]
        public async Task<IActionResult> TriggerScrape([FromBody] ScrapeRequest request)
        {
            await _kafkaProducer.PublishScrapeRequestAsync(request);
            return Ok(new { Message = "Scrape request queued", JobId = request.JobId });
        }
    }
}

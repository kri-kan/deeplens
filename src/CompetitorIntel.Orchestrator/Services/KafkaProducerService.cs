using Confluent.Kafka;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using CompetitorIntel.Orchestrator.Models;

namespace CompetitorIntel.Orchestrator.Services
{
    public interface IKafkaProducerService
    {
        Task PublishScrapeRequestAsync(ScrapeRequest request);
    }

    public class KafkaProducerService : IKafkaProducerService
    {
        private readonly IProducer<Null, string> _producer;
        private const string MetadataRequestTopic = "competitor.scrape.metadata.requests";

        public KafkaProducerService(IConfiguration configuration)
        {
            var config = new ProducerConfig
            {
                BootstrapServers = configuration["Kafka:BootstrapServers"] ?? "deeplens-kafka:29092"
            };
            _producer = new ProducerBuilder<Null, string>(config).Build();
        }

        public async Task PublishScrapeRequestAsync(ScrapeRequest request)
        {
            var payload = new
            {
                job_id = request.JobId.ToString(),
                target_username = request.TargetUsername,
                platform = request.Platform,
                requires_login = request.RequiresLogin
            };

            var message = new Message<Null, string>
            {
                Value = JsonSerializer.Serialize(payload)
            };

            await _producer.ProduceAsync(MetadataRequestTopic, message);
        }
    }
}

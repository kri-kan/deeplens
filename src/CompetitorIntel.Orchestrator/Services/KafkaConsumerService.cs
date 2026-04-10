using Confluent.Kafka;
using System.Text.Json;
using CompetitorIntel.Orchestrator.Models;
using CompetitorIntel.Orchestrator.Data;
using CompetitorIntel.Orchestrator.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace CompetitorIntel.Orchestrator.Services
{
    public class KafkaConsumerService : BackgroundService
    {
        private readonly ILogger<KafkaConsumerService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;
        private const string ResponseTopic = "competitor.scrape.metadata.responses";

        public KafkaConsumerService(
            ILogger<KafkaConsumerService> logger, 
            IServiceProvider serviceProvider,
            IConfiguration configuration)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await Task.Yield(); // Ensure we don't block startup

            var config = new ConsumerConfig
            {
                BootstrapServers = _configuration["Kafka:BootstrapServers"] ?? "localhost:9092",
                GroupId = "orchestrator-results-consumer",
                AutoOffsetReset = AutoOffsetReset.Earliest,
                EnableAutoCommit = false 
            };

            using var consumer = new ConsumerBuilder<Null, string>(config).Build();
            consumer.Subscribe(ResponseTopic);
            
            _logger.LogInformation($"Started listening on {ResponseTopic}");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var consumeResult = consumer.Consume(TimeSpan.FromSeconds(1));
                    if (consumeResult == null) continue;

                    _logger.LogInformation($"Received message: {consumeResult.Message.Value}");
                    
                    try 
                    {
                        var result = JsonSerializer.Deserialize<ScraperResult>(consumeResult.Message.Value);
                        if (result != null && result.Status == "success")
                        {
                            await SaveResultAsync(result);
                            consumer.Commit(consumeResult);
                            _logger.LogInformation($"Saved result for {result.Username}");
                        }
                        else
                        {
                            _logger.LogWarning($"Scrape failed or invalid JSON: {result?.Error}");
                            consumer.Commit(consumeResult); // Commit failure so we don't loop
                        }
                    }
                    catch (JsonException ex)
                    {
                        _logger.LogError(ex, "Failed to deserialize message");
                        consumer.Commit(consumeResult); // Commit bad poison message
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing Kafka message");
                    await Task.Delay(1000, stoppingToken);
                }
            }
            
            consumer.Close();
        }

        private async Task SaveResultAsync(ScraperResult result)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<CompetitorContext>();

            // 1. Find or Create Competitor
            var competitor = await context.Competitors
                .FirstOrDefaultAsync(c => c.Platform == result.Platform && c.Username == result.Username);

            if (competitor == null)
            {
                competitor = new CompetitorWatchlist
                {
                    Platform = result.Platform,
                    Username = result.Username,
                    IsActive = true
                };
                context.Competitors.Add(competitor);
                await context.SaveChangesAsync();
            }

            // 2. Update Metadata
            competitor.LastScrapedAt = DateTime.UtcNow;
            competitor.FollowerCount = result.Followers;
            competitor.FollowingCount = result.Following;
            competitor.DisplayName = result.Username; // Or FullName if we had it in Result
            // competitor.Bio = result.Bio; // Need to add Bio to ScraperResult if available

            
            // 3. Save Snapshot
            var snapshot = new FollowerSnapshot
            {
                CompetitorId = competitor.Id,
                FollowerCount = result.Followers,
                FollowingCount = result.Following,
                SnapshotAt = DateTime.UtcNow
            };
            
            context.FollowerSnapshots.Add(snapshot);
            await context.SaveChangesAsync();
        }
    }
}

using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using Dapper;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Contracts.Events;
using DeepLens.Shared.Telemetry;
using Npgsql;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Confluent.Kafka;
using System.Linq;

namespace DeepLens.WorkerService.Workers;

public class ProductEnrichmentWorker : BackgroundService
{
    private readonly ILogger<ProductEnrichmentWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly string _connectionString;
    private readonly IConsumer<string, string> _consumer;

    public ProductEnrichmentWorker(
        ILogger<ProductEnrichmentWorker> logger,
        IConfiguration configuration,
        IServiceProvider serviceProvider) 
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _connectionString = configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("DefaultConnection connection string not found");

        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "localhost:9092",
            GroupId = "deeplens-product-enrichment-workers",
            ClientId = Environment.MachineName + "-product-enrichment-worker",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false
        };

        _consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();
        _logger.LogInformation("ProductEnrichmentWorker starting.");

        try
        {
            _consumer.Subscribe(KafkaTopics.ProductEnrichmentRequested);

            while (!stoppingToken.IsCancellationRequested)
            {
                var consumeResult = _consumer.Consume(TimeSpan.FromSeconds(1));
                if (consumeResult?.Message != null)
                {
                    await ProcessMessage(consumeResult, stoppingToken);
                }
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in ProductEnrichmentWorker");
        }
        finally
        {
            _consumer.Close();
        }
    }

    private async Task ProcessMessage(ConsumeResult<string, string> consumeResult, CancellationToken ct)
    {
        try
        {
            var @event = JsonSerializer.Deserialize<WhatsAppGroupProductEnrichmentEvent>(consumeResult.Message.Value, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (@event != null)
            {
                await HandleAsync(@event, ct);
            }
            
            _consumer.Commit(consumeResult);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing enrichment message");
        }
    }

    private async Task HandleAsync(WhatsAppGroupProductEnrichmentEvent @event, CancellationToken ct)
    {
        using var activity = DeepLensActivitySource.StartActivity("ProductEnrichmentWorker.Handle");
        _logger.LogInformation("Enriching product {ProductId} for GroupId: {GroupId}", @event.ProductId, @event.GroupId);

        using var scope = _serviceProvider.CreateScope();
        var aiService = scope.ServiceProvider.GetRequiredService<IAiService>();

        ExtractedProductInfo extracted;
        try
        {
            extracted = await aiService.ExtractProductInfoAsync(@event.Description, @event.IsManual);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ollama extraction failed for ProductId {ProductId}. Aborting enrichment.", @event.ProductId);
            try
            {
                using var failConn = new NpgsqlConnection(_connectionString);
                await failConn.OpenAsync(ct);
                await failConn.ExecuteAsync(
                    "UPDATE wa.message_groups SET status = 'enrichment_failed', updated_at = NOW() WHERE group_id = @GroupId",
                    new { GroupId = @event.GroupId });
            }
            catch (Exception dbEx)
            {
                _logger.LogError(dbEx, "Failed to mark group {GroupId} as enrichment_failed", @event.GroupId);
            }
            return;
        }

        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        using var trans = await conn.BeginTransactionAsync(ct);

        try
        {
            string mappedCategory = RemapToTaxonomy(extracted.Category);
            Guid? categoryId = await ResolveCategoryId(conn, mappedCategory, trans);

            var unifiedAttributes = JsonSerializer.Serialize(new
            {
                fabric = extracted.Fabric,
                stitch_type = extracted.StitchType,
                price = extracted.Price,
                is_plus_shipping = extracted.IsPlusShipping
            });

            string cleanDesc = !string.IsNullOrEmpty(@event.Description) ? Regex.Replace(@event.Description, @"[*~_`]", "") : "";
            string title = !string.IsNullOrEmpty(extracted.Title) && extracted.Title != "New Product"
                ? extracted.Title
                : (!string.IsNullOrEmpty(cleanDesc) 
                    ? cleanDesc.Substring(0, Math.Min(cleanDesc.Length, 100)).Replace("\n", " ").Trim() 
                    : "New Product");

            // Strip placeholder-only titles
            var placeholders = new[] { "[image]", "[video]", "[photo]", "[sticker]" };
            if (title.Split(' ').All(t => placeholders.Contains(t.ToLower())))
            {
                title = "New Product";
            }

            // Update products table
            const string updateProductSql = @"
                UPDATE public.products 
                SET category_id = @CategoryId, 
                    title = @Title, 
                    fabric = @Fabric, 
                    stitch_type = @StitchType, 
                    tags = @Tags, 
                    unified_attributes = @UnifiedAttributes::jsonb
                WHERE id = @Id";

            await conn.ExecuteAsync(updateProductSql, new
            {
                CategoryId = categoryId,
                Title = title,
                Fabric = extracted.Fabric,
                StitchType = extracted.StitchType,
                Tags = extracted.Tags,
                UnifiedAttributes = unifiedAttributes,
                Id = @event.ProductId
            }, trans);

            // Update vendor_listings
            const string updateListingSql = @"
                UPDATE public.vendor_listings
                SET current_price = @Price,
                    is_plus_shipping = @IsPlusShipping
                WHERE product_id = @Id";

            await conn.ExecuteAsync(updateListingSql, new
            {
                Price = extracted.Price,
                IsPlusShipping = extracted.IsPlusShipping,
                Id = @event.ProductId
            }, trans);

            // Update wa.message_groups
            const string updateGroupSql = @"
                UPDATE wa.message_groups 
                SET category = @Category, 
                    sub_category = @SubCategory, 
                    detected_price = @Price, 
                    is_plus_shipping = @IsPlusShipping,
                    updated_at = NOW()
                WHERE group_id = @GroupId";

            await conn.ExecuteAsync(updateGroupSql, new
            {
                Category = mappedCategory,
                SubCategory = extracted.SubCategory,
                Price = extracted.Price,
                IsPlusShipping = extracted.IsPlusShipping,
                GroupId = @event.GroupId
            }, trans);

            await trans.CommitAsync(ct);
            _logger.LogInformation("Successfully enriched product {ProductId}", @event.ProductId);
        }
        catch (Exception ex)
        {
            await trans.RollbackAsync(ct);
            _logger.LogError(ex, "Failed to update enriched data for ProductId {ProductId}", @event.ProductId);
        }
    }

    private async Task<Guid?> ResolveCategoryId(NpgsqlConnection conn, string categoryName, NpgsqlTransaction trans)
    {
        var id = Guid.NewGuid();
        var slug = CleanBucketName(categoryName);

        const string sql = @"
            WITH ins AS (
                INSERT INTO public.categories (id, name, slug)
                VALUES (@Id, @Name, @Slug)
                ON CONFLICT (slug) DO NOTHING
                RETURNING id
            )
            SELECT id FROM ins
            UNION ALL
            SELECT id FROM public.categories WHERE slug = @Slug
            LIMIT 1;
        ";

        return await conn.QuerySingleAsync<Guid?>(sql, new { Id = id, Name = categoryName, Slug = slug }, trans);
    }

    private string CleanBucketName(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return "others";
        string cleaned = input.ToLowerInvariant();
        cleaned = Regex.Replace(cleaned, @"[^a-z0-9-]", "-");
        cleaned = Regex.Replace(cleaned, @"-+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(cleaned) ? "others" : cleaned;
    }

    private static string RemapToTaxonomy(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "Others";
        var s = raw.Trim().ToLowerInvariant();

        if (s.Contains("kid") || s.Contains("child") || s.Contains("baby") ||
            s.Contains("toddler") || s.Contains("infant"))
            return "Kids";

        if (s.Contains("lehenga") || s.Contains("lehnga") || s.Contains("lahenga") ||
            s.Contains("ghagra") || s.Contains("chaniya") || s.Contains("half saree"))
            return "Lehanga";

        if (s.Contains("saree") || s.Contains("sari") || s.Contains("banarasi") ||
            s.Contains("kanjivaram") || s.Contains("kanchipuram") || s.Contains("patola"))
            return "Saree";

        // Everything else that is women's wear maps to Dress
        if (s.Contains("kurti") || s.Contains("kurthi") || s.Contains("kurta") ||
            s.Contains("anarkali") || s.Contains("gown") || s.Contains("dress") ||
            s.Contains("frock") || s.Contains("salwar") || s.Contains("churidar") ||
            s.Contains("palazzo") || s.Contains("plazo") || s.Contains("sharara") ||
            s.Contains("suit") || s.Contains("ethnic") || s.Contains("traditional") ||
            s.Contains("festive") || s.Contains("party wear") || s.Contains("partywear") ||
            s.Contains("bridal") || s.Contains("wedding wear") || s.Contains("skirt") ||
            s.Contains("coord"))
            return "Dress";

        return "Others";
    }
}

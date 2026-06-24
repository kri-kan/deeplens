using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Dapper;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Threading;
using System.Text.Json.Serialization;
using Confluent.Kafka;
using DeepLens.Contracts.Events;
using System.Text.Json;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/whatsapp/products")]
public class WhatsAppProductController : ControllerBase
{
    private readonly string _connectionString;
    private readonly IProducer<string, string> _producer;
    private readonly ILogger<WhatsAppProductController> _logger;

    public WhatsAppProductController(IConfiguration configuration, IProducer<string, string> producer, ILogger<WhatsAppProductController> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("DefaultConnection connection string not found");
        _producer = producer;
        _logger = logger;
    }

    /// <summary>
    /// GET /api/v1/whatsapp/products/merge-candidates
    /// Lists all pending vector similarity product merge candidates
    /// </summary>
    [HttpGet("merge-candidates")]
    public async Task<IActionResult> GetMergeCandidates(CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string sql = @"
            SELECT 
                pmc.id AS ""id"",
                pmc.product_a_id AS ""productAId"",
                pmc.product_b_id AS ""productBId"",
                pmc.similarity_score AS ""similarityScore"",
                pmc.status AS ""status"",
                pmc.detected_at AS ""detectedAt"",
                pa.title AS ""productATitle"",
                pa.base_sku AS ""productASku"",
                pa.created_at AS ""productACreatedAt"",
                (SELECT m.storage_path FROM public.media_links ml JOIN public.media m ON ml.media_id = m.id WHERE ml.entity_id = pa.id AND ml.entity_type = 'product' ORDER BY ml.is_primary DESC LIMIT 1) AS ""productAImagePath"",
                (SELECT ml.media_id FROM public.media_links ml WHERE ml.entity_id = pa.id AND ml.entity_type = 'product' ORDER BY ml.is_primary DESC LIMIT 1) AS ""productAMediaId"",
                pb.title AS ""productBTitle"",
                pb.base_sku AS ""productBSku"",
                pb.created_at AS ""productBCreatedAt"",
                (SELECT m.storage_path FROM public.media_links ml JOIN public.media m ON ml.media_id = m.id WHERE ml.entity_id = pb.id AND ml.entity_type = 'product' ORDER BY ml.is_primary DESC LIMIT 1) AS ""productBImagePath"",
                (SELECT ml.media_id FROM public.media_links ml WHERE ml.entity_id = pb.id AND ml.entity_type = 'product' ORDER BY ml.is_primary DESC LIMIT 1) AS ""productBMediaId""
            FROM public.product_merge_candidates pmc
            JOIN public.products pa ON pmc.product_a_id = pa.id
            JOIN public.products pb ON pmc.product_b_id = pb.id
            WHERE pmc.status = 'pending'
            ORDER BY pmc.similarity_score DESC";

        var candidates = await conn.QueryAsync<dynamic>(new CommandDefinition(sql, cancellationToken: ct));
        return Ok(candidates);
    }

    /// <summary>
    /// POST /api/v1/whatsapp/products/merge
    /// Merges two products by moving all media links and deactivating the source listing
    /// </summary>
    [HttpPost("merge")]
    public async Task<IActionResult> MergeProducts([FromBody] MergeProductsRequest request, CancellationToken ct)
    {
        if (request.ProductAId == Guid.Empty || request.ProductBId == Guid.Empty || request.CandidateId == Guid.Empty)
        {
            return BadRequest("ProductAId, ProductBId and CandidateId are required.");
        }

        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();
        using var trans = await conn.BeginTransactionAsync();

        try
        {
            // 1. Fetch vendor listing IDs and source SKU
            var sourceListingId = await conn.QuerySingleOrDefaultAsync<Guid?>(
                new CommandDefinition("SELECT id FROM public.vendor_listings WHERE product_id = @ProductBId LIMIT 1",
                new { ProductBId = request.ProductBId }, transaction: trans, cancellationToken: ct)
            );

            var targetListingId = await conn.QuerySingleOrDefaultAsync<Guid?>(
                new CommandDefinition("SELECT id FROM public.vendor_listings WHERE product_id = @ProductAId LIMIT 1",
                new { ProductAId = request.ProductAId }, transaction: trans, cancellationToken: ct)
            );

            var sourceSku = await conn.QuerySingleOrDefaultAsync<string>(
                new CommandDefinition("SELECT base_sku FROM public.products WHERE id = @ProductBId",
                new { ProductBId = request.ProductBId }, transaction: trans, cancellationToken: ct)
            );

            // Append source SKU to target product's tags to preserve searchability
            if (!string.IsNullOrEmpty(sourceSku))
            {
                await conn.ExecuteAsync(new CommandDefinition(@"UPDATE public.products 
                      SET tags = array_append(COALESCE(tags, ARRAY[]::text[]), @SourceSku) 
                      WHERE id = @ProductAId AND NOT (@SourceSku = ANY(COALESCE(tags, ARRAY[]::text[])))", new { ProductAId = request.ProductAId, SourceSku = sourceSku }, transaction: trans, cancellationToken: ct));
            }

            // 2. Merge Product Media Links (Product B -> Product A)
            await conn.ExecuteAsync(new CommandDefinition(@"UPDATE public.media_links 
                  SET entity_id = @ProductAId 
                  WHERE entity_id = @ProductBId AND entity_type = 'product'
                  ON CONFLICT DO NOTHING", new { ProductAId = request.ProductAId, ProductBId = request.ProductBId }, transaction: trans, cancellationToken: ct));

            await conn.ExecuteAsync(new CommandDefinition(@"DELETE FROM public.media_links WHERE entity_id = @ProductBId AND entity_type = 'product'", new { ProductBId = request.ProductBId }, transaction: trans, cancellationToken: ct));

            // 3. Merge Vendor Listing Media Links if listings exist
            if (sourceListingId.HasValue && targetListingId.HasValue)
            {
                await conn.ExecuteAsync(new CommandDefinition(@"UPDATE public.media_links 
                      SET entity_id = @TargetListingId 
                      WHERE entity_id = @SourceListingId AND entity_type = 'vendor_listing'
                      ON CONFLICT DO NOTHING", new { TargetListingId = targetListingId.Value, SourceListingId = sourceListingId.Value }, transaction: trans, cancellationToken: ct));

                await conn.ExecuteAsync(new CommandDefinition(@"DELETE FROM public.media_links WHERE entity_id = @SourceListingId AND entity_type = 'vendor_listing'", new { SourceListingId = sourceListingId.Value }, transaction: trans, cancellationToken: ct));
            }

            // 4. Update Vendor Listings to point to Product A instead of deactivating
            await conn.ExecuteAsync(new CommandDefinition(@"UPDATE public.vendor_listings SET product_id = @ProductAId, updated_at = NOW() WHERE product_id = @ProductBId", new { ProductAId = request.ProductAId, ProductBId = request.ProductBId }, transaction: trans, cancellationToken: ct));

            // 5. Mark Source Product as deleted
            await conn.ExecuteAsync(new CommandDefinition(@"UPDATE public.products SET is_deleted = true, created_at = NOW() WHERE id = @ProductBId", new { ProductBId = request.ProductBId }, transaction: trans, cancellationToken: ct));

            // 6. Update the specific candidate pair to merged
            await conn.ExecuteAsync(new CommandDefinition(@"UPDATE public.product_merge_candidates 
                  SET status = 'merged', resolved_at = NOW(), resolved_by = 'operator' 
                  WHERE id = @CandidateId", new { CandidateId = request.CandidateId }, transaction: trans, cancellationToken: ct));

            // 7. Auto-dismiss any other pending candidate pairs involving the merged source product
            await conn.ExecuteAsync(new CommandDefinition(@"UPDATE public.product_merge_candidates 
                  SET status = 'dismissed', resolved_at = NOW(), resolved_by = 'operator' 
                  WHERE (product_a_id = @ProductBId OR product_b_id = @ProductBId) AND status = 'pending'", new { ProductBId = request.ProductBId }, transaction: trans, cancellationToken: ct));

            // 8. Audit logging
            await conn.ExecuteAsync(new CommandDefinition(@"INSERT INTO public.product_merges (source_id, target_id, merged_at, metadata)
                  VALUES (@SourceId, @TargetId, NOW(), @Metadata::jsonb)", new { 
                    SourceId = request.ProductBId, 
                    TargetId = request.ProductAId, 
                    Metadata = $"{{\"candidateId\": \"{request.CandidateId}\", \"reason\": \"vector_similarity_merge\"}}"
                }, transaction: trans, cancellationToken: ct));

            // 9. Relink all WhatsApp message groups referencing Product B to point to Product A
            await conn.ExecuteAsync(new CommandDefinition(@"UPDATE wa.message_groups 
                  SET deeplens_product_id = @ProductAId, status = 'product_created', updated_at = NOW() 
                  WHERE deeplens_product_id = @ProductBId", new { ProductAId = request.ProductAId, ProductBId = request.ProductBId }, transaction: trans, cancellationToken: ct));

            await trans.CommitAsync();

            if (_producer != null)
            {
                var mergeEvt = new ProductMergedEvent
                {
                    EventId = Guid.NewGuid(),
                    SourceProductId = request.ProductBId,
                    TargetProductId = request.ProductAId,
                    Timestamp = DateTime.UtcNow
                };

                await _producer.ProduceAsync(KafkaTopics.ProductMerged, new Message<string, string>
                {
                    Key = request.ProductAId.ToString(),
                    Value = JsonSerializer.Serialize(mergeEvt, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
                }, ct);

                _logger.LogInformation("Published ProductMerged event for Product {SourceProductId} merged into {TargetProductId}", request.ProductBId, request.ProductAId);
            }

            return Ok(new { success = true, message = "Products merged successfully" });
        }
        catch (Exception ex)
        {
            await trans.RollbackAsync();
            _logger.LogError(ex, "Failed to merge Product {ProductBId} into {ProductAId}", request.ProductBId, request.ProductAId);
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/v1/whatsapp/products/dismiss-merge
    /// Dismisses a product merge candidate pair
    /// </summary>
    [HttpPost("dismiss-merge")]
    public async Task<IActionResult> DismissMerge([FromBody] DismissMergeRequest request, CancellationToken ct)
    {
        if (request.CandidateId == Guid.Empty)
        {
            return BadRequest("CandidateId is required.");
        }

        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string sql = @"
            UPDATE public.product_merge_candidates 
            SET status = 'dismissed', resolved_at = NOW(), resolved_by = 'operator' 
            WHERE id = @CandidateId";

        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new { CandidateId = request.CandidateId }, cancellationToken: ct));
        if (rows == 0) return NotFound("Merge candidate not found");

        return Ok(new { success = true, message = "Merge candidate dismissed successfully" });
    }

    /// <summary>
    /// GET /api/v1/whatsapp/products/today
    /// Lists all products created today (or recently) via the WhatsApp pipeline
    /// </summary>
    [HttpGet("today")]
    public async Task<IActionResult> GetTodayProducts(CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string sql = @"
            SELECT 
                mg.group_id AS ""groupId"",
                mg.jid AS ""jid"",
                mg.status AS ""status"",
                mg.category AS ""category"",
                mg.sub_category AS ""subCategory"",
                mg.detected_price AS ""detectedPrice"",
                mg.detected_shipping AS ""detectedShipping"",
                mg.product_created_at AS ""productCreatedAt"",
                p.id AS ""productId"",
                p.title AS ""title"",
                p.base_sku AS ""sku"",
                vl.id AS ""listingId"",
                vl.vendor_id AS ""vendorId"",
                v.vendor_name AS ""vendorName"",
                (SELECT COUNT(*) FROM public.vendor_listings WHERE product_id = p.id AND is_active = true) AS ""listingCount"",
                (SELECT m.storage_path FROM public.media_links ml JOIN public.media m ON ml.media_id = m.id WHERE ml.entity_id = p.id AND ml.entity_type = 'product' ORDER BY ml.is_primary DESC LIMIT 1) AS ""imagePath""
            FROM wa.message_groups mg
            JOIN public.products p ON mg.deeplens_product_id = p.id
            LEFT JOIN public.vendor_listings vl ON mg.deeplens_listing_id = vl.id
            LEFT JOIN public.vendors v ON vl.vendor_id = v.id
            WHERE mg.status = 'product_created'
            ORDER BY mg.product_created_at DESC";

        var products = await conn.QueryAsync<dynamic>(new CommandDefinition(sql, cancellationToken: ct));
        return Ok(products);
    }

    /// <summary>
    /// GET /api/v1/whatsapp/products/failed-enrichments
    /// Lists all products that failed the LLM enrichment step
    /// </summary>
    [HttpGet("failed-enrichments")]
    public async Task<IActionResult> GetFailedEnrichments(CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string sql = @"
            SELECT 
                mg.group_id AS ""groupId"",
                mg.jid AS ""jid"",
                mg.status AS ""status"",
                mg.description AS ""description"",
                mg.product_created_at AS ""productCreatedAt"",
                p.id AS ""productId"",
                p.title AS ""title"",
                p.base_sku AS ""sku"",
                (SELECT m.storage_path FROM public.media_links ml JOIN public.media m ON ml.media_id = m.id WHERE ml.entity_id = p.id AND ml.entity_type = 'product' ORDER BY ml.is_primary DESC LIMIT 1) AS ""imagePath""
            FROM wa.message_groups mg
            JOIN public.products p ON mg.deeplens_product_id = p.id
            WHERE mg.status = 'enrichment_failed'
            ORDER BY mg.product_created_at DESC";

        var products = await conn.QueryAsync<dynamic>(new CommandDefinition(sql, cancellationToken: ct));
        return Ok(products);
    }

    /// <summary>
    /// POST /api/v1/whatsapp/products/retry-enrichment/{groupId}
    /// Retries LLM enrichment by republishing the event
    /// </summary>
    [HttpPost("retry-enrichment/{groupId}")]
    public async Task<IActionResult> RetryEnrichment(string groupId, CancellationToken ct)
    {
        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        var group = await conn.QuerySingleOrDefaultAsync<dynamic>(
            new CommandDefinition("SELECT group_id, deeplens_product_id, description FROM wa.message_groups WHERE group_id = @GroupId AND status = 'enrichment_failed'",
            new { GroupId = groupId }, cancellationToken: ct)
        );

        if (group == null) return NotFound("Group not found or not in failed state");

        var enrichEvt = new WhatsAppGroupProductEnrichmentEvent
        {
            EventId = Guid.NewGuid(),
            GroupId = group.group_id,
            ProductId = (Guid)group.deeplens_product_id,
            Description = group.description ?? "",
            Timestamp = DateTime.UtcNow
        };

        await _producer.ProduceAsync(KafkaTopics.ProductEnrichmentRequested, new Message<string, string>
        {
            Key = group.group_id,
            Value = JsonSerializer.Serialize(enrichEvt, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
        }, ct);

        await conn.ExecuteAsync(new CommandDefinition(@"UPDATE wa.message_groups SET status = 'product_created', updated_at = NOW() WHERE group_id = @GroupId", new { GroupId = groupId }, cancellationToken: ct));

        return Ok(new { success = true });
    }

    /// <summary>
    /// POST /api/v1/whatsapp/products/reevaluate
    /// Re-evaluates multiple products using LLM by republishing the enrichment event
    /// </summary>
    [HttpPost("reevaluate")]
    public async Task<IActionResult> ReevaluateProducts([FromBody] ReevaluateProductsRequest request, CancellationToken ct)
    {
        if (request == null || request.ProductIds == null || !request.ProductIds.Any())
            return BadRequest("ProductIds are required");

        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        var products = await conn.QueryAsync<dynamic>(
            new CommandDefinition(@"SELECT p.id as product_id, 
                     COALESCE(mg.group_id, p.id::text) as group_id, 
                     p.description 
              FROM public.products p 
              LEFT JOIN wa.message_groups mg ON mg.deeplens_product_id = p.id
              WHERE p.id = ANY(@ProductIds)",
            new { ProductIds = request.ProductIds }, cancellationToken: ct)
        );

        int count = 0;
        foreach (var p in products)
        {
            var enrichEvt = new WhatsAppGroupProductEnrichmentEvent
            {
                EventId = Guid.NewGuid(),
                GroupId = p.group_id,
                ProductId = p.product_id,
                Description = p.description ?? "",
                Timestamp = DateTime.UtcNow
            };

            await _producer.ProduceAsync(KafkaTopics.ProductEnrichmentRequested, new Message<string, string>
            {
                Key = p.group_id,
                Value = JsonSerializer.Serialize(enrichEvt, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
            }, ct);

            count++;
        }

        return Ok(new { success = true, count });
    }
}

public record MergeProductsRequest(
    [property: JsonPropertyName("productAId")] Guid ProductAId, 
    [property: JsonPropertyName("productBId")] Guid ProductBId, 
    [property: JsonPropertyName("candidateId")] Guid CandidateId
);
public record DismissMergeRequest([property: JsonPropertyName("candidateId")] Guid CandidateId);
public record ReevaluateProductsRequest([property: JsonPropertyName("productIds")] List<Guid> ProductIds);

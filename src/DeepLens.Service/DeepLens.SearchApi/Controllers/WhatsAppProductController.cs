using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Dapper;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/whatsapp/products")]
public class WhatsAppProductController : ControllerBase
{
    private readonly string _connectionString;

    public WhatsAppProductController(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("DefaultConnection connection string not found");
    }

    /// <summary>
    /// GET /api/v1/whatsapp/products/merge-candidates
    /// Lists all pending vector similarity product merge candidates
    /// </summary>
    [HttpGet("merge-candidates")]
    public async Task<IActionResult> GetMergeCandidates()
    {
        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string sql = @"
            SELECT 
                pmc.id AS Id,
                pmc.product_a_id AS ProductAId,
                pmc.product_b_id AS ProductBId,
                pmc.similarity_score AS SimilarityScore,
                pmc.status AS Status,
                pmc.detected_at AS DetectedAt,
                pa.title AS ProductATitle,
                pa.base_sku AS ProductASku,
                (SELECT m.storage_path FROM public.media_links ml JOIN public.media m ON ml.media_id = m.id WHERE ml.entity_id = pa.id AND ml.entity_type = 'product' ORDER BY ml.is_primary DESC LIMIT 1) AS ProductAImagePath,
                pb.title AS ProductBTitle,
                pb.base_sku AS ProductBSku,
                (SELECT m.storage_path FROM public.media_links ml JOIN public.media m ON ml.media_id = m.id WHERE ml.entity_id = pb.id AND ml.entity_type = 'product' ORDER BY ml.is_primary DESC LIMIT 1) AS ProductBImagePath
            FROM public.product_merge_candidates pmc
            JOIN public.products pa ON pmc.product_a_id = pa.id
            JOIN public.products pb ON pmc.product_b_id = pb.id
            WHERE pmc.status = 'pending'
            ORDER BY pmc.similarity_score DESC";

        var candidates = await conn.QueryAsync<dynamic>(sql);
        return Ok(candidates);
    }

    /// <summary>
    /// POST /api/v1/whatsapp/products/merge
    /// Merges two products by moving all media links and deactivating the source listing
    /// </summary>
    [HttpPost("merge")]
    public async Task<IActionResult> MergeProducts([FromBody] MergeProductsRequest request)
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
            // 1. Fetch vendor listing IDs
            var sourceListingId = await conn.QuerySingleOrDefaultAsync<Guid?>(
                "SELECT id FROM public.vendor_listings WHERE product_id = @ProductBId LIMIT 1",
                new { ProductBId = request.ProductBId },
                trans
            );

            var targetListingId = await conn.QuerySingleOrDefaultAsync<Guid?>(
                "SELECT id FROM public.vendor_listings WHERE product_id = @ProductAId LIMIT 1",
                new { ProductAId = request.ProductAId },
                trans
            );

            // 2. Merge Product Media Links (Product B -> Product A)
            await conn.ExecuteAsync(
                @"UPDATE public.media_links 
                  SET entity_id = @ProductAId 
                  WHERE entity_id = @ProductBId AND entity_type = 'product'
                  ON CONFLICT DO NOTHING",
                new { ProductAId = request.ProductAId, ProductBId = request.ProductBId },
                trans
            );

            await conn.ExecuteAsync(
                "DELETE FROM public.media_links WHERE entity_id = @ProductBId AND entity_type = 'product'",
                new { ProductBId = request.ProductBId },
                trans
            );

            // 3. Merge Vendor Listing Media Links if listings exist
            if (sourceListingId.HasValue && targetListingId.HasValue)
            {
                await conn.ExecuteAsync(
                    @"UPDATE public.media_links 
                      SET entity_id = @TargetListingId 
                      WHERE entity_id = @SourceListingId AND entity_type = 'vendor_listing'
                      ON CONFLICT DO NOTHING",
                    new { TargetListingId = targetListingId.Value, SourceListingId = sourceListingId.Value },
                    trans
                );

                await conn.ExecuteAsync(
                    "DELETE FROM public.media_links WHERE entity_id = @SourceListingId AND entity_type = 'vendor_listing'",
                    new { SourceListingId = sourceListingId.Value },
                    trans
                );
            }

            // 4. Deactivate Source Vendor Listing
            await conn.ExecuteAsync(
                "UPDATE public.vendor_listings SET is_active = false, updated_at = NOW() WHERE product_id = @ProductBId",
                new { ProductBId = request.ProductBId },
                trans
            );

            // 5. Mark Source Product as deleted
            await conn.ExecuteAsync(
                "UPDATE public.products SET is_deleted = true, created_at = NOW() WHERE id = @ProductBId",
                new { ProductBId = request.ProductBId },
                trans
            );

            // 6. Update the specific candidate pair to merged
            await conn.ExecuteAsync(
                @"UPDATE public.product_merge_candidates 
                  SET status = 'merged', resolved_at = NOW(), resolved_by = 'operator' 
                  WHERE id = @CandidateId",
                new { CandidateId = request.CandidateId },
                trans
            );

            // 7. Auto-dismiss any other pending candidate pairs involving the merged source product
            await conn.ExecuteAsync(
                @"UPDATE public.product_merge_candidates 
                  SET status = 'dismissed', resolved_at = NOW(), resolved_by = 'operator' 
                  WHERE (product_a_id = @ProductBId OR product_b_id = @ProductBId) AND status = 'pending'",
                new { ProductBId = request.ProductBId },
                trans
            );

            // 8. Audit logging
            await conn.ExecuteAsync(
                @"INSERT INTO public.product_merges (source_id, target_id, merged_at, metadata)
                  VALUES (@SourceId, @TargetId, NOW(), @Metadata::jsonb)",
                new { 
                    SourceId = request.ProductBId, 
                    TargetId = request.ProductAId, 
                    Metadata = $"{{\"candidateId\": \"{request.CandidateId}\", \"reason\": \"vector_similarity_merge\"}}"
                },
                trans
            );

            // 9. Update WhatsApp message groups table to point from merged group to target product
            // Find the group associated with the merged product
            var sourceGroup = await conn.QuerySingleOrDefaultAsync<string>(
                "SELECT group_id FROM wa.message_groups WHERE deeplens_product_id = @ProductId",
                new { ProductId = request.ProductBId },
                trans
            );
            if (!string.IsNullOrEmpty(sourceGroup))
            {
                await conn.ExecuteAsync(
                    @"UPDATE wa.message_groups 
                      SET status = 'ignored', error_detail = @ErrorDetail, updated_at = NOW() 
                      WHERE group_id = @GroupId",
                    new { GroupId = sourceGroup, ErrorDetail = $"Merged into product {request.ProductAId}" },
                    trans
                );
            }

            await trans.CommitAsync();
            return Ok(new { success = true, message = "Products merged successfully" });
        }
        catch (Exception ex)
        {
            await trans.RollbackAsync();
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/v1/whatsapp/products/dismiss-merge
    /// Dismisses a product merge candidate pair
    /// </summary>
    [HttpPost("dismiss-merge")]
    public async Task<IActionResult> DismissMerge([FromBody] DismissMergeRequest request)
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

        var rows = await conn.ExecuteAsync(sql, new { CandidateId = request.CandidateId });
        if (rows == 0) return NotFound("Merge candidate not found");

        return Ok(new { success = true, message = "Merge candidate dismissed successfully" });
    }

    /// <summary>
    /// GET /api/v1/whatsapp/products/today
    /// Lists all products created today (or recently) via the WhatsApp pipeline
    /// </summary>
    [HttpGet("today")]
    public async Task<IActionResult> GetTodayProducts()
    {
        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

        const string sql = @"
            SELECT 
                mg.group_id AS GroupId,
                mg.jid AS Jid,
                mg.status AS Status,
                mg.category AS Category,
                mg.sub_category AS SubCategory,
                mg.detected_price AS DetectedPrice,
                mg.detected_shipping AS DetectedShipping,
                mg.product_created_at AS ProductCreatedAt,
                p.id AS ProductId,
                p.title AS Title,
                p.base_sku AS Sku,
                vl.id AS ListingId,
                vl.vendor_id AS VendorId,
                v.vendor_name AS VendorName,
                (SELECT m.storage_path FROM public.media_links ml JOIN public.media m ON ml.media_id = m.id WHERE ml.entity_id = p.id AND ml.entity_type = 'product' ORDER BY ml.is_primary DESC LIMIT 1) AS ImagePath
            FROM wa.message_groups mg
            JOIN public.products p ON mg.deeplens_product_id = p.id
            LEFT JOIN public.vendor_listings vl ON mg.deeplens_listing_id = vl.id
            LEFT JOIN public.vendors v ON vl.vendor_id = v.id
            WHERE mg.status = 'product_created'
            ORDER BY mg.product_created_at DESC";

        var products = await conn.QueryAsync<dynamic>(sql);
        return Ok(products);
    }
}

public record MergeProductsRequest(Guid ProductAId, Guid ProductBId, Guid CandidateId);
public record DismissMergeRequest(Guid CandidateId);

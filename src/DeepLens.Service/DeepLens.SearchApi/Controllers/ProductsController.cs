using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Numerics;
using System.Threading;
using System.Threading.Tasks;
using System.Text.Json.Serialization;
using Dapper;
using Npgsql;
using Microsoft.Extensions.Configuration;
using DeepLens.Contracts.Catalog;
using DeepLens.Contracts.Media;
using DeepLens.Domain.Entities.Catalog;
using DeepLens.Infrastructure.Services;
using DeepLens.SearchApi.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace DeepLens.SearchApi.Controllers;

[ApiController]
[Route("api/v1/products")]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;
    private readonly Confluent.Kafka.IProducer<string, string>? _producer;
    private readonly Microsoft.Extensions.Logging.ILogger<ProductsController> _logger;
    private readonly IConfiguration _configuration;
    private readonly IStorageService? _storage;

    public ProductsController(
        IProductService productService, 
        System.IServiceProvider serviceProvider,
        Microsoft.Extensions.Logging.ILogger<ProductsController> logger)
    {
        _productService = productService;
        _logger = logger;
        _producer = serviceProvider.GetService(typeof(Confluent.Kafka.IProducer<string, string>)) as Confluent.Kafka.IProducer<string, string>;
        _configuration = (IConfiguration)serviceProvider.GetService(typeof(IConfiguration))!;
        _storage = serviceProvider.GetService(typeof(IStorageService)) as IStorageService;
    }

    [HttpGet("ping")]
    public IActionResult Ping() => Ok(new { status = "Product Controller Active" });

    [HttpGet]
    public async Task<IActionResult> GetProducts([FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        var result = await _productService.GetProductsAsync(skip, take);
        return Ok(result);
    }

    [HttpGet("catalog")]
    public async Task<IActionResult> GetCatalog([FromQuery] ProductCatalogFilter filter, [FromQuery] bool? isStarred = null, [FromQuery] bool? isMediaReviewRequired = null)
    {
        if (isStarred.HasValue)
        {
            filter.IsStarred = isStarred;
        }
        if (isMediaReviewRequired.HasValue)
        {
            filter.IsMediaReviewRequired = isMediaReviewRequired;
        }
        var result = await _productService.GetCatalogAsync(filter);
        return Ok(result);
    }

    [HttpGet("catalog/filter-options")]
    public async Task<IActionResult> GetFilterOptions()
    {
        var result = await _productService.GetFilterOptionsAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProductById(Guid id)
    {
        var result = await _productService.GetProductByIdAsync(id);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProduct(Guid id)
    {
        var result = await _productService.EnqueueDeleteProductsBulkAsync(new List<Guid> { id }, User?.Identity?.Name ?? "system");
        return Accepted(result);
    }

    [HttpDelete("bulk")]
    public async Task<IActionResult> DeleteProductsBulk([FromBody] List<Guid> productIds)
    {
        var result = await _productService.EnqueueDeleteProductsBulkAsync(productIds, User?.Identity?.Name ?? "system");
        return Accepted(result);
    }

    [HttpPost("archive")]
    public async Task<IActionResult> ArchiveProducts([FromBody] List<Guid> productIds)
    {
        var result = await _productService.EnqueueArchiveProductsAsync(productIds, User?.Identity?.Name ?? "system");
        return Accepted(result);
    }

    [HttpPost("archive/purge-all")]
    public async Task<IActionResult> PurgeAllArchivedProducts()
    {
        var count = await _productService.PurgeAllArchivedProductsMediaAsync();
        return Ok(new { count });
    }

    [HttpPost("unarchive")]
    public async Task<IActionResult> UnarchiveProducts([FromBody] List<Guid> productIds)
    {
        var count = await _productService.UnarchiveProductsAsync(productIds);
        return Ok(new { count });
    }

    [HttpPost("{id}/star/{mediaId}")]
    public async Task<IActionResult> StarMedia(Guid id, Guid mediaId)
    {
        var success = await _productService.StarMediaAsync(id, mediaId);
        return success ? Ok() : BadRequest();
    }

    [HttpPost("{id}/reorder")]
    public async Task<IActionResult> ReorderMedia(Guid id, [FromBody] List<Guid> mediaIds)
    {
        var success = await _productService.ReorderMediaAsync(id, mediaIds);
        return success ? Ok() : BadRequest();
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> CreateProduct([FromForm] ProductRequest request)
    {
        var mediaFiles = new List<MediaFileDto>();
        if (request.Files != null)
        {
            foreach (var file in request.Files)
            {
                var stream = new MemoryStream();
                await file.CopyToAsync(stream);
                stream.Position = 0;
                
                mediaFiles.Add(new MediaFileDto
                {
                    Content = stream,
                    FileName = file.FileName,
                    ContentType = file.ContentType,
                    VendorMediaId = file.Name
                });
            }
        }

        var ingestionDto = new ProductIngestionDto
        {
            VendorPrice = request.VendorPrice,
            Description = request.Description,
            Title = request.Title,
            Retention = request.Retention,
            Tags = request.Tags,
            Fabric = request.Fabric,
            StitchType = request.StitchType,
            WorkHeaviness = request.WorkHeaviness,
            Color = request.Color,
            Category = request.Category ?? MediaCategory.Product,
            SubCategory = request.SubCategory ?? "General",
            SourcePostId = request.SourcePostId
        };

        var result = await _productService.CreateProductAsync(ingestionDto, mediaFiles);
        return Ok(result);
    }

    [HttpGet("merge/preview")]
    public async Task<IActionResult> GetMergePreview([FromQuery] Guid sourceId, [FromQuery] Guid targetId)
    {
        try
        {
            var result = await _productService.GetMergePreviewAsync(sourceId, targetId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("merge")]
    public async Task<IActionResult> MergeProducts([FromBody] MergeRequest request)
    {
        bool success;
        if (request.IsVendorProductIds)
        {
            success = await _productService.MergeByVendorProductIdsAsync(request.TargetMasterId, request.SourceProductIds);
        }
        else
        {
            success = await _productService.MergeVendorProductsAsync(request.TargetMasterId, request.SourceProductIds);
        }

        if (!success) return BadRequest("Merge failed.");
        return Ok();
    }

    [HttpPost("instagram/link")]
    public async Task<IActionResult> LinkInstagram([FromBody] InstaLinkRequest request)
    {
        var success = await _productService.LinkInstagramPostAsync(request.PostId, request.ProductId, request.LinkType);
        return success ? Ok() : BadRequest();
    }

    [HttpGet("instagram/{postId}/links")]
    public async Task<IActionResult> GetInstagramLinks(Guid postId)
    {
        var result = await _productService.GetInstagramLinksAsync(postId);
        return Ok(result);
    }

    [HttpPost("instagram/{postId}/create-product")]
    public async Task<IActionResult> CreateProductFromPost(Guid postId, [FromBody] ProductIngestionDto data)
    {
        var result = await _productService.CreateProductFromPostAsync(postId, data);
        return Ok(result);
    }

    [HttpDelete("instagram/{postId}/links/{productId}")]
    public async Task<IActionResult> UnlinkInstagramPost(Guid postId, Guid productId)
    {
        try
        {
            var success = await _productService.UnlinkInstagramPostAsync(postId, productId);
            return Ok(); // Idempotent: return success even if already deleted
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var result = await _productService.GetCategoriesAsync();
        return Ok(result);
    }

    public class ChangeCategoryRequest
    {
        [JsonPropertyName("categorySlug")]
        public string CategorySlug { get; set; } = string.Empty;
    }

    [HttpPost("{id}/category")]
    public async Task<IActionResult> ChangeCategory(Guid id, [FromBody] ChangeCategoryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CategorySlug))
        {
            return BadRequest("CategorySlug is required.");
        }

        try
        {
            var success = await _productService.ChangeCategoryAsync(id, request.CategorySlug);
            if (!success) return NotFound("Product not found or category invalid");

            if (_producer != null)
            {
                var evt = new DeepLens.Contracts.Events.ProductCategoryChangedEvent
                {
                    EventId = Guid.NewGuid(),
                    ProductId = id,
                    NewCategory = request.CategorySlug,
                    Timestamp = DateTime.UtcNow
                };

                await _producer.ProduceAsync(DeepLens.Contracts.Events.KafkaTopics.ProductCategoryChanged, new Confluent.Kafka.Message<string, string>
                {
                    Key = id.ToString(),
                    Value = System.Text.Json.JsonSerializer.Serialize(evt, new System.Text.Json.JsonSerializerOptions { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase })
                });

                _logger.LogInformation("Published ProductCategoryChanged event for Product {ProductId}", id);
            }

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to change category for product {ProductId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPatch("{id}/metadata")]
    public async Task<IActionResult> UpdateMetadata(Guid id, [FromBody] ProductCorrectionDto request)
    {
        try
        {
            var success = await _productService.UpdateProductMetadataAsync(id, request);
            if (!success) return NotFound("Product not found");
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update product metadata for {ProductId}", id);
            return BadRequest(ex.Message);
        }
    }

    [HttpPatch("{id}/media-review-required")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ToggleMediaReviewRequired(Guid id, [FromBody] DeepLens.Contracts.Catalog.ToggleMediaReviewRequiredRequest request, CancellationToken ct)
    {
        var success = await _productService.ToggleMediaReviewRequiredAsync(id, request.IsMediaReviewRequired, ct);
        if (!success) return NotFound();
        return Ok(new { id, isMediaReviewRequired = request.IsMediaReviewRequired });
    }

    [HttpPost("{id}/shares")]
    [ProducesResponseType(typeof(ProductShareLogDto), 200)]
    public async Task<IActionResult> RecordShare(Guid id, [FromBody] RecordShareRequest request, CancellationToken ct)
    {
        var result = await _productService.RecordShareAsync(id, request.Platform, request.DescriptionUsed, ct);
        return Ok(result);
    }

    [HttpPost("{id}/generate-share-description")]
    [ProducesResponseType(typeof(GenerateShareDescriptionResponse), 200)]
    public async Task<IActionResult> GenerateShareDescription(Guid id, [FromBody] GenerateShareDescriptionRequest request, CancellationToken ct)
    {
        var description = await _productService.GenerateShareDescriptionAsync(id, request.TargetPlatform, ct);
        return Ok(new GenerateShareDescriptionResponse(description));
    }

    [HttpPost("{id}/publish-events")]
    [ProducesResponseType(typeof(ProductPublishEventDto), 200)]
    public async Task<IActionResult> RecordPublishEvent(Guid id, [FromBody] ProductPublishEventDto request, CancellationToken ct)
    {
        request.ProductId = id;
        var result = await _productService.RecordPublishEventAsync(request, ct);
        return Ok(result);
    }

    [HttpGet("{id}/publish-events")]
    [ProducesResponseType(typeof(IEnumerable<ProductPublishEventDto>), 200)]
    public async Task<IActionResult> GetPublishEvents(Guid id, CancellationToken ct)
    {
        var result = await _productService.GetPublishEventsAsync(id, ct);
        return Ok(result);
    }

    [HttpGet("instagram-accounts")]
    [ProducesResponseType(typeof(IEnumerable<InstagramAccountOptionDto>), 200)]
    public async Task<IActionResult> GetPublishingInstagramAccounts(CancellationToken ct)
    {
        var result = await _productService.GetPublishingInstagramAccountsAsync(ct);
        return Ok(result);
    }

    public record BatchStorePublishRequest(
        [property: JsonPropertyName("productIds")] List<Guid> ProductIds,
        [property: JsonPropertyName("publishedAt")] DateTime? PublishedAt = null
    );

    [HttpPost("store-publish")]
    public async Task<IActionResult> RecordStorePublish([FromBody] BatchStorePublishRequest request, CancellationToken ct)
    {
        var count = await _productService.RecordStorePublishAsync(request.ProductIds, request.PublishedAt, ct);
        return Ok(new { success = true, count });
    }

    [HttpPost("visual-similarity")]
    [HttpGet("visual-similarity")]
    public async Task<ActionResult<VisualSimilaritySearchResponse>> VisualSimilarity(
        [FromQuery] Guid? postId,
        [FromQuery] Guid? mediaId,
        [FromQuery] string? storagePath,
        [FromQuery] string? imageUrl,
        [FromQuery] string? phash,
        [FromQuery] int take = 30,
        [FromQuery] int minSimilarity = 30,
        [FromBody] VisualSimilaritySearchRequest? bodyRequest = null,
        CancellationToken ct = default)
    {
        var request = bodyRequest ?? new VisualSimilaritySearchRequest();
        if (postId.HasValue && !request.PostId.HasValue) request.PostId = postId;
        if (mediaId.HasValue && !request.MediaId.HasValue) request.MediaId = mediaId;
        if (!string.IsNullOrEmpty(storagePath) && string.IsNullOrEmpty(request.StoragePath)) request.StoragePath = storagePath;
        if (!string.IsNullOrEmpty(imageUrl) && string.IsNullOrEmpty(request.ImageUrl)) request.ImageUrl = imageUrl;
        if (!string.IsNullOrEmpty(phash) && string.IsNullOrEmpty(request.Phash)) request.Phash = phash;
        if (take > 0 && request.Take == 30) request.Take = take;
        if (minSimilarity > 0 && request.MinSimilarity == 30) request.MinSimilarity = minSimilarity;

        var connStr = _configuration.GetConnectionString("DefaultConnection");
        using var conn = new NpgsqlConnection(connStr);
        await conn.OpenAsync(ct);

        string? refPhash = request.Phash?.Trim();

        // 1. If base64 image provided:
        if (string.IsNullOrEmpty(refPhash) && !string.IsNullOrWhiteSpace(request.ImageBase64))
        {
            try
            {
                var cleanBase64 = request.ImageBase64.Trim();
                if (cleanBase64.Contains(','))
                {
                    cleanBase64 = cleanBase64.Substring(cleanBase64.IndexOf(',') + 1);
                }
                var bytes = Convert.FromBase64String(cleanBase64);
                using var ms = new MemoryStream(bytes);
                refPhash = ComputeDHash(ms);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse and hash imageBase64");
            }
        }

        // 2. If mediaId provided:
        if (string.IsNullOrEmpty(refPhash) && request.MediaId.HasValue && request.MediaId.Value != Guid.Empty)
        {
            var mInfo = await conn.QueryFirstOrDefaultAsync<dynamic>(
                new CommandDefinition("SELECT storage_path, phash FROM public.media WHERE id = @Id", new { Id = request.MediaId.Value }, cancellationToken: ct));
            if (mInfo != null)
            {
                refPhash = (string?)mInfo.phash;
                if (string.IsNullOrEmpty(refPhash) && !string.IsNullOrEmpty((string?)mInfo.storage_path))
                {
                    refPhash = await ComputePhashFromStorageAsync((string)mInfo.storage_path);
                    if (!string.IsNullOrEmpty(refPhash))
                    {
                        await conn.ExecuteAsync(new CommandDefinition("UPDATE public.media SET phash = @Phash WHERE id = @Id", new { Phash = refPhash, Id = request.MediaId.Value }, cancellationToken: ct));
                    }
                }
            }
        }

        // 3. If storagePath provided:
        if (string.IsNullOrEmpty(refPhash) && !string.IsNullOrWhiteSpace(request.StoragePath))
        {
            refPhash = await conn.QueryFirstOrDefaultAsync<string>(
                new CommandDefinition("SELECT phash FROM public.media WHERE storage_path = @Path AND phash IS NOT NULL LIMIT 1", new { Path = request.StoragePath }, cancellationToken: ct));
            if (string.IsNullOrEmpty(refPhash))
            {
                refPhash = await ComputePhashFromStorageAsync(request.StoragePath);
            }
        }

        // 4. If postId provided:
        if (string.IsNullOrEmpty(refPhash) && request.PostId.HasValue && request.PostId.Value != Guid.Empty)
        {
            var postMedia = await conn.QueryFirstOrDefaultAsync<dynamic>(new CommandDefinition(@"
                SELECT m.id, m.storage_path, m.phash 
                FROM public.media m 
                JOIN public.media_links ml ON m.id = ml.media_id 
                WHERE ml.entity_id = @PostId AND ml.entity_type = 'competitor_video'
                ORDER BY ml.is_primary DESC, m.media_type ASC, ml.display_order ASC 
                LIMIT 1", new { PostId = request.PostId.Value }, cancellationToken: ct));

            if (postMedia != null)
            {
                refPhash = (string?)postMedia.phash;
                if (string.IsNullOrEmpty(refPhash) && !string.IsNullOrEmpty((string?)postMedia.storage_path))
                {
                    refPhash = await ComputePhashFromStorageAsync((string)postMedia.storage_path);
                }
            }

            if (string.IsNullOrEmpty(refPhash))
            {
                var cv = await conn.QueryFirstOrDefaultAsync<dynamic>(
                    new CommandDefinition("SELECT storage_path, thumbnail_url FROM public.competitor_videos WHERE id = @Id", new { Id = request.PostId.Value }, cancellationToken: ct));
                if (cv != null && !string.IsNullOrEmpty((string?)cv.storage_path))
                {
                    refPhash = await ComputePhashFromStorageAsync((string)cv.storage_path);
                }
            }
        }

        // 5. If imageUrl provided:
        if (string.IsNullOrEmpty(refPhash) && !string.IsNullOrWhiteSpace(request.ImageUrl))
        {
            refPhash = await ComputePhashFromUrlAsync(request.ImageUrl);
        }

        if (string.IsNullOrEmpty(refPhash))
        {
            return BadRequest(new { message = "Could not resolve a perceptual hash for the provided media/post." });
        }

        var candidates = await conn.QueryAsync<dynamic>(new CommandDefinition(@"
            SELECT 
                p.id AS ProductId, 
                p.base_sku AS Sku, 
                p.title AS Title, 
                COALESCE((SELECT MIN(vl.current_price) FROM public.vendor_listings vl WHERE vl.product_id = p.id), 0) AS VendorPrice,
                m.phash AS Phash, 
                m.storage_path AS StoragePath,
                c.name AS Category,
                COALESCE(p.is_deleted, false) AS IsDeleted,
                COALESCE(p.is_archived, false) AS IsArchived,
                (SELECT COUNT(1) FROM public.media_links ml2 WHERE ml2.entity_id = p.id AND ml2.entity_type = 'product') AS MediaCount,
                EXISTS (
                    SELECT 1 FROM public.instagram_product_links ipl 
                    WHERE ipl.post_id = @PostId AND ipl.product_id = p.id
                ) AS IsLinked,
                (
                    SELECT ipl.link_type FROM public.instagram_product_links ipl 
                    WHERE ipl.post_id = @PostId AND ipl.product_id = p.id 
                    LIMIT 1
                ) AS ExistingLinkType
            FROM public.products p
            JOIN public.media_links ml ON p.id = ml.entity_id AND ml.entity_type = 'product'
            JOIN public.media m ON m.id = ml.media_id AND m.phash IS NOT NULL
            LEFT JOIN public.categories c ON p.category_id = c.id",
            new { PostId = request.PostId ?? Guid.Empty }, cancellationToken: ct));

        var productBestMatches = new Dictionary<Guid, VisualSimilarityMatchDto>();

        foreach (var c in candidates)
        {
            string candPhash = (string)c.phash;
            int dist = GetHammingDistance(refPhash, candPhash);
            int pct = Math.Max(0, Math.Min(100, (int)Math.Round((1.0 - (dist / 64.0)) * 100)));

            if (pct < request.MinSimilarity) continue;

            Guid pId = (Guid)c.productid;

            if (!productBestMatches.TryGetValue(pId, out var existing) || dist < existing.Distance)
            {
                productBestMatches[pId] = new VisualSimilarityMatchDto
                {
                    ProductId = pId,
                    Sku = (string)(c.sku ?? ""),
                    Title = (string)(c.title ?? "Untitled Product"),
                    VendorPrice = (decimal)c.vendorprice,
                    SimilarityPercentage = pct,
                    Distance = dist,
                    StoragePath = (string?)c.storagepath,
                    Category = (string?)c.category,
                    MediaCount = Convert.ToInt32(c.mediacount ?? 0),
                    IsLinked = (bool)c.islinked,
                    ExistingLinkType = (string?)c.existinglinktype,
                    IsDeleted = (bool)(c.isdeleted ?? false),
                    IsArchived = (bool)(c.isarchived ?? false)
                };
            }
        }

        var topMatches = productBestMatches.Values
            .OrderByDescending(m => m.SimilarityPercentage)
            .ThenBy(m => m.Distance)
            .Take(Math.Min(request.Take, 100))
            .ToList();

        return Ok(new VisualSimilaritySearchResponse
        {
            SourcePhash = refPhash,
            TotalCandidates = candidates.Count(),
            Matches = topMatches
        });
    }

    private async Task<string?> ComputePhashFromStorageAsync(string storagePath)
    {
        if (_storage == null || string.IsNullOrWhiteSpace(storagePath)) return null;
        try
        {
            var targetPath = storagePath;
            if (targetPath.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase) || targetPath.EndsWith(".mov", StringComparison.OrdinalIgnoreCase))
            {
                var jpgPath = targetPath.Replace("_full.mp4", ".jpg").Replace("_child.mp4", ".jpg").Replace(".mp4", ".jpg");
                if (await _storage.FileExistsAsync(jpgPath))
                {
                    targetPath = jpgPath;
                }
            }

            using var stream = await _storage.GetFileAsync(targetPath);
            if (stream != null)
            {
                return ComputeDHash(stream);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to compute phash from storage path: {Path}", storagePath);
        }
        return null;
    }

    private async Task<string?> ComputePhashFromUrlAsync(string url)
    {
        try
        {
            // If the URL points to our Attachment download endpoint or contains a storage path parameter:
            if (_storage != null && (url.Contains("/api/v1/Attachment/download", StringComparison.OrdinalIgnoreCase) || url.Contains("path=")))
            {
                var queryIndex = url.IndexOf('?');
                if (queryIndex >= 0)
                {
                    var queryString = url.Substring(queryIndex);
                    var parsed = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(queryString);
                    if (parsed.TryGetValue("path", out var pathVal) && !string.IsNullOrWhiteSpace(pathVal))
                    {
                        var storagePhash = await ComputePhashFromStorageAsync(pathVal.ToString()!);
                        if (!string.IsNullOrEmpty(storagePhash))
                        {
                            return storagePhash;
                        }
                    }
                }
            }

            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            var bytes = await client.GetByteArrayAsync(url);
            using var ms = new MemoryStream(bytes);
            return ComputeDHash(ms);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to compute phash from URL: {Url}", url);
        }
        return null;
    }

    private static string? ComputeDHash(Stream stream)
    {
        try
        {
            if (stream == null || !stream.CanRead) return null;
            if (stream.CanSeek && stream.Length == 0) return null;

            using var image = SixLabors.ImageSharp.Image.Load<L8>(stream);
            image.Mutate(x => x.Resize(new ResizeOptions
            {
                Size = new Size(9, 8),
                Mode = ResizeMode.Stretch
            }));

            ulong hash = 0;
            int bitIndex = 0;

            for (int y = 0; y < 8; y++)
            {
                for (int x = 0; x < 8; x++)
                {
                    var leftPixel = image[x, y].PackedValue;
                    var rightPixel = image[x + 1, y].PackedValue;

                    if (leftPixel > rightPixel)
                    {
                        hash |= (1UL << bitIndex);
                    }
                    bitIndex++;
                }
            }

            return hash.ToString("x16");
        }
        catch
        {
            return null;
        }
    }

    private static int GetHammingDistance(string hash1, string hash2)
    {
        if (string.IsNullOrEmpty(hash1) || string.IsNullOrEmpty(hash2)) return int.MaxValue;
        if (hash1.Length != 16 || hash2.Length != 16)
        {
            int dist = 0;
            for (int i = 0; i < Math.Min(hash1.Length, hash2.Length); i++)
            {
                if (hash1[i] != hash2[i]) dist++;
            }
            return dist + Math.Abs(hash1.Length - hash2.Length);
        }

        if (ulong.TryParse(hash1, System.Globalization.NumberStyles.HexNumber, null, out ulong val1) &&
            ulong.TryParse(hash2, System.Globalization.NumberStyles.HexNumber, null, out ulong val2))
        {
            return BitOperations.PopCount(val1 ^ val2);
        }
        return int.MaxValue;
    }
}

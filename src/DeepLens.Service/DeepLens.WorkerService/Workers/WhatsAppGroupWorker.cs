using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using DeepLens.Contracts.Events;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Infrastructure.Services;
using System.Text.Json;
using System.Text;
using System.Text.RegularExpressions;
using Confluent.Kafka;
using Npgsql;
using Dapper;
using System.Security.Cryptography;
using System.Linq;

namespace DeepLens.WorkerService.Workers;

/// <summary>
/// Background worker that consumes WhatsApp group product pipeline events.
/// Handles product creation, Ollama AI extraction, media migration in MinIO, and status updates.
/// </summary>
public class WhatsAppGroupWorker : BackgroundService
{
    private readonly ILogger<WhatsAppGroupWorker> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IConsumer<string, string> _consumer;
    private readonly IProducer<string, string> _producer;
    private readonly string _connectionString;
    private readonly string[] _subscriptionTopics;
    private readonly PerceptualHashCache _hashCache;

    public WhatsAppGroupWorker(
        ILogger<WhatsAppGroupWorker> logger,
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        IProducer<string, string> producer,
        PerceptualHashCache hashCache)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _producer = producer;
        _hashCache = hashCache;
        _connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("DefaultConnection connection string not found");

        _subscriptionTopics = new[] 
        { 
            KafkaTopics.GroupProductCreate,
            KafkaTopics.GroupMediaAdded,
            KafkaTopics.GroupReprocess,
            KafkaTopics.GroupProductDelete,
            KafkaTopics.ProductCategoryChanged,
            KafkaTopics.ProductMerged
        };

        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = configuration.GetConnectionString("Kafka") ?? "localhost:9092",
            GroupId = "deeplens-whatsapp-group-workers",
            ClientId = Environment.MachineName + "-whatsapp-group-worker",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false
        };

        _consumer = new ConsumerBuilder<string, string>(consumerConfig).Build();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Yield();
        _logger.LogInformation("WhatsAppGroupWorker starting.");

        try
        {
            await _hashCache.InitializeAsync(stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize PerceptualHashCache on startup.");
        }

        try
        {
            _consumer.Subscribe(_subscriptionTopics);

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
            _logger.LogError(ex, "Fatal error in WhatsAppGroupWorker");
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
            if (consumeResult.Topic == KafkaTopics.GroupProductCreate)
            {
                await HandleGroupProductCreate(consumeResult.Message.Value, ct);
            }
            else if (consumeResult.Topic == KafkaTopics.GroupMediaAdded)
            {
                await HandleGroupMediaAdded(consumeResult.Message.Value, ct);
            }
            else if (consumeResult.Topic == KafkaTopics.GroupReprocess)
            {
                await HandleGroupReprocess(consumeResult.Message.Value, ct);
            }
            else if (consumeResult.Topic == KafkaTopics.GroupProductDelete)
            {
                await HandleGroupProductDelete(consumeResult.Message.Value, ct);
            }
            else if (consumeResult.Topic == KafkaTopics.ProductCategoryChanged)
            {
                await HandleProductCategoryChanged(consumeResult.Message.Value, ct);
            }
            else if (consumeResult.Topic == KafkaTopics.ProductMerged)
            {
                await HandleProductMerged(consumeResult.Message.Value, ct);
            }

            _consumer.Commit(consumeResult);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing WhatsApp Group Kafka message from topic: {Topic}", consumeResult.Topic);
        }
    }

    private async Task HandleGroupProductCreate(string messageJson, CancellationToken ct)
    {
        var evt = JsonSerializer.Deserialize<WhatsAppGroupProductCreateEvent>(messageJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (evt == null) return;

        _logger.LogInformation("Processing group product creation for GroupId: {GroupId}, Jid: {Jid}", evt.GroupId, evt.Jid);

        using var scope = _serviceProvider.CreateScope();
        var aiService = scope.ServiceProvider.GetRequiredService<IAiService>();
        var storage = scope.ServiceProvider.GetRequiredService<IStorageService>();

        // 1. Dynamic category detection using DB-seeded keywords and fuzzy Levenshtein matching.
        string rawDesc = evt.Description ?? "";
        string descNorm = CleanDescriptionForTokenization(rawDesc);

        List<(string Name, string Slug, string[] Keywords)> dbCategories;
        using (var catConn = new NpgsqlConnection(_connectionString))
        {
            await catConn.OpenAsync(ct);
            dbCategories = (await catConn.QueryAsync<(string Name, string Slug, string[] Keywords)>(
                "SELECT name, slug, classification_keywords FROM public.categories")).ToList();
        }

        // Tokenise: extract alphabetical words of length >= 2
        var tokens = Regex.Matches(descNorm, @"[a-zA-Z]+")
            .Cast<Match>()
            .Select(m => m.Value)
            .Where(v => v.Length >= 2)
            .Distinct()
            .ToList();

        string category = "Others";
        bool matched = false;

        // Priority-based check: Kids -> Lehanga -> Saree -> Dress -> Others
        var priorityOrder = new[] { "Kids", "Lehanga", "Saree", "Dress", "Others" };
        foreach (var categoryName in priorityOrder)
        {
            var dbCat = dbCategories.FirstOrDefault(c => c.Name.Equals(categoryName, StringComparison.OrdinalIgnoreCase));
            if (dbCat.Keywords == null || dbCat.Keywords.Length == 0) continue;

            foreach (var token in tokens)
            {
                foreach (var kw in dbCat.Keywords)
                {
                    string kwNorm = kw.Trim().ToLowerInvariant();
                    int dist = LevenshteinDistance(token, kwNorm);
                    
                    // Fuzzy threshold rules:
                    // - Length <= 4: exact match only (distance 0)
                    // - Length <= 6: distance <= 1
                    // - Length > 6: distance <= 2
                    int allowedDistance = kwNorm.Length <= 4 ? 0 : (kwNorm.Length <= 6 ? 1 : 2);
                    
                    if (dist <= allowedDistance)
                    {
                        category = dbCat.Name;
                        matched = true;
                        break;
                    }
                }
                if (matched) break;
            }
            if (matched) break;
        }

        int bestScore = matched ? 1 : 0;

        _logger.LogInformation(
            "Static category detection: GroupId={GroupId} → Category={Category} (score={Score})",
            evt.GroupId, category, bestScore);

        // 2. AI fallback — only fires when no keyword matched (score == 0).
        //    The AI result is also remapped to the same 5 buckets so it cannot
        //    invent new categories outside our taxonomy.
        var extracted = new ExtractedProductInfo
        {
            Category = category,
            SubCategory = "General",
            Title = "New Product",
            IsPlusShipping = true,
            Fabric = "Unknown",
            StitchType = "Unknown",
            Color = "Unknown",
            Sizes = Array.Empty<string>(),
            Tags = Array.Empty<string>()
        };

        if (bestScore == 0 && !string.IsNullOrWhiteSpace(rawDesc))
        {
            try
            {
                _logger.LogInformation(
                    "Static match missed — falling back to AI extraction for GroupId={GroupId}", evt.GroupId);
                var aiResult = await aiService.ExtractProductInfoAsync(rawDesc);

                // Remap whatever the AI returned → our 5 buckets
                extracted.Category = RemapToTaxonomy(aiResult.Category);

                _logger.LogInformation(
                    "AI result: raw={AiCategory} → remapped={Category} for GroupId={GroupId}",
                    aiResult.Category, extracted.Category, evt.GroupId);

                // Accept other AI fields when they add value
                if (aiResult.Price.HasValue) extracted.Price = aiResult.Price;
                if (!string.IsNullOrEmpty(aiResult.Title)) extracted.Title = aiResult.Title;
                extracted.IsPlusShipping = aiResult.IsPlusShipping;
                if (!string.Equals(aiResult.Fabric, "Unknown", StringComparison.OrdinalIgnoreCase))
                    extracted.Fabric = aiResult.Fabric;
                if (!string.Equals(aiResult.StitchType, "Unknown", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(aiResult.StitchType, "Unstitched", StringComparison.OrdinalIgnoreCase))
                    extracted.StitchType = aiResult.StitchType;
                if (!string.Equals(aiResult.Color, "Unknown", StringComparison.OrdinalIgnoreCase))
                    extracted.Color = aiResult.Color;
                if (aiResult.Sizes?.Length > 0) extracted.Sizes = aiResult.Sizes;
                if (aiResult.Tags?.Length > 0) extracted.Tags = aiResult.Tags;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "AI fallback failed for GroupId={GroupId}; staying with category=Others", evt.GroupId);
            }
        }

        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        using var trans = await conn.BeginTransactionAsync(ct);

        try
        {
            // 2. Idempotency Check
            var existingGroup = await conn.QuerySingleOrDefaultAsync<dynamic>(
                "SELECT deeplens_product_id, deeplens_listing_id FROM wa.message_groups WHERE group_id = @GroupId",
                new { GroupId = evt.GroupId },
                trans
            );

            Guid productId;
            Guid listingId;
            bool isAutoMerge = false;

            if (existingGroup != null && existingGroup.deeplens_product_id != null)
            {
                _logger.LogInformation("Product already exists for GroupId: {GroupId}. Skipping creation.", evt.GroupId);
                productId = existingGroup.deeplens_product_id;
                listingId = existingGroup.deeplens_listing_id;
            }
            else
            {
                productId = Guid.NewGuid();
                bool isReviewCandidate = false;
                Guid reviewSourceProductId = Guid.Empty;
                int matchDistance = int.MaxValue;

                // ── Any-to-any visual duplicate check (≥2 matching image pairs required) ──
                // Compute phashes for all images in the incoming group, then vote across
                // products in the cache. A product needs ≥ MATCH_VOTE_THRESHOLD matching
                // pairs to be treated as a duplicate.
                const int MATCH_VOTE_THRESHOLD = 3;
                var incomingPhashes = await ComputeIncomingPhashesAsync(evt.MediaFiles, storage, ct);

                if (incomingPhashes.Count > 0)
                {
                    try
                    {
                        // Group cache entries by product so we vote per product
                        var cacheByProduct = _hashCache.GetAll()
                            .GroupBy(e => e.ProductId)
                            .ToDictionary(g => g.Key, g => g.ToList());

                        Guid bestProductId = Guid.Empty;
                        int bestProductVotes = 0;
                        int bestProductDistance = int.MaxValue;
                        string bestProductCategory = string.Empty;

                        foreach (var (candidateProductId, candidateEntries) in cacheByProduct)
                        {
                            // For each incoming hash find its best match in this candidate product
                            int votes = 0;
                            int closestDistance = int.MaxValue;

                            foreach (var incomingHash in incomingPhashes)
                            {
                                int pairBestDist = int.MaxValue;
                                foreach (var entry in candidateEntries)
                                {
                                    int d = PerceptualHashHelper.GetHammingDistance(incomingHash, entry.Phash);
                                    if (d < pairBestDist) pairBestDist = d;
                                }

                                // A pair counts as a match if distance ≤ 4 (review threshold)
                                if (pairBestDist <= 4)
                                {
                                    votes++;
                                    if (pairBestDist < closestDistance) closestDistance = pairBestDist;
                                }
                            }

                            if (votes > bestProductVotes ||
                                (votes == bestProductVotes && closestDistance < bestProductDistance))
                            {
                                bestProductVotes = votes;
                                bestProductDistance = closestDistance;
                                bestProductId = candidateProductId;
                                bestProductCategory = candidateEntries[0].Category;
                            }
                        }

                        if (bestProductVotes >= MATCH_VOTE_THRESHOLD && bestProductId != Guid.Empty)
                        {
                            matchDistance = bestProductDistance;
                            _logger.LogInformation(
                                "Any-to-any visual match: Product {MatchProductId}, votes={Votes}, bestDist={Distance}, categories: Current={CurrentCat}, Matched={MatchedCat}",
                                bestProductId, bestProductVotes, bestProductDistance, extracted.Category, bestProductCategory);

                            // Rule 1: Auto-merge (best distance ≤ 2 AND categories match)
                            if (bestProductDistance <= 2 && string.Equals(extracted.Category, bestProductCategory, StringComparison.OrdinalIgnoreCase))
                            {
                                isAutoMerge = true;
                                productId = bestProductId;
                            }
                            // Rule 2: Review queue (distance 3-4, OR ≤2 with category mismatch)
                            else if (bestProductDistance <= 4)
                            {
                                isReviewCandidate = true;
                                reviewSourceProductId = bestProductId;
                            }
                        }
                        else
                        {
                            _logger.LogDebug(
                                "No sufficient visual match found (best votes={Votes}, threshold={Threshold}).",
                                bestProductVotes, MATCH_VOTE_THRESHOLD);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed during any-to-any dHash duplicate check.");
                    }
                }

                if (isAutoMerge)
                {
                    _logger.LogInformation("Auto-merging incoming listing with existing Product {ProductId}.", productId);

                    // Check if listing already exists for this vendor and product
                    var existingListing = await conn.QuerySingleOrDefaultAsync<dynamic>(
                        "SELECT id, current_price, currency FROM public.vendor_listings WHERE product_id = @ProductId AND vendor_id = @VendorId",
                        new { ProductId = productId, VendorId = evt.VendorId },
                        trans
                    );

                    if (existingListing != null)
                    {
                        listingId = (Guid)existingListing.id;
                        decimal? oldPrice = existingListing.current_price as decimal?;
                        if (oldPrice != extracted.Price)
                        {
                            await conn.ExecuteAsync(@"
                                INSERT INTO public.price_history (listing_id, price, currency) 
                                VALUES (@ListingId, @Price, @Currency)", 
                                new { ListingId = listingId, Price = oldPrice ?? 0m, Currency = (string)existingListing.currency }, trans);
                        }

                        await conn.ExecuteAsync(
                            @"UPDATE public.vendor_listings 
                              SET current_price = @Price, description = @Description, updated_at = NOW(), is_active = true
                              WHERE id = @ListingId",
                            new { Price = extracted.Price, Description = evt.Description, ListingId = listingId },
                            trans
                        );
                    }
                    else
                    {
                        listingId = Guid.NewGuid();
                        const string listingSql = @"
                            INSERT INTO public.vendor_listings (id, product_id, vendor_id, current_price, currency, is_plus_shipping, description, is_active, updated_at, source_group_id)
                            VALUES (@Id, @ProductId, @VendorId, @Price, @Currency, @IsPlusShipping, @Description, true, NOW(), @SourceGroupId)";

                        await conn.ExecuteAsync(listingSql, new
                        {
                            Id = listingId,
                            ProductId = productId,
                            VendorId = evt.VendorId,
                            Price = extracted.Price,
                            Currency = "INR",
                            IsPlusShipping = extracted.IsPlusShipping,
                            Description = evt.Description,
                            SourceGroupId = evt.GroupId
                        }, trans);
                    }

                    // Update wa.message_groups
                    if (existingGroup != null)
                    {
                        await conn.ExecuteAsync(
                            @"UPDATE wa.message_groups 
                              SET status = 'product_created', deeplens_product_id = @ProductId, deeplens_listing_id = @ListingId,
                                  category = @Category, sub_category = @SubCategory, detected_price = @Price, is_plus_shipping = @IsPlusShipping,
                                  product_created_at = NOW(), updated_at = NOW()
                              WHERE group_id = @GroupId",
                            new
                            {
                                ProductId = productId,
                                ListingId = listingId,
                                Category = extracted.Category,
                                SubCategory = extracted.SubCategory,
                                Price = extracted.Price,
                                IsPlusShipping = extracted.IsPlusShipping,
                                GroupId = evt.GroupId
                            },
                            trans
                        );
                    }
                    else
                    {
                        await conn.ExecuteAsync(
                            @"INSERT INTO wa.message_groups 
                              (group_id, jid, status, process_as_product, description, media_count, text_count, deeplens_product_id, deeplens_listing_id, category, sub_category, detected_price, is_plus_shipping, last_message_at, product_created_at, created_at, updated_at)
                              VALUES (@GroupId, @Jid, 'product_created', true, @Description, @MediaCount, @TextCount, @ProductId, @ListingId, @Category, @SubCategory, @Price, @IsPlusShipping, NOW(), NOW(), NOW(), NOW())",
                            new
                            {
                                GroupId = evt.GroupId,
                                Jid = evt.Jid,
                                Description = evt.Description,
                                MediaCount = evt.MediaFiles.Count,
                                TextCount = 1,
                                ProductId = productId,
                                ListingId = listingId,
                                Category = extracted.Category,
                                SubCategory = extracted.SubCategory,
                                Price = extracted.Price,
                                IsPlusShipping = extracted.IsPlusShipping
                            },
                            trans
                        );
                    }

                    // Link existing media of the matched product to the new listing
                    var existingProductMedia = await conn.QueryAsync<dynamic>(
                        "SELECT media_id, is_primary FROM public.media_links WHERE entity_id = @ProductId AND entity_type = 'product'",
                        new { ProductId = productId },
                        trans
                    );
                    foreach (var m in existingProductMedia)
                    {
                        await LinkMedia(conn, (Guid)m.media_id, listingId, "vendor_listing", (bool)m.is_primary, trans);
                    }

                    await LogGroupAudit(conn, evt.GroupId, "product_auto_merged", "system", null, new { product_id = productId, listing_id = listingId }, trans);
                }
                else
                {
                    var nextVal = await conn.QuerySingleAsync<long>("SELECT nextval('productid_id_seq')", null, trans);
                    var sku = $"VF{nextVal:X3}";

                    Guid? categoryId = await ResolveCategoryId(conn, "general", trans);

                    var unifiedAttributes = JsonSerializer.Serialize(new
                    {
                        fabric = extracted.Fabric,
                        stitch_type = extracted.StitchType,
                        price = extracted.Price,
                        is_plus_shipping = extracted.IsPlusShipping,
                        color = extracted.Color,
                        sizes = extracted.Sizes
                    });

                    // Build a clean title: strip emojis + collapse whitespace + trim
                    string cleanRawDesc = !string.IsNullOrEmpty(rawDesc) ? Regex.Replace(rawDesc, @"[*~_`]", "") : "";
                    string title = !string.IsNullOrEmpty(extracted.Title) && extracted.Title != "New Product"
                        ? extracted.Title
                        : (!string.IsNullOrEmpty(cleanRawDesc)
                            ? StripEmojis(cleanRawDesc).Replace("\n", " ").Replace("\r", " ")
                                  .Trim()
                                  .Substring(0, Math.Min(StripEmojis(cleanRawDesc).Replace("\n", " ").Replace("\r", " ").Trim().Length, 100))
                            : "New Product");

                    // Strip placeholder-only titles
                    var placeholders = new[] { "[image]", "[video]", "[photo]", "[sticker]" };
                    if (title.Split(' ').All(t => placeholders.Contains(t.ToLower())))
                    {
                        title = "New Product";
                    }

                    const string productSql = @"
                        INSERT INTO public.products (id, category_id, base_sku, title, fabric, stitch_type, tags, unified_attributes, sequence_id, created_at)
                        VALUES (@Id, @CategoryId, @Sku, @Title, @Fabric, @StitchType, @Tags, @UnifiedAttributes::jsonb, @SeqId, NOW())";

                    await conn.ExecuteAsync(productSql, new
                    {
                        Id = productId,
                        CategoryId = categoryId,
                        Sku = sku,
                        Title = title,
                        Fabric = extracted.Fabric,
                        StitchType = extracted.StitchType,
                        Tags = extracted.Tags,
                        UnifiedAttributes = unifiedAttributes,
                        SeqId = (int)nextVal
                    }, trans);

                    listingId = Guid.NewGuid();
                    const string listingSql = @"
                        INSERT INTO public.vendor_listings (id, product_id, vendor_id, current_price, currency, is_plus_shipping, description, is_active, updated_at, source_group_id)
                        VALUES (@Id, @ProductId, @VendorId, @Price, @Currency, @IsPlusShipping, @Description, true, NOW(), @SourceGroupId)";

                    await conn.ExecuteAsync(listingSql, new
                    {
                        Id = listingId,
                        ProductId = productId,
                        VendorId = evt.VendorId,
                        Price = extracted.Price,
                        Currency = "INR",
                        IsPlusShipping = extracted.IsPlusShipping,
                        Description = evt.Description,
                        SourceGroupId = evt.GroupId
                    }, trans);

                    if (existingGroup != null)
                    {
                        await conn.ExecuteAsync(
                            @"UPDATE wa.message_groups 
                              SET status = 'product_created', deeplens_product_id = @ProductId, deeplens_listing_id = @ListingId,
                                  category = @Category, sub_category = @SubCategory, detected_price = @Price, is_plus_shipping = @IsPlusShipping,
                                  product_created_at = NOW(), updated_at = NOW()
                              WHERE group_id = @GroupId",
                            new
                            {
                                ProductId = productId,
                                ListingId = listingId,
                                Category = "general",
                                SubCategory = "General",
                                Price = extracted.Price,
                                IsPlusShipping = extracted.IsPlusShipping,
                                GroupId = evt.GroupId
                            },
                            trans
                        );
                    }
                    else
                    {
                        await conn.ExecuteAsync(
                            @"INSERT INTO wa.message_groups 
                              (group_id, jid, status, process_as_product, description, media_count, text_count, deeplens_product_id, deeplens_listing_id, category, sub_category, detected_price, is_plus_shipping, last_message_at, product_created_at, created_at, updated_at)
                              VALUES (@GroupId, @Jid, 'product_created', true, @Description, @MediaCount, @TextCount, @ProductId, @ListingId, @Category, @SubCategory, @Price, @IsPlusShipping, NOW(), NOW(), NOW(), NOW())",
                            new
                            {
                                GroupId = evt.GroupId,
                                Jid = evt.Jid,
                                Description = evt.Description,
                                MediaCount = evt.MediaFiles.Count,
                                TextCount = 1,
                                ProductId = productId,
                                ListingId = listingId,
                                Category = "general",
                                SubCategory = "General",
                                Price = extracted.Price,
                                IsPlusShipping = extracted.IsPlusShipping
                            },
                            trans
                        );
                    }

                    await LogGroupAudit(conn, evt.GroupId, "product_created", "system", null, new { product_id = productId, listing_id = listingId }, trans);

                    if (isReviewCandidate)
                    {
                        // similarity_score stored as Hamming distance (lower = more similar)
                        await conn.ExecuteAsync(@"
                            INSERT INTO public.product_merge_candidates (product_a_id, product_b_id, similarity_score, status, detected_at)
                            VALUES (@ProductAId, @ProductBId, @SimilarityScore, 'pending', NOW())
                            ON CONFLICT (product_a_id, product_b_id) DO NOTHING",
                            new
                            {
                                ProductAId = reviewSourceProductId,
                                ProductBId = productId,
                                SimilarityScore = (double)matchDistance
                            }, trans);
                        
                        await LogGroupAudit(conn, evt.GroupId, "review_candidate_enqueued", "system", null, new { canonical_product_id = reviewSourceProductId, new_product_id = productId, distance = matchDistance }, trans);
                    }
                }
            }

            // 3. Process Media Files (idempotent migration)
            if (!isAutoMerge)
            {
                string cleanCategory = "general";

                foreach (var mediaFile in evt.MediaFiles)
                {
                    try
                    {
                        string sourcePath = mediaFile.MediaUrl;
                        if (sourcePath.StartsWith("minio://"))
                        {
                            sourcePath = sourcePath.Substring(8);
                            var parts = sourcePath.Split('/', 2);
                            if (parts.Length > 1)
                            {
                                sourcePath = parts[0] + "/" + parts[1];
                            }
                        }

                        string fileName = Path.GetFileName(sourcePath);
                        string targetPath = $"{cleanCategory}/{evt.GroupId}/{fileName}";

                        Guid mediaId = Guid.Parse(mediaFile.MediaId);
                        var mediaType = mediaFile.MediaType == "video" ? 2 : 1;

                        var mediaExists = await conn.QuerySingleOrDefaultAsync<Guid?>(
                            "SELECT id FROM public.media WHERE id = @Id", new { Id = mediaId }, trans);

                        string? phash = null;

                        if (!mediaExists.HasValue)
                        {
                            using (var stream = await storage.GetFileAsync(sourcePath))
                            {
                                using var memStream = new MemoryStream();
                                await stream.CopyToAsync(memStream, ct);
                                memStream.Position = 0;

                                // Don't hash stickers (arrive as image/webp) — they're common
                                // across all groups and would produce false-positive duplicate matches.
                                bool isSticker = string.Equals(mediaFile.MimeType, "image/webp", StringComparison.OrdinalIgnoreCase);
                                if (mediaType == 1 && !isSticker) // image, non-sticker
                                {
                                    try
                                    {
                                        phash = PerceptualHashHelper.ComputeDHash(memStream);
                                        memStream.Position = 0;
                                    }
                                    catch (Exception ex)
                                    {
                                        _logger.LogError(ex, "Failed to compute dHash for media {MediaId}", mediaId);
                                    }
                                }

                                await storage.UploadToPathAsync(targetPath, memStream, mediaFile.MimeType);
                            }

                            const string insertMediaSql = @"
                                INSERT INTO public.media (id, storage_path, media_type, original_filename, file_size_bytes, mime_type, status, category, subcategory, phash, uploaded_at)
                                VALUES (@Id, @StoragePath, @MediaType, @OriginalFilename, 0, @MimeType, 0, @Category, @SubCategory, @Phash, NOW())";
                            
                            await conn.ExecuteAsync(insertMediaSql, new
                            {
                                Id = mediaId,
                                StoragePath = targetPath,
                                MediaType = mediaType,
                                OriginalFilename = fileName,
                                MimeType = mediaFile.MimeType,
                                Category = cleanCategory,
                                SubCategory = CleanBucketName(extracted.SubCategory),
                                Phash = phash
                            }, trans);
                        }
                        else
                        {
                            // Check if file copy needed (if path changed)
                            var currentMedia = await conn.QuerySingleAsync<dynamic>(
                                "SELECT storage_path, phash FROM public.media WHERE id = @Id", new { Id = mediaId }, trans);
                            
                            string currentPath = currentMedia.storage_path;
                            phash = currentMedia.phash;

                            if (currentPath != targetPath)
                            {
                                using (var stream = await storage.GetFileAsync(sourcePath))
                                {
                                    using var memStream = new MemoryStream();
                                    await stream.CopyToAsync(memStream, ct);
                                    memStream.Position = 0;

                                    if (mediaType == 1 && string.IsNullOrEmpty(phash) && 
                                        !string.Equals(mediaFile.MimeType, "image/webp", StringComparison.OrdinalIgnoreCase))
                                    {
                                        try
                                        {
                                            phash = PerceptualHashHelper.ComputeDHash(memStream);
                                            memStream.Position = 0;
                                        }
                                        catch (Exception ex)
                                        {
                                            _logger.LogError(ex, "Failed to compute dHash for existing media {MediaId}", mediaId);
                                        }
                                    }

                                    await storage.UploadToPathAsync(targetPath, memStream, mediaFile.MimeType);
                                }

                                await conn.ExecuteAsync(
                                    "UPDATE public.media SET storage_path = @StoragePath, category = @Category, subcategory = @SubCategory, phash = @Phash WHERE id = @Id",
                                    new { Id = mediaId, StoragePath = targetPath, Category = cleanCategory, SubCategory = CleanBucketName(extracted.SubCategory), Phash = phash },
                                    trans
                                );
                            }
                        }

                        await LinkMedia(conn, mediaId, productId, "product", true, trans);
                        await LinkMedia(conn, mediaId, listingId, "vendor_listing", true, trans);

                        // Add to in-memory cache if phash computed (stickers are excluded upstream)
                        if (mediaType == 1 && !string.IsNullOrEmpty(phash))
                        {
                            _hashCache.Add(mediaId, productId, phash, extracted.Category);
                        }

                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to migrate media file: {MediaUrl}", mediaFile.MediaUrl);
                    }
                }
            }

            await trans.CommitAsync(ct);

            // 4. Emit write-back event
            await EmitProductCreatedWriteBack(evt.GroupId, productId, listingId, extracted.Category, extracted.SubCategory, ct);

            // 5. Emit async enrichment event (only if newly created)
            if ((existingGroup == null || existingGroup.deeplens_product_id == null) && !isAutoMerge)
            {
                var enrichEvt = new WhatsAppGroupProductEnrichmentEvent
                {
                    EventId = Guid.NewGuid(),
                    GroupId = evt.GroupId,
                    ProductId = productId,
                    Description = evt.Description ?? "",
                    Timestamp = DateTime.UtcNow
                };

                using var producerScope = _serviceProvider.CreateScope();
                var producer = producerScope.ServiceProvider.GetRequiredService<IProducer<string, string>>();
                await producer.ProduceAsync(KafkaTopics.ProductEnrichmentRequested, new Message<string, string>
                {
                    Key = evt.GroupId,
                    Value = JsonSerializer.Serialize(enrichEvt, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
                }, ct);
                
                _logger.LogInformation("Emitted enrichment request for GroupId: {GroupId}, ProductId: {ProductId}", evt.GroupId, productId);
            }
        }
        catch (Exception ex)
        {
            await trans.RollbackAsync(ct);
            _logger.LogError(ex, "Failed transaction for GroupProductCreate. GroupId: {GroupId}", evt.GroupId);
            
            try
            {
                await conn.ExecuteAsync(
                    "UPDATE wa.message_groups SET status = 'error', error_detail = @Error, updated_at = NOW() WHERE group_id = @GroupId",
                    new { Error = ex.Message, GroupId = evt.GroupId }
                );
                await LogGroupAudit(conn, evt.GroupId, "error", "system", null, new { error = ex.Message });
            }
            catch (Exception dbEx)
            {
                _logger.LogError(dbEx, "Failed to update error status in database");
            }
        }
    }

    private async Task HandleGroupMediaAdded(string messageJson, CancellationToken ct)
    {
        var evt = JsonSerializer.Deserialize<WhatsAppGroupMediaAddedEvent>(messageJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (evt == null) return;

        _logger.LogInformation("Processing group media addition for GroupId: {GroupId}", evt.GroupId);

        using var scope = _serviceProvider.CreateScope();
        var storage = scope.ServiceProvider.GetRequiredService<IStorageService>();

        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        using var trans = await conn.BeginTransactionAsync(ct);

        try
        {
            var group = await conn.QuerySingleOrDefaultAsync<dynamic>(
                "SELECT deeplens_product_id, deeplens_listing_id, category, sub_category FROM wa.message_groups WHERE group_id = @GroupId",
                new { GroupId = evt.GroupId },
                trans
            );

            if (group == null || group.deeplens_product_id == null)
            {
                _logger.LogWarning("Cannot add media: group/product not found for GroupId: {GroupId}", evt.GroupId);
                return;
            }

            Guid productId = group.deeplens_product_id;
            Guid listingId = group.deeplens_listing_id;
            string category = group.category ?? "Others";
            string subCategory = group.sub_category ?? "General";
            string cleanCategory = "general";

            foreach (var mediaFile in evt.MediaFiles)
            {
                try
                {
                    string sourcePath = mediaFile.MediaUrl;
                    if (sourcePath.StartsWith("minio://"))
                    {
                        sourcePath = sourcePath.Substring(8);
                        var parts = sourcePath.Split('/', 2);
                        if (parts.Length > 1)
                        {
                            sourcePath = parts[0] + "/" + parts[1];
                        }
                    }

                    string fileName = Path.GetFileName(sourcePath);
                    string targetPath = $"{cleanCategory}/{evt.GroupId}/{fileName}";

                    Guid mediaId = Guid.Parse(mediaFile.MediaId);
                    var mediaType = mediaFile.MediaType == "video" ? 2 : 1;

                    var mediaExists = await conn.QuerySingleOrDefaultAsync<Guid?>(
                        "SELECT id FROM public.media WHERE id = @Id", new { Id = mediaId }, trans);

                    if (mediaExists.HasValue)
                    {
                        _logger.LogInformation("Media {MediaId} already exists, skipping copy/insert", mediaId);
                        continue;
                    }

                    _logger.LogInformation("Migrating new media from {Source} to {Target}", sourcePath, targetPath);

                    string? phash = null;
                    using (var stream = await storage.GetFileAsync(sourcePath))
                    {
                        using var memStream = new MemoryStream();
                        await stream.CopyToAsync(memStream, ct);
                        memStream.Position = 0;

                        // Don't hash stickers (arrive as image/webp) — they're common
                        // across all groups and would produce false-positive duplicate matches.
                        bool isSticker = string.Equals(mediaFile.MimeType, "image/webp", StringComparison.OrdinalIgnoreCase);
                        if (mediaType == 1 && !isSticker) // image, non-sticker
                        {
                            try
                            {
                                phash = PerceptualHashHelper.ComputeDHash(memStream);
                                memStream.Position = 0;
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Failed to compute dHash for added media {MediaId}", mediaId);
                            }
                        }

                        await storage.UploadToPathAsync(targetPath, memStream, mediaFile.MimeType);
                    }

                    const string insertMediaSql = @"
                        INSERT INTO public.media (id, storage_path, media_type, original_filename, file_size_bytes, mime_type, status, category, subcategory, phash, uploaded_at)
                        VALUES (@Id, @StoragePath, @MediaType, @OriginalFilename, 0, @MimeType, 0, @Category, @SubCategory, @Phash, NOW())";
                    
                    await conn.ExecuteAsync(insertMediaSql, new
                    {
                        Id = mediaId,
                        StoragePath = targetPath,
                        MediaType = mediaType,
                        OriginalFilename = fileName,
                        MimeType = mediaFile.MimeType,
                        Category = cleanCategory,
                        SubCategory = CleanBucketName(subCategory),
                        Phash = phash
                    }, trans);

                    await LinkMedia(conn, mediaId, productId, "product", false, trans);
                    await LinkMedia(conn, mediaId, listingId, "vendor_listing", false, trans);

                    // Add to cache (stickers excluded upstream via isSticker check)
                    if (mediaType == 1 && !string.IsNullOrEmpty(phash))
                    {
                        _hashCache.Add(mediaId, productId, phash, category);
                    }

                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to migrate added media file: {MediaUrl}", mediaFile.MediaUrl);
                }
            }

            await conn.ExecuteAsync(
                @"UPDATE wa.message_groups 
                  SET media_count = (SELECT COUNT(*) FROM public.media_links WHERE entity_id = @ProductId AND entity_type = 'product'),
                      updated_at = NOW()
                  WHERE group_id = @GroupId",
                new { ProductId = productId, GroupId = evt.GroupId },
                trans
            );

            await LogGroupAudit(conn, evt.GroupId, "media_added", "system", null, new { media_count = evt.MediaFiles.Count }, trans);

            await trans.CommitAsync(ct);

            // ── Post-commit: cross-product any-to-any check for the newly added media ──
            // Now that all new media are in the cache, check whether this product as a whole
            // has accumulated ≥2 matching pairs against any other product.
            await CheckAndEnqueueCrossProductCandidatesAsync(productId, category, conn, ct);
        }
        catch (Exception ex)
        {
            await trans.RollbackAsync(ct);
            _logger.LogError(ex, "Failed to add media to product. GroupId: {GroupId}", evt.GroupId);
        }
    }

    private async Task HandleGroupReprocess(string messageJson, CancellationToken ct)
    {
        var evt = JsonSerializer.Deserialize<WhatsAppGroupReprocessEvent>(messageJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (evt == null) return;

        _logger.LogInformation("Processing group split/merge reprocess. Type: {ReprocessType}, GroupId: {GroupId}, Target: {TargetGroupId}", 
            evt.ReprocessType, evt.GroupId, evt.TargetGroupId);

        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        using var trans = await conn.BeginTransactionAsync(ct);

        try
        {
            if (evt.ReprocessType == "split")
            {
                var remainingMedia = await conn.QueryAsync<string>(
                    "SELECT message_id FROM wa.messages WHERE group_id = @GroupId AND is_deleted = false",
                    new { GroupId = evt.GroupId },
                    trans
                );
                
                var originalProduct = await conn.QuerySingleOrDefaultAsync<dynamic>(
                    "SELECT deeplens_product_id, deeplens_listing_id FROM wa.message_groups WHERE group_id = @GroupId",
                    new { GroupId = evt.GroupId },
                    trans
                );

                if (originalProduct != null && originalProduct.deeplens_product_id != null)
                {
                    Guid productId = originalProduct.deeplens_product_id;
                    Guid listingId = originalProduct.deeplens_listing_id;

                    var linkedMedia = await conn.QueryAsync<dynamic>(
                        "SELECT ml.media_id FROM public.media_links ml WHERE ml.entity_id = @ProductId AND ml.entity_type = 'product'",
                        new { ProductId = productId },
                        trans
                    );

                    var remainingMediaIds = remainingMedia
                        .Select(m => Guid.Parse(uuidFromMessageId(m)))
                        .ToHashSet();

                    foreach (var media in linkedMedia)
                    {
                        Guid mediaId = media.media_id;
                        if (!remainingMediaIds.Contains(mediaId))
                        {
                            _logger.LogInformation("Unlinking split-off media {MediaId} from original product {ProductId}", mediaId, productId);
                            await conn.ExecuteAsync(
                                "DELETE FROM public.media_links WHERE media_id = @MediaId AND entity_id = @EntityId AND entity_type = 'product'",
                                new { MediaId = mediaId, EntityId = productId },
                                trans
                            );
                            await conn.ExecuteAsync(
                                "DELETE FROM public.media_links WHERE media_id = @MediaId AND entity_id = @EntityId AND entity_type = 'vendor_listing'",
                                new { MediaId = mediaId, EntityId = listingId },
                                trans
                            );
                        }
                    }

                    await conn.ExecuteAsync(
                        @"UPDATE wa.message_groups 
                          SET media_count = (SELECT COUNT(*) FROM public.media_links WHERE entity_id = @ProductId AND entity_type = 'product'),
                              updated_at = NOW()
                          WHERE group_id = @GroupId",
                        new { ProductId = productId, GroupId = evt.GroupId },
                        trans
                    );
                }

                await LogGroupAudit(conn, evt.GroupId, "split_reprocess", "system", null, new { message = "Split cleanup complete" }, trans);
            }
            else if (evt.ReprocessType == "merge")
            {
                var sourceGroup = await conn.QuerySingleOrDefaultAsync<dynamic>(
                    "SELECT deeplens_product_id, deeplens_listing_id FROM wa.message_groups WHERE group_id = @GroupId",
                    new { GroupId = evt.GroupId },
                    trans
                );

                var targetGroup = await conn.QuerySingleOrDefaultAsync<dynamic>(
                    "SELECT deeplens_product_id, deeplens_listing_id FROM wa.message_groups WHERE group_id = @TargetGroupId",
                    new { GroupId = evt.TargetGroupId },
                    trans
                );

                if (sourceGroup != null && sourceGroup.deeplens_product_id != null && 
                    targetGroup != null && targetGroup.deeplens_product_id != null)
                {
                    Guid sourceProductId = sourceGroup.deeplens_product_id;
                    Guid sourceListingId = sourceGroup.deeplens_listing_id;
                    Guid targetProductId = targetGroup.deeplens_product_id;
                    Guid targetListingId = targetGroup.deeplens_listing_id;

                    _logger.LogInformation("Merging media links from source product {Source} to target product {Target}", sourceProductId, targetProductId);

                    await conn.ExecuteAsync(
                        @"UPDATE public.media_links 
                          SET entity_id = @TargetProductId 
                          WHERE entity_id = @SourceProductId AND entity_type = 'product'
                          ON CONFLICT DO NOTHING",
                        new { TargetProductId = targetProductId, SourceProductId = sourceProductId },
                        trans
                    );
                    
                    await conn.ExecuteAsync(
                        "DELETE FROM public.media_links WHERE entity_id = @SourceProductId AND entity_type = 'product'",
                        new { SourceProductId = sourceProductId },
                        trans
                    );

                    await conn.ExecuteAsync(
                        @"UPDATE public.media_links 
                          SET entity_id = @TargetListingId 
                          WHERE entity_id = @SourceListingId AND entity_type = 'vendor_listing'
                          ON CONFLICT DO NOTHING",
                        new { TargetListingId = targetListingId, SourceListingId = sourceListingId },
                        trans
                    );
                    
                    await conn.ExecuteAsync(
                        "DELETE FROM public.media_links WHERE entity_id = @SourceListingId AND entity_type = 'vendor_listing'",
                        new { SourceListingId = sourceListingId },
                        trans
                    );

                    await conn.ExecuteAsync(
                        "UPDATE public.vendor_listings SET is_active = false, updated_at = NOW() WHERE id = @Id",
                        new { Id = sourceListingId },
                        trans
                    );

                    await conn.ExecuteAsync(
                        @"UPDATE wa.message_groups 
                          SET media_count = (SELECT COUNT(*) FROM public.media_links WHERE entity_id = @TargetProductId AND entity_type = 'product'),
                              updated_at = NOW()
                          WHERE group_id = @GroupId",
                        new { ProductId = targetProductId, GroupId = evt.TargetGroupId },
                        trans
                    );

                    await conn.ExecuteAsync(
                        "UPDATE wa.message_groups SET status = 'ignored', error_detail = 'Merged into ' || @TargetGroupId, updated_at = NOW() WHERE group_id = @GroupId",
                        new { TargetGroupId = evt.TargetGroupId, GroupId = evt.GroupId },
                        trans
                    );
                }

                await LogGroupAudit(conn, evt.GroupId, "merged", "system", null, new { merged_into = evt.TargetGroupId }, trans);
            }

            await trans.CommitAsync(ct);
        }
        catch (Exception ex)
        {
            await trans.RollbackAsync(ct);
            _logger.LogError(ex, "Failed split/merge reprocess. GroupId: {GroupId}", evt.GroupId);
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

    private async Task LinkMedia(NpgsqlConnection conn, Guid mediaId, Guid entityId, string entityType, bool isPrimary, NpgsqlTransaction trans)
    {
        const string sql = @"
            INSERT INTO public.media_links (media_id, entity_id, entity_type, is_primary)
            VALUES (@MediaId, @EntityId, @EntityType, @IsPrimary)
            ON CONFLICT DO NOTHING";
        
        await conn.ExecuteAsync(sql, new { MediaId = mediaId, EntityId = entityId, EntityType = entityType, IsPrimary = isPrimary }, trans);
    }

    private async Task LogGroupAudit(NpgsqlConnection conn, string groupId, string eventName, string actor, object? oldValue, object? newValue, NpgsqlTransaction? trans = null)
    {
        const string sql = @"
            INSERT INTO wa.group_audit_log (group_id, event, actor, old_value, new_value, occurred_at)
            VALUES (@GroupId, @Event, @Actor, @OldValue::jsonb, @NewValue::jsonb, NOW())";
        
        await conn.ExecuteAsync(sql, new
        {
            GroupId = groupId,
            Event = eventName,
            Actor = actor,
            OldValue = oldValue != null ? JsonSerializer.Serialize(oldValue) : null,
            NewValue = newValue != null ? JsonSerializer.Serialize(newValue) : null
        }, trans);
    }

    private async Task EmitImageUploadedEvent(Guid mediaId, string filePath, string fileName, string contentType, string category, string subCategory, string chatJid, string messageId, string groupId, CancellationToken ct)
    {
        var uploadEvent = new ImageUploadedEvent
        {
            EventId = Guid.NewGuid(),
            EventType = "image.uploaded",
            EventVersion = "1.0",
            Timestamp = DateTime.UtcNow,
            TenantId = "SINGLE_TENANT",
            Data = new ImageUploadedData
            {
                ImageId = mediaId,
                FileName = fileName,
                FilePath = filePath,
                FileSize = 0,
                ContentType = contentType,
                Category = category,
                SubCategory = subCategory,
                UploadedBy = "whatsapp-processor",
                Metadata = new ImageMetadata
                {
                    OriginalFileName = fileName,
                    Format = contentType,
                    ExifData = new Dictionary<string, object>
                    {
                        { "source", "whatsapp" },
                        { "chatJid", chatJid },
                        { "messageId", messageId },
                        { "groupId", groupId }
                    }
                }
            },
            ProcessingOptions = new ProcessingOptions
            {
                TargetThumbnailSizes = new[] { "icon", "medium", "large" },
                ThumbnailFormat = "webp",
                ThumbnailQuality = 80,
                Retention = "days180"
            }
        };

        await _producer.ProduceAsync(KafkaTopics.ImageUploaded, new Message<string, string>
        {
            Key = chatJid,
            Value = JsonSerializer.Serialize(uploadEvent)
        }, ct);
    }

    private async Task EmitProductCreatedWriteBack(string groupId, Guid productId, Guid listingId, string category, string subCategory, CancellationToken ct)
    {
        var writeBack = new WhatsAppGroupProductCreatedEvent
        {
            EventId = Guid.NewGuid(),
            EventType = "whatsapp.group.product.created",
            GroupId = groupId,
            ProductId = productId,
            ListingId = listingId,
            Category = category,
            SubCategory = subCategory,
            Timestamp = DateTime.UtcNow
        };

        await _producer.ProduceAsync(KafkaTopics.GroupProductCreated, new Message<string, string>
        {
            Key = groupId,
            Value = JsonSerializer.Serialize(writeBack)
        }, ct);
    }

    private string CleanBucketName(string category)
    {
        if (string.IsNullOrEmpty(category)) return "general";
        var result = category.Trim().ToLowerInvariant();
        if (result == "others") return "general";
        result = result.Replace(" ", "-");
        var sb = new StringBuilder();
        foreach (var c in result)
        {
            if (char.IsLetterOrDigit(c) || c == '-')
            {
                sb.Append(c);
            }
        }
        var clean = sb.ToString();
        return string.IsNullOrEmpty(clean) ? "general" : clean;
    }

    public static int LevenshteinDistance(string s, string t)
    {
        if (string.IsNullOrEmpty(s)) return t?.Length ?? 0;
        if (string.IsNullOrEmpty(t)) return s?.Length ?? 0;
        int n = s.Length;
        int m = t.Length;
        int[,] d = new int[n + 1, m + 1];
        for (int i = 0; i <= n; d[i, 0] = i++) ;
        for (int j = 0; j <= m; d[0, j] = j++) ;
        for (int i = 1; i <= n; i++)
        {
            for (int j = 1; j <= m; j++)
            {
                int cost = (t[j - 1] == s[i - 1]) ? 0 : 1;
                d[i, j] = Math.Min(
                    Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                    d[i - 1, j - 1] + cost);
            }
        }
        return d[n, m];
    }

    /// <summary>
    /// Normalises any free-text category string (e.g. from an AI response or legacy data)
    /// into one of the 5 canonical taxonomy buckets:
    ///   Saree | Lehanga | Dress | Kids | Others
    /// </summary>
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

    /// <summary>
    /// Removes emoji and other Unicode pictographic/symbol characters from a string.
    /// WhatsApp descriptions commonly include decorative emojis that pollute product titles.
    /// </summary>
    private static readonly Regex _emojiRegex = new Regex(
        @"[\uD800-\uDFFF]" +                 // surrogate pairs (most emojis)
        @"|[\u2600-\u27BF]" +                // misc symbols, dingbats
        @"|[\u2300-\u23FF]" +                // misc technical
        @"|[\u2B50-\u2B55]" +                // stars
        @"|[\u1F004]|[\u1F0CF]" +           // mahjong/playing card
        @"|[\u1F300-\u1F9FF]" +             // various emoji blocks (via surrogate pairs – caught above)
        @"|[\u200D\uFE0F\u20E3]" +          // zero-width joiner, variation selectors, combining enclosing keycap
        @"|\p{So}|\p{Sm}|\p{Sk}",           // other symbols/math/modifier symbols
        RegexOptions.Compiled);

    private static string StripEmojis(string text)
    {
        if (string.IsNullOrEmpty(text)) return text;
        // Remove emoji characters then collapse multiple spaces
        var stripped = _emojiRegex.Replace(text, " ");
        // Also collapse runs of whitespace to single space
        return Regex.Replace(stripped, @"\s{2,}", " ").Trim();
    }

    private static string CleanDescriptionForTokenization(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "";
        text = Regex.Replace(text, @"[*~_`]", "");
        var lines = text.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
        var cleanLines = new List<string>();
        foreach (var line in lines)
        {
            var lowerLine = line.ToLowerInvariant();
            if (lowerLine.Contains("http://") || 
                lowerLine.Contains("https://") || 
                lowerLine.Contains("chat.whatsapp.com") || 
                lowerLine.Contains("instagram.com") || 
                lowerLine.Contains("t.me"))
            {
                continue;
            }
            cleanLines.Add(line);
        }
        var cleanedText = string.Join(" ", cleanLines);
        return StripEmojis(cleanedText).ToLowerInvariant();
    }

    private string uuidFromMessageId(string messageId)
    {
        using (var md5 = MD5.Create())
        {
            byte[] hash = md5.ComputeHash(Encoding.UTF8.GetBytes(messageId));
            var sb = new StringBuilder();
            for (int i = 0; i < hash.Length; i++)
            {
                sb.Append(hash[i].ToString("x2"));
            }
            string hex = sb.ToString();
            return string.Join("-", 
                hex.Substring(0, 8),
                hex.Substring(8, 4),
                "4" + hex.Substring(13, 3),
                "8" + hex.Substring(17, 3),
                hex.Substring(20, 12)
            );
        }
    }

    private async Task HandleGroupProductDelete(string messageJson, CancellationToken ct)
    {
        var evt = JsonSerializer.Deserialize<WhatsAppGroupProductDeleteEvent>(messageJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (evt == null) return;

        _logger.LogInformation("Processing group product deletion for GroupId: {GroupId}, Jid: {Jid}", evt.GroupId, evt.Jid);

        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        var groupInfo = await conn.QuerySingleOrDefaultAsync<dynamic>(
            "SELECT deeplens_product_id, deeplens_listing_id FROM wa.message_groups WHERE group_id = @GroupId",
            new { GroupId = evt.GroupId }
        );

        if (groupInfo != null && groupInfo.deeplens_product_id != null)
        {
            Guid productId = groupInfo.deeplens_product_id;
            Guid listingId = groupInfo.deeplens_listing_id;

            using var trans = await conn.BeginTransactionAsync(ct);
            try
            {
                // Delete media links first to avoid foreign key constraints
                await conn.ExecuteAsync(
                    "DELETE FROM public.media_links WHERE entity_id = @ProductId OR entity_id = @ListingId",
                    new { ProductId = productId, ListingId = listingId },
                    trans
                );

                // Delete listing
                await conn.ExecuteAsync(
                    "DELETE FROM public.vendor_listings WHERE product_id = @ProductId",
                    new { ProductId = productId },
                    trans
                );

                // Delete product
                await conn.ExecuteAsync(
                    "DELETE FROM public.products WHERE id = @ProductId",
                    new { ProductId = productId },
                    trans
                );

                // Reset group state to staging
                await conn.ExecuteAsync(
                    @"UPDATE wa.message_groups 
                      SET status = 'staging', 
                          deeplens_product_id = NULL, 
                          deeplens_listing_id = NULL, 
                          product_created_at = NULL, 
                          error_detail = NULL,
                          updated_at = NOW() 
                      WHERE group_id = @GroupId",
                    new { GroupId = evt.GroupId },
                    trans
                );

                await LogGroupAudit(conn, evt.GroupId, "product_deleted", "system", 
                    new { product_id = productId, listing_id = listingId }, 
                    new { status = "staging" }, trans);

                await trans.CommitAsync(ct);
                _hashCache.RemoveProduct(productId);
                _logger.LogInformation("Successfully deleted product {ProductId} and listing {ListingId} for GroupId: {GroupId}", productId, listingId, evt.GroupId);
            }
            catch (Exception ex)
            {
                await trans.RollbackAsync(ct);
                _logger.LogError(ex, "Failed transaction for GroupProductDelete. GroupId: {GroupId}", evt.GroupId);
                throw;
            }
        }
        else
        {
            // Just ensure it's set back to staging in DB
            await conn.ExecuteAsync(
                @"UPDATE wa.message_groups 
                  SET status = 'staging', 
                      deeplens_product_id = NULL, 
                      deeplens_listing_id = NULL, 
                      product_created_at = NULL, 
                      updated_at = NOW() 
                  WHERE group_id = @GroupId",
                new { GroupId = evt.GroupId }
            );
            _logger.LogWarning("No product found to delete for GroupId: {GroupId}, status reset to staging", evt.GroupId);
        }
    }

    /// <summary>
    /// Downloads and hashes all image media files in the event payload.
    /// Returns phash strings for every image that could be processed.
    /// </summary>
    private async Task<List<string>> ComputeIncomingPhashesAsync(
        IEnumerable<WhatsAppGroupMediaFile> mediaFiles,
        IStorageService storage,
        CancellationToken ct)
    {
        var phashes = new List<string>();

        foreach (var mediaFile in mediaFiles)
        {
            // Skip videos. Also skip stickers — the Node.js processor remaps
            // sticker media_type to 'image' but preserves mimeType = 'image/webp'.
            // Stickers appear identically across many groups and would pollute
            // the hash comparison with false-positive matches.
            if (mediaFile.MediaType == "video") continue;
            if (string.Equals(mediaFile.MimeType, "image/webp", StringComparison.OrdinalIgnoreCase)) continue;

            int maxRetries = 3;
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                try
                {
                    string sourcePath = mediaFile.MediaUrl;
                    if (sourcePath.StartsWith("minio://"))
                    {
                        sourcePath = sourcePath.Substring(8);
                        var parts = sourcePath.Split('/', 2);
                        if (parts.Length > 1)
                            sourcePath = parts[0] + "/" + parts[1];
                    }

                    using var stream = await storage.GetFileAsync(sourcePath);
                    using var memStream = new MemoryStream();
                    await stream.CopyToAsync(memStream, ct);
                    memStream.Position = 0;

                    string phash = PerceptualHashHelper.ComputeDHash(memStream);
                    phashes.Add(phash);
                    break; // Success, exit retry loop
                }
                catch (Exception ex)
                {
                    if (attempt == maxRetries)
                    {
                        _logger.LogWarning(ex, "Could not compute phash for media {MediaUrl} after {Retries} attempts", mediaFile.MediaUrl, maxRetries);
                    }
                    else
                    {
                        _logger.LogDebug(ex, "Transient error fetching {MediaUrl}. Retrying in 1s...", mediaFile.MediaUrl);
                        await Task.Delay(1000, ct);
                    }
                }
            }
        }

        return phashes;
    }

    /// <summary>
    /// After media is added to a product, checks whether the updated image set for
    /// <paramref name="thisProductId"/> now produces ≥2 matching pairs against any other
    /// product in the cache. If so, inserts a pending merge candidate for human review.
    /// </summary>
    private async Task CheckAndEnqueueCrossProductCandidatesAsync(
        Guid thisProductId,
        string thisCategory,
        NpgsqlConnection conn,
        CancellationToken ct)
    {
        const int MATCH_VOTE_THRESHOLD = 2;

        try
        {
            // Collect this product's phashes from the cache
            var thisProductHashes = _hashCache.GetAll()
                .Where(e => e.ProductId == thisProductId)
                .Select(e => e.Phash)
                .ToList();

            if (thisProductHashes.Count == 0) return;

            // Group all OTHER products
            var otherProducts = _hashCache.GetAll()
                .Where(e => e.ProductId != thisProductId)
                .GroupBy(e => e.ProductId)
                .ToDictionary(g => g.Key, g => g.ToList());

            foreach (var (candidateId, candidateEntries) in otherProducts)
            {
                int votes = 0;
                int closestDistance = int.MaxValue;

                foreach (var incomingHash in thisProductHashes)
                {
                    int pairBestDist = int.MaxValue;
                    foreach (var entry in candidateEntries)
                    {
                        int d = PerceptualHashHelper.GetHammingDistance(incomingHash, entry.Phash);
                        if (d < pairBestDist) pairBestDist = d;
                    }

                    if (pairBestDist <= 4)
                    {
                        votes++;
                        if (pairBestDist < closestDistance) closestDistance = pairBestDist;
                    }
                }

                if (votes >= MATCH_VOTE_THRESHOLD)
                {
                    _logger.LogInformation(
                        "Cross-product match after media add: Product {ThisId} vs {CandidateId}, votes={Votes}, bestDist={Distance}",
                        thisProductId, candidateId, votes, closestDistance);

                    // Always use canonical ordering (lower GUID first) to avoid duplicates
                    Guid productAId = thisProductId < candidateId ? thisProductId : candidateId;
                    Guid productBId = thisProductId < candidateId ? candidateId : thisProductId;

                    await conn.ExecuteAsync(@"
                        INSERT INTO public.product_merge_candidates (product_a_id, product_b_id, similarity_score, status, detected_at)
                        VALUES (@ProductAId, @ProductBId, @SimilarityScore, 'pending', NOW())
                        ON CONFLICT (product_a_id, product_b_id) DO NOTHING",
                        new
                        {
                            ProductAId = productAId,
                            ProductBId = productBId,
                            SimilarityScore = (double)closestDistance
                        });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed cross-product candidate check for Product {ProductId}", thisProductId);
        }
    }

    public override void Dispose()
    {
        _consumer?.Dispose();
        base.Dispose();
    }

    private async Task HandleProductCategoryChanged(string messageJson, CancellationToken ct)
    {
        var evt = JsonSerializer.Deserialize<ProductCategoryChangedEvent>(messageJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (evt == null) return;

        _logger.LogInformation("Handling Category Change for ProductId: {ProductId} to NewCategory: {NewCategory}", evt.ProductId, evt.NewCategory);

        using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        // 1. Dismiss old pending merge candidates for this product
        await conn.ExecuteAsync(
            @"UPDATE public.product_merge_candidates 
              SET status = 'dismissed', resolved_at = NOW(), resolved_by = 'system' 
              WHERE (product_a_id = @ProductId OR product_b_id = @ProductId) AND status = 'pending'",
            new { ProductId = evt.ProductId }
        );

        // 2. Update the PerceptualHashCache
        _hashCache.UpdateCategory(evt.ProductId, evt.NewCategory);

        // 3. Scan the cache to generate new valid candidates
        var productEntries = _hashCache.GetAll().Where(e => e.ProductId == evt.ProductId).ToList();
        if (productEntries.Count == 0)
        {
            _logger.LogInformation("No hashes found in cache for ProductId: {ProductId}", evt.ProductId);
            return;
        }

        var candidateEntriesByProduct = _hashCache.GetAll()
            .Where(e => e.ProductId != evt.ProductId && e.Category.Equals(evt.NewCategory, StringComparison.OrdinalIgnoreCase))
            .GroupBy(e => e.ProductId)
            .ToDictionary(g => g.Key, g => g.ToList());

        const int MATCH_VOTE_THRESHOLD = 3;

        foreach (var (candidateProductId, candidateEntries) in candidateEntriesByProduct)
        {
            int votes = 0;
            int closestDistance = int.MaxValue;

            foreach (var targetHash in productEntries)
            {
                int pairBestDist = int.MaxValue;
                foreach (var entry in candidateEntries)
                {
                    int d = PerceptualHashHelper.GetHammingDistance(targetHash.Phash, entry.Phash);
                    if (d < pairBestDist) pairBestDist = d;
                }

                if (pairBestDist <= 4)
                {
                    votes++;
                    if (pairBestDist < closestDistance) closestDistance = pairBestDist;
                }
            }

            if (votes >= MATCH_VOTE_THRESHOLD)
            {
                _logger.LogInformation("Category change re-eval: Found match between {ProductA} and {ProductB} with dist {Dist}", candidateProductId, evt.ProductId, closestDistance);

                if (closestDistance <= 2)
                {
                    _logger.LogInformation("Distance <= 2, executing delayed auto-merge.");
                    await ExecuteAutoMergeAsync(conn, candidateProductId, evt.ProductId, ct);
                }
                else
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO public.product_merge_candidates (product_a_id, product_b_id, similarity_score, status, detected_at)
                        VALUES (@ProductAId, @ProductBId, @SimilarityScore, 'pending', NOW())
                        ON CONFLICT (product_a_id, product_b_id) DO NOTHING",
                        new
                        {
                            ProductAId = candidateProductId,
                            ProductBId = evt.ProductId,
                            SimilarityScore = (double)closestDistance
                        });
                }
            }
        }
    }

    private async Task HandleProductMerged(string messageJson, CancellationToken ct)
    {
        var evt = JsonSerializer.Deserialize<ProductMergedEvent>(messageJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (evt == null) return;

        _logger.LogInformation("Handling Product Merge Event. SourceProductId: {SourceProductId} merged into TargetProductId: {TargetProductId}", evt.SourceProductId, evt.TargetProductId);

        try
        {
            // Update in-memory cache to merge the source product hashes into the target product
            _hashCache.MergeProducts(evt.SourceProductId, evt.TargetProductId);
            // Purge the source product from the cache since it's deleted
            _hashCache.RemoveProduct(evt.SourceProductId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating hash cache during product merge");
        }

        await Task.CompletedTask;
    }

    private async Task ExecuteAutoMergeAsync(NpgsqlConnection conn, Guid targetProductId, Guid sourceProductId, CancellationToken ct)
    {
        using var trans = await conn.BeginTransactionAsync(ct);
        try
        {
            var sourceListingId = await conn.QuerySingleOrDefaultAsync<Guid?>(
                new CommandDefinition("SELECT id FROM public.vendor_listings WHERE product_id = @SourceProductId LIMIT 1",
                new { SourceProductId = sourceProductId }, transaction: trans, cancellationToken: ct)
            );

            var targetListingId = await conn.QuerySingleOrDefaultAsync<Guid?>(
                new CommandDefinition("SELECT id FROM public.vendor_listings WHERE product_id = @TargetProductId LIMIT 1",
                new { TargetProductId = targetProductId }, transaction: trans, cancellationToken: ct)
            );

            var sourceSku = await conn.QuerySingleOrDefaultAsync<string>(
                new CommandDefinition("SELECT base_sku FROM public.products WHERE id = @SourceProductId",
                new { SourceProductId = sourceProductId }, transaction: trans, cancellationToken: ct)
            );

            if (!string.IsNullOrEmpty(sourceSku))
            {
                await conn.ExecuteAsync(new CommandDefinition(@"UPDATE public.products 
                      SET tags = array_append(COALESCE(tags, ARRAY[]::text[]), @SourceSku) 
                      WHERE id = @TargetProductId AND NOT (@SourceSku = ANY(COALESCE(tags, ARRAY[]::text[])))", 
                      new { TargetProductId = targetProductId, SourceSku = sourceSku }, transaction: trans, cancellationToken: ct));
            }

            await conn.ExecuteAsync(new CommandDefinition(@"UPDATE public.media_links 
                  SET entity_id = @TargetProductId 
                  WHERE entity_id = @SourceProductId AND entity_type = 'product'
                  ON CONFLICT DO NOTHING", new { TargetProductId = targetProductId, SourceProductId = sourceProductId }, transaction: trans, cancellationToken: ct));

            await conn.ExecuteAsync(new CommandDefinition(@"DELETE FROM public.media_links WHERE entity_id = @SourceProductId AND entity_type = 'product'", 
                new { SourceProductId = sourceProductId }, transaction: trans, cancellationToken: ct));

            if (sourceListingId.HasValue && targetListingId.HasValue)
            {
                await conn.ExecuteAsync(new CommandDefinition(@"UPDATE public.media_links 
                      SET entity_id = @TargetListingId 
                      WHERE entity_id = @SourceListingId AND entity_type = 'vendor_listing'
                      ON CONFLICT DO NOTHING", new { TargetListingId = targetListingId.Value, SourceListingId = sourceListingId.Value }, transaction: trans, cancellationToken: ct));

                await conn.ExecuteAsync(new CommandDefinition(@"DELETE FROM public.media_links WHERE entity_id = @SourceListingId AND entity_type = 'vendor_listing'", 
                    new { SourceListingId = sourceListingId.Value }, transaction: trans, cancellationToken: ct));
            }

            await conn.ExecuteAsync(new CommandDefinition(@"UPDATE public.vendor_listings SET product_id = @TargetProductId, updated_at = NOW() WHERE product_id = @SourceProductId", 
                new { TargetProductId = targetProductId, SourceProductId = sourceProductId }, transaction: trans, cancellationToken: ct));

            await conn.ExecuteAsync(new CommandDefinition(@"UPDATE public.products SET is_deleted = true, created_at = NOW() WHERE id = @SourceProductId", 
                new { SourceProductId = sourceProductId }, transaction: trans, cancellationToken: ct));

            await conn.ExecuteAsync(new CommandDefinition(@"UPDATE public.product_merge_candidates 
                  SET status = 'dismissed', resolved_at = NOW(), resolved_by = 'system' 
                  WHERE (product_a_id = @SourceProductId OR product_b_id = @SourceProductId) AND status = 'pending'", 
                  new { SourceProductId = sourceProductId }, transaction: trans, cancellationToken: ct));

            await conn.ExecuteAsync(new CommandDefinition(@"INSERT INTO public.product_merges (source_id, target_id, merged_at, metadata)
                  VALUES (@SourceId, @TargetId, NOW(), @Metadata::jsonb)", new { 
                    SourceId = sourceProductId, 
                    TargetId = targetProductId, 
                    Metadata = $"{{\"reason\": \"delayed_auto_merge\"}}"
                }, transaction: trans, cancellationToken: ct));

            await conn.ExecuteAsync(new CommandDefinition(@"UPDATE wa.message_groups 
                  SET deeplens_product_id = @TargetProductId, status = 'product_created', updated_at = NOW() 
                  WHERE deeplens_product_id = @SourceProductId", 
                  new { TargetProductId = targetProductId, SourceProductId = sourceProductId }, transaction: trans, cancellationToken: ct));

            await trans.CommitAsync(ct);

            // Publish message to Kafka to keep cache synced across multiple worker instances
            var _producer = _serviceProvider.GetRequiredService<IProducer<string, string>>();
            var mergeEvent = new DeepLens.Contracts.Events.ProductMergedEvent
            {
                EventId = Guid.NewGuid(),
                SourceProductId = sourceProductId,
                TargetProductId = targetProductId,
                Timestamp = DateTime.UtcNow
            };
            await _producer.ProduceAsync(DeepLens.Contracts.Events.KafkaTopics.ProductMerged, new Confluent.Kafka.Message<string, string>
            {
                Key = sourceProductId.ToString(),
                Value = JsonSerializer.Serialize(mergeEvent)
            }, ct);

            _logger.LogInformation("Successfully executed delayed auto-merge of {SourceProductId} into {TargetProductId}", sourceProductId, targetProductId);
        }
        catch (Exception ex)
        {
            await trans.RollbackAsync(ct);
            _logger.LogError(ex, "Failed to execute delayed auto-merge of {SourceProductId} into {TargetProductId}", sourceProductId, targetProductId);
            throw;
        }
    }
}

using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using DeepLens.Contracts.Events;
using DeepLens.Application.Abstractions.Services;
using DeepLens.Infrastructure.Services;
using System.Text.Json;
using System.Text;
using Confluent.Kafka;
using Npgsql;
using Dapper;
using System.Security.Cryptography;

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

    public WhatsAppGroupWorker(
        ILogger<WhatsAppGroupWorker> logger,
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        IProducer<string, string> producer)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _producer = producer;
        _connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("DefaultConnection connection string not found");

        _subscriptionTopics = new[] 
        { 
            KafkaTopics.GroupProductCreate,
            KafkaTopics.GroupMediaAdded,
            KafkaTopics.GroupReprocess
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

        // 1. LLM call to extract details
        ExtractedProductInfo extracted;
        try
        {
            extracted = await aiService.ExtractProductInfoAsync(evt.Description);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ollama extraction failed. Using fallback details.");
            extracted = new ExtractedProductInfo
            {
                Category = "Others",
                SubCategory = "General",
                ShippingInfo = "extra",
                Fabric = "Unknown",
                StitchType = "Unstitched",
                Tags = Array.Empty<string>()
            };
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

            if (existingGroup != null && existingGroup.deeplens_product_id != null)
            {
                _logger.LogInformation("Product already exists for GroupId: {GroupId}. Skipping creation.", evt.GroupId);
                productId = existingGroup.deeplens_product_id;
                listingId = existingGroup.deeplens_listing_id;
            }
            else
            {
                productId = Guid.NewGuid();
                var nextVal = await conn.QuerySingleAsync<long>("SELECT nextval('productid_id_seq')", null, trans);
                var sku = $"VF{nextVal:X3}";

                Guid? categoryId = await ResolveCategoryId(conn, extracted.Category, trans);

                var unifiedAttributes = JsonSerializer.Serialize(new
                {
                    fabric = extracted.Fabric,
                    stitch_type = extracted.StitchType,
                    price = extracted.Price,
                    shipping = extracted.ShippingInfo
                });

                string title = !string.IsNullOrEmpty(evt.Description) 
                    ? evt.Description.Substring(0, Math.Min(evt.Description.Length, 100)).Replace("\n", " ").Trim() 
                    : "New Product";

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
                    INSERT INTO public.vendor_listings (id, product_id, vendor_id, current_price, currency, shipping_info, description, is_active, updated_at)
                    VALUES (@Id, @ProductId, @VendorId, @Price, @Currency, @Shipping, @Description, true, NOW())";

                await conn.ExecuteAsync(listingSql, new
                {
                    Id = listingId,
                    ProductId = productId,
                    VendorId = evt.VendorId,
                    Price = extracted.Price,
                    Currency = "INR",
                    Shipping = extracted.ShippingInfo == "free" ? "free shipping" : "plus shipping",
                    Description = evt.Description
                }, trans);

                if (existingGroup != null)
                {
                    await conn.ExecuteAsync(
                        @"UPDATE wa.message_groups 
                          SET status = 'product_created', deeplens_product_id = @ProductId, deeplens_listing_id = @ListingId,
                              category = @Category, sub_category = @SubCategory, detected_price = @Price, detected_shipping = @Shipping,
                              product_created_at = NOW(), updated_at = NOW()
                          WHERE group_id = @GroupId",
                        new
                        {
                            ProductId = productId,
                            ListingId = listingId,
                            Category = extracted.Category,
                            SubCategory = extracted.SubCategory,
                            Price = extracted.Price,
                            Shipping = extracted.ShippingInfo,
                            GroupId = evt.GroupId
                        },
                        trans
                    );
                }
                else
                {
                    await conn.ExecuteAsync(
                        @"INSERT INTO wa.message_groups 
                          (group_id, jid, status, process_as_product, description, media_count, text_count, deeplens_product_id, deeplens_listing_id, category, sub_category, detected_price, detected_shipping, last_message_at, product_created_at, created_at, updated_at)
                          VALUES (@GroupId, @Jid, 'product_created', true, @Description, @MediaCount, @TextCount, @ProductId, @ListingId, @Category, @SubCategory, @Price, @Shipping, NOW(), NOW(), NOW(), NOW())",
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
                            Shipping = extracted.ShippingInfo
                        },
                        trans
                    );
                }

                await LogGroupAudit(conn, evt.GroupId, "product_created", "system", null, new { product_id = productId, listing_id = listingId }, trans);
            }

            // 3. Process Media Files (idempotent migration)
            string cleanCategory = CleanBucketName(extracted.Category);

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

                    if (!mediaExists.HasValue)
                    {
                        using (var stream = await storage.GetFileAsync(sourcePath))
                        {
                            await storage.UploadToPathAsync(targetPath, stream, mediaFile.MimeType);
                        }

                        const string insertMediaSql = @"
                            INSERT INTO public.media (id, storage_path, media_type, original_filename, file_size_bytes, mime_type, status, category, subcategory, uploaded_at)
                            VALUES (@Id, @StoragePath, @MediaType, @OriginalFilename, 0, @MimeType, 0, @Category, @SubCategory, NOW())";
                        
                        await conn.ExecuteAsync(insertMediaSql, new
                        {
                            Id = mediaId,
                            StoragePath = targetPath,
                            MediaType = mediaType,
                            OriginalFilename = fileName,
                            MimeType = mediaFile.MimeType,
                            Category = cleanCategory,
                            SubCategory = CleanBucketName(extracted.SubCategory)
                        }, trans);
                    }
                    else
                    {
                        // Check if file copy needed (if path changed)
                        var currentMedia = await conn.QuerySingleAsync<dynamic>(
                            "SELECT storage_path FROM public.media WHERE id = @Id", new { Id = mediaId }, trans);
                        
                        string currentPath = currentMedia.storage_path;
                        if (currentPath != targetPath)
                        {
                            using (var stream = await storage.GetFileAsync(sourcePath))
                            {
                                await storage.UploadToPathAsync(targetPath, stream, mediaFile.MimeType);
                            }

                            await conn.ExecuteAsync(
                                "UPDATE public.media SET storage_path = @StoragePath, category = @Category, subcategory = @SubCategory WHERE id = @Id",
                                new { Id = mediaId, StoragePath = targetPath, Category = cleanCategory, SubCategory = CleanBucketName(extracted.SubCategory) },
                                trans
                            );
                        }
                    }

                    await LinkMedia(conn, mediaId, productId, "product", true, trans);
                    await LinkMedia(conn, mediaId, listingId, "vendor_listing", true, trans);

                    if (mediaType == 1)
                    {
                        await EmitImageUploadedEvent(mediaId, targetPath, fileName, mediaFile.MimeType, cleanCategory, CleanBucketName(extracted.SubCategory), evt.Jid, mediaFile.MessageId, evt.GroupId, ct);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to migrate media file: {MediaUrl}", mediaFile.MediaUrl);
                }
            }

            await trans.CommitAsync(ct);

            // 4. Emit write-back event
            await EmitProductCreatedWriteBack(evt.GroupId, productId, listingId, extracted.Category, extracted.SubCategory, ct);
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
            string cleanCategory = CleanBucketName(category);

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

                    using (var stream = await storage.GetFileAsync(sourcePath))
                    {
                        await storage.UploadToPathAsync(targetPath, stream, mediaFile.MimeType);
                    }

                    const string insertMediaSql = @"
                        INSERT INTO public.media (id, storage_path, media_type, original_filename, file_size_bytes, mime_type, status, category, subcategory, uploaded_at)
                        VALUES (@Id, @StoragePath, @MediaType, @OriginalFilename, 0, @MimeType, 0, @Category, @SubCategory, NOW())";
                    
                    await conn.ExecuteAsync(insertMediaSql, new
                    {
                        Id = mediaId,
                        StoragePath = targetPath,
                        MediaType = mediaType,
                        OriginalFilename = fileName,
                        MimeType = mediaFile.MimeType,
                        Category = cleanCategory,
                        SubCategory = CleanBucketName(subCategory)
                    }, trans);

                    await LinkMedia(conn, mediaId, productId, "product", false, trans);
                    await LinkMedia(conn, mediaId, listingId, "vendor_listing", false, trans);

                    if (mediaType == 1)
                    {
                        await EmitImageUploadedEvent(mediaId, targetPath, fileName, mediaFile.MimeType, cleanCategory, CleanBucketName(subCategory), evt.Jid, mediaFile.MessageId, evt.GroupId, ct);
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
        var existingId = await conn.QuerySingleOrDefaultAsync<Guid?>(
            "SELECT id FROM public.categories WHERE LOWER(name) = LOWER(@Name)",
            new { Name = categoryName },
            trans
        );
        if (existingId.HasValue) return existingId.Value;

        var id = Guid.NewGuid();
        var slug = CleanBucketName(categoryName);
        await conn.ExecuteAsync(
            "INSERT INTO public.categories (id, name, slug) VALUES (@Id, @Name, @Slug)",
            new { Id = id, Name = categoryName, Slug = slug },
            trans
        );
        return id;
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
        var result = category.Trim().ToLowerInvariant().Replace(" ", "-");
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

    public override void Dispose()
    {
        _consumer?.Dispose();
        base.Dispose();
    }
}

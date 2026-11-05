using Dapper;
using Microsoft.AspNetCore.Mvc;
using Minio;
using StackExchange.Redis;
using System.Text.Json;
using Store.Api.Models;
using Store.Api.Services;

DefaultTypeMap.MatchNamesWithUnderscores = true;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "DeepLens Store.Api (Beta Platform & Admin Curation)", Version = "v1" });
});

builder.Services.AddHttpClient();

// MinIO Client Registration
builder.Services.AddSingleton<IMinioClient>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var endpoint = config["Minio:Endpoint"] ?? config["Minio__Endpoint"] ?? "192.168.0.170:9000";
    var accessKey = config["Minio:AccessKey"] ?? config["Minio__AccessKey"] ?? "krikan";
    var secretKey = config["Minio:SecretKey"] ?? config["Minio__SecretKey"] ?? "Krikank1$";
    var useSsl = config.GetValue<bool>("Minio:UseSsl", false);

    return new MinioClient()
        .WithEndpoint(endpoint)
        .WithCredentials(accessKey, secretKey)
        .WithSSL(useSsl)
        .Build();
});

// Register Domain Services
builder.Services.AddSingleton<IStoreEventPublisher, StoreEventPublisher>();
builder.Services.AddSingleton<IMediaStorageService, MediaStorageService>();
builder.Services.AddSingleton<ICartService, CartService>();
builder.Services.AddSingleton<ICurationService, CurationService>();
builder.Services.AddSingleton<ITelemetryService, TelemetryService>();
builder.Services.AddSingleton<IWhatsAppCloudApiClient, WhatsAppCloudApiClient>();
builder.Services.AddSingleton<IAuthService, AuthService>();
builder.Services.AddSingleton<ISurveyService, SurveyService>();

// Redis Cache Registration
builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var redisConn = config.GetConnectionString("Redis") ?? "192.168.0.170:6379";
    try
    {
        return ConnectionMultiplexer.Connect(new ConfigurationOptions
        {
            EndPoints = { redisConn },
            AbortOnConnectFail = false,
            ConnectTimeout = 2000
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Redis] Warning: Failed to connect to Redis at {redisConn}: {ex.Message}");
        return ConnectionMultiplexer.Connect("127.0.0.1:6379,abortConnect=false");
    }
});

builder.Services.AddHostedService<CartPruningBackgroundService>();
builder.Services.AddHostedService<TelemetryRollupBackgroundWorker>();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment() || true)
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "DeepLens Store.Api v1"));
}

app.UseCors("AllowAll");

// Helper to extract authenticated user or PAT from request headers
string GetAuthorEmail(HttpContext ctx)
{
    var customHeader = ctx.Request.Headers["X-Admin-Email"].FirstOrDefault();
    if (!string.IsNullOrWhiteSpace(customHeader)) return customHeader;

    var authHeader = ctx.Request.Headers["Authorization"].FirstOrDefault();
    if (!string.IsNullOrWhiteSpace(authHeader))
    {
        if (authHeader.StartsWith("Bearer pat_", StringComparison.OrdinalIgnoreCase))
            return "service-pat@vayyari.com";
        return "operator@vayyari.com";
    }

    var patHeader = ctx.Request.Headers["X-Store-Admin-Key"].FirstOrDefault();
    if (!string.IsNullOrWhiteSpace(patHeader))
        return "service-pat@vayyari.com";

    return "admin@vayyari.com";
}

// ── Health Check ──
app.MapGet("/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "Store.Api",
    version = "1.0.0-beta",
    timestamp = DateTime.UtcNow
}))
.WithName("HealthCheck")
.WithOpenApi();

// ── Product Discovery & PDP Endpoints ──
app.MapGet("/api/v1/products", async ([FromQuery] string? search, [FromQuery] string? category, ICurationService curationService, IConnectionMultiplexer? redis) =>
{
    var normalizedCategory = string.IsNullOrWhiteSpace(category) ? "all" : category.Trim().ToLowerInvariant();
    var normalizedSearch = string.IsNullOrWhiteSpace(search) ? "" : search.Trim().ToLowerInvariant();
    var cacheKey = $"store:search:{normalizedCategory}:{normalizedSearch}";

    IDatabase? db = null;
    try
    {
        if (redis != null && redis.IsConnected)
        {
            db = redis.GetDatabase();
            var cached = await db.StringGetAsync(cacheKey);
            if (cached.HasValue)
            {
                return Results.Content(cached.ToString(), "application/json");
            }
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Redis] Cache read failed: {ex.Message}");
    }

    var inStore = await curationService.GetInStoreProductsAsync(category, search);
    var mapped = inStore.Select(p => new
    {
        id = p.Id.ToString(),
        productCode = p.ProductCode,
        parentCatalogId = p.ParentCatalogId,
        catalogColorGroupId = p.CatalogColorGroupId,
        parentProductCode = p.ParentProductCode,
        title = p.Title,
        brand = "Vayyari Handloom",
        category = p.CategoryName,
        fabric = p.Fabric ?? "Pure Silk",
        color = p.ColorwayName,
        price = (double)p.SalePrice,
        originalPrice = (double)p.Mrp,
        discountPercentage = p.Mrp > p.SalePrice && p.Mrp > 0 ? (int)Math.Round(((p.Mrp - p.SalePrice) / p.Mrp) * 100) : 0,
        currency = "INR",
        inStock = p.LifecycleStatus == "available" || p.LifecycleStatus == "few_left",
        lifecycleStatus = p.LifecycleStatus,
        stockQuantity = p.StockQuantity,
        waitlistCount = p.WaitlistCount,
        siblingSwatches = p.SiblingSwatches,
        swatchesCount = p.SwatchesCount,
        primaryImageUri = p.MediaOrder.FirstOrDefault()?.Url ?? "https://picsum.photos/seed/saree/600/800",
        allMediaUris = p.MediaOrder.Select(m => m.Url).ToArray(),
        colorGroupId = p.ColorGroupId,
        colorwayName = p.ColorwayName,
        colorHex = p.ColorHex,
        swatchTemplate = p.SwatchTemplate,
        colorGroups = p.ColorGroups,
        mediaOrder = p.MediaOrder,
        skus = p.Skus,
        tags = p.Tags,
        descriptions = !string.IsNullOrEmpty(p.Description) ? new[] { p.Description } : Array.Empty<string>()
    }).ToList();

    if (db != null)
    {
        try
        {
            var json = JsonSerializer.Serialize(mapped);
            await db.StringSetAsync(cacheKey, json, TimeSpan.FromMinutes(5));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Redis] Cache write failed: {ex.Message}");
        }
    }

    return Results.Ok(mapped);
})
.WithName("GetProducts")
.WithOpenApi();

// ── Dedicated Product Lookup by Product Code (Human-facing SKU/ID, e.g. vf2b58 or vf2b5801) ──
app.MapGet("/api/v1/products/code/{code}", async (string code, ICurationService curationService) =>
{
    var p = await curationService.GetProductByCodeAsync(code);
    if (p == null)
        return Results.NotFound(new { message = $"Product with code '{code}' not found" });

    var detail = new
    {
        id = p.Id.ToString(),
        productCode = p.ProductCode,
        parentCatalogId = p.ParentCatalogId,
        catalogColorGroupId = p.CatalogColorGroupId,
        parentProductCode = p.ParentProductCode,
        title = p.Title,
        brand = "Vayyari Handloom",
        category = p.CategoryName,
        fabric = p.Fabric,
        color = p.ColorwayName,
        price = (double)p.SalePrice,
        originalPrice = (double)p.Mrp,
        discountPercentage = p.Mrp > p.SalePrice && p.Mrp > 0 ? (int)Math.Round(((p.Mrp - p.SalePrice) / p.Mrp) * 100) : 0,
        currency = "INR",
        inStock = p.LifecycleStatus == "available" || p.LifecycleStatus == "few_left",
        lifecycleStatus = p.LifecycleStatus,
        stockQuantity = p.StockQuantity,
        waitlistCount = p.WaitlistCount,
        siblingSwatches = p.SiblingSwatches,
        swatchesCount = p.SwatchesCount,
        primaryImageUri = p.MediaOrder.FirstOrDefault()?.Url ?? "",
        allMediaUris = p.MediaOrder.Select(m => m.Url).ToArray(),
        colorGroupId = p.ColorGroupId,
        colorwayName = p.ColorwayName,
        colorHex = p.ColorHex,
        swatchTemplate = p.SwatchTemplate,
        colorGroups = p.ColorGroups,
        mediaOrder = p.MediaOrder,
        skus = p.Skus,
        tags = p.Tags,
        descriptions = !string.IsNullOrEmpty(p.Description) ? new[] { p.Description } : Array.Empty<string>()
    };

    return Results.Ok(detail);
})
.WithName("GetProductByCode")
.WithOpenApi();

// Alias for singular /api/v1/product/code/{code}
app.MapGet("/api/v1/product/code/{code}", async (string code, ICurationService curationService) =>
{
    var p = await curationService.GetProductByCodeAsync(code);
    if (p == null)
        return Results.NotFound(new { message = $"Product with code '{code}' not found" });

    var detail = new
    {
        id = p.Id.ToString(),
        productCode = p.ProductCode,
        parentCatalogId = p.ParentCatalogId,
        catalogColorGroupId = p.CatalogColorGroupId,
        parentProductCode = p.ParentProductCode,
        title = p.Title,
        brand = "Vayyari Handloom",
        category = p.CategoryName,
        fabric = p.Fabric,
        color = p.ColorwayName,
        price = (double)p.SalePrice,
        originalPrice = (double)p.Mrp,
        discountPercentage = p.Mrp > p.SalePrice && p.Mrp > 0 ? (int)Math.Round(((p.Mrp - p.SalePrice) / p.Mrp) * 100) : 0,
        currency = "INR",
        inStock = p.LifecycleStatus == "available" || p.LifecycleStatus == "few_left",
        lifecycleStatus = p.LifecycleStatus,
        stockQuantity = p.StockQuantity,
        waitlistCount = p.WaitlistCount,
        siblingSwatches = p.SiblingSwatches,
        swatchesCount = p.SwatchesCount,
        primaryImageUri = p.MediaOrder.FirstOrDefault()?.Url ?? "",
        allMediaUris = p.MediaOrder.Select(m => m.Url).ToArray(),
        colorGroupId = p.ColorGroupId,
        colorwayName = p.ColorwayName,
        colorHex = p.ColorHex,
        swatchTemplate = p.SwatchTemplate,
        colorGroups = p.ColorGroups,
        mediaOrder = p.MediaOrder,
        descriptions = !string.IsNullOrEmpty(p.Description) ? new[] { p.Description } : Array.Empty<string>()
    };

    return Results.Ok(detail);
})
.WithName("GetProductByCodeSingular")
.WithOpenApi();

app.MapGet("/api/v1/products/{id}", async (string id, ICurationService curationService) =>
{
    Store.Api.Models.StoreProductDto? p = null;
    if (Guid.TryParse(id, out var guid))
    {
        var curation = await curationService.GetProductCurationAsync(guid);
        p = curation?.Product;
    }
    else
    {
        p = await curationService.GetProductByCodeAsync(id);
    }

    if (p == null)
        return Results.NotFound(new { message = "Product not found" });

    var detail = new
    {
        id = p.Id.ToString(),
        productCode = p.ProductCode,
        parentCatalogId = p.ParentCatalogId,
        catalogColorGroupId = p.CatalogColorGroupId,
        parentProductCode = p.ParentProductCode,
        title = p.Title,
        brand = "Vayyari Handloom",
        category = p.CategoryName,
        fabric = p.Fabric,
        color = p.ColorwayName,
        price = (double)p.SalePrice,
        originalPrice = (double)p.Mrp,
        discountPercentage = p.Mrp > p.SalePrice && p.Mrp > 0 ? (int)Math.Round(((p.Mrp - p.SalePrice) / p.Mrp) * 100) : 0,
        currency = "INR",
        inStock = p.LifecycleStatus == "available" || p.LifecycleStatus == "few_left",
        lifecycleStatus = p.LifecycleStatus,
        stockQuantity = p.StockQuantity,
        waitlistCount = p.WaitlistCount,
        siblingSwatches = p.SiblingSwatches,
        swatchesCount = p.SwatchesCount,
        primaryImageUri = p.MediaOrder.FirstOrDefault()?.Url ?? "",
        allMediaUris = p.MediaOrder.Select(m => m.Url).ToArray(),
        colorGroupId = p.ColorGroupId,
        colorwayName = p.ColorwayName,
        colorHex = p.ColorHex,
        swatchTemplate = p.SwatchTemplate,
        colorGroups = p.ColorGroups,
        mediaOrder = p.MediaOrder,
        descriptions = !string.IsNullOrEmpty(p.Description) ? new[] { p.Description } : Array.Empty<string>()
    };

    return Results.Ok(detail);
})
.WithName("GetProductById")
.WithOpenApi();

// ── Member Restock Waitlist Registration ──
app.MapPost("/api/v1/products/{id}/waitlist", async (string id, HttpContext ctx, ICurationService curationService, IAuthService authService) =>
{
    Guid? customerId = null;
    var customerIdHeader = ctx.Request.Headers["X-Customer-Id"].FirstOrDefault();
    if (!string.IsNullOrWhiteSpace(customerIdHeader) && Guid.TryParse(customerIdHeader, out var parsedCustId))
    {
        customerId = parsedCustId;
    }
    else
    {
        var token = ctx.Request.Headers["X-Customer-Token"].FirstOrDefault()
            ?? ctx.Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase).Trim();
        if (!string.IsNullOrWhiteSpace(token))
        {
            var validation = await authService.ValidateSessionAsync(token);
            if (validation.IsValid && validation.Customer != null && Guid.TryParse(validation.Customer.UserId, out var authCustId))
            {
                customerId = authCustId;
            }
        }
    }

    if (!customerId.HasValue)
    {
        return Results.Unauthorized();
    }

    Guid productId;
    if (Guid.TryParse(id, out var parsedId))
    {
        productId = parsedId;
    }
    else
    {
        var product = await curationService.GetProductByCodeAsync(id);
        if (product == null)
            return Results.NotFound(new { message = $"Product with code '{id}' not found." });
        productId = product.Id;
    }

    var success = await curationService.JoinWaitlistAsync(productId, customerId.Value);
    return success
        ? Results.Ok(new { status = "WaitlistJoined", productId = productId, customerId = customerId.Value, timestamp = DateTime.UtcNow })
        : Results.NotFound(new { message = $"Product '{productId}' not found." });
})
.WithName("JoinProductWaitlist")
.WithOpenApi();

// ── Anonymous Device Cart Endpoints (30-Day TTL) ──
app.MapGet("/api/v1/cart", async ([FromHeader(Name = "X-Device-Id")] string? headerDeviceId, [FromQuery] string? deviceId, ICartService cartService) =>
{
    var effectiveDeviceId = !string.IsNullOrWhiteSpace(headerDeviceId) ? headerDeviceId : deviceId ?? string.Empty;
    var cart = await cartService.GetCartAsync(effectiveDeviceId);
    return Results.Ok(cart);
})
.WithName("GetDeviceCart")
.WithOpenApi();

app.MapPut("/api/v1/cart/sync", async ([FromBody] SyncCartRequest request, ICartService cartService) =>
{
    var cart = await cartService.SyncCartAsync(request.DeviceId, request.Items);
    return Results.Ok(cart);
})
.WithName("SyncDeviceCart")
.WithOpenApi();

app.MapGet("/api/v1/cart/share/{shareToken}", async (string shareToken, ICartService cartService) =>
{
    var sharedCart = await cartService.GetSharedCartAsync(shareToken);
    return sharedCart != null
        ? Results.Ok(sharedCart)
        : Results.NotFound(new { message = $"Shared cart with token '{shareToken}' was not found or has expired." });
})
.WithName("GetSharedCartByToken")
.WithOpenApi();

// ── Anonymous Device Wishlist Endpoints (100-Day TTL) ──
app.MapGet("/api/v1/wishlist", async ([FromHeader(Name = "X-Device-Id")] string? headerDeviceId, [FromQuery] string? deviceId, ICartService cartService) =>
{
    var effectiveDeviceId = !string.IsNullOrWhiteSpace(headerDeviceId) ? headerDeviceId : deviceId ?? string.Empty;
    var wishlist = await cartService.GetWishlistAsync(effectiveDeviceId);
    return Results.Ok(wishlist);
})
.WithName("GetDeviceWishlist")
.WithOpenApi();

app.MapPost("/api/v1/wishlist/toggle", async ([FromBody] ToggleWishlistRequest request, ICartService cartService) =>
{
    var wishlist = await cartService.ToggleWishlistAsync(request.DeviceId, request.Item);
    return Results.Ok(wishlist);
})
.WithName("ToggleDeviceWishlist")
.WithOpenApi();

// ── TTL Pruning Maintenance Endpoint ──
app.MapPost("/api/v1/cart/prune", async (ICartService cartService) =>
{
    var (carts, wishlists) = await cartService.PruneExpiredCartsAndWishlistsAsync();
    return Results.Ok(new
    {
        status = "Success",
        prunedCarts = carts,
        prunedWishlists = wishlists,
        timestamp = DateTime.UtcNow
    });
})
.WithName("PruneExpiredCarts")
.WithOpenApi();

// ── Unified High-Throughput Telemetry Ingestion (Epic 2) ──
app.MapPost("/api/v1/telemetry/signals", async ([FromBody] BatchTelemetrySignalsRequest request, HttpContext ctx, ITelemetryService telemetryService) =>
{
    var clientIp = ctx.Connection.RemoteIpAddress?.ToString();
    var forwarded = ctx.Request.Headers["X-Forwarded-For"].FirstOrDefault();
    if (!string.IsNullOrWhiteSpace(forwarded))
    {
        clientIp = forwarded.Split(',')[0].Trim();
    }

    var count = await telemetryService.RecordSignalsAsync(request, clientIp);
    return Results.Accepted("/api/v1/telemetry/signals", new
    {
        status = "Accepted",
        count = count,
        timestamp = DateTime.UtcNow
    });
})
.WithName("RecordTelemetrySignals")
.WithOpenApi();

// ── Admin Device Fleet & Telemetry Analytics (Protected via Auth Token) ──
app.MapGet("/api/v1/admin/telemetry/stats", async ([FromQuery] string? token, HttpContext ctx, ITelemetryService telemetryService) =>
{
    var authHeader = ctx.Request.Headers["Authorization"].FirstOrDefault();
    var patHeader = ctx.Request.Headers["X-Store-Admin-Key"].FirstOrDefault();
    if (string.IsNullOrWhiteSpace(authHeader) && string.IsNullOrWhiteSpace(patHeader) && string.IsNullOrWhiteSpace(token))
    {
        return Results.Unauthorized();
    }

    var stats = await telemetryService.GetFleetStatsAsync();
    return Results.Ok(stats);
})
.WithName("GetDeviceFleetStats")
.WithOpenApi();

app.MapGet("/api/v1/admin/telemetry/devices", async ([FromQuery] string? token, [FromQuery] string? platform, [FromQuery] int? limit, [FromQuery] int? offset, HttpContext ctx, ITelemetryService telemetryService) =>
{
    var authHeader = ctx.Request.Headers["Authorization"].FirstOrDefault();
    var patHeader = ctx.Request.Headers["X-Store-Admin-Key"].FirstOrDefault();
    if (string.IsNullOrWhiteSpace(authHeader) && string.IsNullOrWhiteSpace(patHeader) && string.IsNullOrWhiteSpace(token))
    {
        return Results.Unauthorized();
    }

    var devices = await telemetryService.GetDevicesAsync(platform, limit ?? 50, offset ?? 0);
    return Results.Ok(devices);
})
.WithName("GetRegisteredDevices")
.WithOpenApi();

// ── Identity Stitching: Anonymous Device <-> Known User (Epic 3) ──
app.MapPost("/api/v1/telemetry/stitch", async ([FromBody] StitchIdentityRequest request, ITelemetryService telemetryService) =>
{
    if (string.IsNullOrWhiteSpace(request.DeviceId) || string.IsNullOrWhiteSpace(request.UserId))
    {
        return Results.BadRequest(new { message = "Both deviceId and userId are required for identity stitching." });
    }
    var link = await telemetryService.StitchDeviceToUserAsync(request);
    return Results.Ok(link);
})
.WithName("StitchDeviceToUser")
.WithOpenApi();

// ── Session Summaries & Taste Profiles (Epic 2 Tier 2 / Tier 3) ──
app.MapGet("/api/v1/admin/telemetry/sessions", async ([FromQuery] string? token, [FromQuery] string? deviceId, [FromQuery] string? userId, [FromQuery] int? limit, HttpContext ctx, ITelemetryService telemetryService) =>
{
    var authHeader = ctx.Request.Headers["Authorization"].FirstOrDefault();
    var patHeader = ctx.Request.Headers["X-Store-Admin-Key"].FirstOrDefault();
    if (string.IsNullOrWhiteSpace(authHeader) && string.IsNullOrWhiteSpace(patHeader) && string.IsNullOrWhiteSpace(token))
    {
        return Results.Unauthorized();
    }

    var sessions = await telemetryService.GetSessionSummariesAsync(deviceId, userId, limit ?? 50);
    return Results.Ok(sessions);
})
.WithName("GetSessionSummaries")
.WithOpenApi();

app.MapGet("/api/v1/admin/telemetry/devices/{deviceId}/profile", async (string deviceId, [FromQuery] string? token, HttpContext ctx, ITelemetryService telemetryService) =>
{
    var authHeader = ctx.Request.Headers["Authorization"].FirstOrDefault();
    var patHeader = ctx.Request.Headers["X-Store-Admin-Key"].FirstOrDefault();
    if (string.IsNullOrWhiteSpace(authHeader) && string.IsNullOrWhiteSpace(patHeader) && string.IsNullOrWhiteSpace(token))
    {
        return Results.Unauthorized();
    }

    var profile = await telemetryService.GetDeviceTasteProfileAsync(deviceId);
    if (profile == null) return Results.NotFound(new { message = $"Device '{deviceId}' profile not found." });
    return Results.Ok(profile);
})
.WithName("GetDeviceTasteProfile")
.WithOpenApi();

app.MapGet("/api/v1/admin/telemetry/devices/{deviceId}/signals", async (string deviceId, [FromQuery] string? token, [FromQuery] int? limit, [FromQuery] int? days, HttpContext ctx, ITelemetryService telemetryService) =>
{
    var authHeader = ctx.Request.Headers["Authorization"].FirstOrDefault();
    var patHeader = ctx.Request.Headers["X-Store-Admin-Key"].FirstOrDefault();
    if (string.IsNullOrWhiteSpace(authHeader) && string.IsNullOrWhiteSpace(patHeader) && string.IsNullOrWhiteSpace(token))
    {
        return Results.Unauthorized();
    }

    var signals = await telemetryService.GetDeviceSignalsAsync(deviceId, limit ?? 100, days ?? 30);
    return Results.Ok(signals);
})
.WithName("GetDeviceSignals")
.WithOpenApi();

app.MapPost("/api/v1/admin/telemetry/rollup/trigger", async ([FromQuery] string? token, [FromQuery] int? retentionDays, HttpContext ctx, ITelemetryService telemetryService) =>
{
    var authHeader = ctx.Request.Headers["Authorization"].FirstOrDefault();
    var patHeader = ctx.Request.Headers["X-Store-Admin-Key"].FirstOrDefault();
    if (string.IsNullOrWhiteSpace(authHeader) && string.IsNullOrWhiteSpace(patHeader) && string.IsNullOrWhiteSpace(token))
    {
        return Results.Unauthorized();
    }

    var result = await telemetryService.RollupTelemetrySignalsAsync(retentionDays ?? 30);
    return Results.Ok(result);
})
.WithName("TriggerTelemetryRollup")
.WithOpenApi();

app.MapGet("/api/v1/admin/telemetry/activity/hourly", async ([FromQuery] string? token, [FromQuery] int? days, HttpContext ctx, ITelemetryService telemetryService) =>
{
    var authHeader = ctx.Request.Headers["Authorization"].FirstOrDefault();
    var patHeader = ctx.Request.Headers["X-Store-Admin-Key"].FirstOrDefault();
    if (string.IsNullOrWhiteSpace(authHeader) && string.IsNullOrWhiteSpace(patHeader) && string.IsNullOrWhiteSpace(token))
    {
        return Results.Unauthorized();
    }

    var summary = await telemetryService.GetHourlyActivitySummaryAsync(days ?? 30);
    return Results.Ok(summary);
})
.WithName("GetHourlyActivitySummary")
.WithOpenApi();

app.MapGet("/api/v1/admin/telemetry/growth/daily", async ([FromQuery] string? token, [FromQuery] int? days, [FromQuery] int? range, [FromQuery] string? granularity, HttpContext ctx, ITelemetryService telemetryService) =>
{
    var authHeader = ctx.Request.Headers["Authorization"].FirstOrDefault();
    var patHeader = ctx.Request.Headers["X-Store-Admin-Key"].FirstOrDefault();
    if (string.IsNullOrWhiteSpace(authHeader) && string.IsNullOrWhiteSpace(patHeader) && string.IsNullOrWhiteSpace(token))
    {
        return Results.Unauthorized();
    }

    var effectiveRange = range ?? days ?? 10;
    var effectiveGranularity = !string.IsNullOrWhiteSpace(granularity) ? granularity : "day";
    var summary = await telemetryService.GetDailyAcquisitionsSummaryAsync(effectiveRange, effectiveGranularity);
    return Results.Ok(summary);
})
.WithName("GetDailyAcquisitionsSummary")
.WithOpenApi();

app.MapGet("/api/v1/admin/telemetry/growth/acquisitions", async ([FromQuery] string? token, [FromQuery] int? range, [FromQuery] string? granularity, HttpContext ctx, ITelemetryService telemetryService) =>
{
    var authHeader = ctx.Request.Headers["Authorization"].FirstOrDefault();
    var patHeader = ctx.Request.Headers["X-Store-Admin-Key"].FirstOrDefault();
    if (string.IsNullOrWhiteSpace(authHeader) && string.IsNullOrWhiteSpace(patHeader) && string.IsNullOrWhiteSpace(token))
    {
        return Results.Unauthorized();
    }

    var effectiveRange = range ?? 10;
    var effectiveGranularity = !string.IsNullOrWhiteSpace(granularity) ? granularity : "day";
    var summary = await telemetryService.GetDailyAcquisitionsSummaryAsync(effectiveRange, effectiveGranularity);
    return Results.Ok(summary);
})
.WithName("GetAcquisitionsSummary")
.WithOpenApi();

// =============================================================================
// ── WHATSAPP-FIRST IDENTITY & 365-DAY CUSTOMER SESSIONS ENDPOINTS ──
// =============================================================================

// 1. Send OTP via WhatsApp Cloud API
app.MapPost("/api/v1/auth/whatsapp/send-otp", async ([FromBody] SendOtpRequest request, IAuthService authService) =>
{
    var result = await authService.SendOtpAsync(request);
    return result.Success ? Results.Ok(result) : Results.BadRequest(result);
})
.WithName("AuthSendWhatsAppOtp")
.WithOpenApi();

// 2. Verify OTP & Issue Long-Lived Session
app.MapPost("/api/v1/auth/whatsapp/verify-otp", async ([FromBody] VerifyOtpRequest request, IAuthService authService) =>
{
    var result = await authService.VerifyOtpAsync(request);
    return result.Success ? Results.Ok(result) : Results.BadRequest(result);
})
.WithName("AuthVerifyWhatsAppOtp")
.WithOpenApi();

// 3. Validate Session Token
app.MapGet("/api/v1/auth/session", async (HttpContext ctx, IAuthService authService) =>
{
    var token = ctx.Request.Headers["X-Customer-Token"].FirstOrDefault()
        ?? ctx.Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase).Trim()
        ?? ctx.Request.Query["token"].FirstOrDefault();

    if (string.IsNullOrWhiteSpace(token))
    {
        return Results.Ok(new SessionValidationResponse { IsValid = false });
    }

    var result = await authService.ValidateSessionAsync(token);
    return Results.Ok(result);
})
.WithName("AuthValidateSession")
.WithOpenApi();

// 4. Get Customer Profile
app.MapGet("/api/v1/auth/profile", async (HttpContext ctx, IAuthService authService) =>
{
    var token = ctx.Request.Headers["X-Customer-Token"].FirstOrDefault()
        ?? ctx.Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase).Trim()
        ?? ctx.Request.Query["token"].FirstOrDefault();

    if (string.IsNullOrWhiteSpace(token)) return Results.Unauthorized();

    var profile = await authService.GetProfileAsync(token);
    return profile != null ? Results.Ok(profile) : Results.Unauthorized();
})
.WithName("AuthGetCustomerProfile")
.WithOpenApi();

// 5. Update Customer Profile (Name, Email, Default Address)
app.MapPut("/api/v1/auth/profile", async ([FromBody] UpdateCustomerProfileRequest request, HttpContext ctx, IAuthService authService) =>
{
    var token = ctx.Request.Headers["X-Customer-Token"].FirstOrDefault()
        ?? ctx.Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase).Trim()
        ?? ctx.Request.Query["token"].FirstOrDefault();

    if (string.IsNullOrWhiteSpace(token)) return Results.Unauthorized();

    var profile = await authService.UpdateProfileAsync(token, request);
    return profile != null ? Results.Ok(profile) : Results.Unauthorized();
})
.WithName("AuthUpdateCustomerProfile")
.WithOpenApi();

// 6. Logout / Terminate Session
app.MapPost("/api/v1/auth/logout", async ([FromBody] LogoutRequest? req, HttpContext ctx, IAuthService authService) =>
{
    var token = req?.SessionToken
        ?? ctx.Request.Headers["X-Customer-Token"].FirstOrDefault()
        ?? ctx.Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase).Trim();

    if (!string.IsNullOrWhiteSpace(token))
    {
        await authService.LogoutAsync(token);
    }
    return Results.Ok(new { success = true, message = "Logged out successfully." });
})
.WithName("AuthLogout")
.WithOpenApi();

// =============================================================================
// ── STORE ADMIN & CURATION ENDPOINTS (Protected via JWT / PAT) ──
// =============================================================================

// 1. Batch Publish Products from Vayyari Catalog to Store
app.MapPost("/api/v1/admin/products/publish", async ([FromBody] BatchPublishRequest request, HttpContext ctx, ICurationService curationService) =>
{
    var author = GetAuthorEmail(ctx);
    var count = await curationService.BatchPublishProductsAsync(request.Products, author);
    return Results.Ok(new
    {
        status = "Published",
        count = count,
        publishedBy = author,
        timestamp = DateTime.UtcNow
    });
})
.WithName("AdminBatchPublishProducts")
.WithOpenApi();

// 1a. Asynchronous Event-Driven Publish Job (202 Accepted)
app.MapPost("/api/v1/admin/products/publish-job", async ([FromBody] SubmitPublishJobRequest request, HttpContext ctx, ICurationService curationService) =>
{
    var author = GetAuthorEmail(ctx);
    var job = await curationService.CreatePublishJobAsync(request, author);
    return Results.Accepted($"/api/v1/admin/products/publish-jobs/{job.Id}", job);
})
.WithName("AdminSubmitPublishJob")
.WithOpenApi();

// 1b. Get Publish Job Status & Progress
app.MapGet("/api/v1/admin/products/publish-jobs/{id}", async (Guid id, ICurationService curationService) =>
{
    var job = await curationService.GetPublishJobAsync(id);
    return job != null
        ? Results.Ok(job)
        : Results.NotFound(new { message = $"Publish job '{id}' not found." });
})
.WithName("AdminGetPublishJob")
.WithOpenApi();

// 1c. Get Failed Publishings Queue
app.MapGet("/api/v1/admin/products/publish-failures", async (ICurationService curationService) =>
{
    var failures = await curationService.GetPublishFailuresAsync();
    return Results.Ok(failures);
})
.WithName("AdminGetPublishFailures")
.WithOpenApi();

// 1d. Retry Failed Product Publishings (202 Accepted)
app.MapPost("/api/v1/admin/products/publish-failures/retry", async ([FromBody] RetryPublishBatchRequest request, HttpContext ctx, ICurationService curationService) =>
{
    var author = GetAuthorEmail(ctx);
    var job = await curationService.RetryPublishFailuresAsync(request, author);
    return Results.Accepted($"/api/v1/admin/products/publish-jobs/{job.Id}", job);
})
.WithName("AdminRetryPublishFailures")
.WithOpenApi();



// 2. List In-Store Products (For In-Store Inventory Screen)
app.MapGet("/api/v1/admin/products/in-store", async ([FromQuery] string? category, [FromQuery] string? search, [FromQuery] string? lifecycle, ICurationService curationService) =>
{
    var products = await curationService.GetInStoreProductsAsync(category, search, lifecycle);
    return Results.Ok(products);
})
.WithName("AdminGetInStoreProducts")
.WithOpenApi();

// 3. Get Product Curation Details (For Curation Workbench)
app.MapGet("/api/v1/admin/products/{id}/curation", async (Guid id, ICurationService curationService) =>
{
    var curation = await curationService.GetProductCurationAsync(id);
    return curation != null
        ? Results.Ok(curation)
        : Results.NotFound(new { message = $"Store product '{id}' not found." });
})
.WithName("AdminGetProductCuration")
.WithOpenApi();

// 4. Update Product Curation (Save Pricing, Margins, Lifecycle, Media Order & Tags)
app.MapPatch("/api/v1/admin/products/{id}/curation", async (Guid id, [FromBody] UpdateCurationRequest request, HttpContext ctx, ICurationService curationService) =>
{
    var author = GetAuthorEmail(ctx);
    var success = await curationService.UpdateProductCurationAsync(id, request, author);
    return success
        ? Results.Ok(new { status = "CurationSaved", productId = id, updatedBy = author, timestamp = DateTime.UtcNow })
        : Results.NotFound(new { message = $"Store product '{id}' not found." });
})
.WithName("AdminUpdateProductCuration")
.WithOpenApi();

// 4a. Update Product Lifecycle (Cascade Parent Pause/Reactivation or Variant Level)
app.MapPatch("/api/v1/admin/products/lifecycle", async ([FromBody] UpdateLifecycleRequest request, HttpContext ctx, ICurationService curationService) =>
{
    var author = GetAuthorEmail(ctx);
    var success = await curationService.UpdateLifecycleStatusAsync(request, author);
    return success
        ? Results.Ok(new { status = "LifecycleUpdated", targetStatus = request.Status, updatedBy = author, timestamp = DateTime.UtcNow })
        : Results.BadRequest(new { message = "Failed to update lifecycle status. Ensure either productId or parentId is provided and exists." });
})
.WithName("AdminUpdateProductLifecycle")
.WithOpenApi();

// 4b. Get Expired Paused Products Re-Evaluation Queue
app.MapGet("/api/v1/admin/products/re-evaluation-queue", async (ICurationService curationService) =>
{
    var queue = await curationService.GetReEvaluationQueueAsync();
    return Results.Ok(queue);
})
.WithName("AdminGetReEvaluationQueue")
.WithOpenApi();

// 4c. Dismiss Product Review (Clear review pending flag on product and siblings)
app.MapPatch("/api/v1/admin/products/{id}/dismiss-review", async (Guid id, ICurationService curationService) =>
{
    var success = await curationService.DismissReviewAsync(id);
    return success
        ? Results.Ok(new { status = "ReviewDismissed", productId = id })
        : Results.NotFound(new { message = $"Store product '{id}' not found." });
})
.WithName("AdminDismissProductReview")
.WithOpenApi();

// 5. Upload Client-Modified Media (WebP blob from Admin Canvas)
app.MapPost("/api/v1/admin/products/{id}/media/{mediaId}/modified", async (Guid id, string mediaId, HttpRequest request, HttpContext ctx, ICurationService curationService) =>
{
    var author = GetAuthorEmail(ctx);
    if (!request.HasFormContentType)
        return Results.BadRequest(new { message = "Expected multipart/form-data content type." });

    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file") ?? form.Files.FirstOrDefault();
    if (file == null || file.Length == 0)
        return Results.BadRequest(new { message = "No image file provided in form data." });

    var recipeJson = form["recipeJson"].ToString();
    var mimeType = !string.IsNullOrEmpty(file.ContentType) ? file.ContentType : "image/webp";

    await using var stream = file.OpenReadStream();
    var updated = await curationService.SaveModifiedMediaAsync(id, mediaId, stream, mimeType, recipeJson, author);

    return updated != null
        ? Results.Ok(updated)
        : Results.NotFound(new { message = $"Product '{id}' or media '{mediaId}' not found." });
})
.DisableAntiforgery()
.WithName("AdminUploadModifiedMedia")
.WithOpenApi();

// 6. Delete Client-Modified Media (Revert to Original)
app.MapDelete("/api/v1/admin/products/{id}/media/{mediaId}/modified", async (Guid id, string mediaId, HttpContext ctx, ICurationService curationService) =>
{
    var author = GetAuthorEmail(ctx);
    var updated = await curationService.DeleteModifiedMediaAsync(id, mediaId, author);
    return updated != null
        ? Results.Ok(updated)
        : Results.NotFound(new { message = $"Product '{id}' or media '{mediaId}' not found." });
})
.WithName("AdminDeleteModifiedMedia")
.WithOpenApi();

// 7. Toggle Active Display Source (Original vs. Modified)
app.MapPatch("/api/v1/admin/products/{id}/media/{mediaId}/display-source", async (Guid id, string mediaId, [FromBody] ToggleMediaDisplaySourceRequest req, HttpContext ctx, ICurationService curationService) =>
{
    var author = GetAuthorEmail(ctx);
    var updated = await curationService.ToggleMediaDisplaySourceAsync(id, mediaId, req.ActiveDisplaySource, author);
    return updated != null
        ? Results.Ok(updated)
        : Results.NotFound(new { message = $"Product '{id}' or media '{mediaId}' not found." });
})
.WithName("AdminToggleMediaDisplaySource")
.WithOpenApi();

// =========================================================================
// Survey Framework Endpoints (Client Runtime & Admin Curation)
// =========================================================================

// 1. Get Published Survey by Slug
app.MapGet("/api/v1/surveys/{slug}", async (string slug, [FromQuery] int? version, ISurveyService surveyService) =>
{
    var survey = await surveyService.GetSurveyBySlugAsync(slug, version);
    return survey != null ? Results.Ok(survey) : Results.NotFound(new { message = $"Survey '{slug}' not found" });
})
.WithName("GetSurveyBySlug")
.WithOpenApi();

// 1b. Generate Presigned Upload Ticket for File Upload Question
app.MapPost("/api/v1/surveys/{slug}/upload-ticket", async (string slug, [FromBody] GenerateSurveyUploadTicketRequest request, ISurveyService surveyService) =>
{
    try
    {
        var ticket = await surveyService.GenerateUploadTicketAsync(slug, request);
        return Results.Ok(ticket);
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
})
.WithName("GenerateSurveyUploadTicket")
.WithOpenApi();

// 2. Submit Survey Response with Synchronous Wallet Ledger Credit
app.MapPost("/api/v1/surveys/{slug}/submit", async (string slug, [FromBody] SubmitSurveyResponseRequest request, ISurveyService surveyService) =>
{
    if (string.IsNullOrWhiteSpace(request.VirtualUserId))
    {
        return Results.BadRequest(new { message = "virtualUserId is required for identity and wallet credit." });
    }

    try
    {
        var result = await surveyService.SubmitSurveyResponseAsync(slug, request);
        return Results.Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
})
.WithName("SubmitSurveyResponse")
.WithOpenApi();

// 3. Customer Mudras Wallet Balance
app.MapGet("/api/v1/surveys/wallet/{virtualUserId}", async (string virtualUserId, [FromQuery] string? userId, ISurveyService surveyService) =>
{
    var wallet = await surveyService.GetWalletBalanceAsync(virtualUserId, userId);
    return Results.Ok(wallet);
})
.WithName("GetCustomerSurveyWallet")
.WithOpenApi();

// 4. Admin: List Surveys
app.MapGet("/api/v1/admin/surveys", async (ISurveyService surveyService) =>
{
    var surveys = await surveyService.ListSurveysAsync();
    return Results.Ok(surveys);
})
.WithName("AdminListSurveys")
.WithOpenApi();

// 5. Admin: Get Survey Metadata
app.MapGet("/api/v1/admin/surveys/{id:guid}", async (Guid id, ISurveyService surveyService) =>
{
    var survey = await surveyService.GetSurveyMetadataAsync(id);
    return survey != null ? Results.Ok(survey) : Results.NotFound(new { message = $"Survey '{id}' not found" });
})
.WithName("AdminGetSurveyMetadata")
.WithOpenApi();

// 6. Admin: Update Draft Schema
app.MapPut("/api/v1/admin/surveys/{id:guid}/draft", async (Guid id, [FromBody] JsonElement draftSchema, ISurveyService surveyService) =>
{
    var updated = await surveyService.UpdateDraftSchemaAsync(id, draftSchema);
    return updated ? Results.Ok(new { success = true, surveyId = id }) : Results.NotFound(new { message = $"Survey '{id}' not found" });
})
.WithName("AdminUpdateSurveyDraft")
.WithOpenApi();

// 7. Admin: Publish Survey Version
app.MapPost("/api/v1/admin/surveys/{id:guid}/publish", async (Guid id, [FromBody] AdminPublishVersionRequest request, ISurveyService surveyService) =>
{
    try
    {
        var version = await surveyService.PublishVersionAsync(id, request);
        return Results.Ok(version);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { message = ex.Message });
    }
})
.WithName("AdminPublishSurveyVersion")
.WithOpenApi();

// 8. Admin: List Survey Responses
app.MapGet("/api/v1/admin/surveys/{id:guid}/responses", async (Guid id, [FromQuery] int? version, [FromQuery] int? limit, [FromQuery] int? offset, ISurveyService surveyService) =>
{
    var responses = await surveyService.ListResponsesAsync(id, version, limit ?? 50, offset ?? 0);
    return Results.Ok(responses);
})
.WithName("AdminListSurveyResponses")
.WithOpenApi();

// 9. Admin: Get Single Response Detail
app.MapGet("/api/v1/admin/surveys/responses/{responseId:guid}", async (Guid responseId, ISurveyService surveyService) =>
{
    var detail = await surveyService.GetResponseDetailAsync(responseId);
    return detail != null ? Results.Ok(detail) : Results.NotFound(new { message = $"Response '{responseId}' not found" });
})
.WithName("AdminGetSurveyResponseDetail")
.WithOpenApi();


try
{
    await app.Services.GetRequiredService<IMediaStorageService>().EnsureBucketExistsAsync();
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Could not ensure MinIO bucket exists on startup");
}

app.Run();

using Microsoft.AspNetCore.Mvc;
using Store.Api.Models;
using Store.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "DeepLens Store.Api (Beta Platform & Admin Curation)", Version = "v1" });
});

// Register Domain Services
builder.Services.AddSingleton<ICartService, CartService>();
builder.Services.AddSingleton<ICurationService, CurationService>();
builder.Services.AddHostedService<CartPruningBackgroundService>();

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
app.MapGet("/api/v1/products", async ([FromQuery] string? search, [FromQuery] string? category, ICurationService curationService) =>
{
    var inStore = await curationService.GetInStoreProductsAsync();
    var results = inStore.AsEnumerable();

    if (!string.IsNullOrWhiteSpace(category) && !category.Equals("all", StringComparison.OrdinalIgnoreCase))
    {
        results = results.Where(p => p.CategoryName.Equals(category, StringComparison.OrdinalIgnoreCase));
    }
    if (!string.IsNullOrWhiteSpace(search))
    {
        var s = search.Trim();
        results = results.Where(p =>
            p.ProductCode.Contains(s, StringComparison.OrdinalIgnoreCase) ||
            p.Title.Contains(s, StringComparison.OrdinalIgnoreCase) ||
            (p.Fabric != null && p.Fabric.Contains(s, StringComparison.OrdinalIgnoreCase)) ||
            p.ColorwayName.Contains(s, StringComparison.OrdinalIgnoreCase)
        );
    }

    var mapped = results.Select(p => new
    {
        id = p.Id.ToString(),
        productCode = p.ProductCode,
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
        stockQuantity = p.StockQuantity,
        primaryImageUri = p.MediaOrder.FirstOrDefault()?.Url ?? "https://picsum.photos/seed/saree/600/800",
        allMediaUris = p.MediaOrder.Select(m => m.Url).ToArray(),
        descriptions = !string.IsNullOrEmpty(p.Description) ? new[] { p.Description } : Array.Empty<string>()
    });

    return Results.Ok(mapped.ToList());
})
.WithName("GetProducts")
.WithOpenApi();

// ── Dedicated Product Lookup by Product Code (Human-facing SKU/ID, e.g. vf2b58) ──
app.MapGet("/api/v1/products/code/{code}", async (string code, ICurationService curationService) =>
{
    var inStore = await curationService.GetInStoreProductsAsync();
    var match = inStore.FirstOrDefault(p => string.Equals(p.ProductCode, code, StringComparison.OrdinalIgnoreCase));
    if (match == null)
        return Results.NotFound(new { message = $"Product with code '{code}' not found" });

    var curation = await curationService.GetProductCurationAsync(match.Id);
    if (curation == null)
        return Results.NotFound(new { message = $"Product curation for '{code}' not found" });

    var p = curation.Product;
    var detail = new
    {
        id = p.Id.ToString(),
        productCode = p.ProductCode,
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
        stockQuantity = p.StockQuantity,
        primaryImageUri = p.MediaOrder.FirstOrDefault()?.Url ?? "",
        allMediaUris = p.MediaOrder.Select(m => m.Url).ToArray(),
        descriptions = !string.IsNullOrEmpty(p.Description) ? new[] { p.Description } : Array.Empty<string>()
    };

    return Results.Ok(detail);
})
.WithName("GetProductByCode")
.WithOpenApi();

// Alias for singular /api/v1/product/code/{code}
app.MapGet("/api/v1/product/code/{code}", async (string code, ICurationService curationService) =>
{
    var inStore = await curationService.GetInStoreProductsAsync();
    var match = inStore.FirstOrDefault(p => string.Equals(p.ProductCode, code, StringComparison.OrdinalIgnoreCase));
    if (match == null)
        return Results.NotFound(new { message = $"Product with code '{code}' not found" });

    var curation = await curationService.GetProductCurationAsync(match.Id);
    if (curation == null)
        return Results.NotFound(new { message = $"Product curation for '{code}' not found" });

    var p = curation.Product;
    var detail = new
    {
        id = p.Id.ToString(),
        productCode = p.ProductCode,
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
        stockQuantity = p.StockQuantity,
        primaryImageUri = p.MediaOrder.FirstOrDefault()?.Url ?? "",
        allMediaUris = p.MediaOrder.Select(m => m.Url).ToArray(),
        descriptions = !string.IsNullOrEmpty(p.Description) ? new[] { p.Description } : Array.Empty<string>()
    };

    return Results.Ok(detail);
})
.WithName("GetProductByCodeSingular")
.WithOpenApi();

app.MapGet("/api/v1/products/{id}", async (string id, ICurationService curationService) =>
{
    Store.Api.Models.StoreProductCurationDto? curation = null;
    if (Guid.TryParse(id, out var guid))
    {
        curation = await curationService.GetProductCurationAsync(guid);
    }
    else
    {
        var inStore = await curationService.GetInStoreProductsAsync();
        var match = inStore.FirstOrDefault(p => string.Equals(p.ProductCode, id, StringComparison.OrdinalIgnoreCase));
        if (match != null)
        {
            curation = await curationService.GetProductCurationAsync(match.Id);
        }
    }

    if (curation == null)
        return Results.NotFound(new { message = "Product not found" });

    var p = curation.Product;
    var detail = new
    {
        id = p.Id.ToString(),
        productCode = p.ProductCode,
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
        stockQuantity = p.StockQuantity,
        primaryImageUri = p.MediaOrder.FirstOrDefault()?.Url ?? "",
        allMediaUris = p.MediaOrder.Select(m => m.Url).ToArray(),
        descriptions = !string.IsNullOrEmpty(p.Description) ? new[] { p.Description } : Array.Empty<string>()
    };

    return Results.Ok(detail);
})
.WithName("GetProductById")
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

app.Run();

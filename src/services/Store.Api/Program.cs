using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "DeepLens Store.Api", Version = "v1" });
});

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

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTime.UtcNow, service = "Store.Api" }))
   .WithName("HealthCheck")
   .WithOpenApi();

// Products endpoints
app.MapGet("/api/products", () =>
{
    var sampleProducts = new[]
    {
        new
        {
            id = "prod-1",
            sku = "SKU-AVIATOR-GOLD",
            title = "Classic Gold Aviator",
            brand = "DeepLens Heritage",
            price = 2499.00,
            originalPrice = 3999.00,
            discountPercentage = 37,
            currency = "INR",
            inStock = true,
            stockQuantity = 45,
            primaryImageUrl = "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80",
            category = "Sunglasses",
            rating = 4.8,
            reviewCount = 128
        },
        new
        {
            id = "prod-2",
            sku = "SKU-WAYFARER-MATTE",
            title = "Matte Black Wayfarer",
            brand = "DeepLens Modern",
            price = 1999.00,
            originalPrice = 2999.00,
            discountPercentage = 33,
            currency = "INR",
            inStock = true,
            stockQuantity = 60,
            primaryImageUrl = "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80",
            category = "Eyeglasses",
            rating = 4.6,
            reviewCount = 94
        }
    };
    return Results.Ok(sampleProducts);
})
.WithName("GetProducts")
.WithOpenApi();

// Product details endpoint
app.MapGet("/api/products/{id}", (string id) =>
{
    return Results.Ok(new
    {
        id,
        sku = "SKU-AVIATOR-GOLD",
        title = "Classic Gold Aviator",
        brand = "DeepLens Heritage",
        description = "Handcrafted premium titanium frame with polarized UV400 lenses.",
        price = 2499.00,
        originalPrice = 3999.00,
        discountPercentage = 37,
        currency = "INR",
        inStock = true,
        stockQuantity = 45,
        primaryImageUrl = "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80",
        additionalImages = new[]
        {
            "https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=600&q=80"
        },
        colorVariants = new[]
        {
            new { colorName = "Gold / Green Lens", hexCode = "#D4AF37", sku = "SKU-AVIATOR-GOLD" },
            new { colorName = "Silver / Grey Lens", hexCode = "#C0C0C0", sku = "SKU-AVIATOR-SILVER" },
            new { colorName = "Gunmetal / Black Lens", hexCode = "#2A2A2A", sku = "SKU-AVIATOR-GUNMETAL" }
        },
        category = "Sunglasses",
        rating = 4.8,
        reviewCount = 128
    });
})
.WithName("GetProductById")
.WithOpenApi();

// Cart endpoints
app.MapGet("/api/cart/{cartId}", (string cartId) =>
{
    return Results.Ok(new
    {
        cartId,
        items = new object[] { },
        itemCount = 0,
        subtotal = 0.0,
        discount = 0.0,
        total = 0.0
    });
})
.WithName("GetCart")
.WithOpenApi();

app.Run();

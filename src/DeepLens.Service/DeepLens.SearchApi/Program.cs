using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using DeepLens.SearchApi.Services;
using DeepLens.Infrastructure.Services;
using DeepLens.Application;
using DeepLens.Infrastructure;
using DeepLens.Application.Abstractions.Services;
using Minio;
using Confluent.Kafka;
using DeepLens.Contracts.Catalog;

Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.DictionaryKeyPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddMemoryCache();

// --- ENTERPRISE LAYERING REGISTRATIONS ---
builder.Services.AddApplication();
builder.Services.AddInfrastructure();

// Custom services (Remaining for now)
builder.Services.AddScoped<IProductService, DeepLens.Infrastructure.Services.ProductService>();
builder.Services.AddScoped<IMetadataService, MetadataService>();
builder.Services.AddHttpClient<IAttributeExtractionService, LlmAttributeExtractionService>();
builder.Services.AddHttpClient<IInstagramSidecarService, InstagramSidecarService>();
builder.Services.AddScoped<DeepLens.Infrastructure.Services.IStorageService, DeepLens.Infrastructure.Services.MinioStorageService>();
builder.Services.AddScoped<IVendorService, VendorService>();
builder.Services.AddScoped<IIdGeneratorService, IdGeneratorService>();
builder.Services.AddScoped<IAttachmentService, AttachmentService>();
builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddScoped<IMetaGraphService, MetaGraphService>();
builder.Services.AddHttpClient<IInstagramMediaService, InstagramMediaService>();
builder.Services.AddScoped<DeepLens.Contracts.Customers.ICustomerService, DeepLens.Infrastructure.Services.CustomerService>();

// MinIO Setup
builder.Services.AddSingleton<Minio.IMinioClient>(sp => 
{
    var config = sp.GetRequiredService<IConfiguration>();
    var endpoint = config["Minio:Endpoint"] ?? throw new InvalidOperationException("Minio:Endpoint is not configured.");
    var accessKey = config["Minio:AccessKey"] ?? throw new InvalidOperationException("Minio:AccessKey is not configured.");
    var secretKey = config["Minio:SecretKey"] ?? throw new InvalidOperationException("Minio:SecretKey is not configured.");
    
    return new Minio.MinioClient()
        .WithEndpoint(endpoint)
        .WithCredentials(accessKey, secretKey)
        .Build();
});

// Redis Cache
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
    options.InstanceName = "DeepLens_";
});

// Kafka Producer Setup
builder.Services.AddSingleton<IProducer<string, string>>(sp => 
{
    var config = sp.GetRequiredService<IConfiguration>();
    var bootstrapServers = config["Kafka:BootstrapServers"] ?? throw new InvalidOperationException("Kafka:BootstrapServers is not configured.");
    var kafkaConfig = new ProducerConfig { BootstrapServers = bootstrapServers };
    return new ProducerBuilder<string, string>(kafkaConfig).Build();
});

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "DeepLens Search API", Version = "v1" });
    
    // Add JWT Authentication to Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header
            },
            new List<string>()
        }
    });
});

// Configure Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Identity:Authority"] ?? "http://localhost:5198";
        options.Audience = "deeplens-api";
        options.RequireHttpsMetadata = false; 
        
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(options =>
{
        options.AddPolicy("SearchPolicy", policy => 
        {
            policy.RequireAuthenticatedUser();
            policy.RequireAssertion(context => 
            {
                var scopeClaims = context.User.FindAll("scope").Select(c => c.Value);
                return scopeClaims.Any(s => s.Split(' ', StringSplitOptions.RemoveEmptyEntries).Contains("deeplens.search"));
            });
        });
    options.AddPolicy("IngestPolicy", policy => 
    {
        policy.RequireAuthenticatedUser();
        policy.RequireAssertion(context => 
        {
            var scopeClaims = context.User.FindAll("scope").Select(c => c.Value);
            return scopeClaims.Any(s => s.Split(' ', StringSplitOptions.RemoveEmptyEntries).Contains("deeplens.api"));
        });
    });
});

// CORS Configuration for Frontend - read from appsettings.json
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000", "http://localhost:5001", "http://localhost:5173", "http://localhost:8081" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", builder =>
    {
        builder.WithOrigins(corsOrigins)
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Seed App Settings on startup
using (var scope = app.Services.CreateScope())
{
    var settingsService = scope.ServiceProvider.GetRequiredService<IAppSettingsService>();
    await settingsService.SeedDefaultsAsync();
}

app.Run();

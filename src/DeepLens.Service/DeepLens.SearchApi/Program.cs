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
using DeepLens.Shared.Telemetry;
using Microsoft.AspNetCore.Authorization;
using DeepLens.SearchApi.Auth;

Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

var builder = WebApplication.CreateBuilder(args);

// Configure OpenTelemetry Tracing & Metrics
builder.Services.AddDeepLensTelemetry(builder.Configuration, "DeepLens.SearchApi");

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.DictionaryKeyPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();

// Dynamic RBAC Permission Authorization
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();

// --- ENTERPRISE LAYERING REGISTRATIONS ---
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

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
builder.Services.AddScoped<IYoutubeService, YoutubeService>();
builder.Services.AddHttpClient<IAiService, AiService>(client => 
{
    client.Timeout = TimeSpan.FromMinutes(5);
});

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

// Configure Native Authentication (JWT)
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"] ?? "deeplens-super-secret-key-32-chars-long-2026!";
var symmetricKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtSecretKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false; 
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuers = new[] 
            { 
                "deeplens-api",
                "http://192.168.0.170:5000",
                "http://100.98.244.8:5000",
                "http://localhost:5000",
                "http://192.168.0.170:5198", 
                "http://100.98.244.8:5198",
                "http://10.0.2.2:5198",
                "http://krikanserver.taild227d9.ts.net:5198",
                "http://localhost:5198",
                "https://localhost:5001"
            },
            ValidateAudience = true,
            ValidAudiences = new[] { "deeplens-api", "deeplens-webui", "deeplens-mobile" },
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = symmetricKey,
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
var allowAnyIntranet = builder.Configuration.GetValue<bool>("Cors:AllowAnyIntranetOrigin");
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", builder =>
    {
        if (allowAnyIntranet)
        {
            builder.SetIsOriginAllowed(origin => 
                origin.Contains("localhost") || 
                origin.Contains("192.168.") || 
                origin.Contains("10.0.") ||
                origin.Contains("127.0.0.1"))
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        }
        else if (corsOrigins.Any())
        {
            builder.WithOrigins(corsOrigins)
                   .AllowAnyMethod()
                   .AllowAnyHeader()
                   .AllowCredentials();
        }
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
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "DeepLens.SearchApi", timestamp = DateTime.UtcNow })).AllowAnonymous();

// Seed App Settings on startup with retry resilience
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var settingsService = scope.ServiceProvider.GetRequiredService<IAppSettingsService>();
    
    int maxRetries = 5;
    for (int retry = 1; retry <= maxRetries; retry++)
    {
        try
        {
            await settingsService.SeedDefaultsAsync();
            logger.LogInformation("App settings seeded successfully on attempt {Attempt}.", retry);
            break;
        }
        catch (Exception ex) when (retry < maxRetries)
        {
            logger.LogWarning(ex, "Database connection not ready for AppSettings seeding on attempt {Attempt}/{MaxRetries}. Retrying in 2 seconds...", retry, maxRetries);
            await Task.Delay(TimeSpan.FromSeconds(2));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to seed default app settings after {MaxRetries} attempts. Proceeding with application startup.", maxRetries);
        }
    }
}

app.Run();

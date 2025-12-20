using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using DeepLens.SearchApi.Services;
using DeepLens.Infrastructure.Services;
using Minio;
using Confluent.Kafka;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Custom services
builder.Services.AddScoped<ITenantMetadataService, TenantMetadataService>();
builder.Services.AddHttpClient<IAttributeExtractionService, LlmAttributeExtractionService>();
builder.Services.AddScoped<DeepLens.Infrastructure.Services.IStorageService, DeepLens.Infrastructure.Services.MinioStorageService>();

// MinIO Setup
builder.Services.AddSingleton<Minio.IMinioClient>(sp => 
{
    return new Minio.MinioClient()
        .WithEndpoint("localhost:9000") // TODO: Config
        .WithCredentials("deeplens", "DeepLens123!")
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
    var config = new ProducerConfig { BootstrapServers = "localhost:9092" }; // TODO: Config
    return new ProducerBuilder<string, string>(config).Build();
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
    options.AddPolicy("SearchPolicy", policy => policy.RequireClaim("scope", "deeplens.search"));
    options.AddPolicy("IngestPolicy", policy => policy.RequireClaim("scope", "deeplens.api"));
});

// CORS Configuration for Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", builder =>
    {
        builder.WithOrigins("http://localhost:3000", "http://localhost:5173")
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

app.Run();

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using DeepLens.SearchApi.Services;
using DeepLens.Infrastructure.Services;
using Minio;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Custom services
builder.Services.AddScoped<ITenantMetadataService, TenantMetadataService>();
builder.Services.AddScoped<IAttributeExtractionService, LlmAttributeExtractionService>();
builder.Services.AddScoped<DeepLens.Infrastructure.Services.IStorageService, DeepLens.Infrastructure.Services.MinioStorageService>();

// MinIO Setup
builder.Services.AddSingleton<Minio.IMinioClient>(sp => 
{
    return new Minio.MinioClient()
        .WithEndpoint("localhost:9000") // TODO: Config
        .WithCredentials("minioadmin", "minioadmin")
        .Build();
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

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using NextGen.Identity.Data;
using NextGen.Identity.Data.Repositories;
using NextGen.Identity.Data.Services;
using NextGen.Identity.Data.Migrations;
using NextGen.Identity.Core.Interfaces;
using NextGen.Identity.Api.Configuration;
using NextGen.Identity.Api.Services;
using NextGen.Identity.Api.Data;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using OpenTelemetry.Metrics;
using Serilog;

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.OpenTelemetry(options =>
    {
        options.Endpoint = "http://localhost:4317";
        options.Protocol = Serilog.Sinks.OpenTelemetry.OtlpProtocol.Grpc;
    })
    .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Add Serilog
    builder.Host.UseSerilog();

    // Add services to the container
    builder.Services.AddControllers();
    builder.Services.AddOpenApi();

    // Configure PostgreSQL connection
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
        ?? "Host=localhost;Port=5433;Database=nextgen_identity;Username=postgres;Password=DeepLens123!";
    
    builder.Services.AddSingleton(new DbConnectionFactory(connectionString));

    // Register repositories
    builder.Services.AddScoped<ITenantRepository, TenantRepository>();
    builder.Services.AddScoped<IUserRepository, UserRepository>();
    builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();

    // Register services
    builder.Services.AddScoped<ITenantService, TenantService>();
    builder.Services.AddScoped<DatabaseSeeder>();

    // Configure CORS for WebUI
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowWebUI", policy =>
        {
            policy.WithOrigins("http://localhost:3000", "https://localhost:3000")
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        });
    });

    // Configure Duende IdentityServer
    var identityServerBuilder = builder.Services.AddIdentityServer(options =>
    {
        options.Events.RaiseErrorEvents = true;
        options.Events.RaiseInformationEvents = true;
        options.Events.RaiseFailureEvents = true;
        options.Events.RaiseSuccessEvents = true;
        
        // Emit static log for user interaction
        options.UserInteraction.LoginUrl = "/api/auth/login";
        options.UserInteraction.LogoutUrl = "/api/auth/logout";
        options.UserInteraction.ErrorUrl = "/api/auth/error";
    })
    .AddInMemoryIdentityResources(IdentityServerConfig.IdentityResources)
    .AddInMemoryApiScopes(IdentityServerConfig.ApiScopes)
    .AddInMemoryApiResources(IdentityServerConfig.ApiResources)
    .AddInMemoryClients(IdentityServerConfig.Clients)
    .AddProfileService<DeepLensProfileService>()
    .AddResourceOwnerValidator<DeepLensResourceOwnerPasswordValidator>();

    // Add developer signing credential (for development only!)
    if (builder.Environment.IsDevelopment())
    {
        identityServerBuilder.AddDeveloperSigningCredential();
    }
    else
    {
        // TODO: Add production certificate
        // identityServerBuilder.AddSigningCredential(LoadCertificate());
        throw new Exception("Production signing credential not configured");
    }

    // Configure JWT Authentication (for API endpoints)
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.Authority = builder.Configuration["IdentityServer:Authority"] ?? "https://localhost:5001";
            options.Audience = "deeplens-api";
            options.RequireHttpsMetadata = false; // Set to true in production
            
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ClockSkew = TimeSpan.Zero
            };
        });

    // Configure OpenTelemetry
    builder.Services.AddOpenTelemetry()
        .ConfigureResource(resource => resource
            .AddService("NextGen.Identity.Api"))
        .WithTracing(tracing => tracing
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddOtlpExporter(options =>
            {
                options.Endpoint = new Uri("http://localhost:4317");
            }))
        .WithMetrics(metrics => metrics
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddPrometheusExporter());

    var app = builder.Build();

    // Run database migrations and seeding
    using (var scope = app.Services.CreateScope())
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        var dbConnectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
            ?? "Host=localhost;Port=5433;Database=nextgen_identity;Username=postgres;Password=DeepLens123!";
        
        try
        {
            // Run migrations
            logger.LogInformation("Running database migrations...");
            var migrationRunner = new MigrationRunner(dbConnectionString);
            await migrationRunner.RunMigrationsAsync();
            logger.LogInformation("Database migrations completed successfully");

            // Seed initial data
            var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
            await seeder.SeedAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while migrating or seeding the database");
            throw;
        }
    }

    // Configure the HTTP request pipeline
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseHttpsRedirection();
    app.UseCors("AllowWebUI");

    // Use IdentityServer middleware
    app.UseIdentityServer();

    app.UseAuthentication();
    app.UseAuthorization();

    // Map Prometheus metrics endpoint
    app.MapPrometheusScrapingEndpoint();

    app.MapControllers();

    Log.Information("Starting NextGen.Identity.Api on {Urls}", string.Join(", ", app.Urls));
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}


using CompetitorIntel.Orchestrator.Services;
using CompetitorIntel.Orchestrator.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// HTTP client for Meta Graph API calls
builder.Services.AddHttpClient("MetaGraph", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

// Database
builder.Services.AddDbContext<CompetitorContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
           .UseSnakeCaseNamingConvention());

// Meta Graph API & App Settings Services
builder.Services.AddSingleton<AppSettingsService>();
builder.Services.AddSingleton<MetaGraphService>();
builder.Services.AddHostedService<InstagramSyncService>();

// Kafka (retained for other event types)
builder.Services.AddSingleton<IKafkaProducerService, KafkaProducerService>();
builder.Services.AddHostedService<KafkaConsumerService>();

// Configure CORS
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

// Run DB seeding (idempotent, creates `app_settings` if missing)
using (var scope = app.Services.CreateScope())
{
    var settingsService = scope.ServiceProvider.GetRequiredService<AppSettingsService>();
    settingsService.SeedDefaultsAsync().GetAwaiter().GetResult();
}

app.UseCors("AllowAll");

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();
app.MapControllers();

app.Run();

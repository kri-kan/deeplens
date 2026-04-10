using DeepLens.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register HTTP client for Qdrant operations
builder.Services.AddHttpClient<IVectorStoreService, VectorStoreService>();

// Register VectorStoreService
builder.Services.AddScoped<IVectorStoreService, VectorStoreService>();

// Configure CORS for PowerShell scripts
builder.Services.AddCors(options =>
{
    options.AddPolicy("PowerShellAccess", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("PowerShellAccess");
app.UseHttpsRedirection();
app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => new { 
    status = "healthy", 
    service = "deeplens-admin-api",
    timestamp = DateTime.UtcNow 
});

app.Run();

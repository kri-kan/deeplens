using DeepLens.WorkerService;
using DeepLens.WorkerService.Workers;
using DeepLens.Infrastructure.Services;
using Minio;
using Confluent.Kafka;

var builder = Host.CreateApplicationBuilder(args);

// External Services
builder.Services.AddHttpClient();
builder.Services.AddHttpClient<IVectorStoreService, VectorStoreService>();

// MinIO Setup
builder.Services.AddSingleton<IMinioClient>(sp => 
{
    var config = sp.GetRequiredService<IConfiguration>();
    var endpoint = config["Minio:Endpoint"] ?? throw new InvalidOperationException("Minio:Endpoint is not configured.");
    var accessKey = config["Minio:AccessKey"] ?? throw new InvalidOperationException("Minio:AccessKey is not configured.");
    var secretKey = config["Minio:SecretKey"] ?? throw new InvalidOperationException("Minio:SecretKey is not configured.");
    
    return new MinioClient()
        .WithEndpoint(endpoint)
        .WithCredentials(accessKey, secretKey)
        .Build();
});

// Kafka Producer Setup (for workers that produce results)
builder.Services.AddSingleton<IProducer<string, string>>(sp => 
{
    var config = sp.GetRequiredService<IConfiguration>();
    var bootstrapServers = config["Kafka:BootstrapServers"] ?? throw new InvalidOperationException("Kafka:BootstrapServers is not configured.");
    var kafkaConfig = new ProducerConfig { BootstrapServers = bootstrapServers };
    return new ProducerBuilder<string, string>(kafkaConfig).Build();
});

// Infrastructure Drivers
builder.Services.AddScoped<IStorageService, MinioStorageService>();
builder.Services.AddScoped<IVectorStoreService, VectorStoreService>();
builder.Services.AddScoped<ITenantMetadataService, TenantMetadataService>();

// Background Workers
builder.Services.AddHostedService<ImageProcessingWorker>();
builder.Services.AddHostedService<VideoProcessingWorker>();
builder.Services.AddHostedService<FeatureExtractionWorker>();
builder.Services.AddHostedService<VectorIndexingWorker>();
builder.Services.AddHostedService<ImageMaintenanceWorker>();

var host = builder.Build();
host.Run();

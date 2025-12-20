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
    return new MinioClient()
        .WithEndpoint("localhost:9000") // TODO: Config
        .WithCredentials("minioadmin", "minioadmin")
        .Build();
});

// Kafka Producer Setup (for workers that produce results)
builder.Services.AddSingleton<IProducer<string, string>>(sp => 
{
    var config = new ProducerConfig { BootstrapServers = "localhost:9092" };
    return new ProducerBuilder<string, string>(config).Build();
});

// Infrastructure Drivers
builder.Services.AddScoped<IStorageService, MinioStorageService>();
builder.Services.AddScoped<IVectorStoreService, VectorStoreService>();

// Background Workers
builder.Services.AddHostedService<ImageMaintenanceWorker>();
// builder.Services.AddHostedService<FeatureExtractionWorker>(); // Uncomment when ready
// builder.Services.AddHostedService<VectorIndexingWorker>();    // Uncomment when ready

var host = builder.Build();
host.Run();

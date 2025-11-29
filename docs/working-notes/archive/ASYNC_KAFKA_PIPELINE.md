# DeepLens Async Processing Pipeline with Kafka

This document describes the Kafka-based asynchronous processing architecture for DeepLens, enabling immediate upload confirmation while handling time-consuming ML operations in the background.

## 🚀 Async Pipeline Architecture

### Current Problem
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Upload    │────▶│   Feature   │────▶│   Vector    │────▶│  Response   │
│   Image     │    │ Extraction  │    │   Storage   │    │  (3-5 sec)  │
│  (Fast)     │    │ (2-3 sec)   │    │  (1 sec)    │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          ⚠️ Blocking - User waits 4-6 seconds
```

### New Async Solution
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Upload    │────▶│   Kafka     │────▶│ Immediate   │
│   Image     │    │   Event     │    │ Response    │
│  (Fast)     │    │ (< 100ms)   │    │ (< 200ms)   │
└─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 ASYNC PROCESSING PIPELINE                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Kafka     │──▶ │  Feature    │──▶│   Kafka     │     │
│  │ Consumer    │    │ Extraction  │    │ Producer    │     │
│  │             │    │ (Python)    │    │             │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                              │              │
│                                              ▼              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Kafka     │────▶│   Vector    │────▶│  Webhook/   │     │
│  │ Consumer    │    │  Storage    │    │   Event     │     │
│  │             │    │  (.NET)     │    │             │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
      Background Workers - No user blocking
```

## 📨 Kafka Event Schema Design

### Topic Structure
```
deeplens.images.uploaded          # Image metadata stored, processing triggered
deeplens.features.extraction      # Feature extraction requests
deeplens.vectors.indexing         # Vector indexing requests  
deeplens.processing.completed     # Processing completion notifications
deeplens.processing.failed        # Error handling and retries
```

### Event Schemas

#### 1. ImageUploadedEvent
```json
{
  "eventId": "evt_12345678-1234-1234-1234-123456789abc",
  "eventType": "image.uploaded",
  "eventVersion": "1.0",
  "timestamp": "2025-11-28T10:30:00Z",
  "tenantId": "acme-corp",
  "data": {
    "imageId": "img_98765432-4321-4321-4321-210987654321",
    "fileName": "product-image-001.jpg",
    "filePath": "/storage/tenant-acme-corp/images/2025/11/28/img_98765432.jpg",
    "fileSize": 2048576,
    "contentType": "image/jpeg",
    "uploadedBy": "user_john_doe",
    "metadata": {
      "width": 1920,
      "height": 1080,
      "format": "JPEG",
      "colorProfile": "sRGB",
      "originalFileName": "product-shot.jpg"
    },
    "storageProvider": {
      "type": "azure_blob",
      "containerName": "acme-corp-images",
      "blobName": "2025/11/28/img_98765432.jpg"
    }
  },
  "processingOptions": {
    "models": ["resnet50"],  # Phase 1: single model, Phase 2: multiple
    "priority": "normal",    # high, normal, low
    "skipDuplicateCheck": false,
    "generateThumbnail": true
  }
}
```

#### 2. FeatureExtractionRequestedEvent  
```json
{
  "eventId": "evt_87654321-4321-4321-4321-123456789def",
  "eventType": "feature.extraction.requested",
  "eventVersion": "1.0", 
  "timestamp": "2025-11-28T10:30:01Z",
  "tenantId": "acme-corp",
  "correlationId": "evt_12345678-1234-1234-1234-123456789abc",
  "data": {
    "imageId": "img_98765432-4321-4321-4321-210987654321",
    "imagePath": "/storage/tenant-acme-corp/images/2025/11/28/img_98765432.jpg",
    "modelName": "resnet50",
    "modelVersion": "v2.7",
    "expectedDimension": 2048,
    "extractionOptions": {
      "normalize": true,
      "returnMetadata": true,
      "timeout": 30
    }
  },
  "retryPolicy": {
    "maxAttempts": 3,
    "backoffMs": 1000,
    "currentAttempt": 1
  }
}
```

#### 3. VectorIndexingRequestedEvent
```json
{
  "eventId": "evt_11111111-2222-3333-4444-555555555555",
  "eventType": "vector.indexing.requested", 
  "eventVersion": "1.0",
  "timestamp": "2025-11-28T10:30:04Z",
  "tenantId": "acme-corp",
  "correlationId": "evt_12345678-1234-1234-1234-123456789abc",
  "data": {
    "imageId": "img_98765432-4321-4321-4321-210987654321",
    "modelName": "resnet50",
    "featureVector": [0.123, -0.456, 0.789, ...], # 2048 dimensions
    "vectorMetadata": {
      "extractionTime": "2025-11-28T10:30:03Z",
      "processingTimeMs": 2150,
      "modelVersion": "v2.7",
      "confidence": 0.98
    },
    "imageMetadata": {
      "width": 1920,
      "height": 1080,
      "format": "JPEG",
      "fileSize": 2048576
    }
  }
}
```

#### 4. ProcessingCompletedEvent
```json
{
  "eventId": "evt_99999999-8888-7777-6666-555555555555",
  "eventType": "processing.completed",
  "eventVersion": "1.0",
  "timestamp": "2025-11-28T10:30:05Z", 
  "tenantId": "acme-corp",
  "correlationId": "evt_12345678-1234-1234-1234-123456789abc",
  "data": {
    "imageId": "img_98765432-4321-4321-4321-210987654321",
    "status": "success",
    "processingSteps": [
      {
        "step": "feature_extraction",
        "status": "completed",
        "duration": 2150,
        "modelName": "resnet50"
      },
      {
        "step": "vector_indexing", 
        "status": "completed",
        "duration": 450,
        "collectionName": "tenant_acmecorp_resnet50_vectors"
      }
    ],
    "totalProcessingTime": 2600,
    "searchableAfter": "2025-11-28T10:30:05Z"
  }
}
```

## 🔄 Processing Flow Implementation

### 1. Upload API (Immediate Response)
```csharp
[HttpPost("upload")]
public async Task<IActionResult> UploadImage(IFormFile file, [FromForm] UploadImageRequest request)
{
    // 1. Validate file (fast - < 50ms)
    if (!IsValidImageFile(file))
        return BadRequest("Invalid image file");
        
    // 2. Store metadata in PostgreSQL (fast - < 100ms)
    var imageId = Guid.NewGuid();
    var imageMetadata = await _metadataService.SaveImageMetadataAsync(imageId, file, request);
    
    // 3. Store file to storage (moderately fast - < 500ms)
    var storagePath = await _storageService.SaveImageAsync(file, imageMetadata);
    
    // 4. Publish Kafka event for async processing (fast - < 50ms)
    var uploadEvent = new ImageUploadedEvent
    {
        EventId = Guid.NewGuid(),
        TenantId = request.TenantId,
        Data = new ImageUploadedData 
        {
            ImageId = imageId,
            FilePath = storagePath,
            // ... other metadata
        }
    };
    
    await _kafkaProducer.PublishAsync("deeplens.images.uploaded", uploadEvent);
    
    // 5. Return immediately (total time < 700ms)
    return Ok(new UploadImageResponse
    {
        ImageId = imageId,
        Status = "uploaded",
        Message = "Image uploaded successfully. Processing started.",
        EstimatedProcessingTime = "2-5 seconds",
        StatusCheckUrl = $"/api/v1/images/{imageId}/status"
    });
}
```

### 2. Orchestration Service (Kafka Consumers)
```csharp
// DeepLens.WorkerService/Workers/ImageProcessingWorker.cs
public class ImageProcessingWorker : BackgroundService
{
    private readonly IKafkaConsumer _consumer;
    private readonly IFeatureExtractionService _featureService;
    private readonly IKafkaProducer _producer;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _consumer.SubscribeAsync(new[] { "deeplens.images.uploaded" });
        
        await foreach (var message in _consumer.ConsumeAsync(stoppingToken))
        {
            try 
            {
                var uploadEvent = JsonSerializer.Deserialize<ImageUploadedEvent>(message.Value);
                
                // Trigger feature extraction
                var extractionEvent = new FeatureExtractionRequestedEvent
                {
                    EventId = Guid.NewGuid(),
                    TenantId = uploadEvent.TenantId,
                    CorrelationId = uploadEvent.EventId,
                    Data = new FeatureExtractionData
                    {
                        ImageId = uploadEvent.Data.ImageId,
                        ImagePath = uploadEvent.Data.FilePath,
                        ModelName = "resnet50" // Phase 1: hardcoded
                    }
                };
                
                await _producer.PublishAsync("deeplens.features.extraction", extractionEvent);
                await _consumer.CommitAsync(message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing image upload event");
                // Implement retry logic or dead letter queue
            }
        }
    }
}
```

### 3. Feature Extraction Consumer
```csharp
public class FeatureExtractionWorker : BackgroundService  
{
    private readonly IKafkaConsumer _consumer;
    private readonly HttpClient _pythonServiceClient;
    private readonly IKafkaProducer _producer;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _consumer.SubscribeAsync(new[] { "deeplens.features.extraction" });
        
        await foreach (var message in _consumer.ConsumeAsync(stoppingToken))
        {
            try
            {
                var extractionEvent = JsonSerializer.Deserialize<FeatureExtractionRequestedEvent>(message.Value);
                
                // Call Python feature extraction service
                var response = await _pythonServiceClient.PostAsync("/extract-features", 
                    CreateFeatureExtractionRequest(extractionEvent));
                    
                var features = await response.Content.ReadFromJsonAsync<ExtractFeaturesResponse>();
                
                // Publish vector indexing event
                var indexingEvent = new VectorIndexingRequestedEvent
                {
                    EventId = Guid.NewGuid(),
                    TenantId = extractionEvent.TenantId,
                    CorrelationId = extractionEvent.CorrelationId,
                    Data = new VectorIndexingData
                    {
                        ImageId = extractionEvent.Data.ImageId,
                        ModelName = extractionEvent.Data.ModelName,
                        FeatureVector = features.Features,
                        VectorMetadata = new VectorMetadata
                        {
                            ExtractionTime = DateTime.UtcNow,
                            ProcessingTimeMs = features.ProcessingTimeMs,
                            ModelVersion = features.ModelVersion
                        }
                    }
                };
                
                await _producer.PublishAsync("deeplens.vectors.indexing", indexingEvent);
                await _consumer.CommitAsync(message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing feature extraction request");
                await HandleExtractionError(message, ex);
            }
        }
    }
}
```

### 4. Vector Indexing Consumer
```csharp
public class VectorIndexingWorker : BackgroundService
{
    private readonly IKafkaConsumer _consumer;
    private readonly IVectorStoreService _vectorStore;
    private readonly IKafkaProducer _producer;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _consumer.SubscribeAsync(new[] { "deeplens.vectors.indexing" });
        
        await foreach (var message in _consumer.ConsumeAsync(stoppingToken))
        {
            try
            {
                var indexingEvent = JsonSerializer.Deserialize<VectorIndexingRequestedEvent>(message.Value);
                
                // Index vector in Qdrant
                var success = await _vectorStore.IndexVectorAsync(
                    indexingEvent.TenantId,
                    indexingEvent.Data.ModelName,
                    indexingEvent.Data.ImageId.ToString(),
                    indexingEvent.Data.FeatureVector,
                    indexingEvent.Data.VectorMetadata.ToDictionary()
                );
                
                if (success)
                {
                    // Publish completion event
                    var completionEvent = new ProcessingCompletedEvent
                    {
                        EventId = Guid.NewGuid(),
                        TenantId = indexingEvent.TenantId,
                        CorrelationId = indexingEvent.CorrelationId,
                        Data = new ProcessingCompletedData
                        {
                            ImageId = indexingEvent.Data.ImageId,
                            Status = "success",
                            SearchableAfter = DateTime.UtcNow
                        }
                    };
                    
                    await _producer.PublishAsync("deeplens.processing.completed", completionEvent);
                }
                
                await _consumer.CommitAsync(message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing vector indexing request");
                await HandleIndexingError(message, ex);
            }
        }
    }
}
```

## 📊 Benefits of Async Architecture

### User Experience
- **Immediate Feedback**: Upload confirmation in < 700ms
- **Progress Tracking**: Real-time status via WebSocket or polling
- **No Timeouts**: Users don't wait for ML processing

### System Performance  
- **Scalability**: Independent scaling of upload vs processing
- **Resilience**: Failed ML operations don't block uploads
- **Resource Optimization**: CPU-intensive tasks run on dedicated workers

### Operational Benefits
- **Monitoring**: Each step tracked via Kafka events
- **Retry Logic**: Built-in error handling and retries  
- **Dead Letter Queues**: Failed messages for investigation
- **Backpressure**: Natural flow control via Kafka

## 🔍 Status Tracking Implementation

### Status Check API
```csharp
[HttpGet("images/{imageId}/status")]
public async Task<IActionResult> GetImageStatus(Guid imageId)
{
    var status = await _statusService.GetProcessingStatusAsync(imageId);
    
    return Ok(new ImageStatusResponse
    {
        ImageId = imageId,
        Status = status.Status, // uploaded, processing, completed, failed
        ProcessingSteps = status.Steps,
        EstimatedTimeRemaining = status.EstimatedTimeRemaining,
        SearchableAfter = status.SearchableAfter,
        LastUpdated = status.LastUpdated
    });
}
```

### WebSocket Real-time Updates
```csharp
// Real-time status updates via SignalR
public class ProcessingStatusHub : Hub
{
    public async Task SubscribeToImageStatus(string imageId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"image_{imageId}");
    }
}

// In completion event handler
await _hubContext.Clients.Group($"image_{imageId}")
    .SendAsync("ProcessingCompleted", completionEvent);
```

This async architecture transforms DeepLens from a blocking synchronous system to a responsive, scalable platform that handles ML workloads gracefully while providing excellent user experience.
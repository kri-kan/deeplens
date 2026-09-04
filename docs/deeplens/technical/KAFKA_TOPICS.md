# Kafka Topics Reference

**Last Updated**: 2026-07-20

This document provides comprehensive documentation for all Kafka topics used in the DeepLens platform.

---

## 📋 Table of Contents

- [Overview](#overview)
- [DeepLens Core Topics](#deeplens-core-topics)
- [WhatsApp Processor Topics](#whatsapp-processor-topics)
- [Topic Configuration](#topic-configuration)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Monitoring \& Management](#monitoring--management)
- [Best Practices](#best-practices)

---

## Overview

DeepLens uses Apache Kafka as the backbone for event-driven processing across multiple services. The platform currently uses **9 topics** divided into two domains:

- **DeepLens Core**: 7 topics for image/video processing pipeline
- **WhatsApp Processor**: 8 topics for message processing and group pipeline
- **Instagram Story Queue**: 1 topic for story automation events

### Architecture Principles

- **Event-Driven**: All inter-service communication uses Kafka events
- **Async Processing**: Long-running tasks are decoupled via topics
- **Scalability**: Multiple partitions allow parallel processing
- **Reliability**: Events are persisted and can be replayed

---

## DeepLens Core Topics

These topics orchestrate the complete image and video processing pipeline.

### 1. `deeplens.images.uploaded`

**Purpose**: Notifies when a new image has been uploaded and is ready for processing.

**Producer**: `SearchAPI`
- Triggered on: Image upload via API
- Event Type: `ImageUploadedEvent`

**Consumer**: `WorkerService` (ImageProcessingWorker)
- Action: Initialize image processing pipeline
- Next Step: Preprocess image and publish to `deeplens.features.extraction`

**Payload Example**:
```json
{
  "imageId": "img_123456",
  "tenantId": "tenant_abc",
  "fileName": "photo.jpg",
  "storagePath": "minio://tenant-abc/images/photo.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 2048576,
  "uploadedAt": "2026-01-14T10:30:00Z",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "format": "JPEG"
  }
}
```

**Configuration**:
- Partitions: 3
- Replication Factor: 1
- Retention: 7 days

---

### 2. `deeplens.videos.uploaded`

**Purpose**: Notifies when a new video has been uploaded and requires frame extraction.

**Producer**: `SearchAPI`
- Triggered on: Video upload via API
- Event Type: `VideoUploadedEvent`

**Consumer**: `WorkerService` (VideoProcessingWorker)
- Action: Extract frames from video
- Next Step: Process each frame through image pipeline

**Payload Example**:
```json
{
  "videoId": "vid_789012",
  "tenantId": "tenant_abc",
  "fileName": "video.mp4",
  "storagePath": "minio://tenant-abc/videos/video.mp4",
  "mimeType": "video/mp4",
  "sizeBytes": 52428800,
  "duration": 120.5,
  "uploadedAt": "2026-01-14T10:35:00Z",
  "metadata": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "codec": "h264"
  }
}
```

**Configuration**:
- Partitions: 3
- Replication Factor: 1
- Retention: 7 days

---

### 3. `deeplens.features.extraction`

**Purpose**: Requests ML-based feature extraction from preprocessed images.

**Producer**: `WorkerService` (ImageProcessingWorker)
- Triggered on: After image preprocessing
- Event Type: `FeatureExtractionRequestedEvent`

**Consumer**: `PythonService` (ML Feature Extraction)
- Action: Run ML model to extract feature vectors
- Next Step: Publish vectors to `deeplens.vectors.indexing`

**Payload Example**:
```json
{
  "imageId": "img_123456",
  "tenantId": "tenant_abc",
  "preprocessedPath": "minio://tenant-abc/processed/img_123456.jpg",
  "extractionParams": {
    "model": "clip-vit-base",
    "dimensions": 512,
    "normalize": true
  },
  "requestedAt": "2026-01-14T10:30:05Z"
}
```

**Configuration**:
- Partitions: 3
- Replication Factor: 1
- Retention: 7 days

---

### 4. `deeplens.vectors.indexing`

**Purpose**: Requests indexing of extracted feature vectors into Qdrant vector database.

**Producer**: `PythonService` (ML Feature Extraction)
- Triggered on: After successful feature extraction
- Event Type: `VectorIndexingRequestedEvent`

**Consumer**: `WorkerService` (VectorIndexingWorker)
- Action: Index vectors in Qdrant
- Next Step: Publish to `deeplens.processing.completed`

**Payload Example**:
```json
{
  "imageId": "img_123456",
  "tenantId": "tenant_abc",
  "vectors": [0.123, -0.456, 0.789, ...],
  "dimensions": 512,
  "metadata": {
    "fileName": "photo.jpg",
    "uploadedAt": "2026-01-14T10:30:00Z",
    "tags": ["landscape", "nature"]
  },
  "extractedAt": "2026-01-14T10:30:10Z"
}
```

**Configuration**:
- Partitions: 3
- Replication Factor: 1
- Retention: 7 days

---

### 5. `deeplens.processing.completed`

**Purpose**: Notifies that the entire processing pipeline completed successfully.

**Producer**: `WorkerService` (VectorIndexingWorker)
- Triggered on: After successful vector indexing
- Event Type: `ProcessingCompletedEvent`

**Consumer**: `SearchAPI`
- Action: Update database status to "completed"
- Next Step: Image is now searchable

**Payload Example**:
```json
{
  "imageId": "img_123456",
  "tenantId": "tenant_abc",
  "status": "completed",
  "processingTime": 15.2,
  "metrics": {
    "preprocessingTime": 2.1,
    "extractionTime": 10.5,
    "indexingTime": 2.6
  },
  "completedAt": "2026-01-14T10:30:15Z"
}
```

**Configuration**:
- Partitions: 3
- Replication Factor: 1
- Retention: 30 days (longer for audit trail)

---

### 6. `deeplens.processing.failed`

**Purpose**: Notifies that processing failed and requires attention.

**Producer**: `WorkerService` (any worker)
- Triggered on: Pipeline errors, timeouts, or exceptions
- Event Type: `ProcessingFailedEvent`

**Consumer**: `SearchAPI`
- Action: Update database status to "failed"
- Next Step: Trigger alerts, log errors, schedule retry

**Payload Example**:
```json
{
  "imageId": "img_123456",
  "tenantId": "tenant_abc",
  "status": "failed",
  "error": {
    "code": "EXTRACTION_TIMEOUT",
    "message": "Feature extraction timed out after 60 seconds",
    "stackTrace": "...",
    "retryable": true
  },
  "failedAt": "2026-01-14T10:31:00Z",
  "attemptNumber": 2
}
```

**Configuration**:
- Partitions: 3
- Replication Factor: 1
- Retention: 30 days (longer for debugging)

---

### 7. `deeplens.images.maintenance`

**Purpose**: Triggers cleanup of deleted images, orphaned vectors, and storage optimization.

**Producer**: `SearchAPI`
- Triggered on: Image deletion, scheduled cleanup, manual maintenance
- Event Type: `ImageMaintenanceEvent`

**Consumer**: `WorkerService` (MaintenanceWorker)
- Action: Delete files from MinIO, remove vectors from Qdrant, cleanup database
- Next Step: None (end of pipeline)

**Payload Example**:
```json
{
  "maintenanceType": "delete",
  "imageId": "img_123456",
  "tenantId": "tenant_abc",
  "actions": [
    "delete_minio_files",
    "delete_qdrant_vectors",
    "cleanup_database"
  ],
  "requestedAt": "2026-01-14T11:00:00Z"
}
```

**Configuration**:
- Partitions: 3
- Replication Factor: 1
- Retention: 7 days

---

## WhatsApp Processor Topics

### 1. `whatsapp-ready-messages`

**Purpose**: Queues WhatsApp messages for asynchronous processing and notification delivery.

**Producer**: `WhatsAppService`
- Triggered on: New WhatsApp message received
- Event Type: Custom message event

**Consumer**: `MessageQueueService`
- Action: Process message, send notifications, trigger workflows
- Next Step: Application-specific processing

**Payload Example**:
```json
{
  "messageId": "msg_abc123",
  "chatJid": "1234567890@s.whatsapp.net",
  "fromMe": false,
  "messageType": "text",
  "content": "Hello, world!",
  "timestamp": 1705234567,
  "metadata": {
    "isGroup": false,
    "senderName": "John Doe"
  }
}
```

**Configuration**:
- Partitions: 3
- Replication Factor: 1
- Retention: 7 days
- Environment Variable: `KAFKA_TOPIC` (default: `whatsapp-ready-messages`)

---

### 2. `WhatsApp.newproduct.received`
**Purpose**: Image upload notifications for DeepLens pipeline (also known as `deeplens.images.uploaded`).
**Producer**: WhatsAppProcessor / SearchAPI
**Consumer**: DeepLens WorkerService (Image processing)

### 3. `WhatsApp.group.product.create`
**Purpose**: Triggers a new product creation from a WhatsApp group message.

### 4. `WhatsApp.group.media.added`
**Purpose**: Triggers media addition to an existing WhatsApp group product.

### 5. `WhatsApp.group.product.created`
**Purpose**: Write-back notification that a product has been successfully created.

### 6. `WhatsApp.group.reprocess`
**Purpose**: Request to reprocess, split, or merge WhatsApp group products.

### 7. `WhatsApp.group.product.enrich`
**Purpose**: Triggers asynchronous LLM enrichment for a WhatsApp group product.

### 8. `WhatsApp.group.product.delete`
**Purpose**: Request to delete a WhatsApp group product due to user request or ineligibility.

---

## Instagram Story Queue Topics

### 1. `story.queue.updated`

**Purpose**: Notifies that the pending story post queue for a specific Instagram account has changed (item queued, posted, or removed). Used to keep the Maestro automation runner and any listening clients in sync without polling.

**Producer**: `SearchAPI` (`InstaController`)
- Triggered on: A post is queued via `POST /api/insta/story-posts/{id}/queue` or marked as posted via `POST /api/insta/story-posts/{id}/mark-posted`
- Event Type: `StoryQueueUpdatedEvent`

**Consumer**: Future — story automation orchestration service or dashboard push notification
- Action: Refresh pending queue count for the affected target watchlist

**Payload Example**:
```json
{
  "targetWatchlistId": "a3f1bc22-1234-4567-abcd-000000000001",
  "postId": "d9e2fa11-aaaa-bbbb-cccc-111111111111",
  "action": "queued",
  "pendingCount": 12,
  "occurredAt": "2026-07-20T17:00:00Z"
}
```

**Fields**:
| Field | Type | Description |
|---|---|---|
| `targetWatchlistId` | UUID | The own-profile Instagram account receiving the story |
| `postId` | UUID | The competitor video post being queued or marked posted |
| `action` | string | `"queued"` or `"posted"` |
| `pendingCount` | int | Total pending items in the queue after this action |
| `occurredAt` | ISO8601 | Timestamp of the event |

**Configuration**:
- Partitions: 1
- Replication Factor: 1
- Retention: 1 day (transient notification, not for replay)
- Topic name (docker-compose): `story.queue.updated`

---

## Topic Configuration

### Default Settings

All topics use the following default configuration:

```yaml
Partitions: 3
Replication Factor: 1  # Single-node Kafka (development)
Retention: 7 days      # Except where noted
Compression: None
Cleanup Policy: delete
```

### Configuration Files

**DeepLens Topics**:
- Defined in: `src/DeepLens.Service/DeepLens.Contracts/Events/KafkaEvents.cs`
- Created by: `infrastructure/setup-deeplens-dev.ps1`

**WhatsApp Topic**:
- Defined in: `src/whatsapp-processor/src/config/index.ts`
- Created by: `src/whatsapp-processor/reset-all.ps1`

### Environment Variables

```bash
# Kafka Broker
KAFKA_BROKERS=localhost:9092

# WhatsApp Processor
KAFKA_CLIENT_ID=whatsapp-processor
KAFKA_GROUP_ID=whatsapp-processing-group
KAFKA_TOPIC=whatsapp-ready-messages
```

---

## Data Flow Diagrams

### Image Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  Complete Image Processing Flow                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Upload                                                     │
│       │                                                          │
│       ├─→ SearchAPI                                             │
│       │      │                                                   │
│       │      ├─→ Save to MinIO                                  │
│       │      ├─→ Create DB record                               │
│       │      └─→ [deeplens.images.uploaded]                     │
│       │                │                                         │
│       │                └─→ WorkerService (ImageProcessingWorker)│
│       │                          │                               │
│       │                          ├─→ Preprocess image           │
│       │                          └─→ [deeplens.features.extraction]
│       │                                    │                     │
│       │                                    └─→ PythonService    │
│       │                                          │               │
│       │                                          ├─→ Run ML model│
│       │                                          └─→ [deeplens.vectors.indexing]
│       │                                                │         │
│       │                                                └─→ WorkerService (VectorIndexingWorker)
│       │                                                      │   │
│       │                                                      ├─→ Index in Qdrant
│       │                                                      └─→ [deeplens.processing.completed]
│       │                                                            │
│       │ ←──────────────────────────────────────────────────────────┘
│       │                                                            │
│       └─→ SearchAPI                                               │
│              │                                                     │
│              └─→ Update DB status = "completed"                   │
│                                                                    │
│  Image is now searchable! ✓                                       │
│                                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Error Handling                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Any Worker encounters error                                     │
│       │                                                          │
│       └─→ [deeplens.processing.failed]                          │
│                │                                                 │
│                └─→ SearchAPI                                     │
│                      │                                           │
│                      ├─→ Update DB status = "failed"            │
│                      ├─→ Log error details                       │
│                      ├─→ Send alert (if configured)              │
│                      └─→ Schedule retry (if retryable)           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Monitoring & Management

### List All Topics

```powershell
.\infrastructure\scripts\WAProcessor\manage-kafka-topics.ps1 -Action List
```

### Create a Topic

```powershell
.\infrastructure\scripts\WAProcessor\manage-kafka-topics.ps1 `
    -Action Create `
    -TopicName "my-topic" `
    -Partitions 3 `
    -ReplicationFactor 1
```

### Delete a Topic

```powershell
.\infrastructure\scripts\WAProcessor\manage-kafka-topics.ps1 `
    -Action Delete `
    -TopicName "my-topic"
```

### Recreate a Topic (Clean Slate)

```powershell
.\infrastructure\scripts\WAProcessor\manage-kafka-topics.ps1 `
    -Action Recreate `
    -TopicName "my-topic"
```

### Monitor Consumer Lag

```bash
podman exec deeplens-kafka kafka-consumer-groups \
    --bootstrap-server localhost:9092 \
    --describe \
    --group whatsapp-processing-group
```

### View Topic Details

```bash
podman exec deeplens-kafka kafka-topics \
    --bootstrap-server localhost:9092 \
    --describe \
    --topic deeplens.images.uploaded
```

---

## Best Practices

### Development

✅ **Use the management script**: Always use `manage-kafka-topics.ps1` for topic operations
✅ **Test locally**: Use `reset-all.ps1` to recreate topics with clean state
✅ **Monitor logs**: Watch consumer lag and processing times
✅ **Handle failures**: Always implement retry logic with exponential backoff

### Production Recommendations

🚀 **Increase replication**: Set replication factor to 3 for fault tolerance
🚀 **Adjust partitions**: Scale partitions based on throughput (e.g., 10-20 for high volume)
🚀 **Configure retention**: Set appropriate retention based on compliance needs
🚀 **Enable compression**: Use `snappy` or `lz4` for large messages
🚀 **Monitor consumer lag**: Set up alerts for lag > 1000 messages
🚀 **Use consumer groups**: Ensure proper consumer group management for parallel processing

### Naming Conventions

- **Prefix**: All DeepLens topics use `deeplens.` prefix
- **Format**: `{domain}.{entity}.{action}` (e.g., `deeplens.images.uploaded`)
- **Lowercase**: Always use lowercase with dots as separators
- **Descriptive**: Names should clearly indicate purpose

---

## Troubleshooting

### Topic Not Found

```powershell
# List all topics to verify
.\infrastructure\scripts\WAProcessor\manage-kafka-topics.ps1 -Action List

# Recreate if missing
.\infrastructure\scripts\WAProcessor\manage-kafka-topics.ps1 -Action Create -TopicName "deeplens.images.uploaded"
```

### Consumer Not Processing

```bash
# Check consumer group status
podman exec deeplens-kafka kafka-consumer-groups \
    --bootstrap-server localhost:9092 \
    --describe \
    --group your-consumer-group

# Check topic has messages
podman exec deeplens-kafka kafka-console-consumer \
    --bootstrap-server localhost:9092 \
    --topic deeplens.images.uploaded \
    --from-beginning \
    --max-messages 10
```

### High Consumer Lag

1. **Scale consumers**: Add more consumer instances
2. **Increase partitions**: More partitions = more parallelism
3. **Optimize processing**: Profile and optimize consumer code
4. **Check resources**: Ensure adequate CPU/memory

---

## Related Documentation

- [SERVICES.md](./SERVICES.md) - Service architecture overview
- [VIDEO_PROCESSING.md](./VIDEO_PROCESSING.md) - Video processing details
- [DEVELOPMENT.md](../DEVELOPMENT.md) - Development setup guide
- [KafkaEvents.cs](../src/DeepLens.Service/DeepLens.Contracts/Events/KafkaEvents.cs) - Event definitions

---

**Last Updated**: 2026-07-20  
**Maintained By**: DeepLens Team

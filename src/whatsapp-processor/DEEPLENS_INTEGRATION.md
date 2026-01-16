# DeepLens Integration for WhatsApp Processor

## Overview

The DeepLens Integration Service automatically processes WhatsApp images and sends them to DeepLens for AI-powered image analysis. It also handles message grouping for conversation threading.

## Features

### 1. **Automatic Message Grouping**
- Assigns `group_id` to messages based on conversation context
- Groups messages within a configurable time window (default: 5 minutes)
- Maintains conversation threading for better organization

### 2. **Image Processing Pipeline**
- Detects images and stickers in WhatsApp messages
- Automatically sends images to DeepLens via Kafka
- Tracks processing status to avoid duplicates
- Supports batch processing for efficiency

### 3. **Continuous Operation**
- Runs as a background service throughout application lifetime
- Configurable processing intervals
- Graceful startup and shutdown

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  WhatsApp Message Flow → DeepLens Integration                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. WhatsApp Message Received                                   │
│     └─→ Saved to PostgreSQL                                    │
│         • message_id, jid, media_type, media_url               │
│         • group_id = NULL (initially)                          │
│         • deeplens_processed = FALSE                           │
│                                                                  │
│  2. DeepLens Integration Service (Every 10 seconds)            │
│     ├─→ Step 1: Assign Group IDs                              │
│     │   ├─→ Find messages with group_id = NULL                │
│     │   ├─→ Group by chat (jid)                               │
│     │   └─→ Assign group_id based on time window              │
│     │       • Same chat + within 5 min = same group           │
│     │       • New group format: {jid}_{timestamp}             │
│     │                                                          │
│     └─→ Step 2: Process messages for DeepLens                   │
│         ├─→ Find images with deeplens_processed = FALSE       │
│         ├─→ Create DeepLens image event                       │
│         ├─→ Send to Kafka topic: WhatsApp.newproduct.received    │
│         └─→ Mark as processed (deeplens_processed = TRUE)     │
│                                                                  │
│  3. DeepLens Receives Image                                    │
│     └─→ Processes image through ML pipeline                    │
│         • Feature extraction                                    │
│         • Vector indexing                                       │
│         • Searchable in DeepLens                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# DeepLens Integration
DEEPLENS_TOPIC=WhatsApp.newproduct.received           # Kafka topic for DeepLens
DEEPLENS_PROCESSING_INTERVAL_MS=10000             # Processing interval (10 seconds)
DEEPLENS_BATCH_SIZE=20                            # Max images per batch
MESSAGE_GROUPING_WINDOW_MS=300000                 # Grouping time window (5 minutes)
TENANT_ID=whatsapp-tenant                         # Tenant ID for DeepLens
```

### Configuration Options

| Variable                          | Default                        | Description                            |
| --------------------------------- | ------------------------------ | -------------------------------------- |
| `DEEPLENS_TOPIC`                  | `WhatsApp.newproduct.received` | Kafka topic to send images to          |
| `DEEPLENS_PROCESSING_INTERVAL_MS` | `10000`                        | How often to check for new images (ms) |
| `DEEPLENS_BATCH_SIZE`             | `20`                           | Maximum images to process per batch    |
| `MESSAGE_GROUPING_WINDOW_MS`      | `300000`                       | Time window for grouping messages (ms) |
| `TENANT_ID`                       | `whatsapp-tenant`              | Tenant identifier for DeepLens         |

---

## Database Schema

### New Columns Added to `messages` Table

```sql
-- Message grouping
group_id VARCHAR(255)                    -- Format: {jid}_{timestamp}

-- DeepLens processing tracking
deeplens_processed BOOLEAN DEFAULT FALSE -- Has image been sent to DeepLens?
deeplens_sent_at TIMESTAMP               -- When was it sent?
```

### Indexes

```sql
-- Efficient group ID queries
CREATE INDEX idx_messages_group_id ON messages(group_id);
CREATE INDEX idx_messages_grouping_query ON messages(jid, timestamp) 
WHERE group_id IS NULL;

-- Efficient DeepLens queries
CREATE INDEX idx_messages_deeplens_processed ON messages(deeplens_processed) 
WHERE media_type IN ('image', 'sticker');

CREATE INDEX idx_messages_deeplens_query 
ON messages(media_type, deeplens_processed, timestamp) 
WHERE media_type IN ('image', 'sticker');
```

---

## Message Grouping Logic

### How Group IDs Are Assigned

1. **Query ungrouped messages** (where `group_id IS NULL`)
2. **Group by chat** (same `jid`)
3. **For each chat**:
   - Find the most recent existing group
   - Check time difference between last message in group and new message
   - **If within time window** (5 minutes): Add to existing group
   - **If outside time window**: Create new group with ID `{jid}_{timestamp}`

### Example

```
Chat: 1234567890@s.whatsapp.net

Message 1 (10:00:00) → group_id = "1234567890@s.whatsapp.net_1705234800000"
Message 2 (10:02:00) → group_id = "1234567890@s.whatsapp.net_1705234800000" (same group)
Message 3 (10:04:00) → group_id = "1234567890@s.whatsapp.net_1705234800000" (same group)
Message 4 (10:10:00) → group_id = "1234567890@s.whatsapp.net_1705235400000" (new group - 10 min gap)
```

---

## Image Processing Flow

### Detection

The service automatically detects images by querying:

```sql
SELECT * FROM messages
WHERE media_type IN ('image', 'sticker')
  AND media_url IS NOT NULL
  AND deeplens_processed = FALSE
ORDER BY timestamp ASC
LIMIT 20
```

### DeepLens Event Format

```json
{
  "imageId": "wa_msg_abc123",
  "tenantId": "whatsapp-tenant",
  "fileName": "image.jpg",
  "storagePath": "minio://whatsapp-data/media/image.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 0,
  "uploadedAt": "2026-01-14T10:30:00Z",
  "metadata": {
    "source": "whatsapp",
    "chatJid": "1234567890@s.whatsapp.net",
    "messageId": "msg_abc123",
    "sender": "John Doe",
    "timestamp": 1705234567000,
    "groupId": "1234567890@s.whatsapp.net_1705234800000"
  }
}
```

### Kafka Publishing

- **Topic**: `WhatsApp.newproduct.received`
- **Partition Key**: `message.jid` (ensures ordering per chat)
- **Value**: JSON-serialized DeepLens event

---

## API Usage

### Manual Operations

The service provides methods for manual triggering:

```typescript
import { deepLensIntegration } from './services/deeplens-integration.service';

// Manually assign group IDs for a specific chat
await deepLensIntegration.assignGroupIdsForChatManual('1234567890@s.whatsapp.net');

// Manually process a specific image
await deepLensIntegration.processImageManual('msg_abc123');
```

---

## Monitoring

### Logs

The service logs important events:

```
[INFO] DeepLens integration service started
[DEBUG] Found 15 messages needing group assignment
[DEBUG] Created new message group: 1234567890@s.whatsapp.net_1705234800000
[INFO] Assigned group IDs to 15 messages
[DEBUG] Found 8 images to send to DeepLens
[DEBUG] Sent image to DeepLens: msg_abc123
[INFO] Sent 8 images to DeepLens
```

### Database Queries

**Check ungrouped messages**:
```sql
SELECT COUNT(*) FROM messages WHERE group_id IS NULL;
```

**Check unprocessed images**:
```sql
SELECT COUNT(*) FROM messages 
WHERE media_type IN ('image', 'sticker') 
  AND deeplens_processed = FALSE;
```

**View recent groups**:
```sql
SELECT group_id, COUNT(*) as message_count, MIN(timestamp) as first_msg, MAX(timestamp) as last_msg
FROM messages
WHERE group_id IS NOT NULL
GROUP BY group_id
ORDER BY MAX(timestamp) DESC
LIMIT 10;
```

---

## Performance Considerations

### Batch Processing

- Processes up to 20 images per interval (configurable)
- Prevents overwhelming DeepLens with too many images at once
- Maintains message ordering per chat via partition keys

### Interval Tuning

**Default: 10 seconds**
- Good balance between responsiveness and resource usage
- Adjust based on your message volume:
  - **High volume**: Decrease to 5 seconds
  - **Low volume**: Increase to 30 seconds

### Time Window Tuning

**Default: 5 minutes**
- Appropriate for most conversation patterns
- Adjust based on your use case:
  - **Quick exchanges**: Decrease to 2 minutes
  - **Slow conversations**: Increase to 10 minutes

---

## Troubleshooting

### Images Not Being Processed

1. **Check service is running**:
   ```
   # Look for this in logs:
   [INFO] DeepLens integration service started
   ```

2. **Check database**:
   ```sql
   SELECT * FROM messages 
   WHERE media_type = 'image' 
     AND deeplens_processed = FALSE 
   LIMIT 10;
   ```

3. **Check Kafka connection**:
   ```
   # Look for errors in logs:
   [ERROR] Failed to send image to DeepLens
   ```

### Group IDs Not Being Assigned

1. **Check for ungrouped messages**:
   ```sql
   SELECT COUNT(*) FROM messages WHERE group_id IS NULL;
   ```

2. **Check service logs**:
   ```
   [DEBUG] Found X messages needing group assignment
   ```

3. **Manually trigger for a chat**:
   ```typescript
   await deepLensIntegration.assignGroupIdsForChatManual('chat_jid');
   ```

---

## Migration

### Running the Migration

The migration runs automatically on application startup. To run manually:

```bash
# Connect to PostgreSQL
psql -U postgres -d whatsapp_vayyari_data

# Run migration
\i scripts/ddl/008_deeplens_integration.sql
```

### Backfilling Existing Data

**Assign group IDs to existing messages**:
```sql
-- This will be done automatically by the service
-- Or trigger manually via API
```

**Mark old images as processed** (if you don't want to reprocess them):
```sql
UPDATE messages 
SET deeplens_processed = TRUE 
WHERE media_type IN ('image', 'sticker') 
  AND timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days') * 1000;
```

---

## Integration with DeepLens

### DeepLens Side

DeepLens should have a consumer listening to `WhatsApp.newproduct.received` topic:

```csharp
// In DeepLens WorkerService
consumer.Subscribe("WhatsApp.newproduct.received");

await consumer.Run(async (message) => {
    var imageEvent = JsonSerializer.Deserialize<ImageUploadedEvent>(message.Value);
    
    // Download image from WhatsApp storage
    var imageData = await DownloadImage(imageEvent.StoragePath);
    
    // Process through DeepLens pipeline
    await ProcessImage(imageData, imageEvent.Metadata);
});
```

### Metadata Usage

The `metadata` field contains WhatsApp-specific information:

```json
{
  "source": "whatsapp",
  "chatJid": "1234567890@s.whatsapp.net",
  "messageId": "msg_abc123",
  "sender": "John Doe",
  "timestamp": 1705234567000,
  "groupId": "1234567890@s.whatsapp.net_1705234800000"
}
```

This allows DeepLens to:
- Tag images with WhatsApp source
- Link back to original message
- Group images by conversation
- Track sender information

---

## Future Enhancements

- [ ] Support for video processing
- [ ] Configurable grouping strategies (by sender, by topic, etc.)
- [ ] Real-time processing (trigger on message arrival instead of polling)
- [ ] DeepLens processing status feedback
- [ ] Image similarity detection within groups
- [ ] Automatic tagging based on chat context

---

## Related Documentation

- [KAFKA_TOPICS.md](../../docs/KAFKA_TOPICS.md) - Kafka topics reference
- [SERVICES.md](../../docs/SERVICES.md) - Service architecture
- [DEVELOPMENT.md](../../DEVELOPMENT.md) - Development guide

---

**Last Updated**: 2026-01-14  
**Maintained By**: DeepLens Team

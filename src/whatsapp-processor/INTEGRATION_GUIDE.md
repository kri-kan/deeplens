# Message Processing Queue - Integration Guide

## ⚠️ INTEGRATION STATUS: NOT YET INTEGRATED

The queue system is created but needs to be integrated into your application.

---

## 📋 Integration Steps

### Step 1: Run Database Migration

**Option A: Using psql directly**
```bash
psql -h localhost -U whatsapp_user -d whatsapp_db -f migrations/007_add_message_processing_status.sql
```

**Option B: Using Podman/Docker**
```bash
# Copy migration file to container
podman cp migrations/007_add_message_processing_status.sql whatsapp-db:/tmp/

# Execute migration
podman exec -it whatsapp-db psql -U whatsapp_user -d whatsapp_db -f /tmp/007_add_message_processing_status.sql
```

**Option C: Manual SQL**
Copy and paste the contents of `migrations/007_add_message_processing_status.sql` into your database client.

---

### Step 2: Initialize Queue on Startup

**Edit `src/index.ts` or `src/server.ts`:**

```typescript
import { initializeMessageQueue, shutdownMessageQueue } from './init-message-queue';

// After your app starts
async function startServer() {
    // ... existing startup code ...
    
    // Initialize message queue
    await initializeMessageQueue();
    
    // ... rest of startup ...
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    shutdownMessageQueue();
    // ... other cleanup ...
});

process.on('SIGINT', () => {
    shutdownMessageQueue();
    // ... other cleanup ...
});
```

---

### Step 3: Integrate into WhatsApp Message Handler

**Edit `src/services/whatsapp.service.ts`:**

Find the `processMessage` or `handleMessage` function and add:

```typescript
import { messageQueue } from './message-queue.service';

async function processMessage(msg: WAMessage) {
    // ... existing message processing ...
    
    // Save message to database
    const messageId = await saveMessageToDb(msg);
    
    // Mark as pending for processing
    await messageQueue.markMessagePending(messageId);
    
    // If message has media, download it
    if (hasMedia(msg)) {
        downloadMedia(msg).then(async (mediaUrl) => {
            // Update database with media URL
            await updateMessageMedia(messageId, mediaUrl);
            
            // Mark as ready for processing
            await messageQueue.markMessageReady(messageId);
        }).catch(err => {
            logger.error({ err, messageId }, 'Media download failed');
            // Still mark as ready (will process without media)
            messageQueue.markMessageReady(messageId);
        });
    } else {
        // No media - ready immediately
        await messageQueue.markMessageReady(messageId);
    }
}
```

---

### Step 4: Add Your Processing Logic

**Edit `src/init-message-queue.ts`:**

Replace the TODO comment with your actual processing:

```typescript
messageQueue.on('message:ready', async (message) => {
    // Your custom logic here
    if (message.message_text) {
        await analyzeText(message.message_text);
    }
    
    if (message.media_url) {
        switch (message.media_type) {
            case 'photo':
                await processImage(message.media_url);
                break;
            case 'video':
                await processVideo(message.media_url);
                break;
            // ... etc
        }
    }
});
```

---

## 🔍 Verification

After integration, check that it's working:

### 1. Check Logs
```
[INFO] Message processing queue initialized successfully
[INFO] No stuck messages found - clean startup
[INFO] Message processing queue started
```

### 2. Send a Test Message
Send a message to WhatsApp and check logs:
```
[DEBUG] Message marked as pending processing
[DEBUG] Message marked as ready for processing
[INFO] Processing message: { messageId: '...', hasMedia: true }
[DEBUG] Message processed successfully
```

### 3. Check Database
```sql
SELECT 
    processing_status, 
    COUNT(*) 
FROM messages 
GROUP BY processing_status;
```

Expected output:
```
processing_status | count
------------------+-------
processed         | 1234
pending           | 5
ready             | 2
```

### 4. Get Statistics
```typescript
import { messageQueue } from './services/message-queue.service';

const stats = await messageQueue.getStats();
console.log(stats);
// { pending: 5, ready: 2, processing: 0, processed: 1234, failed: 0 }
```

---

## 🚨 Troubleshooting

### Queue Not Starting
- Check database connection
- Verify migration ran successfully
- Check for errors in logs

### Messages Not Processing
- Verify `markMessagePending()` is called after saving
- Verify `markMessageReady()` is called after media download
- Check `processing_status` in database

### Messages Stuck in 'processing'
- Restart the service (auto-recovery will kick in)
- Check for errors in processing logic
- Verify retry count hasn't exceeded limit (3)

---

## 📊 Monitoring

### Get Real-time Stats
```typescript
setInterval(async () => {
    const stats = await messageQueue.getStats();
    logger.info(stats, 'Queue statistics');
}, 60000); // Every minute
```

### Query Stuck Messages
```sql
SELECT message_id, jid, processing_status, processing_retry_count, processing_last_attempt
FROM messages
WHERE processing_status IN ('pending', 'ready', 'processing')
ORDER BY timestamp DESC
LIMIT 20;
```

### Reprocess Failed Messages
```typescript
import { messageQueue } from './services/message-queue.service';

// Reprocess a specific message
await messageQueue.triggerProcessing('message_id_here');
```

---

## ✅ Integration Checklist

- [ ] Database migration executed
- [ ] Queue initialized in startup code
- [ ] `markMessagePending()` called after message save
- [ ] `markMessageReady()` called after media download
- [ ] Custom processing logic implemented
- [ ] Graceful shutdown handlers added
- [ ] Logs showing queue activity
- [ ] Test message processed successfully
- [ ] Statistics endpoint working

---

## 🎯 Next Steps

Once integrated, you can:
1. Add custom processing logic for your use case
2. Set up monitoring dashboards
3. Add webhooks for processed messages
4. Implement advanced analytics
5. Create processing pipelines

---

## 📞 Need Help?

If you encounter issues during integration, check:
1. Application logs
2. Database connection
3. Migration status
4. Processing status in database

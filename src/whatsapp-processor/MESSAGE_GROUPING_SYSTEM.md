# Message Grouping System - Complete Guide ✅

## Overview
Comprehensive message grouping system with automatic grouping strategies, manual corrections, and per-conversation controls using Kafka for reliable, sequential processing.

---

## 🏗️ Architecture

### 1. Database Schema
- **`chats` Table**:
  - `enable_message_grouping` (BOOLEAN): Master toggle per conversation.
  - `grouping_config` (JSONB): Stores rules (strategy, thresholds).
- **`messages` Table**:
  - `group_id` (UUID): The assigned group identifier with semantic prefixes.
  - `processing_status`: Kafka queue status (pending, ready, queued, processing, processed, failed).

### 2. Grouping Strategies
- **Sticker Separator**:
  - A sticker message acts as a "break" between groups.
  - Messages before and after a sticker get different Group IDs.
  - Useful for: Product photos separated by a sticker.
- **Time Gap**:
  - If the time difference between consecutive messages > threshold, start a new group.
  - Default threshold: 300 seconds (5 minutes).
  - Useful for: distinct sessions of messages.

### 3. Semantic Group ID Prefixes
- `product_` - For image/video/photo messages (product catalogs)
- `sticker_` - For sticker messages
- `chat_` - For text messages and other types

### 4. Kafka-Based Processing
- Messages are processed sequentially per chat JID
- Prevents race conditions in grouping logic
- Reliable retry and error handling
- Rate-limited to prevent WhatsApp API throttling

### 5. Workflow
1. **Enable Grouping**:
   - Admin goes to Conversation Detail Page.
   - Clicks "Not Grouping" badge.
   - Configures strategy (Sticker or Time Gap).
   - Saved to DB.
2. **Processing**:
   - Message saved with `processing_status='pending'`
   - After media download: status → 'ready'
   - Kafka producer polls and sends to topic → status → 'queued'
   - Kafka consumer processes (applies grouping) → status → 'processed'
   - Grouping logic:
     - IF (Strategy == Sticker) AND (Prev or Current is Sticker) → **New Group**.
     - IF (Strategy == Time Gap) AND (Time Diff > Threshold) → **New Group**.
     - ELSE → **Join Previous Group**.

---

## 🛠️ Components

### Backend
- **DDL Scripts**: `001_chats.sql`, `002_messages.sql`
- **API**: 
  - `POST /:jid/message-grouping` - Toggle and configure grouping
  - `POST /:jid/messages/:messageId/split-group` - Split group at message
  - `POST /:jid/messages/:messageId/move-group` - Move message between groups
- **Queue**: `src/services/message-queue.service.ts` - Kafka-based processing
- **Logic**: `src/init-message-queue.ts` - Grouping algorithm

### Frontend
- **Conversation Service**: `toggleMessageGrouping` with config support
- **UI**: Configuration Dialog in `ConversationDetailPage.tsx`
  - Dropdown for Strategy
  - Input for Time Threshold
  - Preview of last N messages with grouping
- **Message List**: Visual group dividers and manual correction controls

---

## 🚀 Usage Guide

### 1. Enable & Configure Grouping
1. Navigate to **Admin > Conversations > [Chat]**.
2. Click the **"✗ Not Grouping"** badge.
3. Select **Grouping Strategy**:
   - *Sticker Separator*: Product shots → Sticker → Product shots.
   - *Time Gap*: 5 mins silence → New Group.
4. Adjust time threshold if using Time Gap (default: 300s).
5. Preview grouping with last 10/25/50/100 messages.
6. Click **"Enable Grouping"**.

### 2. Manual Corrections

#### Split Group
- **What it does**: Starts a new group from the selected message.
- **Use Case**: Two distinct products were grouped together by mistake.
- **Action**: Hover over the message where the new group should start, click **Split Group**.
- **Result**: The selected message and all subsequent messages in the same group get a new Group ID.

#### Boundary Correction (Move Group)
- **What it does**: Moves a message to the Previous or Next group.
- **Use Case**: A photo belonging to Product A was captured in interval of Product B.
- **Action**: Hover over the message, click **< Prev** or **Next >**.
- **Result**: The message joins the adjacent group.

### 3. Disable Grouping
1. Click **"✓ Grouping"** → Disables grouping.
2. Messages from this conversation will be skipped by the queue.

### 4. Verify Grouping
- Send messages matching the criteria.
- Check database:
  ```sql
  SELECT group_id, message_type, media_type, timestamp, processing_status
  FROM messages 
  WHERE jid = '...' 
  ORDER BY timestamp DESC;
  ```
- Verify `group_id` changes correctly based on stickers or time gaps.

---

## 📊 Rate Limiting & Safety

To prevent WhatsApp API throttling and account blocking:

### Default Settings (Conservative)
- **Poll Interval**: 5 seconds between batch checks
- **Batch Size**: 10 messages per batch
- **Message Delay**: 500ms between processing each message
- **Max Throughput**: ~120 messages/minute

### Environment Variables
```bash
KAFKA_POLL_INTERVAL_MS=5000    # How often to check for new messages
KAFKA_BATCH_SIZE=10             # Max messages per batch
KAFKA_MESSAGE_DELAY_MS=500      # Delay between each message
```

### Duplicate Prevention
- System checks if media already exists before downloading
- Prevents re-downloading same files (saves bandwidth, reduces throttling)

---

## 🧪 Testing Checklist
- [x] Database columns added
- [x] Kafka integration complete
- [x] API accepts config
- [x] Frontend shows config dialog with preview
- [x] Queue implements Sticker strategy
- [x] Queue implements Time Gap strategy
- [x] Manual split/move corrections work
- [x] Rate limiting prevents throttling
- [x] Duplicate media downloads prevented
- [x] Semantic prefixes applied
- [x] Logs output grouping decisions

---

## 📁 Database Examples

### Get all conversations with grouping enabled:
```sql
SELECT jid, name, enable_message_grouping, grouping_config
FROM chats 
WHERE enable_message_grouping = true;
```

### Enable grouping for a specific conversation:
```sql
UPDATE chats 
SET enable_message_grouping = true,
    grouping_config = '{"strategy": "time_gap", "time_gap_seconds": 300}'::jsonb
WHERE jid = '1234567890@s.whatsapp.net';
```

### Count messages by group:
```sql
SELECT group_id, COUNT(*) as message_count, MIN(timestamp) as first_msg, MAX(timestamp) as last_msg
FROM messages
WHERE jid = '...'
GROUP BY group_id
ORDER BY first_msg DESC;
```

### Check processing status:
```sql
SELECT processing_status, COUNT(*) 
FROM messages 
GROUP BY processing_status;
```

---

## 🎯 Ready for Production! 🚀

The complete message grouping system is production-ready with:
- ✅ Automatic grouping strategies
- ✅ Manual correction tools
- ✅ Kafka-based reliable processing
- ✅ Rate limiting for safety
- ✅ Duplicate prevention
- ✅ Comprehensive UI controls

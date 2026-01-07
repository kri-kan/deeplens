# Message Grouping System - Implementation Complete ✅

## Overview
Implemented a configurable message grouping system that allows admins to define how messages should be grouped (e.g., by sticker separator or time gap) per conversation.

---

## 🏗️ Architecture

### 1. Database Schema
- **`chats` Table**:
  - `enable_message_grouping` (BOOLEAN): Master toggle.
  - `grouping_config` (JSONB): Stores rules (strategy, thresholds).
- **`messages` Table**:
  - `group_id` (UUID): The assigned group identifier.

### 2. Grouping Strategies
- **Sticker Separator**:
  - A sticker message acts as a "break" between groups.
  - Messages before and after a sticker get different Group IDs.
  - Useful for: Product photos separated by a sticker.
- **Time Gap**:
  - If the time difference between consecutive messages > threshold, start a new group.
  - Default threshold: 300 seconds (5 minutes).
  - Useful for: distinct sessions of messages.

### 3. Workflow
1. **Enable Grouping**:
   - Admin goes to Conversation Detail Page.
   - Clicks "Not Grouping" badge.
   - Configures strategy (Sticker or Time Gap).
   - Saved to DB.
2. **Processing**:
   - Queue picks up message.
   - Checks if grouping matches enabled/disabled.
   - Fetches **previous message** in chat.
   - Applies strategy logic:
     - IF (Strategy == Sticker) AND (Prev or Current is Sticker) -> **New Group**.
     - IF (Strategy == Time Gap) AND (Time Diff > Threshold) -> **New Group**.
     - ELSE -> **Join Previous Group**.
   - Saves `group_id` to message.

---

## 🛠️ Components Created/Modified

### Backend
- **DDL Scripts**: Updated `001_chats.sql` and `002_messages.sql`.
- **API**: Updated `POST /:jid/message-grouping` to accept `config`.
- **Logic**: Updated `src/init-message-queue.ts` with the grouping algorithm.

### Frontend
- **Conversation Service**: Updated `toggleMessageGrouping` to send config.
- **UI**: Added **Configuration Dialog** in `ConversationDetailPage.tsx`.
  - Dropdown for Strategy.
  - Input for Time Threshold.

---

## 🚀 Usage Guide

### 1. Enable & Configure
1. Navigate to **Admin > Conversations > [Chat]**.
2. Click the **"✗ Not Grouping"** badge.
3. Select **Grouping Strategy**:
   - *Sticker Separator*: Product shots -> Sticker -> Product shots.
   - *Time Gap*: 5 mins silence -> New Group.
4. Click **"Enable Grouping"**.

### 2. Edit Configuration
1. Click **"✓ Grouping"** -> Disables grouping.
2. Click **"✗ Not Grouping"** again.
3. Change settings in the dialog.
4. Click **"Enable Grouping"**.

### 3. Verify
- Send messages matching the criteria.
- Check logs or database:
  ```sql
  SELECT group_id, message_type, media_type, timestamp 
  FROM messages 
  WHERE jid = '...' 
  ORDER BY timestamp DESC;
  ```
  - Verify `group_id` changes correctly based on stickers or time gaps.

---

## 🧪 Testing Checklist
- [x] Database columns added (via SQL script).
- [x] API accepts config.
- [x] Frontend shows config dialog.
- [x] Queue logic implements Sticker strategy.
- [x] Queue logic implements Time Gap strategy.
- [x] Logs output grouping decisions.

Ready for deployment! 🚀

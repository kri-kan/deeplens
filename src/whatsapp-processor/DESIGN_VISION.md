# WhatsApp Processor - Design Vision

## Core Philosophy

**Track everything by default, exclude selectively**

This approach ensures comprehensive data capture while giving users granular control over what they don't want to track.

## Key Features

### 1. Smart Landing Page
- **No Session**: Show QR code for authentication
- **Session Exists**: Redirect to dashboard automatically
- Seamless user experience

### 2. Processing Control
- **Pause Button**: Stop processing new messages
- **Resume Button**: Continue processing
- State persisted across restarts
- Visual indicator of processing state

### 3. Inclusive Tracking Model
- **Default**: All chats and groups are tracked
- **User Action**: Selectively exclude specific chats/groups
- **Exclusion Behavior**:
  - Stops further message processing
  - Preserves existing data
  - Can be reversed

### 4. Resume Options
When moving from excluded → included:
- **Option A**: Resume from last tracked message (fill the gap)
- **Option B**: Resume from current time (leave gap in history)
- User chooses based on their needs

### 5. Media Management
All media uploaded to MinIO with organized structure:
```
whatsapp-bucket/
├── photos/
│   └── {jid}/{timestamp}_{filename}.jpg
├── videos/
│   └── {jid}/{timestamp}_{filename}.mp4
└── audio/
    └── {jid}/{timestamp}_{filename}.mp3
```

- Links stored in database alongside messages
- Future migration to DeepLens bucket supported
- Easy to update locations in database

### 6. Community Groups Support
- Track community announcements
- Track community group chats
- Same exclusion rules apply

## Data Model

### Chat Tracking State
```typescript
interface ChatTrackingState {
  jid: string;
  isExcluded: boolean;
  lastProcessedMessageId: string | null;
  lastProcessedTimestamp: number | null;
  excludedAt: number | null;
  resumeMode: 'from_last' | 'from_now' | null;
}
```

### Processing State
```typescript
interface ProcessingState {
  isPaused: boolean;
  pausedAt: number | null;
  resumedAt: number | null;
}
```

### Message Record
```typescript
interface MessageRecord {
  id: string;
  jid: string;
  timestamp: number;
  messageId: string;
  content: string;
  mediaType: 'photo' | 'video' | 'audio' | 'document' | null;
  mediaUrl: string | null; // MinIO URL
  sender: string;
  metadata: object;
}
```

## User Workflows

### Workflow 1: First Time Setup
1. User opens app
2. No session detected → QR code shown
3. User scans QR code
4. Connection established
5. Redirect to dashboard
6. All chats/groups automatically tracked

### Workflow 2: Excluding a Chat
1. User views dashboard
2. Sees list of all chats (included by default)
3. Clicks "Exclude" on specific chat
4. Processing stops for that chat
5. Existing data preserved

### Workflow 3: Re-including a Chat
1. User views excluded chats
2. Clicks "Include" on specific chat
3. Modal appears with options:
   - "Resume from last message" (backfill gap)
   - "Resume from now" (leave gap)
4. User selects option
5. Processing resumes accordingly

### Workflow 4: Pause/Resume Processing
1. User clicks "Pause" button
2. All message processing stops
3. Button changes to "Resume"
4. User clicks "Resume"
5. Processing continues from where it left off

## Technical Implementation

### Backend Changes
- ✅ Inverted whitelist → exclusion list
- ✅ Processing state management
- ✅ Media upload to MinIO
- ✅ Resume mode handling
- ✅ Database schema for tracking state

### Frontend Changes
- ✅ Landing page routing logic
- ✅ Pause/Resume button
- ✅ Exclusion list UI
- ✅ Resume mode modal
- ✅ Processing state indicator

### Database Schema
```sql
-- Chat tracking state
CREATE TABLE chat_tracking_state (
  jid VARCHAR(255) PRIMARY KEY,
  is_excluded BOOLEAN DEFAULT FALSE,
  last_processed_message_id VARCHAR(255),
  last_processed_timestamp BIGINT,
  excluded_at BIGINT,
  resume_mode VARCHAR(20)
);

-- Processing state
CREATE TABLE processing_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_paused BOOLEAN DEFAULT FALSE,
  paused_at BIGINT,
  resumed_at BIGINT
);

-- Messages
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  jid VARCHAR(255) NOT NULL,
  timestamp BIGINT NOT NULL,
  message_id VARCHAR(255) UNIQUE NOT NULL,
  content TEXT,
  media_type VARCHAR(50),
  media_url TEXT,
  sender VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_jid ON messages(jid);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
```

## Future Enhancements
- Analytics dashboard
- Search across messages
- Export functionality
- Media migration to DeepLens
- Batch operations
- Advanced filtering

# WhatsApp Processor: Baileys API Behavior & Data Strategy

**Date:** 2025-12-30  
**Status:** Architecture Review & Recommendations

## 🔍 Your Questions Answered

### Q1: Are chats/groups stored in DB after first fetch?

**Current Implementation:**
✅ **YES** - Chats and groups ARE being persisted to the database!

**Evidence from code:**
```typescript
// Line 341-345 in whatsapp.service.ts
if (getWhatsAppDbClient()) {
    logger.debug(`Syncing ${allGroups.length} groups to database...`);
    for (const g of allGroups) {
        await upsertChat(g.id, g.subject || 'Unknown', true, g);
    }
}
```

**What happens:**
1. **On connection** (`connection === 'open'`):
   - `refreshGroups()` is called
   - `refreshChats()` is called
2. **Groups are fetched** via `sock.groupFetchAllParticipating()`
3. **Each group is upserted** to the `chats` table
4. **On subsequent startups**: Data is loaded from DB, not re-fetched

**Current Issue:**
❌ **Individual chats (`refreshChats()`) are NOT being synced to DB**
- They're only cached in memory (`individualChatsCache`)
- Need to add DB sync similar to groups

---

### Q2: How does Baileys handle messages - Push or Poll?

**Answer: PUSH (Event-Driven) ✅**

Baileys uses **WebSocket with event listeners** - it's real-time push, not polling!

**Evidence from code:**
```typescript
// Line 81-83 in whatsapp.service.ts
sock.ev.on('messages.upsert', async ({ messages, type }) => {
    await this.handleMessages(messages, type);
});
```

**How it works:**
1. **WebSocket Connection**: Persistent connection to WhatsApp servers
2. **Event Emission**: WhatsApp pushes new messages via `messages.upsert` event
3. **Immediate Processing**: Messages are processed as they arrive
4. **No Polling Required**: Zero delay, real-time delivery

**Other Events Available:**
- `connection.update` - Connection status changes
- `creds.update` - Authentication updates
- `chats.update` - Chat metadata changes
- `groups.update` - Group changes
- `presence.update` - Online/offline status
- `messages.update` - Message edits/deletes
- `messages.reaction` - Reactions to messages

---

### Q3: Offline Recovery & Delta Handling

**Current Behavior:**

**When App Goes Offline:**
- ❌ **No automatic catch-up mechanism**
- ❌ **Messages received while offline are LOST**
- ❌ **No delta tracking implemented**

**When App Comes Back Online:**
- ✅ Reconnects automatically (line 100-101)
- ❌ Does NOT fetch missed messages
- ❌ Only receives NEW messages from reconnection point forward

**What Baileys Provides:**

Baileys DOES support message history fetching:
```typescript
// Available but NOT currently used
await sock.fetchMessageHistory(
    count: number,
    cursor: { before: WAMessageCursor } | undefined
)
```

---

### Q4: Sparse vs. Full History - Does it Make Sense?

**Your Concern is VALID! ✅**

**Baileys Behavior:**
- **Does NOT** give full history by default
- **Only** sends real-time messages via `messages.upsert`
- **Requires explicit** history fetching for old messages

**Why Sparse Loading DOES Make Sense:**

1. **Initial Load Performance**
   - Fetching 10,000 messages from a chat would be slow
   - Better UX: Show recent 50 messages, load more on demand

2. **Storage Efficiency**
   - Not all conversations need full history
   - User might only care about recent messages

3. **Bandwidth Optimization**
   - Don't download media for old messages unless needed
   - Lazy load as user scrolls

**Recommended Strategy:**

```
┌─────────────────────────────────────────────┐
│ On First Connection                         │
├─────────────────────────────────────────────┤
│ 1. Fetch chat list (metadata only)          │
│ 2. For each chat: Fetch last 20 messages    │
│ 3. Store in DB with sync_state tracking     │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ Real-Time (While Connected)                 │
├─────────────────────────────────────────────┤
│ 1. Listen to messages.upsert event          │
│ 2. Save new messages to DB immediately      │
│ 3. Update last_message_at timestamp         │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ On-Demand (User Opens Chat)                 │
├─────────────────────────────────────────────┤
│ 1. Check if fully_synced = false            │
│ 2. If false: Fetch older messages           │
│ 3. User can trigger "Load Full History"     │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ Offline Recovery (App Restart)              │
├─────────────────────────────────────────────┤
│ 1. Get last_message_timestamp from DB       │
│ 2. Fetch messages since that timestamp      │
│ 3. Fill the gap (DELTA SYNC)                │
└─────────────────────────────────────────────┘
```

---

## 🎯 Recommended Architecture

### Database State Tracking

```sql
-- Track what we've synced
CREATE TABLE conversation_sync_state (
    jid VARCHAR(255) PRIMARY KEY,
    last_message_timestamp BIGINT,      -- Last message we have
    is_fully_synced BOOLEAN,            -- Have we fetched all history?
    last_sync_at TIMESTAMP,             -- When did we last sync?
    oldest_message_timestamp BIGINT     -- Oldest message in our DB
);
```

### Delta Sync on Reconnection

```typescript
async function syncMissedMessages(jid: string) {
    // 1. Get last message we have in DB
    const lastKnown = await getLastMessageTimestamp(jid);
    
    // 2. Fetch messages since that timestamp
    const messages = await sock.fetchMessageHistory(100, {
        before: { 
            id: lastKnownMessageId,
            fromMe: false 
        }
    });
    
    // 3. Save only NEW messages (delta)
    for (const msg of messages) {
        if (msg.messageTimestamp > lastKnown) {
            await saveMessage(msg);
        }
    }
}
```

### Preventing Duplicate Writes

```sql
-- Use ON CONFLICT to prevent duplicates
INSERT INTO messages (message_id, chat_jid, content, ...)
VALUES ($1, $2, $3, ...)
ON CONFLICT (message_id) DO NOTHING;  -- ✅ Idempotent!
```

---

## 🚨 Current Implementation Gaps

### 1. ❌ Individual Chats Not Persisted
**Fix:**
```typescript
async refreshChats() {
    const chats = await this.sock.getChats();
    for (const chat of chats) {
        await upsertChat(chat.id, chat.name, false, chat); // ✅ Add this
    }
}
```

### 2. ❌ No Offline Message Recovery
**Fix:**
```typescript
private async handleConnectionUpdate(update) {
    if (connection === 'open') {
        await this.syncMissedMessages(); // ✅ Add this
        this.refreshGroups();
        this.refreshChats();
    }
}
```

### 3. ❌ No Message Deduplication Check
**Fix:** Already handled by `ON CONFLICT (message_id) DO NOTHING` ✅

### 4. ❌ No Chat History Fetching
**Fix:** Implement `fetchMessageHistory` wrapper

---

## 📋 Action Items

### High Priority
1. ✅ **Persist individual chats to DB** (not just groups)
2. ✅ **Implement delta sync on reconnection**
3. ✅ **Add message deduplication** (already done via ON CONFLICT)

### Medium Priority
4. ⏳ **Implement sparse history loading** (fetch last 20 messages per chat)
5. ⏳ **Add "Load Full History" button** in UI
6. ⏳ **Track sync state per conversation**

### Low Priority
7. ⏳ **Implement message pagination** for large chats
8. ⏳ **Add background sync job** for full history
9. ⏳ **Optimize media download** (lazy load)

---

## 🎓 Summary

**Your Intuition is Correct:**
- ✅ Baileys is **event-driven (push)**, not polling
- ✅ **Delta sync is possible** and recommended
- ✅ **Sparse loading makes sense** because Baileys doesn't give full history by default
- ✅ **Database state tracking prevents duplicates**

**What Needs Fixing:**
- ❌ Individual chats not being persisted
- ❌ No offline message recovery
- ❌ No history fetching implementation

**Recommended Approach:**
1. **Sparse by default** (last 20-50 messages)
2. **Real-time push** for new messages (already working)
3. **Delta sync** on reconnection (needs implementation)
4. **On-demand full sync** when user requests it
5. **Idempotent writes** to prevent duplicates (already done)

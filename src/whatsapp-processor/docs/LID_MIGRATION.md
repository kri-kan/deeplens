# Baileys v7 LID-First Migration Plan

## Understanding LID in Baileys v7

### What is LID?
- **LID** (Linked Device ID) is now the primary identifier in WhatsApp multi-device
- Replaces the old phone number-based JID system
- Format: `<number>@lid` (e.g., `123456789@lid`)
- More privacy-focused and multi-device friendly

### Key Changes in v7:
1. **`msg.key.remoteJid`** - Still exists but may be a LID
2. **`msg.key.participant`** - In groups, this is the sender's LID
3. **LID Mapping** - Baileys provides `lid-mapping.update` event to map LIDs to phone numbers

## Current Issues in Our Code:

### 1. We're using `remoteJid` everywhere
```typescript
const remoteJid = msg.key.remoteJid!;  // ❌ May be LID, not phone number
```

### 2. We're not handling LID mapping
- No listener for `lid-mapping.update` event
- Not storing LID → Phone number mappings

### 3. Database schema doesn't distinguish LIDs
- `jid` column treats all identifiers the same
- No separate LID tracking

## Recommended Changes:

### 1. Add LID Mapping Table
```sql
CREATE TABLE IF NOT EXISTS lid_mappings (
    lid VARCHAR(255) PRIMARY KEY,
    phone_jid VARCHAR(255),
    last_updated TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

### 2. Listen to `lid-mapping.update` Event
```typescript
sock.ev.on('lid-mapping.update', async (mapping) => {
    // Store LID → Phone mappings
});
```

### 3. Update Message Processing
```typescript
// Get the actual sender identifier (LID-first)
const senderJid = msg.key.participant || msg.key.remoteJid!;
const chatJid = msg.key.remoteJid!;

// Resolve LID to phone number if needed
const resolvedSender = await resolveLidToPhone(senderJid);
```

### 4. Update Chat Identification
- Use LID as primary key
- Store phone number as metadata
- Allow querying by either LID or phone

## Questions to Answer:

1. **Do we want to support both LID and phone number queries?**
   - Yes, for backward compatibility

2. **Should we migrate existing data?**
   - Not needed since we're starting fresh

3. **How to handle contacts without LID mapping?**
   - Fall back to JID, mark as "unresolved"

## Implementation Priority:

1. ✅ **High**: Add `lid-mapping.update` listener
2. ✅ **High**: Create LID mapping table
3. ✅ **Medium**: Update message processing to use LID
4. ✅ **Medium**: Add LID resolution utilities
5. ⚠️ **Low**: UI to show both LID and phone number

## Next Steps:

1. Review Baileys v7 LID documentation
2. Implement LID mapping storage
3. Update message/chat processing
4. Test with real WhatsApp data

# Baileys v7 LID Implementation Summary

## What We Implemented

### 1. **LID-Aware Message Processing**
- ✅ Accept both LID and PN (phone number) as primary identifiers
- ✅ Use `remoteJidAlt` and `participantAlt` for better display
- ✅ Store both primary and alternate IDs in metadata
- ✅ Prefer phone numbers for display when available

### 2. **LID Mapping Event Listener**
```typescript
sock.ev.on('lid-mapping.update', async (mapping) => {
    logger.info({ mapping }, 'Received LID mapping update');
    // Logs LID ↔ PN mappings as they become available
});
```

### 3. **Enhanced Message Metadata**
Every message now stores:
```typescript
metadata: {
    lidInfo: {
        remoteJid,        // Primary ID (LID or PN)
        remoteJidAlt,     // Alternate ID (PN if primary is LID)
        participant,      // Primary sender ID
        participantAlt,   // Alternate sender ID
        displayJid,       // Preferred for display (PN when available)
        displayParticipant // Preferred sender for display
    }
}
```

### 4. **Chat Metadata Enhancement**
Chats now store:
- `alt_jid` - Alternate identifier
- `display_jid` - Preferred identifier for display

## Key Design Decisions

### ✅ What We Did:
1. **Embrace LIDs as primary** - Store whatever WhatsApp gives us (LID or PN)
2. **Use Alt fields for display** - Show phone numbers when available
3. **Store both in metadata** - Keep all information for future use
4. **No forced conversion** - Don't try to convert LIDs to PNs

### ❌ What We Avoided:
1. **No separate LID table** - Our `jid` column works for both
2. **No PN restoration attempts** - LIDs are more reliable per Baileys docs
3. **No complex mapping logic** - Let Baileys handle it

## How It Works

### Message Flow:
1. **Receive message** with `msg.key.remoteJid` (can be LID or PN)
2. **Check for Alt fields** (`remoteJidAlt`, `participantAlt`)
3. **Prefer PN for display** if available via Alt fields
4. **Store primary ID** in database (LID or PN)
5. **Save Alt info** in metadata for reference

### Example:
```typescript
// If user has LID:
remoteJid = "123456789@lid"           // Primary (stored in DB)
remoteJidAlt = "123456789@s.whatsapp.net"  // Alternate (PN)
displayJid = "123456789@s.whatsapp.net"    // Used for display

// If user has PN:
remoteJid = "123456789@s.whatsapp.net"     // Primary (stored in DB)
remoteJidAlt = "123456789@lid"             // Alternate (LID)
displayJid = "123456789@s.whatsapp.net"    // Used for display
```

## Benefits

1. **Future-proof** - Works with WhatsApp's upcoming @username system
2. **Privacy-friendly** - Respects WhatsApp's LID privacy features
3. **Backward compatible** - Still works with phone numbers
4. **Better display** - Shows phone numbers when available
5. **Complete metadata** - All identifier info preserved

## Media Messages

**Yes, `messages.upsert` includes ALL message types:**
- ✅ Text messages
- ✅ Photos (`imageMessage`)
- ✅ Videos (`videoMessage`)
- ✅ Audio (`audioMessage`)
- ✅ Documents (`documentMessage`)
- ✅ Stickers (`stickerMessage`)
- ✅ And more...

Our code already handles all media types in the `processMessage` method.

## Next Steps (Optional)

If needed in the future:
1. Add UI to show both LID and PN
2. Implement LID → PN resolution using `sock.signalRepository.lidMapping`
3. Add database queries to search by either LID or PN
4. Create analytics on LID vs PN usage

## References

- [Baileys v7 Migration Guide](https://baileys.wiki/docs/migration/to-v7.0.0)
- [Baileys LID Documentation](https://baileys.wiki/docs/migration/to-v7.0.0#lids)

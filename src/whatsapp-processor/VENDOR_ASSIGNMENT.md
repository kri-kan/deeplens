# Vendor Assignment Feature

## Overview

The WhatsApp Processor now supports manual vendor assignment for chats, groups, and announcements. This allows you to link WhatsApp conversations to vendors/merchants in DeepLens without requiring a direct foreign key relationship.

---

## Database Schema

### Updated `chats` Table

```sql
ALTER TABLE chats ADD COLUMN IF NOT EXISTS vendor_id VARCHAR(255);
ALTER TABLE chats ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(500);
ALTER TABLE chats ADD COLUMN IF NOT EXISTS vendor_assigned_at TIMESTAMP;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS vendor_assigned_by VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_chats_vendor_id ON chats(vendor_id) WHERE vendor_id IS NOT NULL;
```

**Fields:**
- `vendor_id`: UUID from DeepLens `vendors` table (no FK - reference only)
- `vendor_name`: Cached vendor name for display (avoids cross-database joins)
- `vendor_assigned_at`: Timestamp when vendor was assigned
- `vendor_assigned_by`: User who assigned the vendor (e.g., "admin", email)

---

## API Endpoints

### 1. Assign Vendor to Chat

**Endpoint**: `POST /api/chats/:jid/vendor`

**Request Body**:
```json
{
  "vendorId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "vendorName": "ABC Textiles",
  "assignedBy": "admin@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Vendor assigned successfully",
  "data": {
    "jid": "1234567890@s.whatsapp.net",
    "vendorId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "vendorName": "ABC Textiles"
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3005/api/chats/1234567890@s.whatsapp.net/vendor \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "vendorName": "ABC Textiles",
    "assignedBy": "admin"
  }'
```

---

### 2. Get Vendor Info for Chat

**Endpoint**: `GET /api/chats/:jid/vendor`

**Response (with vendor)**:
```json
{
  "hasVendor": true,
  "vendor": {
    "vendorId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "vendorName": "ABC Textiles",
    "assignedAt": "2026-01-16T17:30:00.000Z",
    "assignedBy": "admin@example.com"
  }
}
```

**Response (no vendor)**:
```json
{
  "hasVendor": false,
  "vendor": null
}
```

---

### 3. Remove Vendor Assignment

**Endpoint**: `DELETE /api/chats/:jid/vendor`

**Response**:
```json
{
  "success": true,
  "message": "Vendor assignment removed"
}
```

---

### 4. Get All Chats for a Vendor

**Endpoint**: `GET /api/vendors/:vendorId/chats`

**Response**:
```json
{
  "vendorId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "totalChats": 5,
  "chats": [
    {
      "jid": "1234567890@s.whatsapp.net",
      "name": "John Doe",
      "is_group": false,
      "is_announcement": false,
      "vendor_name": "ABC Textiles",
      "vendor_assigned_at": "2026-01-16T17:30:00.000Z",
      "vendor_assigned_by": "admin",
      "last_message_timestamp": 1705234567000
    }
  ]
}
```

---

### 5. Get Vendor Statistics

**Endpoint**: `GET /api/vendors/stats`

**Response**:
```json
{
  "stats": {
    "assigned_chats": 25,
    "unassigned_chats": 75,
    "unique_vendors": 5,
    "total_chats": 100
  },
  "vendors": [
    {
      "vendor_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "vendor_name": "ABC Textiles",
      "chat_count": 10
    },
    {
      "vendor_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "vendor_name": "XYZ Fabrics",
      "chat_count": 8
    }
  ]
}
```

---

## Integration with DeepLens

### Workflow

1. **Create Vendor in DeepLens**:
   ```bash
   POST http://localhost:5000/api/v1/vendors
   {
     "vendorName": "ABC Textiles",
     "vendorCode": "VENDOR-001",
     "email": "contact@abctextiles.com"
   }
   ```
   **Response**: `{ "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", ... }`

2. **Assign Vendor to WhatsApp Chat**:
   ```bash
   POST http://localhost:3005/api/chats/1234567890@s.whatsapp.net/vendor
   {
     "vendorId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
     "vendorName": "ABC Textiles"
   }
   ```

3. **Images from this chat will include vendor info**:
   ```typescript
   const imageEvent = {
     imageId: "wa_msg_123",
     tenantId: "whatsapp-tenant",
     metadata: {
       vendorId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
       vendorName: "ABC Textiles",
       chatJid: "1234567890@s.whatsapp.net"
     }
   };
   ```

---

## UI Integration

### Admin Panel Features

1. **Vendor Assignment Dialog**:
   - Show in chat list actions
   - Search/select vendor from DeepLens
   - Display current vendor assignment
   - Remove vendor button

2. **Vendor Filter**:
   - Filter chats by vendor
   - Show vendor badge in chat list
   - Vendor statistics dashboard

3. **Bulk Assignment**:
   - Select multiple chats
   - Assign same vendor to all

---

## Example UI Components

### Chat List with Vendor Badge

```jsx
<div className="chat-item">
  <div className="chat-name">{chat.name}</div>
  {chat.vendor_name && (
    <span className="vendor-badge">
      🏪 {chat.vendor_name}
    </span>
  )}
</div>
```

### Vendor Assignment Modal

```jsx
<Modal>
  <h3>Assign Vendor to {chat.name}</h3>
  <Select 
    options={vendors}
    value={selectedVendor}
    onChange={handleVendorSelect}
  />
  <Button onClick={assignVendor}>Assign</Button>
</Modal>
```

---

## Benefits

### 1. **No Foreign Key Constraints**
- WhatsApp DB and DeepLens DB are separate
- No cross-database joins required
- Vendor name cached for performance

### 2. **Flexible Integration**
- Manual assignment via admin panel
- Automatic assignment via business logic
- Easy to update/remove assignments

### 3. **Enhanced Search**
- Search images by vendor in DeepLens
- Filter WhatsApp chats by vendor
- Vendor-based analytics

### 4. **Real-World Mapping**
- Map WhatsApp business chats to vendors
- Track vendor communications
- Organize product images by vendor

---

## Migration

### Apply Schema Changes

```bash
# Connect to database
podman exec -it deeplens-postgres psql -U postgres -d whatsapp_vayyari_data

# Run migrations
\i /path/to/001_chats.sql
```

Or use the setup script:
```bash
cd src/whatsapp-processor
.\setup-whatsapp-db.ps1
```

---

## Testing

### Test Vendor Assignment

```bash
# 1. Assign vendor
curl -X POST http://localhost:3005/api/chats/1234567890@s.whatsapp.net/vendor \
  -H "Content-Type: application/json" \
  -d '{"vendorId":"test-vendor-123","vendorName":"Test Vendor"}'

# 2. Get vendor info
curl http://localhost:3005/api/chats/1234567890@s.whatsapp.net/vendor

# 3. Get vendor stats
curl http://localhost:3005/api/vendors/stats

# 4. Remove vendor
curl -X DELETE http://localhost:3005/api/chats/1234567890@s.whatsapp.net/vendor
```

---

## Future Enhancements

1. **Auto-Assignment Rules**:
   - Assign vendor based on chat name pattern
   - Assign based on phone number prefix
   - ML-based vendor detection

2. **Vendor Sync**:
   - Periodic sync with DeepLens vendors
   - Update vendor names automatically
   - Detect deleted vendors

3. **Advanced Analytics**:
   - Messages per vendor
   - Images per vendor
   - Response time by vendor

---

## Summary

✅ **Database**: Added `vendor_id`, `vendor_name`, `vendor_assigned_at`, `vendor_assigned_by` to `chats` table  
✅ **API**: 5 new endpoints for vendor management  
✅ **Integration**: Links WhatsApp chats to DeepLens vendors  
✅ **Flexible**: No FK constraints, cached vendor name  
✅ **Admin-Friendly**: Manual assignment via API  

**Ready for UI integration!** 🎉

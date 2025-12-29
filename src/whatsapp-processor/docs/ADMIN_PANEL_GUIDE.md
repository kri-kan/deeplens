# Admin Panel - Database Management Guide

## 🎛️ New Admin Features

You now have powerful admin tools to manage your WhatsApp database!

---

## 📊 Check Database Statistics

**Endpoint:** `GET /api/admin/stats`

```bash
curl http://localhost:3000/api/admin/stats
```

**Response:**
```json
{
  "chats": {
    "total": 47,
    "groups": 35,
    "individual": 10,
    "announcements": 2,
    "withUnread": 5
  },
  "messages": {
    "total": 1523,
    "fromMe": 234,
    "fromOthers": 1289,
    "edited": 12,
    "deleted": 3
  },
  "syncState": {
    "total": 15,
    "fullySynced": 10,
    "inProgress": 0
  }
}
```

---

## 🗑️ Reset Database (Clean Slate)

**Endpoint:** `POST /api/admin/reset-database`

```bash
curl -X POST http://localhost:3000/api/admin/reset-database
```

**What it does:**
- ✅ Deletes ALL chats
- ✅ Deletes ALL messages
- ✅ Deletes ALL sync state
- ✅ Gives you a fresh start

**Response:**
```json
{
  "success": true,
  "message": "Database reset successful. Deleted 47 chats, 1523 messages, 15 sync states.",
  "deletedCounts": {
    "chats": 47,
    "messages": 1523,
    "syncState": 15
  }
}
```

**Logs you'll see:**
```
🗑️  Starting database reset...
✅ Deleted conversation_sync_state
✅ Deleted messages
✅ Deleted chats
🗑️  Database reset complete
```

---

## 🔄 Force Initial Sync

**Endpoint:** `POST /api/admin/force-initial-sync`

```bash
curl -X POST http://localhost:3000/api/admin/force-initial-sync
```

**What it does:**
- ✅ Manually triggers the initial sync
- ✅ Fetches all groups from WhatsApp
- ✅ Syncs them to database
- ✅ Works even if database already has data

**Response:**
```json
{
  "success": true,
  "message": "Initial sync triggered successfully"
}
```

**Logs you'll see:**
```
🔍 Checking database state...
📊 Current database state: 0 chats
🗄️  Database is empty, performing manual initial sync...
📡 Fetching groups from WhatsApp...
📥 Received 47 groups from WhatsApp
📥 Synced 10/47 groups...
📥 Synced 20/47 groups...
📥 Synced 30/47 groups...
📥 Synced 40/47 groups...
✅ Manual initial sync completed: 47 groups synced
```

---

## 🔄 Refresh Groups Cache

**Endpoint:** `POST /api/admin/refresh-groups`

```bash
curl -X POST http://localhost:3000/api/admin/refresh-groups
```

**What it does:**
- ✅ Re-fetches all groups from WhatsApp
- ✅ Updates database with latest metadata
- ✅ Refreshes in-memory cache

---

## 📋 View Sample Data

**Endpoint:** `GET /api/admin/sample-data`

```bash
curl http://localhost:3000/api/admin/sample-data
```

**Response:**
```json
{
  "recentChats": [
    {
      "jid": "1234567890@g.us",
      "name": "Family Group",
      "is_group": true,
      "unread_count": 5,
      "last_message_text": "See you tomorrow!",
      "last_message_timestamp": 1704067200
    }
  ],
  "recentMessages": [
    {
      "message_id": "ABC123",
      "jid": "1234567890@g.us",
      "content": "Hello everyone!",
      "timestamp": 1704067200,
      "is_from_me": false
    }
  ]
}
```

---

## 🎯 Common Workflows

### Workflow 1: Fresh Start

```bash
# 1. Reset database
curl -X POST http://localhost:3000/api/admin/reset-database

# 2. Force initial sync
curl -X POST http://localhost:3000/api/admin/force-initial-sync

# 3. Check stats
curl http://localhost:3000/api/admin/stats
```

### Workflow 2: Check Current State

```bash
# 1. Get statistics
curl http://localhost:3000/api/admin/stats

# 2. View sample data
curl http://localhost:3000/api/admin/sample-data
```

### Workflow 3: Resync Groups

```bash
# 1. Refresh groups
curl -X POST http://localhost:3000/api/admin/refresh-groups

# 2. Check stats
curl http://localhost:3000/api/admin/stats
```

---

## 📊 Enhanced Logging

### What You'll See in Logs

**On App Startup:**
```
🔍 Checking database state...
📊 Current database state: 0 chats
🗄️  Database is empty, performing manual initial sync...
📡 Fetching groups from WhatsApp...
📥 Received 47 groups from WhatsApp
📥 Synced 10/47 groups...
✅ Manual initial sync completed: 47 groups synced
📊 Chat breakdown: { groups: 35, individual: 0, announcements: 12 }
```

**If Database Already Has Data:**
```
🔍 Checking database state...
📊 Current database state: 47 chats
✅ Database already has chats, skipping initial sync
📊 Chat breakdown: { groups: 35, individual: 10, announcements: 2 }
```

**On Reset:**
```
🗑️  Starting database reset...
Current database state before reset: { chats: 47, messages: 1523, syncState: 15 }
✅ Deleted conversation_sync_state
✅ Deleted messages
✅ Deleted chats
🗑️  Database reset complete
```

---

## 🎨 Emoji Legend

| Emoji | Meaning               |
| ----- | --------------------- |
| 🔍     | Checking/Inspecting   |
| 📊     | Statistics/Data       |
| 🗄️     | Database Operation    |
| 📡     | Network/API Call      |
| 📥     | Receiving/Downloading |
| ✅     | Success               |
| ⚠️     | Warning               |
| ❌     | Error                 |
| 🗑️     | Deletion              |
| 🔄     | Refresh/Sync          |

---

## 🚀 Next Steps

1. **Test the endpoints** - Try resetting and syncing
2. **Watch the logs** - See exactly what's happening
3. **Check the frontend** - Navigate to Conversations → Groups
4. **Monitor stats** - Use the stats endpoint to track growth

All admin features are now available at `/api/admin/*`! 🎉

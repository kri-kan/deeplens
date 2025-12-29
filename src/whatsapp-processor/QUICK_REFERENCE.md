# Quick Reference Guide

## 🚀 Starting the Application

```bash
npm start
```

Server runs on: `http://localhost:3005`

---

## 🎯 Key Features

### 1. Smart Landing Page
- **No Session**: Automatically shows QR code
- **Has Session**: Automatically shows dashboard

### 2. Dashboard Features
- **Pause/Resume Button**: Control all message processing
- **Statistics**: View total, tracking, and excluded counts
- **Tabs**: Switch between "Tracking" and "Excluded" chats
- **Exclude Button**: Stop tracking a specific chat
- **Include Button**: Resume tracking with options

### 3. Resume Options
When including an excluded chat:
- **Resume from last message**: Backfill all missed messages
- **Resume from now**: Start fresh (leave gap)

---

## 📡 API Endpoints

### Status & Connection
```
GET /api/status
```
Returns: `{ status, qr, tenant, hasSession, processingState }`

### Chats & Groups
```
GET /api/chats          # List all chats
GET /api/groups         # List all groups
```

### Exclusion Management
```
POST /api/chats/exclude
Body: { jid: string }

POST /api/chats/include
Body: { jid: string, resumeMode: 'from_last' | 'from_now' }
```

### Processing Control
```
POST /api/processing/pause    # Pause all processing
POST /api/processing/resume   # Resume processing
GET  /api/processing/state    # Get current state
```

---

## 📂 Data Files

Located in `data/config/`:

- **exclusions.json**: List of excluded chat JIDs
- **tracking_state.json**: Per-chat tracking metadata
- **processing_state.json**: Global pause/resume state

---

## 🎨 UI Components

### Dashboard Page (`/`)
- Processing control panel
- Statistics cards
- Tabbed chat list
- Exclude/Include actions

### QR Code Page (`/qr`)
- QR code display
- Connection status
- Auto-redirect when connected

### Resume Modal
- Two-option selection
- Clear descriptions
- Visual feedback

---

## 🔄 Workflows

### Exclude a Chat
1. Go to dashboard
2. Find chat in "Tracking" tab
3. Click "Exclude"
4. Chat moves to "Excluded" tab

### Include a Chat
1. Go to "Excluded" tab
2. Find chat
3. Click "Include"
4. Select resume mode in modal
5. Chat moves to "Tracking" tab

### Pause Processing
1. Click "Pause" button
2. All processing stops
3. Button changes to "Resume"

### Resume Processing
1. Click "Resume" button
2. Processing continues
3. Button changes to "Pause"

---

## 🗂️ MinIO Folder Structure

```
whatsapp-bucket/
├── photos/
│   └── {sanitized_jid}/
│       └── {timestamp}_{filename}.jpg
├── videos/
│   └── {sanitized_jid}/
│       └── {timestamp}_{filename}.mp4
├── audio/
│   └── {sanitized_jid}/
│       └── {timestamp}_{filename}.mp3
└── documents/
    └── {sanitized_jid}/
        └── {timestamp}_{filename}
```

---

## 💾 Message Processing Flow

1. **Message Received** → Check if processing is paused
2. **Not Paused** → Check if chat is excluded
3. **Not Excluded** → Process message
4. **Extract Content** → Download media (if any)
5. **Upload to MinIO** → Store media URL
6. **Update Tracking State** → Save last processed message

---

## 🎯 Default Behavior

- ✅ All chats tracked by default
- ✅ Processing enabled by default
- ✅ Media automatically uploaded
- ✅ State persisted across restarts

---

## 🔧 Configuration

Environment variables in `.env`:

```env
SESSION_ID=community_alpha
TENANT_NAME=YourTenantName
API_PORT=3005
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_BUCKET=tenant-{uuid}-data
```

---

## 📊 Monitoring

### Check Processing State
```bash
curl http://localhost:3005/api/processing/state
```

### Check Connection Status
```bash
curl http://localhost:3005/api/status
```

### List All Chats
```bash
curl http://localhost:3005/api/chats
```

---

## 🐛 Troubleshooting

### Server Won't Start
- Check if port 3005 is available
- Verify environment variables
- Check logs for errors

### QR Code Not Showing
- Check connection status
- Verify session files don't exist
- Restart server

### Messages Not Processing
- Check if processing is paused
- Verify chat is not excluded
- Check MinIO connection

---

## 📝 Notes

- **Exclusion is reversible**: You can always re-include chats
- **Data is preserved**: Excluding doesn't delete existing data
- **Resume modes**: Choose based on your needs
- **Media URLs**: Stored as `minio://{bucket}/{path}`
- **Future migration**: Easy to update URLs for DeepLens

---

## 🎓 Best Practices

1. **Use pause** when doing maintenance
2. **Exclude temporarily** if a chat is too noisy
3. **Resume from last** to maintain complete history
4. **Resume from now** if you don't need the gap
5. **Monitor stats** to track system health

---

## 🔮 Coming Soon

- Database integration for message storage
- Search and analytics
- Export functionality
- Batch operations
- Advanced filtering
- DeepLens bucket migration tools

---

**Quick Start**: Just run `npm start` and open `http://localhost:3005`!

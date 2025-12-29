# WhatsApp Processor - Database Setup

## Quick Start

### 1. Start DeepLens Infrastructure
```powershell
cd c:\productivity\deeplens
.\infrastructure\setup-deeplens-dev.ps1
```

### 2. Setup WhatsApp Database
```powershell
cd src\whatsapp-processor
.\setup-whatsapp-db.ps1
```

### 3. Configure Environment
Copy `.env.example` to `.env` (if not already done):
```powershell
Copy-Item .env.example .env
```

The default configuration should work with DeepLens infrastructure.

### 4. Start Application
```powershell
npm run build
npm start
```

---

## Database Configuration

### Connection Details

| Setting      | Value                   |
| :----------- | :---------------------- |
| **Host**     | `localhost`             |
| **Port**     | `5433` ⚠️ (not 5432!)    |
| **Database** | `whatsapp_vayyari_data` |
| **Username** | `postgres`              |
| **Password** | `DeepLens123!`          |

### Environment Variables

**Preferred (lowercase with underscores):**
```bash
vayyari_wa_db_connection_string=postgresql://postgres:DeepLens123%21@localhost:5433/whatsapp_vayyari_data
```

**Legacy (uppercase - deprecated):**
```bash
VAYYARI_WA_DB_CONNECTION_STRING=postgresql://postgres:DeepLens123%21@localhost:5433/whatsapp_vayyari_data
```

> **Note:** The application supports both formats for backward compatibility, but lowercase is preferred.

---

## Common Issues

### Issue: "ECONNREFUSED" or "ECONNRESET"

**Cause:** Database is not running or wrong port is configured.

**Solution:**
1. Check if PostgreSQL container is running:
   ```powershell
   podman ps | Select-String "deeplens-postgres"
   ```

2. Verify port in `.env` is `5433` (not `5432`)

3. Restart containers if needed:
   ```powershell
   cd c:\productivity\deeplens
   .\infrastructure\setup-deeplens-dev.ps1 -Clean
   ```

### Issue: "database does not exist"

**Cause:** Database hasn't been created yet.

**Solution:**
```powershell
.\setup-whatsapp-db.ps1
```

### Issue: Port 5432 vs 5433 Confusion

**Why 5433?**
- The DeepLens Podman infrastructure maps PostgreSQL to port `5433` on the host
- This is defined in `infrastructure/setup-deeplens-dev.ps1` line 112: `-p 5433:5432`
- The container internally uses port 5432, but it's exposed as 5433 on your machine

**How to remember:**
- If using DeepLens infrastructure → use port `5433`
- If using standalone PostgreSQL → use port `5432`

---

## Database Schema

The WhatsApp Processor uses 5 tables:

1. **chats** - Stores all WhatsApp chats (groups and individual)
2. **messages** - Stores message content and metadata
3. **chat_tracking_state** - Tracks which chats are included/excluded
4. **processing_state** - Global pause/resume state
5. **media_files** - Metadata for downloaded media files

To recreate the schema:
```powershell
.\setup-whatsapp-db.ps1 -Clean
```

---

## Connecting with pgAdmin

1. Open pgAdmin
2. Right-click "Servers" → "Register" → "Server"
3. **General Tab:**
   - Name: `DeepLens WhatsApp`
4. **Connection Tab:**
   - Host: `localhost`
   - Port: `5433`
   - Database: `whatsapp_vayyari_data`
   - Username: `postgres`
   - Password: `DeepLens123!`
5. Click "Save"

---

## Troubleshooting Commands

### Check if database exists
```powershell
podman exec deeplens-postgres psql -U postgres -c "\l" | Select-String "whatsapp"
```

### List tables in database
```powershell
podman exec deeplens-postgres psql -U postgres -d whatsapp_vayyari_data -c "\dt"
```

### Check table row counts
```powershell
podman exec deeplens-postgres psql -U postgres -d whatsapp_vayyari_data -c "
SELECT 
    'chats' as table_name, COUNT(*) as rows FROM chats
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'chat_tracking_state', COUNT(*) FROM chat_tracking_state
UNION ALL
SELECT 'processing_state', COUNT(*) FROM processing_state
UNION ALL
SELECT 'media_files', COUNT(*) FROM media_files;
"
```

### Test connection from Node.js
```powershell
node -e "const { Client } = require('pg'); require('dotenv').config(); const client = new Client({ connectionString: process.env.vayyari_wa_db_connection_string }); client.connect().then(() => { console.log('✅ Connected'); process.exit(0); }).catch(e => { console.log('❌', e.message); process.exit(1); })"
```

---

## Migration from JSON Files

If you were previously using JSON files for tracking state (`exclusions.json`, `tracking_state.json`), the application now uses the database instead. The old files are no longer used and can be safely deleted.

The migration happens automatically when you:
1. Set up the database with `setup-whatsapp-db.ps1`
2. Start the application with the correct database connection string

---

## See Also

- [Main DeepLens Troubleshooting Guide](../../TROUBLESHOOTING_SUMMARY.md)
- [Infrastructure Setup Script](../../infrastructure/setup-deeplens-dev.ps1)
- [Database DDL Scripts](./scripts/ddl/)

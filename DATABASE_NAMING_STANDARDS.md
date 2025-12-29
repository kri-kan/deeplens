# Database Naming Standards - DeepLens Project

## ✅ Standardized Naming Convention

All database names across the DeepLens project now follow a **lowercase with underscores** naming convention.

### Database Names

| Database                   | Purpose                        |     Status     |
| :------------------------- | :----------------------------- | :------------: |
| `whatsapp_vayyari_data`    | WhatsApp message and chat data | ✅ Standardized |
| `tenant_vayyari_metadata`  | Tenant metadata and media info | ✅ Standardized |
| `nextgen_identity`         | Identity and authentication    | ✅ Standardized |
| `tenant_metadata_template` | Template for new tenants       | ✅ Standardized |
| `deeplens_platform`        | Platform-wide data             | ✅ Standardized |

### Environment Variable Names

**Preferred (lowercase with underscores):**
```bash
vayyari_wa_db_connection_string=postgresql://postgres:DeepLens123%21@localhost:5433/whatsapp_vayyari_data
deeplens_vayyari_connection_string=postgresql://postgres:DeepLens123%21@localhost:5433/tenant_vayyari_metadata
```

**Legacy (uppercase - deprecated but supported):**
```bash
VAYYARI_WA_DB_CONNECTION_STRING=postgresql://postgres:DeepLens123%21@localhost:5433/whatsapp_vayyari_data
DEEPLENS_VAYYARI_CONNECTION_STRING=postgresql://postgres:DeepLens123%21@localhost:5433/tenant_vayyari_metadata
```

## 🔍 Verification

### Check Current Database Names
```powershell
podman exec deeplens-postgres psql -U postgres -c "\l" | Select-String "vayyari"
```

Expected output should show:
- `tenant_vayyari_metadata`
- `whatsapp_vayyari_data`

### Verify Connection Strings

**WhatsApp Processor:**
```powershell
# Check .env file
Get-Content c:\productivity\deeplens\src\whatsapp-processor\.env | Select-String "connection_string"
```

Should show lowercase variable names.

## 📝 Updated Files

### Configuration Files
- ✅ `src/whatsapp-processor/.env.example` - Uses lowercase env vars
- ✅ `src/whatsapp-processor/src/config/index.ts` - Supports both cases with warnings

### Deployment Scripts
- ✅ `deploy-whatsapp-vayyari.ps1` - Uses `tenant_vayyari_metadata`
- ✅ `deploy-debug.ps1` - Uses `tenant_vayyari_metadata`

### Infrastructure Scripts
- ✅ `infrastructure/setup-deeplens-dev.ps1` - Creates `tenant_vayyari_metadata`
- ✅ `infrastructure/test-vayyari-setup.ps1` - References `tenant_vayyari_metadata`

### Documentation
- ✅ `src/whatsapp-processor/DATABASE_SETUP.md` - Documents lowercase convention
- ✅ `src/whatsapp-processor/README.md` - Updated with database setup
- ✅ `TROUBLESHOOTING_SUMMARY.md` - Uses correct database names

## 🎯 Migration Checklist

If you have an existing setup with mixed-case database names:

### 1. Check Current State
```powershell
podman exec deeplens-postgres psql -U postgres -c "\l"
```

### 2. Rename Databases (if needed)
```powershell
# Only if you have old mixed-case databases
podman exec deeplens-postgres psql -U postgres -c "ALTER DATABASE tenant_Vayyari_metadata RENAME TO tenant_vayyari_metadata;"
podman exec deeplens-postgres psql -U postgres -c "ALTER DATABASE whastapp_Vayyari_data RENAME TO whatsapp_vayyari_data;"
```

### 3. Update Environment Files
```powershell
# Update .env files to use lowercase variable names
cd c:\productivity\deeplens\src\whatsapp-processor
# Edit .env to use lowercase: vayyari_wa_db_connection_string
```

### 4. Restart Services
```powershell
# Restart WhatsApp processor
podman restart whatsapp-vayyari

# Or rebuild and redeploy
.\deploy-whatsapp-vayyari.ps1
```

## 🚨 Common Issues

### Issue: "database does not exist"
**Cause:** Database name mismatch between code and actual database.

**Solution:**
1. Check actual database name: `podman exec deeplens-postgres psql -U postgres -c "\l"`
2. Ensure it matches the connection string in `.env`
3. Both should be lowercase with underscores

### Issue: "WARNING: Using deprecated uppercase env var"
**Cause:** Using old uppercase environment variable names.

**Solution:**
1. Update `.env` to use lowercase: `vayyari_wa_db_connection_string`
2. The app will still work but will show warnings

### Issue: Port confusion (5432 vs 5433)
**Cause:** Podman maps PostgreSQL to port 5433 on host.

**Solution:**
- Always use port **5433** when connecting from host machine
- Use port **5432** only for inter-container communication
- See `DATABASE_SETUP.md` for details

## 📚 References

- [WhatsApp Processor Database Setup](../src/whatsapp-processor/DATABASE_SETUP.md)
- [Infrastructure Setup Script](../infrastructure/setup-deeplens-dev.ps1)
- [Troubleshooting Guide](../TROUBLESHOOTING_SUMMARY.md)

## 🔐 Connection Details Reference

### PostgreSQL (via Podman)
```
Host: localhost
Port: 5433 (host) / 5432 (container)
Username: postgres
Password: DeepLens123!
```

### Databases
```
whatsapp_vayyari_data       - WhatsApp messages and chats
tenant_vayyari_metadata     - Media metadata and tenant data
nextgen_identity            - User authentication
tenant_metadata_template    - Template for new tenants
```

### Connection String Format
```
postgresql://postgres:DeepLens123%21@localhost:5433/whatsapp_vayyari_data
                                    ↑ Note: ! is encoded as %21
                                            ↑ Port 5433 for host connections
                                                      ↑ Lowercase database name
```

---

**Last Updated:** 2025-12-29  
**Status:** ✅ All databases and references standardized to lowercase with underscores

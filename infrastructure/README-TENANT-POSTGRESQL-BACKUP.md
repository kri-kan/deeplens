# DeepLens Tenant PostgreSQL Backup Provisioning

## Overview

DeepLens provides automated PostgreSQL backup provisioning for tenants who require database backup to their own NFS storage. This document describes how to configure and manage automated backups for tenant databases.

### What DeepLens Provides

- **Automated Backup Container**: Dedicated container per tenant running scheduled pg_dump backups
- **NFS Storage Integration**: Backups stored on tenant-provided NFS storage
- **Configurable Schedule**: Cron-based backup scheduling (default: daily at 2 AM)
- **Automatic Retention**: Configurable backup retention policy (default: 30 days)
- **Compression Support**: Optional gzip compression for backup files
- **Monitoring**: Built-in logging and status checking
- **Isolation**: Each tenant gets their own backup container with isolated credentials

### What Tenant Provides

- **NFS Server**: Running NFS server with exported file system
- **NFS Export Path**: Dedicated path for backups (e.g., `/exports/tenant-backups`)
- **Network Access**: NFS server must be accessible from Docker host
- **Storage Space**: Adequate storage for retention period (estimate: DB size × retention days × 1.1)
- **NFS Permissions**: Read/write permissions for Docker (typically UID 999 for postgres)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ DeepLens Infrastructure                                      │
│                                                               │
│  ┌──────────────────┐      ┌────────────────────────────┐   │
│  │ PostgreSQL       │◄────┤│ Backup Container           │   │
│  │ deeplens-postgres│      ││ deeplens-backup-vayyari    │   │
│  │                  │      ││                            │   │
│  │ tenant_vayyari_  │ dump ││ - Cron: 0 2 * * *         │   │
│  │ metadata DB      │─────►││ - Retention: 30 days       │   │
│  └──────────────────┘      ││ - Compression: gzip        │   │
│                             │└────────────────────────────┘   │
│                             │          │                       │
│                             │          │ NFS Mount             │
│                             │          ▼                       │
└─────────────────────────────┼──────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │ Tenant NFS Storage │
                    │ nfs-server:/exports/vayyari/backups
                    │                    │
                    │ Backups:           │
                    │ ├─ tenant_vayyari_metadata_20251216_020001.sql.gz
                    │ ├─ tenant_vayyari_metadata_20251215_020001.sql.gz
                    │ └─ tenant_vayyari_metadata_20251214_020001.sql.gz
                    └────────────────────┘
```

## Quick Start

### Step 1: Ensure NFS is Accessible

Test NFS connectivity from Docker host:

```powershell
# Mount test (Linux/Mac)
sudo mount -t nfs nfs-server.company.com:/exports/vayyari/backups /mnt/test

# Windows
mount -o anon \\nfs-server.company.com\exports\vayyari\backups Z:
```

### Step 2: Provision Backup

```powershell
# Import tenant manager module
Import-Module .\powershell\DeepLensTenantManager.psm1 -Force

# Provision PostgreSQL backup for tenant
New-TenantPostgreSQLBackup `
    -TenantName "vayyari" `
    -NFSPath "nfs-server.company.com:/exports/vayyari/backups"
```

### Expected Output

```
🗄️ Setting up PostgreSQL backup for tenant: vayyari
📦 Creating NFS volume: tenant_vayyari_pgbackup
✅ NFS volume created: tenant_vayyari_pgbackup
🐳 Creating backup container: deeplens-backup-vayyari
✅ Backup container created and configured
🔄 Running initial backup...

✅ PostgreSQL backup configured successfully!
   📦 Container: deeplens-backup-vayyari
   💾 NFS Path: nfs-server.company.com:/exports/vayyari/backups
   ⏰ Schedule: 0 2 * * *
   📅 Retention: 30 days
   🗜️  Compression: Enabled

📊 Check backup logs:
   docker logs deeplens-backup-vayyari

🔍 List backups:
   docker exec deeplens-backup-vayyari ls -lh /backups
```

## Function Reference

### New-TenantPostgreSQLBackup

Configures automated PostgreSQL backup for a tenant.

**Parameters:**

| Parameter            | Type   | Required | Default             | Description                         |
| -------------------- | ------ | -------- | ------------------- | ----------------------------------- |
| `TenantId`           | string | No       | ""                  | Tenant ID (optional, for reference) |
| `TenantName`         | string | Yes      | -                   | Tenant name (used for naming)       |
| `NFSPath`            | string | Yes      | -                   | NFS path: `server:/export/path`     |
| `BackupSchedule`     | string | No       | "0 2 \* \* \*"      | Cron schedule for backups           |
| `RetentionDays`      | int    | No       | 30                  | Days to retain backups              |
| `NFSOptions`         | string | No       | "rw,sync,hard,intr" | NFS mount options                   |
| `CompressionEnabled` | bool   | No       | $true               | Enable gzip compression             |

**Returns:** Backup configuration object or `$null` on failure

**Example:**

```powershell
# Basic usage
$backup = New-TenantPostgreSQLBackup -TenantName "vayyari" -NFSPath "10.0.1.100:/mnt/backups/vayyari"

# Custom schedule (every 6 hours) and retention (60 days)
$backup = New-TenantPostgreSQLBackup `
    -TenantName "vayyari" `
    -NFSPath "nfs-server:/exports/vayyari/backups" `
    -BackupSchedule "0 */6 * * *" `
    -RetentionDays 60

# Without compression
$backup = New-TenantPostgreSQLBackup `
    -TenantName "vayyari" `
    -NFSPath "nfs-server:/exports/vayyari/backups" `
    -CompressionEnabled $false

# Custom NFS options (for servers requiring nolock)
$backup = New-TenantPostgreSQLBackup `
    -TenantName "vayyari" `
    -NFSPath "nfs-server:/exports/vayyari/backups" `
    -NFSOptions "rw,sync,nolock"
```

### Remove-TenantPostgreSQLBackup

Removes PostgreSQL backup configuration for a tenant.

**Parameters:**

| Parameter       | Type   | Required | Default | Description                       |
| --------------- | ------ | -------- | ------- | --------------------------------- |
| `TenantName`    | string | Yes      | -       | Tenant name                       |
| `RemoveBackups` | bool   | No       | $false  | Also delete backup files from NFS |

**Returns:** `$true` on success, `$false` on failure

**Example:**

```powershell
# Remove backup config (keep backup files)
Remove-TenantPostgreSQLBackup -TenantName "vayyari"

# Remove backup config AND delete all backups
Remove-TenantPostgreSQLBackup -TenantName "vayyari" -RemoveBackups $true
```

### Get-TenantPostgreSQLBackupStatus

Gets status and configuration of PostgreSQL backup for a tenant.

**Parameters:**

| Parameter    | Type   | Required | Description |
| ------------ | ------ | -------- | ----------- |
| `TenantName` | string | Yes      | Tenant name |

**Returns:** Status object with container details, backup count, last backup time

**Example:**

```powershell
# Check backup status
$status = Get-TenantPostgreSQLBackupStatus -TenantName "vayyari"

# Output:
# 📊 PostgreSQL Backup Status: vayyari
#    Container: deeplens-backup-vayyari - Up 2 hours
#    Volume: tenant_vayyari_pgbackup
#    NFS Path: :nfs-server.company.com:/exports/vayyari/backups
#    Database: tenant_vayyari_metadata
#    Backup Files: 30
#    Last Backup: [Mon Dec 16 02:00:01 2025] Backup completed (compressed): ...
```

### Get-AllTenantPostgreSQLBackups

Lists all tenant PostgreSQL backup configurations.

**Example:**

```powershell
# List all backups
$backups = Get-AllTenantPostgreSQLBackups

# Output:
# 🔍 Finding all tenant PostgreSQL backups...
#
# 📋 Tenant PostgreSQL Backups (3 total)
#    • vayyari: deeplens-backup-vayyari - Up 2 hours
#    • acmecorp: deeplens-backup-acmecorp - Up 5 days
#    • techsolutions: deeplens-backup-techsolutions - Up 1 week
```

## Complete Workflow: Vayyari Tenant

### Prerequisites

- Core infrastructure running (PostgreSQL container)
- Tenant database created: `tenant_vayyari_metadata`
- NFS server: `nfs-server.company.com` with export: `/exports/vayyari/backups`
- NFS permissions: Read/write for UID 999 (postgres user in container)

### Step-by-Step Setup

```powershell
# 1. Import module
Import-Module .\powershell\DeepLensTenantManager.psm1 -Force

# 2. Verify tenant database exists
docker exec deeplens-postgres psql -U deeplens -c "\l" | Select-String "tenant_vayyari_metadata"

# 3. Configure backup
$backup = New-TenantPostgreSQLBackup `
    -TenantName "vayyari" `
    -NFSPath "nfs-server.company.com:/exports/vayyari/backups" `
    -BackupSchedule "0 2 * * *" `
    -RetentionDays 30

# 4. Verify backup was created
docker logs deeplens-backup-vayyari

# 5. Check backup files on NFS
docker exec deeplens-backup-vayyari ls -lh /backups

# 6. Test manual backup
docker exec deeplens-backup-vayyari /usr/local/bin/backup.sh
```

### Expected Container Structure

```bash
# Container name
deeplens-backup-vayyari

# NFS volume
tenant_vayyari_pgbackup → nfs-server.company.com:/exports/vayyari/backups

# Backup script
/usr/local/bin/backup.sh

# Backup location
/backups/tenant_vayyari_metadata_YYYYMMDD_HHMMSS.sql.gz

# Cron schedule
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
```

## Backup Schedule Reference

Common cron schedule patterns:

| Schedule             | Cron Expression | Description                  |
| -------------------- | --------------- | ---------------------------- |
| Daily at 2 AM        | `0 2 * * *`     | Default schedule             |
| Every 6 hours        | `0 */6 * * *`   | 4 backups per day            |
| Every 12 hours       | `0 */12 * * *`  | 2 backups per day            |
| Twice daily          | `0 2,14 * * *`  | 2 AM and 2 PM                |
| Weekly (Sunday 3 AM) | `0 3 * * 0`     | Once per week                |
| Hourly               | `0 * * * *`     | Every hour (not recommended) |

## Tenant NFS Requirements

### NFS Export Configuration

Example NFS export on tenant's NFS server:

```bash
# /etc/exports
/exports/vayyari/backups 10.0.0.0/24(rw,sync,no_subtree_check,no_root_squash)
```

### Permissions

Ensure Docker can write to NFS:

```bash
# On NFS server
mkdir -p /exports/vayyari/backups
chown 999:999 /exports/vayyari/backups
chmod 755 /exports/vayyari/backups
```

### NFS Mount Options

| Option   | Description                   | Recommended                    |
| -------- | ----------------------------- | ------------------------------ |
| `rw`     | Read-write access             | ✅ Required                    |
| `sync`   | Synchronous writes            | ✅ Yes                         |
| `hard`   | Hard mount (retry on failure) | ✅ Yes                         |
| `intr`   | Allow interruption            | ✅ Yes                         |
| `nolock` | Disable file locking          | ⚠️ Only if NFS server requires |
| `vers=4` | Force NFSv4                   | ⚠️ If NFSv3 issues             |

### Storage Estimates

Calculate required NFS storage:

```
Required Storage = DB Size × Retention Days × Compression Factor × Safety Margin

Example for Vayyari:
- DB Size: 5 GB (100K images metadata)
- Retention: 30 days
- Compression: 0.3 (gzip compresses to ~30%)
- Safety Margin: 1.2 (20% buffer)

Storage = 5 GB × 30 × 0.3 × 1.2 = 54 GB required
```

## Monitoring & Management

### Check Backup Logs

```powershell
# View all logs
docker logs deeplens-backup-vayyari

# Follow logs in real-time
docker logs -f deeplens-backup-vayyari

# Last 50 lines
docker logs --tail 50 deeplens-backup-vayyari

# Logs since 1 hour ago
docker logs --since 1h deeplens-backup-vayyari
```

### List Backup Files

```powershell
# List all backups
docker exec deeplens-backup-vayyari ls -lh /backups

# Count backups
docker exec deeplens-backup-vayyari sh -c "ls -1 /backups/*.sql.gz | wc -l"

# Find oldest backup
docker exec deeplens-backup-vayyari sh -c "ls -lt /backups/*.sql.gz | tail -1"

# Find newest backup
docker exec deeplens-backup-vayyari sh -c "ls -lt /backups/*.sql.gz | head -1"
```

### Manual Backup

```powershell
# Trigger backup manually
docker exec deeplens-backup-vayyari /usr/local/bin/backup.sh

# Backup with custom filename
docker exec deeplens-backup-vayyari pg_dump -h deeplens-postgres -U deeplens -d tenant_vayyari_metadata | gzip > /backups/manual_backup.sql.gz
```

### Verify Backup Integrity

```powershell
# Test backup restoration (dry run)
docker exec deeplens-backup-vayyari sh -c "gunzip -c /backups/tenant_vayyari_metadata_*.sql.gz | head -100"

# Check backup file size
docker exec deeplens-backup-vayyari du -h /backups/*.sql.gz
```

### Container Health

```powershell
# Check container status
docker ps --filter "name=deeplens-backup-vayyari"

# Restart backup container
docker restart deeplens-backup-vayyari

# View cron schedule
docker exec deeplens-backup-vayyari crontab -l
```

## Troubleshooting

### Issue: NFS Volume Creation Failed

**Symptoms:**

```
Failed to create NFS volume
```

**Resolution:**

1. Test NFS connectivity:

   ```powershell
   # Test mount manually
   docker run --rm -it alpine sh
   apk add nfs-utils
   mkdir /mnt/test
   mount -t nfs nfs-server.company.com:/exports/vayyari/backups /mnt/test
   ```

2. Check NFS server accessibility:

   ```powershell
   Test-NetConnection -ComputerName nfs-server.company.com -Port 2049
   ```

3. Verify NFS export:
   ```bash
   # On NFS server
   exportfs -v
   showmount -e localhost
   ```

### Issue: Permission Denied on Backup

**Symptoms:**

```
pg_dump: error: could not open file "/backups/...": Permission denied
```

**Resolution:**

1. Check NFS permissions:

   ```bash
   # On NFS server
   ls -ld /exports/vayyari/backups
   # Should show: drwxr-xr-x 2 999 999 ...
   ```

2. Fix ownership:

   ```bash
   # On NFS server
   chown -R 999:999 /exports/vayyari/backups
   ```

3. Use `no_root_squash` in NFS export:
   ```bash
   # /etc/exports
   /exports/vayyari/backups *(rw,sync,no_root_squash)
   exportfs -ra
   ```

### Issue: Backups Not Running on Schedule

**Symptoms:**

- No new backup files appearing
- Last backup time not updating

**Resolution:**

1. Check cron is running:

   ```powershell
   docker exec deeplens-backup-vayyari ps aux | Select-String "crond"
   ```

2. Verify cron schedule:

   ```powershell
   docker exec deeplens-backup-vayyari crontab -l
   ```

3. Check backup script:

   ```powershell
   docker exec deeplens-backup-vayyari cat /usr/local/bin/backup.sh
   ```

4. Test manual execution:
   ```powershell
   docker exec deeplens-backup-vayyari /usr/local/bin/backup.sh
   ```

### Issue: Out of Disk Space

**Symptoms:**

```
No space left on device
```

**Resolution:**

1. Check NFS storage usage:

   ```powershell
   docker exec deeplens-backup-vayyari df -h /backups
   ```

2. Reduce retention period:

   ```powershell
   # Remove old backups manually
   docker exec deeplens-backup-vayyari find /backups -name "*.sql.gz" -mtime +15 -delete

   # Update retention (requires recreating backup config)
   Remove-TenantPostgreSQLBackup -TenantName "vayyari"
   New-TenantPostgreSQLBackup -TenantName "vayyari" -NFSPath "..." -RetentionDays 15
   ```

### Issue: Backup Container Won't Start

**Symptoms:**

- Container in "Restarting" status
- Container exits immediately

**Resolution:**

1. Check container logs:

   ```powershell
   docker logs deeplens-backup-vayyari
   ```

2. Verify PostgreSQL is accessible:

   ```powershell
   docker exec deeplens-backup-vayyari nc -zv deeplens-postgres 5432
   ```

3. Check network connectivity:

   ```powershell
   docker network inspect deeplens-network
   ```

4. Recreate container:
   ```powershell
   Remove-TenantPostgreSQLBackup -TenantName "vayyari"
   New-TenantPostgreSQLBackup -TenantName "vayyari" -NFSPath "..."
   ```

## Security Considerations

### Credentials

- Database password is passed via environment variable `PGPASSWORD`
- Password stored in container environment (visible in `docker inspect`)
- Consider using Docker secrets for production environments

### Network Security

- Backup container connects to `deeplens-network` (internal Docker network)
- No ports exposed externally
- NFS traffic should be on trusted network or use Kerberos authentication

### Data Security

- Backups are logical dumps (SQL format) containing full database content
- Enable compression to reduce file size and I/O
- NFS permissions should be restrictive (755 directories, 644 files)
- Consider encrypting NFS traffic using NFSv4 with Kerberos

### Access Control

- Only authorized users should have access to NFS backup location
- Backup container runs as postgres user (UID 999)
- Use `no_root_squash` carefully - only on trusted networks

## Best Practices

1. **Test Backups Regularly**: Verify backup restoration periodically
2. **Monitor Backup Size**: Track backup growth to detect issues early
3. **Separate NFS Exports**: Each tenant should have isolated NFS export
4. **Use Compression**: Enable gzip for 70% space savings
5. **Set Appropriate Retention**: Balance storage cost vs recovery requirements
6. **Monitor Logs**: Check backup logs for failures
7. **Document NFS Details**: Keep NFS server info in tenant documentation
8. **Alert on Failures**: Set up monitoring for backup failures
9. **Test Restoration**: Practice restore procedures before disasters
10. **Keep 3-2-1 Backup Rule**: 3 copies, 2 different media, 1 offsite

## Integration with Monitoring

### Prometheus Metrics (Future Enhancement)

```yaml
# Expose backup metrics
- tenant_backup_last_success_timestamp
- tenant_backup_duration_seconds
- tenant_backup_size_bytes
- tenant_backup_count_total
```

### Grafana Dashboard (Future Enhancement)

- Backup success/failure rates
- Backup size trends
- Time since last successful backup
- Storage usage per tenant

## Maintenance Operations

### Update Backup Schedule

```powershell
# 1. Remove existing backup config
Remove-TenantPostgreSQLBackup -TenantName "vayyari"

# 2. Recreate with new schedule
New-TenantPostgreSQLBackup `
    -TenantName "vayyari" `
    -NFSPath "nfs-server.company.com:/exports/vayyari/backups" `
    -BackupSchedule "0 */12 * * *"  # Changed to every 12 hours
```

### Migrate to New NFS Server

```powershell
# 1. Create backup on new NFS
New-TenantPostgreSQLBackup `
    -TenantName "vayyari" `
    -NFSPath "new-nfs-server:/exports/vayyari/backups"

# 2. Copy existing backups (on NFS servers)
rsync -avz old-nfs:/exports/vayyari/backups/ new-nfs:/exports/vayyari/backups/

# 3. Remove old backup config
Remove-TenantPostgreSQLBackup -TenantName "vayyari"
```

### Restore from Backup

```powershell
# 1. List available backups
docker exec deeplens-backup-vayyari ls -lh /backups

# 2. Choose backup file
$backupFile = "tenant_vayyari_metadata_20251216_020001.sql.gz"

# 3. Restore to new database (safe test)
docker exec deeplens-postgres sh -c "gunzip < /backups/$backupFile | psql -U deeplens -d tenant_vayyari_metadata_restore"

# 4. Or restore to existing database (DESTRUCTIVE)
docker exec deeplens-postgres dropdb -U deeplens tenant_vayyari_metadata
docker exec deeplens-postgres createdb -U deeplens tenant_vayyari_metadata
docker exec deeplens-backup-vayyari sh -c "gunzip -c /backups/$backupFile" | docker exec -i deeplens-postgres psql -U deeplens -d tenant_vayyari_metadata
```

## Related Documentation

- [README.md](README.md) - Main infrastructure documentation
- [README-TENANT-MINIO-PROVISIONING.md](README-TENANT-MINIO-PROVISIONING.md) - Tenant MinIO storage provisioning

---

**Last Updated:** December 16, 2025  
**Version:** 1.0  
**Maintained By:** DeepLens Infrastructure Team

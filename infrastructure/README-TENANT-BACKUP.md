# DeepLens Tenant Backup & Disaster Recovery Guide

**Comprehensive backup strategy for all tenant-specific resources**

Last Updated: December 18, 2025

---

## 📋 Overview

Each DeepLens tenant has three critical data stores that require backup:

| Resource       | Data Type                    | Backup Priority | Recovery Impact                            |
| -------------- | ---------------------------- | --------------- | ------------------------------------------ |
| **PostgreSQL** | Metadata, users, collections | 🔴 Critical     | Cannot operate without it                  |
| **Qdrant**     | Vector embeddings            | 🔴 Critical     | Expensive to regenerate (hours/days)       |
| **MinIO**      | Original images              | 🟡 High         | Can regenerate vectors, but lose originals |

**Why All Three Matter:**

- **PostgreSQL** contains metadata that links images to vectors
- **Qdrant** contains vector embeddings (expensive to regenerate)
- **MinIO** contains original images (source of truth)
- **Losing any one breaks the system completely**

---

## 🎯 Backup Architecture

### Backup Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                  Tenant: vayyari                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │   Qdrant     │  │    MinIO     │     │
│  │              │  │              │  │              │     │
│  │ Metadata DB  │  │ Vector Store │  │ Object Store │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
│         ▼                 ▼                 ▼              │
│  ┌──────────────────────────────────────────────────┐     │
│  │           Automated Backup Containers             │     │
│  ├──────────────────────────────────────────────────┤     │
│  │  • Daily pg_dump       • Qdrant snapshots        │     │
│  │  • Weekly full backup  • Collection exports      │     │
│  │  • 30-day retention    • Daily snapshots         │     │
│  └──────────────┬───────────────────────────────────┘     │
│                 │                                          │
└─────────────────┼──────────────────────────────────────────┘
                  ▼
         ┌─────────────────┐
         │ Backup Storage  │
         │  NFS / S3 / Az  │
         └─────────────────┘
```

### Backup Schedules

| Resource       | Frequency    | Method                   | Retention                |
| -------------- | ------------ | ------------------------ | ------------------------ |
| **PostgreSQL** | Daily (2 AM) | `pg_dump` + WAL          | 30 days full, 7 days WAL |
| **Qdrant**     | Daily (3 AM) | Snapshot API             | 30 days                  |
| **MinIO**      | Continuous   | Versioning + `mc mirror` | 30 days versions         |

---

## 🐘 PostgreSQL Backup

### Automated Backup Container

The backup container runs `pg_dump` on a schedule and manages retention.

#### Provision PostgreSQL Backup

```powershell
# Using the provisioning script
.\infrastructure\provision-tenant-backup.ps1 `
    -TenantName "vayyari" `
    -DatabaseName "deeplens_vayyari" `
    -BackupSchedule "0 2 * * *" `
    -RetentionDays 30
```

#### Manual Backup

```powershell
# One-time backup
podman exec deeplens-postgres-vayyari pg_dump `
    -U postgres `
    -d deeplens_vayyari `
    -F c `
    -f /backups/manual_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump

# Export to host
podman cp deeplens-postgres-vayyari:/backups/manual_backup_*.dump ./backups/
```

#### Restore PostgreSQL

```powershell
# Stop application services first
podman stop deeplens-searchapi-vayyari deeplens-adminapi-vayyari

# Restore from dump
podman exec -i deeplens-postgres-vayyari pg_restore `
    -U postgres `
    -d deeplens_vayyari `
    -c `
    --if-exists `
    /backups/backup_20251218_020000.dump

# Restart services
podman start deeplens-searchapi-vayyari deeplens-adminapi-vayyari
```

#### Backup Verification

```powershell
# List available backups
podman exec deeplens-backup-vayyari ls -lh /backups/postgres/

# Check backup integrity
podman exec deeplens-postgres-vayyari pg_restore `
    -l /backups/backup_20251218_020000.dump
```

### Point-in-Time Recovery (PITR)

For critical tenants, enable WAL archiving:

```sql
-- On PostgreSQL instance
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET archive_mode = 'on';
ALTER SYSTEM SET archive_command = 'cp %p /backups/wal/%f';
SELECT pg_reload_conf();
```

---

## 🔍 Qdrant Backup

Qdrant stores vector embeddings that are expensive to regenerate. Native snapshot API provides efficient backups.

### Automated Qdrant Backup

#### Create Backup Script

Create `provision-tenant-qdrant-backup.ps1`:

```powershell
# DeepLens Qdrant Backup Provisioning
param(
    [Parameter(Mandatory=$true)]
    [string]$TenantName,

    [string]$BackupSchedule = "0 3 * * *",  # Daily at 3 AM

    [int]$RetentionDays = 30,

    [string]$BackupPath = "/backups/qdrant"
)

$ErrorActionPreference = "Stop"

$QdrantContainer = "deeplens-qdrant-$TenantName"
$BackupContainer = "deeplens-qdrant-backup-$TenantName"
$BackupVolume = "deeplens_qdrant_${TenantName}_backups"

Write-Host "🔍 Setting up Qdrant backup for tenant: $TenantName" -ForegroundColor Cyan

# Create backup volume
Write-Host "[1/3] Creating backup volume..." -ForegroundColor Yellow
podman volume create $BackupVolume | Out-Null

# Create backup script
$BackupScript = @"
#!/bin/bash
set -e

TENANT_NAME="$TenantName"
BACKUP_DIR="/backups"
RETENTION_DAYS=$RetentionDays
QDRANT_URL="http://deeplens-qdrant-\$TENANT_NAME:6333"

echo "[INFO] Starting Qdrant backup for tenant: \$TENANT_NAME"
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
SNAPSHOT_NAME="snapshot_\$TIMESTAMP"

# Create snapshot via Qdrant API
echo "[BACKUP] Creating snapshot..."
curl -X POST "\$QDRANT_URL/snapshots" \
    -H "Content-Type: application/json" \
    -d '{"snapshot_name":"'\$SNAPSHOT_NAME'"}' \
    -o /dev/null -s -w "HTTP %{http_code}\n"

# Download snapshot
echo "[BACKUP] Downloading snapshot..."
curl -s "\$QDRANT_URL/snapshots/\$SNAPSHOT_NAME" \
    -o "\$BACKUP_DIR/\$SNAPSHOT_NAME.snapshot"

# Compress snapshot
echo "[BACKUP] Compressing snapshot..."
gzip "\$BACKUP_DIR/\$SNAPSHOT_NAME.snapshot"

# Cleanup old backups
echo "[CLEANUP] Removing backups older than \$RETENTION_DAYS days..."
find "\$BACKUP_DIR" -name "snapshot_*.snapshot.gz" -mtime +\$RETENTION_DAYS -delete

# Delete snapshot from Qdrant (keep only local backup)
curl -X DELETE "\$QDRANT_URL/snapshots/\$SNAPSHOT_NAME" -o /dev/null -s

echo "[OK] Backup completed: \$SNAPSHOT_NAME.snapshot.gz"
echo "[OK] Backup size: \$(du -h \$BACKUP_DIR/\$SNAPSHOT_NAME.snapshot.gz | cut -f1)"
"@

# Write backup script to temp file
$TempScript = [System.IO.Path]::GetTempFileName()
$BackupScript | Out-File -FilePath $TempScript -Encoding ASCII

# Start backup container
Write-Host "[2/3] Starting backup container..." -ForegroundColor Yellow
podman run -d `
    --name $BackupContainer `
    --restart unless-stopped `
    --network deeplens-network `
    -v "${BackupVolume}:${BackupPath}" `
    -v "${TempScript}:/scripts/backup.sh:ro" `
    --label "tenant=$TenantName" `
    --label "service=qdrant-backup" `
    alpine:3.19 `
    sh -c "apk add --no-cache curl bash dcron && \
           echo '$BackupSchedule /bin/bash /scripts/backup.sh >> /var/log/backup.log 2>&1' | crontab - && \
           crond -f -l 2"

Write-Host "[3/3] Running initial backup..." -ForegroundColor Yellow
podman exec $BackupContainer /bin/bash /scripts/backup.sh

Write-Host "✅ Qdrant backup configured successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Backup Schedule: $BackupSchedule (cron format)" -ForegroundColor Cyan
Write-Host "Retention: $RetentionDays days" -ForegroundColor Cyan
Write-Host "Container: $BackupContainer" -ForegroundColor Cyan
```

#### Manual Qdrant Backup

```powershell
# Create snapshot
$response = Invoke-RestMethod -Uri "http://localhost:6333/snapshots" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"snapshot_name":"manual_backup"}'

# Download snapshot
Invoke-WebRequest -Uri "http://localhost:6333/snapshots/manual_backup" `
    -OutFile "qdrant_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').snapshot"

# Compress
Compress-Archive -Path "qdrant_backup_*.snapshot" `
    -DestinationPath "qdrant_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"
```

#### Restore Qdrant

```powershell
# Stop Qdrant container
podman stop deeplens-qdrant-vayyari

# Extract and copy snapshot to volume
$snapshotPath = "qdrant_backup_20251218_030000.snapshot"
podman cp $snapshotPath deeplens-qdrant-vayyari:/qdrant/snapshots/

# Start Qdrant
podman start deeplens-qdrant-vayyari

# Restore from snapshot via API
Invoke-RestMethod -Uri "http://localhost:6333/snapshots/recover" `
    -Method Put `
    -ContentType "application/json" `
    -Body (@{
        location = "/qdrant/snapshots/qdrant_backup_20251218_030000.snapshot"
    } | ConvertTo-Json)

Write-Host "✅ Qdrant restored successfully" -ForegroundColor Green
```

#### List Qdrant Collections

```powershell
# Verify collections after restore
Invoke-RestMethod -Uri "http://localhost:6333/collections" |
    Select-Object -ExpandProperty result |
    Format-Table -Property name, vectors_count, points_count
```

---

## 🪣 MinIO Backup

MinIO backup strategy depends on storage backend:

- **NFS-backed MinIO**: NFS-level snapshots + `mc mirror`
- **Cloud-backed MinIO**: Object versioning + replication
- **Local volumes**: Volume snapshots + `mc mirror`

### Enable MinIO Versioning

```powershell
# Install MinIO Client (mc)
# Windows: choco install minio-client
# Linux: wget https://dl.min.io/client/mc/release/linux-amd64/mc

# Configure mc alias
mc alias set vayyari http://localhost:9100 <access_key> <secret_key>

# Enable versioning on bucket
mc version enable vayyari/images
mc version enable vayyari/thumbnails

# Verify versioning
mc version info vayyari/images
```

### Automated MinIO Backup with mc mirror

```powershell
# Create backup script
$MinioBackupScript = @"
#!/bin/bash
set -e

TENANT_NAME="vayyari"
SOURCE_ALIAS="source-minio"
BACKUP_ALIAS="backup-storage"
BACKUP_DIR="/backups/minio"
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)

echo "[INFO] Starting MinIO backup for tenant: \$TENANT_NAME"

# Mirror buckets to backup location
mc mirror --preserve \$SOURCE_ALIAS/images \$BACKUP_DIR/images/\$TIMESTAMP/
mc mirror --preserve \$SOURCE_ALIAS/thumbnails \$BACKUP_DIR/thumbnails/\$TIMESTAMP/

# Create metadata snapshot
mc admin cluster bucket export \$SOURCE_ALIAS \
    --bucket images,thumbnails \
    > "\$BACKUP_DIR/metadata_\$TIMESTAMP.json"

# Cleanup old backups (keep last 30 days)
find "\$BACKUP_DIR/images" -maxdepth 1 -mtime +30 -type d -exec rm -rf {} \;
find "\$BACKUP_DIR/thumbnails" -maxdepth 1 -mtime +30 -type d -exec rm -rf {} \;

echo "[OK] MinIO backup completed"
"@

# Save script
$MinioBackupScript | Out-File -FilePath "infrastructure/scripts/backup-minio.sh" -Encoding ASCII
```

### Restore MinIO

```powershell
# Restore from mirror backup
mc mirror --preserve /backups/minio/images/20251218_030000/ vayyari/images/
mc mirror --preserve /backups/minio/thumbnails/20251218_030000/ vayyari/thumbnails/

# Verify object counts
mc ls --recursive vayyari/images | Measure-Object | Select-Object -ExpandProperty Count
```

### NFS-Level Backup (Recommended)

If MinIO uses NFS backend, leverage NFS snapshots:

```bash
# On NFS server (ZFS example)
zfs snapshot tank/deeplens/vayyari@backup-$(date +%Y%m%d)

# On NFS server (Linux LVM example)
lvcreate --size 10G --snapshot --name deeplens-vayyari-snap /dev/vg0/deeplens-vayyari

# Mount snapshot and rsync
mount /dev/vg0/deeplens-vayyari-snap /mnt/snapshot
rsync -av /mnt/snapshot/ /backups/deeplens-vayyari/$(date +%Y%m%d)/
```

---

## 🔄 Complete Tenant Backup Procedure

### Full Tenant Backup

```powershell
# Complete backup function
function Backup-DeepLensTenant {
    param(
        [Parameter(Mandatory=$true)]
        [string]$TenantName,

        [string]$BackupRoot = "E:\DeepLensBackups"
    )

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupDir = "$BackupRoot\$TenantName\$timestamp"

    Write-Host "🗄️ Starting full backup for tenant: $TenantName" -ForegroundColor Cyan
    Write-Host "   Backup Directory: $backupDir" -ForegroundColor Gray

    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    # 1. Backup PostgreSQL
    Write-Host "`n[1/3] Backing up PostgreSQL..." -ForegroundColor Yellow
    $pgDump = "$backupDir\postgres_${TenantName}.dump"
    podman exec "deeplens-postgres-${TenantName}" pg_dump `
        -U postgres `
        -d "deeplens_${TenantName}" `
        -F c `
        -f "/tmp/backup.dump"
    podman cp "deeplens-postgres-${TenantName}:/tmp/backup.dump" $pgDump
    Write-Host "   ✅ PostgreSQL backup saved: $pgDump" -ForegroundColor Green

    # 2. Backup Qdrant
    Write-Host "`n[2/3] Backing up Qdrant..." -ForegroundColor Yellow
    $qdrantPort = (podman port "deeplens-qdrant-${TenantName}" 6333).Split(':')[1]
    $snapshotName = "backup_$timestamp"

    # Create snapshot
    Invoke-RestMethod -Uri "http://localhost:${qdrantPort}/snapshots" `
        -Method Post `
        -ContentType "application/json" `
        -Body (@{snapshot_name = $snapshotName} | ConvertTo-Json) | Out-Null

    # Download snapshot
    $qdrantBackup = "$backupDir\qdrant_${TenantName}.snapshot"
    Invoke-WebRequest -Uri "http://localhost:${qdrantPort}/snapshots/${snapshotName}" `
        -OutFile $qdrantBackup

    # Delete snapshot from Qdrant
    Invoke-RestMethod -Uri "http://localhost:${qdrantPort}/snapshots/${snapshotName}" `
        -Method Delete | Out-Null

    Write-Host "   ✅ Qdrant backup saved: $qdrantBackup" -ForegroundColor Green

    # 3. Backup MinIO
    Write-Host "`n[3/3] Backing up MinIO..." -ForegroundColor Yellow
    $minioBackup = "$backupDir\minio_${TenantName}"

    # Assume mc alias is configured
    mc mirror --preserve "${TenantName}/images" "$minioBackup/images/" 2>&1 | Out-Null
    mc mirror --preserve "${TenantName}/thumbnails" "$minioBackup/thumbnails/" 2>&1 | Out-Null

    Write-Host "   ✅ MinIO backup saved: $minioBackup" -ForegroundColor Green

    # 4. Create backup manifest
    $manifest = @{
        tenant = $TenantName
        timestamp = $timestamp
        backups = @{
            postgresql = @{
                file = "postgres_${TenantName}.dump"
                size = (Get-Item $pgDump).Length
            }
            qdrant = @{
                file = "qdrant_${TenantName}.snapshot"
                size = (Get-Item $qdrantBackup).Length
            }
            minio = @{
                directory = "minio_${TenantName}"
                size = (Get-ChildItem -Path $minioBackup -Recurse |
                        Measure-Object -Property Length -Sum).Sum
            }
        }
    }

    $manifest | ConvertTo-Json -Depth 10 |
        Out-File -FilePath "$backupDir\manifest.json" -Encoding UTF8

    # 5. Summary
    $totalSize = ($manifest.backups.postgresql.size +
                  $manifest.backups.qdrant.size +
                  $manifest.backups.minio.size) / 1GB

    Write-Host "`n✅ Full tenant backup completed!" -ForegroundColor Green
    Write-Host "   Total backup size: $([math]::Round($totalSize, 2)) GB" -ForegroundColor Cyan
    Write-Host "   Location: $backupDir" -ForegroundColor Cyan
}

# Usage
Backup-DeepLensTenant -TenantName "vayyari"
```

### Full Tenant Restore

```powershell
function Restore-DeepLensTenant {
    param(
        [Parameter(Mandatory=$true)]
        [string]$TenantName,

        [Parameter(Mandatory=$true)]
        [string]$BackupPath
    )

    Write-Host "🔄 Starting full restore for tenant: $TenantName" -ForegroundColor Cyan
    Write-Host "   From backup: $BackupPath" -ForegroundColor Gray

    # Load manifest
    $manifest = Get-Content "$BackupPath\manifest.json" | ConvertFrom-Json

    # Confirm
    Write-Host "`n⚠️  WARNING: This will overwrite all data for tenant: $TenantName" -ForegroundColor Yellow
    $confirm = Read-Host "Type 'yes' to continue"
    if ($confirm -ne 'yes') {
        Write-Host "Restore cancelled" -ForegroundColor Red
        return
    }

    # 1. Stop application services
    Write-Host "`n[1/5] Stopping application services..." -ForegroundColor Yellow
    podman stop "deeplens-searchapi-${TenantName}" 2>&1 | Out-Null
    podman stop "deeplens-adminapi-${TenantName}" 2>&1 | Out-Null
    podman stop "deeplens-worker-${TenantName}" 2>&1 | Out-Null

    # 2. Restore PostgreSQL
    Write-Host "`n[2/5] Restoring PostgreSQL..." -ForegroundColor Yellow
    $pgDump = "$BackupPath\$($manifest.backups.postgresql.file)"
    podman cp $pgDump "deeplens-postgres-${TenantName}:/tmp/restore.dump"
    podman exec "deeplens-postgres-${TenantName}" pg_restore `
        -U postgres `
        -d "deeplens_${TenantName}" `
        -c --if-exists `
        /tmp/restore.dump
    Write-Host "   ✅ PostgreSQL restored" -ForegroundColor Green

    # 3. Restore Qdrant
    Write-Host "`n[3/5] Restoring Qdrant..." -ForegroundColor Yellow
    $qdrantBackup = "$BackupPath\$($manifest.backups.qdrant.file)"
    podman cp $qdrantBackup "deeplens-qdrant-${TenantName}:/qdrant/snapshots/restore.snapshot"

    $qdrantPort = (podman port "deeplens-qdrant-${TenantName}" 6333).Split(':')[1]
    Invoke-RestMethod -Uri "http://localhost:${qdrantPort}/snapshots/recover" `
        -Method Put `
        -ContentType "application/json" `
        -Body (@{location = "/qdrant/snapshots/restore.snapshot"} | ConvertTo-Json)
    Write-Host "   ✅ Qdrant restored" -ForegroundColor Green

    # 4. Restore MinIO
    Write-Host "`n[4/5] Restoring MinIO..." -ForegroundColor Yellow
    $minioBackup = "$BackupPath\$($manifest.backups.minio.directory)"

    # Clear existing buckets
    mc rm --recursive --force "${TenantName}/images" 2>&1 | Out-Null
    mc rm --recursive --force "${TenantName}/thumbnails" 2>&1 | Out-Null

    # Restore from backup
    mc mirror --preserve "$minioBackup/images/" "${TenantName}/images/" 2>&1 | Out-Null
    mc mirror --preserve "$minioBackup/thumbnails/" "${TenantName}/thumbnails/" 2>&1 | Out-Null
    Write-Host "   ✅ MinIO restored" -ForegroundColor Green

    # 5. Start application services
    Write-Host "`n[5/5] Starting application services..." -ForegroundColor Yellow
    podman start "deeplens-worker-${TenantName}"
    podman start "deeplens-adminapi-${TenantName}"
    podman start "deeplens-searchapi-${TenantName}"

    Write-Host "`n✅ Full tenant restore completed!" -ForegroundColor Green
    Write-Host "   Restored from: $($manifest.timestamp)" -ForegroundColor Cyan
}

# Usage
Restore-DeepLensTenant -TenantName "vayyari" -BackupPath "E:\DeepLensBackups\vayyari\20251218_030000"
```

---

## 📊 Monitoring & Validation

### Backup Health Check

```powershell
function Test-TenantBackupHealth {
    param([string]$TenantName)

    Write-Host "🏥 Checking backup health for tenant: $TenantName" -ForegroundColor Cyan

    $results = @{
        PostgreSQL = $false
        Qdrant = $false
        MinIO = $false
    }

    # Check PostgreSQL backup
    $pgBackup = podman ps -a --filter "name=deeplens-backup-${TenantName}" --format "{{.Status}}"
    if ($pgBackup -like "*Up*") {
        $results.PostgreSQL = $true
        Write-Host "✅ PostgreSQL backup container running" -ForegroundColor Green
    } else {
        Write-Host "❌ PostgreSQL backup container not running" -ForegroundColor Red
    }

    # Check Qdrant backup
    $qdrantBackup = podman ps -a --filter "name=deeplens-qdrant-backup-${TenantName}" --format "{{.Status}}"
    if ($qdrantBackup -like "*Up*") {
        $results.Qdrant = $true
        Write-Host "✅ Qdrant backup container running" -ForegroundColor Green
    } else {
        Write-Host "❌ Qdrant backup container not running" -ForegroundColor Red
    }

    # Check MinIO versioning
    try {
        $versionStatus = mc version info "${TenantName}/images" 2>&1
        if ($versionStatus -match "enabled") {
            $results.MinIO = $true
            Write-Host "✅ MinIO versioning enabled" -ForegroundColor Green
        } else {
            Write-Host "⚠️  MinIO versioning not enabled" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ MinIO backup check failed" -ForegroundColor Red
    }

    # Overall health
    $allHealthy = $results.Values -notcontains $false
    if ($allHealthy) {
        Write-Host "`n✅ All backup systems operational" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Some backup systems need attention" -ForegroundColor Yellow
    }

    return $results
}

# Usage
Test-TenantBackupHealth -TenantName "vayyari"
```

### Backup Size Monitoring

```powershell
function Get-TenantBackupSize {
    param([string]$TenantName, [string]$BackupRoot = "E:\DeepLensBackups")

    $tenantBackupPath = "$BackupRoot\$TenantName"

    if (-not (Test-Path $tenantBackupPath)) {
        Write-Host "No backups found for tenant: $TenantName" -ForegroundColor Yellow
        return
    }

    $backups = Get-ChildItem -Path $tenantBackupPath -Directory |
        Sort-Object Name -Descending |
        ForEach-Object {
            $size = (Get-ChildItem -Path $_.FullName -Recurse |
                     Measure-Object -Property Length -Sum).Sum / 1GB

            [PSCustomObject]@{
                Date = $_.Name
                SizeGB = [math]::Round($size, 2)
                Path = $_.FullName
            }
        }

    $backups | Format-Table -AutoSize

    $totalSize = ($backups | Measure-Object -Property SizeGB -Sum).Sum
    Write-Host "Total backup storage: $([math]::Round($totalSize, 2)) GB" -ForegroundColor Cyan
}

# Usage
Get-TenantBackupSize -TenantName "vayyari"
```

---

## 🚨 Disaster Recovery Plan

### RPO (Recovery Point Objective)

| Scenario           | PostgreSQL  | Qdrant     | MinIO      | Total Data Loss      |
| ------------------ | ----------- | ---------- | ---------- | -------------------- |
| **Daily Backup**   | < 24 hours  | < 24 hours | < 24 hours | Up to 1 day of data  |
| **Hourly Backup**  | < 1 hour    | < 1 hour   | Versioned  | Up to 1 hour of data |
| **Continuous WAL** | < 5 minutes | < 24 hours | Versioned  | 5 min to 24 hours    |

### RTO (Recovery Time Objective)

| Data Size  | PostgreSQL | Qdrant     | MinIO      | Total Recovery Time |
| ---------- | ---------- | ---------- | ---------- | ------------------- |
| **10 GB**  | 2 minutes  | 1 minute   | 5 minutes  | ~8 minutes          |
| **100 GB** | 15 minutes | 10 minutes | 45 minutes | ~70 minutes         |
| **1 TB**   | 2 hours    | 1.5 hours  | 8 hours    | ~11.5 hours         |

### Recovery Scenarios

#### Scenario 1: Single Container Failure

```powershell
# Only PostgreSQL container failed
podman start deeplens-postgres-vayyari

# If data corrupted, restore from last backup
Restore-DeepLensTenant -TenantName "vayyari" -BackupPath "E:\DeepLensBackups\vayyari\latest"
```

#### Scenario 2: Complete Host Failure

```powershell
# On new host:
# 1. Restore infrastructure
.\infrastructure\setup-infrastructure.ps1 -Start

# 2. Provision tenant containers
.\infrastructure\provision-tenant.ps1 -TenantName "vayyari"

# 3. Restore all data
Restore-DeepLensTenant -TenantName "vayyari" -BackupPath "\\backup-server\deeplens\vayyari\20251218_030000"
```

#### Scenario 3: Data Center Disaster

```powershell
# Requirements:
# - Off-site backup copies (S3, Azure Blob, or remote datacenter)
# - Backup manifest with checksums
# - New infrastructure in different location

# 1. Deploy infrastructure in DR site
# 2. Download backups from off-site storage
# 3. Restore tenant data
# 4. Update DNS to point to DR site
```

### Testing Recovery

**Monthly DR Test:**

```powershell
# 1. Create test environment
# 2. Restore from backup
$testRestore = Restore-DeepLensTenant `
    -TenantName "vayyari-test" `
    -BackupPath "E:\DeepLensBackups\vayyari\latest"

# 3. Verify data integrity
# 4. Document restore time
# 5. Cleanup test environment
```

---

## 📋 Best Practices

### Backup Configuration

✅ **DO:**

- Automate all backups (cron jobs, scheduled tasks)
- Monitor backup success/failure (alerting)
- Test restores monthly
- Keep backups off-site (different datacenter/cloud)
- Encrypt backups at rest and in transit
- Document recovery procedures
- Version backup scripts in Git

❌ **DON'T:**

- Rely on single backup location
- Skip backup testing
- Store backups on same host as data
- Ignore backup failures
- Keep backups forever without retention policy

### Retention Policy

```
Daily Backups:   30 days
Weekly Backups:  12 weeks (3 months)
Monthly Backups: 12 months (1 year)
Yearly Backups:  7 years (compliance)
```

### Security

- Encrypt PostgreSQL dumps: `pg_dump | gpg -e > backup.dump.gpg`
- Encrypt Qdrant snapshots: `gzip backup.snapshot && gpg -e backup.snapshot.gz`
- Use MinIO encryption: `mc encrypt set sse-s3 vayyari/images`
- Restrict backup access with IAM policies
- Rotate backup encryption keys quarterly

---

## 🔗 Related Documentation

- [Tenant Management](README-TENANT-MANAGEMENT.md) - Tenant provisioning & storage
- [Infrastructure Guide](README.md) - Complete infrastructure documentation
- [NFS Migration](README-NFS-MIGRATION.md) - Storage migration guide

---

## 📞 Support

For backup issues or questions:

1. Check backup container logs: `podman logs deeplens-backup-<tenant>`
2. Review [DOCS_INDEX.md](../DOCS_INDEX.md) for troubleshooting
3. Contact DevOps team: devops@deeplens.local

---

**Last Updated:** December 18, 2025  
**Version:** 1.0.0

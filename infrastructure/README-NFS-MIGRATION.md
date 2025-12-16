# DeepLens NFS/Portable Storage Migration Guide

## Overview

This guide explains how to run DeepLens infrastructure with portable storage that can be easily migrated between machines.

## Storage Strategy

### Windows + Podman Development

Due to Windows filesystem permission limitations with Podman, we use a **hybrid approach**:

- **Core Infrastructure (PostgreSQL, Redis, Qdrant)**: Uses Podman **named volumes**

  - Stored in Podman machine VM
  - Portable via export/import commands
  - Solves permission issues on Windows

- **Tenant Data (Backups, MinIO)**: Uses **bind mounts** to NFS path
  - Stored at configurable path (e.g., `C:\productivity\deeplensData\tenants`)
  - Can be on NFS mount
  - Directly portable by copying directories

### Linux Production

On Linux, **all services** can use bind mounts to NFS paths without permission issues.

---

## Quick Start

### Starting Infrastructure

```powershell
# Start with default paths
.\setup-with-nfs.ps1

# Start with custom NFS path
.\setup-with-nfs.ps1 -DataBasePath "Z:\deeplens-production"

# Check status
.\setup-with-nfs.ps1 -Status

# Stop all containers
.\setup-with-nfs.ps1 -Stop

# Clean everything (requires confirmation)
.\setup-with-nfs.ps1 -Clean
```

---

## Migration Between Machines

### Method 1: For Windows Development (Named Volumes)

**On Source Machine:**

```powershell
# Export core infrastructure volumes
podman volume export deeplens_postgres_data > postgres_data.tar
podman volume export deeplens_redis_data > redis_data.tar
podman volume export deeplens_qdrant_data > qdrant_data.tar

# Copy tenant data (if on local path)
Copy-Item -Path "C:\productivity\deeplensData\tenants" -Destination "Z:\backup\tenants" -Recurse

# Transfer files to new machine:
# - postgres_data.tar, redis_data.tar, qdrant_data.tar
# - Tenant data directory
```

**On Target Machine:**

```powershell
# Import core infrastructure volumes
Get-Content postgres_data.tar | podman volume import deeplens_postgres_data
Get-Content redis_data.tar | podman volume import deeplens_redis_data
Get-Content qdrant_data.tar | podman volume import deeplens_qdrant_data

# Copy tenant data to target location
Copy-Item -Path "Z:\backup\tenants" -Destination "C:\productivity\deeplensData\tenants" -Recurse

# Start infrastructure
.\setup-with-nfs.ps1
```

### Method 2: For Linux Production (Pure NFS)

**On Source Machine:**

```bash
# All data is already on NFS mount at /mnt/nfs/deeplens
# Just ensure data is synced
sync

# Export configuration
docker-compose -f docker-compose.infrastructure.yml config > deeplens-config.yml
```

**On Target Machine:**

```bash
# Mount same NFS share
sudo mount -t nfs nfs-server:/export/deeplens /mnt/nfs/deeplens

# Start infrastructure pointing to NFS mount
export DEEPLENS_DATA_PATH=/mnt/nfs/deeplens/core/data
export DEEPLENS_LOGS_PATH=/mnt/nfs/deeplens/core/logs
docker-compose -f docker-compose.infrastructure.yml up -d

# All data is immediately available
```

### Method 3: Mixed Environment (Windows Dev → Linux Prod)

**Step 1: Export from Windows**

```powershell
# Export core volumes
podman volume export deeplens_postgres_data > postgres_data.tar
podman volume export deeplens_redis_data > redis_data.tar
podman volume export deeplens_qdrant_data > qdrant_data.tar

# Tenant data is already portable (just copy the directory)
```

**Step 2: Convert to Linux**

```bash
# Extract to NFS mount on Linux
mkdir -p /mnt/nfs/deeplens/core/data/{postgres,redis,qdrant}
tar -xf postgres_data.tar -C /mnt/nfs/deeplens/core/data/postgres
tar -xf redis_data.tar -C /mnt/nfs/deeplens/core/data/redis
tar -xf qdrant_data.tar -C /mnt/nfs/deeplens/core/data/qdrant

# Copy tenant data
cp -r tenants /mnt/nfs/deeplens/

# Fix permissions (important!)
sudo chown -R 999:999 /mnt/nfs/deeplens/core/data/postgres
sudo chown -R 999:999 /mnt/nfs/deeplens/core/data/redis
sudo chown -R 1000:1000 /mnt/nfs/deeplens/core/data/qdrant

# Start with docker-compose on Linux
export DEEPLENS_DATA_PATH=/mnt/nfs/deeplens/core/data
export DEEPLENS_LOGS_PATH=/mnt/nfs/deeplens/core/logs
docker-compose -f docker-compose.infrastructure.yml up -d
```

---

## Storage Architecture

### Directory Structure

```
$DataBasePath/                           # Base path (can be NFS mount)
├── core/
│   ├── data/                           # Core infrastructure data
│   │   ├── postgres/                   # PostgreSQL data (named volume on Windows)
│   │   ├── redis/                      # Redis data (named volume on Windows)
│   │   ├── qdrant/                     # Qdrant data (named volume on Windows)
│   │   ├── influxdb/                   # InfluxDB data
│   │   ├── kafka/                      # Kafka data
│   │   ├── zookeeper/                  # ZooKeeper data
│   │   └── minio/                      # MinIO data
│   └── logs/                           # Service logs
│       ├── postgres/
│       ├── redis/
│       ├── kafka/
│       └── zookeeper/
└── tenants/                            # Tenant-specific data (always portable)
    └── {tenant-name}/
        ├── data/                       # Tenant databases (for multi-tenant PostgreSQL)
        ├── logs/                       # Tenant-specific logs
        ├── backups/                    # PostgreSQL backups
        └── minio/                      # Tenant MinIO data
```

### Volume Mapping

**Windows Development (Podman):**

```yaml
# Core services use named volumes
postgres:
  volumes:
    - deeplens_postgres_data:/var/lib/postgresql/data # Named volume

# Tenant backups use bind mounts
backup-container:
  volumes:
    - C:/productivity/deeplensData/tenants/vayyari/backups:/backups # Direct path
```

**Linux Production (Docker):**

```yaml
# All services use bind mounts to NFS
postgres:
  volumes:
    - /mnt/nfs/deeplens/core/data/postgres:/var/lib/postgresql/data # NFS bind mount
```

---

## NFS Configuration

### Windows NFS Client Setup

```powershell
# Enable NFS Client (requires admin)
Enable-WindowsOptionalFeature -FeatureName ServicesForNFS-ClientOnly -Online -All

# Mount NFS share
mount -o anon \\nfs-server\export\deeplens Z:

# Use mounted drive
.\setup-with-nfs.ps1 -DataBasePath "Z:\deeplens"
```

### Linux NFS Client Setup

```bash
# Install NFS client
sudo apt-get install nfs-common  # Ubuntu/Debian
sudo yum install nfs-utils       # RHEL/CentOS

# Mount NFS share
sudo mkdir -p /mnt/nfs/deeplens
sudo mount -t nfs nfs-server:/export/deeplens /mnt/nfs/deeplens

# Add to /etc/fstab for persistent mount
echo "nfs-server:/export/deeplens /mnt/nfs/deeplens nfs defaults 0 0" | sudo tee -a /etc/fstab
```

### NFS Server Export Configuration

```bash
# /etc/exports on NFS server
/export/deeplens 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)

# Apply configuration
sudo exportfs -ra
```

---

## Backup and Recovery

### Full System Backup

**Windows:**

```powershell
# Create backup directory
$BackupDir = "C:\backups\deeplens-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $BackupDir

# Export volumes
podman volume export deeplens_postgres_data > "$BackupDir\postgres_data.tar"
podman volume export deeplens_redis_data > "$BackupDir\redis_data.tar"
podman volume export deeplens_qdrant_data > "$BackupDir\qdrant_data.tar"

# Copy tenant data
Copy-Item -Path "C:\productivity\deeplensData\tenants" -Destination "$BackupDir\tenants" -Recurse

# Backup configuration
Copy-Item -Path ".\docker-compose.infrastructure.yml" -Destination "$BackupDir\"
Copy-Item -Path ".\powershell" -Destination "$BackupDir\powershell" -Recurse
```

**Linux:**

```bash
# Simple tar backup of entire NFS mount
BACKUP_DIR="/backups/deeplens-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/deeplens-data.tar.gz -C /mnt/nfs deeplens

# Or use rsync for incremental
rsync -av --delete /mnt/nfs/deeplens/ $BACKUP_DIR/
```

### Recovery from Backup

**Windows:**

```powershell
$BackupDir = "C:\backups\deeplens-20251217-100000"

# Import volumes
Get-Content "$BackupDir\postgres_data.tar" | podman volume import deeplens_postgres_data
Get-Content "$BackupDir\redis_data.tar" | podman volume import deeplens_redis_data
Get-Content "$BackupDir\qdrant_data.tar" | podman volume import deeplens_qdrant_data

# Restore tenant data
Copy-Item -Path "$BackupDir\tenants" -Destination "C:\productivity\deeplensData\tenants" -Recurse -Force
```

**Linux:**

```bash
BACKUP_DIR="/backups/deeplens-20251217-100000"

# Extract backup
tar -xzf $BACKUP_DIR/deeplens-data.tar.gz -C /mnt/nfs/

# Or restore with rsync
rsync -av --delete $BACKUP_DIR/ /mnt/nfs/deeplens/
```

---

## Monitoring Storage

### Check Volume Sizes

**Windows:**

```powershell
# Check named volumes
podman volume ls --format "table {{.Name}}\t{{.Driver}}\t{{.Size}}"

# Check tenant data size
Get-ChildItem -Path "C:\productivity\deeplensData\tenants" -Recurse -File |
    Measure-Object -Property Length -Sum |
    Select-Object @{Name="Size(MB)";Expression={[math]::Round($_.Sum / 1MB, 2)}}
```

**Linux:**

```bash
# Check all data
du -sh /mnt/nfs/deeplens/*

# Check per tenant
du -sh /mnt/nfs/deeplens/tenants/*

# Check specific service
du -sh /mnt/nfs/deeplens/core/data/postgres
```

### Space Monitoring Script

```powershell
# Create monitoring script
@"
`$basePath = "C:\productivity\deeplensData"
`$threshold = 80  # Alert at 80% full

`$drive = (Get-Item `$basePath).PSDrive
`$used = (`$drive.Used / `$drive.Free) * 100

if (`$used -gt `$threshold) {
    Write-Host "[WARNING] Storage at $([math]::Round(`$used, 2))% capacity" -ForegroundColor Red
} else {
    Write-Host "[OK] Storage at $([math]::Round(`$used, 2))% capacity" -ForegroundColor Green
}

# Show tenant sizes
Get-ChildItem -Path "`$basePath\tenants" -Directory | ForEach-Object {
    `$size = (Get-ChildItem -Path `$_.FullName -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1GB
    Write-Host "  $(`$_.Name): $([math]::Round(`$size, 2)) GB"
}
"@ | Out-File -FilePath ".\monitor-storage.ps1"
```

---

## Troubleshooting

### Permission Errors on Windows

**Problem:** `chmod: Operation not permitted` when using bind mounts

**Solution:** Use named volumes for core infrastructure on Windows. This is already the default in `setup-with-nfs.ps1`.

### Missing Data After Migration

**Problem:** Containers start but data is missing

**Solution:**

```powershell
# Verify volume import
podman volume ls
podman volume inspect deeplens_postgres_data

# Check tenant data directory
Test-Path "C:\productivity\deeplensData\tenants"
Get-ChildItem "C:\productivity\deeplensData\tenants" -Recurse
```

### NFS Mount Issues

**Problem:** Cannot mount NFS share on Windows

**Solution:**

```powershell
# Check NFS client is enabled
Get-WindowsOptionalFeature -Online -FeatureName ServicesForNFS-ClientOnly

# Test connectivity
Test-NetConnection -ComputerName nfs-server -Port 2049

# Try different mount options
mount -o anon,nolock \\nfs-server\export\deeplens Z:
```

### Performance Issues with NFS

**Problem:** Slow database operations on NFS

**Solution:**

- Use named volumes for core databases (already default on Windows)
- For Linux production, ensure NFS server has:
  - `async` for better write performance (or `sync` for safety)
  - Sufficient network bandwidth (1 Gbps+)
  - Low latency connection to NFS server

---

## Best Practices

1. **Windows Development:**

   - Use named volumes for databases (default)
   - Use bind mounts for tenant data
   - Regular volume exports for backup

2. **Linux Production:**

   - Use NFS bind mounts for all data
   - Configure proper NFS export options
   - Use `no_root_squash` for correct permissions

3. **Migration:**

   - Test migration in staging environment first
   - Verify data integrity after import
   - Document custom configurations

4. **Backups:**

   - Automated volume exports weekly
   - Tenant data synced to backup NFS share
   - Store configuration files in version control

5. **Monitoring:**
   - Monitor NFS mount availability
   - Alert on storage capacity thresholds
   - Track database sizes over time

---

## Security Considerations

### NFS Security

```bash
# Secure NFS exports (Linux server)
/export/deeplens 192.168.1.0/24(rw,sync,no_subtree_check,root_squash,sec=sys)

# Use firewall rules
sudo ufw allow from 192.168.1.0/24 to any port 2049

# Consider NFS over VPN for remote access
```

### Data Encryption

```bash
# Encrypt backup archives
tar -czf - /mnt/nfs/deeplens | openssl enc -aes-256-cbc -out deeplens-backup.tar.gz.enc

# Decrypt
openssl enc -d -aes-256-cbc -in deeplens-backup.tar.gz.enc | tar -xzf -
```

---

## Summary

- **Windows Dev:** Hybrid approach with named volumes for core + bind mounts for tenants
- **Linux Prod:** Pure bind mounts to NFS for everything
- **Migration:** Export/import volumes or copy NFS directories
- **Portability:** Tenant data always portable, core data portable via export/import on Windows
- **Production:** Use Linux with NFS for full bind mount support

For questions or issues, refer to the main [README.md](README.md) or tenant-specific documentation.

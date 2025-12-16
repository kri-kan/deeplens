# DeepLens Tenant MinIO Storage Provisioning

**Platform-Managed Storage for Tenants with NFS Infrastructure**

Last Updated: December 16, 2025

---

## 📋 Overview

DeepLens now supports provisioning dedicated MinIO storage instances for tenants who don't have cloud storage (Azure/AWS/GCS) but have existing NFS infrastructure. This provides a middle ground between full BYOS and shared storage.

### Use Cases

- **Enterprise customers with on-premise NFS storage**
- **Customers wanting data sovereignty without cloud costs**
- **Development/testing environments with local NFS**
- **Customers transitioning from on-premise to cloud**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  DeepLens Platform                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Tenant A    │  │  Tenant B    │  │  Tenant C    │     │
│  │  MinIO       │  │  MinIO       │  │  MinIO       │     │
│  │  :9100       │  │  :9101       │  │  :9102       │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
│         │ NFS Mount       │ NFS Mount       │ NFS Mount    │
│         ▼                 ▼                 ▼              │
└─────────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Tenant NFS Infrastructure                       │
│                                                              │
│  nfs.tenantA.com:/exports/deeplens                          │
│  nfs.tenantB.com:/exports/storage                           │
│  10.0.1.100:/mnt/tenantC-data                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Benefits

✅ **Data Sovereignty:** Tenant data stays on their infrastructure  
✅ **Flexible:** Works with existing NFS investments  
✅ **Isolated:** Each tenant gets dedicated MinIO instance  
✅ **Managed:** DeepLens handles MinIO lifecycle  
✅ **Secure:** Auto-generated credentials, isolated containers  
✅ **Cost-Effective:** No cloud storage costs

---

## 🚀 Quick Start

### Prerequisites

1. **Docker Environment:** Running Docker or Podman
2. **DeepLens Network:** `deeplens-network` must exist
3. **NFS Access:** Tenant's NFS server must be accessible from Docker host
4. **Permissions:** Docker must have permissions to mount NFS

### Basic Provisioning

```powershell
# Import tenant management module
Import-Module .\infrastructure\powershell\DeepLensTenantManager.psm1

# Provision MinIO for tenant with NFS backend
New-TenantMinIOStorage `
  -TenantId "12345678-1234-1234-1234-123456789012" `
  -TenantName "vayyari" `
  -NFSPath "nfs.vayyari.com:/exports/deeplens-storage"
```

**Output:**

```
🗄️ Provisioning MinIO storage for tenant: vayyari
   Tenant ID: 12345678-1234-1234-1234-123456789012
   NFS Path: nfs.vayyari.com:/exports/deeplens-storage
   API Port: 9100
   Console Port: 9200
📦 Creating NFS-backed Docker volume...
✅ NFS volume created: deeplens_minio_vayyari_data
🚀 Starting MinIO container...
✅ MinIO container started: deeplens-minio-vayyari
⏳ Waiting for MinIO to be ready...
🪣 Creating default bucket 'images'...

✅ MinIO storage provisioned successfully for tenant: vayyari

📋 MinIO Configuration:
   Container Name: deeplens-minio-vayyari
   API Endpoint:   http://localhost:9100
   Console URL:    http://localhost:9200
   Access Key:     tenant-vayyari-1234
   Secret Key:     <base64-encoded-32-byte-key>
   Default Bucket: images
   NFS Backend:    nfs.vayyari.com:/exports/deeplens-storage
   Docker Volume:  deeplens_minio_vayyari_data

💡 Use these credentials to update tenant storage configuration:

   Set-TenantStorageConfig -TenantId '12345678-1234-1234-1234-123456789012' -StorageProvider 'minio' -Config @{
       endpoint = 'http://localhost:9100'
       access_key = 'tenant-vayyari-1234'
       secret_key = '<secret-key>'
       bucket = 'images'
       secure = $false
   }
```

---

## 📖 Function Reference

### New-TenantMinIOStorage

Creates a dedicated MinIO instance for a tenant with NFS storage backend.

**Parameters:**

| Parameter     | Required | Default             | Description                             |
| ------------- | -------- | ------------------- | --------------------------------------- |
| `TenantId`    | Yes      | -                   | Tenant UUID                             |
| `TenantName`  | Yes      | -                   | Tenant name (used for container naming) |
| `NFSPath`     | Yes      | -                   | NFS path (format: `server:/path`)       |
| `MinIOPort`   | No       | Auto (9100+)        | API port for MinIO                      |
| `ConsolePort` | No       | Auto (9200+)        | Console UI port                         |
| `AccessKey`   | No       | Auto-generated      | MinIO access key                        |
| `SecretKey`   | No       | Auto-generated      | MinIO secret key (32 bytes)             |
| `NFSOptions`  | No       | `rw,sync,hard,intr` | NFS mount options                       |

**Examples:**

```powershell
# Basic provisioning
New-TenantMinIOStorage `
  -TenantId "12345678-1234-1234-1234-123456789012" `
  -TenantName "customer" `
  -NFSPath "nfs-server.company.com:/exports/customer-data"

# With custom NFS options (for compatibility issues)
New-TenantMinIOStorage `
  -TenantId "12345678-1234-1234-1234-123456789012" `
  -TenantName "customer" `
  -NFSPath "10.0.1.100:/mnt/storage/customer" `
  -NFSOptions "rw,sync,nolock"

# With specific ports
New-TenantMinIOStorage `
  -TenantId "12345678-1234-1234-1234-123456789012" `
  -TenantName "customer" `
  -NFSPath "nfs.customer.com:/exports/data" `
  -MinIOPort 9500 `
  -ConsolePort 9501

# With custom credentials
New-TenantMinIOStorage `
  -TenantId "12345678-1234-1234-1234-123456789012" `
  -TenantName "customer" `
  -NFSPath "nfs.customer.com:/exports/data" `
  -AccessKey "custom-access-key" `
  -SecretKey "custom-secret-key-minimum-8-characters"
```

**Returns:**

```powershell
@{
    TenantId = "12345678-1234-1234-1234-123456789012"
    TenantName = "customer"
    ContainerName = "deeplens-minio-customer"
    ContainerId = "<docker-container-id>"
    VolumeName = "deeplens_minio_customer_data"
    NFSPath = "nfs.customer.com:/exports/data"
    APIEndpoint = "http://localhost:9100"
    ConsoleURL = "http://localhost:9200"
    AccessKey = "tenant-customer-1234"
    SecretKey = "<secret-key>"
    DefaultBucket = "images"
    Status = "Running"
}
```

---

### Get-TenantMinIOStatus

Retrieves status and configuration of a tenant's MinIO instance.

**Parameters:**

| Parameter    | Required | Description          |
| ------------ | -------- | -------------------- |
| `TenantName` | Yes      | Tenant name to check |

**Example:**

```powershell
Get-TenantMinIOStatus -TenantName "vayyari"
```

**Output:**

```
📊 MinIO Status for Tenant: vayyari
   Container:      deeplens-minio-vayyari
   Status:         running
   Health:         healthy
   Tenant ID:      12345678-1234-1234-1234-123456789012
   API Endpoint:   http://localhost:9100
   Console URL:    http://localhost:9200
   NFS Backend:    nfs.vayyari.com:/exports/deeplens-storage
   Docker Volume:  deeplens_minio_vayyari_data
   Started:        2025-12-16T10:30:00.000Z
```

---

### Get-AllTenantMinIOInstances

Lists all tenant MinIO instances across the platform.

**Example:**

```powershell
Get-AllTenantMinIOInstances
```

**Output:**

```
📋 Listing all tenant MinIO instances...

Found 3 tenant MinIO instance(s)

[Status for each tenant displayed]
```

---

### Remove-TenantMinIOStorage

Removes a tenant's MinIO instance and optionally the NFS volume.

**Parameters:**

| Parameter      | Required | Default  | Description                             |
| -------------- | -------- | -------- | --------------------------------------- |
| `TenantName`   | Yes      | -        | Tenant name                             |
| `RemoveVolume` | No       | `$false` | Also remove Docker volume (unmount NFS) |
| `Confirm`      | Yes      | -        | Required for safety                     |

**Examples:**

```powershell
# Remove container only (NFS volume remains)
Remove-TenantMinIOStorage -TenantName "customer" -Confirm

# Remove container and unmount NFS volume
Remove-TenantMinIOStorage -TenantName "customer" -RemoveVolume -Confirm
```

⚠️ **Note:** Removing the volume only unmounts the NFS share from Docker. The data on the NFS server remains intact and can be remounted later.

---

## 🔧 Complete Tenant Onboarding Workflow

### Step 1: Create Tenant Record

```powershell
# Import module
Import-Module .\infrastructure\powershell\DeepLensTenantManager.psm1

# Create tenant (without BYOS configuration)
$tenant = New-DeepLensTenant -Name "vayyari" -Domain "vayyari.com" -PlanType "premium"

# Output:
# ✅ Tenant 'vayyari' created successfully!
#    Database: tenant_vayyari_metadata
#    Storage: minio (default)
#    Plan: premium
```

### Step 2: Provision MinIO with NFS

```powershell
# Tenant provides NFS details
$nfsServer = "nfs.vayyari.com"
$nfsPath = "/exports/deeplens-production"
$fullNFSPath = "${nfsServer}:${nfsPath}"

# Provision MinIO
$minioConfig = New-TenantMinIOStorage `
  -TenantId $tenant.TenantId `
  -TenantName "vayyari" `
  -NFSPath $fullNFSPath
```

### Step 3: Update Tenant Storage Configuration

```powershell
# Update tenant record with MinIO details
Set-TenantStorageConfig `
  -TenantId $tenant.TenantId `
  -StorageProvider 'minio' `
  -Config @{
    endpoint = $minioConfig.APIEndpoint
    access_key = $minioConfig.AccessKey
    secret_key = $minioConfig.SecretKey
    bucket = 'images'
    secure = $false
  }
```

### Step 4: Verify Configuration

```powershell
# Test storage connectivity
Test-DeepLensStorageConfig -TenantId $tenant.TenantId

# Verify MinIO status
Get-TenantMinIOStatus -TenantName "vayyari"
```

### Step 5: Provide Credentials to Tenant

```powershell
Write-Host "`n🎉 Vayyari Tenant Onboarding Complete!" -ForegroundColor Green
Write-Host "`n📋 Tenant Credentials:" -ForegroundColor Cyan
Write-Host "   Tenant ID:        $($tenant.TenantId)" -ForegroundColor White
Write-Host "   Database:         $($tenant.DatabaseName)" -ForegroundColor White
Write-Host "   API Endpoint:     http://deeplens-api.com/api" -ForegroundColor White
Write-Host "`n🗄️ Storage Information:" -ForegroundColor Cyan
Write-Host "   Storage Type:     Managed MinIO" -ForegroundColor White
Write-Host "   Data Location:    $($minioConfig.NFSPath)" -ForegroundColor White
Write-Host "   MinIO Console:    $($minioConfig.ConsoleURL)" -ForegroundColor White
Write-Host "   MinIO Access Key: $($minioConfig.AccessKey)" -ForegroundColor White
Write-Host "   MinIO Secret Key: $($minioConfig.SecretKey)" -ForegroundColor White
Write-Host "   Default Bucket:   images" -ForegroundColor White
Write-Host "`n📊 Plan Details:" -ForegroundColor Cyan
Write-Host "   Plan Type:        premium" -ForegroundColor White
Write-Host "   Storage Quota:    100 GB" -ForegroundColor White
Write-Host "   API Calls/Month:  100,000" -ForegroundColor White
Write-Host "   Collections:      50 max" -ForegroundColor White
```

---

## 📝 Tenant Requirements

### What Tenant Must Provide

1. **NFS Server Information**

   - Hostname or IP address
   - Export path
   - Example: `nfs.vayyari.com:/exports/deeplens-storage`

2. **NFS Server Configuration**

   - Export must be configured and accessible
   - Read/write permissions for Docker host
   - Sufficient storage space based on plan quota

3. **Network Access**
   - NFS server must be reachable from DeepLens infrastructure
   - Firewall rules allowing NFS traffic (port 2049)
   - No VPN required if on same network

### NFS Export Configuration Example

On tenant's NFS server (`/etc/exports`):

```bash
# Allow DeepLens infrastructure to mount
/exports/deeplens-storage    10.0.1.0/24(rw,sync,no_subtree_check,no_root_squash)

# Or allow specific Docker host
/exports/deeplens-storage    deeplens-host.company.com(rw,sync,no_subtree_check)
```

Apply changes:

```bash
sudo exportfs -ra
sudo systemctl restart nfs-server
```

Verify from Docker host:

```bash
showmount -e nfs.vayyari.com
```

---

## 🔍 Troubleshooting

### Issue: NFS Volume Creation Fails

**Error:** `Failed to create NFS volume`

**Solutions:**

1. **Check NFS server accessibility:**

   ```powershell
   Test-Connection nfs.vayyari.com
   ```

2. **Verify NFS export exists:**

   ```bash
   showmount -e nfs.vayyari.com
   ```

3. **Test NFS mount manually:**

   ```bash
   # Linux/macOS
   sudo mount -t nfs nfs.vayyari.com:/exports/deeplens-storage /mnt/test
   ls -la /mnt/test
   sudo umount /mnt/test

   # Windows
   mount -o anon nfs.vayyari.com:/exports/deeplens-storage Z:
   ```

4. **Check firewall rules:**

   ```bash
   # Ensure port 2049 is open
   telnet nfs.vayyari.com 2049
   ```

5. **Try different NFS options:**
   ```powershell
   New-TenantMinIOStorage ... -NFSOptions "rw,sync,nolock"
   ```

### Issue: MinIO Container Not Starting

**Error:** Container starts but immediately stops

**Solutions:**

1. **Check container logs:**

   ```powershell
   docker logs deeplens-minio-vayyari
   ```

2. **Verify NFS mount inside container:**

   ```powershell
   docker exec deeplens-minio-vayyari ls -la /data
   ```

3. **Check disk space on NFS:**

   ```bash
   df -h
   ```

4. **Restart container:**
   ```powershell
   docker restart deeplens-minio-vayyari
   ```

### Issue: Port Already in Use

**Error:** Port 9100 or 9200 already bound

**Solutions:**

1. **Use auto-assignment (default behavior):**
   The function automatically finds available ports starting from 9100/9200

2. **Specify custom ports:**

   ```powershell
   New-TenantMinIOStorage ... -MinIOPort 9500 -ConsolePort 9501
   ```

3. **Find which process is using the port:**
   ```powershell
   netstat -ano | findstr :9100
   ```

### Issue: Cannot Access MinIO Console

**Error:** Console URL not accessible

**Solutions:**

1. **Check container health:**

   ```powershell
   docker ps | findstr minio
   docker inspect deeplens-minio-vayyari --format='{{.State.Health.Status}}'
   ```

2. **Verify port mapping:**

   ```powershell
   docker port deeplens-minio-vayyari
   ```

3. **Check firewall (if remote access):**

   ```powershell
   Test-NetConnection -ComputerName localhost -Port 9200
   ```

4. **Access via API endpoint:**
   ```powershell
   curl http://localhost:9100/minio/health/live
   ```

### Issue: NFS Permission Denied

**Error:** Permission denied when writing to NFS

**Solutions:**

1. **Check NFS export options:**

   - Ensure `no_root_squash` is set
   - Verify UID/GID mapping

2. **Check directory permissions on NFS server:**

   ```bash
   ls -la /exports/deeplens-storage
   chmod 777 /exports/deeplens-storage  # Or appropriate permissions
   ```

3. **Test with relaxed NFS options:**
   ```powershell
   New-TenantMinIOStorage ... -NFSOptions "rw,sync,no_root_squash"
   ```

---

## 🔒 Security Considerations

### Credentials Management

- **Auto-generated Access Keys:** Format `tenant-<name>-<random>`
- **Auto-generated Secret Keys:** 32-byte cryptographically secure random keys
- **Storage:** Credentials should be stored in platform database (encrypted)
- **Rotation:** Implement regular credential rotation policy

### Network Security

- **Container Network:** All MinIO instances on `deeplens-network`
- **Port Exposure:** Ports exposed only on localhost by default
- **TLS:** Enable HTTPS for production (configure reverse proxy)
- **Firewall:** Restrict NFS access to Docker host only

### Data Security

- **Tenant Isolation:** Each tenant has dedicated container and volume
- **NFS Security:** Data at rest security controlled by NFS server
- **Encryption in Transit:** Enable TLS on MinIO for production
- **Access Control:** MinIO bucket policies for fine-grained access

### Best Practices

1. **Use HTTPS:** Configure reverse proxy (nginx/traefik) with TLS
2. **Strong Credentials:** Never use custom weak passwords
3. **Regular Updates:** Keep MinIO images updated
4. **Monitoring:** Enable MinIO audit logs and Prometheus metrics
5. **Backup:** Tenant responsible for NFS data backups
6. **Network Segmentation:** Isolate NFS network from public internet

---

## 📊 Monitoring & Management

### Health Checks

```powershell
# Check specific tenant MinIO
Get-TenantMinIOStatus -TenantName "vayyari"

# List all tenant MinIO instances
Get-AllTenantMinIOInstances

# Check container health directly
docker inspect deeplens-minio-vayyari --format='{{.State.Health.Status}}'

# View health check logs
docker inspect deeplens-minio-vayyari --format='{{json .State.Health}}' | ConvertFrom-Json
```

### Resource Monitoring

```powershell
# Container resource usage
docker stats deeplens-minio-vayyari --no-stream

# Disk usage on NFS
docker exec deeplens-minio-vayyari df -h /data
```

### MinIO Metrics

MinIO provides Prometheus metrics at `http://localhost:<port>/minio/v2/metrics/cluster`:

```powershell
# Access MinIO metrics
curl http://localhost:9100/minio/v2/metrics/cluster
```

**Key Metrics:**

- `minio_s3_requests_total` - Total S3 API requests
- `minio_s3_errors_total` - S3 API errors
- `minio_bucket_usage_total_bytes` - Bucket size
- `minio_bucket_objects_count` - Object count

### Integrate with Platform Monitoring

Add to `config/prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: "tenant-minio"
    static_configs:
      - targets:
          - "localhost:9100" # Tenant A
          - "localhost:9101" # Tenant B
          - "localhost:9102" # Tenant C
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
```

---

## 🔄 Maintenance Operations

### Backup

**Important:** Data is stored on tenant's NFS server. Backup strategy is tenant's responsibility.

```bash
# Example: NFS server-side backup
rsync -avz /exports/deeplens-storage /backups/deeplens-storage-$(date +%Y%m%d)
```

### Upgrade MinIO Version

```powershell
# Pull latest MinIO image
docker pull minio/minio:latest

# Stop and remove old container
docker stop deeplens-minio-vayyari
docker rm deeplens-minio-vayyari

# Recreate with same configuration (volume persists)
New-TenantMinIOStorage `
  -TenantId "<tenant-id>" `
  -TenantName "vayyari" `
  -NFSPath "nfs.vayyari.com:/exports/deeplens-storage" `
  -AccessKey "<existing-access-key>" `
  -SecretKey "<existing-secret-key>"
```

### Migrate to Different NFS Path

```powershell
# 1. Stop and remove current MinIO
Remove-TenantMinIOStorage -TenantName "vayyari" -RemoveVolume -Confirm

# 2. Tenant migrates data on NFS side
# rsync old-path new-path

# 3. Provision with new NFS path
New-TenantMinIOStorage `
  -TenantId "<tenant-id>" `
  -TenantName "vayyari" `
  -NFSPath "nfs.vayyari.com:/exports/new-deeplens-storage"
```

---

## 📚 Additional Resources

- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
- [Docker NFS Volumes](https://docs.docker.com/storage/volumes/#use-a-volume-driver)
- [NFS Best Practices](https://wiki.linux-nfs.org/wiki/index.php/NFS_Best_Practices)
- [DeepLens Tenant Management](README-TENANT-MANAGEMENT.md)
- [DeepLens Infrastructure Guide](README.md)

---

## 🎯 Summary

| Feature           | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| **Purpose**       | Provide managed storage for tenants with NFS infrastructure |
| **Isolation**     | Dedicated MinIO container per tenant                        |
| **Data Location** | Tenant's NFS server (full control)                          |
| **Management**    | DeepLens provisions and maintains MinIO lifecycle           |
| **Security**      | Auto-generated credentials, container isolation             |
| **Networking**    | Connected to `deeplens-network`, localhost exposure         |
| **Monitoring**    | Health checks, Prometheus metrics, container stats          |
| **Scalability**   | Unlimited tenants (port auto-assignment)                    |

---

**Last Updated:** December 16, 2025  
**Version:** 1.0.0  
**Maintainer:** DeepLens Infrastructure Team

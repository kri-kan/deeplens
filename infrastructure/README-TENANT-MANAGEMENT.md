# DeepLens Multi-Tenant Management

This directory contains the complete multi-tenant management system for DeepLens, providing database isolation, storage configuration, and tenant provisioning capabilities.

## 🏗️ Architecture Overview

### Multi-Tenant Data Separation

**Platform Database (`deeplens_platform`)**

- Tenant registry and metadata
- Storage configurations (encrypted)
- API usage tracking
- Platform-wide settings

**Tenant Template Database (`tenant_metadata_template`)**

- Template for new tenant databases
- Contains schema for image collections, search analytics, user preferences
- Cloned for each new tenant with Row Level Security (RLS)

**Identity Database (`nextgen_identity`)**

- Shared authentication service (NextGen Identity)
- User accounts, roles, and permissions
- Multi-tenant user isolation

### Storage Strategy

DeepLens supports **three storage models** per tenant:

#### 1. BYOS (Bring Your Own Storage) ⭐ Recommended for Enterprise

Tenant provides their own cloud storage credentials:
- **Azure Blob Storage**: Enterprise-grade cloud storage
- **AWS S3**: Scalable object storage  
- **Google Cloud Storage**: Multi-regional storage
- **NFS/SMB**: Network file system shares

**Benefits:**
- ✅ Data sovereignty - tenant owns their data
- ✅ Compliance - meets regulatory requirements
- ✅ Cost control - tenant pays storage directly
- ✅ Integration - works with existing infrastructure

**DeepLens provisions:** Database + Qdrant only  
**Tenant provides:** Storage credentials via Admin Portal

#### 2. DeepLens-Provisioned Storage 🔒 Isolated per Tenant

Each tenant gets a **dedicated MinIO instance**:
- Separate container per tenant
- Unique ports (auto-assigned)
- Isolated storage volumes
- Independent credentials
- Full resource isolation

**Benefits:**
- ✅ Complete isolation - no shared resources
- ✅ Simple setup - fully automated
- ✅ Managed by DeepLens - backups, monitoring
- ✅ No cloud accounts needed

**DeepLens provisions:** Database + Qdrant + Dedicated MinIO

#### 3. None (Manual Configuration)

Skip storage provisioning during initial setup, configure later manually.

### What Gets Provisioned

| Component | Shared | Per-Tenant | Purpose |
|-----------|--------|------------|---------|
| PostgreSQL | ✅ | Database per tenant | Metadata storage |
| Qdrant | ❌ | Dedicated instance | Vector search isolation |
| MinIO | ❌ | Optional (if DeepLens storage) | Object storage |
| Backups | ❌ | Dedicated container | Automated backups |

## 📁 Directory Structure

```
infrastructure/
├── init-scripts/postgres/
│   ├── 01-init-databases.sql        # Database initialization
│   └── 02-tenant-provisioning.sql   # Tenant management functions
├── powershell/
│   └── DeepLensTenantManager.psm1   # PowerShell management module
└── README-TENANT-MANAGEMENT.md      # This file
```

## 🚀 Quick Start

### 1. Initialize Infrastructure

```powershell
# Start core infrastructure (PostgreSQL, Redis, Qdrant, MinIO)
cd infrastructure
# See README-PODMAN-SETUP.md for infrastructure setup
```

### 2. Provision Your First Tenant

#### Interactive Mode (Recommended)

```powershell
# Script will prompt for storage choice
.\provision-tenant.ps1 -TenantName "acme-corp"

# Choose option:
# [1] BYOS - Tenant provides Azure/AWS/GCS credentials
# [2] DeepLens-Provisioned - Dedicated MinIO instance
# [3] None - Skip storage, configure later
```

#### Option 1: BYOS (Bring Your Own Storage)

```powershell
# Provision tenant with BYOS model
.\provision-tenant.ps1 -TenantName "enterprise-client" -StorageType "BYOS"

# Then configure storage in Admin Portal:
# - Navigate to Tenants → enterprise-client → Storage
# - Enter Azure/AWS/GCS credentials
# - Test connection
```

**What gets created:**
- ✅ Database: `tenant_enterprise-client_metadata`
- ✅ Qdrant: Dedicated instance on auto-assigned ports
- ✅ Backup: Daily automated backups
- ❌ Storage: Tenant configures their own

#### Option 2: DeepLens-Provisioned Storage

```powershell
# Provision tenant with dedicated MinIO
.\provision-tenant.ps1 -TenantName "startup-co" -StorageType "DeepLens"

# MinIO credentials saved to:
# C:\productivity\deeplensData\tenants\startup-co\minio-credentials.txt
```

**What gets created:**
- ✅ Database: `tenant_startup-co_metadata`  
- ✅ Qdrant: Dedicated instance on auto-assigned ports
- ✅ MinIO: Dedicated instance with unique credentials
- ✅ Backup: Daily automated backups

**Ports auto-assigned:**
- Qdrant HTTP: 6333, 6335, 6337, ... (incremental)
- Qdrant gRPC: 6334, 6336, 6338, ...
- MinIO API: 9000, 9002, 9004, ...
- MinIO Console: 9001, 9003, 9005, ...

#### Option 3: No Storage (Manual Configuration)

```powershell
# Skip storage provisioning
.\provision-tenant.ps1 -TenantName "test-tenant" -StorageType "None"
```

### 3. Verify Tenant Setup

```powershell
# Check all containers
podman ps --filter "label=tenant=acme-corp"

# Test Qdrant
Invoke-WebRequest -Uri "http://localhost:6335/dashboard" -UseBasicParsing

# Test MinIO (if DeepLens-provisioned)
Invoke-WebRequest -Uri "http://localhost:9002" -UseBasicParsing

# Check database
podman exec deeplens-postgres psql -U postgres -c "\l" | Select-String "tenant_"
```

### 4. Remove a Tenant

```powershell
# Complete cleanup - removes all resources
.\provision-tenant.ps1 -TenantName "old-tenant" -Remove

# Removes:
# - Qdrant container and volume
# - MinIO container and volume (if exists)
# - Backup container
# - PostgreSQL database
# - All data directories
```

## 🗄️ Database Schema

### Platform Tables

#### `tenants`

- Tenant registry with plan types and usage limits
- Domain and subdomain mapping
- Activity status and metadata

#### `tenant_storage_configs`

- BYOS storage configurations (encrypted)
- Provider-specific settings
- Connection test status and results

#### `tenant_databases`

- Registry of tenant-specific databases
- Connection strings and metadata
- Database type mapping (metadata, vectors, cache)

#### `api_usage_logs`

- Cross-tenant API usage tracking
- Performance metrics and quotas
- Billing and analytics data

### Tenant Tables (Template)

#### `image_collections`

- Tenant-specific image collections
- User-created organization structures
- Collection metadata and settings

#### `images`

- Image registry with tenant isolation
- Storage paths in tenant's BYOS
- Processing status and AI analysis
- Checksums and deduplication

#### `search_sessions` & `search_queries`

- Analytics for search behavior
- Performance optimization data
- User experience metrics

#### `user_preferences`

- Tenant-specific user settings
- Customization and preferences
- Feature flags and configurations

#### `usage_statistics`

- Tenant usage metrics
- Storage consumption tracking
- API call statistics

## 🔒 Security Features

### Row Level Security (RLS)

- Automatic tenant data isolation
- Policy-based access control
- Context-aware filtering

### Encrypted Storage Configurations

- Storage credentials encrypted at rest
- PostgreSQL `pgcrypto` extension
- Configurable encryption keys

### Database User Separation

- `platform_service`: Platform management operations
- `tenant_service`: Tenant data access with RLS
- Minimal privilege principles

## 📊 Plan Types and Limits

### Free Tier

- **Storage**: 1 GB
- **API Calls**: 1,000/month
- **Collections**: 5 maximum
- **Support**: Community

### Premium Tier

- **Storage**: 100 GB
- **API Calls**: 100,000/month
- **Collections**: 50 maximum
- **Support**: Email

### Enterprise Tier

- **Storage**: 1,000 GB
- **API Calls**: 1,000,000/month
- **Collections**: 500 maximum
- **Support**: Dedicated

## 🔧 Storage Provider Configuration

### Azure Blob Storage

```json
{
  "connection_string": "DefaultEndpointsProtocol=https;AccountName=account;AccountKey=key;EndpointSuffix=core.windows.net",
  "container": "images",
  "cdn_endpoint": "https://account.azureedge.net" // optional
}
```

### AWS S3

```json
{
  "access_key": "AKIAIOSFODNN7EXAMPLE",
  "secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "region": "us-west-2",
  "bucket": "tenant-images",
  "cloudfront_domain": "d123456789.cloudfront.net" // optional
}
```

### Google Cloud Storage

```json
{
  "service_account_key": "{...json key...}",
  "bucket": "tenant-images",
  "project_id": "my-project-123",
  "cdn_domain": "storage.googleapis.com" // optional
}
```

### MinIO (BYOS - Tenant-Managed)

When tenant provides their own MinIO instance:

```json
{
  "endpoint": "https://minio.company.com:9000",
  "access_key": "minioadmin",
  "secret_key": "minioadmin",
  "bucket": "tenant-images",
  "secure": true
}
```

### NFS/SMB Network Storage

```json
{
  "mount_path": "/mnt/tenant-storage",
  "share_path": "//server/tenant-images",
  "username": "storageuser",
  "password": "securepassword",
  "protocol": "nfs" // or "smb"
}
```

---

## 🗄️ Platform-Managed MinIO Storage

For tenants who don't have cloud storage (Azure/AWS/GCS) but have existing NFS infrastructure, DeepLens can provision dedicated MinIO instances. This provides a middle ground between full BYOS and shared storage.

### Use Cases

- **Enterprise customers with on-premise NFS storage**
- **Customers wanting data sovereignty without cloud costs**
- **Development/testing environments with local NFS**
- **Customers transitioning from on-premise to cloud**

### Architecture

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

### Provision Platform-Managed MinIO

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
```

### Platform-Managed MinIO Functions

#### New-TenantMinIOStorage

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
```

#### Get-TenantMinIOStatus

Retrieves status and configuration of a tenant's MinIO instance.

```powershell
Get-TenantMinIOStatus -TenantName "vayyari"
```

**Output:**

```
📊 MinIO Status for Tenant: vayyari
   Container:      deeplens-minio-vayyari
   Status:         running
   Health:         healthy
   API Endpoint:   http://localhost:9100
   Console URL:    http://localhost:9200
   NFS Backend:    nfs.vayyari.com:/exports/deeplens-storage
```

#### Get-AllTenantMinIOInstances

Lists all tenant MinIO instances across the platform.

```powershell
Get-AllTenantMinIOInstances
```

#### Remove-TenantMinIOStorage

Removes a tenant's MinIO instance and optionally the NFS volume.

```powershell
# Remove container only (NFS volume remains)
Remove-TenantMinIOStorage -TenantName "customer" -Confirm

# Remove container and unmount NFS volume
Remove-TenantMinIOStorage -TenantName "customer" -RemoveVolume -Confirm
```

⚠️ **Note:** Removing the volume only unmounts the NFS share from Docker. The data on the NFS server remains intact.

### Tenant NFS Requirements

**NFS Server Setup:**

- Running NFS server (Linux: `nfs-kernel-server`, Windows: NFS Server role)
- Exported file system accessible from Docker host
- Adequate storage space (estimate: 100GB+ per tenant)
- Network connectivity from Docker host

**NFS Export Configuration Example (Linux):**

```bash
# /etc/exports
/exports/tenant-vayyari 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)
```

**Testing NFS Access:**

```powershell
# Mount test (Linux/Mac)
sudo mount -t nfs nfs-server.company.com:/exports/vayyari/backups /mnt/test

# Windows
mount -o anon \\nfs-server.company.com\exports\vayyari\backups Z:
```

---

## 🚀 API Integration

### Setting Tenant Context

```csharp
// In your .NET application
using (var connection = new NpgsqlConnection(tenantConnectionString))
{
    await connection.OpenAsync();

    // Set tenant context for RLS
    using var cmd = new NpgsqlCommand("SELECT set_tenant_context(@tenant_id)", connection);
    cmd.Parameters.AddWithValue("tenant_id", tenantId);
    await cmd.ExecuteNonQueryAsync();

    // All subsequent queries will be filtered by tenant_id
    var collections = await GetImageCollections(connection);
}
```

### Storage Factory Pattern

```csharp
public interface ITenantStorageFactory
{
    Task<IStorageProvider> CreateStorageProviderAsync(Guid tenantId);
}

public class TenantStorageFactory : ITenantStorageFactory
{
    public async Task<IStorageProvider> CreateStorageProviderAsync(Guid tenantId)
    {
        var config = await GetTenantStorageConfigAsync(tenantId);

        return config.Provider switch
        {
            "azure_blob" => new AzureBlobStorageProvider(config.Configuration),
            "aws_s3" => new AwsS3StorageProvider(config.Configuration),
            "gcs" => new GoogleCloudStorageProvider(config.Configuration),
            "minio" => new MinIOStorageProvider(config.Configuration),
            "nfs" => new NetworkFileStorageProvider(config.Configuration),
            _ => throw new NotSupportedException($"Storage provider '{config.Provider}' not supported")
        };
    }
}
```

## 📈 Monitoring and Analytics

### Platform Metrics

- Total tenant count by plan type
- Storage usage across all tenants
- API call distribution and performance
- Database performance metrics

### Tenant Metrics

- Individual tenant storage consumption
- Search query patterns and performance
- User activity and engagement
- Image processing statistics

### Grafana Dashboards

- Platform overview dashboard
- Tenant-specific performance dashboard
- Storage utilization trends
- API performance metrics

---

## 📋 Complete Examples

### Example 1: SaaS Company with BYOS

```powershell
# Enterprise client brings Azure Blob Storage
.\provision-tenant.ps1 -TenantName "contoso" -StorageType "BYOS"

# Result:
# - Database: tenant_contoso_metadata @ PostgreSQL
# - Qdrant: http://localhost:6335 (dedicated)
# - Storage: Configured by tenant in Admin Portal
# - Backups: Daily at 2 AM

# Tenant configures in portal:
# Provider: Azure Blob
# Connection: DefaultEndpointsProtocol=https;AccountName=contoso...
# Container: deeplens-images
```

### Example 2: Development/Testing Environment

```powershell
# Quick setup with DeepLens-managed storage
.\provision-tenant.ps1 -TenantName "dev-team" -StorageType "DeepLens"

# Result:
# - Database: tenant_dev-team_metadata
# - Qdrant: http://localhost:6337 (dedicated)
# - MinIO: http://localhost:9004 (API), :9005 (Console)
# - Credentials: C:\productivity\deeplensData\tenants\dev-team\minio-credentials.txt
# - Backups: Daily at 2 AM

# Access MinIO Console
Start-Process "http://localhost:9005"
# Login with credentials from minio-credentials.txt
```

### Example 3: Multiple Tenants - Mixed Storage

```powershell
# Provision 3 tenants with different storage strategies

# Tenant 1: Enterprise BYOS (AWS S3)
.\provision-tenant.ps1 -TenantName "acme" -StorageType "BYOS"

# Tenant 2: Startup with DeepLens storage
.\provision-tenant.ps1 -TenantName "startup" -StorageType "DeepLens"

# Tenant 3: Demo/POC without storage
.\provision-tenant.ps1 -TenantName "demo" -StorageType "None"

# Result:
podman ps --format "table {{.Names}}\t{{.Ports}}"
# deeplens-qdrant-acme       6335-6336
# deeplens-qdrant-startup    6337-6338
# deeplens-minio-startup     9004-9005
# deeplens-qdrant-demo       6339-6340
```

### Example 4: Interactive Provisioning

```powershell
# Let the script prompt for options
.\provision-tenant.ps1 -TenantName "vayyari"

# Output:
# ========================================
#  Storage Configuration
# ========================================
# 
# Choose storage option for tenant 'vayyari':
# 
#   [1] BYOS (Bring Your Own Storage)
#       Tenant provides Azure/AWS/GCS credentials
#       No DeepLens infrastructure provisioned
# 
#   [2] DeepLens-Provisioned Storage
#       Dedicated MinIO instance for this tenant
#       Fully isolated, managed by DeepLens
# 
#   [3] None (Skip storage provisioning)
#       Configure storage later manually
# 
# Enter choice (1-3):
```

---

## 🔄 Backup and Recovery

### Database Backup Strategy

```bash
# Platform database backup
pg_dump -h localhost -U platform_service deeplens_platform > platform_backup.sql

# Tenant database backup (per tenant)
pg_dump -h localhost -U tenant_service tenant_acme_corp_metadata > tenant_backup.sql

# Template database backup
pg_dump -h localhost -U postgres tenant_metadata_template > template_backup.sql
```

### Storage Backup

- Each tenant manages their own storage backups
- Platform provides backup status monitoring
- Integration with cloud provider backup services

## 🔧 Troubleshooting

### Common Issues

#### Tenant Creation Fails

```powershell
# Check database connectivity
Test-Connection -ComputerName localhost -Port 5432

# Verify database permissions
Get-DeepLensTenant  # Should not error

# Check encryption key
$env:DEEPLENS_ENCRYPTION_KEY
```

#### Storage Configuration Test Fails

```powershell
# Test specific tenant storage
Test-DeepLensStorageConfig -TenantId "tenant-id-here"

# Check storage provider credentials
# Verify network connectivity to storage endpoints
```

#### RLS Not Working

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

-- Verify tenant context
SELECT current_setting('app.current_tenant_id', true);

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'images';
```

### Performance Optimization

#### Database Indexing

- All tenant tables have tenant_id indexes
- Composite indexes for common query patterns
- Regular ANALYZE and VACUUM operations

#### Connection Pooling

- Use connection pooling for tenant databases
- Separate connection pools per tenant
- Monitor connection usage and limits

## 📚 Additional Resources

- [PostgreSQL Row Level Security Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Multi-Tenant Architecture Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/)
- [BYOS Implementation Best Practices](https://cloud.google.com/architecture/saas-tenant-isolation-strategies)

## 🤝 Contributing

When adding new tenant features:

1. **Update Template Database**: Add tables to `tenant_metadata_template`
2. **Add RLS Policies**: Ensure proper tenant isolation
3. **Update Management Functions**: Extend provisioning scripts
4. **Test Isolation**: Verify data separation between tenants
5. **Document Changes**: Update this README and API documentation

## 📞 Support

For technical support with the multi-tenant system:

- Review the troubleshooting section above
- Check application logs and database query logs
- Verify tenant isolation with test queries
- Monitor storage provider connectivity and credentials

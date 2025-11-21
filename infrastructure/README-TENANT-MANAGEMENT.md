# DeepLens Multi-Tenant Management

This directory contains the complete multi-tenant management system for DeepLens, providing database isolation, storage configuration (BYOS), and tenant provisioning capabilities.

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

**Identity Database (`deeplens_identity`)**

- Shared authentication service (NextGen Identity)
- User accounts, roles, and permissions
- Multi-tenant user isolation

### Bring Your Own Storage (BYOS)

Each tenant can configure their own storage provider:

- **Azure Blob Storage**: Enterprise-grade cloud storage
- **AWS S3**: Scalable object storage
- **Google Cloud Storage**: Multi-regional storage
- **MinIO**: Self-hosted S3-compatible storage
- **NFS/SMB**: Network file system shares

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
# Start the infrastructure
docker-compose up -d

# Import the management module
Import-Module .\infrastructure\powershell\DeepLensTenantManager.psm1

# Check platform status
Show-DeepLensStatus
```

### 2. Create Your First Tenant

```powershell
# Create a tenant with MinIO storage (default)
New-DeepLensTenant -Name "acme-corp" -Domain "acme.com" -PlanType "premium"

# Create a tenant with Azure Blob Storage
New-DeepLensTenant -Name "enterprise-client" -Domain "enterprise.com" -PlanType "enterprise" -StorageProvider "azure_blob" -StorageConfig @{
    connection_string = "DefaultEndpointsProtocol=https;AccountName=storage;AccountKey=key;EndpointSuffix=core.windows.net"
    container = "images"
}

# Create a tenant with AWS S3
New-DeepLensTenant -Name "startup-co" -PlanType "free" -StorageProvider "aws_s3" -StorageConfig @{
    access_key = "AKIAIOSFODNN7EXAMPLE"
    secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    region = "us-west-2"
    bucket = "deeplens-startup-images"
}
```

### 3. Manage Tenants

```powershell
# List all tenants
Get-DeepLensTenant

# Get detailed tenant information
Get-DeepLensTenant -TenantId "12345678-1234-1234-1234-123456789012"

# Test tenant storage configuration
Test-DeepLensStorageConfig -TenantId "12345678-1234-1234-1234-123456789012"

# Remove a tenant (with confirmation)
Remove-DeepLensTenant -TenantId "12345678-1234-1234-1234-123456789012" -Confirm
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

### MinIO (Self-Hosted)

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

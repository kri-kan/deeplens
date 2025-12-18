# MinIO Multi-Tenancy Architecture

**Last Updated:** December 18, 2025  
**Architecture:** Single Instance with Bucket-Based Isolation

---

## Overview

DeepLens uses a **single MinIO instance** to serve all tenants with bucket-based isolation, following industry best practices for S3-compatible object storage multi-tenancy.

### Why Single Instance?

✅ **Resource Efficient** - One service instead of N services  
✅ **Industry Standard** - How AWS S3, Azure Blob, GCS work  
✅ **Simpler Operations** - One service to monitor, backup, scale  
✅ **Better Performance** - MinIO optimized for multi-bucket workloads  
✅ **Cost Effective** - Lower memory and CPU overhead

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    MinIO Instance                       │
│                   (localhost:9000)                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │  deeplens-admin  │  │ deeplens-tenant1 │           │
│  │                  │  │                  │           │
│  │  - images/       │  │  - images/       │           │
│  │  - documents/    │  │  - documents/    │           │
│  │  - videos/       │  │  - vectors/      │           │
│  └──────────────────┘  └──────────────────┘           │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │ deeplens-tenant2 │  │ deeplens-tenant3 │           │
│  │                  │  │                  │           │
│  │  - images/       │  │  - images/       │           │
│  │  - documents/    │  │  - exports/      │           │
│  └──────────────────┘  └──────────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
         ▲                           ▲
         │                           │
    Admin Access               Tenant Access
    (Full Control)          (Bucket-Restricted)
```

---

## Tenant Isolation Strategy

### 1. Bucket Isolation

Each tenant gets a dedicated bucket with naming convention:

```
deeplens-{tenant-slug}
```

**Examples:**

- `deeplens-admin` - System administration bucket
- `deeplens-acme` - ACME Corporation tenant
- `deeplens-contoso` - Contoso Ltd tenant

### 2. IAM User Per Tenant

Each tenant has unique access credentials:

```
User: {tenant-slug}-access
Access Key: {tenant}-{random-16-chars}
Secret Key: {securely-generated-64-chars}
```

### 3. Bucket Policies

Enforce tenant-only access via IAM policies:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": ["arn:aws:s3:::deeplens-acme", "arn:aws:s3:::deeplens-acme/*"]
    }
  ]
}
```

### 4. Access Key Restrictions

- Tenant users can **only** access their bucket
- No cross-tenant visibility
- Admin user has full access to all buckets

---

## Setup Instructions

### 1. Start MinIO Container

```powershell
podman run -d --name deeplens-minio `
  -p 9000:9000 -p 9001:9001 `
  -e MINIO_ROOT_USER=admin `
  -e MINIO_ROOT_PASSWORD=DeepLensPassword123 `
  -v deeplens-minio-data:/data `
  minio/minio server /data --console-address ":9001"
```

**Verification:**

```powershell
# Check container is running
podman ps | Select-String "deeplens-minio"

# Access MinIO Console
Start-Process "http://localhost:9001"
# Login: admin / DeepLensPassword123
```

---

### 2. Install MinIO Client (mc)

**Windows (Chocolatey):**

```powershell
choco install minio-client
```

**Windows (Manual):**

```powershell
Invoke-WebRequest -Uri "https://dl.min.io/client/mc/release/windows-amd64/mc.exe" -OutFile "mc.exe"
```

**Linux/Mac:**

```bash
curl https://dl.min.io/client/mc/release/linux-amd64/mc \
  --create-dirs \
  -o $HOME/minio-binaries/mc
chmod +x $HOME/minio-binaries/mc
```

---

### 3. Configure MinIO Alias

```bash
# Add alias for local MinIO
mc alias set deeplens http://localhost:9000 admin DeepLensPassword123

# Test connection
mc admin info deeplens
```

---

### 4. Provision New Tenant

**Automated Script (Recommended):**

```powershell
# infrastructure/provision-tenant-minio.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$TenantSlug
)

$BucketName = "deeplens-$TenantSlug"
$UserName = "$TenantSlug-access"
$AccessKey = "$TenantSlug-$(New-Guid | Select-Object -ExpandProperty Guid | Select-Object -First 8)"
$SecretKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Create bucket
mc mb "deeplens/$BucketName"

# Create IAM user
mc admin user add deeplens $UserName $SecretKey

# Create policy for tenant
$PolicyJson = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": ["arn:aws:s3:::$BucketName", "arn:aws:s3:::$BucketName/*"]
    }
  ]
}
"@

$PolicyJson | Out-File -FilePath "policy-$TenantSlug.json"
mc admin policy create deeplens "$TenantSlug-policy" "policy-$TenantSlug.json"

# Attach policy to user
mc admin policy attach deeplens "$TenantSlug-policy" --user=$UserName

Write-Host "✓ Tenant provisioned successfully" -ForegroundColor Green
Write-Host "Bucket: $BucketName"
Write-Host "User: $UserName"
Write-Host "Access Key: $AccessKey"
Write-Host "Secret Key: $SecretKey"
```

**Manual Steps:**

```bash
# 1. Create bucket
mc mb deeplens/deeplens-acme

# 2. Create tenant user
mc admin user add deeplens acme-access SecurePassword123

# 3. Create policy file (acme-policy.json)
cat > acme-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": [
        "arn:aws:s3:::deeplens-acme",
        "arn:aws:s3:::deeplens-acme/*"
      ]
    }
  ]
}
EOF

# 4. Create policy in MinIO
mc admin policy create deeplens acme-policy acme-policy.json

# 5. Attach policy to user
mc admin policy attach deeplens acme-policy --user=acme-access

# 6. Verify
mc admin user info deeplens acme-access
```

---

## Application Integration

### Connection Configuration

**In Tenant Entity:**

```csharp
public class Tenant
{
    // MinIO Configuration
    public string MinioEndpoint { get; set; } = "localhost:9000";
    public string MinioBucketName { get; set; } // e.g., "deeplens-acme"
    public string MinioAccessKey { get; set; } // Tenant-specific
    public string MinioSecretKey { get; set; } // Tenant-specific
    public bool MinioUseSSL { get; set; } = false; // true in production
}
```

**Creating MinIO Client:**

```csharp
using Minio;
using Minio.DataModel.Args;

public class MinioService
{
    private readonly IMinioClient _minioClient;

    public MinioService(Tenant tenant)
    {
        _minioClient = new MinioClient()
            .WithEndpoint(tenant.MinioEndpoint)
            .WithCredentials(tenant.MinioAccessKey, tenant.MinioSecretKey)
            .WithSSL(tenant.MinioUseSSL)
            .Build();
    }

    public async Task UploadImageAsync(string objectName, Stream imageStream, string contentType)
    {
        var bucket = tenant.MinioBucketName;

        // Ensure bucket exists
        var bucketExists = await _minioClient.BucketExistsAsync(
            new BucketExistsArgs().WithBucket(bucket));

        if (!bucketExists)
        {
            throw new InvalidOperationException($"Bucket {bucket} does not exist");
        }

        // Upload object
        await _minioClient.PutObjectAsync(
            new PutObjectArgs()
                .WithBucket(bucket)
                .WithObject(objectName)
                .WithStreamData(imageStream)
                .WithObjectSize(imageStream.Length)
                .WithContentType(contentType));
    }
}
```

---

## Security Best Practices

### 1. Access Key Rotation

```bash
# Generate new credentials
mc admin user info deeplens acme-access

# Update secret key
mc admin user disable deeplens acme-access
mc admin user enable deeplens acme-access --secret-key NewSecurePassword456

# Update in database
UPDATE tenants
SET minio_secret_key = 'NewSecurePassword456'
WHERE slug = 'acme';
```

### 2. Encryption at Rest

```bash
# Enable server-side encryption
mc encrypt set sse-s3 deeplens/deeplens-acme
```

### 3. Versioning

```bash
# Enable versioning for bucket
mc version enable deeplens/deeplens-acme
```

### 4. Lifecycle Policies

```bash
# Auto-delete old versions after 90 days
mc ilm add deeplens/deeplens-acme \
  --expiry-days 90 \
  --noncurrent-expire-days 30
```

---

## Monitoring & Operations

### Health Check

```bash
# MinIO server health
mc admin info deeplens

# Check specific bucket
mc du deeplens/deeplens-acme
```

### Usage Metrics

```bash
# List all buckets with sizes
mc du --recursive deeplens

# Get bucket statistics
mc admin prometheus metrics deeplens
```

### Backup Strategy

```bash
# Backup specific tenant bucket
mc mirror deeplens/deeplens-acme /backup/acme/$(date +%Y%m%d)

# Restore tenant bucket
mc mirror /backup/acme/20251218 deeplens/deeplens-acme
```

---

## Migration from Per-Tenant Instances

If you previously had separate MinIO instances per tenant:

```bash
# 1. Create bucket in shared instance
mc mb deeplens/deeplens-tenant1

# 2. Copy data from old instance
mc mirror old-minio/tenant1-bucket deeplens/deeplens-tenant1

# 3. Update application configuration
# Change endpoint from localhost:9002 → localhost:9000
# Change bucket name to deeplens-tenant1

# 4. Verify data
mc ls deeplens/deeplens-tenant1

# 5. Stop old instance
podman stop tenant1-minio
podman rm tenant1-minio
```

---

## Troubleshooting

### Access Denied Errors

```bash
# Check user policy
mc admin user info deeplens tenant-access

# Verify policy attachment
mc admin policy entities deeplens tenant-policy

# Test access with tenant credentials
mc alias set tenant http://localhost:9000 tenant-access SecretKey123
mc ls tenant/deeplens-tenant1
```

### Bucket Not Found

```bash
# List all buckets (admin)
mc ls deeplens

# Create missing bucket
mc mb deeplens/deeplens-newtenent

# Set permissions
mc admin policy attach deeplens tenant-policy --user=newtenent-access
```

---

## Performance Considerations

### Single Instance Limits

- **Buckets:** No practical limit (millions)
- **Objects per Bucket:** Unlimited
- **Concurrent Connections:** 10,000+ (depends on hardware)
- **Throughput:** Limited by network and disk I/O

### When to Scale

- Consider **MinIO cluster** (distributed mode) when:
  - Storage exceeds single server capacity (10TB+)
  - Need high availability (multiple servers)
  - Throughput requirements > 10 Gbps

---

## References

- [MinIO Multi-Tenancy Guide](https://min.io/docs/minio/linux/administration/identity-access-management/policy-based-access-control.html)
- [MinIO IAM Policies](https://min.io/docs/minio/linux/administration/identity-access-management/iam-overview.html)
- [MinIO Client (mc) Documentation](https://min.io/docs/minio/linux/reference/minio-mc.html)

---

**Note:** This architecture is production-ready and follows MinIO's recommended multi-tenancy patterns.

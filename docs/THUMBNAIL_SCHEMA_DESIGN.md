# Database Schema for Thumbnail Specifications

## Design Approach: JSON Storage for Flexibility

Instead of creating separate columns for each format's attributes, we use **JSON columns** in PostgreSQL to store the complex `ThumbnailSpecification` objects. This provides maximum flexibility without schema migrations when adding new formats.

## Schema Design

### Tenants Table

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,

    -- Storage Configuration (JSON)
    storage_config JSONB NOT NULL DEFAULT '{
        "provider": "MinIO",
        "connectionString": "",
        "bucketName": "",
        "region": "us-east-1",
        "enableEncryption": true
    }'::jsonb,

    -- Thumbnail Configuration (JSON with array of specifications)
    thumbnail_config JSONB NOT NULL DEFAULT '{
        "enabled": true,
        "specifications": [
            {
                "name": "small",
                "maxWidth": 150,
                "maxHeight": 150,
                "format": "WebP",
                "fitMode": "Inside",
                "stripMetadata": true,
                "backgroundColor": "#FFFFFF",
                "options": {
                    "webP": {
                        "quality": 80,
                        "lossless": false,
                        "method": 4,
                        "alphaQuality": 90
                    }
                }
            },
            {
                "name": "medium",
                "maxWidth": 300,
                "maxHeight": 300,
                "format": "WebP",
                "fitMode": "Inside",
                "stripMetadata": true,
                "backgroundColor": "#FFFFFF",
                "options": {
                    "webP": {
                        "quality": 85,
                        "lossless": false,
                        "method": 4,
                        "alphaQuality": 90
                    }
                }
            },
            {
                "name": "large",
                "maxWidth": 600,
                "maxHeight": 600,
                "format": "WebP",
                "fitMode": "Inside",
                "stripMetadata": true,
                "backgroundColor": "#FFFFFF",
                "options": {
                    "webP": {
                        "quality": 90,
                        "lossless": false,
                        "method": 4,
                        "alphaQuality": 90
                    }
                }
            }
        ],
        "enableCaching": true,
        "cacheTtlSeconds": 86400,
        "generateOnUpload": true
    }'::jsonb,

    -- Limits and Quotas
    max_storage_size_bytes BIGINT DEFAULT 107374182400,  -- 100GB
    max_file_size_bytes BIGINT DEFAULT 104857600,        -- 100MB
    max_images_per_upload INTEGER DEFAULT 100,

    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,

    CONSTRAINT unique_tenant_name UNIQUE(name)
);

-- Index for JSONB queries
CREATE INDEX idx_tenants_thumbnail_specs ON tenants USING GIN (thumbnail_config);
CREATE INDEX idx_tenants_storage_provider ON tenants ((storage_config->>'provider'));
```

### Images Table

```sql
CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- File information
    original_file_name VARCHAR(500) NOT NULL,
    storage_path VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum VARCHAR(64) NOT NULL,  -- SHA256

    -- Image dimensions
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,

    -- EXIF metadata (JSON)
    exif_metadata JSONB,

    -- Processing status
    status VARCHAR(50) NOT NULL DEFAULT 'Uploaded',
    processing_error TEXT,

    -- Feature extraction status
    features_extracted BOOLEAN DEFAULT false,
    features_extracted_at TIMESTAMP,

    -- Vector indexing status
    indexed BOOLEAN DEFAULT false,
    indexed_at TIMESTAMP,

    -- Audit fields
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    uploaded_by VARCHAR(255),
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,  -- Soft delete

    CONSTRAINT chk_status CHECK (status IN ('Uploaded', 'Validating', 'Validated', 'Processing', 'Processed', 'Indexed', 'Failed'))
);

-- Indexes
CREATE INDEX idx_images_tenant ON images(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_images_status ON images(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_images_uploaded_at ON images(uploaded_at DESC);
CREATE INDEX idx_images_deleted ON images(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_images_checksum ON images(checksum);
```

## Benefits of JSON Storage

### ✅ **Flexibility**

- Add new image formats (JPEG XL, AVIF) without schema migration
- Each format can have unique attributes
- Easy to add new specifications without altering tables

### ✅ **Query Capability**

```sql
-- Find tenants using WebP format
SELECT * FROM tenants
WHERE thumbnail_config->'specifications' @> '[{"format": "WebP"}]';

-- Find tenants with specific thumbnail size
SELECT * FROM tenants
WHERE thumbnail_config @> '{"specifications": [{"name": "large"}]}';

-- Get all thumbnail spec names for a tenant
SELECT jsonb_array_elements(thumbnail_config->'specifications')->>'name' AS spec_name
FROM tenants
WHERE id = 'tenant-uuid';
```

### ✅ **Validation**

- C# models provide strong typing
- JSON serialization ensures data integrity
- Database constraints on outer structure

## Entity Framework Core Configuration

```csharp
// In DbContext configuration
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Tenant>(entity =>
    {
        entity.Property(e => e.StorageConfig)
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                v => JsonSerializer.Deserialize<StorageConfiguration>(v, (JsonSerializerOptions)null));

        entity.Property(e => e.ThumbnailConfig)
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                v => JsonSerializer.Deserialize<ThumbnailConfiguration>(v, (JsonSerializerOptions)null));
    });

    modelBuilder.Entity<Image>(entity =>
    {
        entity.Property(e => e.ExifMetadata)
            .HasColumnType("jsonb");

        entity.Property(e => e.Status)
            .HasConversion<string>();
    });
}
```

## Thumbnail File Naming Convention

No database tracking needed - thumbnails stored with predictable paths:

```
Storage Path Pattern:
{tenant_id}/thumbnails/{image_id}_{spec_name}.{format}

Examples:
123e4567-e89b-12d3-a456-426614174000/thumbnails/987fcdeb-51a2-43f1-9876-543210987654_small.webp
123e4567-e89b-12d3-a456-426614174000/thumbnails/987fcdeb-51a2-43f1-9876-543210987654_medium.webp
123e4567-e89b-12d3-a456-426614174000/thumbnails/987fcdeb-51a2-43f1-9876-543210987654_large.webp
123e4567-e89b-12d3-a456-426614174000/thumbnails/987fcdeb-51a2-43f1-9876-543210987654_custom_hq.jpg
```

## Adding New Formats

To add a new format (e.g., JPEG 2000):

1. Add enum value: `public enum ThumbnailFormat { Jpeg, WebP, Png, Avif, JpegXL, Jpeg2000 }`
2. Add options class: `public class Jpeg2000Options { public int Quality { get; set; } }`
3. Add to FormatOptions: `public Jpeg2000Options? Jpeg2000 { get; set; }`
4. **No database migration needed!**

The JSON column automatically accommodates the new structure.

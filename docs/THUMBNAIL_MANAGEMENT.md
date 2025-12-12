# Thumbnail Management System

## Overview

DeepLens uses a flexible, tenant-configurable thumbnail generation system that preserves aspect ratios (Google Image Search style) and supports multiple modern image formats. Thumbnails are generated on-demand and managed automatically based on tenant configuration.

## Configuration

### Tenant-Level Configuration

Each tenant can configure their thumbnail generation preferences through the API:

```json
{
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
}
```

### Specification Attributes

#### Common Attributes (All Formats)

| Attribute         | Type   | Description                                   | Default  |
| ----------------- | ------ | --------------------------------------------- | -------- |
| `name`            | string | Unique identifier for this specification      | Required |
| `maxWidth`        | int    | Maximum width in pixels                       | Required |
| `maxHeight`       | int    | Maximum height in pixels                      | Required |
| `format`          | enum   | Output format: Jpeg, WebP, Png, Avif, JpegXL  | WebP     |
| `fitMode`         | enum   | Resize mode: Inside, Cover, Contain           | Inside   |
| `stripMetadata`   | bool   | Remove EXIF metadata                          | true     |
| `backgroundColor` | string | Background color for transparent images (hex) | #FFFFFF  |

#### Format-Specific Options

**JPEG Options**

```json
{
  "quality": 85, // 0-100, recommended: 70-95
  "progressive": true, // Progressive JPEG encoding
  "optimize": true, // Optimize Huffman tables
  "chromaSubsampling": "4:2:0" // 4:4:4, 4:2:2, 4:2:0
}
```

**WebP Options**

```json
{
  "quality": 85, // 0-100
  "lossless": false, // Lossless compression
  "method": 4, // 0-6, higher = better compression
  "alphaQuality": 90 // 0-100, alpha channel quality
}
```

**PNG Options**

```json
{
  "compressionLevel": 6, // 0-9, higher = better compression
  "interlace": false, // Adam7 interlacing
  "filter": "All" // None, Sub, Up, Average, Paeth, All
}
```

**AVIF Options**

```json
{
  "quality": 80, // 0-100
  "speed": 6, // 0-10, lower = better quality
  "chromaSubsampling": "4:2:0" // 4:4:4, 4:2:2, 4:2:0
}
```

**JPEG XL Options**

```json
{
  "quality": 85, // 0-100
  "effort": 7, // 1-9, higher = better compression
  "lossless": false // Lossless compression
}
```

## Behavior and Outcomes

### Aspect Ratio Preservation (Google Image Search Style)

All thumbnails preserve the original image's aspect ratio using `FitMode.Inside`:

| Original Image      | Specification | Result            |
| ------------------- | ------------- | ----------------- |
| 600x900 (portrait)  | 300x300 max   | 200x300 thumbnail |
| 900x600 (landscape) | 300x300 max   | 300x200 thumbnail |
| 800x800 (square)    | 300x300 max   | 300x300 thumbnail |
| 1200x400 (wide)     | 300x300 max   | 300x100 thumbnail |

**Display**: Thumbnails displayed in CSS grid with `object-fit` to maintain spacing while preserving aspect ratios.

### Transparent Images

Images with transparency (PNG, WebP with alpha) are handled as follows:

- **Preserve transparency**: If output format supports alpha (WebP, PNG, AVIF)
- **Flatten to background**: If output format doesn't support alpha (JPEG)
- **Background color**: Uses `backgroundColor` from specification (default: white)

### Metadata Handling

- **EXIF Data**: Stripped from thumbnails by default (`stripMetadata: true`)
- **Benefits**: Reduced file size, privacy protection (removes GPS, camera info, etc.)
- **Original**: EXIF preserved in original image, stored in database

## Thumbnail Creation

### Initial Upload Flow

1. **Image uploaded** → Stored in blob storage
2. **Validation service** reads tenant thumbnail configuration
3. **If `generateOnUpload: true`**:
   - Generate all configured thumbnail specifications
   - Store in: `{tenant_id}/thumbnails/{image_id}_{spec_name}.{format}`
   - Example: `abc123/thumbnails/img456_small.webp`
4. **Publish Kafka event**: `images.validated`

### On-Demand Generation

When a thumbnail is requested but doesn't exist:

1. **Request**: `GET /api/v1/images/{id}/thumbnail?spec=medium`
2. **Check storage**: Does `{tenant_id}/thumbnails/{image_id}_medium.webp` exist?
3. **If not found**:
   - Fetch original image from storage
   - Read tenant's "medium" specification
   - Generate thumbnail according to spec
   - Store in blob storage
   - Cache in Redis (if enabled)
   - Return to client
4. **If found**: Return from storage (possibly cached in Redis)

### Storage Path Convention

```
{tenant_id}/thumbnails/{image_id}_{spec_name}.{format}

Examples:
123e4567-e89b-12d3-a456-426614174000/thumbnails/987fcdeb-51a2-43f1-9876-543210987654_small.webp
123e4567-e89b-12d3-a456-426614174000/thumbnails/987fcdeb-51a2-43f1-9876-543210987654_medium.webp
123e4567-e89b-12d3-a456-426614174000/thumbnails/987fcdeb-51a2-43f1-9876-543210987654_large.webp
123e4567-e89b-12d3-a456-426614174000/thumbnails/987fcdeb-51a2-43f1-9876-543210987654_custom_hq.jpg
```

**No database tracking required** - paths are predictable and constructed on-demand.

## Configuration Changes

### Adding New Specifications

**Scenario**: Tenant adds a new specification "xlarge" to their configuration.

**Behavior**:

1. Update tenant configuration via API
2. **Existing images**: Thumbnails generated on-demand when first requested
3. **New images**: All thumbnails (including xlarge) generated on upload if `generateOnUpload: true`
4. **No immediate action**: No background job needed - lazy generation

**Example**:

```http
PUT /api/v1/tenants/{tenantId}/thumbnail-config
{
  "specifications": [
    { "name": "small", ... },
    { "name": "medium", ... },
    { "name": "large", ... },
    { "name": "xlarge", "maxWidth": 1200, "maxHeight": 1200, ... }  // NEW
  ]
}
```

### Removing Specifications

**Scenario**: Tenant removes "large" specification from their configuration.

**Behavior**:

1. Update tenant configuration via API
2. Call cleanup endpoint:

```http
POST /api/v1/tenants/{tenantId}/thumbnail-config/apply
{
  "removedSpecificationNames": ["large"],
  "processAllImages": true
}
```

3. **Background job triggered**:
   - Iterates through all tenant's images
   - Tags thumbnails in MinIO with `deleted=true` metadata
   - Soft delete: `{tenant_id}/thumbnails/{image_id}_large.*`
4. **MinIO lifecycle rules**: Permanently delete after 30 days

**Recovery window**: 30 days to restore if removal was accidental.

### Modifying Specifications

**Scenario**: Tenant changes "medium" specification from WebP 85% to JPEG 90%.

**Behavior**:

1. Update tenant configuration via API
2. **Existing thumbnails**: Remain unchanged until regenerated
3. **Regeneration triggers**:
   - Explicitly: Call thumbnail regeneration API
   - Automatically: Delete old thumbnail → next request generates new one
   - Batch: Background job to regenerate all thumbnails

**Options**:

```http
# Option 1: Delete specific thumbnails (forces regeneration on next access)
DELETE /api/v1/images/{id}/thumbnails/medium

# Option 2: Force regenerate immediately
POST /api/v1/images/{id}/thumbnails/generate
{
  "specifications": ["medium"]
}

# Option 3: Batch regenerate
POST /api/v1/images/thumbnails/batch-regenerate
{
  "specificationNames": ["medium"],
  "tenantId": "{tenantId}"
}
```

## Thumbnail Deletion

### Individual Image Deletion

When an image is deleted:

1. **Soft delete image**: Set `deleted_at` timestamp in database
2. **Tag in MinIO**: Add `deleted=true` metadata to image and all thumbnails
3. **MinIO lifecycle rules**: Permanently delete after 30-day retention period

**Storage paths affected**:

```
{tenant_id}/images/{image_id}.jpg          → deleted=true
{tenant_id}/thumbnails/{image_id}_small.*  → deleted=true
{tenant_id}/thumbnails/{image_id}_medium.* → deleted=true
{tenant_id}/thumbnails/{image_id}_large.*  → deleted=true
```

### Specification Removal

See "Removing Specifications" section above.

### Tenant Deletion

When a tenant is deleted:

1. **Soft delete tenant**: Set `deleted_at` timestamp
2. **Tag all objects**: MinIO tag `deleted=true` on entire tenant bucket/prefix
3. **MinIO lifecycle rules**: Permanently delete after 30 days
4. **Recovery**: Can restore tenant and all data within 30-day window

## Caching Strategy

### Redis Caching (Optional)

If `enableCaching: true` in tenant configuration:

**Cache Key Pattern**: `thumbnail:{tenant_id}:{image_id}:{spec_name}`

**Flow**:

1. **Request**: GET thumbnail
2. **Check Redis**: Key exists?
3. **If cached**: Return from Redis
4. **If not cached**:
   - Fetch from blob storage (or generate if missing)
   - Store in Redis with TTL (`cacheTtlSeconds`)
   - Return to client

**Cache Invalidation**:

- **TTL expiry**: Automatic after `cacheTtlSeconds` (default: 24 hours)
- **Explicit**: When thumbnail regenerated or deleted
- **Pattern delete**: When specification removed from config

**Cache Settings**:

```json
{
  "enableCaching": true,
  "cacheTtlSeconds": 86400 // 24 hours
}
```

### CDN Integration (Future)

Thumbnails are CDN-friendly:

- Static URLs based on image ID and spec name
- Long cache headers (immutable once generated)
- Origin server: MinIO/blob storage
- Cache purge: Only on explicit regeneration

## API Endpoints

### Retrieve Thumbnails

```http
# Get thumbnail by specification name
GET /api/v1/images/{imageId}/thumbnail?spec=medium
Response: Image binary data

# Get thumbnail with custom size (if allowed by tenant config)
GET /api/v1/images/{imageId}/thumbnail?spec=custom&width=400&height=400
Response: Image binary data

# List all available thumbnails for an image
GET /api/v1/images/{imageId}/thumbnails
Response:
{
  "imageId": "uuid",
  "thumbnails": [
    { "spec": "small", "url": "...", "width": 150, "height": 200, "size": 15234 },
    { "spec": "medium", "url": "...", "width": 300, "height": 400, "size": 45678 }
  ]
}
```

### Manage Thumbnails

```http
# Force regenerate thumbnails for an image
POST /api/v1/images/{imageId}/thumbnails/generate
{
  "specifications": ["medium", "large"]  // Optional, all if not specified
}

# Delete specific thumbnail
DELETE /api/v1/images/{imageId}/thumbnails/{spec}

# Batch regenerate thumbnails
POST /api/v1/images/thumbnails/batch-regenerate
{
  "specificationNames": ["medium"],
  "imageIds": ["uuid1", "uuid2"],  // Optional, all if not specified
  "tenantId": "uuid"
}
```

### Configure Tenant Thumbnails

```http
# Get tenant thumbnail configuration
GET /api/v1/tenants/{tenantId}/thumbnail-config

# Update tenant thumbnail configuration
PUT /api/v1/tenants/{tenantId}/thumbnail-config
{
  "enabled": true,
  "specifications": [...],
  "enableCaching": true,
  "cacheTtlSeconds": 86400,
  "generateOnUpload": true
}

# Cleanup removed specifications
POST /api/v1/tenants/{tenantId}/thumbnail-config/apply
{
  "removedSpecificationNames": ["large"],
  "processAllImages": true
}
```

## Performance Considerations

### Generation Performance

**Factors affecting generation time**:

- Original image size (larger = slower)
- Output format (WebP lossy < PNG < WebP lossless)
- Quality/compression settings (higher = slower)
- Number of specifications (more = longer)

**Optimization strategies**:

1. **Parallel generation**: Generate multiple specs concurrently
2. **GPU acceleration**: Use GPU for format encoding (especially AVIF, WebP)
3. **Smart caching**: Cache hot thumbnails in Redis
4. **Lazy loading**: Generate on-demand for infrequently accessed images

### Storage Considerations

**Storage usage per image** (approximate):

| Specification    | Format | Quality | Size (for 2MB original) |
| ---------------- | ------ | ------- | ----------------------- |
| small (150x150)  | WebP   | 80      | 3-8 KB                  |
| medium (300x300) | WebP   | 85      | 10-25 KB                |
| large (600x600)  | WebP   | 90      | 35-85 KB                |
| **Total**        |        |         | **~50-120 KB**          |

**For 1 million images**:

- Original images: 2TB (assuming 2MB average)
- Thumbnails: 50-120GB (2.5-6% of original size)

### MinIO Lifecycle Rules

```xml
<LifecycleConfiguration>
    <Rule>
        <ID>delete-soft-deleted-objects</ID>
        <Status>Enabled</Status>
        <Filter>
            <Tag>
                <Key>deleted</Key>
                <Value>true</Value>
            </Tag>
        </Filter>
        <Expiration>
            <Days>30</Days>
        </Expiration>
    </Rule>

    <Rule>
        <ID>cleanup-incomplete-uploads</ID>
        <Status>Enabled</Status>
        <AbortIncompleteMultipartUpload>
            <DaysAfterInitiation>7</DaysAfterInitiation>
        </AbortIncompleteMultipartUpload>
    </Rule>

    <Rule>
        <ID>transition-old-thumbnails-to-cold-storage</ID>
        <Status>Enabled</Status>
        <Filter>
            <Prefix>thumbnails/</Prefix>
        </Filter>
        <Transition>
            <Days>90</Days>
            <StorageClass>GLACIER</StorageClass>
        </Transition>
    </Rule>
</LifecycleConfiguration>
```

## Best Practices

### Recommended Presets

**E-commerce / Product Images**

```json
{
  "small": {
    "maxWidth": 200,
    "maxHeight": 200,
    "format": "WebP",
    "quality": 85
  },
  "medium": {
    "maxWidth": 400,
    "maxHeight": 400,
    "format": "WebP",
    "quality": 90
  },
  "large": {
    "maxWidth": 800,
    "maxHeight": 800,
    "format": "WebP",
    "quality": 92
  },
  "zoom": {
    "maxWidth": 1600,
    "maxHeight": 1600,
    "format": "WebP",
    "quality": 95
  }
}
```

**Photo Gallery**

```json
{
  "thumbnail": {
    "maxWidth": 150,
    "maxHeight": 150,
    "format": "WebP",
    "quality": 80
  },
  "preview": {
    "maxWidth": 600,
    "maxHeight": 600,
    "format": "WebP",
    "quality": 88
  },
  "full": {
    "maxWidth": 1920,
    "maxHeight": 1920,
    "format": "WebP",
    "quality": 92
  }
}
```

**Medical Imaging (High Fidelity)**

```json
{
  "thumbnail": {
    "maxWidth": 150,
    "maxHeight": 150,
    "format": "PNG",
    "compressionLevel": 6
  },
  "preview": {
    "maxWidth": 512,
    "maxHeight": 512,
    "format": "PNG",
    "compressionLevel": 6
  },
  "diagnostic": {
    "maxWidth": 2048,
    "maxHeight": 2048,
    "format": "PNG",
    "compressionLevel": 9
  }
}
```

### Format Selection Guidelines

| Use Case               | Recommended Format   | Rationale                                    |
| ---------------------- | -------------------- | -------------------------------------------- |
| General web thumbnails | WebP                 | Best compression/quality ratio, wide support |
| Legacy browser support | JPEG                 | Universal compatibility                      |
| High quality/archival  | PNG or WebP lossless | Perfect quality preservation                 |
| Cutting-edge web apps  | AVIF                 | Best compression, modern browsers            |
| Future-proof           | JPEG XL              | Excellent compression, future standard       |

### Configuration Tips

1. **Start with 3 sizes**: small (150px), medium (300px), large (600px)
2. **Use WebP by default**: Best balance of quality and size
3. **Enable caching**: Significant performance boost for frequently accessed images
4. **Generate on upload**: Better UX than on-demand for high-traffic sites
5. **Monitor storage**: Set up alerts when thumbnail storage exceeds thresholds
6. **Test specifications**: Validate quality/size tradeoffs with sample images
7. **Document custom specs**: Keep track of why specific specifications exist

## Troubleshooting

### Thumbnail Not Found

**Symptoms**: 404 when requesting thumbnail

**Possible causes**:

1. Image doesn't exist
2. Specification name doesn't match tenant config
3. Generation failed (check logs)
4. Storage backend unavailable

**Resolution**:

- Check image exists in database
- Verify specification name in tenant config
- Check error logs for generation failures
- Verify MinIO/storage connectivity

### Poor Thumbnail Quality

**Symptoms**: Thumbnails appear blurry or pixelated

**Possible causes**:

1. Quality setting too low
2. Source image low quality
3. Format not optimal for image type

**Resolution**:

- Increase quality setting (try 85-92 for WebP)
- Check original image quality
- Try different format (PNG for graphics, WebP for photos)

### Slow Thumbnail Generation

**Symptoms**: Long delays when accessing thumbnails

**Possible causes**:

1. Large source images
2. Complex format settings (high quality, lossless)
3. No caching enabled
4. Sequential generation instead of parallel

**Resolution**:

- Enable Redis caching
- Generate on upload instead of on-demand
- Use parallel thumbnail generation
- Consider lower quality/faster formats for less critical specs

### Storage Growing Too Fast

**Symptoms**: Thumbnail storage exceeding expectations

**Possible causes**:

1. Too many specifications configured
2. Large thumbnail dimensions
3. High quality settings
4. Lifecycle rules not working

**Resolution**:

- Review and consolidate specifications
- Reduce max dimensions if acceptable
- Lower quality settings slightly
- Verify MinIO lifecycle rules are active
- Implement cold storage transitions for old thumbnails

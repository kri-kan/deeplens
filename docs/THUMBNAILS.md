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

1. **Image uploaded** â†’ Stored in blob storage
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
   - Automatically: Delete old thumbnail â†’ next request generates new one
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
{tenant_id}/images/{image_id}.jpg          â†’ deleted=true
{tenant_id}/thumbnails/{image_id}_small.*  â†’ deleted=true
{tenant_id}/thumbnails/{image_id}_medium.* â†’ deleted=true
{tenant_id}/thumbnails/{image_id}_large.*  â†’ deleted=true
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
# Thumbnail Path Convention

## Overview

DeepLens uses a **convention-over-configuration** approach for thumbnail storage. Instead of tracking each thumbnail in the database, we derive thumbnail paths programmatically from the original image path and specification name.

## Design Principles

1. **No Database Tracking**: Thumbnails are not stored as separate database entities
2. **Programmatic Path Generation**: Thumbnail paths are calculated on-demand from image ID + specification name
3. **Same Storage Backend**: Thumbnails always reside in the same storage configuration as the original image
4. **Consistent Naming**: Predictable paths enable caching, CDN integration, and direct access

## Path Convention

### Original Image Path

```
{bucket}/{tenant-id}/images/{year}/{month}/{image-id}.{ext}

Example:
deeplens/550e8400-e29b-41d4-a716-446655440000/images/2024/12/7c9e6679-7425-40de-944b-e07fc1f90ae7.jpg
```

### Thumbnail Path Pattern

```
{bucket}/{tenant-id}/thumbnails/{spec-name}/{year}/{month}/{image-id}.{format}

Examples:
deeplens/550e8400-e29b-41d4-a716-446655440000/thumbnails/small-webp/2024/12/7c9e6679-7425-40de-944b-e07fc1f90ae7.webp
deeplens/550e8400-e29b-41d4-a716-446655440000/thumbnails/medium-jpeg/2024/12/7c9e6679-7425-40de-944b-e07fc1f90ae7.jpg
deeplens/550e8400-e29b-41d4-a716-446655440000/thumbnails/large-avif/2024/12/7c9e6679-7425-40de-944b-e07fc1f90ae7.avif
```

### Path Components

| Component        | Description                   | Example                             |
| ---------------- | ----------------------------- | ----------------------------------- |
| `{bucket}`       | Storage bucket/container name | `deeplens`                          |
| `{tenant-id}`    | Tenant's unique identifier    | `550e8400-e29b-...`                 |
| `{spec-name}`    | Thumbnail specification name  | `small-webp`, `medium-jpeg`         |
| `{year}/{month}` | Upload date partitioning      | `2024/12`                           |
| `{image-id}`     | Original image's GUID         | `7c9e6679-...`                      |
| `{format}`       | Output format extension       | `webp`, `jpg`, `png`, `avif`, `jxl` |

## Upload Flow

When a user uploads an image:

1. **Storage Selection**:

   - User optionally specifies `StorageConfigurationId` in upload request
   - If not specified, use tenant's default storage configuration
   - Store `StorageConfigurationId` in `Image.StorageConfigurationId` field

2. **Original Image Storage**:

   ```
   POST /api/v1/images/upload
   Body: {
     "storageConfigurationId": "azure-primary",  // Optional
     "file": <binary>
   }
   ```

   - Save original to: `{bucket}/{tenant-id}/images/{year}/{month}/{image-id}.{ext}`
   - Record `StoragePath` and `StorageConfigurationId` in database

3. **Thumbnail Generation**:

   - Read tenant's active `ThumbnailConfiguration.Specifications[]`
   - For each enabled specification:
     - Generate thumbnail according to format options
     - Save to: `{bucket}/{tenant-id}/thumbnails/{spec-name}/{year}/{month}/{image-id}.{format}`
   - All thumbnails stored in **same storage backend** as original

4. **Database Record**:
   ```json
   {
     "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
     "tenantId": "550e8400-e29b-41d4-a716-446655440000",
     "storageConfigurationId": "azure-primary",
     "storagePath": "images/2024/12/7c9e6679-7425-40de-944b-e07fc1f90ae7.jpg",
     "originalFilename": "vacation-photo.jpg"
   }
   ```

## Retrieval Flow

### Get Thumbnail by Specification Name

```
GET /api/v1/images/{imageId}/thumbnail?spec=medium-webp
```

**Server-side logic**:

1. Query `Image` table for `imageId`
2. Get `StorageConfigurationId` to determine which storage backend
3. Extract year/month from `CreatedAt` or parse from `StoragePath`
4. Calculate thumbnail path:
   ```
   path = $"{tenantId}/thumbnails/{specName}/{year}/{month}/{imageId}.{format}"
   ```
5. Check Redis cache first: `thumbnail:{imageId}:{specName}`
6. If not cached, fetch from storage backend using calculated path
7. Cache in Redis with TTL (default 24h)
8. Return thumbnail

### List All Thumbnails for an Image

```
GET /api/v1/images/{imageId}/thumbnails
```

**Server-side logic**:

1. Query `Image` table for `imageId` and `TenantId`
2. Query `Tenant` table for `ThumbnailConfiguration.Specifications[]`
3. For each specification, calculate expected path
4. Optionally verify existence in storage (list operation)
5. Return array of available thumbnails with URLs

## Code Example

```csharp
public class ThumbnailPathService
{
    public string GetThumbnailPath(Image image, string specName, string format)
    {
        var date = image.CreatedAt;
        var year = date.Year;
        var month = date.Month.ToString("D2");

        return $"{image.TenantId}/thumbnails/{specName}/{year}/{month}/{image.Id}.{format}";
    }

    public string GetOriginalImagePath(Image image)
    {
        return $"{image.TenantId}/{image.StoragePath}";
    }

    public async Task<Stream> GetThumbnailAsync(
        Guid imageId,
        string specName,
        CancellationToken cancellationToken = default)
    {
        // 1. Get image metadata
        var image = await _imageRepository.GetByIdAsync(imageId, cancellationToken);
        if (image == null) throw new NotFoundException();

        // 2. Get tenant config to find spec format
        var tenant = await _tenantRepository.GetByIdAsync(image.TenantId, cancellationToken);
        var spec = tenant.ThumbnailConfig.Specifications
            .FirstOrDefault(s => s.Name == specName);
        if (spec == null) throw new SpecificationNotFoundException();

        // 3. Calculate thumbnail path
        var format = GetFormatExtension(spec.Format);
        var thumbnailPath = GetThumbnailPath(image, specName, format);

        // 4. Get storage provider for this image
        var storageProvider = await _storageFactory
            .GetProviderAsync(image.StorageConfigurationId, cancellationToken);

        // 5. Check cache first
        var cacheKey = $"thumbnail:{imageId}:{specName}";
        var cached = await _cache.GetAsync(cacheKey, cancellationToken);
        if (cached != null) return new MemoryStream(cached);

        // 6. Fetch from storage
        var thumbnailStream = await storageProvider
            .GetAsync(thumbnailPath, cancellationToken);

        // 7. Cache for future requests
        await CacheThumbnailAsync(cacheKey, thumbnailStream, cancellationToken);

        return thumbnailStream;
    }

    private string GetFormatExtension(ThumbnailFormat format) => format switch
    {
        ThumbnailFormat.Jpeg => "jpg",
        ThumbnailFormat.WebP => "webp",
        ThumbnailFormat.Png => "png",
        ThumbnailFormat.Avif => "avif",
        ThumbnailFormat.JpegXL => "jxl",
        _ => throw new ArgumentException($"Unknown format: {format}")
    };
}
```

## Benefits

### 1. **Simplicity**

- No junction tables or thumbnail tracking
- Single source of truth: original image record
- Reduced database size and complexity

### 2. **Performance**

- Direct path calculation (no database joins)
- Predictable paths enable CDN/cache pre-warming
- Storage provider can list thumbnails by prefix

### 3. **Consistency**

- Thumbnails always in same storage as original
- No orphaned thumbnail records
- Easy cleanup: delete original = delete all thumbnails

### 4. **Flexibility**

- Add new thumbnail specs without migration
- On-demand generation for missing thumbnails
- Storage migration moves entire image set together

### 5. **Scalability**

- No database bloat (1 record per image, not N per thumbnail spec)
- Storage operations parallelizable by prefix
- Cache keys predictable for distributed caching

## Edge Cases

### Missing Thumbnails

If a thumbnail doesn't exist (e.g., spec added after upload):

1. Return 404 or trigger on-demand generation
2. Generate thumbnail from original
3. Store at calculated path
4. Return generated thumbnail

### Storage Migration

When moving images between storage backends:

1. Copy original image to new storage
2. Copy all thumbnails (list by prefix pattern)
3. Update `Image.StorageConfigurationId`
4. Invalidate cache entries
5. Delete from old storage (optional, after verification)

### Tenant Config Changes

When thumbnail specifications change:

- New specs: Generated on-demand when requested
- Removed specs: Use MinIO lifecycle rules to auto-delete after 30 days
- Modified specs: Regenerate via batch job or on-demand

## MinIO Lifecycle Rules

Configure lifecycle policies to manage thumbnails:

```xml
<LifecycleConfiguration>
  <!-- Delete thumbnails marked for removal -->
  <Rule>
    <ID>delete-removed-thumbnail-specs</ID>
    <Status>Enabled</Status>
    <Filter>
      <Prefix>thumbnails/</Prefix>
      <Tag>
        <Key>status</Key>
        <Value>removed</Value>
      </Tag>
    </Filter>
    <Expiration>
      <Days>30</Days>
    </Expiration>
  </Rule>

  <!-- Clean up incomplete uploads -->
  <Rule>
    <ID>abort-incomplete-multipart</ID>
    <Status>Enabled</Status>
    <AbortIncompleteMultipartUpload>
      <DaysAfterInitiation>7</DaysAfterInitiation>
    </AbortIncompleteMultipartUpload>
  </Rule>
</LifecycleConfiguration>
```

## API Response Examples

### Get Thumbnail

```
GET /api/v1/images/7c9e6679-7425-40de-944b-e07fc1f90ae7/thumbnail?spec=medium-webp

Response:
- Content-Type: image/webp
- Cache-Control: public, max-age=86400
- ETag: "abc123def456"
- Body: <binary thumbnail data>
```

### List Available Thumbnails

```
GET /api/v1/images/7c9e6679-7425-40de-944b-e07fc1f90ae7/thumbnails

Response:
{
  "imageId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "thumbnails": [
    {
      "specName": "small-webp",
      "format": "webp",
      "width": 150,
      "url": "/api/v1/images/7c9e6679-.../thumbnail?spec=small-webp",
      "exists": true
    },
    {
      "specName": "medium-jpeg",
      "format": "jpeg",
      "width": 300,
      "url": "/api/v1/images/7c9e6679-.../thumbnail?spec=medium-jpeg",
      "exists": true
    },
    {
      "specName": "large-avif",
      "format": "avif",
      "width": 800,
      "url": "/api/v1/images/7c9e6679-.../thumbnail?spec=large-avif",
      "exists": false,
      "message": "Will be generated on-demand"
    }
  ]
}
```

## Summary

By using a programmatic path convention, DeepLens achieves:

- âœ… **Zero database overhead** for thumbnail tracking
- âœ… **Predictable storage paths** for CDN/cache optimization
- âœ… **Simple multi-storage support** (thumbnails follow original)
- âœ… **Easy cleanup** via storage lifecycle rules
- âœ… **On-demand generation** for missing thumbnails
- âœ… **Scalable architecture** without database bloat

The image ID + specification name is sufficient to calculate any thumbnail's location programmatically.
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

### âœ… **Flexibility**

- Add new image formats (JPEG XL, AVIF) without schema migration
- Each format can have unique attributes
- Easy to add new specifications without altering tables

### âœ… **Query Capability**

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

### âœ… **Validation**

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

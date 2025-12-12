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

- ✅ **Zero database overhead** for thumbnail tracking
- ✅ **Predictable storage paths** for CDN/cache optimization
- ✅ **Simple multi-storage support** (thumbnails follow original)
- ✅ **Easy cleanup** via storage lifecycle rules
- ✅ **On-demand generation** for missing thumbnails
- ✅ **Scalable architecture** without database bloat

The image ID + specification name is sufficient to calculate any thumbnail's location programmatically.

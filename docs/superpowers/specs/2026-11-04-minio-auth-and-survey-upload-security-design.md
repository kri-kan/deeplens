# MinIO Authentication Lockdown & Secure Survey Upload Design

**Date:** 2026-11-04  
**Author:** Krishna (Squad Lead) & DeepLens Engineering  
**Status:** Approved in Brainstorming  

---

## 1. Intent & The Why

A comprehensive security audit of DeepLens storage identified that several sensitive storage buckets and backend endpoints allow unauthenticated reading, writing, and deletion. In particular:
1. `whatsapp-data` and `tenant-vayyari-data` MinIO buckets have public anonymous `s3:GetObject` policies enabled, and Nginx's `media.vayyarifashions.com` wildcard-proxies `minio:9000/`.
2. Backend controllers (`AttachmentController`, `MediaController.DeleteMedia`, `IngestionController`) lack `[Authorize]` attributes, allowing unauthenticated callers to upload files, delete physical files across any bucket by path, and scrape sensitive thermal shipping labels (`labels/{awb}.pdf` containing customer PII).
3. `Store.Api` survey endpoints allow unauthenticated access to customer responses, and file uploads lack deep verification.

The objective is to strictly isolate internal and customer storage behind authentication, keep public e-commerce catalog media public, and implement a hardened 5-layer upload proxy for guest and authenticated surveys.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Isolate Sensitive Storage**: Lock down MinIO anonymous policies for `whatsapp-data` and `tenant-vayyari-data`. Ensure all private buckets (`labels`, `order`, `customer-vault`, `whatsapp-data`, `deeplens-storage`) require credentials/JWT auth.
- **Lock Gateway Surface**: Restrict Nginx `media.vayyarifashions.com` to only serve public paths (`/store-assets/` and OTA updates). Close direct wildcard proxying to MinIO port 9000.
- **Protect SearchApi Controllers**: Enforce `[Authorize]` on `AttachmentController` (`upload`, `delete`, `delete-by-path`) and `IngestionController`. Restrict `download` so private attachments require authentication.
- **Store.Api Survey Security (Approach 1)**: Implement a public/guest upload endpoint on `Store.Api` that proxies uploads to the private `customer-vault` MinIO bucket with a 5-layer security check:
  1. Rate limiting & size cap (max 5 files, 10 MB limit per file).
  2. Binary Magic Bytes inspection (JPEG, PNG, WebP, PDF).
  3. Deep ImageSharp decoding and EXIF metadata stripping.
  4. Disallow dangerous formats (no SVGs, HTML, or executables).
  5. UUID storage key generation (no path traversal).
- **Enforce Store.Api Admin Auth**: Require admin authorization for `/api/v1/admin/surveys/responses/*` instead of defaulting to `"admin@vayyari.com"`.

### Non-Goals
- Migrating historical WhatsApp media away from MinIO.
- Replacing MinIO with AWS S3 in production (stays MinIO S3 API-compatible).
- Building an external virus-scanner daemon (ImageSharp deep raster decoding + binary magic byte checks suffice for raster formats; ClamAV can be added later if raw office documents are supported).

### Anti-Goals
- Breaking public storefront product images (`store-assets` must remain public without auth).
- Breaking mobile app OTA updates (`admin-updates` and `store-updates` must remain publicly downloadable).
- Breaking existing mobile app shipping label workflows (authorized admin users must seamlessly view labels).

---

## 3. Approaches Considered & Tradeoffs

During brainstorming, two architectural approaches were considered for guest survey file uploads:

1. **Approach 1: Proxy Uploads through Store.Api Controller (Selected)**
   - *Architecture*: Client uploads multipart form data to `Store.Api`. `Store.Api` validates magic bytes, decodes raster images, and streams valid files to MinIO over internal Docker networking.
   - *Tradeoffs*: MinIO port 9000 remains 100% internal and closed to public writes. Eliminates browser CORS issues with MinIO. Deep inspection prevents polyglot/malicious payloads. Slightly higher memory/CPU on `Store.Api` during concurrent uploads (negligible for 10 MB caps).
2. **Approach 2: Direct MinIO Presigned PUT URLs**
   - *Architecture*: Client requests a presigned URL and PUTs directly to MinIO S3.
   - *Tradeoffs*: Zero server CPU overhead, but requires opening MinIO's S3 write port to the public internet, configuring S3 bucket CORS, and permits malicious payloads to land in MinIO before any backend inspection occurs.

**Decision**: Approach 1 was selected for defense-in-depth and complete MinIO network isolation.

---

## 4. Subsystem Details

### Subsystem A: MinIO Bucket Policies & Nginx Gateway Lockdown
1. **MinIO Policies**:
   - Run `mc anonymous set none local/whatsapp-data`
   - Run `mc anonymous set none local/tenant-vayyari-data`
   - Verify that only `store-assets`, `admin-updates`, `store-updates`, and `vayyari-updates` have download policies.
2. **Nginx Configuration (`setupscripts/core/gateway/nginx.conf`)**:
   - Replace the wildcard `location / { proxy_pass http://minio:9000; }` on `media.vayyarifashions.com` with explicit location blocks:
     - `location /store-assets/` -> `http://minio:9000/store-assets/`
     - `location /admin-updates/` -> `http://minio:9000/admin-updates/`
     - `location /store-updates/` -> `http://minio:9000/store-updates/`
     - `location /` -> return 404 or redirect.

### Subsystem B: Backend Controller Authorization (`DeepLens.SearchApi`)
1. **`AttachmentController.cs`**:
   - Add `[Authorize]` at class level or method level.
   - `[HttpPost("upload")]` -> requires `[Authorize]`.
   - `[HttpDelete("by-path")]` and `[HttpDelete("{id}")]` -> requires `[Authorize]`.
   - `[HttpGet("download")]`:
     - If path begins with `labels/`, `order/`, or `customer-vault/`, require authenticated user (`User.Identity?.IsAuthenticated == true`).
     - Legacy public catalog paths fallback or require authentication.
2. **`MediaController.cs` & `IngestionController.cs`**:
   - `MediaController.DeleteMedia`: add `[Authorize]`.
   - `IngestionController`: add `[Authorize]`.

### Subsystem C: Store.Api Survey Security & Upload Proxy
1. **`Store.Api/Program.cs` & `Services/SurveyService.cs`**:
   - Add `POST /api/v1/surveys/{slug}/upload` endpoint:
     - Accepts multipart `IFormFileCollection`.
     - Validates survey exists and determines whether it is guest or authenticated. If not guest, verifies `X-Customer-Token` or `Authorization`.
     - Validates file count (max 5 per question/submission).
     - Validates size (max 10 MB per file).
     - Validates magic bytes for JPEG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`), WebP (`RIFF....WEBP`), and PDF (`%PDF-`). Disallows SVG and all other formats.
     - For images, parses via `SixLabors.ImageSharp` (`Image.LoadAsync`) and strips EXIF before saving.
     - Generates secure storage key: `surveys/{slug}/{virtualUserId}/{questionKey}/{guid}_{safeName}.{ext}`.
     - Saves to `customer-vault` via `IMediaStorageService`.
2. **Admin Responses Protection**:
   - Secure `GET /api/v1/admin/surveys/responses/{responseId}` and `GET /api/v1/admin/surveys/{id}/responses` by verifying Admin Authorization header (`Authorization: Bearer ...` or `X-Store-Admin-Key`).

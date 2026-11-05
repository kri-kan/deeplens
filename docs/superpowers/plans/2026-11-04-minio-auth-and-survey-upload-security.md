# MinIO Authentication Lockdown & Secure Survey Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock down unauthenticated MinIO read/write access across bucket policies, Nginx gateway, and backend controllers; and build a 5-layer validated file upload proxy in Store.Api for guest and authenticated surveys.

**Architecture:** Revoke anonymous access on sensitive MinIO buckets (`whatsapp-data`, `tenant-vayyari-data`); restrict Nginx's `media.vayyarifashions.com` to public paths (`/store-assets/` and OTA updates); add `[Authorize]` to SearchApi controllers (`AttachmentController`, `IngestionController`, `MediaController.DeleteMedia`); and implement a secure multipart upload endpoint on `Store.Api` that enforces file caps (max 5 files, 10 MB limit), magic byte validation, and ImageSharp raster sanitization before streaming into the private `customer-vault` bucket.

**Tech Stack:** ASP.NET Core 9, C#, MinIO .NET SDK, SixLabors.ImageSharp, Nginx, Docker, MinIO Client (`mc`), xUnit.

**Spec:** [docs/superpowers/specs/2026-11-04-minio-auth-and-survey-upload-security-design.md](file:///home/krikan/productivity/deeplens/docs/superpowers/specs/2026-11-04-minio-auth-and-survey-upload-security-design.md)

## Global Constraints

- C# DTOs: Every public property MUST have `[JsonPropertyName("camelCase")]`.
- Database naming: `lowercase_with_underscores`.
- Public Store media in `store-assets` must remain unauthenticated for browsing users.
- OTA updates in `admin-updates` and `store-updates` must remain unauthenticated for client app updates.
- Customer vault files in `customer-vault` and shipping labels in `labels` must never be served without authentication.

## Review Focus

1. **Direct MinIO probing**: Verifying that unauthenticated HTTP GET requests to `http://media.vayyarifashions.com/whatsapp-data/...` return 404 or 403.
2. **Path traversal via Attachment download**: Verifying that `GET /api/v1/Attachment/download?path=labels/test.pdf` without a JWT token returns 401 Unauthorized.
3. **Malicious file disguised as image**: Verifying that an executable or text script renamed to `.jpg` submitted to `Store.Api` upload endpoint is rejected by the magic bytes and ImageSharp validator.
4. **Guest upload file count cap**: Verifying that uploading more than 5 files to a survey question returns 400 Bad Request.
5. **Admin survey response leak**: Verifying that unauthenticated requests to `GET /api/v1/admin/surveys/responses/{id}` return 401 Unauthorized.

---

### Task 1: Lock Down MinIO Bucket Anonymous Policies

**Files:**
- Modify: MinIO policies on live container via `mc` command
- Modify: `setupscripts/core/minio/manage-storage.sh`

**Interfaces:**
- Input: Bucket names `whatsapp-data`, `tenant-vayyari-data`
- Produces: Private bucket access permissions (`mc anonymous get` returns `private`)

- [ ] **Step 1: Check existing anonymous policies on MinIO**

Run: `docker exec minio sh -c "mc anonymous get local/whatsapp-data && mc anonymous get local/tenant-vayyari-data"`
Expected: Shows `custom` or download access allowed.

- [ ] **Step 2: Set policies to private**

Run: `docker exec minio sh -c "mc anonymous set none local/whatsapp-data && mc anonymous set none local/tenant-vayyari-data"`
Expected: Successfully removes anonymous download policies.

- [ ] **Step 3: Verify policies are private**

Run: `docker exec minio sh -c "mc anonymous get local/whatsapp-data && mc anonymous get local/tenant-vayyari-data"`
Expected: Both report `private`.

- [ ] **Step 4: Update `manage-storage.sh` if needed to prevent accidental re-exposure**

Ensure any automated provisioning scripts do not grant anonymous download to `whatsapp-data`.

---

### Task 2: Restrict Gateway Ingress in Nginx Configuration

**Files:**
- Modify: `setupscripts/core/gateway/nginx.conf:290-305`

**Interfaces:**
- Consumes: HTTP requests to `media.vayyarifashions.com`
- Produces: Only allows proxying to `/store-assets/`, `/admin-updates/`, `/store-updates/`, and blocks root `/` wildcard.

- [ ] **Step 1: Inspect `setupscripts/core/gateway/nginx.conf` around line 290**

Check `media.vayyarifashions.com` server block where `location /` proxies directly to `http://minio:9000`.

- [ ] **Step 2: Update server block to restrict proxy paths**

Replace wildcard `location /` with explicit locations for public buckets:
```nginx
    # ── MEDIA S3 ASSETS (Restricted Public MinIO Assets) ──
    server {
        listen 80;
        server_name media.vayyarifashions.com;

        # Only allow public store assets
        location /store-assets/ {
            proxy_pass http://minio:9000/store-assets/;
            proxy_set_header Host minio:9000;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Only allow OTA updates
        location /admin-updates/ {
            proxy_pass http://minio:9000/admin-updates/;
            proxy_set_header Host minio:9000;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location /store-updates/ {
            proxy_pass http://minio:9000/store-updates/;
            proxy_set_header Host minio:9000;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # Block all other direct bucket access (whatsapp-data, labels, customer-vault, etc.)
        location / {
            return 404 "Asset not found or access denied.\n";
        }
    }
```

- [ ] **Step 3: Test Nginx configuration and reload**

Run: `docker exec gateway nginx -t && docker exec gateway nginx -s reload` (or verify via host container commands).
Expected: Syntax is ok and reload succeeds.

---

### Task 3: Enforce `[Authorize]` on DeepLens.SearchApi Controllers

**Files:**
- Modify: `src/DeepLens.Service/DeepLens.SearchApi/Controllers/AttachmentController.cs`
- Modify: `src/DeepLens.Service/DeepLens.SearchApi/Controllers/MediaController.cs`
- Modify: `src/DeepLens.Service/DeepLens.SearchApi/Controllers/IngestionController.cs`
- Test: `tests/DeepLens.SearchApi.Tests/AttachmentSecurityTests.cs`

**Interfaces:**
- Consumes: JWT Bearer Tokens from authenticated operators/users
- Produces: 401 Unauthorized when unauthenticated calls are made to `upload`, `delete-by-path`, and private file `download`.

- [ ] **Step 1: Write integration tests verifying 401 on unauthenticated access**

Create test file in `tests/DeepLens.SearchApi.Tests/AttachmentSecurityTests.cs` implementing the following test cases:
1. `Upload_WithoutBearerToken_Returns401Unauthorized`
2. `Upload_WithValidBearerToken_Returns200Ok`
3. `DeleteByPath_WithoutBearerToken_Returns401Unauthorized`
4. `DeleteById_WithoutBearerToken_Returns401Unauthorized`
5. `Download_PrivateShippingLabel_WithoutBearerToken_Returns401Unauthorized`
6. `Download_PrivateOrderReceipt_WithoutBearerToken_Returns401Unauthorized`
7. `Download_PrivateShippingLabel_WithBearerToken_StreamsFileSuccessfully`
8. `DeleteMedia_WithoutBearerToken_Returns401Unauthorized`
9. `IngestImage_WithoutBearerToken_Returns401Unauthorized`

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/DeepLens.SearchApi.Tests/ --filter "FullyQualifiedName~AttachmentSecurityTests"`
Expected: FAIL (currently returns 200/400 instead of 401).

- [ ] **Step 3: Add `[Authorize]` attributes and path-based authorization**

In `AttachmentController.cs`:
- Add `[Authorize]` to `Upload`, `Delete`, and `DeleteByPath`.
- In `Download([FromQuery] string path)`: check if path is in private buckets (`labels/`, `order/`, `customer-vault/`). If so, require `User.Identity?.IsAuthenticated == true`; otherwise return `Unauthorized()`.
In `MediaController.cs`:
- Add `[Authorize]` to `DeleteMedia`.
In `IngestionController.cs`:
- Add `[Authorize]` at class level.

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test tests/DeepLens.SearchApi.Tests/ --filter "FullyQualifiedName~AttachmentSecurityTests"`
Expected: PASS.

---

### Task 4: Build 5-Layer Secure Survey Upload Proxy in Store.Api

**Files:**
- Create: `src/services/Store.Api/Services/IFileSecurityValidator.cs`
- Create: `src/services/Store.Api/Services/FileSecurityValidator.cs`
- Modify: `src/services/Store.Api/Program.cs`
- Modify: `src/services/Store.Api/Services/ISurveyService.cs`
- Modify: `src/services/Store.Api/Services/SurveyService.cs`
- Test: `tests/Store.Api.Tests/FileSecurityValidatorTests.cs`
- Test: `tests/Store.Api.Tests/SurveyUploadSecurityTests.cs`

**Interfaces:**
- Consumes: Multipart `IFormFileCollection` on `POST /api/v1/surveys/{slug}/upload`
- Produces: Validated, sanitized file upload results stored in `customer-vault`

- [ ] **Step 1: Write failing unit tests for `FileSecurityValidator` and Survey Upload Controller**

In `tests/Store.Api.Tests/FileSecurityValidatorTests.cs`, implement:
1. `ValidateAsync_GenuineJpegBytes_SucceedsWithNormalizedMime` (checks `FF D8 FF`)
2. `ValidateAsync_GenuinePngBytes_SucceedsWithNormalizedMime` (checks `89 50 4E 47 0D 0A 1A 0A`)
3. `ValidateAsync_GenuineWebpBytes_SucceedsWithNormalizedMime` (checks `RIFF....WEBP`)
4. `ValidateAsync_GenuinePdfBytes_SucceedsWithNormalizedMime` (checks `%PDF-`)
5. `ValidateAsync_ExecutableDisguisedAsJpg_FailsMagicBytesValidation` (rejects binary starting with `MZ` or ELF)
6. `ValidateAsync_TextScriptDisguisedAsPng_FailsMagicBytesValidation` (rejects `<?php` or `#!/bin/sh`)
7. `ValidateAsync_SvgFile_ExplicitlyRejectedForXssPrevention` (rejects `<svg ...>`)
8. `ValidateAsync_FileExceeding10Mb_FailsMaxFileSizeValidation`
9. `ValidateAsync_CorruptedRasterPayload_FailsImageSharpDecode`
10. `SanitizeImageAsync_StripsExifMetadataFromRasterImage`

In `tests/Store.Api.Tests/SurveyUploadSecurityTests.cs`, implement:
11. `Upload_Exceeding5Files_Returns400BadRequest`
12. `Upload_ZeroByteFile_Returns400BadRequest`
13. `Upload_GuestSurvey_ValidFiles_AllowsAnonymousUploadAndStreamsToCustomerVault`
14. `Upload_AuthenticatedSurvey_WithoutToken_Returns401Unauthorized`
15. `Upload_AuthenticatedSurvey_WithCustomerToken_SucceedsAndAttachesUserId`

- [ ] **Step 2: Run tests to verify failure**

Run: `dotnet test tests/Store.Api.Tests/ --filter "FullyQualifiedName~FileSecurityValidatorTests|FullyQualifiedName~SurveyUploadSecurityTests"`
Expected: FAIL.

- [ ] **Step 3: Implement `FileSecurityValidator`**

Create `src/services/Store.Api/Services/FileSecurityValidator.cs` implementing:
- Binary magic bytes matching for JPEG, PNG, WebP, PDF.
- Rejection of SVG/HTML/executable signatures.
- ImageSharp raster decode validation (`Image.IdentifyAsync` or `Image.LoadAsync`) and EXIF stripping.
- Size (10 MB max) and file count (up to 5 files) checks.

- [ ] **Step 4: Add `POST /api/v1/surveys/{slug}/upload` to `Program.cs` and `SurveyService`**

Implement endpoint:
- Verifies survey slug and checks if survey is guest or authenticated.
- If not guest, checks `X-Customer-Token` / session token.
- Validates up to 5 files via `FileSecurityValidator`.
- Streams validated files into `customer-vault` with UUID storage key: `surveys/{slug}/{virtualUserId}/{questionKey}/{guid}.{ext}`.
- Returns safe metadata (`fileKey`, `fileName`, `fileSizeBytes`, `mimeType`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `dotnet test tests/Store.Api.Tests/ --filter "FullyQualifiedName~FileSecurityValidatorTests|FullyQualifiedName~SurveyUploadSecurityTests"`
Expected: PASS.

---

### Task 5: Enforce Admin Authorization on Store.Api Survey Response Endpoints

**Files:**
- Modify: `src/services/Store.Api/Program.cs:950-970`
- Test: `tests/Store.Api.Tests/SurveyAdminSecurityTests.cs`

**Interfaces:**
- Consumes: Admin auth header (`Authorization` or `X-Store-Admin-Key`)
- Produces: 401 Unauthorized for unauthenticated callers accessing survey responses and presigned download URLs

- [ ] **Step 1: Write test verifying 401 on unauthenticated response retrieval**

In `tests/Store.Api.Tests/SurveyAdminSecurityTests.cs`, implement:
1. `GetResponseDetail_WithoutAdminAuth_Returns401Unauthorized`
2. `ListResponses_WithoutAdminAuth_Returns401Unauthorized`
3. `GetResponseDetail_WithValidAdminKey_Returns200OkAndGeneratesPresignedUrl`

- [ ] **Step 2: Run test to verify failure**

Run: `dotnet test tests/Store.Api.Tests/ --filter "FullyQualifiedName~SurveyAdminSecurityTests"`
Expected: FAIL (currently returns 200 with presigned download URL).

- [ ] **Step 3: Add admin auth guard to `Program.cs` survey admin endpoints**

In `src/services/Store.Api/Program.cs`:
Verify admin authorization before invoking `surveyService.GetResponseDetailAsync` and `surveyService.ListResponsesAsync`. Return `Results.Unauthorized()` if caller is not an admin.

- [ ] **Step 4: Run tests to verify pass**

Run: `dotnet test tests/Store.Api.Tests/ --filter "FullyQualifiedName~SurveyAdminSecurityTests"`
Expected: PASS.

---

### Task 6: Full Verification & E2E Validation

**Files:**
- Test: All tests across `DeepLens.SearchApi.Tests` and `Store.Api.Tests`

- [ ] **Step 1: Run all unit and integration tests**

Run: `dotnet test tests/DeepLens.SearchApi.Tests/`
Run: `dotnet test tests/Store.Api.Tests/`
Expected: All tests PASS.

- [ ] **Step 2: Live validation of MinIO anonymous policy**

Run: `docker exec minio mc anonymous get local/whatsapp-data`
Expected: `private`.
Run: `docker exec minio mc anonymous get local/store-assets`
Expected: `download`.

- [ ] **Step 3: Live probe of Nginx gateway**

Run: `curl -I http://media.vayyarifashions.com/whatsapp-data/test.jpg`
Expected: 404 Not Found (blocked by Nginx).
Run: `curl -I http://adminapi.vayyarifashions.com/api/v1/Attachment/download?path=labels/test.pdf`
Expected: 401 Unauthorized.

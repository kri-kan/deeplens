# Architectural Decision: Private Customer Vault & Survey File Upload Framework

**Date**: 2026-11-03  
**Decision Maker**: Krishna (Squad Lead & Coordinator)  
**Status**: Accepted & Implemented  
**Scope**: MinIO Object Storage, Store.Api (.NET 9), PostgreSQL (`deeplens_store`), ADO Work Items #1376, #1377, #1378, #1379

---

## 1. Context & Business Intent
While product catalog media and promotional assets in `store-assets` are publicly accessible for CDN edge caching and storefront rendering, customer-submitted information (such as survey attachments, order issue photos, receipts, and custom measurement notes) contains sensitive personal data that must never be publicly readable or scrapable.

Additionally, to standardize zero-party and first-party intake across surveys, feedback loops, and customer service forms, the survey engine requires an atomic question type (`file_upload`) where admins can configure:
- Minimum and maximum file count constraints
- Maximum file size (MB) and minimum file size (KB)
- Strict MIME type and file extension allowlists
- Mobile capture mode (`camera_only`, `gallery_only`, `camera_or_gallery`, `document`)

To avoid piping heavy multipart uploads through backend API servers, the architecture provides **two-phase magic presigned upload tickets** directly into a dedicated private MinIO bucket, verifies uploads upon survey submission, and protects admin review with short-lived presigned download URLs.

---

## 2. Key Architectural Decisions

### A. Dedicated Private Bucket: `customer-vault` (ADO #1377)
- **Bucket Policy**: Set to `private` with zero anonymous permissions (`anonymous set none`). Any unauthenticated HTTP request returns `403 Access Denied`.
- **Storage Partitioning**:
  `customer-vault/surveys/{surveySlug}/{virtualUserId}/{questionKey}/{guid}_{fileName}`
- **Isolation Guarantee**: Prevents file collisions and isolates customer uploads by survey, device signature, and question handle.

### B. Two-Phase Magic Presigned Upload Tickets (ADO #1378)
1. **Ticket Request**: Customer requests an upload ticket via:
   `POST /api/v1/surveys/{slug}/upload-ticket`
   The backend validates:
   - File MIME type against `allowedMimeTypes`
   - File extension against `allowedExtensions`
   - File size against `maxFileSizeMb` and `minFileSizeKb`
2. **Presigned PUT URL**: The backend generates a scoped S3 V4 presigned PUT URL with a 15-minute TTL (`WithExpiry(900)`).
3. **Direct Client Upload**: The browser/mobile app streams binary data directly to MinIO via HTTP `PUT` without proxying through API servers.

### C. Survey Submission Verification (ADO #1378)
- During `POST /api/v1/surveys/{slug}/submit`, for all answers to questions with `questionType == "file_upload"`:
  - Verifies that file count satisfies `minFiles` and `maxFiles`.
  - Verifies that referenced object keys reside inside `customer-vault`.
  - Performs an asynchronous `StatObjectAsync` check against MinIO to ensure the file was physically uploaded prior to completing the submission and crediting Mudras.

### D. Private Admin Review via Ephemeral Presigned GET URLs (ADO #1379)
- In `GET /api/v1/admin/surveys/responses/{responseId}`, for any `file_upload` answers, the backend dynamically resolves stored `fileKey` paths into temporary presigned GET URLs (30–60 minutes TTL).
- This allows administrative staff to inspect photos/receipts in the Admin Studio without ever exposing the `customer-vault` bucket to the public internet.

---

## 3. Azure DevOps Governance Mapping

| Work Item ID | Type | Title | Status |
|:---|:---|:---|:---|
| **#1376** | Feature | `[Storage & Survey Files] Private Customer Vault & Configurable File Upload Question Engine` | In Progress |
| **#1377** | User Story | `[Infra/MinIO] Dedicated customer-vault Private Bucket, Lifecycle & Security Isolation` | Completed |
| **#1378** | User Story | `[Backend/API] Store.Api File Upload Question Validation, Presigned Ticket Generation & Submission Verifier` | In Progress |
| **#1379** | User Story | `[Admin/Security] Private Response Attachment Resolution with Ephemeral Presigned GET URLs` | In Progress |

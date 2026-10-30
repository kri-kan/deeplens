# Architectural Decision: Ephemeral In-Memory Visual Lens Search (Zero Database & Storage Footprint)

- **Date:** 2026-10-29
- **Decision Owner:** Krishna (Squad Lead & Coordinator)
- **Status:** Enforced & Validated

## Context & Requirement
The user requested that any image used for visual similarity lens search (whether picked from device photo gallery, camera, WhatsApp chat preview, or Instagram media) must **never create orphan media records** in the database or persist temporary blobs in object storage (MinIO), and must not require manual garbage collection or cleanup events.

## Audit & Verification of the Architecture
1. **Frontend Intake (`product-list.tsx` & `VisualLensButton.tsx`):**
   - When picking from the local device gallery via `ImagePicker.launchImageLibraryAsync({ base64: true })`, the image is read into React Native RAM as an ephemeral Base64 string (`data:image/jpeg;base64,...`) and local temporary file cache managed by the OS.
   - When launching from WhatsApp chat or Instagram media previews, existing identifiers (`postId`, `mediaId`, `storagePath`, or `imageUrl`) are passed as search query arguments.
   - The frontend never calls an "upload media" endpoint (`/api/v1/ingestion/upload` or `/api/v1/attachments/upload`) when executing a search.

2. **Backend Processing (`ProductsController.cs`):**
   - The endpoint `POST /api/v1/products/visual-similarity` receives the request:
     - If `ImageBase64` is supplied: The string is decoded directly into a transient .NET `MemoryStream(bytes)`.
     - The stream is passed to `ComputeDHash(stream)` (using SixLabors.ImageSharp in RAM, 9x8 grayscale difference hash).
     - The memory stream and image instance are immediately disposed via `using`.
     - No SQL `INSERT` is executed into `public.media`, `public.media_links`, or any other table.
     - No file is uploaded to MinIO / S3.
   - If `ImageUrl` is supplied: A temporary `HttpClient.GetByteArrayAsync` loads bytes into memory, hashes, and disposes without persisting to storage or DB.
   - If `MediaId`, `StoragePath`, or `PostId` is supplied: It looks up the pre-existing perceptual hash (`phash`) already present on the cataloged media row.

3. **Lifecycle Guarantee:**
   - Visual search operations are strictly **read-only, stream-and-discard calculations**.
   - No orphan records are generated in PostgreSQL.
   - No transient files leak into MinIO.
   - No scheduled cleanup or manual purge event is required.

## Test Validation
- Added automated regression test in `src/vayyari/tests/visualLensSimilarityRules.test.ts`:
  - `visual search queries are strictly ephemeral in-memory computations without persisting orphan media`
- All 311 unit and integration tests passing.

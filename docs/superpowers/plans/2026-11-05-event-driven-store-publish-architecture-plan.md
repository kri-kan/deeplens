# Event-Driven Asynchronous Store Publishing, Update Sync & Admin Pipeline Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform synchronous store publishing and delta update syncs into a resilient, scalable, event-driven pipeline via Kafka with `202 Accepted` batch jobs, zero-download MinIO server-side copies, automatic catalog synchronization, and live visibility in the Admin Pipeline Events Dashboard.

**Architecture:** `Store.Api` receives publish/sync requests, persists a `publish_jobs` tracking row, immediately returns `202 Accepted`, and publishes messages to `store.product.publish.requested`. `DeepLens.WorkerService` consumes events with bounded concurrency (5 items), performs media diffing and MinIO bucket-to-bucket copies, updates PostgreSQL `deeplens_store`, sets in-store review pending status, and emits `store.product.sync.completed`. `DeepLens.SearchApi` listens to sync completion to update `deeplens_platform.products.store_publish_updated_at`. `AdminPipelineEventsPage` and `AdminVayyariStorePublishPage` are updated with the `store_publish` category filter, live progress pill, and dashboard metric cards.

**Tech Stack:** .NET 9 (`Store.Api`, `DeepLens.WorkerService`, `DeepLens.SearchApi`), Apache Kafka, PostgreSQL (`deeplens_store`, `deeplens_platform`), MinIO S3 API, React Native / Tamagui (`src/vayyari`), Node.js Express (`whatsapp-processor`).

**Spec:** [`docs/superpowers/specs/2026-11-05-event-driven-store-publish-architecture-design.md`](file:///home/krikan/productivity/deeplens/docs/superpowers/specs/2026-11-05-event-driven-store-publish-architecture-design.md)

## Global Constraints
- **C# DTOs**: Every public property MUST have `[JsonPropertyName("camelCase")]`.
- **TypeScript interfaces**: MUST mirror backend DTO camelCase names exactly.
- **Database naming**: `lowercase_with_underscores`.
- **Async Media Processing**: Video/image uploads MUST return `202 Accepted` and publish to Kafka topics.
- **Deployments**: Always build & publish to `/data/hosting/{service}` using `--no-restore` and restart via Docker.
- **Vayyari Packager**: Never run `npx expo start` manually; use `tmux send-keys -t expo r C-m`.

## Review Focus
1. Large batch (100 products) with 600 images runs without blowing HTTP timeouts or spiking server memory.
2. Single-image failure records a specific item error in `error_details` JSONB without crashing or stalling the rest of the batch.
3. Delta updates properly cascade `is_review_pending = true` and `review_reason = 'media_updated'` across all sibling variants under `parent_catalog_id`.
4. Catalog product `store_publish_updated_at` automatically updates on `deeplens_platform` when worker finishes without frontend intervention.
5. Admin Pipeline Events Dashboard displays `store_publish` events, queue depth, and metrics in real-time.

---

### Task 1: [Data/Postgres] Publish Jobs Table & Schema (Story 1381)
**Files:**
- Create: `database/migrations/20261105_create_publish_jobs_table.sql`
- Test: Postgres execution & schema verification via `psql`

- [ ] **Step 1: Write migration SQL for `publish_jobs` table and indexes in `deeplens_store`**
- [ ] **Step 2: Execute migration against `deeplens_store`**
- [ ] **Step 3: Verify schema using `\d publish_jobs`**

---

### Task 2: [Messaging/Contracts] Kafka Event Models & Topic Constants (Story 1382)
**Files:**
- Modify: `src/DeepLens.Service/DeepLens.Contracts/Events/StorePublishEvents.cs`
- Modify: `src/DeepLens.Service/DeepLens.Contracts/Catalog/IProductService.cs`
- Test: `tests/DeepLens.Catalog.Tests/StorePublishContractsTests.cs`

- [ ] **Step 1: Define `StoreProductPublishRequestedEvent`, `StoreProductSyncCompletedEvent`, and `StoreProductPublishFailedEvent` records with `[JsonPropertyName("camelCase")]`**
- [ ] **Step 2: Add topic constants: `store.product.publish.requested`, `store.product.sync.completed`, `store.product.publish.failed`**
- [ ] **Step 3: Write unit tests verifying serialization / deserialization roundtrip**

---

### Task 3: [API/Store.Api] 202 Accepted Publish Job Endpoint & Status Polling (Story 1384)
**Files:**
- Modify: `src/services/Store.Api/Program.cs`
- Modify: `src/services/Store.Api/Services/ICurationService.cs`
- Modify: `src/services/Store.Api/Services/CurationService.cs`
- Modify: `src/services/Store.Api/Models/StoreDtos.cs`
- Test: `tests/Store.Api.Tests/PublishJobEndpointTests.cs`

- [ ] **Step 1: Implement `CreatePublishJobAsync` and `GetPublishJobAsync` in `CurationService.cs`**
- [ ] **Step 2: Expose `POST /api/v1/admin/products/publish-job` (returning 202 Accepted) in `Program.cs`**
- [ ] **Step 3: Expose `GET /api/v1/admin/products/publish-jobs/{id}` in `Program.cs`**
- [ ] **Step 4: Emit Kafka message `store.product.publish.requested` for each requested product ID**
- [ ] **Step 5: Run integration tests proving 202 Accepted response and job tracking retrieval**

---

### Task 4: [Backend/Worker] Async Publishing & Media Sync Worker with MinIO Server-Side Copy (Story 1383)
**Files:**
- Create: `src/DeepLens.Service/DeepLens.WorkerService/Workers/StoreProductPublishWorker.cs`
- Modify: `src/services/Store.Api/Services/MediaStorageService.cs`
- Modify: `src/DeepLens.Service/DeepLens.WorkerService/Program.cs`
- Test: `tests/DeepLens.Application.Tests/StoreProductPublishWorkerTests.cs`

- [ ] **Step 1: Implement MinIO server-side copy helper (`CopyObjectAsync`) in `MediaStorageService.cs` to eliminate byte downloads**
- [ ] **Step 2: Create `StoreProductPublishWorker` in `DeepLens.WorkerService` consuming `store.product.publish.requested` with bounded concurrency**
- [ ] **Step 3: Implement execution branching for `initial_publish` vs `sync_updates`**
- [ ] **Step 4: Update `publish_jobs` counters (`processed_count`, `failed_count`, `status`)**
- [ ] **Step 5: Emit `store.product.sync.completed` upon success or `store.product.publish.failed` on error**

---

### Task 5: [API/Catalog] Event-Driven Catalog Sync in SearchApi (Story 1385)
**Files:**
- Modify: `src/DeepLens.Service/DeepLens.SearchApi/Services/ProductService.cs`
- Modify: `src/DeepLens.Service/DeepLens.SearchApi/Program.cs`
- Test: `tests/DeepLens.SearchApi.Tests/CatalogSyncEventConsumerTests.cs`

- [ ] **Step 1: Create hosted service or Kafka background consumer in `DeepLens.SearchApi` for `store.product.sync.completed`**
- [ ] **Step 2: Execute SQL update `UPDATE products SET is_published = TRUE, store_publish_updated_at = @Timestamp WHERE id = @ProductId`**
- [ ] **Step 3: Verify catalog products disappear from Publish Updates queue when event arrives**

---

### Task 6: [Observability/Dashboard] Admin Pipeline Events Dashboard Integration (Story 1387)
**Files:**
- Modify: `src/whatsapp-processor/src/routes/pipeline-failures.routes.ts`
- Modify: `src/vayyari/components/tamagui-ui/pages/AdminPipelineEventsPage.tsx`
- Modify: `src/vayyari/services/wa-processor.service.ts`
- Modify: `src/apps/storybook/src/stories/pages/AdminPipelineEventsPage.stories.tsx`
- Test: Storybook story check and unit tests

- [ ] **Step 1: Add `store_publish` to `EventCategoryFilter` and query `store.product.*` events in `pipeline-failures.routes.ts`**
- [ ] **Step 2: Add category pill `"Store Publish"` and KPI gauge in `AdminPipelineEventsPage.tsx`**
- [ ] **Step 3: Render store publish active jobs in Active Queue tab**
- [ ] **Step 4: Update Storybook mocks and stories to verify 7-state UI validation**

---

### Task 7: [UI/Admin] Vayyari Store Publish Non-Blocking Job Progress & Floating Pill UX (Story 1386)
**Files:**
- Modify: `src/vayyari/services/storeAdminService.ts`
- Modify: `src/vayyari/app/store/publish.tsx`
- Test: UI verification with mock/real job polling

- [ ] **Step 1: Add `submitPublishJob` and `getPublishJobStatus` to `storeAdminService.ts`**
- [ ] **Step 2: Update `publish.tsx` to call `submitPublishJob` on both Initial Publish and Sync Updates tabs**
- [ ] **Step 3: Optimistically dismiss selected items and display floating progress pill (`Syncing updates 14/100...`)**
- [ ] **Step 4: Reload Expo (`tmux send-keys -t expo r C-m`) and verify in UI**

---

### Task 8: Verification, Service Deployment & Decision Persistence
**Files:**
- Modify: `.squad/decisions/inbox/2026-11-05-event-driven-store-publish.md`
- Run: `./build-and-deploy.sh` or targeted container restart for updated services
- Test: End-to-end integration test publishing a batch of test products

# Implementation Plan: Atomic All-or-Nothing Store Publish Rollback & Failed Publishings Queue

**Goal:** Ensure publishing a product to the store is strictly all-or-nothing (zero partial data on failure), with automated multi-database rollback, MinIO orphaned media cleanup, and a dedicated "Failed / Retry" review queue with single-click batch re-publishing in the Vayyari Admin app.

**User Stories:**
- Azure DevOps #1388: `[Backend/Worker] Atomic NpgsqlTransaction, MinIO Cleanup & Multi-DB Compensating Rollback`
- Azure DevOps #1389: `[API & UI] Failed Publishings Queue, Error Inspection & Batch Retry Workflow`

---

## Proposed Changes

### 1. Backend / Worker: Atomic Transaction & Compensating Rollback (`DeepLens.WorkerService`)
- File: `src/DeepLens.Service/DeepLens.WorkerService/Workers/StoreProductPublishWorker.cs`
- Changes:
  1. **Track Ingested MinIO Keys**: Accumulate newly copied MinIO keys in `newlyCopiedMediaKeys`. If an exception occurs, iterate and call `RemoveObjectAsync` to purge orphans.
  2. **Local ACID Transaction in `deeplens_store`**:
     - Wrap `INSERT/UPDATE products` and sibling variant cascades inside `using var storeTx = await storeConn.BeginTransactionAsync(ct)`.
  3. **Staged Dual-Database Commit**:
     - Keep `storeTx` uncommitted while synchronizing `deeplens_platform.products` (`is_published = true, store_publish_updated_at = NOW()`).
     - If `deeplens_platform` update fails (e.g., connection drop), `storeTx` is rolled back immediately via `await storeTx.RollbackAsync(ct)`.
     - Only after `deeplens_platform` succeeds is `await storeTx.CommitAsync(ct)` called.
  4. **Strict Failure Marking**:
     - On exception, ensure `publish_jobs` records rich JSON in `error_details`:
       `{ productId, productCode, title, error, timestamp, canRetry, action }`.
     - Mark status as `failed` (if all failed) or `partial` (if mixed).
     - Produce `store.product.publish.failed` event to Kafka.

### 2. Store.Api: Failed Publishings Queue & Retry Endpoints
- Files:
  - `src/services/Store.Api/Models/CurationModels.cs`
  - `src/services/Store.Api/Services/ICurationService.cs`
  - `src/services/Store.Api/Services/CurationService.cs`
  - `src/services/Store.Api/Program.cs`
- Changes:
  1. Add DTOs:
     - `PublishFailureDto(Guid JobId, Guid ProductId, string ProductCode, string Title, string Category, string Fabric, string PrimaryImageUri, string ErrorMessage, DateTime FailedAt, string Action, bool CanRetry)`
     - `RetryPublishBatchRequest(List<Guid> ProductIds, string? Action)`
  2. Implement `GetPublishFailuresAsync()` in `CurationService`:
     - Queries `publish_jobs` where `failed_count > 0` and extracts unretried failed product attempts.
     - Enriches with product metadata (title, productCode, thumbnail).
     - Excludes products that have since been successfully published.
  3. Implement `RetryPublishFailuresAsync()` in `CurationService`:
     - Creates a new `publish_job` record, publishes `store.product.publish.requested` to Kafka, and updates prior failure records with `retried = true`.
  4. Register endpoints:
     - `GET /api/v1/admin/products/publish-failures`
     - `POST /api/v1/admin/products/publish-failures/retry` (`202 Accepted`)

### 3. Frontend / Vayyari Admin: Failed / Retry Queue Tab & Retry Button
- Files:
  - `src/vayyari/services/storeAdminService.ts`
  - `src/vayyari/components/tamagui-ui/pages/AdminVayyariStorePublishPage.tsx`
  - `src/apps/storybook/src/components/pages/AdminVayyariStorePublishPage.tsx`
  - `src/apps/storybook/src/stories/pages/AdminVayyariStorePublishPage.stories.tsx`
  - `src/vayyari/app/store/publish.tsx`
- Changes:
  1. Add API client functions: `getPublishFailures()`, `retryPublishFailures(productIds, action)`.
  2. In `AdminVayyariStorePublishPage`:
     - Add `activeQueue` state: `'all' | 'publish_updates' | 'failed'`.
     - Add 3rd tab: `Failed / Retry (${failedPublishCount})` with red warning badge.
     - In `'failed'` view:
       - Show red error banner on product cards with exact failure reason (`⚠️ ${errorReason}`).
       - Show failed timestamp.
       - Allow item selection and batch selection.
       - Render bottom action bar: `"Retry Publish (${selectedIds.length})"` with reload icon (`LuRotateCcw`).
  3. In `publish.tsx`:
     - Load failed publishings in parallel during `loadData()`.
     - Handle `handleRetryBatch(selectedIds)`.

---

## Verification Plan
1. **Unit & Integration Tests**:
   - Run `StorePublishContractsTests` and `Store.Api.Tests`.
2. **Rollback Verification**:
   - Send an invalid/failing publish request (e.g. non-existent media or injected failure) and verify:
     - `deeplens_store.products` contains ZERO records for the failed product.
     - `deeplens_platform.products.is_published` remains `false`.
     - `publish_jobs` records `status = 'failed'` with full `error_details`.
3. **Queue & Retry Verification**:
   - Call `GET /api/v1/admin/products/publish-failures` and verify the failed product appears in the list.
   - Call `POST /api/v1/admin/products/publish-failures/retry` (or click "Retry" in Vayyari Admin) and verify a new 202 job is issued.
   - Verify that upon successful completion, the product leaves the Failed queue.

# Architectural Decision: Event-Driven Asynchronous Store Publishing, Delta Update Sync & Pipeline Visibility

**Date:** 2026-11-05  
**Author:** Krishna (Squad Lead & Coordinator) with Bhishma (Architect), Naga (SQL Data), Sanjaya (Observability), and Viswakarma (Design)  
**Status:** Approved & Applied  
**Azure DevOps Work Items:** Feature #1380, User Stories #1381, #1382, #1383, #1384, #1385, #1386, #1387  

## Context
Publishing products from `deeplens_platform` to `deeplens_store` was previously executed as a synchronous client-side sequential loop in the Vayyari Admin mobile app (`app/store/publish.tsx`). For each selected product, the client issued synchronous HTTP calls to `Store.Api` (`/api/v1/admin/products/publish`), which downloaded all product media over HTTP into backend memory before re-uploading to the store assets bucket.
When scaling up to batch-publishing 10s–100s of products:
1. High risk of HTTP connection timeouts, gateway drops, and mobile client interruptions.
2. Server RAM spikes caused by concurrent byte-array media buffering in .NET service memory.
3. Lack of support for delta update syncing (publishing updates when vendor catalog descriptions, prices, or media changed post-initial publish).
4. Lack of central tracking, state machines, and observability for asynchronous store publishing jobs.

## Decisions & Changes

1. **Decoupled Asynchronous Job State Machine (`deeplens_store.publish_jobs`)**:
   - Created table `publish_jobs` in `deeplens_store` tracking job lifecycle: `queued` ➔ `in_progress` ➔ `completed` | `failed` | `partial`.
   - Records `action` (`initial_publish` or `sync_updates`), total counts, processed counts, failed counts, detailed error arrays in `error_details` JSONB, and requestor actor.

2. **Non-Blocking 202 Accepted Store API (`Store.Api`)**:
   - `POST /api/v1/admin/products/publish-job` creates a job record in `deeplens_store`, dispatches `store.product.publish.requested` event to Kafka topic `store.product.publish.requested`, and returns `202 Accepted` with `{ jobId, status: 'queued', action, totalCount }`.
   - `GET /api/v1/admin/products/publish-jobs/{id}` returns real-time progress for client polling.

3. **Zero-RAM MinIO Server-Side Copy (`DeepLens.WorkerService`)**:
   - `StoreProductPublishWorker` subscribes to `store.product.publish.requested` with a bounded concurrency pool (`SemaphoreSlim(5)`).
   - Media copying from source bucket (`general`) to target bucket (`store-assets`) uses MinIO S3 API `CopyObjectAsync` server-side, eliminating multi-megabyte image downloads into service memory.

4. **Review Cascade & Delta Update Sync (`StoreProductPublishWorker`)**:
   - Upserts product records and color variants into `deeplens_store.products` and `deeplens_store.product_variants`.
   - Automatically marks new and updated products and variants with `is_review_pending = true` and `review_reason = 'media_updated'` so merchandisers can curate them before making them live.
   - Synchronizes `deeplens_platform.products.store_publish_updated_at = NOW()` and `is_published = true`, automatically clearing updated items from the "Publish Updates" queue.
   - Publishes `store.product.sync.completed` on completion and `store.product.publish.failed` on fatal errors.

5. **Admin Pipeline Events Dashboard & Observability Integration**:
   - Registered `store.product.publish.requested`, `store.product.sync.completed`, and `store.product.publish.failed` in the centralized Pipeline Contracts Catalog in `whatsapp-processor` (`/api/admin/pipeline-events`).
   - Added `🏪 Store Publish` category filter chip, badges, and counters in `AdminPipelineEventsPage` (Tamagui UI and Storybook).

6. **Vayyari Admin UI Non-Blocking Dispatch**:
   - Updated `app/store/publish.tsx` and `storeAdminService.ts` to submit publish jobs asynchronously without freezing the UI.
   - Optimistically reflects published/synced counts in the local UI state while jobs execute safely in the background.

## Verification
- Unit & contract tests: `StorePublishContractsTests` passed (`2 passed, 0 failed`).
- Migration applied cleanly to `deeplens_store` on PostgreSQL port 5432.
- Kafka topics created on `kafka-prod` with 3 partitions and verified via CLI.
- End-to-end integration verified: Published product `c12e23f0-91ae-4c9e-bd5b-a38a95626d85` (`VF69F9`), job `f4fb55d5-d18a-4fdb-bf32-898cd5cb9694` completed with status `completed` in 340ms, zero errors, MinIO images cloned, and `store_publish_updated_at` updated.
- Azure DevOps Work Items #1380 to #1387 transitioned to `Closed`.

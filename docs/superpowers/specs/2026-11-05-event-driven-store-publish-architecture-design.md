# Event-Driven Asynchronous Store Publishing, Update Sync & Admin Pipeline Visibility

## 1. Intent & The Why

In DeepLens and the Vayyari Store ecosystem, publishing products to the store or syncing delta updates (`media_updated_at > store_publish_updated_at`) currently operates as a **synchronous, blocking HTTP request chain**:
1. The admin UI loops through selected products, making dozens or hundreds of concurrent HTTP GET calls (`productService.getProduct`) to `DeepLens.SearchApi` (port 5000).
2. The UI aggregates all product media into a massive JSON payload and issues `POST /api/v1/admin/products/publish` to `Store.Api` (port 5005).
3. `Store.Api` loops over each product sequentially, downloads every image into RAM via `HttpClient.GetByteArrayAsync`, computes hashes, streams bytes to MinIO (`store-assets`), and writes to PostgreSQL.
4. If `Store.Api` finishes, the UI issues another synchronous HTTP call `productService.recordStorePublish` back to `DeepLens.SearchApi`.

### The Scaling Bottleneck
As publishing scales from 1–5 items to batches of **10 to 100+ products**:
- **Gateway Timeouts (504)**: 100 products × 6 images = 600 downloads + 600 MinIO uploads. At ~100ms per image, this takes >60 seconds, exceeding standard reverse proxy/Kestrel timeouts (30s–60s).
- **RAM Exhaustion (OOM)**: Buffering dozens of multi-megabyte high-resolution saree images simultaneously into server memory risks container OOM crashes.
- **Split-Brain Inconsistency**: If network drops or an asset fails halfway through, partial rows remain in `deeplens_store`, while `deeplens_platform` never records them as published.
- **Admin Visibility Void**: Administrators have no visibility into background publishing progress, queue depth, throughput, or failure diagnostics in the Admin Pipeline Events Dashboard.

This project delivers an end-to-end event-driven architecture that accepts publishing and update sync requests immediately (`202 Accepted`), dispatches them via Kafka (`store.product.publish.requested`), processes media via bounded worker concurrency with zero-download MinIO server-side copies, automatically synchronizes platform catalog state via `store.product.sync.completed`, surfaces live progress to the merchant, and integrates store publish telemetry into the Admin Pipeline Events Dashboard.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Immediate Request Acceptance (`202 Accepted`)**: Convert `POST /api/v1/admin/products/publish-job` to return immediately (<50ms) with a `jobId`, whether processing 1 or 200 products.
- **Unified Pipeline for Initial Publish & Update Sync**: Handle both initial catalog publishing (`action = 'initial_publish'`) and delta media update sync (`action = 'sync_updates'`) within the same decoupled pipeline.
- **Kafka Event Streaming**: Publish partitioned events to `store.product.publish.requested` (partition key: `productId`) to avoid race conditions.
- **Bounded Worker Concurrency**: Process products in workers with configurable concurrency (e.g., 5 concurrent items) to cap memory and database connection overhead.
- **MinIO Server-Side Copy (Zero-RAM Cloning)**: Clone images already in MinIO (`catalog-assets` -> `store-assets`) using server-side S3 copy API instead of downloading bytes into application RAM.
- **Automatic Platform Catalog Synchronization**: Worker emits `store.product.sync.completed`, which updates `deeplens_platform.products.store_publish_updated_at` automatically without secondary frontend HTTP calls.
- **In-Store Attention Flagging**: Automatically set `is_review_pending = true` and `review_reason = 'media_updated'` and cascade across sibling color variants in `deeplens_store.products` during update syncs.
- **Admin Pipeline Events Dashboard Visibility**: Add a new `store_publish` event category filter and live telemetry cards to `AdminPipelineEventsPage` (`store.product.publish.requested`, `store.product.sync.completed`, `store.product.publish.failed`).
- **Responsive Admin UI Progress**: Replace blocking UI spinners with an optimistic queue dismiss and a floating progress pill (`Syncing updates 42/100...`).

### Non-Goals
- Changing consumer-facing storefront checkout or cart APIs.
- Altering the Myntra-style color variant display logic (`VF{hex}{DD}`) or database anchor rules established in ADR-005.

### Anti-Goals
- Do NOT download images over HTTP into web server RAM when they already exist in MinIO.
- Do NOT leave products in an indeterminate state; every item in a batch job MUST resolve to either `completed` or `failed` with recorded error details.
- Do NOT require the frontend to orchestrate multi-step synchronization across two separate backend APIs.

---

## 3. Constraints & Architectural Standards
- **Databases**: PostgreSQL `deeplens_store` (store schema) and `deeplens_platform` (catalog schema).
- **Messaging**: Apache Kafka on `localhost:9092` with JSON serialization.
- **Backend Services**: .NET 9 Minimal API (`Store.Api`), .NET 9 Worker (`DeepLens.WorkerService`), and .NET 9 API (`DeepLens.SearchApi`).
- **UI Framework**: React Native + Tamagui (`src/vayyari`), Storybook (`src/apps/storybook`).
- **Coding Standard**: Every C# DTO property MUST have `[JsonPropertyName("camelCase")]`; TypeScript interfaces MUST mirror backend DTO camelCase names exactly.
- **Deployments**: Built and published to `/data/hosting/{service}`.

---

## 4. Approaches Considered

### Approach A: Asynchronous Kafka Event Pipeline with Worker Consumer (Selected)
`Store.Api` writes an initial `publish_jobs` record, publishes an event per product to `store.product.publish.requested`, and returns `202 Accepted`. A dedicated consumer worker in `DeepLens.WorkerService` processes the items with bounded concurrency, executing MinIO server-side copies, updating PostgreSQL, and emitting `store.product.sync.completed`.
- **Pros**: Perfectly satisfies the squad hard rule ("Async Media Processing MUST return 202 Accepted and publish to Kafka"); resilient to crashes; zero memory spikes; horizontally scalable; seamless retry policies; provides real-time event stream directly compatible with the Admin Pipeline Events Dashboard.
- **Cons**: Requires Kafka running (which is already an established core dependency in DeepLens).

### Approach B: In-Memory Background Queue / Channels inside Store.Api (Rejected)
Use .NET `System.Threading.Channels` inside `Store.Api` to process publishing in the background.
- **Why Rejected**: Loses all jobs if `Store.Api` restarts or redeploys; cannot scale workers independently from API replicas; doesn't emit Kafka events needed for the Admin Pipeline Events Dashboard; violates squad async media guidelines.

### Approach C: Database Outbox Poller (Rejected)
Write pending publish tasks to Postgres and poll with a cron job.
- **Why Rejected**: Higher polling latency, polling database lock contention, and adds unnecessary polling overhead when Kafka is already active.

**Decision**: Approach A is selected.

---

## 5. Detailed Technical Specifications

### 5.1 Database Schema (`deeplens_store.publish_jobs`)
```sql
CREATE TABLE IF NOT EXISTS publish_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(32) NOT NULL,            -- 'initial_publish' | 'sync_updates'
    status VARCHAR(32) NOT NULL,            -- 'queued' | 'in_progress' | 'completed' | 'failed' | 'partial'
    total_count INT NOT NULL,
    processed_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    error_details JSONB DEFAULT '[]'::jsonb,
    requested_by VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_publish_jobs_status ON publish_jobs (status);
CREATE INDEX IF NOT EXISTS idx_publish_jobs_created_at ON publish_jobs (created_at DESC);
```

### 5.2 Kafka Event Topics & Schemas

#### Topic: `store.product.publish.requested`
- **Partition Key**: `productId` (UUID as string)
- **Schema**:
```json
{
  "eventId": "f781a990-281b-419a-a8ea-8b17316710b1",
  "jobId": "b182cb01-...",
  "action": "initial_publish", // or "sync_updates"
  "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "productCode": "VF69F5",
  "requestedBy": "admin@deep-lens.ai",
  "timestamp": "2026-11-05T00:40:00Z"
}
```

#### Topic: `store.product.sync.completed`
- **Partition Key**: `productId`
- **Schema**:
```json
{
  "eventId": "c928b172-...",
  "jobId": "b182cb01-...",
  "action": "initial_publish",
  "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "productCode": "VF69F5",
  "isReviewPending": true,
  "reviewReason": "media_updated",
  "publishedAt": "2026-11-05T00:40:05Z",
  "syncedMediaCount": 6,
  "timestamp": "2026-11-05T00:40:05Z"
}
```

#### Topic: `store.product.publish.failed`
- **Partition Key**: `productId`
- **Schema**:
```json
{
  "eventId": "d019f283-...",
  "jobId": "b182cb01-...",
  "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "productCode": "VF69F5",
  "errorMessage": "Source image download failed (HTTP 404)",
  "timestamp": "2026-11-05T00:40:05Z"
}
```

---

### 5.3 Backend API Contracts (`Store.Api`)

#### 1. Submit Batch Publish Job
`POST /api/v1/admin/products/publish-job`
- **Request Body**:
```json
{
  "action": "sync_updates",
  "productIds": [
    "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  ]
}
```
- **Response**: `202 Accepted`
```json
{
  "jobId": "b182cb01-...",
  "status": "queued",
  "totalCount": 1,
  "action": "sync_updates",
  "timestamp": "2026-11-05T00:40:00Z"
}
```

#### 2. Get Job Status
`GET /api/v1/admin/products/publish-jobs/{jobId}`
- **Response**: `200 OK`
```json
{
  "id": "b182cb01-...",
  "action": "sync_updates",
  "status": "in_progress", // 'queued' | 'in_progress' | 'completed' | 'failed' | 'partial'
  "totalCount": 100,
  "processedCount": 42,
  "failedCount": 0,
  "errorDetails": [],
  "createdAt": "2026-11-05T00:40:00Z",
  "updatedAt": "2026-11-05T00:40:15Z"
}
```

---

### 5.4 MinIO Server-Side Copy Engine
In `MediaStorageService.cs`:
When the source image URL is already in a local MinIO bucket (e.g. `catalog-assets` or `deeplens` bucket):
```csharp
var copyArgs = new CopyObjectArgs()
    .WithBucket(_bucketName)
    .WithObject(destinationStorageKey)
    .WithCopyObjectSource(new CopySourceObjectArgs()
        .WithBucket(sourceBucket)
        .WithObject(sourceStorageKey));
await _minioClient.CopyObjectAsync(copyArgs, ct);
```
- **Performance Impact**: Zero network egress/ingress between service and MinIO; zero byte array allocations in .NET memory; instantaneous clone on the MinIO storage server.

---

### 5.5 Admin Pipeline Events Dashboard Integration
In `src/vayyari/components/tamagui-ui/pages/AdminPipelineEventsPage.tsx`:
1. Add `'store_publish'` to `EventCategoryFilter`:
   ```typescript
   export type EventCategoryFilter = 'all' | 'split_merge' | 'product_create' | 'media_sync' | 'store_publish' | 'error';
   ```
2. Render filter pill: **"Store Publish"** with a store/upload icon (`LuExternalLink` or `LuSparkles`).
3. Pipeline Metric Gauges: Add **"Store Publishes"** gauge displaying count of completed store syncs today.
4. Active Queue Tab: Displays active `publish_jobs` in `in_progress` status with progress bar and speed (items/sec).
5. Live Events Stream: Displays `store.product.publish.requested`, `store.product.sync.completed`, and `store.product.publish.failed` events with direct link to the product.

---

## 6. What's Left to the Builder
- Implementing the database migration for `deeplens_store.publish_jobs`.
- Adding the Kafka topic registrations and consumer in `DeepLens.WorkerService`.
- Updating `Store.Api` with the new endpoint and Kafka producer.
- Updating `DeepLens.SearchApi` to consume `store.product.sync.completed`.
- Updating `AdminVayyariStorePublishPage.tsx` to call the async job endpoint and show the non-blocking progress pill.
- Updating `AdminPipelineEventsPage.tsx` and `pipeline-failures.routes.ts` to surface store publish events.

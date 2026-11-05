# Architectural Decision: WhatsApp Multi-Stage Review & Triage System

**Date:** 2026-11-04  
**Author:** Krishna (Squad Lead & Coordinator)  
**Status:** Approved & Implemented  
**Deciders:** Krishna (Lead), Bhishma (Backend Architecture), Naga (Database), Viswakarma (Design & Tamagui), Abhimanyu (Testing)

---

## 1. Context & Problem Statement
Investigation of phantom catalog product `VF1FCB4` (`aba50c69-dbd6-4da1-ad72-65ea8814fc92`) revealed that on October 29, 2026, an operator split on a historical group moved 336 messages across 16 days (September 1–17) into a new zone (`product_67cf3b33-1063...`). All 16 individual saree catalogues from those dates had already been published into legitimate products in September (`VF2A31`, `VF2B72`, etc.).

The automated staging poller detected `mediaCount >= 2` without an upper bound and auto-promoted the 269-media conglomerate to Kafka. While `WhatsAppGroupWorker.cs` flagged `status = 'needs_review'`, the asynchronous Kafka consumer `ProductCreatedConsumerService` wiped out the status with `UPDATE wa.message_groups SET status = 'product_created'`. Furthermore, `wa.message_groups.status = 'needs_review'` was excluded from monitoring routes, burying violating products in chat history.

## 2. Decision & Architecture

### 2.1 Database & Schema (`wa.message_groups`)
- Added column `review_stage VARCHAR(50)` and composite index `idx_mg_review_stage_status (review_stage, status)`.
- Allowed values: `'zoning'`, `'media_sync'`, `'qualification'`, `'catalog_ingestion'`, `'enrichment'`.

### 2.2 Five Pipeline Gating Checkpoints
1. **Stage 1 (`zoning`):** If `mediaCount > 30`, mark `status = 'needs_review'`, `review_stage = 'zoning'`, `error_detail = 'High media count (> 30). Human zoning review/split required.'` and block Kafka emission.
2. **Stage 2 (`media_sync`):** If undownloaded media stalled > 15m or `mediaCount < 2` with failed downloads, mark `status = 'needs_review'`, `review_stage = 'media_sync'`.
3. **Stage 3 (`qualification`):** If chat lacks vendor assignment or description is invalid (< 5 words), mark `review_stage = 'qualification'`. Both vendor assignment AND valid description are required to clear qualification errors to prevent state-flapping.
4. **Stage 4 (`catalog_ingestion`):** Hard circuit breaker in `WhatsAppGroupWorker.cs` if `MediaFiles.Count > 35`. Aborts transaction prior to database sequence churn and sets `review_stage = 'catalog_ingestion'`.
5. **Stage 5 (`enrichment`):** Status write-back in `product-created-consumer.service.ts` uses atomic SQL preservation:
   `status = CASE WHEN status = 'needs_review' THEN 'needs_review' ELSE 'product_created' END`.

### 2.3 Unified Review API
- `GET /api/group-review/review-inbox?stage=:stage&limit=:limit&offset=:offset`: Returns aggregated `stageCounts` across all 5 stages, filtered items, and up to 4 MinIO presigned sample thumbnails per card.
- `POST /api/group-review/:groupId/dismiss`: Transitions group to `status = 'archived'` and writes audit event `dismissed_review`.
- Routes `/api/admin/pipeline-failures` and `/api/admin/pipeline-events` updated with `needs_review` gauges and queue monitoring.

### 2.4 Vayyari Review Inbox UI
- Top bar alert badge & warning banner in `src/vayyari/app/utilities/whatsapp/index.tsx` notifying operators when items need review (`⚠️ X Items Need Review`).
- `WhatsAppReviewInboxPage.tsx` with horizontal stage filter pills (`All`, `Zoning`, `Media Sync`, `Qualification`, `Ingestion`, `Enrichment`), real-time search, thumbnail strips, and 4 resolution actions (**Inspect Zone**, **Approve & Create**, **Ignore / Not a Product**, **Dismiss / Mark Reviewed**).
- Deep-linking in `zones/[jid].tsx` supporting `focusGroupId` auto-expansion, auto-scroll, and amber highlight border.

---

## 3. Immediate Remediation Result
- Phantom product `VF1FCB4` (`aba50c69-dbd6-4da1-ad72-65ea8814fc92`), its listing, and 162 unshared media records were completely purged from PostgreSQL `deeplens_platform`.
- All 107 shared media files and 16 legitimate September products were preserved intact with zero orphans.
- Split group `product_67cf3b33-1063...` marked `status = 'ignored'`.

---

## 4. Verification Evidence
- 489 automated tests passing:
  - 65/65 tests in `src/whatsapp-processor`
  - 355/355 tests in `src/vayyari`
  - 69/69 tests across .NET test suites (`DeepLens.ArchitectureTests`, `DeepLens.Catalog.Tests`, `DeepLens.SearchApi.Tests`)
- Live API verified on port 3005 with 1585 staged items categorized and real-time MinIO presigned thumbnails.

# Multi-Stage WhatsApp Product Review & Triage System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a multi-stage violation gating system across the WhatsApp-to-Product pipeline with a unified Review Inbox screen featuring stage filters, 1-click deep-link navigation, and resolution actions, plus cleanup of phantom product `VF1FCB4`.

**Architecture:** Add a `review_stage` discriminator (`zoning`, `media_sync`, `qualification`, `catalog_ingestion`, `enrichment`) to `wa.message_groups`. Intercept anomalies at every pipeline stage to set `status = 'needs_review'` instead of failing silently or polluting the catalog. Expose a unified triage API and Vayyari UI screen with stage pill filters, deep linking (`focusGroupId`), and 1-click decision actions (Approve, Split, Ignore, Mark Reviewed).

**Tech Stack:** TypeScript/Node.js (`src/whatsapp-processor`), C# .NET 9 (`DeepLens.WorkerService`, `DeepLens.SearchApi`), React Native/Tamagui (`src/vayyari`), PostgreSQL 16 (`krikanpg`), Kafka.

**Spec:** Direct user requirement:
> "We have multiple stages of processing for converting WhatsApp chats into products. At any stage, something does not fit into our expectations, mark that as review needed for that stage. And in the review screen, we will have stage filters for each, go through the list and either dismiss them or review and fix them."

## Global Constraints
- Database column names in PostgreSQL must use `lowercase_with_underscores`.
- C# DTOs must have `[JsonPropertyName("camelCase")]`.
- TypeScript interfaces must mirror backend DTO camelCase.
- No `npx expo start` manual invocations (systemd `vayyari-expo.service` running in tmux `expo`).
- Prelaunch service on 8085 is protected; WhatsApp processor service is `deeplens-whatsapp-default-vayyari`.

## Review Focus
1. `VF1FCB4` cleanup must not orphan or break the 16 legitimate September products that share its media files.
2. Group split endpoint `/api/group-review/:groupId/split` must not perform unbounded `timestamp >= $3` bulk updates.
3. Groups flagged as `needs_review` must NEVER be overwritten to `product_created` by asynchronous Kafka writeback consumers.
4. Stage filtering in the review inbox must cleanly isolate each stage's distinct failure mode without losing count totals.
5. Deep linking to `/utilities/whatsapp/zones/[jid]?focusGroupId=[groupId]` must automatically scroll to and expand the target zone.

---

### Task 1: Immediate Remediation & Purge of Product `VF1FCB4`

**Files:**
- Modify: Database (`krikanpg`, database: `deeplens_platform`)
- Test: Verification query on `public.products`, `public.vendor_listings`, `public.media_links`, `wa.message_groups`

- [x] **Step 1: Verify dependent foreign keys on `VF1FCB4`**
  Verify 0 orders, 0 wishlists, 0 carts, 0 post planners on `aba50c69-dbd6-4da1-ad72-65ea8814fc92`.
- [x] **Step 2: Execute safe deletion transaction in PostgreSQL**
  ```sql
  BEGIN;
  -- Delete media links for the phantom product and listing
  DELETE FROM public.media_links WHERE entity_id IN ('aba50c69-dbd6-4da1-ad72-65ea8814fc92', '871ee93e-967b-4f3f-86c1-383c136f344c');
  -- Delete vendor listing
  DELETE FROM public.vendor_listings WHERE product_id = 'aba50c69-dbd6-4da1-ad72-65ea8814fc92';
  -- Delete product
  DELETE FROM public.products WHERE id = 'aba50c69-dbd6-4da1-ad72-65ea8814fc92';
  -- Delete unshared media records in public.media
  DELETE FROM public.media m
  WHERE m.storage_path LIKE 'general/product_67cf3b33-1063-475d-9619-2048a0d0037a/%'
    AND NOT EXISTS (SELECT 1 FROM public.media_links ml WHERE ml.media_id = m.id);
  -- Update wa.message_groups to ignored and mark review_stage
  UPDATE wa.message_groups 
  SET status = 'ignored',
      error_detail = 'Archived duplicate split of September historical items (VF1FCB4 purged)',
      updated_at = NOW()
  WHERE group_id = 'product_67cf3b33-1063-475d-9619-2048a0d0037a';
  COMMIT;
  ```
- [x] **Step 3: Verify deletion**
  Run `SELECT COUNT(*) FROM public.products WHERE base_sku = 'VF1FCB4'` -> 0 rows. Verify that September products (`VF2A31`, `VF2B72`, etc.) still retain their media links.

---

### Task 2: Database Schema & Migration for Multi-Stage Review

**Files:**
- Create: `setupscripts/migrations/041_add_review_stage_to_wa_message_groups.sql`
- Modify: `src/DeepLens.Service/DeepLens.SearchApi/Controllers/FixDbController.cs`

- [ ] **Step 1: Create migration script**
  ```sql
  -- Add review_stage column to wa.message_groups
  ALTER TABLE wa.message_groups ADD COLUMN IF NOT EXISTS review_stage VARCHAR(50);
  CREATE INDEX IF NOT EXISTS idx_mg_review_stage_status ON wa.message_groups (review_stage, status);
  ```
- [ ] **Step 2: Apply migration to PostgreSQL `deeplens_platform`**
- [ ] **Step 3: Verify schema updated with `\d wa.message_groups`**

---

### Task 3: Backend Multi-Stage Review Classification & Gating

**Files:**
- Modify: `src/whatsapp-processor/src/services/group-readiness.service.ts`
- Modify: `src/whatsapp-processor/src/services/zoning.service.ts`
- Modify: `src/DeepLens.Service/DeepLens.WorkerService/Workers/WhatsAppGroupWorker.cs`
- Modify: `src/whatsapp-processor/src/services/product-created-consumer.service.ts`

- [x] **Step 1: Stage 1 (`zoning`) Gating in `group-readiness.service.ts`**
  In staging buffer poller, check media count cap:
  If `mediaCount > 30`:
  Set `status = 'needs_review'`, `review_stage = 'zoning'`, `error_detail = 'High media count (${mediaCount} > 30). Human zoning review/split required.'`
  Do not emit to Kafka.
- [x] **Step 2: Stage 2 (`media_sync`) Gating in `group-readiness.service.ts`**
  If undownloaded media has stalled > 15m or `mediaCount < 2` with failed downloads:
  Set `status = 'needs_review'`, `review_stage = 'media_sync'`, `error_detail = 'Insufficient media (${mediaCount} < 2) or media download stalled.'`
- [x] **Step 3: Stage 3 (`qualification`) Gating in `group-readiness.service.ts`**
  If chat has no vendor assigned or description is invalid/missing:
  Set `status = 'needs_review'`, `review_stage = 'qualification'`, `error_detail = 'Chat missing vendor assignment or description invalid.'`
- [x] **Step 4: Stage 4 (`catalog_ingestion`) Circuit Breaker in `WhatsAppGroupWorker.cs`**
  In `WhatsAppGroupWorker.cs`, if `evt.MediaFiles.Count > 35`:
  Abort transaction, set `wa.message_groups.status = 'needs_review'`, `review_stage = 'catalog_ingestion'`, `error_detail = 'Ingestion blocked: Media count (${count} > 35) exceeds safety threshold.'`
- [x] **Step 5: Stage 5 (`enrichment`) Status Preservation in `product-created-consumer.service.ts`**
  In `product-created-consumer.service.ts`, preserve `status = 'needs_review'` during write-back so consumer never wipes out human review flags.

---

### Task 4: Unified Review API with Stage Filtering

**Files:**
- Modify: `src/whatsapp-processor/src/routes/pipeline-failures.routes.ts`
- Modify: `src/whatsapp-processor/src/routes/group-review.routes.ts`
- Modify: `src/vayyari/services/wa-processor.service.ts`

- [ ] **Step 1: Update `/admin/pipeline-events` & `/admin/pipeline-failures` queries**
  Update SQL queries to include `status = 'needs_review'`.
  Support `stage` filter parameter (`all`, `zoning`, `media_sync`, `qualification`, `catalog_ingestion`, `enrichment`).
  Return breakdown of review counts per stage:
  ```typescript
  stageCounts: {
    all: number;
    zoning: number;
    media_sync: number;
    qualification: number;
    catalog_ingestion: number;
    enrichment: number;
  }
  ```
- [ ] **Step 2: Add Resolution Endpoints in `group-review.routes.ts`**
  - `POST /api/group-review/:groupId/dismiss`: Marks group as reviewed/resolved (`status = 'archived'`).
  - `POST /api/group-review/:groupId/ignore`: Existing endpoint for dismissing non-products.
  - `POST /api/group-review/:groupId/force-publish`: Existing endpoint for admin override approval.
- [ ] **Step 3: Update `wa-processor.service.ts` in Vayyari**
  Add TypeScript types and API methods:
  - `fetchReviewInbox(stage?: string, limit?: number, offset?: number)`
  - `dismissGroupReview(groupId: string)`
  - `getReviewBadgeCount()`

---

### Task 5: Vayyari Review Inbox UI with Stage Filters & Deep Linking

**Files:**
- Create: `src/vayyari/app/utilities/whatsapp/review-inbox.tsx`
- Create / Modify: `src/vayyari/components/tamagui-ui/pages/WhatsAppReviewInboxPage.tsx`
- Modify: `src/vayyari/app/utilities/whatsapp/index.tsx` (Top bar alert badge)
- Modify: `src/vayyari/app/utilities/whatsapp/zones/[jid].tsx` (Add `focusGroupId` auto-scroll and highlight)

- [ ] **Step 1: Implement WhatsApp Admin Header Alert Badge**
  In `src/vayyari/app/utilities/whatsapp/index.tsx`, fetch `getReviewBadgeCount()`.
  If count > 0, display amber warning badge `⚠️ X Items Need Review` navigating to `/utilities/whatsapp/review-inbox`.
- [ ] **Step 2: Build `WhatsAppReviewInboxPage.tsx` with Stage Pills**
  - Horizontal filter pills: `All (X)`, `Zoning (A)`, `Media Sync (B)`, `Qualification (C)`, `Ingestion (D)`, `Enrichment (E)`.
  - Item cards displaying:
    - Vendor and chat name.
    - Violation alert box with exact reason.
    - Media preview strip and text snippet.
    - Action buttons:
      - **"Inspect Zone"**: Navigates to `/utilities/whatsapp/zones/${item.jid}?focusGroupId=${item.groupId}`.
      - **"Approve & Create"**: One-click force promotion.
      - **"Ignore / Not a Product"**: Marks `status = 'ignored'`.
      - **"Dismiss / Mark Reviewed"**: Clears flag.
- [ ] **Step 3: Implement `focusGroupId` deep-linking in `zones/[jid].tsx`**
  When `focusGroupId` param is present in URL:
  - Auto-expand that group card.
  - Scroll list to that card.
  - Visually highlight with amber/primary border.

---

### Task 6: End-to-End Verification

- [ ] **Step 1: Test `VF1FCB4` removal**
  Verify product `VF1FCB4` is absent from catalog, database, and search API.
  Verify original September products are intact with media.
- [ ] **Step 2: Test Multi-Stage Review Gating**
  Trigger test group with > 30 media. Verify it enters `needs_review` with `review_stage = 'zoning'` and appears in Review Inbox.
- [ ] **Step 3: Test Stage Filter Switching**
  Switch between `All`, `Zoning`, `Media Sync`, `Qualification`, `Catalog Ingestion`, `Enrichment` and verify accurate filtering.
- [ ] **Step 4: Test Actions**
  Test **Approve & Create**, **Ignore**, and **Inspect Zone** (with focus scroll).

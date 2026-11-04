# User Stories & Work Items: Publish Updates Hardening & In-Store Review Queue

- **Epic:** Storefront Catalog Sync Hardening & Post-Publish Governance
- **Target Release:** DeepLens v2.6
- **Lead / Decision Owner:** Krishna (Squad Lead)
- **Architecture Spec:** [`docs/superpowers/specs/2026-11-04-publish-updates-review-queue-design.md`](file:///home/krikan/productivity/deeplens/docs/superpowers/specs/2026-11-04-publish-updates-review-queue-design.md)
- **Implementation Plan:** [`docs/superpowers/plans/2026-11-04-publish-updates-review-queue-plan.md`](file:///home/krikan/productivity/deeplens/docs/superpowers/plans/2026-11-04-publish-updates-review-queue-plan.md)

---

## 📖 User Story 1: Zero-Crash Store Re-Publish & Updates Sync (Backend)
**As a** Catalog Merchant / Admin  
**I want** publishing updates to existing store products to reliably update their media, prices, and tags without database errors  
**So that** changes made in the catalog (e.g. newly merged vendor photos) immediately reflect in the storefront without server failures.

### Acceptance Criteria
1. When calling `BatchPublishProductsAsync` for a product that already exists in `deeplens_store.products` (matched by `vayyari_product_id`, `parent_catalog_id`, or `product_code`), the service executes an SQL `UPDATE` instead of `INSERT`.
2. Multi-variant families (e.g. `VF2D2B01` under parent `VF2D2B`) update successfully without triggering `23505 duplicate key value violates unique constraint "products_pkey"`.
3. Updating an existing product sets `is_review_pending = true` and `review_reason = 'media_updated'` across that product and all sibling variants sharing `parent_catalog_id`.
4. Inserting a brand new product keeps `is_review_pending = false`.

---

## 📖 User Story 2: Post-Update In-Store Review Queue & Fast Dismissal
**As a** Storefront Curator  
**I want** a prominent Review button with a count badge in the In-Store Inventory screen  
**So that** I can immediately isolate and review all products that received catalog updates and dismiss them once verified.

### Acceptance Criteria
1. A Review button is positioned directly to the left of `"Publish More"` in the top navigation header of `AdminVayyariStoreInventoryPage`.
2. The button displays an amber badge count indicating the number of products where `isReviewPending === true`.
3. Tapping the button toggles a filtered view showing only products pending review, with a persistent banner showing active filter count and a "Clear" button.
4. Each product card needing review includes a `"Mark Reviewed"` action pill that triggers optimistic removal and calls `PATCH /api/v1/admin/products/{id}/dismiss-review`.
5. Saving curation updates via the Curation Workbench automatically clears `is_review_pending = false` on the product and its siblings.

---

## 📖 User Story 3: Non-Disruptive Publish Feedback & Dynamic CTA Copy
**As a** Store Administrator  
**I want** publish success notifications to float non-disruptively and bottom action buttons to clearly describe my action  
**So that** screen layout doesn't shift unexpectedly and I always know whether I am publishing new products or updating existing ones.

### Acceptance Criteria
1. When publishing products in `AdminVayyariStorePublishPage`, the success toast renders as a floating absolute overlay above the sticky bottom action bar instead of pushing search and grid content down.
2. The toast automatically dismisses after a timeout and provides an immediate dismiss `(X)` icon.
3. In the "Publish Updates" queue tab (`activeQueue === 'publish_updates'`), the sticky bottom button copy reads `"Publish Updates for N Products"`.
4. In the "All Starred" queue tab, the copy reads `"Publish N Products to Store"`.

---

## 📖 User Story 4: Streamlined Media Diff Selection on Product Detail Page
**As a** Catalog Curator  
**I want** a straightforward media diff modal on the PDP rather than dummy color group allocations  
**So that** I can easily inspect newly added vs pruned photos and select which photos should propagate to the storefront for this update.

### Acceptance Criteria
1. Dead non-reactive tabs (`Catalog View` / `Publish Updates`) below the PDP carousel are completely removed.
2. The amber "Media Delta Detected" banner remains and opens a clean Image Diff Selector modal.
3. The modal lists newly added photos with checkboxes (default checked) and pruned catalog photos with a removal notice.
4. Unchecking photos applies *only to the current publish event*; subsequent catalog syncs continue to evaluate the live diff against store media.
5. Clicking `"Confirm & Sync Updates"` triggers the update publish and clears the pending delta banner upon success.

---

## 📋 Task Breakdown & Traceability Matrix

| Task ID | Component | Description | Mapped Story |
|:---|:---|:---|:---|
| **TASK-1** | `Database / SQL` | Run schema migration adding `is_review_pending` & `review_reason` columns with index on `deeplens_store.products` | US-1, US-2 |
| **TASK-2** | `Store.Api` | Fix `CurationService` update path, sibling cascading, add dismiss endpoint in `Program.cs` | US-1, US-2 |
| **TASK-3** | `Store.Api.Tests` | Write unit/integration tests for re-publish update and review dismissal | US-1, US-2 |
| **TASK-4** | `storeAdminService` | Add `isReviewPending` types and `dismissReview(id)` API client method | US-2 |
| **TASK-5** | `PublishPage.tsx` | Make success toast floating overlay and dynamically update sticky CTA copy | US-3 |
| **TASK-6** | `DetailPage.tsx` | Remove dead tabs; simplify media delta modal to per-event diff selector | US-4 |
| **TASK-7** | `InventoryPage.tsx` | Add Review button in top header, badge count, filter banner, and "Mark Reviewed" pill | US-2 |
| **TASK-8** | `Storybook & Deploy` | Add component stories in `src/apps/storybook`, deploy `Store.Api`, reload Expo | US-1, US-2, US-3, US-4 |

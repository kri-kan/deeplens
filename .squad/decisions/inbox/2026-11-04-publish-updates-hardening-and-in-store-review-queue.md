# Architectural Decision Record: Storefront Publish Updates Hardening & In-Store Review Queue

- **Date:** 2026-11-04
- **Author:** Krishna (Squad Lead)
- **Status:** Accepted
- **Subsystems Affected:** `Store.Api`, `AdminVayyariStorePublishPage`, `AdminVayyariStoreInventoryPage`, `AdminProductDetailPage`, `deeplens_store` DB

---

## 1. Context & Problem Statement

1. **Backend Duplicate-Key Crash (`23505`)**:
   When re-publishing or updating an existing product via `CurationService.BatchPublishProductsAsync`, the query performed `INSERT INTO products ... ON CONFLICT (product_code)`. For multi-variant product families where child variants have suffixed codes (e.g. `VF2D2B01`), the incoming parent catalog ID matched existing store product IDs, but `ON CONFLICT (product_code)` did not catch the primary key conflict, causing a hard `23505: duplicate key value violates unique constraint "products_pkey"` crash.
2. **Layout Shift from Inline Toasts**:
   In `AdminVayyariStorePublishPage`, publish success alerts rendered inline in the document layout directly between the queue tabs and the search box, jarringly shifting page content and input fields downward.
3. **Misleading CTA Button Copy**:
   The sticky bottom action button in the "Publish Updates" queue displayed `"Publish N Products to Store"` rather than `"Publish Updates for N Products"`.
4. **Dead PDP Tabs & Complex Media Allocation**:
   `AdminProductDetailPage` unconditionally displayed dead tabs (`Catalog View` / `Publish Updates`) without functional behavior, and presented a cumbersome color-group allocation modal that forced dummy colorways ("Emerald Green") rather than a clean image diff selector.
5. **Missing In-Store Review Queue**:
   Admins had no streamlined way in the In-Store Inventory screen to filter products that received updates from catalog changes and require curation review.

---

## 2. Decisions & Architecture

### A. Dedicated Store Review State (`deeplens_store.products`)
- Add `is_review_pending` (`boolean`, default `false`) and `review_reason` (`character varying(64)`) to `deeplens_store.products`.
- Add a partial index `idx_products_review_pending ON products (is_review_pending) WHERE is_review_pending = true`.
- Distinct from `is_re_evaluation_pending` (which is exclusively reserved for lifecycle takedown/pause re-evaluation).

### B. Clean SQL UPDATE Path & Variant Cascading (`Store.Api`)
- `CurationService.BatchPublishProductsAsync` looks up existing products by `vayyari_product_id`, `parent_catalog_id`, `product_code`, or `parent_product_code`.
- If an existing record exists, execute a direct SQL `UPDATE products SET ... WHERE id = @Id` updating `media_order`, `mrp`, `sale_price`, `tags`, setting `is_review_pending = true`, `review_reason = 'media_updated'`, and `updated_at = NOW()`.
- Cascade `is_review_pending = true` across all sibling variants sharing the same `parent_catalog_id`.
- Add endpoint `PATCH /api/v1/admin/products/{id}/dismiss-review` which clears `is_review_pending = false, review_reason = NULL` for the product and all siblings.
- Saving product curation via `UpdateProductCurationAsync` also automatically resets `is_review_pending = false`.

### C. Floating Success Toasts & Dynamic CTA Copy (`Vayyari Mobile`)
- Render publish success toasts in `AdminVayyariStorePublishPage` as absolute floating overlays (above the bottom sticky action bar) with auto-dismissal and an explicit close icon, preserving layout stability.
- Dynamically label the sticky bottom button as `"Publish Updates for N Products"` when on `activeQueue === 'publish_updates'`.

### D. Streamlined Media Diff Selection & Dead Tab Removal (`PDP`)
- Remove non-functional segmented tabs (`Catalog View` / `Publish Updates`) from `AdminProductDetailPage`.
- Replace the color-group allocation modal with an **Image Diff Selector**:
  - Displays newly added catalog images with checkboxes (default checked).
  - Displays pruned/unmerged catalog images with removal notifications.
  - **Per-Event Scope**: Unchecked photos are omitted only for the current publish event. Future syncs evaluate the full live diff between catalog media and storefront media.

### E. In-Store Review Queue & Header Quick-Action (`Inventory Screen`)
- Add a dedicated Review button with an amber count badge in `AdminVayyariStoreInventoryPage` top header, positioned to the left of `"Publish More"`.
- Clicking the button toggles `showNeedsReviewOnly` filter, surfacing items pending curation.
- Add an inline `"Mark Reviewed"` action pill on cards needing review for single-tap dismissal.

---

## 3. Consequences & Migration Path

- **Positive**:
  - Zero duplicate-key crashes when syncing catalog updates to the store.
  - Zero layout shifts during publish operations.
  - Clear merchant visibility into updated products via the In-Store Review badge.
  - Intuitive media diff handling without friction.
- **Migration**:
  - Schema migration is additive with safe defaults (`is_review_pending = false`).
  - No downtime required; backward compatible with existing Store.Api endpoints.

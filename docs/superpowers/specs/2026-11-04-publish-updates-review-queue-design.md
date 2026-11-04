# Design Document: Publish Updates Hardening, Media Diff Selection, and In-Store Review Queue

**Date:** 2026-11-04  
**Author:** Krishna (Squad Lead)  
**Status:** Implemented & Deployed  
**Target Subsystems:** `Store.Api`, `AdminVayyariStorePublishPage`, `AdminVayyariStoreInventoryPage`, `AdminProductDetailPage`

---

## 1. Intent & Context

When an admin publishes products to the Vayyari storefront or publishes updates for already-published products, multiple friction points and functional bugs occur:

1. **Screen Layout Shift**: The success alert in `AdminVayyariStorePublishPage` renders in-line between the queue tabs and the search box, causing the search box and grid to abruptly jump down and up.
2. **Incorrect CTA Button Label**: In the "Publish Updates" queue tab, the sticky bottom button still reads `"Publish N Products to Store"` instead of `"Publish Updates for N Products"`.
3. **Backend Publish Crash (`500 Internal Server Error`)**:
   `CurationService.BatchPublishProductsAsync` executes `INSERT INTO products ... ON CONFLICT (product_code)`. For published products with variant suffixes (e.g. `VF2D2B01`), the base product code (`VF2D2B`) does not match, triggering `Npgsql.PostgresException: 23505 duplicate key value violates unique constraint "products_pkey"`. Existing products must be handled with a proper SQL `UPDATE` by `id`.
4. **Dead Non-Reactive Tabs on PDP**:
   `AdminProductDetailPage` unconditionally renders two tabs (`Catalog View` and `Publish Updates`) directly below the media carousel, even for unpublished products. Clicking them only changes the tab tint without updating any page content.
5. **Confusing Media Delta Allocation**:
   The current delta sheet attempts to force assigning new photos into color groups (falling back to a dummy "Emerald Green" because live store color groups are not passed). The merchant's actual need is an **image diff selector**: choose which newly added vendor images to push, review which images are being removed, and sync.
6. **Lack of Post-Update Review Queue**:
   Once updates are published to the store, there is no quick way in the In-Store Inventory screen to find products that recently received updates and need curation inspection.

---

## 2. Goals, Non-Goals, & Anti-Goals

### Goals
- **Eliminate Layout Shifts**: Render success toasts as a floating absolute overlay (pill) with auto-dismiss and a manual close button.
- **Dynamic Publish Button Copy**: Dynamically display `"Publish Updates for N Products"` when on the `publish_updates` queue tab.
- **Fix Publish Updates Backend Crash**: Update `CurationService.cs` so updating existing store products performs a clean `UPDATE products ... WHERE id = @Id` (updating `media_order`, `updated_at`, etc.).
- **Streamlined Media Diff Selector**: Remove non-functional PDP tabs; simplify the delta modal to let the user select which newly added photos to include and review pruned photos.
- **In-Store Review Queue & Header Icon**:
  - Add an attention/review icon with an active badge count directly to the left of `"Publish More"` in `AdminVayyariStoreInventoryPage`.
  - The badge displays the count of products where `is_review_pending = true`.
  - Tapping the icon toggles a filter showing only products needing review.
  - Add `is_review_pending` (boolean, default false) and `review_reason` (varchar) to `deeplens_store.products`. Flag updated products as `is_review_pending = true` on publish update. Clear the flag when curated or marked reviewed.

### Non-Goals
- Full implementation of future attention triggers (automated low-stock detection, snooze timer expiration). The schema and UI model are designed to accommodate them, but active automated background schedulers for those are future scope.

### Anti-Goals
- Do not force merchants to allocate arbitrary color groups or stock counts during a simple catalog media update.
- Do not inject transient alerts into normal layout flow.

---

## 3. Approaches Considered & Selected

### Approach A: Dedicated Attention Flag & Curation Review State (Selected)
* Add `is_review_pending` and `review_reason` to `deeplens_store.products`.
* Update `CurationService.cs` to execute `UPDATE` for existing products and flag `is_review_pending = true` with `review_reason = 'media_updated'`.
* In `AdminVayyariStoreInventoryPage`, place a Review button with badge count to the left of "Publish More", which filters products needing review.
* Clearing the review flag occurs when the product curation is saved in workbench or marked as reviewed.
* **Why Selected**: Directly fulfills the user's vision of an attention hub that can scale to low-stock SKUs and snoozed out-of-stock items, while cleanly resolving the immediate review workflow.

### Approach B: Client-side Timestamp Diff Filter (Rejected)
* Compute `updated_at > published_at` purely in frontend memory without database schema changes.
* **Why Rejected**: Cannot dismiss items once reviewed by the admin; cannot support future user-set snooze timers or explicit attention triggers.

---

## 4. Detailed Design & Architecture

### 4.1 Database Changes (`deeplens_store`)
```sql
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS is_review_pending boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_reason character varying(64);

CREATE INDEX IF NOT EXISTS idx_products_review_pending 
  ON products (is_review_pending) 
  WHERE is_review_pending = true;
```

### 4.2 Backend Changes (`Store.Api`)

#### `CurationService.BatchPublishProductsAsync`
1. For each product in the request:
   - Match existing product and its sibling variants:
     ```sql
     SELECT id, mrp, sale_price, media_order::text AS MediaOrderJson, parent_catalog_id 
     FROM products 
     WHERE vayyari_product_id = @VayyariId 
        OR parent_catalog_id = @VayyariId 
        OR LOWER(product_code) = LOWER(@ProductCode) 
        OR LOWER(parent_product_code) = LOWER(@ProductCode)
     ORDER BY product_code ASC;
     ```
   - Resolve MinIO media assets (ingesting new ones, preserving existing matched ones, pruning orphaned assets belonging to this product family).
2. **If `existing != null` (UPDATE path)**:
   - Update the primary / matched variant:
     ```sql
     UPDATE products SET
         title = COALESCE(@Title, title),
         description = COALESCE(@Description, description),
         category_name = @CategoryName,
         fabric = COALESCE(@Fabric, fabric),
         base_cost = @BaseCost,
         mrp = CASE WHEN products.mrp > 0 THEN products.mrp ELSE @Mrp END,
         sale_price = CASE WHEN products.sale_price > 0 THEN products.sale_price ELSE @SalePrice END,
         media_order = @MediaOrder::jsonb,
         tags = @Tags::jsonb,
         is_published = true,
         is_review_pending = true,
         review_reason = 'media_updated',
         updated_at = NOW()
     WHERE id = @Id;
     ```
   - Cascade `is_review_pending = true, review_reason = 'media_updated', updated_at = NOW()` across all sibling variants sharing `parent_catalog_id = @VayyariId` so the umbrella product card reflects pending review.
3. **If `existing == null` (INSERT path)**:
   ```sql
   INSERT INTO products (
       id, vayyari_product_id, product_code, title, description, category_name, fabric,
       base_cost, mrp, sale_price, lifecycle_status, stock_quantity,
       colorway_name, color_hex, swatch_template, media_order, tags, is_published,
       is_review_pending, review_reason, published_at, created_at, updated_at
   ) VALUES (
       @Id, @VayyariProductId, @ProductCode, @Title, @Description, @CategoryName, @Fabric,
       @BaseCost, @Mrp, @SalePrice, 'available', 10,
       'Standard', '#1B4D3E', 'solid', @MediaOrder::jsonb, @Tags::jsonb, true,
       false, NULL, NOW(), NOW(), NOW()
   );
   ```
4. Record audit entry in `product_audits` (`action_type = 'media_updated'`, `old_value = existing.MediaOrderJson`).

#### `CurationService.GetInStoreProductsAsync` & Curation Dismissal
- Return `is_review_pending` and `review_reason` in `StoreProductDto`.
- When an admin saves curation (`UpdateProductCurationAsync`), set `is_review_pending = false, review_reason = NULL` for the product and all siblings.
- Add endpoint `PATCH /api/v1/admin/products/{id}/dismiss-review`:
  ```sql
  UPDATE products 
  SET is_review_pending = false, review_reason = NULL, updated_at = NOW() 
  WHERE id = @Id 
     OR (parent_catalog_id IS NOT NULL AND parent_catalog_id = (SELECT COALESCE(parent_catalog_id, vayyari_product_id) FROM products WHERE id = @Id));
  ```
  Returns `{ status: "ReviewDismissed", productId: id }`.
- In `AdminVayyariStoreInventoryPage.tsx`, on each product card that has `isReviewPending === true`, render a `"Mark Reviewed"` action pill (with checkmark) next to `"Qualify & Group"` to directly dismiss the review state with optimistic UI removal.
- Single-product sync from PDP reuses the existing `POST /api/v1/admin/products/publish` endpoint via `storeAdminService.batchPublish([productPayload])`.

---

### 4.3 Frontend Changes (`Vayyari Mobile App`)

#### 1. `AdminVayyariStorePublishPage.tsx`
- **Floating Toast**:
  Remove `{publishSuccessToast && <View style={styles.toastBanner}>...}` from the flex column.
  Render as an absolute container:
  ```tsx
  {publishSuccessToast && (
    <XStack
      position="absolute"
      bottom={bottomInset + 80}
      left={16}
      right={16}
      backgroundColor="#10B981"
      paddingVertical={10}
      paddingHorizontal={14}
      borderRadius={8}
      alignItems="center"
      justifyContent="space-between"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.2}
      shadowRadius={8}
      elevation={6}
      zIndex={999}
    >
      <XStack alignItems="center" gap={8} flex={1}>
        <LuSparkles size={16} color="#fff" />
        <Text fontSize={12} fontWeight="800" color="#fff" flex={1}>
          {publishSuccessToast}
        </Text>
      </XStack>
      <TouchableOpacity onPress={() => setPublishSuccessToast(null)} hitSlop={8}>
        <LuX size={16} color="#fff" />
      </TouchableOpacity>
    </XStack>
  )}
  ```
- **Bottom Publish Button Copy**:
  ```tsx
  <Text fontSize={14} fontWeight="800" color={tokens.accentForeground}>
    {isPublishing
      ? (activeQueue === 'publish_updates' ? 'Syncing Updates...' : 'Publishing to Store...')
      : (activeQueue === 'publish_updates'
          ? `Publish Updates for ${selectedIds.length} Product${selectedIds.length === 1 ? '' : 's'}`
          : `Publish ${selectedIds.length} Product${selectedIds.length === 1 ? '' : 's'} to Store`)}
  </Text>
  ```

#### 2. `AdminProductDetailPage.tsx`
- **Remove Dead Segmented Tabs**: Remove `<XStack>` wrapping `Catalog View` / `Publish Updates` tabs (lines 463–533).
- **Streamlined Media Delta Selector**:
  - Keep the amber notification banner when `hasDeltaUpdates` is true (`Media Delta Detected: +N new photos`).
  - Tapping "Review & Sync Updates" opens the simplified delta modal:
    - Lists newly added photos with individual inclusion checkboxes (default checked).
    - Lists any photos removed from catalog with a notice: *"These photos were split/unmerged from catalog and will be removed from storefront."*
    - **Per-Event Scope**: Unchecking photos omits them *only for this publish event*. They are not permanently discarded. When subsequent changes or new photos arrive for this product in the future, the selector will re-evaluate and display the full live diff between catalog media and store media.
    - Single CTA: **"Confirm & Sync to Store"** which dispatches the update.

#### 3. `AdminVayyariStoreInventoryPage.tsx`
- **Top Header Review Button**:
  Position directly to the left of `Publish More`:
  ```tsx
  <XStack alignItems="center" gap={8}>
    {/* Review Queue Icon Button */}
    <Pressable
      onPress={() => setShowNeedsReviewOnly((prev) => !prev)}
      style={({ pressed }) => [
        styles.navReviewBtn,
        {
          backgroundColor: showNeedsReviewOnly
            ? '#FEF3C7'
            : pressed
            ? tokens.accentSubtle
            : tokens.surfaceRaised,
          borderColor: showNeedsReviewOnly ? '#F59E0B' : tokens.border,
          borderWidth: 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Review queue (${reviewCount} products need review)`}
    >
      <XStack alignItems="center" gap={5}>
        <LuSparkles size={13} color={showNeedsReviewOnly ? '#B45309' : tokens.accent} />
        <Text fontSize={11} fontWeight="800" color={showNeedsReviewOnly ? '#B45309' : tokens.accent}>
          Review
        </Text>
        {reviewCount > 0 && (
          <XStack
            backgroundColor="#D97706"
            paddingHorizontal={5}
            paddingVertical={1.5}
            borderRadius={10}
            minWidth={18}
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={9} fontWeight="900" color="#fff">
              {reviewCount}
            </Text>
          </XStack>
        )}
      </XStack>
    </Pressable>

    {/* Existing Publish More Button */}
    {onNavigateToStorePublish && (
      <Pressable onPress={onNavigateToStorePublish} ...>
        ...
      </Pressable>
    )}
  </XStack>
  ```
- **Filter State**:
  When `showNeedsReviewOnly` is active:
  - Filters `filteredProducts` to only items with `isReviewPending === true`.
  - Displays an active filter pill banner below search: `"Filtered: Needs Attention / Updates"` with a `"Clear"` action.

---

## 5. Verification Plan

1. **Backend Unit / Integration Test**:
   - Call `BatchPublishProductsAsync` twice with the same product (first publish, then update with additional image).
   - Assert second call succeeds without `23505 duplicate key` error.
   - Assert `is_review_pending` is set to `true`.
2. **Frontend Component Tests**:
   - `AdminVayyariStorePublishPage.test.tsx`:
     - Test that toast banner does not render in-flow between tabs and search.
     - Test that button label shows `"Publish Updates for N Products"` when `activeQueue === 'publish_updates'`.
   - `AdminProductDetailPage.test.tsx`:
     - Verify dead tabs are gone.
     - Verify media delta modal opens with selection checkboxes.
   - `AdminVayyariStoreInventoryPage.test.tsx`:
     - Test that review icon renders to the left of "Publish More" with badge count.
     - Test that clicking review icon filters products to those with `isReviewPending === true`.
3. **End-to-End Test in Running Services**:
   - Restart `deeplens-store-api` container with updated build.
   - Run batch publish on an existing product in publish updates.
   - Verify success toast appears floating without layout jump.
   - Open In-Store Inventory, verify Review icon badge displays updated count, tap Review icon and verify product appears in list.

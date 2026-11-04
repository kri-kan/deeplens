# Publish Updates Hardening, Media Diff Selection, and In-Store Review Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Harden the storefront publish updates pipeline by eliminating duplicate-key backend crashes, streamlining PDP media diff selection without arbitrary color-group requirements, preventing UI layout shifts with floating notifications, and establishing a persistent In-Store Review Queue with top-nav filtering.

**Architecture:** Extend `deeplens_store.products` with `is_review_pending` and `review_reason`. Replace `CurationService`'s conflict-prone SQL insert with an explicit `UPDATE` path for existing store products and their sibling variants. Implement a top-nav Review button with badge count and quick-dismiss actions in Vayyari In-Store Inventory, alongside floating toasts and simplified per-event photo diffing on PDP.

**Tech Stack:** C# .NET 9 (`Store.Api`), Dapper, PostgreSQL (`deeplens_store`), TypeScript, React Native / Expo, Tamagui, NUnit, FluentAssertions.

**Spec:** [`docs/superpowers/specs/2026-11-04-publish-updates-review-queue-design.md`](file:///home/krikan/productivity/deeplens/docs/superpowers/specs/2026-11-04-publish-updates-review-queue-design.md)

## Global Constraints

- **C# DTOs**: Every public property MUST have `[JsonPropertyName("camelCase")]` or follow standard record naming serialized via System.Text.Json camelCase policy.
- **TypeScript interfaces**: MUST mirror backend DTO camelCase names exactly (`isReviewPending?: boolean`, `reviewReason?: string`).
- **Database naming**: `lowercase_with_underscores`. EF Core for platform migrations; Dapper for `Store.Api` queries.
- **Vayyari (Mobile)**: Never run `npx expo start` manually; use `tmux send-keys -t expo r C-m`.
- **Deployments**: Always build & publish to `/data/hosting/store-api` using `--no-restore` and restart via Docker.
- **PDP Media Diff Scope**: Unchecking photos is per-event publish only; subsequent syncs re-evaluate full live catalog diffs.

## Review Focus

1. **Re-publishing multi-variant product family**: A parent product code like `VF2D2B` having store variant rows (`VF2D2B01`) must cleanly update without `23505 duplicate key` or deleting sibling variants.
2. **Review pending cascade**: Updating an umbrella product or variant must set `is_review_pending = true` on all siblings sharing `parent_catalog_id`.
3. **Review dismissal cascade**: Calling `PATCH /api/v1/admin/products/{id}/dismiss-review` or saving curation must clear `is_review_pending` across the product and its siblings.
4. **Layout shift prevention**: Publishing a batch of products must display the success banner in an absolute floating overlay instead of inserting into flex layout.
5. **Per-event photo unchecking**: When an admin unchecks a photo in the PDP diff modal, only selected photos sync to `media_order` for this publish event without deleting the catalog asset.

---

### Task 1: Database Migration on `deeplens_store`

**Files:**
- Modify: Database schema in PostgreSQL container `krikanpg` (`deeplens_store` database)
- Create: `database/migrations/store/20261104_add_review_pending_columns.sql`

**Interfaces:**
- Consumes: PostgreSQL connection to `deeplens_store`
- Produces: `is_review_pending` (boolean DEFAULT false), `review_reason` (varchar(64)), partial index `idx_products_review_pending`

- [x] **Step 1: Write SQL migration file**
  Create `database/migrations/store/20261104_add_review_pending_columns.sql`:
  ```sql
  ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS is_review_pending boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS review_reason character varying(64);

  CREATE INDEX IF NOT EXISTS idx_products_review_pending 
    ON products (is_review_pending) 
    WHERE is_review_pending = true;
  ```

- [x] **Step 2: Execute migration against `deeplens_store` database**
  Run: `docker exec -i krikanpg psql -U postgres -d deeplens_store -c "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_review_pending boolean DEFAULT false, ADD COLUMN IF NOT EXISTS review_reason character varying(64); CREATE INDEX IF NOT EXISTS idx_products_review_pending ON products (is_review_pending) WHERE is_review_pending = true;"`
  Expected: `ALTER TABLE`, `CREATE INDEX`

- [x] **Step 3: Verify columns and index exist**
  Run: `docker exec -i krikanpg psql -U postgres -d deeplens_store -c "\d products"`
  Expected: Columns `is_review_pending` and `review_reason` present; index `idx_products_review_pending` present.

- [x] **Step 4: Commit migration script**
  ```bash
  git add database/migrations/store/20261104_add_review_pending_columns.sql
  git commit -m "chore(db): add is_review_pending and review_reason to store products"
  ```

---

### Task 2: Backend `Store.Api` - Fix Publish Updates Crash, Review Flags & Dismiss Endpoint

**Files:**
- Modify: `src/services/Store.Api/Services/ICurationService.cs`
- Modify: `src/services/Store.Api/Services/CurationService.cs`
- Modify: `src/services/Store.Api/Program.cs`

**Interfaces:**
- Consumes: `PublishProductRequest`, `StoreProductDto`, `deeplens_store.products`
- Produces:
  - `BatchPublishProductsAsync`: handles existing products via SQL `UPDATE`, sets `is_review_pending = true, review_reason = 'media_updated'`, cascades to sibling variants.
  - `DismissReviewAsync(Guid id)`: `Task<bool>` sets `is_review_pending = false, review_reason = NULL` for product and siblings.
  - `StoreProductDto`: includes `bool IsReviewPending = false, string? ReviewReason = null`.
  - Endpoint `PATCH /api/v1/admin/products/{id}/dismiss-review`.

- [x] **Step 1: Update `StoreProductDto` and `ICurationService` interface**
  Add `IsReviewPending` and `ReviewReason` to `StoreProductDto` record parameters:
  ```csharp
  bool IsReviewPending = false,
  string? ReviewReason = null,
  ```
  Add to `ICurationService`:
  ```csharp
  Task<bool> DismissReviewAsync(Guid id);
  ```

- [x] **Step 2: Update `ProductDbRow` and queries in `CurationService.cs`**
  In `ProductDbRow`:
  ```csharp
  public bool IsReviewPending { get; set; }
  public string? ReviewReason { get; set; }
  ```
  In `GetInStoreProductsAsync`, `GetProductByCodeAsync`, `GetProductCurationAsync`: include `COALESCE(p.is_review_pending, false) AS IsReviewPending, p.review_reason AS ReviewReason` in SELECT queries.
  In `MapToDto`: map `IsReviewPending: r.IsReviewPending, ReviewReason: r.ReviewReason`.

- [x] **Step 3: Fix `BatchPublishProductsAsync` to use UPDATE on existing products**
  In `CurationService.BatchPublishProductsAsync`:
  Check existing:
  ```csharp
  const string findSql = @"
      SELECT id, mrp, sale_price, media_order::text AS MediaOrderJson, parent_catalog_id 
      FROM products 
      WHERE vayyari_product_id = @VayyariId 
         OR parent_catalog_id = @VayyariId 
         OR LOWER(product_code) = LOWER(@ProductCode) 
         OR LOWER(parent_product_code) = LOWER(@ProductCode)
      ORDER BY product_code ASC 
      LIMIT 1;";
  ```
  If `existing != null`:
  Execute `UPDATE products SET ... is_review_pending = true, review_reason = 'media_updated', updated_at = NOW() WHERE id = @Id;`
  And cascade review pending to siblings:
  ```sql
  UPDATE products 
  SET is_review_pending = true, review_reason = 'media_updated', updated_at = NOW()
  WHERE parent_catalog_id = @VayyariId AND id != @Id;
  ```
  If `existing == null`:
  Execute `INSERT INTO products (...) VALUES (...)` with `is_review_pending = false, review_reason = NULL`.

- [x] **Step 4: Implement `DismissReviewAsync` and clear review in `UpdateProductCurationAsync`**
  In `CurationService.cs`:
  ```csharp
  public async Task<bool> DismissReviewAsync(Guid id)
  {
      await using var conn = new NpgsqlConnection(_connectionString);
      await conn.OpenAsync();
      const string dismissSql = @"
          UPDATE products 
          SET is_review_pending = false, review_reason = NULL, updated_at = NOW() 
          WHERE id = @Id 
             OR (parent_catalog_id IS NOT NULL AND parent_catalog_id = (SELECT COALESCE(parent_catalog_id, vayyari_product_id) FROM products WHERE id = @Id));";
      var affected = await conn.ExecuteAsync(dismissSql, new { Id = id });
      return affected > 0;
  }
  ```
  In `UpdateProductCurationAsync`:
  Include `is_review_pending = false, review_reason = NULL` in the `UPDATE products SET ...` query and cascade to siblings.

- [x] **Step 5: Register endpoint in `Program.cs`**
  Add endpoint:
  ```csharp
  app.MapPatch("/api/v1/admin/products/{id}/dismiss-review", async (Guid id, ICurationService curationService) =>
  {
      var success = await curationService.DismissReviewAsync(id);
      return success
          ? Results.Ok(new { status = "ReviewDismissed", productId = id })
          : Results.NotFound(new { message = $"Store product '{id}' not found." });
  })
  .WithName("AdminDismissProductReview")
  .WithOpenApi();
  ```

- [x] **Step 6: Build `Store.Api`**
  Run: `dotnet build src/services/Store.Api/Store.Api.csproj`
  Expected: Build succeeded with 0 errors.

- [x] **Step 7: Commit backend changes**
  ```bash
  git add src/services/Store.Api/
  git commit -m "feat(store-api): fix publish update crash and add review pending lifecycle"
  ```

---

### Task 3: Backend Tests in `Store.Api.Tests`

**Files:**
- Modify: `tests/Store.Api.Tests/CurationServiceTests.cs`

**Interfaces:**
- Consumes: `ICurationService`, `BatchPublishProductsAsync`, `DismissReviewAsync`, `GetInStoreProductsAsync`
- Produces: Automated test passing for re-publish update and review dismissal

- [x] **Step 1: Write tests for Re-Publish Update and Review Dismissal**
  In `tests/Store.Api.Tests/CurationServiceTests.cs`, add:
  1. `BatchPublishProductsAsync_WhenProductAlreadyExists_PerformsUpdateAndSetsReviewPending`:
     - Calls `BatchPublishProductsAsync` with initial product request.
     - Calls `BatchPublishProductsAsync` a second time with modified media / description.
     - Verifies no duplicate key exception.
     - Queries DB to verify `is_review_pending == true` and `review_reason == "media_updated"`.
  2. `DismissReviewAsync_ClearsReviewPendingAcrossSiblingVariants`:
     - Seeds two variants with `is_review_pending = true` sharing `parent_catalog_id`.
     - Calls `DismissReviewAsync(variant1Id)`.
     - Verifies both variants have `is_review_pending == false` and `review_reason == null`.

- [x] **Step 2: Run tests**
  Run: `dotnet test tests/Store.Api.Tests/Store.Api.Tests.csproj --filter "FullyQualifiedName~CurationServiceTests"`
  Expected: Passed.

- [x] **Step 3: Commit tests**
  ```bash
  git add tests/Store.Api.Tests/CurationServiceTests.cs
  git commit -m "test(store-api): add tests for publish update and review dismissal"
  ```

---

### Task 4: Frontend Service & Types (`storeAdminService.ts`)

**Files:**
- Modify: `src/vayyari/services/storeAdminService.ts`

**Interfaces:**
- Consumes: Backend `PATCH /api/v1/admin/products/{id}/dismiss-review` and updated `StoreProductDto`
- Produces:
  - `StoreProduct.isReviewPending?: boolean`
  - `StoreProduct.reviewReason?: string`
  - `storeAdminService.dismissReview(productId: string): Promise<{ status: string; productId: string }>`

- [x] **Step 1: Add review properties to `StoreProduct` interface**
  In `src/vayyari/services/storeAdminService.ts`:
  ```typescript
  export interface StoreProduct {
    // ... existing fields ...
    isReviewPending?: boolean;
    reviewReason?: string;
  }
  ```

- [x] **Step 2: Add `dismissReview` method to `storeAdminService`**
  ```typescript
  async dismissReview(productId: string): Promise<{ status: string; productId: string }> {
    return this.request<{ status: string; productId: string }>(
      `/api/v1/admin/products/${productId}/dismiss-review`,
      { method: 'PATCH' }
    );
  }
  ```

- [x] **Step 3: Run TypeScript check**
  Run: `npx tsc --noEmit` or verify via ESLint/TS compiler.
  Expected: No type errors in `storeAdminService.ts`.

- [x] **Step 4: Commit frontend service updates**
  ```bash
  git add src/vayyari/services/storeAdminService.ts
  git commit -m "feat(vayyari): add isReviewPending fields and dismissReview service method"
  ```

---

### Task 5: Frontend `AdminVayyariStorePublishPage.tsx` - Floating Toast & CTA Copy

**Files:**
- Modify: `src/vayyari/components/tamagui-ui/pages/AdminVayyariStorePublishPage.tsx`

**Interfaces:**
- Consumes: `publishSuccessToast`, `activeQueue`, `selectedIds`
- Produces: Floating absolute toast overlay without layout shift, dynamic button label for `publish_updates`

- [x] **Step 1: Move `publishSuccessToast` from inline layout to absolute floating overlay**
  Remove lines 426–433 where `{publishSuccessToast && ...}` is rendered inline between queue tabs and search box.
  Render floating banner anchored near the bottom above the sticky CTA:
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
      borderRadius={tokens.radius.sm}
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

- [x] **Step 2: Update bottom publish CTA copy**
  In the sticky bottom button label (around line 718):
  ```tsx
  <Text fontSize={14} fontWeight="800" color={tokens.accentForeground}>
    {isPublishing
      ? (activeQueue === 'publish_updates' ? 'Syncing Updates...' : 'Publishing to Store...')
      : (activeQueue === 'publish_updates'
          ? `Publish Updates for ${selectedIds.length} Product${selectedIds.length === 1 ? '' : 's'}`
          : `Publish ${selectedIds.length} Product${selectedIds.length === 1 ? '' : 's'} to Store`)}
  </Text>
  ```

- [x] **Step 3: Commit publish page fixes**
  ```bash
  git add src/vayyari/components/tamagui-ui/pages/AdminVayyariStorePublishPage.tsx
  git commit -m "fix(vayyari): make publish toast floating and update publish updates button copy"
  ```

---

### Task 6: Frontend `AdminProductDetailPage.tsx` - Dead Tabs Removal & Simplified Media Diff

**Files:**
- Modify: `src/vayyari/components/tamagui-ui/pages/AdminProductDetailPage.tsx`

**Interfaces:**
- Consumes: `product.isPublishedToStore`, `product.media_updated_at`, `product.store_publish_updated_at`
- Produces: Clean PDP header without dead segmented tabs; simplified media diff modal allowing per-event photo inclusion/exclusion

- [x] **Step 1: Remove dead non-reactive segmented tabs**
  Remove `<XStack>` wrapping `Catalog View` and `Publish Updates` tabs (lines 463–533).
  Retain the amber `hasDeltaUpdates` banner (`Media Delta Detected: +N new photos`) which only shows when `product.isPublishedToStore` is true and `hasPendingStoreUpdates(product)` is true.

- [x] **Step 2: Simplify Media Delta Allocation Modal to Image Diff Selector**
  Replace complex dummy color group allocation modal (lines 1622–1860) with streamlined Diff Selector:
  - Header: `"Review Catalog Media Updates (+N new, -M pruned)"`
  - Added Photos section: Displays thumbnail, filename, and a checkbox (default checked). Unchecking removes from this publish payload only.
  - Pruned Photos section: Lists any catalog photos pruned or unmerged with notice: `"These photos will be removed from the store."`
  - Action Button: `"Confirm & Sync Updates"` calling `handleConfirmSync(selectedMediaUrls)`.

- [x] **Step 3: Wire Confirm & Sync Updates to `storeAdminService.batchPublish`**
  When confirming:
  - Prepare `PublishProductItem` with filtered `media` containing existing store photos plus newly checked photos.
  - Call `storeAdminService.batchPublish([productItem])`.
  - Update `product.store_publish_updated_at = new Date().toISOString()` to clear delta banner.
  - Close modal and show floating success toast.

- [x] **Step 4: Commit PDP updates**
  ```bash
  git add src/vayyari/components/tamagui-ui/pages/AdminProductDetailPage.tsx
  git commit -m "refactor(vayyari): remove dead PDP tabs and simplify media delta modal to diff selector"
  ```

---

### Task 7: Frontend In-Store Inventory Review Queue & Dismissal Actions

**Files:**
- Modify: `src/vayyari/components/tamagui-ui/pages/AdminVayyariStoreInventoryPage.tsx`
- Modify: `src/vayyari/app/store/inventory.tsx`

**Interfaces:**
- Consumes: `StoreProduct.isReviewPending`, `storeAdminService.dismissReview`
- Produces:
  - Header Review icon button with amber badge count to the left of "Publish More"
  - Active filter state `showNeedsReviewOnly`
  - "Mark Reviewed" quick-action pill on cards where `isReviewPending === true`

- [x] **Step 1: Update `AdminVayyariStoreInventoryPageProps` and state**
  Add props:
  ```typescript
  reviewCount?: number;
  onDismissReview?: (productId: string) => Promise<void>;
  ```
  Add internal state:
  ```typescript
  const [showNeedsReviewOnly, setShowNeedsReviewOnly] = useState(false);
  ```

- [x] **Step 2: Add Review icon button with badge to header**
  In the top nav header, directly before `onNavigateToStorePublish` button:
  ```tsx
  <Pressable
    onPress={() => setShowNeedsReviewOnly((prev) => !prev)}
    style={({ pressed }) => [
      styles.navReviewBtn,
      {
        backgroundColor: showNeedsReviewOnly ? '#FEF3C7' : pressed ? tokens.accentSubtle : tokens.surfaceRaised,
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
  ```

- [x] **Step 3: Filter products when `showNeedsReviewOnly` is active**
  In `filteredProducts` memo:
  ```typescript
  if (showNeedsReviewOnly) {
    items = items.filter(p => p.isReviewPending);
  }
  ```
  Render an active filter banner under the search bar when active:
  ```tsx
  {showNeedsReviewOnly && (
    <XStack backgroundColor="#FEF3C7" paddingHorizontal={12} paddingVertical={6} borderRadius={6} justifyContent="space-between" alignItems="center" marginHorizontal={16} marginBottom={8}>
      <Text fontSize={11} fontWeight="700" color="#92400E">
        Showing products with pending updates ({reviewCount})
      </Text>
      <TouchableOpacity onPress={() => setShowNeedsReviewOnly(false)}>
        <Text fontSize={11} fontWeight="800" color="#B45309">Clear</Text>
      </TouchableOpacity>
    </XStack>
  )}
  ```

- [x] **Step 4: Add "Mark Reviewed" button on cards needing review**
  On product cards where `item.isReviewPending === true`:
  Add a `"Mark Reviewed"` action button next to `"Qualify & Group"` that triggers `onDismissReview(item.id)` with optimistic update.

- [x] **Step 5: Wire `inventory.tsx` to `storeAdminService.dismissReview`**
  In `src/vayyari/app/store/inventory.tsx`:
  - Calculate `reviewCount = products.filter(p => p.isReviewPending).length`.
  - Pass `reviewCount={reviewCount}` to `AdminVayyariStoreInventoryPage`.
  - Implement `handleDismissReview = async (productId: string)`:
    - Optimistically update local state: set `isReviewPending = false`.
    - Call `storeAdminService.dismissReview(productId)`.
    - If error, rollback state and show alert.

- [x] **Step 6: Commit inventory review queue changes**
  ```bash
  git add src/vayyari/components/tamagui-ui/pages/AdminVayyariStoreInventoryPage.tsx src/vayyari/app/store/inventory.tsx
  git commit -m "feat(vayyari): add in-store inventory review queue filter and mark-reviewed action"
  ```

---

### Task 8: Service Deployment & End-to-End Verification

**Files:**
- Deploy: `Store.Api` Docker container `deeplens-store-api`
- Verify: Live endpoints & Expo app reload

- [x] **Step 1: Publish `Store.Api` binaries to hosting folder**
  Run: `dotnet publish src/services/Store.Api/Store.Api.csproj -c Release -o /data/hosting/store-api --no-restore`
  Expected: Publish succeeded.

- [x] **Step 2: Restart `deeplens-store-api` Docker container**
  Run: `docker restart deeplens-store-api`
  Expected: Container restarts; logs show service listening on port 5200.

- [x] **Step 3: Verify health & OpenAPI of running `Store.Api`**
  Run: `curl -s http://localhost:5200/health || curl -s http://localhost:5200/api/v1/admin/products/in-store | head -c 200`
  Expected: Valid JSON response from Store.Api.

- [x] **Step 4: Reload Expo Vayyari app**
  Run: `tmux send-keys -t expo r C-m`
  Expected: Expo reloads without errors.

- [x] **Step 5: Verify publish update and review queue end-to-end**
  1. Test batch publish of updated product via API:
     Verify 200 OK without `23505 duplicate key` error.
  2. Verify `GET /api/v1/admin/products/in-store` returns `isReviewPending: true` for that product.
  3. Verify `PATCH /api/v1/admin/products/{id}/dismiss-review` returns 200 OK and clears review status.

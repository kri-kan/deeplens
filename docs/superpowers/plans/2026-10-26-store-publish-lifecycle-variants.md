# Store Publish, Lifecycle & Color Variant Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver end-to-end support for published product merge anchoring, media delta tracking, zero-duplication MinIO shared media, Myntra-style variant-first storefront browsing (`VF{hex}{DD}`), umbrella card admin management, and member-only restock waitlists.

**Architecture:** Variant-first data model in `deeplens_store.products` (`VF{hex}{DD}`) linked by `parent_catalog_id`, with server-side CTE sibling swatches for fast storefront rendering; `deeplens_platform` merge routines lock published products as immutable targets and track media delta timestamps (`media_updated_at > store_publish_updated_at`); Storefront Admin provides catalog-style umbrella cards with inline expandable color drawers and hierarchical lifecycle controls.

**Tech Stack:** C# .NET 9 (`Store.Api`, Dapper, Npgsql), PostgreSQL (`deeplens_platform`, `deeplens_store`), MinIO S3 object storage, React/Vite storefront, React/Tamagui Admin UI.

**Spec:** [`docs/superpowers/specs/2026-10-26-store-publish-lifecycle-variants-design.md`](file:///home/krikan/productivity/deeplens/docs/superpowers/specs/2026-10-26-store-publish-lifecycle-variants-design.md)
**ADO Feature:** `#1337 - Store Publish, Lifecycle & Color Variant Architecture`

## Global Constraints
- Product codes follow `VF{hex}{DD}` (e.g., `VF69F501`, `VF69F502`) without hyphens; legacy un-suffixed codes (`VF69F5`) automatically resolve to variant `01`.
- Shared group photos are stored once in MinIO and referenced across variant galleries; variant photos always precede shared photos.
- Temporary take-down expiry NEVER auto-publishes; expired items wait in the re-evaluation queue until manual admin sign-off.
- Reactivating an umbrella product restores each variant's `previous_lifecycle_status`.
- Waitlists are strictly for signed-in members; guests receive a dismissible login modal that redirects back to the source PDP post-auth.
- All code changes must be developed on `develop` branch via feature branch `squad/1337-store-publish-lifecycle-variants`.

## Review Focus
1. Legacy cart or order lookup with un-suffixed `VF` code: Must return variant `01` with HTTP 200 rather than 404.
2. Expired take-down timer reached: Product must remain hidden from search and browsing until explicit admin reactivation.
3. Reactivation of paused parent when a child variant was out-of-stock: Child variant must remain `out_of_stock` instead of flipping to `available`.
4. Guest shopper clicks "Join Waitlist": Returns 401 Unauthorized, prompting login modal with redirect return URL rather than failing silently.
5. Sibling swatches on paginated catalog grid: Must show all available sibling colors on each card even if siblings span across page boundaries.

---

### Task 1: Catalog Merge Anchoring & Delta Timestamp Tracking (ADO #1338)

**Files:**
- Modify: `src/services/DeepLens.SearchApi/Services/ProductMergeService.cs`
- Modify: `src/services/DeepLens.SearchApi/Models/CatalogProduct.cs`
- Test: `tests/DeepLens.SearchApi.Tests/ProductMergeServiceTests.cs`

**Interfaces:**
- Consumes: `ProductMergeRequest { SourceIds: Guid[], TargetId?: Guid }`
- Produces: `ProductMergeResult { WinnerId: Guid, IsAnchored: bool, MediaUpdatedAt: DateTime }`

- [ ] **Step 1: Write the failing unit test for published product anchor**
```csharp
[Fact]
public async Task MergeProductsAsync_WhenSourceIsPublished_ForcesPublishedProductAsWinner()
{
    var publishedProduct = CreateProduct(isPublished: true);
    var unpublishedProduct = CreateProduct(isPublished: false);
    var result = await _mergeService.MergeAsync(new[] { publishedProduct.Id, unpublishedProduct.Id });
    Assert.Equal(publishedProduct.Id, result.WinnerId);
}
```

- [ ] **Step 2: Run test to verify it fails**
Run: `dotnet test tests/DeepLens.SearchApi.Tests/ProductMergeServiceTests.cs`
Expected: FAIL (un-published product selected if newer)

- [ ] **Step 3: Implement published anchor enforcement and `media_updated_at` bump**
In `ProductMergeService.cs`: Check if any candidate has `is_published == true`. If exactly one, force its ID as `target_id`. On merge completion, update `media_updated_at = DateTime.UtcNow` on the winner.

- [ ] **Step 4: Run test to verify it passes**
Run: `dotnet test tests/DeepLens.SearchApi.Tests/ProductMergeServiceTests.cs`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/services/DeepLens.SearchApi/ tests/DeepLens.SearchApi.Tests/
git commit -m "feat(catalog): enforce published product merge anchor and media delta tracking (ADO #1338)"
```

---

### Task 2: Database Migration for Variant-First Products & Waitlists (ADO #1339)

**Files:**
- Create: `database/migrations/20261026_store_variants_and_waitlists.sql`
- Test: `tests/Store.Api.Tests/DatabaseMigrationTests.cs`

**Interfaces:**
- Consumes: Existing `deeplens_store.products` schema
- Produces: `parent_catalog_id`, `catalog_color_group_id`, `parent_product_code`, `previous_lifecycle_status`, `take_down_expires_at`, `is_re_evaluation_pending` columns, and `product_waitlists` table.

- [ ] **Step 1: Write the schema verification test**
Verify columns and constraints exist in `deeplens_store`.

- [ ] **Step 2: Run test to verify it fails**
Run: `dotnet test tests/Store.Api.Tests/DatabaseMigrationTests.cs`
Expected: FAIL (columns missing)

- [ ] **Step 3: Create and execute migration script via psql**
In `database/migrations/20261026_store_variants_and_waitlists.sql`:
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_catalog_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS catalog_color_group_id UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_product_code VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS previous_lifecycle_status VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS take_down_expires_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_re_evaluation_pending BOOLEAN DEFAULT FALSE;

-- Suffix legacy single rows with '01' if un-suffixed
UPDATE products 
SET product_code = product_code || '01',
    parent_catalog_id = vayyari_product_id,
    parent_product_code = product_code
WHERE parent_catalog_id IS NULL AND length(product_code) <= 8;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_vayyari_product_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_parent_color ON products(parent_catalog_id, catalog_color_group_id);
CREATE INDEX IF NOT EXISTS idx_products_parent_catalog_id ON products(parent_catalog_id);

CREATE TABLE IF NOT EXISTS product_waitlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_waitlist_customer UNIQUE (product_id, customer_id)
);
```

- [ ] **Step 4: Run migration test to verify it passes**
Run: `dotnet test tests/Store.Api.Tests/DatabaseMigrationTests.cs`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add database/migrations/ tests/Store.Api.Tests/
git commit -m "feat(store-db): add variant columns, waitlist schema and legacy migration (ADO #1339)"
```

---

### Task 3: Store.Api Variant & Lifecycle Backend Implementation (ADO #1340)

**Files:**
- Modify: `src/services/Store.Api/Services/CurationService.cs`
- Modify: `src/services/Store.Api/Services/ICurationService.cs`
- Modify: `src/services/Store.Api/Models/StoreProductDto.cs`
- Modify: `src/services/Store.Api/Program.cs`
- Test: `tests/Store.Api.Tests/CurationServiceTests.cs`

**Interfaces:**
- Consumes: `GET /api/v1/products`, `PATCH /api/v1/admin/products/lifecycle`, `POST /api/v1/products/{id}/waitlist`
- Produces: `StoreProductDto` with `SiblingSwatches`, `WaitlistCount`, state-restoring reactivation, and legacy URL fallback.

- [ ] **Step 1: Write unit tests for legacy code fallback, sibling swatches, and waitlist**
```csharp
[Fact]
public async Task GetProductByCodeAsync_WhenGivenLegacyUnsuffixedCode_ResolvesVariant01()
{
    var dto = await _curationService.GetProductByCodeAsync("VF69F5");
    Assert.NotNull(dto);
    Assert.Equal("VF69F501", dto.ProductCode);
}
```

- [ ] **Step 2: Run test to verify it fails**
Run: `dotnet test tests/Store.Api.Tests/CurationServiceTests.cs`
Expected: FAIL (legacy code returns null)

- [ ] **Step 3: Implement CurationService methods**
1. Update `GetInStoreProductsAsync` SQL query with CTE joining sibling variants under the same `parent_catalog_id` into `sibling_swatches` JSON.
2. Add fallback in `GetProductByCodeAsync`: if un-suffixed, query `WHERE product_code = @Code || '01'`.
3. Implement `UpdateLifecycleStatusAsync`: support parent-level cascade and variant-level updates; store `previous_lifecycle_status` before pause; restore it on reactivation.
4. Add endpoint `POST /api/v1/products/{id}/waitlist` (requiring authenticated `customer_id`).
5. Add endpoint `GET /api/v1/admin/products/re-evaluation-queue` for expired paused products.

- [ ] **Step 4: Run test to verify it passes**
Run: `dotnet test tests/Store.Api.Tests/CurationServiceTests.cs`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/services/Store.Api/ tests/Store.Api.Tests/
git commit -m "feat(store-api): implement variant queries, sibling swatches, lifecycle cascade and waitlist API (ADO #1340)"
```

---

### Task 4: Publish to Store UI & Media Delta Allocation (ADO #1341)

**Files:**
- Modify: `src/vayyari/components/tamagui-ui/pages/AdminProductDetailPage.tsx`
- Modify: `src/apps/storybook/src/components/organisms/StoreCuration/StoreProductEnrichmentSection.tsx`
- Modify: `src/vayyari/services/storeAdminService.ts`
- Test: `src/vayyari/components/tamagui-ui/pages/__tests__/AdminProductDetailPage.test.tsx`

**Interfaces:**
- Consumes: Catalog product with `media_updated_at > store_publish_updated_at`
- Produces: Visual delta badge (`+N new photos`), allocation tool to color groups or shared pool, mandatory per-color stock inputs.

- [ ] **Step 1: Write component test for Publish Updates queue and delta badge**
Verify delta badge renders when `media_updated_at > store_publish_updated_at`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/vayyari/components/tamagui-ui/pages/__tests__/AdminProductDetailPage.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Publish Updates queue and media allocation interface**
1. Add "Publish Updates" tab to Publish to Store view.
2. Render delta count badge and highlight un-synced images.
3. Allow allocating images to existing color groups, new color groups (with required stock count), or the shared group shots pool.
4. On publish/sync, send batch sync payload and update `store_publish_updated_at = NOW()`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/vayyari/components/tamagui-ui/pages/__tests__/AdminProductDetailPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/vayyari/ src/apps/storybook/
git commit -m "feat(admin-ui): add publish updates queue and media delta allocation (ADO #1341)"
```

---

### Task 5: Storefront Admin Umbrella & Color Drawer UI (ADO #1342)

**Files:**
- Create: `src/apps/storybook/src/components/organisms/StoreCuration/StoreUmbrellaProductCard.tsx`
- Create: `src/apps/storybook/src/components/organisms/StoreCuration/StoreVariantRowDrawer.tsx`
- Modify: `src/vayyari/services/storeAdminService.ts`
- Test: `src/apps/storybook/src/components/organisms/StoreCuration/__tests__/StoreUmbrellaProductCard.test.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/admin/products` grouped by `parent_catalog_id`
- Produces: Umbrella card with total inventory, active color count, bulk actions, and expandable drawer with per-color stock input, status dropdown, timer, and catalog audit link.

- [ ] **Step 1: Write component test for umbrella card expansion and bulk actions**
Verify expanding card opens color rows; verify "Take Down All" cascades status.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/apps/storybook/src/components/organisms/StoreCuration/__tests__/StoreUmbrellaProductCard.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement StoreUmbrellaProductCard and StoreVariantRowDrawer**
1. Render parent umbrella card with code (`VF69F5`), total stock, color count, and status pill.
2. Implement expandable drawer showing child color rows (`VF69F501`, `02`) with swatch circle, inline stock input, lifecycle dropdown, and "View Source in Catalog" link.
3. Add Re-evaluation Queue tab displaying expired items awaiting review.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/apps/storybook/src/components/organisms/StoreCuration/__tests__/StoreUmbrellaProductCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/apps/storybook/ src/vayyari/
git commit -m "feat(store-admin): implement umbrella cards and expandable variant drawer (ADO #1342)"
```

---

### Task 6: Customer Storefront Variant Grid & Member Waitlist UI (ADO #1343)

**Files:**
- Modify: `src/store/src/app/pages/CatalogPage.tsx`
- Modify: `src/store/src/components/ProductCard.tsx`
- Modify: `src/store/src/app/pages/ProductDetailPage.tsx`
- Create: `src/store/src/components/DismissibleLoginModal.tsx`
- Test: `src/store/src/components/__tests__/ProductCard.test.tsx`

**Interfaces:**
- Consumes: `StoreProductDto` with `siblingSwatches` and `lifecycle_status`
- Produces: Myntra-style browsable variant cards, interactive sibling swatches, PDP gallery with shared photos appended, and member waitlist flow.

- [ ] **Step 1: Write test for ProductCard sibling swatch interaction and waitlist button**
Verify clicking swatch updates card preview; verify "Out of Stock" displays "Join Waitlist".

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test src/store/src/components/__tests__/ProductCard.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Myntra-style cards, swatches, and dismissible login modal**
1. In `ProductCard.tsx`: Render hero image, code (`VF69F501`), and horizontal sibling swatch circles.
2. In `ProductDetailPage.tsx`: Place color-specific photos first, followed by shared group shots.
3. For `out_of_stock` variants: Render "Join Waitlist" button. If signed in, call `POST /api/v1/products/{id}/waitlist`. If guest, pop up `DismissibleLoginModal` with return redirect to the current PDP URL.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm test src/store/src/components/__tests__/ProductCard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/store/
git commit -m "feat(storefront): render Myntra-style variant cards and member waitlist flow (ADO #1343)"
```

---

### Task 7: Backend Service Deployment & Live Smoke Tests (ADO #1344)

**Files:**
- Target: `/data/hosting/Store.Api/`
- Target: `/data/hosting/DeepLens.SearchApi/`

**Interfaces:**
- Consumes: Published binaries
- Produces: Verified live HTTP endpoints and running Docker containers.

- [ ] **Step 1: Publish backend services to /data/hosting/ without restore**
```bash
dotnet publish src/services/Store.Api/Store.Api.csproj -c Release -o /data/hosting/Store.Api/ --no-restore
dotnet publish src/services/DeepLens.SearchApi/DeepLens.SearchApi.csproj -c Release -o /data/hosting/DeepLens.SearchApi/ --no-restore
```

- [ ] **Step 2: Restart Docker containers**
```bash
docker compose -f /home/krikan/productivity/deeplens/docker-compose.yml restart store-api search-api
```

- [ ] **Step 3: Run live smoke tests with curl**
```bash
# Verify Store.Api health and products
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5200/api/v1/products
# Verify SearchApi health
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5100/health
```
Expected: `200` for both endpoints.

- [ ] **Step 4: Synchronize Codebase Memory Graph (ADR-005)**
Trigger `codebase_memory:index_repository` with `repo_path: "/home/krikan/productivity/deeplens"`, `name: "deeplens"`, and `mode: "fast"`.

- [ ] **Step 5: Commit final deployment verification and close ADO tasks**
```bash
git commit --allow-empty -m "chore: verified live deployment and smoke tests for ADO #1337"
```

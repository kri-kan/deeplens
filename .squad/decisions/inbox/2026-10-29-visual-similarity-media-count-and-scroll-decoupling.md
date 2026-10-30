# Architectural Decision: Visual Similarity Search Media Count Preservation & Infinite Scroll Decoupling

**Date:** 2026-10-29  
**Decision Owner:** Krishna (Squad Lead & Coordinator)  
**Status:** Accepted & Enforced  

---

## 1. Context & Problems Identified
During user testing of the visual similarity search workflow in the product catalog:
1. **Media Count Collapsing to 1:** Products surfaced via similarity search that were not already resident in the first page (top 100) of catalog cache defaulted their tile media count to `1`, masking their actual volume of images and videos.
2. **Infinite Scroll Loading Flashes:** When scrolling to the bottom of the ranked similarity match results (30–50 items), the catalog's `onEndReached` hook erroneously dispatched background pagination queries (`fetchProducts(false)`) for the general catalog. Each background fetch toggled `isLoading`, repeatedly flashing the footer activity indicator/reload spinner in an infinite loop while bounced at the bottom.

---

## 2. Architectural Decisions & Fixes Applied

### A. Backend (`DeepLens.Contracts` & `DeepLens.SearchApi`)
1. **DTO Contract Expansion:**
   - Added `[JsonPropertyName("mediaCount")] public int MediaCount { get; set; }` to [`VisualSimilarityMatchDto`](file:///home/krikan/productivity/deeplens/src/DeepLens.Service/DeepLens.Contracts/Catalog/VisualSimilarityDtos.cs).
2. **Database Query Enrichment:**
   - In [`ProductsController.cs`](file:///home/krikan/productivity/deeplens/src/DeepLens.Service/DeepLens.SearchApi/Controllers/ProductsController.cs), the SQL query now computes:
     ```sql
     (SELECT COUNT(1) FROM public.media_links ml2 WHERE ml2.entity_id = p.id AND ml2.entity_type = 'product') AS MediaCount
     ```
   - Mapped safely via `MediaCount = Convert.ToInt32(c.mediacount ?? 0)`.

### B. Frontend (`Vayyari Mobile / Store`)
1. **Model Synchronization:**
   - Added `mediaCount?: number` to `VisualSimilarityMatch` in [`src/vayyari/types/products.ts`](file:///home/krikan/productivity/deeplens/src/vayyari/types/products.ts).
2. **True Media Count Preservation on Tiles:**
   - In [`product-list.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/app/utilities/product-list.tsx), `visualGridItems` maps `mediaCount: baseTile.mediaCount ?? match.mediaCount ?? 1`, preserving true count across all 76,000+ candidate items.
3. **Decoupled Infinite Scroll & Loading:**
   - In [`product-list.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/app/utilities/product-list.tsx), `onEndReached` is a strict no-op during visual search mode.
   - `hasMore` is forced to `false` when similarity search is active.
   - `isLoading` only reflects `visualSearchState.isSearching`.
   - `onRefresh` re-triggers the visual similarity search query using the reference image/post ID rather than pulling normal catalog page 1.
4. **FlatList Native Guard:**
   - In [`AdminProductCatalogPage.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/components/tamagui-ui/pages/AdminProductCatalogPage.tsx), `onEndReached={hasMore ? onEndReached : undefined}` disconnects native scroll listening when `hasMore=false`.
   - `ListFooterComponent` is guarded by `hasMore && isLoading && !isRefreshing`.

---

## 3. Test Coverage & Verification Matrix
- **Unit Tests (`src/vayyari/tests/visualLensSimilarityRules.test.ts`):**
  - `preserves actual product mediaCount on similarity search tiles without collapsing to 1`
  - `guards against background pagination loop and reload flashing when in visual search mode`
  - `FlatList onEndReached prop is strictly undefined when hasMore is false`
  - `ListFooterComponent suppresses ActivityIndicator spinner when hasMore is false`
  - `visual similarity match with mediaCount > 30 activates high-media zoning badge`
  - `pull-to-refresh during visual search re-runs similarity query instead of resetting catalog`
- **Backend Serialization Tests (`tests/DeepLens.SearchApi.Tests/DtoSerializationTests.cs`):**
  - `VisualSimilarityMatchDto_And_Response_SerializeAndDeserialize_CamelCase`
  - `VisualSimilarityMatchDto_Handles_Zero_And_Missing_MediaCount_Gracefully`
- **Result:** 307 frontend tests passed; 34 backend tests passed; architecture tests passed.

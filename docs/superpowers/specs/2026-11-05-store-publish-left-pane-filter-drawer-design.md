# Store Publish Left-Pane Filter Drawer & Active Filter Chips Design

## 1. Intent & Why
The "Publish to Store" screen (`AdminVayyariStorePublishPage.tsx`) manages publishing and syncing starred products from the DeepLens catalog to the Vayyari consumer storefront. 

Previously, filtering on this screen relied on an inline expandable dropdown accordion below the search bar. This had several usability issues:
1. Expanding filters pushed product grid items down the viewport, causing layout shift.
2. Horizontal scrolling inside narrow rows felt cramped on mobile screens.
3. It was inconsistent with the established pattern in the DeepLens ecosystem: the **Catalog** (`CatalogFilterDrawer`) and **Store Inventory** (`StoreInventoryFilterDrawer`) both use a left-anchored modal drawer with a two-panel split layout (left rail for categories, right panel for facet options) and an active filter chips row.

This design introduces a consistent, left-anchored `StorePublishFilterDrawer` with an active filter chips bar to `AdminVayyariStorePublishPage`.

---

## 2. Requirements & Scope
- **Left-Pane Drawer Modal**: An overlay modal sliding in from the left (`width = Math.min(SCREEN_WIDTH * 0.88, 380)`).
- **Two-Panel Split Layout**:
  - Left navigation rail with sections: `Sort`, `Category`, `Fabric`, `Price Range`, `SKU Swatches`, `Sync Status`.
  - Section badge counters indicating how many filters are active per facet.
  - Right panel showing facet options with checkmarks, search filtering (for fabrics), and radio/toggle buttons.
  - Bottom action bar with "Reset All" and "Apply Filters".
- **Trigger Button**: In the search bar row, replacing the accordion toggle with a slider button (`LuSlidersHorizontal`), tinted and badged when filters are active.
- **Active Filter Chips Row**: Horizontal scrollable chips bar under the search/category bar showing active filters with 1-tap `(x)` dismissal and "Reset All".
- **Filtering Logic**: Pure testable filtering functions in `src/vayyari/utils/storePublishFilterRules.ts`.

---

## 3. Architecture & Data Structures

### Filter State
```typescript
export interface StorePublishFilterState {
  sortBy: StoreSortOption;
  category: string;
  fabric: string;
  priceRange: PriceRangeOption;
  skuType?: SkuFilterOption;
  syncStatus?: 'all' | 'pending_updates' | 'synced';
}

export const DEFAULT_STORE_PUBLISH_FILTER_STATE: StorePublishFilterState = {
  sortBy: 'newest',
  category: 'All',
  fabric: 'All',
  priceRange: 'all',
  skuType: 'all',
  syncStatus: 'all',
};
```

### Components & Files
1. `src/vayyari/utils/storePublishFilterRules.ts`:
   - State interface, options, default state.
   - `getActiveStorePublishFilterCount(filter)`
   - `getStorePublishSectionBadge(section, filter)`
   - `getStorePublishFilterChips(filter)`
   - `removeStorePublishFilterChip(filter, chipId)`
   - `filterStorePublishProducts(products, filter, searchQuery, activeQueue, failedProducts)`
2. `src/vayyari/components/tamagui-ui/molecules/StorePublishFilterDrawer/StorePublishFilterDrawer.tsx`:
   - Left drawer modal component with split body, left nav rail, right facet panel, footer controls.
3. `src/vayyari/components/tamagui-ui/molecules/StorePublishFilterDrawer/index.ts`:
   - Re-exports component and types.
4. `src/vayyari/components/tamagui-ui/pages/AdminVayyariStorePublishPage.tsx`:
   - Integration of drawer, trigger button, and active chips bar.
5. `src/vayyari/tests/storePublishFilters.test.ts`:
   - Unit tests verifying filter counting, badge calculation, chip removal, and product filtering.

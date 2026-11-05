# Store Publish Left-Pane Filter Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline expandable accordion filter in the Publish to Store page with a left-anchored split drawer filter (`StorePublishFilterDrawer`) and an active filter chips row matching Catalog and Store Inventory.

**Architecture:** Pure filter rules and utilities in `storePublishFilterRules.ts`, an overlay left drawer modal molecule `StorePublishFilterDrawer`, and integration into `AdminVayyariStorePublishPage.tsx` with active filter chips and dynamic facet badges.

**Tech Stack:** React Native, Tamagui, Lucide Icons, TypeScript, Node.js Test Runner (`tsx --test`).

**Spec:** `docs/superpowers/specs/2026-11-05-store-publish-left-pane-filter-drawer-design.md`

## Global Constraints
- C# DTOs / TypeScript interfaces must match existing conventions.
- Mobile layout: Drawer width `Math.min(SCREEN_WIDTH * 0.88, 380)`.
- Accessible touch targets: Minimum 44px hit areas, proper `accessibilityRole` and `accessibilityLabel`.
- No manual `npx expo start` commands (runs via background service).
- All tests run via `npm --prefix src/vayyari test -- tests/storePublishFilters.test.ts`.

## Review Focus
1. Draft state isolation: Changing filters in the drawer must not affect the product grid until "Apply Filters" is pressed.
2. Filter reset behavior: "Reset All" in the drawer resets draft state; clearing active chips outside immediately updates the active filter state and grid.
3. Search query interaction: Search query in the main search bar and fabric search in the drawer must operate independently without stomping each other.
4. Active queue alignment: Switching between "All Starred", "Store Updates", and "Failed" queues must respect active facet filters.
5. Single chip removal: Dismissing an active chip (e.g., Fabric) resets only that facet without altering category, price range, or sort order.

---

### Task 1: Store Publish Filter Rules & Unit Tests

**Files:**
- Create: `src/vayyari/utils/storePublishFilterRules.ts`
- Create: `src/vayyari/tests/storePublishFilters.test.ts`

**Interfaces:**
- Produces:
  - `StorePublishFilterState`
  - `DEFAULT_STORE_PUBLISH_FILTER_STATE`
  - `getActiveStorePublishFilterCount(filter: StorePublishFilterState): number`
  - `getStorePublishSectionBadge(section: string, filter: StorePublishFilterState): number`
  - `getStorePublishFilterChips(filter: StorePublishFilterState): Array<{ id: string; label: string; field: keyof StorePublishFilterState }>`
  - `removeStorePublishFilterChip(filter: StorePublishFilterState, chipId: string): StorePublishFilterState`
  - `filterStorePublishProducts(products: VayyariStarredProductItem[], filter: StorePublishFilterState, searchQuery: string, activeQueue: 'all' | 'publish_updates' | 'failed', failedProducts?: VayyariStarredProductItem[]): VayyariStarredProductItem[]`

- [ ] **Step 1: Write the failing test**
Create `src/vayyari/tests/storePublishFilters.test.ts` covering default state, count calculation, section badges, chip generation, chip removal, and product filtering.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm --prefix src/vayyari test -- tests/storePublishFilters.test.ts`
Expected: FAIL due to missing `storePublishFilterRules.ts`.

- [ ] **Step 3: Implement `src/vayyari/utils/storePublishFilterRules.ts`**
Implement options, state interfaces, badge counting, chip mapping, and grid filtering logic.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm --prefix src/vayyari test -- tests/storePublishFilters.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/vayyari/utils/storePublishFilterRules.ts src/vayyari/tests/storePublishFilters.test.ts
git commit -m "feat(store-publish): add filter rules and unit tests for left-pane drawer"
```

---

### Task 2: Create `StorePublishFilterDrawer` Molecule

**Files:**
- Create: `src/vayyari/components/tamagui-ui/molecules/StorePublishFilterDrawer/StorePublishFilterDrawer.tsx`
- Create: `src/vayyari/components/tamagui-ui/molecules/StorePublishFilterDrawer/index.ts`

**Interfaces:**
- Consumes: `StorePublishFilterState`, `DEFAULT_STORE_PUBLISH_FILTER_STATE`, badge helpers from `storePublishFilterRules.ts`
- Produces: `StorePublishFilterDrawer` component with props `{ visible, onClose, current, onApply, categoryOptions, fabricOptions }`

- [ ] **Step 1: Implement `StorePublishFilterDrawer.tsx`**
Implement the left drawer modal with:
- Backdrop with `TouchableWithoutFeedback` to close.
- Left drawer surface (`width = Math.min(SCREEN_WIDTH * 0.88, 380)`).
- Header with "FILTERS", active count pill, and close icon.
- Two-panel split layout: Left rail for `Sort`, `Category`, `Fabric`, `Price Range`, `SKU Swatches`, `Sync Status` with badge counts; Right panel with radio/checkbox options and fabric search input.
- Footer with "Reset All" and "Apply Filters".

- [ ] **Step 2: Export from `index.ts`**
Create `src/vayyari/components/tamagui-ui/molecules/StorePublishFilterDrawer/index.ts` re-exporting the component and types.

- [ ] **Step 3: Verify with typecheck**
Run: `npm --prefix src/vayyari run typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit**
```bash
git add src/vayyari/components/tamagui-ui/molecules/StorePublishFilterDrawer/
git commit -m "feat(store-publish): implement left-anchored StorePublishFilterDrawer molecule"
```

---

### Task 3: Integrate Drawer & Filter Chips in `AdminVayyariStorePublishPage.tsx`

**Files:**
- Modify: `src/vayyari/components/tamagui-ui/pages/AdminVayyariStorePublishPage.tsx`

**Interfaces:**
- Consumes: `StorePublishFilterDrawer`, `storePublishFilterRules` helpers and state types.

- [ ] **Step 1: Replace inline collapsible accordion with left drawer and chips bar**
- Mount `<StorePublishFilterDrawer visible={isFilterDrawerOpen} onClose={() => setIsFilterDrawerOpen(false)} ... />`.
- Update the filter toggle button in the search row to open the drawer with active filter badge.
- Add horizontal active filter chips bar under the category pills with tap-to-remove `(x)` buttons.
- Update product filtering to leverage `filterStorePublishProducts`.

- [ ] **Step 2: Run unit tests and typecheck**
Run: `npm --prefix src/vayyari test -- tests/storePublishFilters.test.ts`
Run: `npm --prefix src/vayyari run typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Run full test suite**
Run: `npm --prefix src/vayyari test`
Expected: All tests pass.

- [ ] **Step 4: Commit**
```bash
git add src/vayyari/components/tamagui-ui/pages/AdminVayyariStorePublishPage.tsx
git commit -m "feat(store-publish): integrate left-pane filter drawer and active chips bar"
```

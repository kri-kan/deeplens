# Design: Clean Up Storybook Form-Factor Viewport Violations Across the Board

**Date:** 2026-11-04  
**Status:** Draft (Awaiting Approval)  
**Scope:** Whole Storybook (`src/apps/storybook`)

---

## 1. Intent & The Why
Across the Storybook catalog, multiple pages, templates, and workbenches maintain separate exported stories for `DesktopView`, `TabletView`, and `MobileView` (or dedicated `TabletView` / `MobileCartView` stories). Because the global Storybook preview decorator (`.storybook/preview.tsx`) already wraps all stories in `FormFactorShell`, which provides interactive top-bar toggling between Mobile (390px), Tablet (768px), and Desktop (1280px), having separate stories per device size creates clutter, confusing sidebar duplicates, and maintenance overhead.

This design consolidates all redundant viewport clones across the board into single canonical responsive stories, cleans up obsolete `withFormFactor` decorators, renumbers remaining stories sequentially, and maps legacy story IDs in `LEGACY_STORY_ALIASES` to preserve URL backward compatibility.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Eliminate Viewport Clones**: Remove redundant `DesktopView`, `TabletView`, `MobileView` exports from Store pages and Templates where an interactive story already exists.
- **Merge Split Device Stories**: Merge desktop and mobile shopping bags (`CartPage`, `BetaCartPage`) and multi-viewport workbench stories (`AdminSurveyPreviewPage`, `SizeCurationWorkflow`, `ProductGallery`) into single responsive stories.
- **Prune Isolated Tablet Stories**: Remove redundant standalone tablet stories from the 9 admin pages and renumber subsequent stories cleanly.
- **URL Backward Compatibility**: Add alias mappings in `LEGACY_STORY_ALIASES` within `.storybook/index.tsx` for all removed story IDs.
- **Clean Decorators & Imports**: Strip unnecessary `withFormFactor` calls that duplicate global shell behavior.
- **100% Type Safety**: Maintain clean `npm run typecheck` execution across `src/apps/storybook`.

### Non-Goals
- Modifying underlying component logic, page rendering, or business state machines.
- Altering genuine functional or category variations (e.g. empty bag states, regional language previews, distinct product categories).

### Anti-Goals
- Leaving gaps in sidebar numbering sequences (e.g. skipping from Story 4 to Story 6).
- Breaking existing browser bookmarks or URL links to removed story IDs.

---

## 3. Scope of Affected Files & Changes

### Domain 1: Storefront Pages (Triplicated Viewport Boilerplate)
1. **`src/apps/storybook/src/stories/pages/HomePage.stories.tsx`**:
   - Keep `InteractiveFormFactors` as the primary responsive story.
   - Remove `DesktopView`, `TabletView`, `MobileView`.
2. **`src/apps/storybook/src/stories/pages/CatalogPage.stories.tsx`**:
   - Keep `InteractiveFormFactors`.
   - Remove `DesktopView`, `TabletView`, `MobileView`.
3. **`src/apps/storybook/src/stories/pages/CheckoutPage.stories.tsx`**:
   - Keep `InteractiveFormFactors`.
   - Remove `DesktopView`, `TabletView`, `MobileView`.
4. **`src/apps/storybook/src/stories/pages/WishlistPage.stories.tsx`**:
   - Keep `InteractiveFormFactors` and `EmptyWishlistView`.
   - Remove `DesktopView`, `TabletView`, `MobileView`.
5. **`src/apps/storybook/src/stories/pages/ProductDetailPage.stories.tsx`**:
   - Keep `InteractiveFormFactors` and genuine category stories (`KanjeevaramSaree`, `AnarkaliDress`, etc.).
   - Remove `DesktopView`, `TabletView`, `MobileView`.

### Domain 2: Wireframe Templates (Triplicated Viewport Boilerplate)
6. **`src/apps/storybook/src/stories/templates/CatalogTemplate.stories.tsx`**: Remove `DesktopView`, `TabletView`, `MobileView`; keep `InteractiveFormFactors`.
7. **`src/apps/storybook/src/stories/templates/ProductDetailTemplate.stories.tsx`**: Remove `DesktopView`, `TabletView`, `MobileView`; keep `InteractiveFormFactors`.
8. **`src/apps/storybook/src/stories/templates/StorefrontTemplate.stories.tsx`**: Remove `DesktopView`, `TabletView`, `MobileView`; keep `InteractiveFormFactors`.
9. **`src/apps/storybook/src/stories/templates/WishlistTemplate.stories.tsx`**: Remove `DesktopView`, `MobileView`; keep `InteractiveFormFactors`.
10. **`src/apps/storybook/src/stories/templates/CartTemplate.stories.tsx`**: Remove `DesktopView`, `MobileView`; keep `InteractiveFormFactors`.

### Domain 3: Shopping Bags & Workbenches (Split Device Stories)
11. **`src/apps/storybook/src/stories/pages/CartPage.stories.tsx`**:
    - Merge Story 1 (`DefaultCart`: 1200px Desktop) and Story 2 (`MobileCartView`: 390px Mobile) into:
      `1. Interactive Shopping Bag (Responsive)`.
    - Renumber `EmptyBagView` to `2. Empty Shopping Bag`.
12. **`src/apps/storybook/src/stories/pages/BetaCart/BetaCartPage.stories.tsx`**:
    - Merge Story 1 (`DefaultBetaCart`: 1100px Desktop) and Story 3 (`MobileBetaCartView`: 390px Mobile) into:
      `1. Device-Synced Beta Bag (Responsive)`.
    - Renumber `SharedCartSalesView` to `2. Shared Cart View (Sales Concierge Perspective)`.
    - Renumber `EmptyBetaBagView` to `3. Empty Beta Bag`.
13. **`src/apps/storybook/src/stories/pages/AdminSurveyPreviewPage.stories.tsx`**:
    - Merge Story 1 (Mobile), Story 3 (Tablet), and Story 4 (Desktop) into:
      `1. Survey Preview Sandbox (Responsive)`.
    - Renumber `TeluguLanguagePreviewStory` to `2. Telugu Regional Preview (తెలుగు)`.
    - Renumber `WithSandboxReceiptModalStory` to `3. With Sandbox Submission Receipt Open`.
14. **`src/apps/storybook/src/stories/curation/SizeCurationWorkflow.stories.tsx`**:
    - Keep Story 1 (`InteractiveCurationWorkflow`).
    - Remove Stories 2, 3, 4 (`MobileCurationView_390px`, `TabletCurationView_768px`, `DesktopCurationWorkspace_1100px`).
15. **`src/apps/storybook/src/stories/organisms/ProductGallery.stories.tsx`**:
    - Consolidate `MobileWithColorSelection`, `TabletCarouselWithColorSelection`, and `DesktopInteractive` into a single responsive gallery story (`InteractiveProductGallery`).

### Domain 4: Admin Pages (Prune Isolated Redundant Tablet Stories)
16. **`src/apps/storybook/src/stories/pages/AdminHomeScreen.stories.tsx`**: Remove `TabletView` (Story 5); renumber subsequent stories (`6 -> 5`, etc.).
17. **`src/apps/storybook/src/stories/pages/OperationsHubPage.stories.tsx`**: Remove `TabletHub` (Story 5); renumber subsequent stories (`6 -> 5`, etc.).
18. **`src/apps/storybook/src/stories/pages/OrderIdGeneratorPage.stories.tsx`**: Remove `TabletView` (Story 6); renumber subsequent stories (`7 -> 6`, etc.).
19. **`src/apps/storybook/src/stories/pages/OrderLedgerPage.stories.tsx`**: Remove `TabletLedger` (Story 6).
20. **`src/apps/storybook/src/stories/pages/AllOrdersPage.stories.tsx`**: Remove `TabletView` (Story 5).
21. **`src/apps/storybook/src/stories/pages/AdminProductCatalogPage.stories.tsx`**: Remove `TabletViewport` (Story 8); renumber `9 -> 8`.
22. **`src/apps/storybook/src/stories/pages/AdminCreateProductPage.stories.tsx`**: Remove `TabletSplitViewport` (Story 6); renumber `7 -> 6`.
23. **`src/apps/storybook/src/stories/pages/AdminStoreAdministrationPage.stories.tsx`**: Remove `TabletViewport` (Story 3).
24. **`src/apps/storybook/src/stories/pages/UtilitiesHubPage.stories.tsx`**: Remove `TabletView` (Story 3).

### Domain 5: Backward Compatibility Router Mapping
25. **`src/apps/storybook/.storybook/index.tsx`**:
    - Add legacy aliases in `LEGACY_STORY_ALIASES` mapping all deleted/merged story IDs to their surviving canonical responsive story.

---

## 4. Verification Plan
- `npm run typecheck` in `src/apps/storybook` must pass with code 0 and zero TypeScript errors.
- Validate that all surviving story exports compile and render properly.

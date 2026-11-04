# Clean Up Storybook Form-Factor Viewport Violations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up all redundant form-factor viewport stories across the entire Storybook catalog, consolidating them into canonical responsive stories, renumbering story hierarchies, and registering legacy router aliases.

**Architecture:** Utilize Storybook's global `FormFactorShell` decorator (from `.storybook/preview.tsx`) which wraps stories in an interactive device chassis with Mobile (390px), Tablet (768px), and Desktop (1280px) toggling. Remove static per-device clones (`DesktopView`, `TabletView`, `MobileView`, and isolated tablet stories) that duplicate this functionality.

**Tech Stack:** React 19, TypeScript, Storybook for React Native / Web, Tamagui.

**Spec:** [docs/superpowers/specs/2026-11-04-storybook-form-factor-violations-cleanup-design.md](file:///home/krikan/productivity/deeplens/docs/superpowers/specs/2026-11-04-storybook-form-factor-violations-cleanup-design.md)

## Global Constraints
- Target workspace: `src/apps/storybook`
- All surviving stories must remain functional with their controls (`argTypes`, `args`)
- No broken numbering in story titles (must be clean and consecutive `1, 2, 3...`)
- Removed story IDs must be mapped in `LEGACY_STORY_ALIASES` in `src/apps/storybook/.storybook/index.tsx`
- `npm run typecheck` in `src/apps/storybook` MUST pass with code 0 and zero TypeScript errors

## Review Focus
1. **Responsive Coverage**: Ensure each cleaned page retains an interactive responsive story that reacts properly to Mobile, Tablet, and Desktop toggles in `FormFactorShell`.
2. **Feature Preservation**: Ensure genuine variants (e.g. EmptyBagView in CartPage, Telugu in SurveyPreview, category SKUs in ProductDetailPage) are preserved and not accidentally removed.
3. **Sequential Numbering**: Check that story titles in renamed files have no missing numbers or orphaned device prefixes.
4. **Router Continuity**: Verify that old story slugs resolve to the new canonical stories via `LEGACY_STORY_ALIASES`.

---

### Task 1: Clean Up Storefront Pages & Wireframe Templates

**Files:**
- Modify: `src/apps/storybook/src/stories/pages/HomePage.stories.tsx`
- Modify: `src/apps/storybook/src/stories/pages/CatalogPage.stories.tsx`
- Modify: `src/apps/storybook/src/stories/pages/CheckoutPage.stories.tsx`
- Modify: `src/apps/storybook/src/stories/pages/WishlistPage.stories.tsx`
- Modify: `src/apps/storybook/src/stories/pages/ProductDetailPage.stories.tsx`
- Modify: `src/apps/storybook/src/stories/templates/CatalogTemplate.stories.tsx`
- Modify: `src/apps/storybook/src/stories/templates/ProductDetailTemplate.stories.tsx`
- Modify: `src/apps/storybook/src/stories/templates/StorefrontTemplate.stories.tsx`
- Modify: `src/apps/storybook/src/stories/templates/WishlistTemplate.stories.tsx`
- Modify: `src/apps/storybook/src/stories/templates/CartTemplate.stories.tsx`

**Interfaces:**
- Consumes: `FormFactorShell` global decorator, page and template components
- Produces: Cleaned story exports without redundant `DesktopView`, `TabletView`, `MobileView` stories

- [x] **Step 1: Clean up Storefront Pages (HomePage, CatalogPage, CheckoutPage, WishlistPage, ProductDetailPage)**
  - In `HomePage.stories.tsx`: remove `DesktopView`, `TabletView`, `MobileView`. Keep `InteractiveFormFactors` (export as `InteractiveHomePage` or `InteractiveFormFactors`).
  - In `CatalogPage.stories.tsx`: remove `DesktopView`, `TabletView`, `MobileView`. Keep `InteractiveFormFactors`.
  - In `CheckoutPage.stories.tsx`: remove `DesktopView`, `TabletView`, `MobileView`. Keep `InteractiveFormFactors`.
  - In `WishlistPage.stories.tsx`: remove `DesktopView`, `TabletView`, `MobileView`. Keep `InteractiveFormFactors` and `EmptyWishlistView`. Remove unused `withFormFactor` import.
  - In `ProductDetailPage.stories.tsx`: remove `DesktopView`, `TabletView`, `MobileView`. Keep `InteractiveFormFactors` and authentic catalog category stories (`KanjeevaramSaree`, `AnarkaliDress`, etc.).

- [x] **Step 2: Clean up Wireframe Templates (CatalogTemplate, ProductDetailTemplate, StorefrontTemplate, WishlistTemplate, CartTemplate)**
  - Remove `DesktopView`, `TabletView`, and `MobileView` from `CatalogTemplate.stories.tsx`, `ProductDetailTemplate.stories.tsx`, and `StorefrontTemplate.stories.tsx`. Keep `InteractiveFormFactors`.
  - Remove `DesktopView` and `MobileView` from `WishlistTemplate.stories.tsx` and `CartTemplate.stories.tsx`. Keep `InteractiveFormFactors`.

- [x] **Step 3: Run TypeScript typecheck**
  - Run: `npm run typecheck` in `src/apps/storybook`
  - Expected: Exit code 0, zero errors.

---

### Task 2: Consolidate Split Device Stories in Shopping Bags & Workbenches

**Files:**
- Modify: `src/apps/storybook/src/stories/pages/CartPage.stories.tsx`
- Modify: `src/apps/storybook/src/stories/pages/BetaCart/BetaCartPage.stories.tsx`
- Modify: `src/apps/storybook/src/stories/pages/AdminSurveyPreviewPage.stories.tsx`
- Modify: `src/apps/storybook/src/stories/curation/SizeCurationWorkflow.stories.tsx`
- Modify: `src/apps/storybook/src/stories/organisms/ProductGallery.stories.tsx`

**Interfaces:**
- Consumes: `CartPage`, `BetaCartPage`, `AdminSurveyPreviewPage`, `SizeSettingWorkflowComponent`, `ProductGallery`
- Produces: Consolidated responsive stories with sequential numbering

- [x] **Step 1: Consolidate CartPage and BetaCartPage stories**
  - In `CartPage.stories.tsx`:
    - Merge `DefaultCart` (Story 1) and `MobileCartView` (Story 2) into `1. Interactive Shopping Bag (Responsive)`.
    - Renumber `EmptyBagView` to `2. Empty Shopping Bag`.
    - Remove unused `FormFactorPreview` and `withFormFactor` imports if no longer needed.
  - In `BetaCartPage.stories.tsx`:
    - Merge `DefaultBetaCart` (Story 1) and `MobileBetaCartView` (Story 3) into `1. Device-Synced Beta Bag (Responsive)`.
    - Renumber `SharedCartSalesView` to `2. Shared Cart View (Sales Concierge Perspective)`.
    - Renumber `EmptyBetaBagView` to `3. Empty Beta Bag`.
    - Remove unused `FormFactorPreview` and `withFormFactor` imports if no longer needed.

- [x] **Step 2: Consolidate AdminSurveyPreviewPage, SizeCurationWorkflow, and ProductGallery stories**
  - In `AdminSurveyPreviewPage.stories.tsx`:
    - Merge `MobilePreviewStory` (1), `TabletPreviewStory` (3), and `DesktopPreviewStory` (4) into `1. Survey Preview Sandbox (Responsive)`.
    - Renumber `TeluguLanguagePreviewStory` to `2. Telugu Regional Preview (తెలుగు)`.
    - Renumber `WithSandboxReceiptModalStory` to `3. With Sandbox Submission Receipt Open`.
  - In `SizeCurationWorkflow.stories.tsx`:
    - Keep `InteractiveCurationWorkflow` (Story 1).
    - Remove `MobileCurationView_390px` (2), `TabletCurationView_768px` (3), and `DesktopCurationWorkspace_1100px` (4).
  - In `ProductGallery.stories.tsx`:
    - Consolidate `MobileWithColorSelection`, `TabletCarouselWithColorSelection`, and `DesktopInteractive` into `InteractiveProductGallery` (allowing `FormFactorShell` to manage mobile/tablet/desktop sizing).

- [x] **Step 3: Run TypeScript typecheck**
  - Run: `npm run typecheck` in `src/apps/storybook`
  - Expected: Exit code 0, zero errors.

---

### Task 3: Prune Standalone Tablet Stories & Renumber Admin Pages

**Files:**
- Modify: `src/apps/storybook/src/stories/pages/AdminHomeScreen.stories.tsx`
- Modify: `src/apps/storybook/src/stories/pages/OperationsHubPage.stories.tsx`
- Modify: `src/apps/storybook/src/stories/pages/OrderIdGeneratorPage.stories.tsx`
- Modify: `src/apps/storybook/src/stories/pages/OrderLedgerPage.stories.tsx`
- Modify: `src/apps/storybook/src/stories/pages/AllOrdersPage.stories.tsx`
- Modify: `src/apps/storybook/src/stories/pages/AdminProductCatalogPage.stories.tsx`
- Modify: `src/apps/storybook/src/stories/pages/AdminCreateProductPage.stories.tsx`
- Modify: `src/apps/storybook/src/stories/pages/AdminStoreAdministrationPage.stories.tsx`
- Modify: `src/apps/storybook/src/stories/pages/UtilitiesHubPage.stories.tsx`

**Interfaces:**
- Consumes: Admin page components
- Produces: Sequentially numbered admin stories without standalone redundant tablet views

- [x] **Step 1: Remove isolated tablet stories from Admin pages**
  - In `AdminHomeScreen.stories.tsx`: remove `TabletView` (Story 5); renumber `6 -> 5`.
  - In `OperationsHubPage.stories.tsx`: remove `TabletHub` (Story 5); renumber `6 -> 5`, `7 -> 6`, `8 -> 7`.
  - In `OrderIdGeneratorPage.stories.tsx`: remove `TabletView` (Story 6); renumber `7 -> 6`.
  - In `OrderLedgerPage.stories.tsx`: remove `TabletLedger` (Story 6).
  - In `AllOrdersPage.stories.tsx`: remove `TabletView` (Story 5).
  - In `AdminProductCatalogPage.stories.tsx`: remove `TabletViewport` (Story 8); renumber `9 -> 8`, `10 -> 9`.
  - In `AdminCreateProductPage.stories.tsx`: remove `TabletSplitViewport` (Story 6); renumber `7 -> 6`.
  - In `AdminStoreAdministrationPage.stories.tsx`: remove `TabletViewport` (Story 3).
  - In `UtilitiesHubPage.stories.tsx`: remove `TabletView` (Story 3).

- [x] **Step 2: Clean up unused withFormFactor imports across these admin story files**
  - If a file no longer uses `withFormFactor`, remove the import.

- [x] **Step 3: Run TypeScript typecheck**
  - Run: `npm run typecheck` in `src/apps/storybook`
  - Expected: Exit code 0, zero errors.

---

### Task 4: Register Legacy Router Aliases & Final Verification

**Files:**
- Modify: `src/apps/storybook/.storybook/index.tsx`

**Interfaces:**
- Consumes: Removed story IDs across Tasks 1, 2, 3
- Produces: `LEGACY_STORY_ALIASES` map redirecting all legacy story IDs to their canonical responsive stories

- [x] **Step 1: Add aliases to `LEGACY_STORY_ALIASES` in `.storybook/index.tsx`**
  - Map removed viewport IDs for Store pages, templates, shopping bags, and admin pages to their respective canonical responsive stories.

- [x] **Step 2: Run full Storybook typecheck**
  - Run: `npm run typecheck` in `src/apps/storybook`
  - Expected: Exit code 0, zero errors.

- [x] **Step 3: Verify clean git status and commit**
  - Verify all modified files are properly formatted and committed.

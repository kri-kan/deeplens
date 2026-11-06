# Unified Stateless PDP Fragment for Storefront Administration & Live Store App

- **Date:** 2026-11-06
- **Author:** Krishna (Squad Lead & Coordinator)
- **Status:** Decided & Implemented

## Context & Problem Statement
Previously, Product Detail Page (PDP) rendering logic was duplicated and diverging across multiple applications:
1. **Storefront Administration (`src/vayyari`)**: Used a bespoke 478-line preview modal (`StorePdpLivePreviewModal`) and an inline simulated preview block in `AdminStoreProductCurationPage.tsx`.
2. **Store App (`src/store`)**: Kept a 1,049-line implementation in `src/app/pages/ProductDetailPage.tsx` mixing data fetching, business logic, and ~700 lines of inline template assembly.
3. **Storybook (`src/apps/storybook`)**: Maintained a separate 919-line `ProductDetailPage.tsx` component and a separate copy of `StorePdpLivePreviewModal.tsx`.

Any update to mobile PDP styling (such as the borderless flush layout, 2-line clamped description with "Read More", attribute count pills in collapsible specifications, or multi-template color swatches) required manual edits across all three locations, leading to drift between the admin preview and customer experience.

## Decision
1. **Create One Unified Stateless Component (`ProductDetailFragment`)**:
   - Accepts a normalized, declarative contract `PdpProductData` and `ProductDetailFragmentProps`.
   - Supports two operational modes: `mode="live"` (standard customer e-commerce PDP) and `mode="preview"` (storefront administration preview banner with non-destructive action handling).
   - Strictly enforces the Mobile PDP Borderless Flush Pattern (`borderless={isMobile}` for viewports < 768px): edge-to-edge media gallery, 2-line clamped story description with "Read More... ↓", collapsible specifications with attribute count pill `(12)` & Silk Mark badge, and sticky bottom Add to Bag / Preview bar.
2. **Dual-Exposed Shared Component Architecture**:
   - `src/apps/storybook/src/components/organisms/ProductDetailFragment/`: Directly symlinked into `src/store/src/components/organisms/` so the Store app consumes it with zero extra build steps or path resolution hacks.
   - `src/vayyari/components/tamagui-ui/organisms/StoreCuration/ProductDetailFragment.tsx`: Self-contained native implementation for Vayyari Android & Web administration, using `@expo/vector-icons` to maintain 100% native stability.
3. **Consumer Refactoring**:
   - **Store App (`src/store/src/app/pages/ProductDetailPage.tsx`)**: Refactored from 1,049 lines down to ~350 lines. Focuses purely on data fetching, Cart/Wishlist context hooks, and modal triggers while delegating 100% of the UI layout to `<ProductDetailFragment />`.
   - **Storefront Administration (`StorePdpLivePreviewModal.tsx`)**: Replaced 478 lines of bespoke preview code with `<ProductDetailFragment mode="preview" ... />`.
   - **Admin Store Product Curation Page (`AdminStoreProductCurationPage.tsx`)**: Replaced bespoke preview simulation with `<ProductDetailFragment mode="preview" ... />`.
   - **Storybook**: Added dedicated component stories in `src/apps/storybook/src/stories/organisms/ProductDetailFragment.stories.tsx` verifying Live Mobile Flush, Admin Preview, Desktop Cards, and Out-of-Stock states.

## Verification
- `npm run typecheck` in `src/vayyari`: Passed (0 errors).
- `npm test` in `src/vayyari`: 388 tests passed across 86 suites (0 failures).
- `npm run typecheck` in `src/store`: Passed (0 errors).
- `npm run typecheck` in `src/apps/storybook`: Passed (0 errors).
- `npm run typecheck` in `src/packages/ui`: Passed (0 errors).
- Expo packager reloaded via `tmux send-keys -t expo r C-m`.

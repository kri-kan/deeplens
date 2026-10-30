# Unified Catalog Visual Search & Minimal Focus Mode Architecture

**Date:** 2026-10-29  
**Decision Owner:** Krishna (Squad Lead & Coordinator)  
**Status:** Approved & Deployed  
**Affected Subsystems:** `src/vayyari` (Mobile UI), `DeepLens.SearchApi` (Similarity Engine)

---

## 1. Context & Motivation
Previously, visual similarity search was launched from a large floating bottom pill inside Instagram post media focus view and opened a slide-up drawer or navigated to a separate dedicated studio page (`visual-lens.tsx`). 

Feedback & requirements:
1. **Focus Mode:** Keep focus mode minimal, immersive, and simple like native Instagram. Replace the big floating bottom button with a sleek, glowing neon Lens icon at the **top-left** of the view.
2. **Unified Discovery in Catalog:** Eliminate redundant isolated results pages. The primary **Product Catalog Page** (`/utilities/product-list`) is now the visual search results destination, providing immediate access to multi-column responsive grid layout, multi-selection actions, quick-edit, and facet filters.
3. **Universal Camera Visual Search:** Add a camera icon button directly inside the catalog free-text search bar, allowing users to pick reference images from device gallery or camera to search the catalog anytime.

---

## 2. Architectural Decisions & Changes

### A. Focus Mode (`InstagramMediaFocusModal.tsx`)
- Removed the large floating bottom button (`floatingLensContainer`) and the slide-up drawer (`isLensOpen`).
- Added a compact top-left neon lens button (`camera-iris` with cyan border `#06B6D4`, cyan shadow glow `#00F0FF`, and frosted glass background).
- Tapping the neon lens button routes directly to `/utilities/product-list` passing:
  - `visualImageUri`, `visualPostId`, `visualStoragePath`, `visualMediaId`.
- Preserves top-right close button (`X`) and top-center multi-media counter pill (`1 / N`).

### B. Catalog Free-Text Search Bar (`AdminProductCatalogPage.tsx`)
- Added `LuCamera` icon button inside the free-text search bar.
- Added `onCameraPress`, `visualSearchState`, and `onClearVisualSearch` props.
- When visual search is active, renders a persistent **Active Visual Search Reference Bar** beneath the search bar:
  - Reference image thumbnail (28x28 with cyan border).
  - Label: `Visual Similarity Search` with candidate match count / scanning progress.
  - `[✕ Clear]` pill button to dismiss visual search mode and return to standard catalog view.

### C. Catalog Page State & Visual Tile Rendering (`app/utilities/product-list.tsx`)
- Wired `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.8, allowsEditing: true })` to the search bar camera icon.
- Listens to incoming route params (`visualImageUri`, `visualPostId`, `visualStoragePath`, `visualMediaId`) to automatically trigger `productService.searchVisualSimilarity(...)`.
- Converts similarity matches into `ProductGridTileData` with `similarityPercentage`, sorted descending from highest match to lowest.
- Integrates `effectiveGridItems` directly with `useMultiSelect`, enabling bulk actions (star, move category, store curation) on visual match results.

### D. Visual Similarity Badge on Product Tiles (`ProductGridTile.tsx`)
- Added `similarityPercentage?: number` to `ProductGridTileData`.
- When present, renders a prominent similarity percentage badge on the product tile:
  - `≥ 80%`: `#059669` (High Confidence Emerald)
  - `60 - 79%`: `#D97706` (Medium Confidence Amber)
  - `< 60%`: `#475569` (Slate Gray)

---

## 3. Verification & Compliance
- **TypeScript:** `npx tsc --noEmit` verified with 0 errors.
- **Unit Tests:** All 291 frontend test cases in `src/vayyari` passing across 71 test suites.
- **Packager Reload:** Expo packager reloaded via `tmux send-keys -t expo r C-m`.

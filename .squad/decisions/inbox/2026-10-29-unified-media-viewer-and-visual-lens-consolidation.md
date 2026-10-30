# Architectural Decision: Unified Media Viewer & Visual Lens Consolidation

**Date:** 2026-10-29  
**Decision Owner:** Krishna (Squad Lead & Coordinator)  
**Status:** Accepted & Enforced  

---

## 1. Context & Motivation
Media previews were previously scattered across four divergent modal components:
1. `ImagePreviewModal` (WhatsApp messages): Paper Modal, multi-image FlatList, pinch-zoom, video view.
2. `ImageViewerModal` (Orders & Forms): Tamagui static Image modal without pinch-zoom.
3. `AdminProductFullscreenViewer` (Catalog PDP): Custom filmstrip & pinch-zoom without visual search.
4. `InstagramMediaFocusModal` (Instagram explorer): Custom focus modal with manual routing.

Admins need the ability to initiate Visual Similarity Search from **any** image across the app (WhatsApp supplier chats, customer order proofs, catalog PDP close-ups, and competitor feeds) without UX inconsistency or duplicated navigation code.

---

## 2. Architecture & Consolidation

### A. Atomic Abstraction: `<VisualLensButton />` & `useVisualSearchNavigation`
- **Hook ([`useVisualSearchNavigation.ts`](file:///home/krikan/productivity/deeplens/src/vayyari/hooks/useVisualSearchNavigation.ts)):**
  - Standardizes navigation to `/utilities/product-list` with `visualImageUri`, `visualStoragePath`, `visualMediaId`, and `visualPostId`.
  - Executes `onBeforeNavigate?.()` to cleanly dismiss the active modal prior to route transition.
- **Component ([`VisualLensButton.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/components/tamagui-ui/atoms/VisualLensButton/VisualLensButton.tsx)):**
  - Encapsulates neon cyan glow styling (`#06B6D4` border, `#00F0FF` shadow, `#22D3EE` camera icon).
  - Triggers light tactile haptic feedback (`Haptics.impactAsync`).
  - **Auto-Suppression:** Automatically suppresses rendering if the target media is a video or null/empty.

### B. Consolidated Canonical Viewer: `<ImageViewerModal />`
- Upgraded [`ImageViewerModal.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/components/tamagui-ui/molecules/ImageViewerModal/ImageViewerModal.tsx) into the single canonical zoomable media viewer:
  - Supports single `imageUrl` or array of `imageUrls`.
  - Full gestures via `ZoomableImage` (pinch-to-zoom, pan bounds, double-tap to zoom).
  - Native video playback via `expo-video` (`UnifiedVideoPlayer`).
  - Embedded `<VisualLensButton />` in header (auto-shows on images, auto-hides on videos).
  - Native Share support with platform fallback.
  - Page counter pill for multi-image albums.
- **Backward-Compatible Facade ([`ImagePreviewModal.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/components/ui/ImagePreviewModal.tsx)):**
  - Refactored `ImagePreviewModal` to delegate directly to `ImageViewerModal`, eliminating ~230 lines of duplicated modal code while keeping all WhatsApp chat callers (`[jid].tsx`) working with 0 breaking changes.

### C. PDP Fullscreen Viewer & Instagram Focus Modal Integration
- Integrated `<VisualLensButton />` directly into [`AdminProductFullscreenViewer.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/components/tamagui-ui/molecules/AdminProductMediaViewer/AdminProductFullscreenViewer.tsx) top-right header.
- Refactored [`InstagramMediaFocusModal.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/components/utility/instagram/InstagramMediaFocusModal.tsx) to use `<VisualLensButton />`.

---

## 3. Verification & Metrics
- `npm test`: 310 tests passing (including unit tests for `useVisualSearchNavigation` and `ImageViewerModal` image normalization).
- `npx tsc --noEmit`: 0 errors.
- `dotnet test tests/DeepLens.ArchitectureTests/`: Passed.

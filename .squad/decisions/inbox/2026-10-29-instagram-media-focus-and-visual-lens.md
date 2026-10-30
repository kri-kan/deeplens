# Decision: Instagram Media Focus View Mode & Visual Catalog Lens Matching

**Date:** 2026-10-29
**Author:** Krishna (Squad Lead & Coordinator)
**Component:** Vayyari Mobile App (`src/vayyari`) & DeepLens SearchApi (`src/DeepLens.Service/DeepLens.SearchApi`)

## Context & User Request
The user requested an Instagram-like preview / focus view mode on click for media in Instagram posts, featuring a "Lens"-like button that searches image similarity across the product catalog to find similar products for linking. The feature is also accessible via the 3-dot "Post Actions" menu opening a dedicated page where the user can select multiple images (carousel posts) or select specific frames from a video/reel to match against the catalog and link products.

## Architecture & Implementation

1. **Backend Visual Similarity Engine (`DeepLens.SearchApi` - `ProductsController`)**:
   - `POST /api/v1/products/visual-similarity` and `GET /api/v1/products/visual-similarity`.
   - Accepts `postId`, `mediaId`, `storagePath`, `imageUrl`, `phash`, `imageBase64`, `take`, and `minSimilarity`.
   - Computes or retrieves 64-bit dHash using `SixLabors.ImageSharp`.
   - Queries `media` and `products` joining with `instagram_product_links` to determine current link state (`isLinked`, `existingLinkType`).
   - Uses `BitOperations.PopCount(h1 ^ h2)` for sub-millisecond Hamming distance calculation across 76,000+ candidate catalog images.
   - Deployed and live in `deeplens-api` container via `./infrastructure/deploy.sh search-api`.

2. **Instagram Media Focus View Modal (`InstagramMediaFocusModal.tsx`)**:
   - Immersive full-screen focus view matching Instagram's preview experience.
   - Tap on post media opens focus mode with pinch-zoom support, video playback, and carousel navigation.
   - Prominent floating "Catalog Lens" pill button on the media.
   - Slide-up similarity drawer showing matched catalog products with similarity score (% badge), SKU, price, photo thumbnail, and instant "Link ('IS' / 'LIKE')" or "Unlink" buttons.

3. **Dedicated Visual Lens Studio (`src/vayyari/app/utilities/instagram/visual-lens.tsx`)**:
   - Accessible via the 3-dot "Post Actions" menu ("Visual Catalog Lens (Similarity Match)") and from the Focus View modal.
   - Multi-Media Selector: Select between any images in a carousel post.
   - Video Frame Selector: Scrub along video timeline with preset timestamp chips ("Cover Poster", "00:02", "00:05", "00:10", "00:15").
   - Filter chips: All, High Confidence (≥80%), Medium Confidence (60–79%).
   - Search bar: Filter results by SKU or title.
   - Match cards: Product preview image, similarity percentage badge, SKU, price, category, and 1-tap quick linking buttons (`'IS'`, `'LIKE'`, or `'Unlink'`).

4. **Architecture Tests & Quality Validation**:
   - Verified with `dotnet test tests/DeepLens.ArchitectureTests/`: passed (100% compliant with camelCase JSON attributes).
   - Verified with `npm run typecheck` in `src/vayyari`: 0 errors.
   - Verified with `npm test` in `src/vayyari`: all 256 unit tests passed.
   - Reloaded running Expo packager via `tmux send-keys -t expo r C-m`.

# Decision: Instagram Post Media Linking, Swatch Curation & Storefront PDP Badging

- **Date:** 2026-10-29
- **Author:** Krishna (Squad Lead) & Specialist Agents (Bhishma, Viswakarma, Abhimanyu)
- **Status:** Approved & Implemented

## Context
Merchandisers link Instagram reels/posts to existing catalog products or create new products directly from Instagram posts. Merchandisers require the ability to:
1. Preserve source Instagram attribution (`sourcePlatform`, `sourceUrl`, `sourcePostId`) in the media payload.
2. Curate Instagram media as either universal to all color swatches (`isCommon: true`) or assigned to a specific color swatch (`colorGroupId`).
3. Render a frosted Instagram badge ("Seen on Instagram ↗") with direct link-out on the customer-facing Store PDP (`ProductGallery.tsx`), both in mobile and desktop hero canvases, and show an indicator chip on thumbnail strips.
4. Render an Instagram badge in the admin Curation Workbench (`AdminStoreProductCurationPage.tsx`).

## Architectural Decisions
1. **DTOs & Backward Compatibility:**
   - Extended `StoreMediaItemDto` in C# (`Store.Api/Models/CurationModels.cs`) with optional properties:
     - `sourcePlatform` (e.g. `"instagram"`)
     - `sourceUrl` (e.g. `"https://www.instagram.com/reel/..."`)
     - `sourcePostId`
   - All properties annotated with `[JsonPropertyName("camelCase")]` per hard architectural rules.
   - Guaranteed full backward compatibility with legacy JSON entries lacking these fields.
2. **TypeScript Interface Mirroring:**
   - Mirrored across:
     - `StoreCurationMediaItem` in `src/vayyari/types/curation.ts`
     - `StoreMediaItem` in `src/vayyari/services/storeAdminService.ts`
     - `StoreMediaItem` in `src/store/src/services/mock/mockCatalogService.ts`
     - `GalleryImage` in `src/store/src/components/organisms/ProductGallery/ProductGallery.tsx`
     - `DeltaMediaAllocationItem` in `src/vayyari/utils/publishDeltaRules.ts`
3. **Storefront PDP UX:**
   - Added a frosted pill badge `[ 📸 Seen on Instagram ↗ ]` in `ProductGallery.tsx` that deep-links directly to the post/reel.
   - Added indicator chips on compact and desktop thumbnails.
4. **TDD Hardening:**
   - Added C# unit tests in `CurationBusinessRulesTests.cs` (26 passed).
   - Added full regression test suite `instagramStoreMediaCuration.test.ts` (all 257 Vayyari tests passed).
   - Verified TypeScript compilation in `src/store` (`npm run typecheck` passed with 0 errors).

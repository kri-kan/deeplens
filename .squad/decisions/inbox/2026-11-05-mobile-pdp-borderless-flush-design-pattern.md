# Decision: Mobile PDP Borderless Flush Design Pattern Standard

- **Date:** 2026-11-05
- **Decision Owner:** Krishna (Squad Lead & Coordinator)
- **Specialists Involved:** Viswakarma (Design System Lead), Abhimanyu (Testing Lead), Bhishma (Architect)
- **Status:** Approved & Adopted as Universal Standard

---

## 1. Context & Problem Statement
On mobile viewports (360px–412px), the consumer-facing Product Detail Page (PDP) was previously rendering each section (`purchasePanel`, `color_variations`, `frequently_bought`, `specifications`, `reviews`, `similar_products`, `you_may_like`, `recently_viewed`) inside separate boxed card containers with:
- `backgroundColor: tokens.surface`
- `borderColor: tokens.border`
- `borderWidth: 1`
- `borderRadius: 16–20`
- `padding: 16`
- Outer template `paddingHorizontal: 12`

This resulted in 28px of margins/gutters on each side (56px total horizontal screen space wasted on 390px screens), squeezing imagery, swatches, titles, and price typography into a narrow central column and creating excessive vertical clutter with stacked card outlines.

Additionally:
- The "Select Colorway & Size" bottom sheet displayed bulky cards and text paragraphs instead of quick, touch-friendly circular swatch dots.
- Long product descriptions pushed primary pricing and buy buttons down unless initially clamped.
- Specifications tables took excessive vertical scroll space by default.

---

## 2. Decision & Standard Specification
Going forward across the entire DeepLens and Vayyari store ecosystem, **all consumer-facing PDP screens on mobile viewports (< 768px)** must adopt the **Borderless Flush Design Pattern**:

1. **Flush Canvas & Margin Reclaim:**
   - On mobile viewports, section container backgrounds and borders are removed (`backgroundColor: 'transparent'`, `borderWidth: 0`, `borderRadius: 0`).
   - `ProductDetailTemplate` scales lateral padding from 12px down to 8px when `borderless` is active.
   - Saves 56px in wasted margin width, enabling rich edge-to-edge photography, swatches, and recommendation strips.

2. **Edge-to-Edge Image Thumbnails:**
   - Horizontal gallery preview icons span the full container width with horizontal momentum scrolling when image count exceeds screen width.

3. **Lean Single-Row Swatches in Bottom Sheet:**
   - When tapping "Add to Bag" without prior swatch selection, a Myntra-style bottom sheet displays a single horizontal row of circular `CustomSwatchDot`s.
   - Selecting a swatch adds the SKU immediately to the bag, closes the sheet, and updates the sticky buy button to `"🛍 Go to Bag →"`.

4. **Clamped Story Description:**
   - Clamped to 2 lines by default with an inline `"Read More... ↓"` / `"Show Less ↑"` toggle.

5. **Compact Collapsed Specifications:**
   - Collapsed by default on load, displaying the attribute count chip (e.g. `(12)`) and a chevron toggle.

6. **Desktop Non-Regression:**
   - Desktop and tablet screens (≥ 768px) retain elegant bordered cards and spacious grids.

---

## 3. Files & Components Implementing This Standard
- `src/apps/storybook/src/components/templates/ProductDetailTemplate.tsx` (`borderless?: boolean`)
- `src/apps/storybook/src/components/organisms/ProductGallery/ProductGallery.tsx` (`borderless?: boolean`)
- `src/apps/storybook/src/components/organisms/FrequentlyBoughtTogether/FrequentlyBoughtTogether.tsx` (`borderless?: boolean`)
- `src/apps/storybook/src/components/organisms/SpecificationsPanel/SpecificationsPanel.tsx` (`borderless?: boolean`)
- `src/apps/storybook/src/components/organisms/RatingsPanel/RatingsPanel.tsx` (`borderless?: boolean`)
- `src/apps/storybook/src/components/pages/ProductDetailPage.tsx` (`DEFAULT_PDP_CONFIG = MOBILE_FLUSH_PRESET`)
- `src/store/src/app/pages/ProductDetailPage.tsx` (Vayyari Store Application PDP)
- `src/vayyari/constants/pdpConfig.ts` (`MOBILE_FLUSH_PRESET`, `DEFAULT_PDP_CONFIG`)
- `AGENTS.md` (Team Hard Rule enforced for all future agent sessions)

---

## 4. Verification & Testing
- Storybook visual side-by-side verification: `Pages/Store/ProductDetail -> Mobile Layout: 2. Borderless Flush`.
- Store Configuration Studio live preview: `Pages/Admin/Store - Configuration Studio -> Variant C Mobile Flush`.
- Automated test coverage: 360 unit tests in `src/vayyari` passing (100%).
- Full TypeScript compiler checks passing in both Storybook and Store SPA with 0 errors.

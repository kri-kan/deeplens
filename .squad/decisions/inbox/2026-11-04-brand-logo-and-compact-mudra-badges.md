# Decision: Brand Logo Atom & Compact Mudra Badge System Refinements

- **Date**: 2026-11-04
- **Author**: Krishna (Squad Lead) & Viswakarma (Design Specialist)
- **Status**: Accepted
- **Subsystem**: Storefront UI / Storybook Workbench / Brand Identity (`src/apps/storybook`, `src/store`, `src/vayyari`)

## Context
Following initial rollout of the handcrafted Mudra Coin SVG, the design review identified five essential visual and architectural refinements:
1. **Vertical / Horizontal Alignment**: Mudra coin icon and badge count text were misaligned due to unconstrained default font line heights (`23px` on Tamagui `<Text>`) vs circular SVG icons (`16px`/`13px`).
2. **Compact Badges**: Need for high-density badges displaying only `[Coin] Count` without the `"Mudras"` text label for compact grids, navbars, and cart rows.
3. **Hierarchy Flattening**: Elimination of the intermediate `Currency/` folder in Storybook to keep atoms directly accessible at `'Atoms/Mudra Coin'`.
4. **Brand Logo Atom (`VayyariLogo`)**: Expansion of brand identity tooling to include a unified, haute couture `VayyariLogo` atom (emblem, horizontal lockup, stacked lockup, wordmark) mirroring the fidelity of `MudraCoin`.
5. **Legacy Purge**: Elimination of all generic open-source Lucide coins (`LuCoins`) comparison stories and relics.

## Decisions Made

1. **Optical Centering & Alignment Architecture**:
   - Added `lineHeight: 0`, `verticalAlign: 'middle'`, and `display: 'block'` on the SVG container in [`MudraCoin.tsx`](file:///home/krikan/productivity/deeplens/src/apps/storybook/src/components/atoms/MudraCoin/MudraCoin.tsx).
   - Constrained badge typography in [`SurveyMudrasBadge.tsx`](file:///home/krikan/productivity/deeplens/src/apps/storybook/src/components/atoms/SurveyMudrasBadge/SurveyMudrasBadge.tsx) to explicit `lineHeight={fontSize + 2}`, ensuring coin center Y and text cap-height/baseline align to sub-pixel accuracy.

2. **Compact Badges & Count-Only Variants**:
   - Enhanced `SurveyMudrasBadge` with `variant="compact"` and `showLabel?: boolean` (defaults to `false` in compact mode).
   - Created dedicated `CompactBadges` story showing small (`size="sm"`), medium (`default`), and large (`size="lg"`) scales across ivory and midnight themes.

3. **Storybook Hierarchy**:
   - Flattened Storybook title to `'Atoms/Mudra Coin'` in [`MudraCoin.stories.tsx`](file:///home/krikan/productivity/deeplens/src/apps/storybook/src/stories/atoms/MudraCoin.stories.tsx).
   - Completely purged `LegacyVsNewComparison` and generic `LuCoins`.

4. **Haute Couture Vayyari Logo Atom (`VayyariLogo`)**:
   - Sourced and deployed official gold emblem asset `packages/brand-assets/svg/vayyari-logo-gold-icon.svg`.
   - Created cross-platform atom [`VayyariLogo.tsx`](file:///home/krikan/productivity/deeplens/src/apps/storybook/src/components/atoms/VayyariLogo/VayyariLogo.tsx) supporting 4 variants (`horizontal`, `stacked`, `emblem`, `wordmark`) and 3 tone palettes (`dark`, `light`, `gold`).
   - Symlinked into [`src/store/src/components/atoms/VayyariLogo`](file:///home/krikan/productivity/deeplens/src/store/src/components/atoms/VayyariLogo).
   - Created mobile component [`VayyariLogoIcon.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/components/icons/VayyariLogoIcon.tsx).
   - Created rich Storybook suite [`VayyariLogo.stories.tsx`](file:///home/krikan/productivity/deeplens/src/apps/storybook/src/stories/atoms/VayyariLogo.stories.tsx) under `'Atoms/Vayyari Fashions Logo'`.

## Verification & Validation
- **Visual Verification**: Headless Google Chrome screenshots confirmed optical alignment on Storybook (`http://localhost:6006`).
- **Automated Tests**: All 12 unit tests in `tests/surveyAtoms.test.ts` passed cleanly.
- **Type Safety**: Clean TypeScript compilation (`npm run typecheck`) across `src/apps/storybook` and `src/store`.

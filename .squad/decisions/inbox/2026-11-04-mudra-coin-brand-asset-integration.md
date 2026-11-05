# Squad Decision: Mudra Coin Brand Asset & Vector Token Integration

- **Decision Owner**: Krishna (Squad Lead & Coordinator) & Viswakarma (Design System Specialist)
- **Date**: 2026-11-04
- **Status**: Accepted & Implemented
- **Subsystems**: Storybook, Store App, Store Prelaunch SPA, Admin Survey Framework, Vayyari Mobile

## 1. Context & Motivation
Previously, reward tokens, survey completion prizes, and wallet balances were represented using generic open-source icons (`LuCoins` from `react-icons/lu`). The executive design team provided an official brand Mudra Coin asset (`/home/krikan/Downloads/mudra icon.svg`) featuring a gold-lustre rim, radiant conic/diamond background sheen, and a central 4-loop knot emblem representing prosperity and traditional Indian handloom heritage.

## 2. Architectural Decisions

1. **Asset Normalization & Multi-App Distribution**:
   - Copied the master SVG asset to all project app asset roots:
     - `src/apps/storybook/assets/mudra-icon.svg`
     - `src/store/assets/mudra-icon.svg`
     - `src/vayyari/assets/images/mudra-icon.svg`
     - `src/experimental/storePrelaunch/public/assets/mudra-icon.svg`
   - Served on port 8085 as a static web asset (`/assets/mudra-icon.svg`).

2. **Cross-Platform Component (`MudraCoin` / `MudraCoinIcon`)**:
   - Created `MudraCoin` in `src/apps/storybook/src/components/atoms/MudraCoin/`:
     - **Web/DOM Mode**: Renders inline SVG with unique instance IDs (`useId()`) to eliminate DOM gradient ID collisions. Preserves exact Figma conic gradient sheen (`foreignObject` + CSS conic gradient).
     - **Native Mobile Mode**: Uses `react-native-svg` (`Svg`, `Defs`, `ClipPath`, `LinearGradient`, `RadialGradient`, `Path`, `G`) with native-safe radial gold fallback so it renders without crashes on Android/iOS.
     - **Props**: Supports customizable `size` (12px to 128px), `isPulsing`, and `isSpinning`.
   - Symlinked into `src/store/src/components/atoms/MudraCoin` for immediate store consumption.
   - Created mobile React Native icon `src/vayyari/components/icons/MudraCoinIcon.tsx`.
   - Created web component `MudraCoinIcon` in `src/experimental/storePrelaunch/src/components/Icons.tsx`.

3. **Survey & Admin Experience Upgrades**:
   - `SurveyMudrasBadge`: Vault and chip variants updated from `LuCoins` to `<MudraCoin size={16} />` and `<MudraCoin size={13} />`.
   - `SurveyCoverPage`: Cover page reward chip upgraded to `<MudraCoin size={20} isPulsing={true} />`.
   - `GoldVIPPassCard`: Digital VIP passport Mudra vault upgraded with `<MudraCoin size={18} isPulsing={true} />`.
   - `AdminSurveyBuilderPage`: Target survey reward pills and question bank points updated to `<MudraCoin />`.
   - `AdminSurveyQuestionsPage`: Question point rewards updated to `<MudraCoin size={12} />`.
   - `AdminSurveyResponsesPage`: Header average reward pill and response row reward tag updated to `<MudraCoin />`.
   - `AdminSurveyPreviewPage`: Live answers captured and simulated Mudras credit updated to `<MudraCoin />`.
   - `VIPPassModal` (Prelaunch): 700 Mudra Coins vault credit callout with `MudraCoinIcon`.

4. **Storybook Showcase**:
   - Added new Storybook story collection `Atoms/Currency/MudraCoin` with stories:
     - `Default` (Interactive size/pulse knobs)
     - `SizeSpectrum` (12px to 96px resolution ramp)
     - `BadgesAndPills` (Vault, chip, and ledger pill contexts)
     - `LegacyVsNewComparison` (Side-by-side legacy LuCoins vs new MudraCoin)
   - Updated `Atoms/Survey/Survey Atoms Collection` Section 5 with MudraCoin and SurveyMudrasBadge.

## 3. Verification & Compliance
- `npm run typecheck` in `src/apps/storybook`: Passed (0 errors).
- `npm run typecheck` in `src/store`: Passed (0 errors).
- `npm run build` in `src/experimental/storePrelaunch`: Passed (0 errors).
- `npx tsc --noEmit` in `src/vayyari`: Passed (0 errors).
- `npx tsx --test tests/surveyAtoms.test.ts`: 7/7 tests passing.
- Visual inspection via Headless Chrome on Storybook (port 6006): Pixel-perfect vector rendering confirmed.

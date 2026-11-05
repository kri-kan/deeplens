# Design Specification: Typeform Survey Atoms & Configurable Completion Screen

**Date:** 2026-11-02  
**Author:** Krishna (Squad Lead) & Vayyari UI Team  
**Status:** In Review / Ready for Plan  
**Scope:** Storybook Component Library (`src/apps/storybook`) & Vayyari Design System  

---

## 1. Intent and The Why

The Vayyari Typeform-style discovery journey currently features multiple atoms (milestone dots, progress bars, step capsules, mudra badges, back and next buttons, option tiles) and a rich cover page molecule (`SurveyCoverPage`). However, two key elements are missing from the design system:
1. **Freeform Text Input Atoms:** While multiple-choice grids and Likert scales exist, questions requiring single-line inputs (names, mobile numbers, city, gift codes) or multi-line responses (special styling requests, heritage preferences, feedback) lack standardized, theme-aware atomic components.
2. **Configurable Completion Screen Molecule:** While `SurveyCoverPage` cleanly handles the survey onboarding briefing, the survey conclusion is currently hardcoded in `TypeformSingleScreenContainer` directly to `GoldVIPPassCard`. We need a symmetrical `SurveyCompletionPage` molecule that provides a celebratory summary of the user's earned coins/Mudras, completion statistics, and customizable next steps (e.g., exploring the collection, viewing their VIP pass, or sharing referrals).

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- Create `SurveyTextInput`: A sleek, theme-aware single-line input atom supporting prefix tags (e.g., country codes), placeholder styling, error states, and keyboard submit hooks.
- Create `SurveyTextArea`: A multi-line textarea atom supporting auto/fixed minimum heights, character counters (`0 / 300`), helper text, and luxury focus rings.
- Create `SurveyCompletionPage`: A standalone molecule mirroring `SurveyCoverPage` that provides:
  - Header with brand crest.
  - Celebratory hero block with kicker, animated/gold victory icon, headline, and congratulatory message.
  - 3-chip stat briefing highlighting earned coins/Mudras (with pulse/glow), questions answered, and unlocked perks/tier.
  - Action footer with primary CTA, optional secondary action, and vault deposit reassurance.
- Ensure all 3 components support all 4 survey themes (`ivory-editorial`, `vayyari-dark`, `store-luxe`, `royal-burgundy`).
- Integrate the completion screen cleanly into `TypeformSingleScreenContainer` via configuration props.
- Provide comprehensive Storybook stories for isolated testing and responsive verification.

### Non-Goals
- Changing the backend API ingestion endpoint or database schemas (handled by backend DTOs).
- Altering the existing multiple-choice or swatch grid mechanics.

### Anti-Goals
- Bloating atoms with full question layouts (headers and kickers belong in molecules/organisms; atoms should be pure, composable inputs).
- Hardcoding coin rewards or completion actions inside the completion screen (must be fully configurable via props).

---

## 3. Constraints
- **Design System Consistency:** Must use Tamagui primitives (`YStack`, `XStack`, `Text`) and `SurveyThemeTokens` from `src/apps/storybook/src/components/organisms/TypeformSurvey/themeConfig.ts`.
- **Responsive Layout:** Must support mobile viewports (360px–440px) up to desktop viewports (960px) without layout distortion or horizontal scrollbars.
- **Cross-Platform Readiness:** Input fields must render reliably on web and mobile browsers (React Native Web compatibility).

---

## 4. Approaches Considered

### Approach 1: Symmetrical Atomic Primitives & Reusable Completion Molecule (Chosen)
- Deconstruct the problem into two focused atoms (`SurveyTextInput`, `SurveyTextArea`) and one symmetrical molecule (`SurveyCompletionPage`).
- **Pros:** Preserves atomic design hierarchy; enables independent reuse across other checkout and onboarding flows; symmetrical with `SurveyCoverPage`; facilitates automated visual regression and Storybook testing.
- **Cons:** Requires creating 3 distinct component directories and corresponding story files.

### Approach 2: Monolithic Form Organism & Hardcoded Container Finish
- Bundle text inputs and textareas into an all-in-one organism, and inject the completion UI directly into `TypeformSingleScreenContainer`.
- **Pros:** Fewer files created upfront.
- **Cons:** Violates reusability; prevents using the textarea independently (e.g., for customer feedback outside surveys); makes testing completion state cumbersome.

**Decision:** Approach 1 was selected for its modularity, aesthetic symmetry, and strict adherence to DeepLens UI architecture standards.

---

## 5. Component Specifications & Interfaces

### 5.1 `SurveyTextInput` (Atom)
**Path:** `src/apps/storybook/src/components/atoms/SurveyTextInput/`

```typescript
export interface SurveyTextInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  prefix?: string | React.ReactNode;
  suffix?: React.ReactNode;
  inputType?: 'text' | 'tel' | 'email' | 'number';
  maxLength?: number;
  isValid?: boolean;
  isError?: boolean;
  errorMessage?: string;
  helperText?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onEnterPress?: () => void;
  theme: SurveyThemeTokens;
  style?: React.CSSProperties;
}
```
**Visual Behavior:**
- Underline / floating border: 1.5px subtle border resting state, transitioning to 2px `theme.kickerColor` (gold) on focus.
- Error state: `#ef4444` border and caption.
- Valid state: Optional subtle checkmark or gold indicator.
- Font: Clean, legible sans-serif with luxury letter spacing.

---

### 5.2 `SurveyTextArea` (Atom)
**Path:** `src/apps/storybook/src/components/atoms/SurveyTextArea/`

```typescript
export interface SurveyTextAreaProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  rows?: number; // Default: 4
  minHeight?: number; // Default: 110
  maxLength?: number; // e.g. 300
  showCharCount?: boolean;
  isError?: boolean;
  errorMessage?: string;
  helperText?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  theme: SurveyThemeTokens;
  style?: React.CSSProperties;
}
```
**Visual Behavior:**
- Rounded container (border-radius 12px) with `theme.surfaceColor` background and `theme.surfaceBorder`.
- Highlights with `theme.kickerColor` ring on focus.
- Bottom-right character counter indicator: `${value.length} / ${maxLength}` in `theme.textMuted`.

---

### 5.3 `SurveyCompletionPage` (Molecule)
**Path:** `src/apps/storybook/src/components/molecules/SurveyCompletionPage/`

```typescript
export interface SurveyCompletionPageProps {
  brandName?: string;
  optionalHeading?: string;
  kicker?: string; // e.g. "TASTE PROFILE UNLOCKED"
  title?: string; // e.g. "You're All Set!"
  description?: string; // e.g. "We've curated your signature festive edits..."
  earnedMudras: number; // e.g. 700
  coinsLabel?: string; // Default: "Mudras Banked"
  questionsAnswered?: number; // e.g. 4
  totalQuestions?: number; // e.g. 4
  perkTitle?: string; // e.g. "Gold VIP Status"
  perkSubtitle?: string; // e.g. "Unlocked"
  primaryCtaLabel?: string; // e.g. "Explore Curated Edits"
  onPrimaryCta: () => void;
  secondaryCtaLabel?: string; // e.g. "View VIP Pass & Share"
  onSecondaryCta?: () => void;
  guaranteeText?: string; // e.g. "Rewards deposited to your Vayyari Vault."
  theme: SurveyThemeTokens;
  maxWidth?: number | string; // Default: 440
}
```
**Visual Layout (Symmetrical to `SurveyCoverPage`):**
1. **Header Row:** `SurveyBrandCrest` + celebratory status badge (e.g. "Verified Discovery").
2. **Celebratory Hero Block:**
   - Gold kicker (`SurveyQuestionKicker`).
   - Celebratory visual badge (Circular gold crest with sparkle/check icon).
   - Headline (`fontSize: 24`, `fontWeight: 800`).
   - Description text.
3. **Stat Summary Row (3 Chips):**
   - Chip 1 (Rewards): `+700 Mudras` with `LuCoins` in highlighted gold surface.
   - Chip 2 (Progress): `4 / 4 Completed` with `LuClipboardCheck`.
   - Chip 3 (Perk): `Gold VIP Status` with `LuCrown`.
4. **Action Area:**
   - Primary high-emphasis CTA button with chevron icon.
   - Optional secondary outlined/ghost button.
   - Trust/reassurance text with lock/shield icon.

---

### 5.4 Integration in `TypeformSingleScreenContainer`
Add configuration options:
- `showCompletionPage?: boolean` (default: true).
- `completionKicker?: string`.
- `completionTitle?: string`.
- `completionDescription?: string`.
- `onCompleteAction?: (type: 'explore' | 'pass', answers: any) => void`.
- When the final question is answered, the container transitions smoothly to `SurveyCompletionPage`. Clicking secondary CTA can toggle the `GoldVIPPassCard` modal.

---

## 6. Resolved Builder Decisions (Architectural Calls)

1. **Secondary CTA & VIP Pass Modal Flow:**
   - On `SurveyCompletionPage`, `onSecondaryCta` is an optional callback.
   - In `TypeformSingleScreenContainer`, clicking the secondary CTA ("View VIP Pass & Share") opens the `GoldVIPPassCard` inside a sleek Tamagui modal overlay with a gold close button, while also dispatching `onCompleteAction?.('pass', answers)`.
2. **Lifecycle & Completion Persistence:**
   - As soon as the final question is answered, `onComplete(answers)` is fired immediately so answers are recorded and rewards are banked.
   - The container smoothly transitions to `SurveyCompletionPage`.
   - Clicking the primary CTA ("Explore Curated Edits") invokes `onCompleteAction?.('explore', answers)`.
   - If `showCompletionPage: false` is explicitly configured, the container falls back to rendering the inline `GoldVIPPassCard` for backward compatibility.
3. **Atom Adoption & Refactoring:**
   - `SurveyTextInput` and `SurveyTextArea` are created as pure, theme-aware atomic components in `src/apps/storybook/src/components/atoms/`.
   - To prevent regressions, `TypeformTextInput` is refactored to consume `SurveyTextInput` internally, standardizing focus rings, styling, and animations across Step 3 and future freeform steps.
4. **Multilingual Support for Completion Screen:**
   - `SurveyCompletionPage` accepts standard localized text strings.
   - In `TypeformSingleScreenContainer`, localized copy for the completion screen is provided across English, Telugu, and Hindi matching the cover page and question steps.

---

## 7. What's Left to the Builder
- Exact micro-interaction animation timings (e.g. 200ms ease-out transitions).
- Storybook story variations showcasing all 4 theme palettes and edge cases (e.g. 0 coins, long text input, max character overflow).
- Re-exporting index files for clean imports across packages.

# Typeform Survey Atoms & Configurable Completion Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement theme-aware `SurveyTextInput` and `SurveyTextArea` atoms, refactor `TypeformTextInput` for atomic consistency, build a configurable `SurveyCompletionPage` molecule that mirrors `SurveyCoverPage` with coin celebration and stat chips, and integrate the completion flow with a VIP Pass modal into `TypeformSingleScreenContainer`.

**Architecture:** Deconstruct freeform survey inputs into pure, theme-aware atomic components with Tamagui primitives and React Native Web compatibility; construct a symmetrical `SurveyCompletionPage` molecule displaying brand crest, celebration hero, 3-stat summary chips (earned Mudras, completed questions, unlocked perks), and configurable CTAs across all 4 Vayyari luxury themes; integrate into the single-screen sequencer with immediate answer persistence and overlay modal for the Gold VIP Pass.

**Tech Stack:** React 19, React Native Web, Tamagui (`YStack`, `XStack`, `Text`), Lucide Icons (`react-icons/lu`), TypeScript 6, Storybook 10.

**Spec:** [`docs/superpowers/specs/2026-11-02-survey-atoms-and-completion-screen-design.md`](file:///home/krikan/productivity/deeplens/docs/superpowers/specs/2026-11-02-survey-atoms-and-completion-screen-design.md)

---

## Global Constraints

- **Strict C#/TypeScript camelCase property matching:** All DTO and callback names must use exact camelCase (`earnedMudras`, `questionsAnswered`, `totalQuestions`, `onCompleteAction`).
- **Theme Token Adherence:** All components must derive colors exclusively from `SurveyThemeTokens` (`backgroundColor`, `surfaceColor`, `surfaceBorder`, `kickerColor`, `textHeading`, `textMuted`, `primaryButtonBg`, etc.).
- **Responsive Viewport Support:** Container layout must scale cleanly from mobile (360px–440px) to desktop (960px) without horizontal overflow or clipping.
- **Expo/Storybook Port Rule:** Storybook web runs on port 6006 (`EXPO_PUBLIC_STORYBOOK_ENABLED=true expo start --web --port 6006`); prelaunch service remains isolated on port 8085.
- **Type Safety:** `npm --prefix src/apps/storybook run typecheck` (`tsc --noEmit`) must pass with 0 errors after each task.

---

## Review Focus

1. **Character Limit & Overflow Clamping:** User enters text exceeding `maxLength` in `SurveyTextArea` or `SurveyTextInput`; character count must turn red or clamp without distorting the layout.
2. **Keyboard Return Handling (`Enter`):** User presses `Enter` on `SurveyTextInput`; triggers `onEnterPress` without submitting unwanted newlines or reloading the page.
3. **Empty / Zero Coin Edge Case:** Survey completes with 0 earned Mudras (or rewards disabled); `SurveyCompletionPage` must gracefully render `0 Mudras` or omit the rewards chip without NaN/falsy UI glitches.
4. **Modal Layering & Backdrop Scrim:** Secondary CTA on `SurveyCompletionPage` opens `GoldVIPPassCard` modal; backdrop must blur/dim the background, prevent scroll-bleed, and dismiss cleanly on close button click.
5. **Theme Switching Fidelity:** All atoms and completion screen elements must re-theme dynamically when toggled across all 4 themes (`ivory-editorial`, `vayyari-dark`, `store-luxe`, `royal-burgundy`).

---

### Task 1: Create `SurveyTextInput` Atom

**Files:**
- Create: `src/apps/storybook/src/components/atoms/SurveyTextInput/SurveyTextInput.tsx`
- Create: `src/apps/storybook/src/components/atoms/SurveyTextInput/index.ts`
- Modify: `src/apps/storybook/src/stories/atoms/SurveyAtoms.stories.tsx`

**Interfaces:**
- Produces: `SurveyTextInputProps`, `SurveyTextInput`
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

- [ ] **Step 1: Write type and interface definition for `SurveyTextInput`**
Create `src/apps/storybook/src/components/atoms/SurveyTextInput/SurveyTextInput.tsx` with export of `SurveyTextInputProps` and component implementation using Tamagui `YStack`, `XStack`, `Text`, and HTML `<input>`. Include floating underline/border transition, prefix/suffix handling, and focus/error states.

- [ ] **Step 2: Create index re-export**
Create `src/apps/storybook/src/components/atoms/SurveyTextInput/index.ts` exporting `SurveyTextInput` and `SurveyTextInputProps`.

- [ ] **Step 3: Add `SurveyTextInput` showcase to `SurveyAtoms.stories.tsx`**
Import `SurveyTextInput` into `src/apps/storybook/src/stories/atoms/SurveyAtoms.stories.tsx` and render interactive single-line inputs (standard text, telephone with `🇮🇳 +91` prefix, error state, and valid checkmark).

- [ ] **Step 4: Verify typecheck**
Run: `npm --prefix src/apps/storybook run typecheck`
Expected: 0 errors.

---

### Task 2: Create `SurveyTextArea` Atom

**Files:**
- Create: `src/apps/storybook/src/components/atoms/SurveyTextArea/SurveyTextArea.tsx`
- Create: `src/apps/storybook/src/components/atoms/SurveyTextArea/index.ts`
- Modify: `src/apps/storybook/src/stories/atoms/SurveyAtoms.stories.tsx`

**Interfaces:**
- Produces: `SurveyTextAreaProps`, `SurveyTextArea`
```typescript
export interface SurveyTextAreaProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  rows?: number;
  minHeight?: number;
  maxLength?: number;
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

- [ ] **Step 1: Implement `SurveyTextArea` component**
Create `src/apps/storybook/src/components/atoms/SurveyTextArea/SurveyTextArea.tsx` with Tamagui container, 12px rounded borders, subtle surface background, focus border highlight (`theme.kickerColor`), `<textarea>` element, and dynamic character counter (`${value.length} / ${maxLength}`).

- [ ] **Step 2: Create index re-export**
Create `src/apps/storybook/src/components/atoms/SurveyTextArea/index.ts` exporting `SurveyTextArea` and `SurveyTextAreaProps`.

- [ ] **Step 3: Add `SurveyTextArea` showcase to `SurveyAtoms.stories.tsx`**
Add interactive text area section to `SurveyAtoms.stories.tsx` demonstrating regular feedback capture, character counter updating on typing, and error message state.

- [ ] **Step 4: Verify typecheck**
Run: `npm --prefix src/apps/storybook run typecheck`
Expected: 0 errors.

---

### Task 3: Refactor `TypeformTextInput` to Consume `SurveyTextInput`

**Files:**
- Modify: `src/apps/storybook/src/components/organisms/TypeformSurvey/TypeformTextInput.tsx`

**Interfaces:**
- Consumes: `SurveyTextInput` from `../../atoms/SurveyTextInput`
- Produces: `TypeformTextInput` with preserved prop signature (`questionNumber`, `title`, `description`, `placeholder`, `value`, `onChange`, `inputType`, `prefix`, `helperText`, `validationError`, `isValid`, `onEnterPress`).

- [ ] **Step 1: Refactor `TypeformTextInput.tsx` to wrap `SurveyTextInput`**
Update `TypeformTextInput.tsx` to keep the question header structure while delegating the underlying text field to `SurveyTextInput`, maintaining default gold theme tokens.

- [ ] **Step 2: Verify typecheck**
Run: `npm --prefix src/apps/storybook run typecheck`
Expected: 0 errors.

---

### Task 4: Create `SurveyCompletionPage` Molecule

**Files:**
- Create: `src/apps/storybook/src/components/molecules/SurveyCompletionPage/SurveyCompletionPage.tsx`
- Create: `src/apps/storybook/src/components/molecules/SurveyCompletionPage/index.ts`
- Create: `src/apps/storybook/src/stories/molecules/SurveyCompletionPage.stories.tsx`

**Interfaces:**
- Produces: `SurveyCompletionPageProps`, `SurveyCompletionPage`
```typescript
export interface SurveyCompletionPageProps {
  brandName?: string;
  optionalHeading?: string;
  statusBadgeText?: string;
  kicker?: string;
  title?: string;
  description?: string;
  earnedMudras: number;
  coinsLabel?: string;
  questionsAnswered?: number;
  totalQuestions?: number;
  perkTitle?: string;
  perkSubtitle?: string;
  primaryCtaLabel?: string;
  onPrimaryCta: () => void;
  secondaryCtaLabel?: string;
  onSecondaryCta?: () => void;
  guaranteeText?: string;
  theme: SurveyThemeTokens;
  maxWidth?: number | string;
}
```

- [ ] **Step 1: Implement `SurveyCompletionPage` component**
Create `src/apps/storybook/src/components/molecules/SurveyCompletionPage/SurveyCompletionPage.tsx` mirroring `SurveyCoverPage` layout:
1. Header: `SurveyBrandCrest` and verified/celebration pill.
2. Hero: Centered gold kicker, circular celebratory gold crest with `LuSparkles`, main headline, and personalized description.
3. 3-Stat Briefing:
   - Mudras Vault Chip: highlighted gold container with `LuCoins` and `+${earnedMudras} Mudras`.
   - Questions Chip: `LuClipboardCheck` and `${questionsAnswered} / ${totalQuestions} Steps`.
   - Perk Chip: `LuCrown` and `${perkTitle}` / `${perkSubtitle}`.
4. Action CTA: Primary button with `LuChevronRight`, optional secondary button, and lock/privacy assurance.

- [ ] **Step 2: Create index re-export**
Create `src/apps/storybook/src/components/molecules/SurveyCompletionPage/index.ts`.

- [ ] **Step 3: Create Storybook stories for `SurveyCompletionPage`**
Create `src/apps/storybook/src/stories/molecules/SurveyCompletionPage.stories.tsx` demonstrating:
- Default Ivory Editorial theme.
- Vayyari Dark theme.
- Store Luxe theme.
- Royal Burgundy theme.
- Interactive actions (triggering alerts or state updates on button presses).

- [ ] **Step 4: Verify typecheck**
Run: `npm --prefix src/apps/storybook run typecheck`
Expected: 0 errors.

---

### Task 5: Integrate Completion Page & VIP Pass Modal into `TypeformSingleScreenContainer`

**Files:**
- Modify: `src/apps/storybook/src/components/organisms/TypeformSurvey/TypeformSingleScreenContainer.tsx`
- Modify: `src/apps/storybook/src/stories/organisms/TypeformSurveyComponents.stories.tsx`

**Interfaces:**
- Consumes: `SurveyCompletionPage` from `../../molecules/SurveyCompletionPage`
- Produces: Updated `TypeformSingleScreenContainer` supporting `showCompletionPage?: boolean`, `completionTitle?: string`, `completionDescription?: string`, `onCompleteAction?: (type: 'explore' | 'pass', answers: any) => void`.

- [ ] **Step 1: Add completion props and state to `TypeformSingleScreenContainer.tsx`**
1. Add props: `showCompletionPage = true`, `completionTitle`, `completionDescription`, `onCompleteAction`.
2. Add modal state: `showPassModal: boolean`.
3. In `handleFinish`, immediately call `onComplete?.(collectedAnswers)` and set `isFinished = true`.
4. If `showCompletionPage` is true, render `SurveyCompletionPage` with:
   - `earnedMudras={hasRewards ? surveyTotalMudras : 0}`
   - `questionsAnswered={TOTAL_STEPS}`
   - `onPrimaryCta={() => onCompleteAction?.('explore', collectedAnswers)}`
   - `onSecondaryCta={() => { setShowPassModal(true); onCompleteAction?.('pass', collectedAnswers); }}`
5. If `showPassModal` is true, render a modal overlay wrapping `GoldVIPPassCard` with a close button and backdrop scrim.
6. If `showCompletionPage: false`, maintain legacy inline `GoldVIPPassCard` display.

- [ ] **Step 2: Update `TypeformSurveyComponents.stories.tsx` with Completion Screen Story**
Add a dedicated story showcasing the full interactive survey finishing directly on `SurveyCompletionPage`, with secondary CTA opening the `GoldVIPPassCard` modal.

- [ ] **Step 3: Verify full typecheck**
Run: `npm --prefix src/apps/storybook run typecheck`
Expected: 0 errors.

---

### Task 6: Visual and Interactive Verification

**Files:**
- Verify: Storybook builds and TypeScript compiles cleanly across all packages.

- [ ] **Step 1: Run comprehensive typecheck**
Run: `npm --prefix src/apps/storybook run typecheck`
Expected: Clean pass with 0 errors.

- [ ] **Step 2: Run root tests**
Run: `npm test`
Expected: All tests pass.

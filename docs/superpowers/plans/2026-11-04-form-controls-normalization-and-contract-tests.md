# Form Controls Normalization & Contract Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate fragmented external UI control dependencies (`react-native-paper` and raw React Native `<Switch>`) by creating and enhancing canonical Tamagui design system atoms (`ToggleSwitch`, `RadioButton`, `CustomCheckbox`, `SegmentedControl`), migrating existing app screens to these atoms, and implementing a rigorous contract & interaction test suite for form controls.

**Architecture:** 
1. Enhance the newly created `ToggleSwitch` atom with `value` and `onValueChange` aliases so it acts as an ergonomic, drop-in replacement for any React Native / Paper switch. Migrate all 8 remaining raw RN / Paper switches.
2. Build a first-class `RadioButton` atom and barrel export in both Storybook and Mobile design system catalogs, complete with CSF stories and accessibility (`role="radio"`). Migrate Paper `RadioButton` usages.
3. Enhance `CustomCheckbox` with `disabled` state handling and optional inline `label` support with Tamagui layout, then migrate Paper `Checkbox` usages.
4. Enhance `SegmentedControl` to accept `buttons` and `value`/`onValueChange` aliases, migrating Paper `SegmentedButtons` usages.
5. Expand the test suite in `tests/formControls.test.ts` and `src/vayyari/tests/formControls.test.ts` with automated contract and logic tests, verifying all migrations, accessibility roles, and state machines without test bloat.

**Tech Stack:** React Native, Tamagui, TypeScript, Node.js Test Runner (`node:test`, `node:assert/strict`), Storybook CSF 3.0.

**Spec:** Direct user directive:
- "review what we are depending on external libraries and normalise them either to our components or create one if needed"
- "do we have test cases for all our components... let's do that" (adopting the 4-layer design system testing strategy focusing on interaction/contract tests for form controls and leaving visual inspection to Storybook).

## Global Constraints

- **Expo Packager Rule:** The Expo packager for Vayyari (`src/vayyari`) runs continuously in tmux session `expo` on port 8081 via `vayyari-expo.service`. Do NOT run `npx expo start` manually. Reload via `tmux send-keys -t expo r C-m`.
- **Prelaunch Web App Rule:** The prelaunch SPA runs in tmux session `prelaunch` on port 8085 via `vayyari-prelaunch.service`. Do NOT run `npm run dev` or `vite` on port 8085.
- **Storybook Service:** Storybook runs on port 6006. Verify stories via Chrome DevTools Protocol (CDP) and headless browser screenshots when needed.
- **Testing Rigor:** All automated tests must run and pass via both `npm test tests/formControls.test.ts` (root) and `npm --prefix src/vayyari test` (all 334+ tests passing).
- **TypeScript Integrity:** Zero type errors (`npm --prefix src/apps/storybook run typecheck` and `npm --prefix src/vayyari run typecheck`).

## Review Focus

1. **State Machine Integrity:** Verify controlled vs. uncontrolled state handling in `ToggleSwitch`, `RadioButton`, and `CustomCheckbox`.
2. **Disabled State Guards:** Verify that `disabled={true}` strictly prevents user interaction and suppresses callback dispatch across all form controls.
3. **Accessibility Roles & ARIA:** Guarantee `accessibilityRole="switch"`, `accessibilityRole="radio"`, `accessibilityRole="checkbox"`, and `role="tablist"`/`accessibilityRole="tab"` are correctly set.
4. **Visual Rhythm & Tokens:** Ensure custom controls consume Tamagui theme tokens (`tokens.accent`, `tokens.border`, `tokens.surface`, `tokens.text`) so they adapt seamlessly to light and dark themes.
5. **Zero External Switch Leaks:** Ensure no active screen retains raw `import { Switch } from 'react-native'` or `import { Switch } from 'react-native-paper'`.

---

### Task 1: Enhance `ToggleSwitch` with Drop-In Compatibility & Migrate Remaining Switches

**Files:**
- Modify: `src/apps/storybook/src/components/atoms/ToggleSwitch/ToggleSwitch.tsx`
- Modify: `src/vayyari/components/tamagui-ui/atoms/ToggleSwitch/ToggleSwitch.tsx`
- Modify: `src/vayyari/app/utilities/instagram/story-planner/index.tsx`
- Modify: `src/vayyari/app/utilities/instagram/settings.tsx`
- Modify: `src/vayyari/components/utility/instagram/SettingsModal.tsx`
- Modify: `src/vayyari/components/utility/customer/AddressFormComponent.tsx`
- Modify: `src/vayyari/components/utility/instagram/CompetitorProfileItem.tsx`
- Modify: `src/vayyari/components/utility/instagram/InstagramPostDetailItem.tsx`
- Modify: `src/vayyari/components/utility/instagram/MetaConfigEditorDialog.tsx`
- Modify: `src/vayyari/app/utilities/customer/[id].tsx`
- Test: `tests/formControls.test.ts` & `src/vayyari/tests/formControls.test.ts`

- [ ] **Step 1: Write contract tests for drop-in `value` / `onValueChange` aliases and switch migrations**
  Add test assertions in `tests/formControls.test.ts` checking:
  - `ToggleSwitch` handles `value` and `onValueChange` aliases.
  - The 8 files no longer import `Switch` from `react-native` or `react-native-paper`.
  Run test: `npm test tests/formControls.test.ts` (fails before migration).

- [ ] **Step 2: Add drop-in aliases to `ToggleSwitch.tsx` in Storybook and Vayyari**
  In both `src/apps/storybook/src/components/atoms/ToggleSwitch/ToggleSwitch.tsx` and `src/vayyari/components/tamagui-ui/atoms/ToggleSwitch/ToggleSwitch.tsx`:
  - Add `value?: boolean` to `ToggleSwitchProps`.
  - Add `onValueChange?: (val: boolean) => void` to `ToggleSwitchProps`.
  - Resolve effective value: `const effectiveChecked = controlledChecked !== undefined ? controlledChecked : value;`.
  - On toggle dispatch both `onCheckedChange?.(next)` and `onValueChange?.(next)`.

- [ ] **Step 3: Migrate all 8 files from raw / Paper Switch to `ToggleSwitch`**
  - `src/vayyari/app/utilities/instagram/story-planner/index.tsx`: Replace raw RN `Switch` + scale transform with `<ToggleSwitch size="sm" checked={!hideGroups} onCheckedChange={(val) => setHideGroups(!val)} />`.
  - `src/vayyari/app/utilities/instagram/settings.tsx`: Replace Paper `Switch` with `ToggleSwitch`.
  - `src/vayyari/components/utility/instagram/SettingsModal.tsx`: Replace Paper `Switch` with `ToggleSwitch`.
  - `src/vayyari/components/utility/customer/AddressFormComponent.tsx`: Replace Paper `Switch` with `ToggleSwitch`.
  - `src/vayyari/components/utility/instagram/CompetitorProfileItem.tsx`: Replace Paper `Switch` with `ToggleSwitch`.
  - `src/vayyari/components/utility/instagram/InstagramPostDetailItem.tsx`: Replace Paper `Switch` with `ToggleSwitch`.
  - `src/vayyari/components/utility/instagram/MetaConfigEditorDialog.tsx`: Replace Paper `Switch` with `ToggleSwitch`.
  - `src/vayyari/app/utilities/customer/[id].tsx`: Replace Paper `Switch` with `ToggleSwitch`.

- [ ] **Step 4: Verify tests and typechecking**
  - Run `npm test tests/formControls.test.ts`.
  - Run `npm --prefix src/vayyari test`.
  - Run `npm --prefix src/vayyari run typecheck`.

---

### Task 2: Build Canonical `RadioButton` Atom in Storybook & Mobile, and Migrate Paper RadioButton Usages

**Files:**
- Create: `src/apps/storybook/src/components/atoms/RadioButton/RadioButton.tsx`
- Create: `src/apps/storybook/src/components/atoms/RadioButton/index.ts`
- Create: `src/apps/storybook/src/stories/atoms/RadioButton.stories.tsx`
- Create: `src/vayyari/components/tamagui-ui/atoms/RadioButton/RadioButton.tsx`
- Create: `src/vayyari/components/tamagui-ui/atoms/RadioButton/index.ts`
- Modify: `src/vayyari/components/utility/instagram/InstagramAccountPicker.tsx`
- Modify: `src/vayyari/components/logistics/ItemReassignModal.tsx`
- Test: `tests/formControls.test.ts` & `src/vayyari/tests/formControls.test.ts`

- [ ] **Step 1: Write contract tests for `RadioButton` atom**
  In `tests/formControls.test.ts`:
  - Assert existence of `RadioButton` atom in Storybook and Mobile.
  - Assert `RadioButton` handles `checked`, `status` ('checked' | 'unchecked'), `disabled`, `onPress`, `value`.
  - Assert `accessibilityRole="radio"` and `accessibilityState={{ checked, disabled }}`.
  - Assert `InstagramAccountPicker` and `ItemReassignModal` import `RadioButton` from `@/components/tamagui-ui/atoms/RadioButton` and not `react-native-paper`.
  Run test: `npm test tests/formControls.test.ts` (fails before creation).

- [ ] **Step 2: Implement `RadioButton` atom in Storybook and Mobile**
  - Outer ring: `size` (default 20px), border 2px, radius full.
  - Inner dot: `size - 8` (12px), radius full, filled when checked.
  - Theming: Uses `tokens.accent`, `tokens.border`, `tokens.surfaceRaised`.
  - Optional `label` with `XStack` and proper hitSlop.
  - Create barrel exports in `src/apps/storybook/src/components/atoms/RadioButton/index.ts` and `src/vayyari/components/tamagui-ui/atoms/RadioButton/index.ts`.

- [ ] **Step 3: Create Storybook stories for `RadioButton`**
  - `src/apps/storybook/src/stories/atoms/RadioButton.stories.tsx` with stories:
    - `Default` (Interactive state toggle)
    - `RadioGroup` (Multiple options showing single-selection behavior)
    - `DisabledStates` (Checked disabled, unchecked disabled)
    - `CustomSizes` (16px, 20px, 24px)

- [ ] **Step 4: Migrate `InstagramAccountPicker` and `ItemReassignModal`**
  - Replace Paper `RadioButton` in `InstagramAccountPicker.tsx` with `<RadioButton status={isSelected ? 'checked' : 'unchecked'} onPress={() => onSelectAccount(acc)} />`.
  - Replace Paper `RadioButton` in `ItemReassignModal.tsx` with `<RadioButton status={isSelected ? 'checked' : 'unchecked'} onPress={() => ...} />`.

- [ ] **Step 5: Verify tests and typechecking**
  - Run `npm test tests/formControls.test.ts`.
  - Run `npm --prefix src/apps/storybook run typecheck`.
  - Run `npm --prefix src/vayyari test`.

---

### Task 3: Enhance `CustomCheckbox` with Disabled & Label Props, and Migrate Paper Checkboxes

**Files:**
- Modify: `src/apps/storybook/src/components/atoms/CustomCheckbox/CustomCheckbox.tsx`
- Modify: `src/vayyari/components/tamagui-ui/atoms/CustomCheckbox/CustomCheckbox.tsx`
- Modify: `src/vayyari/components/utility/customer/ManageAddressModal.tsx`
- Modify: `src/vayyari/components/utility/product/FilterDrawer.tsx`
- Modify: `src/vayyari/app/utilities/instagram/story-planner/sharing.tsx`
- Modify: `src/vayyari/app/utilities/whatsapp/failed-enrichments.tsx`
- Test: `tests/formControls.test.ts` & `src/vayyari/tests/formControls.test.ts`

- [ ] **Step 1: Write contract tests for enhanced `CustomCheckbox`**
  In `tests/formControls.test.ts`:
  - Assert `CustomCheckbox` supports `disabled?: boolean`, `label?: string`, and `status?: 'checked' | 'unchecked' | 'indeterminate'`.
  - Assert disabled checkbox ignores `onToggle` / `onPress`.
  - Assert migrated files import `CustomCheckbox` from `@/components/tamagui-ui/atoms/CustomCheckbox`.
  Run test: `npm test tests/formControls.test.ts` (fails).

- [ ] **Step 2: Update `CustomCheckbox.tsx` in Storybook and Mobile**
  - Add `disabled?: boolean`, `label?: string`, `status?: 'checked' | 'unchecked'`, `testID?: string`.
  - Add disabled styling (opacity 0.45).
  - Wrap in `XStack` when `label` is provided with accessible label binding.

- [ ] **Step 3: Migrate Paper Checkbox in screens**
  - `src/vayyari/components/utility/customer/ManageAddressModal.tsx`: Replace Paper `Checkbox` with `CustomCheckbox`.
  - `src/vayyari/components/utility/product/FilterDrawer.tsx`: Replace Paper `Checkbox` with `CustomCheckbox`.
  - `src/vayyari/app/utilities/instagram/story-planner/sharing.tsx`: Replace Paper `Checkbox` with `CustomCheckbox`.
  - `src/vayyari/app/utilities/whatsapp/failed-enrichments.tsx`: Replace Paper `Checkbox` with `CustomCheckbox`.

- [ ] **Step 4: Verify tests and typechecking**
  - Run `npm test tests/formControls.test.ts`.
  - Run `npm --prefix src/vayyari test`.
  - Run `npm --prefix src/vayyari run typecheck`.

---

### Task 4: Normalize `SegmentedButtons` to Canonical `SegmentedControl` Atom

**Files:**
- Modify: `src/apps/storybook/src/components/atoms/SegmentedControl/SegmentedControl.tsx`
- Modify: `src/vayyari/components/tamagui-ui/atoms/SegmentedControl/SegmentedControl.tsx`
- Modify: `src/vayyari/app/utilities/instagram/settings.tsx`
- Modify: `src/vayyari/components/utility/instagram/SettingsModal.tsx`
- Modify: `src/vayyari/components/order/FinancialsSummaryCard.tsx`
- Modify: `src/vayyari/components/order/ExistingOrderAutocomplete.tsx`
- Modify: `src/vayyari/components/utility/instagram/ControlCenter.tsx`
- Modify: `src/vayyari/app/utilities/instagram/queue.tsx`
- Test: `tests/formControls.test.ts` & `src/vayyari/tests/formControls.test.ts`

- [ ] **Step 1: Write contract tests for `SegmentedControl` aliases**
  In `tests/formControls.test.ts`:
  - Assert `SegmentedControl` accepts `buttons` (`{ value: string, label: string }[]`) as an alias for `options` (`{ id: string, label: string }[]`).
  - Assert `SegmentedControl` accepts `value` and `onValueChange` aliases for `activeId` and `onChange`.
  - Assert target files import `SegmentedControl` from our atoms.
  Run test: `npm test tests/formControls.test.ts`.

- [ ] **Step 2: Update `SegmentedControl.tsx` in Storybook and Mobile**
  - Normalize options: `const normalizedOptions = options ?? (buttons ? buttons.map(b => ({ id: b.value, label: b.label, badge: (b as any).badge })) : []);`.
  - Normalize active selection: `const currentActive = activeId ?? value ?? '';`.
  - Normalize change handler: dispatch both `onChange?.(id)` and `onValueChange?.(id)`.

- [ ] **Step 3: Migrate screens to `SegmentedControl`**
  - `src/vayyari/app/utilities/instagram/settings.tsx`
  - `src/vayyari/components/utility/instagram/SettingsModal.tsx`
  - `src/vayyari/components/order/FinancialsSummaryCard.tsx`
  - `src/vayyari/components/order/ExistingOrderAutocomplete.tsx`
  - `src/vayyari/components/utility/instagram/ControlCenter.tsx`
  - `src/vayyari/app/utilities/instagram/queue.tsx`

- [ ] **Step 4: Verify tests and typechecking**
  - Run `npm test tests/formControls.test.ts`.
  - Run `npm --prefix src/vayyari test`.
  - Run `npm --prefix src/vayyari run typecheck`.

---

### Task 5: Final Review, Storybook Visual Verification & Session Sign-Off

**Files:**
- Sync: `tests/formControls.test.ts` -> `src/vayyari/tests/formControls.test.ts`
- Decision Record: `.squad/decisions/inbox/2026-11-04-form-controls-normalization-and-contract-tests.md`

- [ ] **Step 1: Synchronize and run complete test suite**
  - Run `npm test tests/formControls.test.ts`.
  - Run `npm --prefix src/vayyari test`.
  - Confirm all 334+ tests pass with zero failures.

- [ ] **Step 2: Verify Storybook visual state**
  - Reload Storybook if needed and verify new `RadioButton` and updated atoms in browser.

- [ ] **Step 3: Record architectural decision**
  - Record the normalization of external UI controls to Tamagui atoms and the 4-layer design system testing approach in `.squad/decisions/inbox/2026-11-04-form-controls-normalization-and-contract-tests.md`.

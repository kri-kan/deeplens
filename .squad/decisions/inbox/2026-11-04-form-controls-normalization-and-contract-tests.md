# Decision: Form Controls Normalization to Canonical Tamagui Atoms & Contract Test Strategy

- **Date**: 2026-11-04
- **Author**: Krishna (Squad Lead) & Viswakarma (Design Specialist) & Abhimanyu (Testing Specialist)
- **Status**: Accepted
- **Subsystem**: Mobile App / Storybook Design System (`src/vayyari`, `src/apps/storybook`, `tests/`)

## Context
1. **Third-Party Control Fragility**: Active screens previously imported interactive controls directly from `react-native-paper` (`Switch`, `RadioButton`, `SegmentedButtons`, `Checkbox`) or raw React Native (`Switch`). This introduced Material 2 vs Material 3 visual clashes, broken proportions (e.g., $14\text{px}$ track polyfills on web), and cumbersome hacks (e.g. `transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }]`).
2. **Storybook Addon Malformations**: `@storybook/addon-ondevice-controls` bypassed design tokens by using raw web polyfills, resulting in misaligned table rows, clipped switch thumbs, and unstyled dropdowns.
3. **Component Test Strategy Clarification**: Striving for 100% unit test coverage across 160+ visual atoms creates brittle snapshot fatigue and trivial assertions without preventing visual regressions. A pragmatic, 4-layer design system testing pyramid was adopted instead.

## Decisions Made

1. **Global Storybook Addon Override Bridge**:
   - Injected scoped CSS variable overrides in [`src/apps/storybook/.storybook/index.tsx`](file:///home/krikan/productivity/deeplens/src/apps/storybook/.storybook/index.tsx) targeting `@storybook/addon-ondevice-controls`.
   - Healed all toggle switches, aligned table rows vertically (`align-items: center !important`), and restyled dropdowns and radio buttons across all Storybook pages without forking third-party npm packages.

2. **First-Class Canonical `ToggleSwitch` Atom**:
   - Implemented in Storybook ([`src/apps/storybook/src/components/atoms/ToggleSwitch/`](file:///home/krikan/productivity/deeplens/src/apps/storybook/src/components/atoms/ToggleSwitch/ToggleSwitch.tsx)) and Mobile ([`src/vayyari/components/tamagui-ui/atoms/ToggleSwitch/`](file:///home/krikan/productivity/deeplens/src/vayyari/components/tamagui-ui/atoms/ToggleSwitch/ToggleSwitch.tsx)).
   - Features 3 mathematical presets (`sm`: $36\times20$, `md`: $46\times24$, `lg`: $56\times30$), spring physics, Tamagui token theming, and drop-in compatibility aliases (`value`, `onValueChange`).
   - Purged all raw and Paper switches across 8 files (`story-planner/index.tsx`, `settings.tsx`, `SettingsModal.tsx`, `AddressFormComponent.tsx`, `CompetitorProfileItem.tsx`, `InstagramPostDetailItem.tsx`, `MetaConfigEditorDialog.tsx`, `customer/[id].tsx`, `OrderIdGeneratorPage.tsx`).

3. **Canonical `RadioButton` Atom**:
   - Created in Storybook ([`src/apps/storybook/src/components/atoms/RadioButton/`](file:///home/krikan/productivity/deeplens/src/apps/storybook/src/components/atoms/RadioButton/RadioButton.tsx)) and Mobile ([`src/vayyari/components/tamagui-ui/atoms/RadioButton/`](file:///home/krikan/productivity/deeplens/src/vayyari/components/tamagui-ui/atoms/RadioButton/RadioButton.tsx)).
   - Implemented full accessibility (`role="radio"`, `aria-checked`), Paper `status` prop alias (`'checked' | 'unchecked'`), and interactive CSF stories under `'Atoms/RadioButton'`.
   - Migrated [`InstagramAccountPicker.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/components/utility/instagram/InstagramAccountPicker.tsx) and [`ItemReassignModal.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/components/logistics/ItemReassignModal.tsx).

4. **Enhanced `CustomCheckbox` Atom**:
   - Upgraded [`CustomCheckbox.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/components/tamagui-ui/atoms/CustomCheckbox/CustomCheckbox.tsx) with `disabled` interaction blocking, optional `label` with `XStack` layout, and Paper `status` alias.
   - Migrated [`ManageAddressModal.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/components/utility/customer/ManageAddressModal.tsx), [`FilterDrawer.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/components/utility/product/FilterDrawer.tsx), [`story-planner/sharing.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/app/utilities/instagram/story-planner/sharing.tsx), and [`failed-enrichments.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/app/utilities/whatsapp/failed-enrichments.tsx).

5. **Enhanced `SegmentedControl` Atom**:
   - Upgraded [`SegmentedControl.tsx`](file:///home/krikan/productivity/deeplens/src/vayyari/components/tamagui-ui/atoms/SegmentedControl/SegmentedControl.tsx) to accept `buttons` (`{ value, label, icon }[]`) and `value`/`onValueChange` aliases alongside standard `options` and `activeId`.
   - Migrated all 6 remaining `SegmentedButtons` usages (`settings.tsx`, `SettingsModal.tsx`, `FinancialsSummaryCard.tsx`, `ExistingOrderAutocomplete.tsx`, `ControlCenter.tsx`, `queue.tsx`).

6. **4-Layer Component & Contract Test Strategy**:
   - **Layer 1 (Visual Atoms)**: Storybook CSF stories serve as the visual test fixtures; no redundant JSDOM snapshot tests for static badges or icons.
   - **Layer 2 (Interactive Controls)**: Contract and state machine tests in [`tests/formControls.test.ts`](file:///home/krikan/productivity/deeplens/tests/formControls.test.ts) test symmetry, controlled/uncontrolled state machines, disabled safety, and accessibility roles.
   - **Layer 3 (Complex Molecules & State)**: Unit/logic tests for complex algorithms (e.g. `OrderIdGeneratorPage` deleted filtering, order calculation math, visual lens matching).
   - **Layer 4 (Critical Workflows)**: Regression tests in `src/vayyari/tests/` covering business journeys.

## Verification & Validation
- **Contract Tests**: All 19 tests in `tests/formControls.test.ts` pass in ~120ms (`npm test tests/formControls.test.ts`).
- **Full Test Suite**: All 354 automated tests pass in ~600ms (`npm --prefix src/vayyari test`).
- **Static Typings**: 0 TypeScript compilation errors (`tsc --noEmit`) across both `src/apps/storybook` and `src/vayyari`.
- **Zero Raw / Paper Leaks**: Verified by automated regex checks that no active utility or screen imports raw `Switch`, Paper `Switch`, Paper `RadioButton`, Paper `Checkbox`, or Paper `SegmentedButtons`.

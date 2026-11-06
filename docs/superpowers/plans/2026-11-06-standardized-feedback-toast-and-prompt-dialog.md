# Standardized Feedback Toast & Prompt Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize two canonical UI feedback atoms in Storybook (`FeedbackToast` for auto-dismissing notifications and `PromptDialog` for modal confirmations) and deploy them to the Admin Store Curation screen to eliminate unstyled native alerts.

**Architecture:** We build two specialized atoms using Tamagui layout components and design tokens: `FeedbackToast` (transient floating popup with configurable timer and manual dismiss) and `PromptDialog` (blocking modal prompt with backdrop overlay supporting single-button acknowledgment or dual-button confirmation). Both are added to Storybook atoms with comprehensive interactive stories, mirrored into Vayyari UI atoms, and applied to the Store Curation workbench with coordinated async saving states.

**Tech Stack:** React Native, Tamagui, Lucide Icons (`lu`), Storybook 8, Node.js test runner (`tsx --test`).

**Spec:** `docs/superpowers/specs/2026-11-06-standardized-feedback-toast-and-prompt-dialog-design.md`

## Global Constraints
- C# DTOs: Not applicable (Frontend UI atoms & screen integration).
- TypeScript interfaces: Strict typing with exact camelCase props matching design system tokens.
- Intent palette: Exactly 4 shared intents (`success`, `failure`, `warning`, `info`) plus `critical` on `PromptDialog`.
- Cross-platform: Must render without errors in React Native Web (Vite Storybook) and React Native / Expo (Android/iOS).
- Responsive: Dialog max width clamped at 360px on wide viewports; Toast clamped with margin gutters.

## Review Focus
1. Auto-dismiss timer cleanup: Ensure unmounting `FeedbackToast` before timeout clears `setTimeout` cleanly without memory leaks or state updates on unmounted components.
2. Backdrop dismiss behavior: Tapping backdrop in `PromptDialog` must dismiss only when `dismissOnBackdropPress` is true (default), and never trigger unintended confirmation.
3. Single vs dual button layout: When `singleButton` is true, cancel button is omitted and confirm button takes full width with high visual prominence.
4. Async save coordination: Store curation save buttons must show an inline spinner and be disabled while `isSaving` is true, preventing duplicate network submissions.
5. Error fallback resilience: Failed API saves must trigger `PromptDialog` with `intent="failure"` and actionable error details instead of crashing or showing native `Alert.alert`.

---

### Task 1: Create `FeedbackToast` Atom & Unit Tests

**Files:**
- Create: `src/apps/storybook/src/components/atoms/FeedbackToast/FeedbackToast.tsx`
- Create: `src/apps/storybook/src/components/atoms/FeedbackToast/index.ts`
- Create: `src/vayyari/components/tamagui-ui/atoms/FeedbackToast/FeedbackToast.tsx`
- Create: `src/vayyari/components/tamagui-ui/atoms/FeedbackToast/index.ts`
- Test: `src/vayyari/tests/feedbackToast.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type FeedbackToastIntent = 'success' | 'failure' | 'warning' | 'info';
  export interface FeedbackToastProps {
    visible: boolean;
    message: string;
    title?: string;
    intent?: FeedbackToastIntent;
    durationMs?: number; // default: 2800; 0 disables auto-dismiss
    position?: 'top' | 'bottom'; // default: 'bottom'
    bottomOffset?: number; // default: 24
    topOffset?: number; // default: 24
    actionLabel?: string;
    onAction?: () => void;
    onDismiss: () => void;
  }
  export function FeedbackToast(props: FeedbackToastProps): JSX.Element | null;
  ```

- [ ] **Step 1: Write failing unit test for `FeedbackToast` logic and contract**

Create `src/vayyari/tests/feedbackToast.test.ts` testing intent color resolution, default duration constants, and auto-dismiss timer logic.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/vayyari/tests/feedbackToast.test.ts`
Expected: FAIL ("Cannot find module .../FeedbackToast")

- [ ] **Step 3: Implement `FeedbackToast` in Storybook and Vayyari atoms**

Implement the component with:
- Floating layout (`position="absolute"`, left `16`, right `16`, `maxWidth: 480`, `alignSelf: 'center'`).
- Icon selection based on intent (`LuCheckCircle2` for success, `LuAlertCircle` for failure, `LuTriangleAlert` for warning, `LuInfo` for info).
- Auto-dismiss `setTimeout` effect triggered on `visible` and `durationMs > 0`.
- Dismiss button with `hitSlop` and optional action button.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/vayyari/tests/feedbackToast.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/apps/storybook/src/components/atoms/FeedbackToast src/vayyari/components/tamagui-ui/atoms/FeedbackToast src/vayyari/tests/feedbackToast.test.ts
git commit -m "feat(ui): add standardized FeedbackToast atom with auto-dismiss"
```

---

### Task 2: Create `PromptDialog` Atom & Unit Tests

**Files:**
- Create: `src/apps/storybook/src/components/atoms/PromptDialog/PromptDialog.tsx`
- Create: `src/apps/storybook/src/components/atoms/PromptDialog/index.ts`
- Create: `src/vayyari/components/tamagui-ui/atoms/PromptDialog/PromptDialog.tsx`
- Create: `src/vayyari/components/tamagui-ui/atoms/PromptDialog/index.ts`
- Test: `src/vayyari/tests/promptDialog.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type PromptDialogIntent = 'success' | 'failure' | 'warning' | 'info' | 'critical';
  export interface PromptDialogProps {
    visible: boolean;
    title: string;
    message: string;
    intent?: PromptDialogIntent;
    icon?: React.ReactNode;
    confirmLabel?: string; // default: 'OK'
    cancelLabel?: string; // default: 'Cancel'
    singleButton?: boolean; // default: false
    dismissOnBackdropPress?: boolean; // default: true
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }
  export function PromptDialog(props: PromptDialogProps): JSX.Element | null;
  ```

- [ ] **Step 1: Write failing unit test for `PromptDialog` contract**

Create `src/vayyari/tests/promptDialog.test.ts` verifying intent color mapping, single-button vs dual-button configuration, and accessibility roles.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/vayyari/tests/promptDialog.test.ts`
Expected: FAIL ("Cannot find module .../PromptDialog")

- [ ] **Step 3: Implement `PromptDialog` in Storybook and Vayyari atoms**

Implement the component with:
- `Modal` wrapper with `transparent`, `statusBarTranslucent`, fade animation.
- Backdrop press handler when `dismissOnBackdropPress` is enabled.
- Clamped card (`maxWidth: 360`, padding `20`, `tokens.radius.md`, elevated shadow).
- Intent badge capsule (44px circular pill with 1px border and tinted background).
- Single-button mode for pure acknowledgment vs dual-button mode for action confirmation.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/vayyari/tests/promptDialog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/apps/storybook/src/components/atoms/PromptDialog src/vayyari/components/tamagui-ui/atoms/PromptDialog src/vayyari/tests/promptDialog.test.ts
git commit -m "feat(ui): add standardized PromptDialog atom for modal feedback"
```

---

### Task 3: Add Storybook Stories for `FeedbackToast` & `PromptDialog`

**Files:**
- Create: `src/apps/storybook/src/stories/atoms/FeedbackToast.stories.tsx`
- Create: `src/apps/storybook/src/stories/atoms/PromptDialog.stories.tsx`

**Interfaces:**
- Consumes: `FeedbackToast` and `PromptDialog` from `src/apps/storybook/src/components/atoms/`

- [ ] **Step 1: Create `FeedbackToast.stories.tsx`**

Include:
- `DefaultSuccessAutoDismiss`: 2.8s auto-dismissing toast.
- `FailureWithRetry`: Crimson intent with action button "RETRY".
- `WarningAttention`: Amber warning message.
- `InfoTopAnchored`: Top-anchored toast (`position="top"`).
- `InteractiveSandbox`: Interactive triggers for all 4 intents to test timer resets and dismiss actions.

- [ ] **Step 2: Create `PromptDialog.stories.tsx`**

Include:
- `SuccessAcknowledgment`: Single-button success dialog simulating "Saved Curation".
- `FailureRetryPrompt`: Dual-button failure dialog with Retry / Cancel.
- `CriticalConfirmation`: Critical intent dialog for destructive SKU/color group deletion.
- `InteractiveSandbox`: Full interactive trigger sandbox.

- [ ] **Step 3: Verify Storybook compilation**

Run: `npm run build` or typecheck in `src/apps/storybook`
Expected: PASS with 0 type errors.

- [ ] **Step 4: Commit**

```bash
git add src/apps/storybook/src/stories/atoms/FeedbackToast.stories.tsx src/apps/storybook/src/stories/atoms/PromptDialog.stories.tsx
git commit -m "feat(storybook): add interactive stories for FeedbackToast and PromptDialog"
```

---

### Task 4: Integrate `PromptDialog` & Async Save States into Store Curation

**Files:**
- Modify: `src/vayyari/app/store/curate/[id].tsx`
- Modify: `src/vayyari/components/tamagui-ui/pages/AdminStoreProductCurationPage.tsx`
- Modify: `src/apps/storybook/src/components/pages/AdminStoreProductCurationPage.tsx`
- Test: `src/vayyari/tests/storeCurationNavigation.test.ts`

**Interfaces:**
- Consumes: `PromptDialog` from `@/components/tamagui-ui/atoms/PromptDialog`
- Updates: `onSave` prop signature to support async execution `(curatedPayload: any) => Promise<void> | void`, adding `isSaving` state to disable buttons and show activity indicators.

- [ ] **Step 1: Update `AdminStoreProductCurationPage.tsx`**

- Add `isSaving?: boolean` prop.
- Update Save buttons in Top Bar and Bottom Navs (Metadata & SKUs) to show `<ActivityIndicator size="small" />` when `isSaving` is true and disable interactions.
- Remove immediate uncoordinated top banner `saveToast` so feedback is driven by actual persistence outcome.

- [ ] **Step 2: Update `src/vayyari/app/store/curate/[id].tsx`**

- Import `PromptDialog` from `@/components/tamagui-ui/atoms/PromptDialog`.
- Replace `Alert.alert('Saved', ...)` with `PromptDialog` state:
  ```typescript
  const [feedbackDialog, setFeedbackDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    intent: 'success' | 'failure';
    singleButton?: boolean;
    confirmLabel?: string;
    onConfirm?: () => void;
  } | null>(null);
  ```
- On success: show `PromptDialog` with `title="Curation Saved"`, `message="Curated swatches, SKUs, and groups saved successfully."`, `intent="success"`, `singleButton={true}`, `confirmLabel="Done"`.
- On failure: show `PromptDialog` with `title="Save Failed"`, `message="Failed to save changes to Store.Api. Please try again."`, `intent="failure"`, `confirmLabel="Retry"`, `cancelLabel="Dismiss"`.
- Pass `isSaving` state to `<AdminStoreProductCurationPage isSaving={saving} ... />`.

- [ ] **Step 3: Run full suite of unit and regression tests**

Run: `npm test` in `src/vayyari`
Expected: All 394+ tests PASS with 0 failures.

- [ ] **Step 4: Commit**

```bash
git add src/vayyari/app/store/curate/[id].tsx src/vayyari/components/tamagui-ui/pages/AdminStoreProductCurationPage.tsx src/apps/storybook/src/components/pages/AdminStoreProductCurationPage.tsx
git commit -m "feat(store-curation): replace Alert.alert with PromptDialog and add async save states"
```

---

### Task 5: End-to-End Verification & Documentation Check

**Files:**
- Verify: Full test run in `src/vayyari`
- Verify: Expo reload via `tmux send-keys -t expo r C-m`
- Verify: Prelaunch web app status

- [ ] **Step 1: Run comprehensive test suite**

Run: `npm test` in `src/vayyari`
Expected: All tests pass.

- [ ] **Step 2: Trigger Expo reload**

Run: `tmux send-keys -t expo r C-m`
Verify no syntax or runtime errors.

- [ ] **Step 3: Commit and summarize**

```bash
git status
```

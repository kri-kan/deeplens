# Standardized Feedback Toast & Prompt Dialog Atoms

## Context & Intent
Across the DeepLens / Vayyari application, user notifications and confirmations are currently fragmented:
- Certain admin pages (such as `/store/curate/[id]`) rely on React Native's `Alert.alert()`, which triggers unstyled browser alerts on React Native Web and unstyled OS dialogs on mobile.
- Ad-hoc banners (such as `saveToast` in `AdminStoreProductCurationPage.tsx` and `FloatingPublishToast`) duplicate styling logic without centralized intent tokens or lifecycle controls.

To establish design consistency and atomic reusability, we standardize two canonical feedback atoms in Storybook first, and then apply them across the application starting with the Store Curation workbench:
1. **`FeedbackToast`**: Transient, auto-dismissing notification popup for non-blocking feedback (e.g., "Saved successfully", "Copied to clipboard", "Sync error").
2. **`PromptDialog`**: Modal prompt with backdrop that awaits explicit user interaction or confirmation (e.g., "Curation Saved" acknowledgment, "Delete SKU" confirmation, "Sync Failed" retry prompt).

---

## Goals, Non-Goals, Anti-Goals

### Goals
- Standardize two canonical feedback primitives in Storybook atoms: `FeedbackToast` and `PromptDialog`.
- Support 4 unified semantic intents across both components:
  - `success` (Emerald / checkmark badge)
  - `failure` / `error` (Crimson / alert-circle badge)
  - `warning` / `attention` (Amber / alert-triangle badge)
  - `info` (Brand accent / info badge)
- Provide dual-platform compatibility: Seamless rendering in React Native Web (Storybook & Web Admin) and React Native Native (Expo / Vayyari Android/iOS).
- Support responsive viewport tokens (mobile full/clamped, tablet/desktop centered dialog max 360px).
- Add full Storybook stories demonstrating all states, intents, and interactive triggers.
- Replace `Alert.alert` and uncoordinated banners in Store Curation (`/store/curate/[id]` and `AdminStoreProductCurationPage.tsx`).

### Non-Goals
- Global redux/context toast queue provider (kept out of scope for this task to avoid over-engineering; components are self-contained, controlled atoms with simple local state or callbacks).
- Refactoring unrelated alert call sites across the entire app in this turn (will be phased after establishing the standard).

### Anti-Goals
- No unstyled native browser `alert()` or `confirm()`.
- No non-token hardcoded colors that break dark/light mode switching.
- No layout shift or uncoordinated flashing of save indicators.

---

## Approaches Considered & Selected

1. **Paired Specialized Atoms: `FeedbackToast` + `PromptDialog` (Selected)**
   - *Rationale*: Clearly separates transient notifications (auto-dismissing, non-blocking, anchored top/bottom) from intentional decision gates (modal backdrop, focus trap, explicit user dismissal/action).
   - *Tradeoffs*: Requires two separate components, but maximizes clarity and adheres to atomic design principles.

2. **Monolithic Universal Modal / Toast Component**
   - *Rationale*: Single component trying to handle both floating toast and blocking modal via a `variant="toast" | "modal"` prop.
   - *Tradeoffs*: Convoluted props, confusing DOM/React Native layout structure, bloated bundle size. Rejected.

3. **Ad-hoc Screen-Level Alerts**
   - *Rationale*: Styling local modals inside each page.
   - *Tradeoffs*: Leads to code duplication, drift, and regressions like the current `Alert.alert` issue. Rejected.

---

## Detailed Specifications

### 1. `FeedbackToast` Atom
- **Path**: `src/apps/storybook/src/components/atoms/FeedbackToast/` & `src/vayyari/components/tamagui-ui/atoms/FeedbackToast/`
- **Props**:
  ```typescript
  export type FeedbackToastIntent = 'success' | 'failure' | 'warning' | 'info';

  export interface FeedbackToastProps {
    visible: boolean;
    message: string;
    title?: string;
    intent?: FeedbackToastIntent;
    durationMs?: number; // default: 2800ms; 0 to disable auto-dismiss
    position?: 'top' | 'bottom'; // default: 'bottom'
    bottomOffset?: number; // default: 24
    topOffset?: number; // default: 24
    actionLabel?: string;
    onAction?: () => void;
    onDismiss: () => void;
  }
  ```
- **Visuals**:
  - Floating pill container with `tokens.surfaceRaised`, `tokens.border`, `tokens.radius.sm`, elevation shadows.
  - Left intent badge with circular colored pill and Lucide icon (`LuCheckCircle2`, `LuAlertCircle`, `LuTriangleAlert`, `LuInfo`).
  - Text block supporting optional bold `title` and `message`.
  - Optional action button text link (e.g., "VIEW", "RETRY").
  - Dismiss button (`LuX`) with comfortable tap target.
  - Auto-dismiss timer using `useEffect` with cleanup.

### 2. `PromptDialog` Atom / Molecule
- **Path**: `src/apps/storybook/src/components/atoms/PromptDialog/` & `src/vayyari/components/tamagui-ui/atoms/PromptDialog/`
- **Props**:
  ```typescript
  export type PromptDialogIntent = 'success' | 'failure' | 'warning' | 'info' | 'critical';

  export interface PromptDialogProps {
    visible: boolean;
    title: string;
    message: string;
    intent?: PromptDialogIntent;
    icon?: React.ReactNode;
    confirmLabel?: string; // default: 'OK' or 'Confirm'
    cancelLabel?: string; // default: 'Cancel'
    singleButton?: boolean; // true for acknowledgment (OK), false for dual-button confirmation
    dismissOnBackdropPress?: boolean; // default: true
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }
  ```
- **Visuals**:
  - Modal overlay (`tokens.overlay` translucent backdrop).
  - Dialog card clamped at `maxWidth: 360` with `tokens.radius.md`, `tokens.border`, elevated shadow.
  - Icon badge: 44px circular capsule with subtle tinted background and border matching intent.
  - Typography: 16px font weight 800 title, 13px line height 19 muted message.
  - Single-button mode renders full-width styled primary button in intent color.
  - Dual-button mode renders balanced Cancel (`tokens.surfaceRaised`) and Confirm (`intent.base`) buttons.

---

## Storybook Stories

1. **`FeedbackToast.stories.tsx`**:
   - `SuccessAutoDismiss`: Standard success toast with 2.8s auto-dismiss.
   - `FailureWithRetry`: Error toast with "RETRY" action button.
   - `WarningAttention`: Warning toast with custom message.
   - `InfoTopAnchored`: Info toast anchored at the top of the viewport.
   - `InteractiveSandbox`: Interactive triggers for simulating multiple toast states.

2. **`PromptDialog.stories.tsx`**:
   - `SuccessAcknowledgment`: Single-button success dialog ("Curation Saved & Synced").
   - `FailureRetryPrompt`: Dual-button failure dialog ("Connection Timeout" with Retry & Cancel).
   - `CriticalDeleteConfirmation`: Destructive confirmation dialog ("Discard Unsaved Swatches?").
   - `StoreCurationSaveSimulation`: Live simulation matching Store Curation save flow.

---

## Application Implementation in Store Curation

1. **`src/vayyari/app/store/curate/[id].tsx`**:
   - Replace `Alert.alert('Saved', ...)` with `PromptDialog` (Single-button success prompt, "Done").
   - Replace `Alert.alert('Error', ...)` with `PromptDialog` (Dual-button failure prompt, "Retry" / "Dismiss").
   - Manage `dialogState: { visible: boolean; intent: 'success' | 'failure'; title: string; message: string } | null`.

2. **`AdminStoreProductCurationPage.tsx`**:
   - Support `isSaving` prop: show spinning indicator / disabled state on Header Save button, "Save Metadata", and "Save SKUs" while `handleSave` is executing.
   - Remove early uncoordinated `saveToast` flash so feedback only fires when persistence has actually succeeded or failed.

---

## Verification & Testing
- Unit tests: Render tests verifying auto-dismiss timer lifecycle, single-button vs dual-button rendering, intent colors, and callback triggers.
- Visual check in Storybook.
- End-to-end sanity check in Store Curation screen.

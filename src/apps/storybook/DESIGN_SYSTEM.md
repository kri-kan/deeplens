# 🏛️ Universal Design System & Developer Onboarding Guide

Welcome to the **E-Commerce & Merchant Admin Component Library**. This system is built upon **W3C Design Token specifications** and **Shopify Polaris-style intent-based architecture**, ensuring complete business-neutrality, accessibility (WCAG AA), and dual-platform portability (React Native Mobile + Web CSS).

---

## 1. Core Philosophy: The 3-Tier Token Architecture

We separate **Intent** from **Usage**. Components never hardcode brand names, domain workflows (e.g. COD or sarees), or raw pixel sizes. Instead, they subscribe to a 3-tier hierarchy:

```
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 1: PRIMITIVES (Raw Brand Values)                                  │
│   colors.amber[50..900], colors.gold[50..900], space[0..12], radius   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ TIER 2: SEMANTIC INTENTS (Role-Based Contracts)                        │
│   status.attention, status.positive, surfaces.canvas, surfaces.sunken  │
│   *Automatically adapts across Light, Dark, and Seasonal Themes!*      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ TIER 3: COMPONENT CONTRACTS (Component Defaults)                       │
│   <StatusBadge intent="attention" />, <BottomSheet />, <DropdownField>│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
   Web (CSS Custom Properties)                     React Native / Tamagui
   `var(--color-status-attention-text)`            `tokens.status.attention.text`
```

---

## 2. Token Reference

### A. The 4 Invariant Status Intents (`tokens.status.*`)
Every commercial event, badge, or alert in the application maps to one of four invariant intents:

| Intent | Psychological Meaning | Usage Examples | Visual Spectrum |
| :--- | :--- | :--- | :--- |
| **`attention`** | Caution, pending action, financial risk, balance due | Cash on Delivery (COD), unverified address, low stock, hold order | Amber / Warm Gold |
| **`positive`** | Success, verified, credit, completed | Prepaid order, receipt attached, payment captured, in stock | Emerald / Green |
| **`critical`** | Destruction, error, rejection, cancellation | Batch delete, order cancelled, payment failed, expired | Crimson / Red |
| **`info`** | Informational highlight, active state | SKU link, category tab active, in transit, order notes | Blue / Theme Accent |

Each intent guarantees a 4-part color contract complying with **WCAG AA (>4.5:1 contrast)**:
```ts
const { base, subtle, border, text } = tokens.status.attention;
// base:   Solid accent for icons / active dots
// subtle: Tinted background (6% - 15% opacity)
// border: Subtle matching stroke
// text:   High-contrast legible foreground
```

---

### B. Spatial Surface Hierarchy (`tokens.surfaces.*`)
Surfaces define elevation and depth without binding to specific product fabric colors:

| Surface Token | Role | Default Light | Default Dark |
| :--- | :--- | :--- | :--- |
| `surfaces.canvas` | Root application viewport backdrop | `#FAF8F5` (Warm Ivory) | `#0F0C08` (Obsidian) |
| `surfaces.base` | Primary card and content container | `#FFFFFF` | `#171411` |
| `surfaces.raised` | Elevated cards, menus, bottom sheets | `#F3EEE7` | `#24201A` |
| `surfaces.sunken` | Recessed wells, input backgrounds, placeholders | `#F5EBE0` | `rgba(255,255,255,0.06)` |
| `surfaces.overlay`| Dimmed modal backdrop | `rgba(0,0,0,0.48)` | `rgba(0,0,0,0.65)` |

---

### C. Modular Control Sizing Scale (`tokens.sizes.control.*`)
Never hardcode random heights like `height={27}` or `height={33}`. Use the standardized scale:

| Token | Height | Intended Usage |
| :--- | :--- | :--- |
| `sizes.control.xs` | **24px** | High-density list inline controls, compact pills, table dropdowns |
| `sizes.control.sm` | **32px** | Dense admin forms, stacked metric inputs, small icon action buttons |
| `sizes.control.md` | **40px** | Standard forms, text fields, navigation items |
| `sizes.control.lg` | **48px** | Primary mobile thumb-zone CTAs, checkout confirm buttons |
| `sizes.control.xl` | **56px** | Hero search bars, full-width banners |
| `sizes.control.touchTarget` | **44px** | Minimum accessible touch target (via size or `hitSlop`) |

---

## 3. Component Architecture (Atomic Design)

Our component library is structured in `src/components/`:

```
src/components/
├── atoms/                # Fundamental building blocks (no business logic)
│   ├── BottomSheet/      # Content-agnostic pull-up modal with screen-bottom anchoring
│   ├── SegmentedControl/ # Tab switcher with accessibilityRole="tablist"
│   ├── OptionChip/       # Selectable pill/chip with checkmark indicator
│   ├── StatusBadge/      # Intent-driven status pill (attention, positive, critical, info)
│   ├── TimestampBadge/   # Adaptive temporal badge (Today, Y'day, compact mode, floating tooltip)
│   ├── AgeBadge/         # Relative elapsed time badge (n mins, hours, days, months, years ago)
│   ├── CustomCheckbox/   # Accessible checkbox with transparent/solid states
│   ├── DropdownField/    # Underline selector with chevron
│   └── CompactField/     # Underline input with label
│
├── molecules/            # Composed patterns
│   ├── DetailHeader/     # Order ID, adaptive time format, Save/Delete actions
│   ├── SourceRow/        # WhatsApp/Instagram deep-link + StatusBadge
│   ├── QuickPickerSheet/ # Size & Quantity picker wrapping BottomSheet + SegmentedControl
│   ├── ConfirmDialog/    # Action confirmation prompt with danger/attention intents & overlay
│   └── TransactionReceiptSection/ # UTR input & screenshot upload/preview
│
├── organisms/            # Complex functional widgets
│   ├── ProductListSection/# Multi-select bar, batch delete, stacked price/COD inputs
│   └── ProductEditSheet/ # 2 image tiles, 3-column attributes, vendor row
│
└── pages/                # Clean controller pages (business logic & state wiring)
    └── AdminOrderDetailPage.tsx # Slim ~295 lines orchestrating UI
```

---

## 4. How to Build a New Component (Checklist)

When creating a new component for the design system:

### 1. Folder Structure
Create a dedicated folder in `src/components/atoms/` or `molecules/`:
```bash
src/components/atoms/MyComponent/
├── MyComponent.tsx          # Implementation
└── index.ts                 # `export * from './MyComponent';`
```

### 2. Subscribe to Tokens
Always consume tokens via `useTheme()`:
```tsx
import { useTheme } from '../../../theme';

export function MyComponent() {
  const { tokens } = useTheme();
  return (
    <XStack
      height={tokens.sizes.control.sm}
      backgroundColor={tokens.surfaces.base}
      borderColor={tokens.border}
    />
  );
}
```

### 3. Guarantee Accessibility (WCAG AA)
- Interactive elements **MUST** have `accessibilityRole` (`button`, `checkbox`, `combobox`, `tab`, `link`).
- Toggles/Tabs **MUST** have `accessibilityState={{ selected: isActive }}` or `checked`.
- Elements smaller than 44px **MUST** have `hitSlop` (e.g. `hitSlop={8}`).
- Icon-only buttons **MUST** have an `accessibilityLabel="Descriptive action"`.

### 4. Create a Storybook Story
Register your story in `src/stories/atoms/` or `molecules/`:
```tsx
import type { Meta, StoryObj } from '@storybook/react-native';
import { MyComponent } from '../../components/atoms/MyComponent';
import { withFormFactor } from '../utils/FormFactorPreview';

const meta: Meta<typeof MyComponent> = {
  title: 'Atoms/MyComponent',
  component: MyComponent,
  decorators: [withFormFactor('mobile', 'My Component Demo')],
};
export default meta;
```

---

## 5. Financial Inputs & Calculation Contract

To ensure visual alignment, prevent layout overflow, and maintain data integrity, all order line items adhere to strict digit caps and deduction rules:

| Field | Max Length | Value Range | Theme / Accent Token |
| :--- | :---: | :---: | :--- |
| **Price / pc (₹)** | **5 digits** | ₹0 – ₹99,999 | `tokens.surfaceRaised`, `tokens.text` |
| **COD Charges / pc (₹)** | **4 digits** | ₹0 – ₹9,999 | `tokens.warningSubtle`, `tokens.warningText` |
| **Advance Paid / Paid (₹)** | **4 digits** | ₹0 – ₹9,999 | `tokens.status.positive.subtle`, `tokens.status.positive.text` |

### Unified Line Total Formula
Applied consistently across root screens and modal sheets:
$$\text{Line Total} = \max\Big(0, \; \big(\text{Quantity} \times (\text{Price} + \text{COD Charge})\big) - \text{Advance Paid}\Big)$$

- **Components implementing this contract**:
  - `ProductListSection`: Inline pricing row with live deduction.
  - `ProductEditSheet`: Comprehensive modal editor with summary breakdown.
  - `CompactField`: Fundamental underline input enforcing `maxLength`.

---

## 6. Do's and Don'ts

| Do | Don't |
| :--- | :--- |
| **DO** enforce `maxLength={5}` for prices and `maxLength={4}` for COD/advance. | **DON'T** allow unbounded numeric input lengths that cause table cell overflows. |
| **DO** use `tokens.status.attention` for pending actions, risk, or COD. | **DON'T** hardcode raw hex values like `#B06000` or `#FFF4E5`. |
| **DO** use `tokens.sizes.control.xs` (24px) for compact table controls. | **DON'T** use arbitrary heights like `height: 25`. |
| **DO** wrap modal content inside `<BottomSheet>` atom. | **DON'T** write custom overlay backdrops and drag handles from scratch. |
| **DO** use `<StatusBadge>` for state pills. | **DON'T** hand-craft custom `YStack` badges with hardcoded borders. |
| **DO** verify changes with `npx tsc --noEmit`. | **DON'T** commit changes with TypeScript `any` leaks. |

---

## 7. Live Demos & Storybook

Run the Storybook catalog locally to inspect all tokens and components interactively:
```bash
npm run storybook
```
- Open `http://localhost:9999`
- Navigate to **`Theme / BusinessNeutralTokens`** to see:
  - Live color swatches with contrast ratios
  - Spatial surfaces visualizer
  - Control sizing scale comparison

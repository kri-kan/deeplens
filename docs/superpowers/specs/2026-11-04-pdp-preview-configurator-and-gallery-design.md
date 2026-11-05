# Design Document: Store Configuration Studio, Experimental PDP Feature Flags & A/B Simulation

**Date:** 2026-11-04  
**Author:** Krishna (Squad Lead)  
**Status:** In Review  
**Target Subsystems:** `ProductGallery`, `SizeChartModal`, `SpecificationsPanel`, `ProductDetailPage`, `StoreConfigurationStudioPage` (`src/vayyari` and `src/apps/storybook`)

---

## 1. Intent & Context

The Vayyari storefront is introducing experimental merchandising capabilities on the Product Detail Page (PDP). The administrator requires a **Store Configuration Studio** (`StoreConfigurationStudioPage`) to manage feature flags, test layouts, and simulate **A/B test variants** (e.g. Variant A: Clean Heritage vs Variant B: High Social Proof & Urgency) for customer cohorts before rolling them out site-wide.

The studio focuses exclusively on configuring the **PDP experience**, allowing administrators to preview, toggle, and tune:
1. **Social Proof Badges:** Ratings chip, live shopper View Count chip (`👁 1.2k viewing`).
2. **Content Density:** Saree description truncation (collapsed 2-line clamp with `...` vs expanded full story).
3. **Craft Specifications:** Attribute count in brackets `(12)` in header with expand/collapse chevron (default collapsed vs expanded).
4. **Hero Media Navigation:** Floating in-canvas thumbnail preview strip on grouped PDPs, giving swatches 100% full width below the photo.
5. **Ergonomic Sizing:** Bottom-sheet Size Chart sticking to base, above sticky price bar, dismissible via top-right `✕`, backdrop tap, or swipe down (no "Got It" button).
6. **Discovery Rails:** Toggling and ordering Color Variations (sibling SKUs row), Similar Products (*You May Also Cherish*), You May Like (*Curated Masterpieces*), and Recently Viewed (*Your Cherished Journey*).
7. **A/B Cohort Presets:** Quick-switching between:
   - **Control (Variant A - Classic Heritage):** Ratings on, views hidden, expanded description, cards specs.
   - **Treatment (Variant B - High Conversion & Social Proof):** Ratings + Live Views on, collapsed description, accordion specs with attribute count, floating gallery thumbnails, sibling SKU strip.
   - **Custom (Active Studio Config):** Fine-grained toggle control.

---

## 2. Goals, Non-Goals, & Anti-Goals

### Goals
- **Store Configuration Studio Page:** A dedicated, elegant workbench in Vayyari (`src/vayyari/app/store/configuration.tsx`) and Storybook (`AdminStoreConfigurationStudioPage.stories.tsx`).
- **Collapsible Left Menu:** Slide-out control drawer with categorized feature toggles, A/B variant switcher, and reset actions.
- **Real-Time Simulation Canvas:** Live rendering of `ProductDetailPage` with Mobile (390px), Tablet (768px), and Desktop (1240px) hardware frames.
- **In-Canvas Floating Thumbnail Strip:** Floating scrollable strip inside the hero container with active thumbnail ring and smooth scroll-to-index.
- **Base Bottom-Sheet Size Chart:** Sticks to the bottom edge, sits above sticky buy bar, dismissible via top-right `✕`, backdrop tap, or swipe down.
- **Collapsible Description & Specs:** Configurable default expanded/collapsed state with attribute count badge `(N)`.
- **Configurable PDP Discovery Rails:** Color Variations, Similar Products, You May Like, Recently Viewed.

### Non-Goals
- Full multi-tenant automated A/B distribution engine with persistent user cookie bucketing (this phase provides the configuration studio, feature flag model, and simulation preview).
- Modifying checkout or catalog PLP routes in this sprint.

### Anti-Goals
- Do not mix non-PDP store settings into this studio; keep it laser-focused on the PDP page experience.

---

## 3. Technical Architecture & Component Contracts

### 3.1. Configuration State Interface (`PdpConfig`)

```typescript
export interface PdpConfig {
  // A/B Experiment Identifier
  activeVariant?: 'control' | 'treatment' | 'custom';

  // Badges & Social Proof
  showRatings: boolean;
  showViewsCount: boolean;
  viewsCount: number | string; // e.g. '1.4k' or 1420

  // Description & Story
  descriptionDefaultCollapsed: boolean;
  descriptionTruncateLines: number; // default: 2

  // Specifications
  specsDefaultCollapsed: boolean;
  specsShowSilkMark: boolean;

  // Gallery
  galleryThumbnailPosition: 'in_container' | 'below_container';

  // Presentation Mode
  presentationMode: 'grouped' | 'split';

  // Discovery Rails Order & Visibility
  visibleSections: PdpSectionId[];
}

export type PdpSectionId =
  | 'color_variations'
  | 'frequently_bought'
  | 'specifications'
  | 'reviews'
  | 'similar_products'
  | 'you_may_like'
  | 'recently_viewed';

export const PDP_PRESETS: Record<'control' | 'treatment', PdpConfig> = {
  control: {
    activeVariant: 'control',
    showRatings: true,
    showViewsCount: false,
    viewsCount: '1.2k',
    descriptionDefaultCollapsed: false,
    descriptionTruncateLines: 2,
    specsDefaultCollapsed: false,
    specsShowSilkMark: true,
    galleryThumbnailPosition: 'in_container',
    presentationMode: 'grouped',
    visibleSections: [
      'frequently_bought',
      'specifications',
      'reviews',
      'similar_products',
    ],
  },
  treatment: {
    activeVariant: 'treatment',
    showRatings: true,
    showViewsCount: true,
    viewsCount: '1.4k',
    descriptionDefaultCollapsed: true,
    descriptionTruncateLines: 2,
    specsDefaultCollapsed: true,
    specsShowSilkMark: true,
    galleryThumbnailPosition: 'in_container',
    presentationMode: 'grouped',
    visibleSections: [
      'color_variations',
      'frequently_bought',
      'specifications',
      'reviews',
      'similar_products',
      'you_may_like',
      'recently_viewed',
    ],
  },
};
```

---

### 3.2. Component Contract Updates

#### 1. `ProductGallery.tsx`
- Replace carousel dots with horizontal thumbnail preview strip inside the hero container floating at `bottom: 12` inside a blurred glass capsule.
- Each thumbnail: `width: 44, height: 44, borderRadius: 8`, active ring with `tokens.accent`, hover scaling.
- In grouped mode with an active swatch, thumbnails reflect that swatch's photos. When unselected, all photos appear in the strip.

#### 2. `SizeChartModal.tsx`
- Change modal presentation to bottom-sheet layout (`position: 'fixed'`, `bottom: 0`, `zIndex: 1000`).
- Remove "Got It" button.
- Top-right `LuX` close button, drag pill on top, backdrop tap dismiss.

#### 3. `SpecificationsPanel.tsx`
- Header: `Specifications & Craft Details ({totalSpecCount})` with `LuChevronDown` / `LuChevronUp`.
- Collapsible body container controlled by `isCollapsed` state, initialized from `defaultCollapsed` prop.

#### 4. `ProductDetailPage.tsx`
- Accept `config?: Partial<PdpConfig>`.
- Render **Views Chip** (`👁 {config.viewsCount} viewing`) next to RatingBadge when `config.showViewsCount` is true.
- Render RatingBadge only when `config.showRatings` is true.
- Collapsible description paragraph with `...` clamp and "Read More / Show Less" action.
- Add **You May Like** and **Recently Viewed** rails.
- Dynamically render sections based on `config.visibleSections`.

#### 5. `StoreConfigurationStudioPage.tsx` (`src/vayyari` and `src/apps/storybook`)
- Top Bar:
  - Studio Title: **"Store Configuration Studio"** (with live "PDP Merchandising & A/B Testing" subtitle)
  - Product Selector (`VF2B56` Kanjeevaram Silk, `VF2F4A` Anarkali, `VF2F4F` Lehenga)
  - Device Selector (Mobile 390px, Tablet 768px, Desktop 1240px)
  - Variant Quick Switcher (Variant A: Control, Variant B: Treatment, Custom)
  - Left Menu Drawer Toggle Button
- Left Drawer Sidebar:
  - **A/B Experimentation Card:** Switcher between Control vs Treatment presets.
  - **Social Proof & Badges Card:** Toggles for Ratings chip and Live Views count chip.
  - **Story & Description Card:** Toggle for default collapsed state with line clamp.
  - **Specifications & Sizing Card:** Toggle for default collapsed state with attribute count badge `(12)`.
  - **Discovery Rails Card:** Checklist & toggles for Color Variations, Similar Products, You May Like, Recently Viewed.
- Main Canvas:
  - Real-time rendering of `ProductDetailPage` with the active configuration applied immediately.

---

## 4. Verification & Testing Plan

1. **TypeScript Verification:** `npx tsc --noEmit --project src/apps/storybook/tsconfig.json` (0 errors).
2. **Vayyari Component Tests:** `npm test --prefix src/vayyari -- --testPathPattern="curat|swatch|pdp|config"`.
3. **Storybook Interactive Verification:**
   - `Pages/Admin/Store - Configuration Studio`: Test switching between Variant A and Variant B, toggling switches, and watching live PDP update.
   - `Pages/Store/ProductDetail`: Test floating gallery thumbnails, size chart bottom sheet, collapsible description, and collapsible specs.

# Store Configuration Studio & PDP A/B Experiments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Store Configuration Studio workbench for PDP merchandising A/B experiments, upgrade the PDP gallery with in-canvas floating thumbnails, convert the Size Chart to a base bottom-sheet, add collapsible description and specs with attribute count, and support configurable discovery rails.

**Architecture:** Shared design system components (`ProductGallery`, `SizeChartModal`, `SpecificationsPanel`, `ProductDetailPage`) are updated across `src/apps/storybook` and `src/store`. A dedicated `StoreConfigurationStudioPage` is created in `src/vayyari` (route `/store/configuration`) and `src/apps/storybook`, integrating a collapsible left drawer for A/B variant switching and real-time live device frame simulation.

**Tech Stack:** React 19, React Native Web, Tamagui, Lucide / React Icons (`react-icons/lu` in storybook, `icons/lu` in vayyari), Expo Router.

**Spec:** [`docs/superpowers/specs/2026-11-04-pdp-preview-configurator-and-gallery-design.md`](file:///home/krikan/productivity/deeplens/docs/superpowers/specs/2026-11-04-pdp-preview-configurator-and-gallery-design.md)

## Global Constraints

- **C# DTOs / Schemas:** Not modified in this frontend workbench phase; mock and local state drive real-time simulation.
- **Expo Packager:** Do NOT run `npx expo start` manually on port 8081.
- **Storybook:** Runs on port 6006 (`http://localhost:6006`).
- **Icons Parity:** Use `react-icons/lu` in Storybook and `@/components/icons/lu` in Vayyari.
- **Zero Regressions:** Pass all existing 324 Vayyari tests and Storybook TypeScript compilation (`npx tsc --noEmit`).

## Review Focus

1. **Mobile Gallery Thumbnails:** Floating capsule must not obscure bottom hero image details or leak outside the image boundary.
2. **Bottom Sheet Stacking:** Size chart must render above the sticky buy bar (`zIndex >= 1000`) without clipping bottom tables.
3. **Description Clamp:** Toggling "Read More" and "Show Less" must smoothly resize without jumping or losing layout position.
4. **Specs Collapse:** Toggling the accordion chevron must preserve category tab selections when re-expanded.
5. **Config Synchrony:** Switching between Variant A (Control) and Variant B (Treatment) in the studio must immediately reconfigure all PDP sections in the live viewport.

---

### Task 1: Floating In-Canvas Gallery Thumbnail Strip & Swatch Uncluttering

**Files:**
- Modify: `src/apps/storybook/src/components/organisms/ProductGallery/ProductGallery.tsx:250-320`
- Modify: `src/store/src/components/organisms/ProductGallery/ProductGallery.tsx:250-320`

**Interfaces:**
- Consumes: `activeImages: GalleryImage[]`, `activeImageIndex: number`, `selectedColor: string`
- Produces: In-canvas floating horizontal thumbnail capsule replacing carousel dots; swatches below receive 100% width.

- [ ] **Step 1: Update `ProductGallery.tsx` in `src/apps/storybook`**
  - Remove carousel dots `<CarouselDot />`.
  - In the hero media container, add floating thumbnail pill positioned at `bottom: 12`, `left: 12`, `right: 12`:
    - Background: `rgba(0, 0, 0, 0.45)`, `borderRadius: 14`, padding: 6, `alignItems: 'center'`.
    - Horizontal `ScrollView` with `showsHorizontalScrollIndicator={false}`.
    - Each thumbnail item: `width: 44, height: 44, borderRadius: 8`, border 2px (`tokens.accent` when active, `rgba(255,255,255,0.3)` inactive).
    - Tapping thumbnail sets `activeImageIndex(idx)`.
  - In the compact row below hero, remove the cramped left media scrollview (`mediaSlot`), giving swatches 100% width.

- [ ] **Step 2: Mirror changes to `src/store/src/components/organisms/ProductGallery/ProductGallery.tsx`**
  - Keep 100% parity with Storybook implementation.

- [ ] **Step 3: Run TypeScript check**
  Run: `npx tsc --noEmit --project src/apps/storybook/tsconfig.json --ignoreDeprecations 5.0`
  Expected: PASS with 0 errors.

- [ ] **Step 4: Verify in Storybook**
  Visit `http://localhost:6006/?story=pages-store-productdetail--grouped-pdp-view-interactive`.
  Verify thumbnails float inside bottom hero and tapping selects photos.

---

### Task 2: Base Bottom-Sheet Size Chart with Top-Right `✕` & No "Got It" Button

**Files:**
- Modify: `src/apps/storybook/src/components/organisms/SizeChart/SizeChartModal.tsx:270-353`
- Modify: `src/store/src/components/organisms/SizeChart/SizeChartModal.tsx:270-353`

**Interfaces:**
- Consumes: `visible: boolean`, `onClose: () => void`, `chartData: SizeChartData`
- Produces: Bottom-anchored modal sheet with drag pill, header close `✕`, no "Got It" button, positioned above sticky bar (`zIndex: 1000`).

- [ ] **Step 1: Update `SizeChartModal.tsx` in `src/apps/storybook`**
  - Ensure container uses `position: 'fixed'`, `bottom: 0`, `left: 0`, `right: 0`, `top: 0`, `justifyContent: 'flex-end'`, `zIndex: 1000`.
  - Ensure header has right-aligned `LuX` close button with `hitSlop={8}` calling `onClose`.
  - Remove the bottom bar containing the "Got It" button.
  - Add drag pill at top of sheet: `width: 40, height: 4, borderRadius: 2, backgroundColor: tokens.border`.
  - Backdrop tap triggers `onClose`.

- [ ] **Step 2: Mirror changes to `src/store/src/components/organisms/SizeChart/SizeChartModal.tsx`**
  - Keep 100% parity with Storybook implementation.

- [ ] **Step 3: Run TypeScript check**
  Run: `npx tsc --noEmit --project src/apps/storybook/tsconfig.json --ignoreDeprecations 5.0`
  Expected: PASS with 0 errors.

---

### Task 3: Collapsible Specifications Panel with Attribute Count `(12)` and Chevron

**Files:**
- Modify: `src/apps/storybook/src/components/organisms/SpecificationsPanel/SpecificationsPanel.tsx:230-285`
- Modify: `src/store/src/components/organisms/SpecificationsPanel/SpecificationsPanel.tsx:230-285`

**Interfaces:**
- Consumes: `title?: string`, `totalSpecCount: number`, `defaultCollapsed?: boolean`
- Produces: Accordion title `Specifications & Craft Details ({totalSpecCount})` with `LuChevronDown`/`LuChevronUp` that toggles entire body.

- [ ] **Step 1: Update `SpecificationsPanel.tsx` in `src/apps/storybook`**
  - Add `defaultCollapsed?: boolean` to `SpecificationsPanelProps` (default: `true`).
  - Add state `isSectionCollapsed` initialized to `defaultCollapsed`.
  - Make header Pressable:
    - Display title: `${title || 'Specifications & Craft Details'} (${totalSpecCount})`.
    - Right side: `isSectionCollapsed ? <LuChevronDown size={18} /> : <LuChevronUp size={18} />`.
  - Wrap body (silk mark banner, view mode switcher, spec groups) in `{ !isSectionCollapsed && (...) }`.

- [ ] **Step 2: Mirror changes to `src/store/src/components/organisms/SpecificationsPanel/SpecificationsPanel.tsx`**
  - Keep 100% parity with Storybook implementation.

- [ ] **Step 3: Run TypeScript check**
  Run: `npx tsc --noEmit --project src/apps/storybook/tsconfig.json --ignoreDeprecations 5.0`
  Expected: PASS with 0 errors.

---

### Task 4: ProductDetailPage Config Model, Views Chip, Collapsible Description & Discovery Rails

**Files:**
- Modify: `src/apps/storybook/src/components/pages/ProductDetailPage.tsx`
- Modify: `src/store/src/app/pages/ProductDetailPage.tsx`
- Modify: `src/apps/storybook/src/stories/pages/ProductDetailPage.stories.tsx`

**Interfaces:**
- Consumes: `PdpConfig` interface from `types`
- Produces: Fully configurable PDP responding to `config` prop with views chip, collapsible description, collapsible specs, and modular discovery rails.

- [ ] **Step 1: Define `PdpConfig` in `src/apps/storybook/src/components/pages/ProductDetailPage.tsx`**
  - Define `PdpConfig` interface, `PdpSectionId`, and `DEFAULT_PDP_CONFIG`.
  - Add `config?: Partial<PdpConfig>` to `ProductDetailPageProps`.

- [ ] **Step 2: Add Views Chip and Toggleable RatingBadge**
  - When `effectiveConfig.showViewsCount` is true: render Views chip (`👁 {viewsCount} viewing`) with amber tint `#FEF3C7` and text `#B45309`.
  - When `effectiveConfig.showRatings` is true: render `RatingBadge`. If false: hide.

- [ ] **Step 3: Add Collapsible Description**
  - Add state `descriptionExpanded` (default `!effectiveConfig.descriptionDefaultCollapsed`).
  - Render description with `numberOfLines={descriptionExpanded ? undefined : effectiveConfig.descriptionTruncateLines || 2}`.
  - Below text, render Pressable "Read More ↓" / "Show Less ↑" toggle.

- [ ] **Step 4: Add Modular Discovery Rails**
  - Add **You May Like** rail (curated products strip).
  - Add **Recently Viewed** rail (recently viewed products strip).
  - Dynamically render discovery rails based on `effectiveConfig.visibleSections`.

- [ ] **Step 5: Mirror changes to `src/store/src/app/pages/ProductDetailPage.tsx`**
  - Maintain 100% parity.

- [ ] **Step 6: Update Stories in `ProductDetailPage.stories.tsx`**
  - Add `VariantAControl` story (Classic Heritage).
  - Add `VariantBTreatment` story (High Social Proof & Urgency).

- [ ] **Step 7: Run TypeScript check & tests**
  Run: `npx tsc --noEmit --project src/apps/storybook/tsconfig.json --ignoreDeprecations 5.0`
  Run: `npm test --prefix src/vayyari -- --testPathPattern="curat|swatch|pdp"`
  Expected: PASS with 0 errors.

---

### Task 5: Store Configuration Studio Workbench (`StoreConfigurationStudioPage`)

**Files:**
- Create: `src/apps/storybook/src/components/pages/StoreConfigurationStudioPage.tsx`
- Create: `src/apps/storybook/src/stories/pages/StoreConfigurationStudioPage.stories.tsx`
- Create: `src/vayyari/components/tamagui-ui/pages/StoreConfigurationStudioPage.tsx`
- Create: `src/vayyari/app/store/configuration.tsx`

**Interfaces:**
- Consumes: `ProductDetailPage`, `PdpConfig`, `PDP_PRESETS`, `CatalogTestProduct`
- Produces: Full interactive studio with collapsible left drawer and live multi-device simulation frame.

- [ ] **Step 1: Build `StoreConfigurationStudioPage.tsx` in `src/apps/storybook`**
  - Header: Title "Store Configuration Studio", subtitle "PDP Merchandising & A/B Testing", Product Picker (`VF2B56`, `VF2F4A`, `VF2F4F`), Device Frame Picker (Mobile 390px, Tablet 768px, Desktop 1240px), A/B Preset Selector (Variant A: Control, Variant B: Treatment, Custom), Left Menu Drawer Toggle.
  - Left Drawer (Slide-out / Collapsible):
    - **A/B Experimentation Presets Card** (Quick toggle between Control vs Treatment).
    - **Social Proof & Badges Card** (Switches for Ratings chip, Views chip, view count stepper).
    - **Story & Description Card** (Switch for default collapsed, line clamp).
    - **Specifications & Sizing Card** (Switch for default collapsed with `(12)` attribute count).
    - **Discovery Rails Card** (Toggles for Color Variations, Similar Products, You May Like, Recently Viewed).
    - Reset to Defaults button.
  - Canvas: Active device hardware frame rendering `ProductDetailPage` configured with live `config` state.

- [ ] **Step 2: Build Storybook stories in `StoreConfigurationStudioPage.stories.tsx`**
  - Story: `DefaultWorkbench` (treatment preview on Mobile).
  - Story: `VariantAControlComparison` (control preview on Desktop).
  - Story: `DrawerExpandedCustomizer` (left drawer open for immediate inspection).

- [ ] **Step 3: Build Vayyari Component & Route**
  - Create `src/vayyari/components/tamagui-ui/pages/StoreConfigurationStudioPage.tsx` (using `@/components/icons/lu` and Vayyari theme).
  - Create route `src/vayyari/app/store/configuration.tsx` rendering `StoreConfigurationStudioPage`.

- [ ] **Step 4: Run full verification suite**
  Run: `npx tsc --noEmit --project src/apps/storybook/tsconfig.json --ignoreDeprecations 5.0`
  Run: `npm test --prefix src/vayyari -- --testPathPattern="curat|swatch|pdp|config"`
  Expected: PASS with 0 errors.

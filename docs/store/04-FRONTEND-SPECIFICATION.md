# 04: FRONTEND SPECIFICATION

**Tech Stack:** React Native Expo + Tamagui (storefront preview) | Next.js (production web)  
**Component Library:** Tamagui (cross-platform primitives) + `react-icons` (Lucide + Feather SVGs)  
**Component Architecture:** Atomic Design — Atoms → Molecules → Organisms → Templates → Pages  
**Storybook:** `EXPO_PUBLIC_STORYBOOK_ENABLED=true npx expo start --web --port 9999`  
**Last Updated:** 2026-08-31

---

## Implementation Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented and Storybook story exists |
| 🟡 | Partially implemented or story missing |
| 📋 | Specified, not yet implemented |

---

## Section 1: Design System & Theming

### 1.1 Theme Foundation

The design system uses a dark-mode-first premium aesthetic with warm gold accents, applied via Tamagui token system.

**Core Token Groups:**

| Token | Value | Usage |
|-------|-------|-------|
| `tokens.bg` | `#0e0e0e` | Page backgrounds |
| `tokens.surface` | `#1a1a1a` | Card / panel backgrounds |
| `tokens.border` | `rgba(255,255,255,0.08)` | Borders and dividers |
| `tokens.text` | `#e8e0d5` | Primary text |
| `tokens.textMuted` | `rgba(232,224,213,0.55)` | Secondary text |
| `tokens.accent` | `#d4af37` | Gold accent (CTA, highlights) |
| `tokens.accentSoft` | `rgba(212,175,55,0.12)` | Tinted backgrounds |

**Responsive Breakpoints:**

| Breakpoint | Variable | Threshold |
|------------|---------|-----------|
| Mobile | `isMobile` | `< 768px` |
| Tablet | `isTablet` | `768px – 1023px` |
| Desktop | `isDesktop` | `≥ 1024px` |
| Compact (mobile+tablet) | `isCompact` | `< 1024px` |

### 1.2 Typography

- **Font family:** System default (Inter via Expo Google Fonts is planned)
- **Title sizes:** 22px (section headings), 18px (product title), 13-14px (body)
- **Minimum legible size:** 11px (labels/badges)
- **Line height:** 1.4× font size standard

### 1.3 Daily Theme Engine (Planned)

CSS custom properties (`--color-primary`, `--color-secondary`, `--color-accent`) rotate daily:

| Day | Theme |
|-----|-------|
| Monday | Monochrome (blacks, whites, grays) |
| Tuesday | Jewel Tones (deep blues, purples, emerald) |
| Wednesday | Sunset (oranges, pinks, warm golds) |
| Thursday | Earth Tones (browns, ochres, terracottas) |
| Friday | Pastels (soft pinks, blues, greens) |
| Saturday | Metallics (golds, silvers, coppers) |
| Sunday | Warm Neutrals (beiges, taupes, creams) |

---

## Section 2: Atom Components

### 2.1 Badge ✅

**Purpose:** Status tag / label overlay (e.g., "34% Off", "New", "Bestseller")

**Design:**
- Generous padding per size: `sm: 10px`, `md: 14px`, `lg: 18px`
- Fixed pill heights: `22px (sm)`, `26px (md)`, `32px (lg)`
- Hover: soft luminosity glow (color-matched shadow, `shadowOpacity: 0.35`, `shadowRadius: 8px`) — **NOT** scale zoom
- Supports prefix icon (`icon?: React.ReactNode`)
- Shape: pill (full border-radius)

**Sizes:** `sm` | `md` | `lg`  
**Variants:** `success` | `warning` | `info` | `neutral`

### 2.2 CarouselDot ✅

**Purpose:** Gallery position indicator dots at bottom of carousel

**Design:**
- Active: white pill, `22px wide × 7px tall`
- Inactive: semi-transparent circle, `7px × 7px`
- Both absolutely positioned at hero bottom
- Tappable (navigates to specific slide)

### 2.3 Chip ✅

**Purpose:** Category filter pill (horizontal scroll row)

**States:** Default | Active (accent-colored) | Disabled

### 2.4 HeartButton ✅

**Purpose:** Wishlist toggle

**States:**
- Default: hollow heart icon (`LuHeart`)
- Wishlisted: filled icon, red border, tinted background (`#fff5f5`)

### 2.5 IconButton ✅

**Purpose:** Square icon-only action button

**Props:** `icon: React.ReactNode`, `size: number`, `onPress`

### 2.6 PriceTag ✅

**Purpose:** Dual-price display with struck-through original and highlighted offer

**Format:** `₹3,299  ~~₹4,999~~  34% Off`

### 2.7 RatingBadge ✅

**Purpose:** Star rating with count (e.g., `★ 4.5 (234)`)

### 2.8 ShareButton ✅

**Purpose:** Share product action — uses `FiShare2` from `react-icons/fi`

**Size:** 48×48px, identical styling to HeartButton

### 2.9 SizeChip ✅

**Purpose:** Size selection button (S / M / L / XL / One Size)

**States:** Default | Selected (accent border + bold) | Disabled (strikethrough — out of stock)

### 2.10 SwatchDot ✅

**Purpose:** Plain solid color swatch circle (legacy; use `CustomSwatchDot` for ethnic garments)

### 2.11 CustomSwatchDot ✅ ← NEW

**Purpose:** Renders ethnic garment swatch geometries for the 5 curated templates.

**Templates:**

| Template ID | Visual Design | Ethnic Use Case |
|-------------|--------------|----------------|
| `solid` | Single flat color fill | Monochrome body fabric |
| `contrast-border` | 80% body color (top) + 20% border color (bottom strip) with hairline divider | Sarees with contrasting zari/pallu border |
| `multi-tone` / `dual-tone` | 45° diagonal LinearGradient with dynamic color stops (2 tones: [0, 1]; 3 tones: [0, 0.5, 1]; 4 tones: [0, 0.33, 0.66, 1]) | Dhup-Chhaon iridescent silk (warp vs weft, multi-tone shimmer) |
| `multi-shade` / `half-and-half` | Dynamic geometry by count: **2 colors** = 50/50 vertical split; **3 colors** = 3-way pie structure (120° trisection wedges meeting at center); **4 colors** = "+" cross sectioning (2x2 Cartesian quadrants with center cross dividers) | Pleats vs. body/pallu multi-paneled sarees |
| `multicolor` | Static 4×4 micro-mosaic grid (16 distinct curated ethnic colors) | Bandhani tie-dye, kalamkari, digital prints, patchwork |

**Props:**
```ts
type CustomSwatchDotProps = {
  template: 'solid' | 'contrast-border' | 'multi-tone' | 'multi-shade' | 'multicolor';
  primaryColor: string;    // Slot A — dominant body color
  secondaryColor?: string; // Slot B — border/weft/split color
  tertiaryColor?: string;  // Slot C — third tone/stripe/quadrant
  quaternaryColor?: string;// Slot D — fourth tone/stripe/quadrant
  colors?: string[];       // Array of 2 to 9 colors for multi-tone, multi-shade, or multicolor grid
  colorCount?: 2 | 3 | 4;  // Number of colors for multi-shade (2-4 stripes) or multi-tone (2-4 stops)
  size?: number;           // Default: 36
  shape?: 'circle' | 'square'; // Default: 'circle'
  selected?: boolean;      // Shows accent selection ring
};
```

**Standard 32-Anchor Oklch Palette (for slot mapping):**
```
Pure White, Cream Beige, Sand Tan, Taupe Brown, Charcoal, Jet Black,
Ruby Red, Wine Maroon, Rose Pink, Blush Pink, Coral Salmon, Magenta,
Rust Burnt, Tangerine, Mustard, Pastel Lemon,
Olive Khaki, Mint Seafoam, Emerald, Lime Moss,
Powder Blue, Turquoise, Teal Peacock, Royal Blue, Navy Blue,
Lavender, Violet Plum, Antique Gold, Rose Gold, Silver, Multicolor
```
```

---

## Section 3: Molecule Components

### 3.1 ProductCard ✅

**Purpose:** Compact product preview card for grid/rail layouts with built-in picture carousel and long-press quick preview modal trigger.

**Layout:**
```
┌──────────────────────────────────────┐
│  1/4                              ♡  │  (clean count & plain heart toggle, no boxes)
│                                      │
│  [‹]        Image Carousel        [›]│  (prev/next arrows on hover)
│                                      │
│                 [ 👁 ]                │  (desktop hover eye icon without text)
│               ● ○ ○ ○                │  (pagination micro-dots)
├──────────────────────────────────────┤
│ ★ 4.8 · Handloom Silk   [●][◐][▤]    │  (mini swatch variant preview)
│ Product name (2 lines)               │  ← FIXED 2-line height (42px, lineHeight 20px)
│ ₹3,299  ~~₹4,999~~  34% off          │
└──────────────────────────────────────┘
```

**Key Rules:**
1. **Uniform Responsive Grid:** Grid container uses strict CSS Grid (`gridTemplateColumns: repeat(4, minmax(0, 1fr))` on desktop, 3 on tablet, 2 on mobile) with `gap: 16px`. Every card sets `flexGrow: 0, flexShrink: 0, width: '100%'`. This ensures Row 1, Row 2, and Row 3 have **strictly identical card dimensions** without stretching when the final row has fewer items.
2. **Picture Carousel:** Every card features an image carousel (`images: ProductCardImage[]`). Clicking the left/right chevrons or pagination micro-dots switches the active drape view (`e.stopPropagation()` prevents navigating to PDP).
3. **Long-Press & Quick Preview Triggers:**
   - **Tablet & Mobile Views:** Quick Preview triggers **exclusively on long press** (`onLongPress`, 400ms hold). No eye buttons or pills are rendered on compact touch screens.
   - **Desktop Views:** A sleek circular glassmorphic **eye icon button without text** appears on hover at the bottom of the photo (`38px` diameter, gold border). Clicking this icon opens the Quick Preview modal.
   - **Simple Click:** A standard click or tap anywhere on the product card **always opens the PDP page**.
4. **Baselines:** Fixed title container (`height: 42px`) ensures all price tags align across cards.
5. **Responsive Arrow Controls & Touch Swipe:** Chevron navigation arrows are **disabled by default on mobile and tablet** (where users naturally swipe), but **enabled on hover on desktop**. Developers can explicitly toggle with `showArrows` (`true` / `false`). Cards support natural touch and pointer swipe navigation across all screen sizes. Size can also be forced with `size="mobile" | "tablet" | "desktop" | "auto"`.
6. **Clean Overlay Aesthetics:**
   - **Slide Count (Top-Left):** Pure count only (`1/4`) without background pill or drape label text. Text shadow ensures legibility on any fabric.
   - **Wishlist Heart (Top-Right):** Plain heart icon without background box (`variant="plain"`). Toggles between white outline and filled crimson on click.

### 3.2 HorizontalProductCard ✅

**Purpose:** Horizontal compact card for "You May Also Cherish" recommendation strip

**Layout:**
```
[gradient  │ Brand   ]
[thumbnail │ Name    ]   ← Fixed 2-line height (height: 34px)
[          │ ₹Price  ]
```

**Key Rule:** Same fixed 2-line title height as ProductCard.

### 3.3 CategoryPill ✅

**Purpose:** Horizontally-scrollable category quick links

**Layout:** `[Icon + Label pill]` in a `ScrollView horizontal`

### 3.4 ColourCard ✅ ← UPDATED

**Purpose:** Full colour swatch card used in ColourSelector in `cards` format

**Layout:**
```
┌───────────────┐
│ Ethnic swatch │  72px tall canvas — renders CustomSwatchDot geometry
│ gradient or   │  (contrast-border / dual-tone / half-and-half / multicolor / solid)
│ template      │
├───────────────┤
│ Color label   │  11px
└───────────────┘
```

- Selected state: 2px accent border + bold label
- Card width: 68px fixed

### 3.5 PromoBanner ✅

**Purpose:** Full-width promotional strip (e.g., "Free shipping above ₹999")

### 3.6 SearchBar ✅

**Purpose:** Search input with `LuSearch` icon and clear (`LuX`) button

**Sizing:** `height={44}`, `maxHeight={44}`, `flexShrink={1}` — never unbounded flex (causes 800px+ stretch bug in web)

### 3.7 ReviewCard ✅

**Purpose:** Individual customer review (rating + text + author)

### 3.8 StickyAddToBagBar ✅

**Purpose:** Fixed bottom bar on mobile that appears when scrolled past the product panel

**Trigger:** `scrollY > productPanelBottom.current`  
**Layout:** `[price (18px bold) + title (12px truncated)] [Add to Bag pill button]`  
**Position:** `position: absolute, bottom: 0, height: 70, zIndex: 50`  
**Parent requirement:** Parent `ScrollView` needs `paddingBottom: 110` to avoid content hidden behind bar

### 3.9 Breadcrumbs ✅

**Purpose:** Navigation path (Home > Sarees > Product Name)

### 3.10 FilterSortBottomBar ✅

**Purpose:** Mobile bottom bar with Filter (`LuSlidersHorizontal`) and Sort (`LuArrowUpDown`) actions

---

## Section 4: Organism Components

### 4.1 Header ✅

**Icons used:** `LuMenu` (hamburger), `LuSearch`, `LuHeart`, `LuShoppingBag`, `LuX` (close)

**Mobile:**
```
┌─────────────────────────────────────────┐
│ ☰  VAYYARI          🔍  ♥  🛍          │
└─────────────────────────────────────────┘
```

**Desktop:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ VAYYARI   [Search bar]               Wishlist  Cart (badge)         │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 ProductGallery ✅ ← MAJOR UPDATE

**Purpose:** Media gallery with variant-aware photo grouping

**SwatchItem type (drives gallery):**
```ts
type GalleryImage = { id: string; label: string; gradient: [string, string] };

type SwatchItem = {
  label: string;
  gradient: [string, string];     // fallback gradient when no images array
  template?: SwatchTemplateType;  // controls CustomSwatchDot rendering
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  quaternaryColor?: string;
  images?: GalleryImage[];        // grouped photos for this color variant
};
```

**State:**
- `activeImageIndex`: tracks which photo within the current color variant's group is shown
- Resets to `0` when `selectedColor` changes

**Mobile Layout (< 768px):** Full-width circular-swipe carousel
```
┌───────────────────────────────────────┐
│ 1/4 badge (top-left)                  │
│                                       │  height: 390px
│  LinearGradient of active image       │  Circular swipe (PanResponder + touch)
│                                       │
│ ‹     Photo Label badge        ›      │
│           • ━ • •    dot indicators   │
└───────────────────────────────────────┘
```

**Tablet Layout (768–1023px):** Same full-width carousel, taller (460px)

**Desktop Layout (≥ 1024px):** Side thumbnails + hero canvas
```
┌──────────────┬─────────────────────────────┐
│ [thumb 1]    │                             │
│ [thumb 2]    │  Hero canvas (min 580px)    │
│ [thumb 3] ←  │  LinearGradient             │
│ [thumb 4]  active=accent border            │
│  (84px wide) │  ‹  1/N · Photo Label  ›   │
└──────────────┴─────────────────────────────┘
```

**Circular Navigation:**
- `handleNext`: `(prev + 1) % totalImages`
- `handlePrev`: `(prev - 1 + totalImages) % totalImages`
- Touch events captured via `PanResponder` (native) + `onTouchStart/onTouchEnd` (web)
- Swipe threshold: `|dx| > 30px` AND `|dx| > |dy|` (to prevent scroll conflicts)

### 4.3 ColourSelector ✅ ← UPDATED

**Purpose:** Color variant picker — renders CustomSwatchDot-based ethnic swatches

**Format options:** `'cards'` (ColourCard thumbnails) | `'dots'` (small CustomSwatchDot circles)

**Active state:** Shows template badge label (`"Contrast Border"`, `"Dhup-Chhaon Dual Tone"`, `"Half & Half"`, `"Multicolor"`, `"Pure Ivory Gold"`)

**ColourOption type:**
```ts
type ColourOption = {
  key: string;
  label: string;
  template?: SwatchTemplateType;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  quaternaryColor?: string;
  gradient?: [string, string];  // legacy fallback
  group?: string;               // grouping label (e.g., "Warm tones", "Neutrals")
};
```

### 4.4 FilterSidebar ✅ ← NEW (Desktop)

**Purpose:** Collapsible left filter sidebar for catalog page on desktop

**Behavior:**
- **Wide screen (≥ 1024px):** Stays expanded by default
- **Collapsed state:** Icon-only square button `[ ☰ ]` (38×38px) with active filter count badge
- **Expanded state:** Full sidebar with hamburger `[ ☰ ]` icon-only placed inside "FILTERS" header tab (no text label)
- Facets: collapsible accordions, in-facet search, checkboxes with item counts
- Active filter count shown in badge on collapsed button

**Hamburger placement rule:**
> When expanded → hamburger lives inside the FILTERS header (no label text)  
> When collapsed → only the icon square is shown (no sidebar visible)

### 4.5 FilterDrawer ✅ (Mobile/Tablet)

**Purpose:** Bottom sheet filter drawer for mobile and tablet

**Icons:** `LuFilter`, `LuSearch` (in-facet search), `LuCheck` (applied checkbox)

### 4.6 CartDrawer ✅

**Purpose:** Slide-in cart panel from right

**Each cart item shows:** Product name + selected color + selected size + price + quantity

### 4.7 SizeSelector ✅

**Purpose:** Size chip row (S / M / L / XL)

**One Size rule:** If product has no size variants, show single disabled "One Size" chip

### 4.8 SpecificationsPanel ✅

**Purpose:** Key-value spec grid (Material, Dimensions, Weight, etc.)

### 4.9 RatingsPanel ✅

**Purpose:** Aggregate star rating + bar chart + photo strip + review cards

### 4.10 FrequentlyBoughtTogether ✅

**Purpose:** Bundle recommendation section with combined price

### 4.11 HorizontalProductStrip ✅

**Purpose:** Horizontal scroller of HorizontalProductCards ("You May Also Cherish")

### 4.12 ProductGrid ✅

**Purpose:** Responsive product card grid for catalog page

---

## Section 5: Page Layouts

### 5.1 HomePage ✅

**Section structure (top to bottom):**

```
┌────────────────────────────────────┐
│ Header (sticky)                    │
├────────────────────────────────────┤
│ CategoryRow (horizontal pill strip)│
├────────────────────────────────────┤
│ Hero Banner (LinearGradient,       │
│ eyebrow + title + subtitle + CTA)  │
├────────────────────────────────────┤
│ Promo Banner (free shipping strip) │
├────────────────────────────────────┤
│ Featured Products Grid (2-col)     │
│ [ProductCard] [ProductCard]        │
│ [ProductCard] [ProductCard]        │
├────────────────────────────────────┤
│ "You May Also Cherish" Strip       │
│ [HorizontalProductCard] →          │
├────────────────────────────────────┤
│ Footer                             │
└────────────────────────────────────┘
```

**Hero content (confirmed):**
- Eyebrow: `"ROYAL FESTIVE EDIT 2026"`
- Title: `"The Golden Loom of Varanasi"`
- Subtitle: `"Hand-spun mulberry silk woven with electroplated pure gold zari."`

**Category pills (confirmed):**
`All Collections`, `Festive Handlooms`, `Pure Mulberry Silk`, `Banarasi Zari`, `Kanjivaram Weaves`, `Designer Kurtas`, `Fine Jewellery`, `Heritage Home`

### 5.2 CatalogPage ✅

**Mobile/Tablet layout:**
```
┌────────────────────────────────────┐
│ Header                             │
├────────────────────────────────────┤
│ Breadcrumbs                        │
│ Active filter chips (horizontal)   │
│ [FilterSortBottomBar] (sticky bot) │
├────────────────────────────────────┤
│ ProductGrid (2-col)                │
│ [Card][Card]                       │
│ [Card][Card]                       │
│ ...                                │
└────────────────────────────────────┘
```

**Desktop layout:**
```
┌─────────────────┬──────────────────────────────────┐
│ FilterSidebar   │ Breadcrumbs + Sort controls       │
│ (collapsible)   │                                   │
│ [ ☰ FILTERS ]  │ ProductGrid (3–4 col)             │
│   Fabric        │ [Card][Card][Card]                │
│   Price         │ [Card][Card][Card]                │
│   Color         │ ...                               │
│   ...           │                                   │
└─────────────────┴──────────────────────────────────┘
```

**Sort options (confirmed):**  
`What's new`, `Price - high to low`, `Popularity`, `Discount`, `Price - low to high`, `Customer Rating`

**Filter facets (confirmed):**  
`Fabric` (Mulberry Silk, Banarasi Brocade, Organza, Chanderi Zari, Linen Blend)  
`Price` (Under ₹2k, ₹2k–₹3.5k, ₹3.5k–₹5k, Above ₹5k)  
`Color` (Gold/Ivory, Rose Pink, Slate Blue, Emerald Green)  
`Occasion` (Festive, Casual, Bridal, Office, Daily Wear)

### 5.3 ProductDetailPage ✅

**Mobile/Tablet layout (isCompact = true):**
```
┌─────────────────────────────────────┐
│ Header (sticky)                     │
├─────────────────────────────────────┤
│ ProductGallery (circular carousel)  │  390px (mobile) / 460px (tablet)
│ ━ • • •   dot indicator + arrows   │
├─────────────────────────────────────┤
│ ColourSelector ← directly below gallery │
│ [CustomSwatchDot] [Swatch] [Swatch] │
│ Active: "Contrast Border" badge     │
├─────────────────────────────────────┤
│ Product title + category chip       │
│ ₹3,299  ~~₹4,999~~  34% Off        │
│ ★ 4.5  (234 reviews)               │
├─────────────────────────────────────┤
│ Size selector (S / M / L / XL)      │
├─────────────────────────────────────┤
│ [🔗 Share]  [❤ Wishlist]           │
│ (icon only — no inline Add to Bag)  │
├─────────────────────────────────────┤
│ Product description                 │
├─────────────────────────────────────┤
│ Specifications grid                 │
├─────────────────────────────────────┤
│ Ratings & Reviews                   │
├─────────────────────────────────────┤
│ Frequently Bought Together          │
├─────────────────────────────────────┤
│ You May Also Cherish strip          │
├─────────────────────────────────────┤
│ [Sticky Add to Bag bar at bottom]   │  appears when scrolled past product panel
└─────────────────────────────────────┘
```

**Desktop layout (isCompact = false):**
```
┌──────────────────────────────────────────────────────┐
│ Header (sticky)                                      │
├──────────────────────────────────────────────────────┤
│ [gallery+thumbs  flex:1.1] │ [purchase panel sticky] │
│   [thumb1 84px]  │ Hero   │ Product name             │
│   [thumb2]       │ Canvas │ ₹3,299  ~~₹4,999~~ 34%  │
│   [thumb3] ←     │ 580px  │ ColourSelector (cards)  │
│   active border  │        │ SizeSelector             │
│                  │        │ [Add to Bag] [🔗] [❤]  │
├──────────────────────────────────────────────────────┤
│ Product description (full width below fold)          │
│ Specifications                                       │
│ Ratings & Reviews                                    │
│ Frequently Bought Together                           │
│ You May Also Cherish                                 │
└──────────────────────────────────────────────────────┘
```

**State variables:**
- `selectedColor`: active swatch key (drives gallery photo group + swatch highlight)
- `selectedSize`: active size chip
- `wishlisted`: heart button state
- `cartOpen`: cart drawer visibility
- `cartItems`: cart item list

**Confirmed color variants on the demo PDP:**

| Key | Label | Template | Colors |
|-----|-------|----------|--------|
| `navy_pink` | Navy & Rani Pink | `contrast-border` | Body: `#1565C0`, Border: `#E91E63` |
| `purple_emerald` | Violet & Emerald Dhup-Chhaon | `dual-tone` | Warp: `#6A1B9A`, Weft: `#2E7D32` |
| `mustard_green` | Mustard & Bottle Green | `half-and-half` | Left: `#FBC02D`, Right: `#1B5E20` |
| `bandhani_multi` | Festive Bandhani Multi | `multicolor` | Red/Yellow/Green/Blue quadrants |
| `ivory_gold` | Pure Ivory Gold | `solid` | Body: `#D4AF37` |

**Each variant has 3–4 grouped photos** (e.g., front drape, border close-up, pleat texture, blouse piece).

---

## Section 6: Color Tagging & Reviewer Curation Workflow ← NEW

### 6.1 Three-Step Lifecycle

```
Step 1: Automated Ingestion
  MinIO Upload → Python K-Means (k=3) → Dominant hex colors + % → Map to 21 standard palette

Step 2: Reviewer Curation Portal (Internal Tool)
  a. View N auto-extracted candidate colors (priority quick-picks)
  b. Select swatch template (Solid / Contrast Border / Dual-Tone / Half-and-Half / Multicolor)
  c. Assign colors to swatch positions (A=primary, B=secondary, C=tertiary, D=quaternary)
     - Auto-extracted colors shown first as suggestions
     - Reviewer has full freedom to pick any of the 21 normalized palette colors
  d. Group multiple product photos to this color tag (checkbox selection)
  e. Publish swatch → available in storefront

Step 3: Customer Storefront
  PLP: Customers filter by reviewer-curated swatch tags (not raw auto-extracted clusters)
  PDP: Selecting a swatch loads only that variant's grouped photos in the carousel
```

### 6.2 K-Means Microservice Spec

- **Implementation:** Python FastAPI
- **Algorithm:** K-Means (`k=3`)
- **Pre-processing:** Downsample to 200×200px; filter near-white (`>240`) and near-black (`<15`) pixels
- **Output:** Array of `{hex, family, percentage}` sorted by coverage
- **Normalization:** CIEDE2000/CIELAB ΔE distance from extracted hex to nearest of 21 standard palette families

### 6.3 ReviewerColorCuration — Storybook Story ✅

Story at `Organisms/ReviewerColorCuration` demonstrates:
- Auto-extracted K-Means candidate color chips (name + hex + %)
- Template picker (5 options with live preview using current slot colors)
- Slot A assignment (with priority auto-suggestions)
- Slot B assignment (with auto-suggestions + toggle to full 21-color palette picker)
- Photo checklist (multi-select for grouping)
- Live storefront preview (generated swatch + photo count + filter tags)

---

## Section 7: Flexbox Guardrails (Cross-Platform)

These rules prevent Tamagui/RN Web layout bugs:

1. **Horizontal ScrollView children must not stretch:**
   - Always set `style={{ flexGrow: 0 }}` and `contentContainerStyle={{ alignItems: 'flex-start' }}`
   - Cards inside horizontal strips: `alignSelf="flex-start"` + `flexShrink={0}`

2. **Search bars must have bounded height:**
   - Always `height={44}`, `maxHeight={44}`, `flexShrink={1}`
   - Never unbounded `flex={1}` in vertical parent (causes 800px+ stretch in web)

3. **Sticky bottom bars:**
   - `position="absolute"`, `bottom: 0`, `left: 0`, `right: 0`, `zIndex: 50`
   - Parent `ScrollView` needs `paddingBottom: 110`

---

## Section 8: Component Inventory

### Atoms

| Component | File | Storybook | Status |
|-----------|------|-----------|--------|
| Badge | `atoms/Badge/Badge.tsx` | ✅ | ✅ |
| CarouselDot | `atoms/CarouselDot/CarouselDot.tsx` | ✅ | ✅ |
| Chip | `atoms/Chip/Chip.tsx` | ✅ | ✅ |
| HeartButton | `atoms/HeartButton/HeartButton.tsx` | ✅ | ✅ |
| IconButton | `atoms/IconButton/IconButton.tsx` | ✅ | ✅ |
| PriceTag | `atoms/PriceTag/PriceTag.tsx` | ✅ | ✅ |
| RatingBadge | `atoms/RatingBadge/RatingBadge.tsx` | ✅ | ✅ |
| ShareButton | `atoms/ShareButton/ShareButton.tsx` | ✅ | ✅ |
| SizeChip | `atoms/SizeChip/SizeChip.tsx` | ✅ | ✅ |
| SwatchDot | `atoms/SwatchDot/SwatchDot.tsx` | ✅ | ✅ |
| CustomSwatchDot | `atoms/SwatchDot/CustomSwatchDot.tsx` | ✅ | ✅ New |

### Molecules

| Component | File | Storybook | Status |
|-----------|------|-----------|--------|
| ProductCard | `molecules/ProductCard/ProductCard.tsx` | ✅ | ✅ |
| HorizontalProductCard | `molecules/HorizontalProductCard/HorizontalProductCard.tsx` | ✅ | ✅ |
| CategoryPill | `molecules/CategoryPill/CategoryPill.tsx` | ✅ | ✅ |
| ColourCard | `molecules/ColourCard/ColourCard.tsx` | ✅ | ✅ Updated |
| PromoBanner | `molecules/PromoBanner/PromoBanner.tsx` | ✅ | ✅ |
| SearchBar | `molecules/SearchBar/SearchBar.tsx` | ✅ | ✅ |
| ReviewCard | `molecules/ReviewCard/ReviewCard.tsx` | ✅ | ✅ |
| StickyAddToBagBar | `molecules/StickyAddToBagBar/StickyAddToBagBar.tsx` | ✅ | ✅ |
| Breadcrumbs | `molecules/Breadcrumbs/Breadcrumbs.tsx` | ✅ | ✅ |
| FilterSortBottomBar | `molecules/FilterSortBottomBar/FilterSortBottomBar.tsx` | ✅ | ✅ |
| SortBottomSheet | `molecules/SortBottomSheet/SortBottomSheet.tsx` | ✅ | ✅ |
| SpecificationRow | `molecules/SpecificationRow/SpecificationRow.tsx` | ✅ | ✅ |

### Organisms

| Component | File | Storybook | Status |
|-----------|------|-----------|--------|
| Header | `organisms/Header/Header.tsx` | ✅ | ✅ |
| TopNav | `organisms/TopNav/TopNav.tsx` | ✅ | ✅ |
| CategoryRow | `organisms/CategoryRow/CategoryRow.tsx` | ✅ | ✅ |
| ProductGallery | `organisms/ProductGallery/ProductGallery.tsx` | ✅ | ✅ Updated |
| ColourSelector | `organisms/ColourSelector/ColourSelector.tsx` | ✅ | ✅ Updated |
| SizeSelector | `organisms/SizeSelector/SizeSelector.tsx` | ✅ | ✅ |
| FilterSidebar | `organisms/FilterSidebar/FilterSidebar.tsx` | ✅ | ✅ New |
| FilterDrawer | `organisms/FilterDrawer/FilterDrawer.tsx` | ✅ | ✅ |
| CartDrawer | `organisms/CartDrawer/CartDrawer.tsx` | ✅ | ✅ |
| ProductGrid | `organisms/ProductGrid/ProductGrid.tsx` | ✅ | ✅ Updated |
| QuickPreviewModal | `organisms/QuickPreviewModal/QuickPreviewModal.tsx` | ✅ | ✅ New |
| HorizontalProductStrip | `organisms/HorizontalProductStrip/HorizontalProductStrip.tsx` | ✅ | ✅ |
| FrequentlyBoughtTogether | `organisms/FrequentlyBoughtTogether/FrequentlyBoughtTogether.tsx` | ✅ | ✅ |
| SpecificationsPanel | `organisms/SpecificationsPanel/SpecificationsPanel.tsx` | ✅ | ✅ |
| RatingsPanel | `organisms/RatingsPanel/RatingsPanel.tsx` | ✅ | ✅ |
| MoreLinksCard | `organisms/MoreLinksCard/MoreLinksCard.tsx` | ✅ | ✅ |
| BrandMark | `organisms/BrandMark/BrandMark.tsx` | ✅ | ✅ |

### Templates

| Component | File | Status |
|-----------|------|--------|
| StorefrontTemplate | `templates/StorefrontTemplate.tsx` | ✅ |
| CatalogTemplate | `templates/CatalogTemplate.tsx` | ✅ |
| ProductDetailTemplate | `templates/ProductDetailTemplate.tsx` | ✅ |

### Pages

| Component | File | Status |
|-----------|------|--------|
| HomePage | `pages/HomePage.tsx` | ✅ |
| CatalogPage | `pages/CatalogPage.tsx` | ✅ |
| ProductDetailPage | `pages/ProductDetailPage.tsx` | ✅ |

---

## Section 9: Acceptance Criteria Checklist

### PDP

- [x] Mobile gallery: full-width hero carousel + circular swipe + dot indicators
- [x] Tablet gallery: same full-width carousel (460px height)
- [x] Color selector appears directly below carousel on mobile AND tablet
- [x] Color selector stays in the purchase panel sidebar on desktop
- [x] Selecting a swatch resets gallery to photo 1 of that color variant's group
- [x] Gallery circularly navigates through only that variant's grouped photos
- [x] Desktop: side thumbnail strip shows thumbnails for active color variant's photos
- [x] Slide counter badge (`1 / N`) reflects current photo of active variant
- [x] Photo label badge shows the description of the current photo
- [x] Heart icon: hollow → filled red on wishlist toggle
- [x] Sticky Add to Bag bar appears when scrolled past product panel
- [x] Cart drawer shows selected color name + size
- [x] Five ethnic variants (navy_pink, purple_emerald, mustard_green, bandhani_multi, ivory_gold) render correctly

### Catalog

- [x] FilterSidebar stays expanded by default on ≥1024px screens
- [x] Hamburger icon inside FILTERS header tab when expanded (no text label)
- [x] Icon-only collapsed button shown when sidebar is collapsed
- [x] FilterDrawer opens from bottom on mobile/tablet
- [x] Product cards have uniform 2-line name height with ellipsis

### Design System

- [x] All icons use `react-icons` (Lucide + Feather)
- [x] Badge hover uses soft glow, not scale zoom
- [x] CustomSwatchDot renders all 5 ethnic templates correctly
- [x] `STANDARD_PALETTE` exported from `CustomSwatchDot.tsx` for reviewer portal use

---

**Status:** 🟢 Current and aligned with implementation  
**Last Updated:** 2026-08-31

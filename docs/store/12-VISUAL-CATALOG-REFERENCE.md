# 12: VISUAL REFERENCE — CATALOG PAGE

## Purpose

Defines the layout, filter system, sort controls, and product grid behavior for the VAYYARI catalog page. This is the primary product discovery surface.

> **Last Updated:** 2026-08-31 — Aligned with FilterSidebar hamburger behavior and responsive layout decisions.

---

## 1. Catalog Page Objective

Customers must be able to:
1. Browse the full product grid
2. Narrow results by faceted filters (Fabric, Price, Color, Occasion)
3. Sort results by relevance, price, or rating
4. Navigate to a product detail page

---

## 2. Mobile Layout (< 768px)

```
┌──────────────────────────────────────────┐
│ HEADER (sticky)                          │
│ ☰  VAYYARI          🔍  ♥  🛍           │
├──────────────────────────────────────────┤
│ Home > Handloom Sarees   (Breadcrumbs)  │
├──────────────────────────────────────────┤
│ [Active filter chips — horizontal scroll]│
│ [Mulberry Silk ×] [₹2k–₹3.5k ×]        │
├──────────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐              │
│ │ ProductCard │  │ ProductCard │         │  2-column grid
│ │  image   │  │  image   │              │
│ │ Name     │  │ Name     │              │
│ │ (2 lines)│  │ (2 lines)│              │  ← FIXED 2-line height
│ │ ₹ price  │  │ ₹ price  │              │
│ └──────────┘  └──────────┘              │
│ ┌──────────┐  ┌──────────┐              │
│ │    ...   │  │    ...   │              │
│ └──────────┘  └──────────┘              │
│                                         │
│  [more cards...]                        │
│                                         │
└──────────────────────────────────────────┘
══════════════════════════════════════════  ← fixed bottom bar
│ [🔧 Filter & Sort]  [↕ Sort]            │  FilterSortBottomBar (z=50)
══════════════════════════════════════════

  [Filter icon tapped → FilterDrawer opens from bottom]
  [Sort icon tapped  → SortBottomSheet opens from bottom]
```

---

## 3. Tablet Layout (768–1023px)

Same as mobile with these differences:

| Property | Mobile | Tablet |
|----------|--------|--------|
| Grid columns | 2 | 2 (wider cards) |
| FilterSortBottomBar | Shown | Shown |
| FilterDrawer | Bottom sheet | Bottom sheet |
| Card size | ~48% width | ~48% width (wider) |

---

## 4. Desktop Layout (≥ 1024px)

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER (sticky)                                                  │
│ VAYYARI [Search]                               Wishlist  Cart   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌───────────────────┐  ┌──────────────────────────────────────┐ │
│ │  FILTERS  [☰]     │  │ Home > Handloom Sarees    Sort: ↕ ▼  │ │
│ │ ─────────────────  │  ├──────────────────────────────────────┤ │
│ │ ▸ Fabric           │  │                                      │ │
│ │   ☐ Mulberry Silk  │  │ ┌────────┐ ┌────────┐ ┌────────┐   │ │
│ │   ☐ Banarasi       │  │ │ Card   │ │ Card   │ │ Card   │   │ │
│ │   ☐ Organza        │  │ │  img   │ │  img   │ │  img   │   │ │
│ │ ─────────────────  │  │ │ name   │ │ name   │ │ name   │   │ │
│ │ ▸ Price            │  │ │ price  │ │ price  │ │ price  │   │ │
│ │   ☐ Under ₹2,000   │  │ └────────┘ └────────┘ └────────┘   │ │
│ │   ☐ ₹2k – ₹3.5k   │  │                                      │ │
│ │ ─────────────────  │  │ ┌────────┐ ┌────────┐ ┌────────┐   │ │
│ │ ▸ Color            │  │ │  ...   │ │  ...   │ │  ...   │   │ │
│ │   ☐ Gold / Ivory   │  │ └────────┘ └────────┘ └────────┘   │ │
│ │ ─────────────────  │  │                                      │ │
│ │ ▸ Occasion         │  │  (3–4 columns depending on width)    │ │
│ └───────────────────┘  └──────────────────────────────────────┘ │
│   FilterSidebar              ProductGrid                        │
│   (270px fixed)                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. FilterSidebar Behavior (Desktop)

### 5.1 Expanded State (default on ≥ 1024px)

```
┌──────────────────────────────┐
│  FILTERS  [☰]               │  ← hamburger icon INSIDE the header tab (no label text)
│ ──────────────────────────── │
│  [🔍 Search filters...]      │
│                              │
│  ▸ FABRIC                   │  Accordion section
│    ☐ Mulberry Silk  (148)   │
│    ☐ Banarasi        (92)   │
│    ☐ Organza          (64)   │
│                              │
│  ─────────────────────────── │
│  ▸ PRICE                    │
│    ☐ Under ₹2,000    (84)   │
│    ☐ ₹2,000 – ₹3,500(215)  │
│                              │
│  ─────────────────────────── │
│  ▸ COLOR                    │
│    ☐ Gold / Ivory     (88)  │
│    ☐ Rose Pink        (65)  │
│                              │
│  ─────────────────────────── │
│  ▸ OCCASION                 │
│    ☐ Festive           (…)  │
│    ☐ Casual            (…)  │
└──────────────────────────────┘
  Width: 270px
```

### 5.2 Collapsed State

```
┌──────┐
│  ☰  │  ← Icon-only 38×38px square button
│[3]  │    Active filter count badge (top-right)
└──────┘
```

### 5.3 Expansion Trigger

| Condition | Behavior |
|-----------|----------|
| Width ≥ 1024px on initial load | Expanded |
| Width < 1024px | Sidebar hidden; FilterDrawer used instead |
| User clicks hamburger in header | Toggles expanded/collapsed |
| User clicks collapsed square button | Expands |

### 5.4 Rule: Hamburger Placement

> **When expanded:** The `[☰]` hamburger icon lives inside the "FILTERS" section header. It has **no text label** next to it.
>
> **When collapsed:** Only the icon-only `[☰]` square button is visible. The full sidebar is hidden.

---

## 6. Filter Facets

| Facet | Options |
|-------|---------|
| Fabric | Mulberry Silk (148), Banarasi Brocade (92), Organza (64), Chanderi Zari (45), Linen Blend (38) |
| Price | Under ₹2,000 (84), ₹2,000–₹3,500 (215), ₹3,500–₹5,000 (140), Above ₹5,000 (62) |
| Color | Gold/Ivory (88), Rose Pink (65), Slate Blue (42), Emerald Green (39) |
| Occasion | Festive, Casual, Bridal, Office, Daily Wear |
| Availability | In Stock only (toggle) |

---

## 7. Sort Options

| Sort ID | Label |
|---------|-------|
| `whatsNew` | What's new |
| `priceDesc` | Price - high to low |
| `popular` | Popularity |
| `discount` | Discount |
| `priceAsc` | Price - low to high |
| `rating` | Customer Rating |

---

## 8. Product Card Rules

```
┌─────────────────────────┐
│                         │  Aspect ratio: 3:4
│  Gradient / Image       │  Rounded corners: 12px
│                         │
│  [34% Off] badge       │  top-left badge
│                [❤]     │  top-right wishlist
│                         │
├─────────────────────────┤
│ VAYYARI (brand, 11px)  │
│ ─────────────────────── │
│ Ivory Gold Saree        │  ← 2-line fixed height (height: 42px)
│ with Zari Border…       │  lineHeight: 20px, ellipsis on overflow
├─────────────────────────┤
│ ₹3,299  ~~₹4,999~~     │
│ 34% Off                 │
├─────────────────────────┤
│ ★ 4.5  (234)           │
└─────────────────────────┘
```

**Key rule:** Product name container has `height: 42px` regardless of text length.
- Short names leave vertical whitespace below the text
- Long names truncate at 2 lines with ellipsis
- This ensures all cards in a row have identical heights

---

## 9. Acceptance Criteria

- [x] FilterSidebar expands by default on desktop (≥ 1024px)
- [x] Hamburger icon inside FILTERS header tab when expanded — no text label
- [x] Collapsed state shows icon-only square with active filter count badge
- [x] FilterDrawer opens from bottom on mobile and tablet (no sidebar)
- [x] FilterSortBottomBar hidden on desktop (sidebar replaces it)
- [x] Product cards have fixed 2-line name height with ellipsis
- [x] Sort bottom sheet opens on Sort tap (mobile/tablet)
- [x] Active filter chips shown in horizontal row below breadcrumbs
- [x] Chip close (×) removes that filter immediately
- [x] Grid is 2-col mobile/tablet, 3–4 col desktop (responsive)

---

**Status:** 🟢 Current  
**Last Updated:** 2026-08-31

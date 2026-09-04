# VAYYARI: E-Commerce Platform — Product Specification Index

## Project Summary

**VAYYARI** is a curated ethnic fashion e-commerce platform for traditional handlooms and artisan garments, targeting the Indian domestic market with an emphasis on authentic craftsmanship, premium UX, and mobile-first purchasing.

**Brand Name:** VAYYARI  
**App Name:** VAYYARI (single brand)  
**Primary Category:** Ethnic Sarees, Handlooms, Artisan Garments  
**Tech Stack:** React Native (Expo) + Tamagui (cross-platform storefront preview); Next.js (production web storefront); .NET backend  
**Last Updated:** 2026-08-31

---

## Document Structure

### Foundation Documents

| # | Document | Status | Notes |
|---|----------|--------|-------|
| [01](01-VISION-AND-SCOPE.md) | Vision & Scope | 🟢 Stable | Confirmed — ethnic handlooms, women 35–65 primary |
| [02](02-USER-PERSONAS-AND-JOURNEYS.md) | User Personas & Journeys | 🟡 Needs update | Original personas still valid; add reviewer persona |
| [03](03-CAPABILITIES-AND-FEATURES.md) | Capabilities & Features | 🟡 Partially outdated | Color tagging and curation capabilities missing |
| [04](04-FRONTEND-SPECIFICATION.md) | Frontend Specification | 🟡 Partially outdated | Ethnic swatch system and new filter sidebar not reflected |
| [05](05-BUSINESS-RULES.md) | Business Rules | 🟡 Needs detail | Needs color curation workflow rules |

### Visual Reference Documents (Wireframes-as-Code)

| # | Document | Status | Notes |
|---|----------|--------|-------|
| [10](10-VISUAL-HOMEPAGE-REFERENCE.md) | Homepage Visual Reference | 🟢 Stable | Confirmed layout |
| [11](11-VISUAL-NAVIGATION-REFERENCE.md) | Navigation Visual Reference | 🟢 Stable | |
| [12](12-VISUAL-CATALOG-REFERENCE.md) | Catalog Visual Reference | 🟡 Needs filter sidebar update | FilterSidebar with hamburger not reflected |
| [13](13-VISUAL-PDP-REFERENCE.md) | PDP Visual Reference | 🟡 Needs ethnic swatch update | Old simple dots; new custom swatch system not reflected |
| [14](14-VISUAL-COMPONENT-BIBLE.md) | Component Bible | 🟡 Needs update | CustomSwatchDot and ethnic templates missing |

### Technical Documents

| # | Document | Status | Notes |
|---|----------|--------|-------|
| [06](06-DATA-MODEL.md) | Data Model | 🟡 Needs update | ProductColorVariant entity for swatch grouping missing |
| [07](07-BACKEND-ARCHITECTURE.md) | Backend Architecture | 🟡 Needs update | K-Means microservice and reviewer curation API missing |
| [08](08-INTEGRATIONS.md) | Integrations | 🟡 Needs update | MinIO media ingestion and K-Means service missing |
| [09](09-DECISIONS-AND-OPEN-QUESTIONS.md) | Decisions & Open Questions | 🟡 Partially outdated | Several decided questions not marked resolved |

---

## Quick Reference — Confirmed Implementation Decisions

> These are decisions made and implemented during the current development session. They supersede any conflicting content in older spec documents.

| Domain | Decision | Status |
|--------|----------|--------|
| **Tech Stack** | React Native Expo + Tamagui (cross-platform UI) with Storybook for component catalog | ✅ Implemented |
| **Icons** | `react-icons` library (Lucide + Feather icons) across all components | ✅ Implemented |
| **Atomic Design** | Atoms → Molecules → Organisms → Templates → Pages hierarchy enforced | ✅ Implemented |
| **Mobile Carousel** | Full-width circular-swipe carousel on mobile AND tablet (PanResponder + touch events) | ✅ Implemented |
| **Tablet PDP Layout** | Tablet uses same carousel + color selector below carousel (same as mobile) | ✅ Implemented |
| **Desktop PDP Layout** | Side thumbnail strip (84px wide) + hero canvas + inline Add to Bag in sticky right panel | ✅ Implemented |
| **Color Selection Position** | Color selector sits directly below carousel on mobile & tablet; inside purchase panel on desktop | ✅ Implemented |
| **Filter UI — Mobile/Tablet** | Bottom sheet Filter drawer (FilterDrawer) | ✅ Implemented |
| **Filter UI — Desktop** | Collapsible left sidebar (FilterSidebar) with hamburger inside FILTERS header tab | ✅ Implemented |
| **Filter Sidebar — Wide Screen** | Stays expanded by default when `width >= 1024px` | ✅ Implemented |
| **Filter Hamburger Position** | When expanded: icon-only inside FILTERS header tab (no text). When collapsed: icon-only square button | ✅ Implemented |
| **Product Card Height** | Fixed 2-line height for name (`height: 42px, lineHeight: 20px`) with ellipsis for overflow | ✅ Implemented |
| **Badge Hover Effect** | Soft luminosity glow (shadow-based) instead of scale zoom on hover | ✅ Implemented |
| **Ethnic Swatch System** | 5 custom swatch templates with geometric rendering (see Section 8.8 in planner.md) | ✅ Implemented |
| **Swatch Types** | Solid, Contrast Border (80/20), Multi-Tone/Dhup-Chhaon (dynamic 2-4 tone gradient stops), Multi-Shade (2=split, 3=pie, 4=+ cross), Multicolor Grid (static 4x4 micro-mosaic) | ✅ Implemented |
| **Standard Color Palette** | 32 perceptually-uniform anchors in Oklch space, distributed across L/C/H axes for clean segmentation | ✅ Implemented |
| **Color Tagging Pipeline** | 4-step: Background masking → Oklab K-Means (k=3) → Delta E CIE2000 normalization → Reviewer Curation Portal | ✅ Specified |
| **Reviewer Priority** | Auto-extracted colors shown as priority quick-picks; reviewer has full freedom to pick any of the 32 Oklch anchors | ✅ Specified |
| **Photo Grouping** | Multiple photos of a product can be grouped to a specific color swatch tag | ✅ Implemented |
| **Gallery Behavior** | Selecting a color swatch dynamically swaps gallery to only that swatch variant's grouped photos | ✅ Implemented |
| **Customer Filter Rule** | PLP customers filter by **reviewer-curated tags** (not raw auto-extracted colors) | ✅ Specified |
| **Storybook** | `EXPO_PUBLIC_STORYBOOK_ENABLED=true` flag; Storybook serves on port 9999 | ✅ Implemented |

---

## How to Use This Specification

1. **For new features:** Read relevant spec docs, then check the confirmed decisions table above for overrides.
2. **For implementation:** The Storybook at `localhost:9999` is the canonical visual reference.
3. **For planning:** Use `planner.md` in `.agents/agents/` for the full decision log and architectural sections (8.1–8.8).
4. **For component details:** See individual component files in `ecommerce-preview/src/components/`.

---

**Last Updated:** 2026-08-31  
**Implemented By:** Antigravity AI  
**Storybook Preview:** `cd ecommerce-preview && EXPO_PUBLIC_STORYBOOK_ENABLED=true npx expo start --web --port 9999`

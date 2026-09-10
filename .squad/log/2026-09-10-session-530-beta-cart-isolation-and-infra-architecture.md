# Session Log: 2026-09-10 (Beta Cart Isolation & Infrastructure / Document DB Architecture)

## Context & Objectives
- **User Request**:
  1. Revert changes to existing `CartPage.tsx` and `CartPage.stories.tsx` to maintain the standard eCommerce shopping bag (coupons, donations, pincode checker, checkout steps).
  2. Create a dedicated `BetaCart` component and storybook stories under `Pages/Store - Beta/Beta Cart`.
  3. Ensure the Beta Cart has **NO coupons section** and **NO support/donation section**, focusing purely on:
     - 30-Day Anonymous Device-Synced Bag banner.
     - Line items list with quantity and size controls.
     - Price details summary with FREE delivery.
     - 1-Click WhatsApp Order Handoff (`📲 Order via WhatsApp`).
     - Shareable Cart URL box (`store.vayyari.com/cart/share/{shareToken}`).
     - Shared Cart Sales Concierge View mode (`isSharedView = true`) with `Import to Order Builder ➔`.
  4. Architectural consultation on leveraging existing deployed infrastructure (PostgreSQL, MinIO, Redis, Qdrant, Kafka) and evaluating the role of Document DBs at this stage.

## Changes Implemented

### 1. Reverted Standard Cart Component & Stories
- **File**: `src/apps/storybook/src/components/pages/CartPage.tsx`
  - Restored full eCommerce checkout flow: `CartHeader` (`BAG` -> `ADDRESS` -> `PAYMENT`), `DeliveryPincodeChecker`, `CouponSection`, `ArtisanSupportDonation`, `PriceDetailsCard`, and `CrossSellRecommendationsRail`.
- **File**: `src/apps/storybook/src/stories/pages/CartPage.stories.tsx`
  - Restored stories: `1. Standard Shopping Bag (1200px Desktop)`, `2. Mobile Shopping Bag (390px Viewport)`, and `3. Empty Shopping Bag`.

### 2. Built Dedicated Beta Cart Component & Stories
- **File**: `src/apps/storybook/src/components/pages/BetaCart/BetaCartPage.tsx`
  - **Zero Multi-Step Friction**: Clean Beta Header with device sync badge.
  - **No Coupons & No Support Donations**: Stripped non-essential friction points.
  - **Anonymous Device-Synced Bag**: 30-day banner linking to `vy_device_id`.
  - **1-Click WhatsApp Order Handoff**: Green `#25D366` button generating itemized message with SKU names, quantities, and share URL.
  - **Shareable Link Box**: 1-click clipboard copy for `https://store.vayyari.com/cart/share/{shareToken}`.
  - **Shared Cart View (`isSharedView = true`)**: Emerald concierge banner with `Import to Order Builder ➔`.
  - **Beta Price Details**: Clean breakdown (Total MRP, Discount, Delivery: FREE, Final Total).
  - **Mobile Sticky Bar**: Dedicated WhatsApp order CTA for mobile viewports.
- **File**: `src/apps/storybook/src/components/pages/BetaCart/index.ts`
- **File**: `src/apps/storybook/src/stories/pages/BetaCart/BetaCartPage.stories.tsx`
  - Registered stories under CSF title: `Pages/Store - Beta/Beta Cart`:
    - `1. Device-Synced Beta Bag (WhatsApp Order CTA & Share Token)`
    - `2. Shared Cart View (Sales Concierge Perspective)`
    - `3. Mobile PWA Beta Bag (390px Viewport)`
    - `4. Empty Beta Bag`

### 3. Storybook Aliases
- **File**: `src/apps/storybook/.storybook/index.tsx`
  - Added legacy & quick URL aliases: `pages-store-beta-cart`, `pages-store-beta-beta-cart`, `pages-store-beta-bag`, `pages-beta-cart`, `pages-beta-bag`.

### 4. Infrastructure & Architecture Consultation
- **Leveraging Existing Infrastructure**:
  - Store App directly leverages the already deployed core infrastructure:
    - **PostgreSQL 18 (`krikanpg` via `pgbouncer:6432`)**: Dedicated `store_*` schema/tables with transaction connection pooling.
    - **MinIO S3**: Dedicated `store-media` bucket (or `/store/` prefix) for public storefront CDN delivery.
    - **Redis**: Temporary cart state, SKU view counts, and rate limiting.
    - **Observability Stack**: OTEL Collector, Jaeger, Prometheus, Grafana, and PostHog on `observability-net`.
- **Evaluation of Document DBs at Current Stage**:
  - **Verdict**: Not needed and anti-recommended for Beta & v1.
  - **Reasoning**:
    1. PostgreSQL's native `JSONB` with GIN indexing matches document DB querying flexibility while preserving ACID transactions for inventory, margins, and order state.
    2. Relational integrity with Vayyari catalog, categories, and audit trails without dual-write headaches.
    3. Eliminates unnecessary database sprawl, backup orchestration, and operational overhead.

## Verification
- `npm run typecheck` in `src/apps/storybook`: PASSED (0 errors).
- `npm run typecheck` in `src/packages/ui`: PASSED (0 errors).
- Storybook Metro reloaded via tmux.

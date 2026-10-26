# Store Publish, Lifecycle & Color Variant Architecture

## Intent & The Why
Currently in DeepLens, products in the catalog merge vendor listings and group media prior to being published to the customer-facing storefront. However, once a product is published to the store, several operational gaps emerge:
1. Subsequent incoming vendor listings can inadvertently re-merge or overwrite the published product ID, breaking store URLs, bookmarks, and external references.
2. When newly merged vendor listings bring in fresh product media, store administrators have no visibility or mechanism to see that media counts have grown, nor a structured flow to sync and allocate these new photos to color categories.
3. Store administrators lack fine-grained lifecycle controls to temporarily pause products (with review alarms), permanently remove them, or mark them as "Out of Stock" (to capture customer waitlist interest) at both the parent product and individual color group levels.
4. Colorways are not distinctly searchable or browsable on the storefront like modern fashion e-commerce platforms (such as Myntra), where each colorway is an independent card with cross-linked sibling swatches.

This project delivers an end-to-end architecture unifying catalog merge protection, timestamp-based media delta queues, zero-duplication shared media reuse in MinIO, granular lifecycle/stock controls with a re-evaluation queue, and a dual-faceted UI (Myntra-style browsing for shoppers, umbrella card management for store admins).

---

## Goals, Non-Goals, and Anti-Goals

### Goals
- **Immutable Published Anchor:** Guarantee that once a product is published to the store, its ID is locked as the master target for any future vendor merges.
- **Delta Media Tracking:** Detect when `media_updated_at > store_publish_updated_at` and surface products with un-synced media in a dedicated "Publish Updates" queue on the Publish to Store screen.
- **Zero-Duplication Shared Media:** Provide a common media pool for group shots (displaying all colors together) that is physically stored only once in MinIO and referenced across all child color variants.
- **Myntra-Style Storefront Browsing:** Render each colorway as its own browsable card on search and category grids with code `VF{hex}{DD}` (e.g., `VF69F501`), while cross-linking sibling color swatches.
- **Two-Level Storefront Admin Screen:** Display products as unified catalog-style umbrella cards with summary metrics and bulk actions, while expanding the card allows granular management of individual color rows.
- **Hierarchical Lifecycle Controls:** Support temporary take-downs (with timeouts expiring into an admin re-evaluation queue), permanent take-downs, and waitlist-enabled out-of-stock toggles at both whole-product and color-variant levels.
- **State-Preserving Reactivation:** When a paused parent product is reactivated, each variant restores its `previous_lifecycle_status` (ensuring out-of-stock items do not become accidentally purchasable).
- **Mandatory Per-Color Stock:** Enforce that publishing requires an explicit inventory quantity for each colorway.
- **Member-Only Waitlist:** Allow signed-in customers to join a waitlist on out-of-stock variants; guest shoppers are prompted with a dismissible login modal that redirects back to the PDP post-login.
- **Bi-directional Traceability:** Store `parent_catalog_id` and `catalog_color_group_id` on each store variant to link directly back to the master catalog product and its source vendor listings.

### Non-Goals
- Automated restocking or external supplier purchase order generation (waitlists only capture demand for admin evaluation).
- Modifying warehouse inventory management outside of direct stock quantity counters.
- Changing customer checkout payment gateways.

### Anti-Goals
- Do NOT duplicate or re-upload shared group photos in MinIO across multiple color variants.
- Do NOT auto-reactivate or auto-publish products when their temporary take-down timer expires; they MUST stay safely hidden in the re-evaluation queue until manual admin sign-off.
- Do NOT break existing store URLs or cart items when new vendor listings merge into an already-published product.
- Do NOT allow guests to submit anonymous waitlist entries without signing in.

---

## Constraints
- **Database Engine:** PostgreSQL (`deeplens_platform` for catalog, `deeplens_store` for store).
- **Object Storage:** MinIO bucket `store-assets` with central `media_assets` registration.
- **Backend Service:** .NET 9 minimal API in `DeepLens.Services.Store.Api` using Dapper and Npgsql.
- **Frontend Frameworks:** Storefront in React/Vite (`src/store`), Admin in React / Tamagui (`src/vayyari` and `src/apps/storybook`).
- **Product Code Standard:** Catalog `base_sku` uses `VF` + hex code (e.g. `VF69F5`, `VF6CA`). Store variant codes append a 2-digit sequence directly without hyphen: `VF{hex}{DD}` (e.g. `VF69F501`, `VF69F502`).
- **Data Integrity:** Must adhere to ADR-005 database routing policies (read queries via Postgres MCP, migrations/writes via psql).

---

## Approaches Considered

### Approach A: Variant-First Records with Family Linking (Chosen)
Each colorway is stored as a first-class row in `deeplens_store.products` with `product_code = VF{hex}{DD}`, linked to the parent catalog product via `parent_catalog_id`.
- **Pros:** Full Myntra-style listing out of the box with zero complex joins or JSON unnesting; fast search queries and native indexing; fits existing `Store.Api` DTOs and endpoints with minimal schema adjustments; allows independent stock decrements and lifecycle statuses per colorway.
- **Cons:** Shared parent attributes (e.g., description, category) are stored on each sibling variant row and updated in batch when parent details change.

### Approach B: Explicit Two-Tier Hierarchy (`store_products` Parent + `store_variants` Child)
Separate parent products and child colorways into two separate relational tables with a database view (`v_store_catalog`) projecting browsable items.
- **Pros:** Strict relational purity; zero parent attribute replication.
- **Cons:** Requires substantial refactoring of existing Store.Api endpoints, cart services, order services, and database schemas.

### Approach C: Pure JSONB-Nested Variants (Rejected)
Keep variants strictly inside `color_groups` JSONB in a single parent table row.
- **Why Dropped:** Makes pagination, filtering by color, distinct stock decrements, and independent search ranking on the storefront grid complex, slow, and brittle.

**Decision:** Approach A was selected and agreed upon by the stakeholder.

---

## Detailed Design & Architectural Decisions

### 1. Catalog Merge Engine: Published Product as Immutable Anchor
- **Location:** `deeplens_platform` merge service / stored logic.
- **Rule:** When two or more products are identified to merge:
  - If neither product is published, standard merge logic applies (merging into oldest or latest listing).
  - If **one product is published (`is_published == true`)**, that published product ID **MUST ALWAYS** be chosen as the `target_id`. All other un-published source listings merge into this published product ID, preserving its primary UUID, external references, and store product links.
  - If both products are somehow published, the merge is blocked and flagged for manual admin resolution.
- **Side Effect:** Whenever new vendor listings merge into a published product, the catalog product's `media_updated_at` timestamp is updated to `NOW()`.

### 2. Media Delta Detection & Publish Updates Queue
- **Timestamps on Catalog Product (`deeplens_platform.products`):**
  - `store_publish_updated_at` (TIMESTAMPTZ): Initialized to `published_at` when first published; updated to `NOW()` whenever an admin completes a store sync.
  - `media_updated_at` (TIMESTAMPTZ): Updated whenever new listings merge in or new media is attached.
- **Delta Trigger:** A product has pending store updates when:
  `is_published = true AND media_updated_at > store_publish_updated_at`
- **Publish Screen Experience:**
  - A dedicated "Publish Updates" queue surfaces these products.
  - A badge shows the net media delta (e.g., `"+4 new photos"`).
  - Admin reviews the new photos and allocates them to:
    - An existing color group.
    - A new color group (prompts for initial stock quantity before sync).
    - The shared/common product photos pool.
  - Clicking "Complete & Sync to Store" pushes updates to `Store.Api` and sets `store_publish_updated_at = NOW()`.

### 3. Media Architecture & Zero-Duplication Storage
- **MinIO Storage:**
  - Shared group photos (depicting all colors together) are uploaded to MinIO `store-assets/products/{parent_id}/shared/` only once.
  - Color-specific photos are uploaded to `store-assets/products/{parent_id}/{colorway}/`.
- **Variant Gallery Assembly:**
  - In `deeplens_store.products`, each variant's `media_order` JSON array is composed as:
    `[ ...color_specific_media, ...shared_group_media ]`
  - The variant's own color photo is always index 0 (hero image).
  - Shared multi-color photos appear at the end of the carousel.
  - If shared media is updated on the parent, an update script or API call appends/updates the shared media references in `media_order` for all sibling rows under `parent_catalog_id`.

### 4. Backlinking, Traceability & Sub-Numbering Schema
- **Sub-Numbering:**
  - Format: `VF{hex}{DD}` where `DD` is a two-digit zero-padded sequence (`01`, `02`, `03`, ...), with no hyphen separator.
  - Example: Parent `base_sku = VF69F5` yields variants `VF69F501`, `VF69F502`.
- **Database Backlinks in `deeplens_store.products`:**
  - `parent_catalog_id` (UUID): References `deeplens_platform.products.id`.
  - `catalog_color_group_id` (UUID): References the specific color group ID from the catalog.
  - `parent_product_code` (VARCHAR): Stores `base_sku` (e.g. `VF69F5`) for fast family querying.
- **Audit Lineage:**
  - In the catalog, each color group retains its array of `source_vendor_listing_ids`.
  - In Store Admin, an admin can click "View Source in Catalog" on any color row to open the catalog product, highlighting that color group and its contributing vendor listings and costs.

### 5. Dual-Mode Presentation: Customer Storefront vs. Admin Screen

#### A. Customer Storefront (Myntra Model)
- **PLP & Search Grid:**
  - Every active color variant (`VF69F501`, `VF69F502`) renders as an individual product card.
  - Card displays the variant's hero image, title, colorway name, price, and horizontal interactive color swatch circles representing all sibling variants under the same `parent_catalog_id`.
  - Clicking a sibling color swatch switches the card preview to that variant.
- **PDP (Product Detail Page):**
  - Displays the variant's gallery (color-specific photos first, followed by shared group shots).
  - Sibling swatches allow seamless switching between colorway pages.

#### B. Storefront Admin Screen (Catalog-Style Umbrella Management)
- **Card Hierarchy:**
  - Products are grouped and displayed as parent umbrella cards (matching the catalog mental model).
  - Card header shows:
    - Parent Product Code (`VF69F5`) & Title.
    - Summary metrics: Total combined stock, number of active/total colorways, and primary category.
    - Umbrella status pill (`Available`, `Partially Out of Stock`, `Out of Stock`, `Paused`).
    - Quick cascade bulk actions: *Take Down All*, *Mark All Out of Stock*, *Sync Updates*.
- **Expandable Color Drawer:**
  - Clicking/expanding the card opens the individual color rows.
  - Each color row displays:
    - Sub-code (`VF69F501`), color swatch circle, and color name.
    - Inline stock quantity input field.
    - Individual lifecycle dropdown (`Available`, `Out of Stock`, `Paused`, `Deleted`).
    - Timer indicator for temporary take-downs.
    - Waitlist demand count badge.
    - "View Source in Catalog" link.

### 6. Granular Lifecycle, Inventory, Re-Evaluation Queue & Waitlists
- **Mandatory Inventory on Publish:**
  - When publishing or syncing, the admin must enter an initial inventory quantity for each colorway.
- **Lifecycle States:**
  1. `available`: Active, indexed in search, purchasable.
  2. `out_of_stock`: Visible and searchable on storefront; ordering disabled; "Join Waitlist" button displayed.
  3. `paused` (Temporary Take-down): Hidden from search and browsing; carries `take_down_expires_at` timestamp.
  4. `deleted` (Permanent Take-down): Soft-deleted; completely excluded from storefront.
- **Re-Evaluation Queue:**
  - A background routine identifies rows where `lifecycle_status = 'paused' AND take_down_expires_at <= NOW()`.
  - Expired items do **NOT** auto-publish. They automatically transition to `in_re_evaluation_queue = true`.
  - Store Admin provides a "Re-evaluation Queue" filter tab. Items remain hidden from customers until an admin explicitly clicks *Reactivate* or *Extend Pause*.
- **State-Preserving Reactivation:**
  - When an umbrella pause is reactivated, each variant restores its `previous_lifecycle_status`. If a variant was `out_of_stock` prior to the parent pause, it remains `out_of_stock`.
- **Member-Only Waitlist Flow:**
  - Clicking "Join Waitlist" on an out-of-stock colorway:
    - If user is signed in: instantly registers their `customer_id` into `deeplens_store.product_waitlists` and updates button to "On Waitlist ✓".
    - If user is a guest: opens a small, dismissible sign-in/sign-up popup.
    - Upon completing authentication, the user is redirected back to the source product page and automatically enrolled in the waitlist.

---

## Architectural Clarifications (Builder-Check Resolutions)

### 1. Legacy Product Code Migration & Fallback Routing
- **Schema Update:** The unique constraint on `vayyari_product_id` is replaced with `UNIQUE(parent_catalog_id, catalog_color_group_id)` and `UNIQUE(product_code)`.
- **Data Migration:** Existing rows in `deeplens_store.products` have their `product_code` suffixed with `01` (e.g. `VF69F5` $\rightarrow$ `VF69F501`) and `parent_catalog_id` set to their existing `vayyari_product_id`.
- **Fallback Resolution:** `Store.Api` lookup endpoints for `/products/code/{code}` check if `{code}` lacks a variant suffix; if so, they automatically route to the default primary variant (`01`), ensuring existing customer cart items, bookmarks, and external links never 404.

### 2. Waitlist Persistence & Restock Demand Metrics
- **Schema:** Introduce `deeplens_store.product_waitlists` (`id UUID PRIMARY KEY`, `product_id UUID REFERENCES products(id)`, `customer_id UUID NOT NULL`, `created_at TIMESTAMPTZ`, `UNIQUE(product_id, customer_id)`).
- **Public API:** `POST /api/v1/products/{id}/waitlist` (Requires auth; returns 401 for guests triggering UI login popup).
- **Admin Visibility:** `Store.Api` aggregates active waitlist counts into `waitlist_count` on the variant DTO, surfaced on both the admin umbrella card and individual color rows to guide restocking.

### 3. Delta Publish Flow for Newly Created Color Groups
- **Catalog Admin UI:** When newly merged vendor photos form a new color group, the Publish Updates modal requires the admin to specify an initial stock quantity (and optional price override) for the new colorway prior to publishing.
- **Sync Contract:** The sync endpoint upserts the new variant row (`VF69F503`) into `deeplens_store.products` and simultaneously updates the `media_order` array of existing sibling variants to include any new shared group photos.

### 4. Storefront PLP Sibling Swatches Query Architecture
- **Query Optimization:** `GET /api/v1/products` utilizes a PostgreSQL CTE / JSON aggregation to pre-join sibling swatch metadata (`sibling_swatches: [{ product_code, color_hex, colorway_name, hero_image_url }]`) directly onto each variant record. This guarantees that server-side pagination and category filtering do not break swatch interactions across page boundaries.

---

## What is Left to the Builder
1. **Database Migration Scripts:**
   - Add `parent_catalog_id` (UUID), `catalog_color_group_id` (UUID), `parent_product_code` (VARCHAR), `take_down_expires_at` (TIMESTAMPTZ), `previous_lifecycle_status` (VARCHAR), and `is_re_evaluation_pending` (BOOLEAN) to `deeplens_store.products`.
   - Add `store_publish_updated_at` (TIMESTAMPTZ) to `deeplens_platform.products` (defaulting to `published_at` or `NOW()`).
   - Create index `idx_products_parent_catalog_id` on `deeplens_store.products(parent_catalog_id)`.
   - Create table `deeplens_store.product_waitlists`.
2. **Catalog Merge Logic Implementation:**
   - Update `ProductMergeService` in `deeplens_platform` to query `is_published` status and enforce published target anchoring.
3. **Store.Api Endpoints:**
   - Update `GET /api/v1/products` with sibling swatch CTE.
   - Implement `PATCH /api/v1/admin/products/lifecycle` supporting both parent-level and variant-level status updates with optional timeout.
   - Implement `GET /api/v1/admin/products/re-evaluation-queue` for expired paused items.
   - Implement authenticated `POST /api/v1/products/{id}/waitlist`.
4. **UI Components:**
   - Build the Publish Updates delta badge and media allocation modal in catalog admin.
   - Build the Storefront Admin expandable umbrella card and nested color row drawer.
   - Add the dismissible guest login popup with post-login redirect on the storefront out-of-stock PDP.

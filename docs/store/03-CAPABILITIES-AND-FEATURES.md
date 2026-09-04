# 03: PRODUCT CAPABILITIES AND FEATURES

## Product Architecture (Capability Hierarchy)

```
VAYYARI
├── Customer Experience
│   ├── Discovery & Browsing
│   ├── Product Information
│   ├── Authentication & Personalization
│   ├── Shopping (Cart & Checkout)
│   ├── Order Tracking
│   └── Customer Support
├── Content Management
│   ├── Daily Theme Engine
│   ├── Shoppable Reels
│   └── Product Content
├── Fulfillment & Operations
│   ├── Inventory Management
│   ├── Order Processing
│   ├── Payment Processing & Reconciliation
│   └── Logistics & Tracking
├── Admin Functions
│   ├── Order Management
│   ├── Fulfillment Routing
│   └── Exception Handling
└── Business Intelligence
    ├── Analytics (Future)
    └── Reporting (Future)
```

---

## Capability 1: Discovery & Browsing

**Objective:** Customers easily find handlooms through curated, filtered navigation.

### Feature 1.1: Campaign Landing Pages

- **What:** Parameter-driven landing pages for seasonal campaigns
- **How:** URL structure `/catalog?category=sarees&theme=monochrome` pre-applies filters
- **Why:** Seamless redirect from social media without separate hardcoded pages
- **Actors:** Marketing team (URL creation), Customers (landing)
- **Precondition:** Campaign theme and category defined in backend
- **Acceptance Criteria:**
  - Landing page loads with applied filters (no manual filtering needed)
  - Logo click resets to homepage
  - Mobile and desktop render identically

### Feature 1.2: Category Navigation

- **What:** Hierarchical category browse (Women → Sarees, Women → Lehengas, Kids, Festival)
- **How:** Sticky accordion drawer on mobile; horizontal nav on desktop
- **Why:** Supports multiple product hierarchies without complexity
- **Acceptance Criteria:**
  - Category icons load instantly
  - Subcategories expand/collapse smoothly
  - Active category visually highlighted

### Feature 1.3: Product Filtering & Sorting

- **What:** Filter by price, material, color, availability; sort by new/popular/price
- **How:** Faceted search with persistent state in URL (e.g., `?price=2000-5000&material=silk`)
- **Why:** Customers narrow large catalogs efficiently
- **Acceptance Criteria:**
  - All filters applied simultaneously (AND logic)
  - Sorting updates instantly
  - Filter state preserved on back-button

### Feature 1.4: Search

- **What:** Full-text search across product names, descriptions, tags
- **How:** Real-time autocomplete suggestions dropdown
- **Why:** Power users prefer search to category browse
- **Acceptance Criteria:**
  - Suggestions appear within 300ms
  - Typo tolerance (fuzzy matching)
  - Mobile search input has clear focus state

---

## Capability 2: Product Information & Presentation

**Objective:** Customers have confidence in product authenticity and quality.

### Feature 2.1: Product Detail Page

- **What:** Comprehensive single-product view
- **Content:**
  - High-res images (carousel, 5+ angles)
  - Price, size/color variants
  - Material, dimensions, care instructions
  - Weaver/vendor story (bio, heritage, certifications)
  - Availability status
- **How:** Loads from SQL database (versioned, audited)
- **Why:** Builds trust; supports repeat purchases
- **Acceptance Criteria:**
  - Images load progressively (thumbnail → full-res)
  - No layout shift when images load
  - All variant selections persist in cart

### Feature 2.2: Shoppable Reels Carousel

- **What:** Video content (30–60 sec) with inline product purchase
- **How:** MP4 video player with "Quick View" overlay; tap to open purchase modal
- **Why:** Social proof; impulse purchase driver
- **Where:** Below hero banner on homepage
- **Acceptance Criteria:**
  - Video plays on tap (no autoplay)
  - Quick View modal appears instantly
  - Video continues playing if user doesn't interact

### Feature 2.3: Quick View Modal

- **What:** Pop-over showing product summary (image, price, description, add-to-cart)
- **Why:** Customers can buy without navigating to full detail page
- **Acceptance Criteria:**
  - Modal opens/closes smoothly
  - "Add to Cart" action confirmed visually
  - User can close without losing cart

---

## Capability 3: Authentication & Personalization

**Objective:** Frictionless login for returning customers; confidence for guests.

### Feature 3.1: Passwordless Authentication (Passkey)

- **What:** WebAuthn-based login using Face ID, Touch ID, Windows Hello
- **How:** Browser prompts native OS security → server validates credential
- **Why:** Highest security + UX (no typing)
- **Precondition:** User has enrolled device; browser supports WebAuthn
- **Acceptance Criteria:**
  - Passkey prompt appears within 500ms
  - Face/Touch ID succeeds on first attempt 95%+ of the time
  - Fallback to OTP if Passkey unavailable

### Feature 3.2: OTP Fallback (WhatsApp/SMS)

- **What:** SMS + WhatsApp OTP verification
- **How:** User enters phone number → receives 6-digit code → enters code → logs in
- **Why:** Fallback for users without Passkey; familiar to Indian users
- **Acceptance Criteria:**
  - Phone number auto-formatted to +91
  - Countdown timer visible (60 sec validity)
  - Resend link appears after timeout
  - OTP input accepts 6 digits only

### Feature 3.3: Progressive Profiling (Onboarding)

- **What:** Post-login questionnaire capturing preferences
- **Questions:**
  - Date of Birth (for auto-discounts)
  - Visual style preference (everyday vs. premium handlooms)
  - Email (for account recovery)
  - Delivery preferences (express vs. standard)
- **How:** One question per screen; smooth fade transitions
- **Why:** Personalize experience without blocking checkout
- **Acceptance Criteria:**
  - "Skip for now" always visible
  - Answers saved on every screen (not just completion)
  - No progress bar (reduces urgency)

### Feature 3.4: Account Management

- **What:** User profile, address book, order history, preferences
- **Where:** Account menu in header
- **Why:** Repeat customers manage preferences without re-entry
- **Acceptance Criteria:**
  - Addresses can be added/edited/deleted
  - Default delivery address toggleable
  - Previous orders visible with links to similar products

---

## Capability 4: Shopping (Cart & Checkout)

**Objective:** Minimal friction from product selection to payment.

### Feature 4.1: Shopping Cart

- **What:** Persistent cart storing selected items + quantities
- **Storage:** localStorage for guests; SQL database + Redis for logged-in users
- **Actions:** Add, remove, update quantity, apply coupon (future)
- **Why:** Users browse multiple items before buying
- **Acceptance Criteria:**
  - Cart persists across sessions (logged-in users)
  - Out-of-stock items show warning
  - Cart total auto-updates

### Feature 4.2: Frictionless Checkout

- **What:** Single-screen checkout (order summary + delivery + payment)
- **Why:** Reduce abandonment; optimize for mobile
- **Layout:**
  - Order Summary (read-only, no edits)
  - Delivery Address (auto-filled, editable)
  - Delivery Timeframe (Standard 5–7 days or Express 2–3 days)
  - "Pay Securely" button
- **Acceptance Criteria:**
  - No unnecessary form fields
  - Address auto-filled for logged-in users
  - Guest users can proceed without account

### Feature 4.3: UPI Payment Gateway Integration

- **Mobile Flow:**
  - User taps "Pay Securely"
  - System generates UPI Intent URI → OS app selector opens
  - User selects PhonePe/Google Pay → Payment app opens → Payment confirmed
  - Webhook reconciliation updates order status
- **Desktop Flow:**
  - User taps "Pay Securely"
  - System shows Dynamic QR code (generated by payment gateway)
  - User scans QR with phone → Payment app opens → Payment confirmed
  - Page polls backend until webhook confirms payment
- **Why:** Stateless, frictionless; zero PCI compliance overhead
- **Acceptance Criteria:**
  - UPI Intent works on Android 6+
  - QR expiration timer visible on desktop
  - Payment timeout shows helpful error (re-initiate)

### Feature 4.4: Order Confirmation & Summary

- **What:** Immediate post-purchase confirmation screen
- **Shows:**
  - Order ID (for reference)
  - "Your order is processing" message
  - Expected delivery date range
  - Order summary (items, price, delivery address)
  - WhatsApp/Email notification info
- **Why:** Reassures customer; reduces support tickets
- **Acceptance Criteria:**
  - Displayed within 2 seconds of payment webhook
  - No "Back" navigation (prevent duplicate orders)

---

## Capability 5: Order Tracking

**Objective:** Customers know status without overwhelming operational detail.

### Feature 5.1: Public Order Tracker

- **What:** Timeline showing order progression
- **States Visible to Customer:**
  - "Processing" (Payment received → Admin groups → Items en-route to hub)
  - "In Transit" (Physically shipped; Airway Bill attached)
  - "Delivered" (Received by customer)
- **Why:** Simplified view; masks internal complexity
- **What's Hidden:** Internal states (Awaiting_Vendor_Dispatch, Procuring_To_Local_Hub, Ready_For_Packaging)
- **Acceptance Criteria:**
  - Timeline updates automatically (WebSocket or polling)
  - Timestamp shown for each state
  - No "Cancel" or "Refund" buttons in normal flow
  - No Airway Bill (AWB) shown until Dispatched state

### Feature 5.2: Order History

- **What:** List of past orders with quick actions
- **Actions:**
  - View order details
  - Reorder (if in stock)
  - Report issue (if delivered)
- **Why:** Supports repeat purchases and exception handling
- **Acceptance Criteria:**
  - Sorted by date (newest first)
  - Filters by status (Processing, In Transit, Delivered)
  - Search by Order ID or product name

---

## Capability 6: Customer Support (MVP)

**Objective:** Resolve exceptions without overwhelming the support team.

### Feature 6.1: Report Issue (Post-Delivery)

- **What:** Customer-initiated exception workflow
- **When Available:** After order is marked "Delivered"
- **Process:**
  1. User selects reason (Damaged, Different than photo, Missing item)
  2. User uploads photo (optional)
  3. System notifies admin via SignalR + WhatsApp bot
  4. Admin decides: Refund, Replace, or Store Credit
  5. Admin initiates action; customer notified via WhatsApp

- **Why:** Avoids complicated chat; keeps exceptions visible
- **Acceptance Criteria:**
  - Issue form submits within 2 seconds
  - Admin receives notification immediately
  - Photo upload limit: 5MB, 3 max

### Feature 6.2: WhatsApp Support Link

- **What:** "Message us on WhatsApp" button in sticky header
- **Why:** Customers already use WhatsApp; reduces friction
- **How:** Deep link to pre-filled WhatsApp message (e.g., "Help with Order #12345")
- **Acceptance Criteria:**
  - Link opens WhatsApp (if installed) or browser fallback
  - Order ID pre-populated if user is logged in

---

## Capability 7: Content Management (Daily Theme Engine)

**Objective:** Platform feels fresh and curated; visual variety without engineering overhead.

### Feature 7.1: Daily Theme Rotation

- **What:** CSS custom properties rotate daily (--color-primary, --color-secondary, --color-accent)
- **How:** Backend calendar utility defines theme for each day; frontend applies via global context
- **Why:** Reduces monotony; feels premium and intentional
- **Themes:** Monochrome, Jewel Tones, Sunset, Earth Tones, Pastels (rotating cycle)
- **Acceptance Criteria:**
  - Theme changes at 00:00 UTC+5:30 (India Standard Time)
  - No layout shift when theme updates
  - Themes respect brand identity (elegant, not garish)

---

## Capability 8: Fulfillment & Inventory (Admin-Facing)

### Feature 8.1: Real-Time Order Dashboard (Mobile App)

- **What:** SignalR-powered admin dashboard on React Native
- **Shows:**
  - New orders as they arrive (NewOrderReceived event)
  - Order summary (items, quantities, customer, delivery address)
- **Actions:**
  - Group items by fulfillment route (Vendor Dropship or Hub Dispatch)
  - Generate pick-list for hub operators
  - Input final Tracking ID (AWB) when dispatched

### Feature 8.2: Inventory Sync

- **What:** Vendor inventory reconciliation
- **Scope (MVP):** Manual sync; vendor provides updated stock counts
- **Scope (Future):** Real-time API push from vendor
- **Why:** Overselling handmade goods is unacceptable
- **Acceptance Criteria:**
  - Out-of-stock items immediately unavailable for purchase
  - Inventory decrement happens at "Confirmed" order stage (not cart)

---

## Capability 9: Payment Reconciliation & Refunds (Backend)

### Feature 9.1: Webhook Listener

- **What:** `/api/checkout/webhook` endpoint validates payment gateway signature
- **Process:**
  1. Payment gateway POSTs payment confirmation (with HMAC signature)
  2. Backend validates signature + order ID
  3. Database order status moves to "Confirmed"
  4. SignalR event triggered (admin dashboard updates)
  5. Customer email/WhatsApp sent
- **Why:** Stateless, audit-safe, handles network failures gracefully
- **Acceptance Criteria:**
  - Webhook processes within 1 second
  - Idempotent (duplicate webhooks handled)
  - Failed validations logged for audit

### Feature 9.2: Reverse Payment (Refunds)

- **What:** Seller-initiated UPI refund for exceptions
- **Process:**
  1. Admin selects "Refund" action in mobile app
  2. Admin enters refund reason (with mandatory approval)
  3. Backend calls payment gateway refund API (server-to-server)
  4. Payment gateway reverses UPI transaction
  5. Customer sees refund status in order tracker
- **Why:** Handles out-of-stock, damaged goods, customer complaints
- **Precondition:** Payment was confirmed via UPI (full reversal possible)
- **Acceptance Criteria:**
  - Refund initiated within 2 hours of admin action
  - Customer notified via WhatsApp when refund processed
  - Refund appears in customer's bank account within 3–5 business days

---

## Capability 10: Ethnic Color Tagging & Reviewer Curation Pipeline ← NEW

**Objective:** Bridge the gap between raw product photo uploads and the rich ethnic swatch experience customers use to filter and buy.

### Feature 10.1: Automated Color Extraction (K-Means + Delta E Microservice)

- **What:** Python FastAPI microservice that accurately identifies dominant fabric colors from uploaded product photos and maps them to the 32 perceptually-uniform Oklch anchors
- **When triggered:** On each new ProductImage uploaded to MinIO

**Step 1 — Background Masking:**
- Crop or mask the central bounding box of the clothing item before clustering
- Reason: Studio backdrops (white, light grey, warm wood) will register as dominant colors in raw K-Means, polluting slot suggestions
- Implementation: OpenCV bounding-box crop or u2net/rembg background removal depending on quality tier

**Step 2 — Color Space Conversion:**
- Convert masked pixel array from **sRGB → Oklab** (or CIELAB) before running K-Means
- **Critical rule:** Do NOT run K-Means on raw RGB arrays — standard Euclidean distance in RGB space does not match human perception (a small RGB delta in greens can look massive; a large RGB delta in blues can look identical)
- Downscale to 200×200px before conversion for performance

**Step 3 — K-Means Clustering:**
- Run `k=3` K-Means on the Oklab pixel array
- Outputs 3 centroid coordinates in Oklab space + coverage percentage per cluster

**Step 4 — Palette Normalization (Delta E CIE2000):**
- For each K-Means centroid, iterate through all 32 standard Oklch anchors
- Assign the centroid to the anchor with the **lowest ΔE CIE2000 distance**
- ΔE CIE2000 is computed in CIELAB space for strict perceptual coherence
- This prevents the olive-mustard-brown misclassification that pure RGB Euclidean causes

**Python Reference Implementation:**
```python
from colormath.color_objects import LabColor
from colormath.color_diff import delta_e_cie2000

# core_32_palette: dict of anchor_name → LabColor (pre-converted from Oklch)
def classify_centroid(extracted_lab: LabColor, core_32_palette: dict) -> str:
    closest_anchor = None
    lowest_delta_e = float('inf')
    for anchor_name, anchor_lab in core_32_palette.items():
        distance = delta_e_cie2000(extracted_lab, anchor_lab)
        if distance < lowest_delta_e:
            lowest_delta_e = distance
            closest_anchor = anchor_name
    return closest_anchor
```

**The 32 Oklch Anchor Definitions** (used as fixed classification targets):

| Anchor Name | Oklch | Covers |
|-------------|-------|--------|
| Pure White | `oklch(0.99 0.00 0.0)` | Pristine whites, ivory |
| Cream Beige | `oklch(0.93 0.05 85.0)` | Creams, off-white, linen |
| Sand Tan | `oklch(0.79 0.09 76.0)` | Fawn, warm khaki, sand |
| Taupe Brown | `oklch(0.44 0.08 50.0)` | Coffee, chocolate, earth |
| Charcoal | `oklch(0.40 0.00 0.0)` | Slate, dark grey, graphite |
| Jet Black | `oklch(0.12 0.00 0.0)` | True black, obsidian |
| Ruby Red | `oklch(0.53 0.24 26.0)` | Crimson, scarlet |
| Wine Maroon | `oklch(0.36 0.16 16.0)` | Burgundy, oxblood, deep wine |
| Rose Pink | `oklch(0.66 0.18 16.0)` | Traditional darker pink, rose |
| Blush Pink | `oklch(0.86 0.08 22.0)` | Baby pink, pastel rose |
| Coral Salmon | `oklch(0.70 0.16 41.0)` | Living coral, salmon |
| Magenta | `oklch(0.56 0.27 345.0)` | Fuchsia, hot neon pink |
| Rust Burnt | `oklch(0.49 0.15 46.0)` | Terracotta, deep copper, rust |
| Tangerine | `oklch(0.69 0.21 56.0)` | Vibrant orange, marigold |
| Mustard | `oklch(0.73 0.14 81.0)` | Ochre, warm Indian yellow |
| Pastel Lemon | `oklch(0.91 0.09 96.0)` | Butter yellow, chiffon, straw |
| Olive Khaki | `oklch(0.55 0.09 111.0)` | Sage, army green, dark olive |
| Mint Seafoam | `oklch(0.87 0.08 152.0)` | Mint, light pistachio |
| Emerald | `oklch(0.59 0.19 146.0)` | Deep bottle green |
| Lime Moss | `oklch(0.77 0.17 131.0)` | Chartreuse, bright moss |
| Powder Blue | `oklch(0.85 0.06 222.0)` | Ice blue, pale sky |
| Turquoise | `oklch(0.71 0.14 196.0)` | Aquamarine, clear cyan |
| Teal Peacock | `oklch(0.49 0.11 202.0)` | Deep teal, peacock blue |
| Royal Blue | `oklch(0.46 0.23 262.0)` | Cobalt, deep electric blue |
| Navy Blue | `oklch(0.29 0.09 272.0)` | Midnight blue, indigo |
| Lavender | `oklch(0.81 0.07 302.0)` | Lilac, orchid, soft purple |
| Violet Plum | `oklch(0.45 0.16 312.0)` | Eggplant, deep violet, grape |
| Antique Gold | `oklch(0.75 0.10 83.0)` | Dull gold, brass, zari accents |
| Rose Gold | `oklch(0.73 0.08 46.0)` | Soft coppery bronze-gold |
| Silver | `oklch(0.81 0.00 0.0)` | Muted grey metallics, platinum |
| Multicolor | Manual only | Bandhani, digital prints, patchwork |

> **Why 32?** The anchors are distributed as fine-grained spatial clusters across Lightness (L), Chroma (C), and Hue (H) angles in Oklch to guarantee clean segmentation with no perceptual overlap between neighbouring anchor zones.

- **Output per image:** Top 3 dominant colors with `{hex, coveragePercent, normalizedAnchorName, deltaEDistance}`
- **Precondition:** ProductImage exists in MinIO; background masking has run
- **Acceptance Criteria:**
  - Background masking removes studio backdrop before clustering
  - K-Means runs in Oklab space (not sRGB)
  - Normalization uses ΔE CIE2000, not Euclidean RGB distance
  - Each image produces ≤3 ExtractedColor records with the closest anchor name
  - Extraction completes within 5 seconds per image
  - Results surfaced in reviewer portal as priority quick-picks

### Feature 10.2: Reviewer Curation Portal

- **What:** Internal admin tool that allows a reviewer to manually define curated color variant swatches for each product
- **Who:** Internal reviewer role (part of merchandising team)
- **When:** After product photos are uploaded and auto-extraction has run
- **Workflow:**

```
1. Reviewer opens product in curation portal
2. Sees all uploaded photos for the product
3. Selects swatch template:
   - Solid / Contrast Border / Multi-Tone (dynamic gradient stops) / Multi-Shade (2=split, 3=pie, 4=+ cross) / Multicolor (static 4x4 grid)
4. Assigns colors to slots (A, B, C, D for solid/border/tone/shade; multicolor uses static 16-color mosaic):
   - K-Means extracted colors shown first as quick-picks (priority suggestions)
   - Reviewer can override with any of the 32 standard anchor colors
5. Types a label for the variant (e.g., "Navy & Rani Pink")
6. Groups multiple photos to this variant:
   - Multi-select photo checkboxes
   - Sets display order within the group
7. Saves swatch as a ProductColorVariant (IsPublished = false)
8. Reviews final swatch preview (live CustomSwatchDot rendering)
9. Publishes the variant (IsPublished = true → visible in storefront)
```

- **Acceptance Criteria:**
  - Template selection renders a live preview of the swatch geometry
  - Auto-extracted colors appear as primary suggestions for each slot
  - Reviewer can toggle to full 32-anchor Oklch picker if extracted colors don't match
  - Multiple photos can be grouped to one swatch with custom ordering
  - Published variants appear in PDP ColourSelector and PLP filter
  - Unpublished variants do NOT appear in storefront

### Feature 10.3: Customer Storefront — Curated Color Filtering (PLP)

- **What:** On the catalog page, customers filter by reviewer-curated color tags
- **How:** Filter facet shows curated palette family names (e.g., "Navy Blue", "Rani Pink") with their swatch template geometry preview
- **Rule:** Curated tags only — raw K-Means clusters are never shown to customers
- **Multi-select:** Customers can select multiple colors (OR logic within color facet)
- **Acceptance Criteria:**
  - Filter options only show colors that have at least 1 published ProductColorVariant
  - Color filter uses `ProductColorVariant.SlotA_PaletteColor` as primary key
  - Selecting "Navy Blue" shows products where at least one variant has SlotA_PaletteColor = "Blue"

### Feature 10.4: Customer Storefront — Gallery Photo Grouping (PDP)

- **What:** Selecting a color swatch in the PDP loads only that variant's grouped photos into the carousel
- **How:** `activeSwatch.images` drives the gallery's photo pool; `activeImageIndex` resets to 0 on swatch change
- **Circular navigation:** Both chevron buttons and swipe gestures navigate within the active variant's photo group
- **Fallback:** If no photos are grouped to a variant, gallery shows product's first default image
- **Acceptance Criteria:**
  - Photo group updates immediately on swatch selection with no layout jank
  - Slide counter badge reflects `{current}/{total}` of active variant's photos (not all product photos)
  - Photo label badge shows description of current photo in the group

---

## Summary of MVP Feature Completeness

| Capability                | Status      | Notes                                               |
| ------------------------- | ----------- | --------------------------------------------------- |
| Discovery & Browsing      | ✅ Complete | Categories, filters, search                         |
| Product Info              | ✅ Complete | Detail page, shoppable reels, quick view            |
| Authentication            | ✅ Complete | Passkey + OTP                                       |
| Cart & Checkout           | ✅ Complete | UPI only, guest checkout supported                  |
| Order Tracking            | ✅ Complete | Public status view                                  |
| Customer Support          | 🟡 Minimal  | WhatsApp + Report Issue only                        |
| Content Management        | ✅ Complete | Daily themes                                        |
| Fulfillment               | ✅ Complete | Admin dashboard, routing                            |
| Payment Reconciliation    | ✅ Complete | Webhook + refunds                                   |
| Color Tagging & Curation  | 🟡 UI Spec  | Curation portal wireframed; backend pipeline spec'd |

---

**Status:** 🟢 Ready for Technical Design  
**Last Updated:** 2026-08-31

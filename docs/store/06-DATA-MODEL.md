# 06: DATA MODEL AND DOMAIN ENTITIES

**Purpose:** Define the conceptual and logical data structures that support VAYYARI's operations.

---

## Section 1: Core Entities

### 1.1 Customer Entity

Represents a registered or guest user.

```
Customer
├── CustomerId (UUID)
├── PhoneNumber (string, +91XXXXXXXXXX, unique, indexed)
├── Email (string, nullable, unique when provided)
├── FullName (string, nullable)
├── DateOfBirth (date, nullable)
├── StylePreference (enum: everyday_wear, premium_handlooms, unsure)
├── PreferredDeliverySpeed (enum: standard, express)
├── AccountType (enum: registered, guest)
├── CreatedAt (datetime)
├── UpdatedAt (datetime)
├── IsActive (boolean)
└── Notes (string, nullable, admin-only)
```

**Temporal Versions:** No versioning needed (personal data rarely changes)

**Relationships:**

- 1:N with Orders
- 1:N with Addresses
- 1:N with Carts

**Indexes:**

- PhoneNumber (primary lookup)
- Email (secondary lookup, if provided)
- CreatedAt (for analytics)

---

### 1.2 Address Entity

Customer delivery addresses.

```
Address
├── AddressId (UUID)
├── CustomerId (UUID, FK → Customer)
├── FullName (string)
├── PhoneNumber (string, +91XXXXXXXXXX)
├── StreetAddress (string)
├── City (string)
├── State (string)
├── PostalCode (string, 6 digits)
├── Landmark (string, nullable)
├── AddressType (enum: home, work, other)
├── IsDefault (boolean, at most 1 default per customer)
├── CreatedAt (datetime)
└── UpdatedAt (datetime)
```

**Relationships:**

- N:1 with Customer
- 1:N with Orders (address at time of order)

**Indexes:**

- CustomerId
- IsDefault

---

### 1.3 Product Entity

Represents a handloom product in the catalog as a single logical listing that may contain many colors and sizes.

```
Product
├── ProductId (UUID)
├── VendorProductId (string, FK → external vendor system)
├── Name (string, e.g., "Blue Silk Saree")
├── Description (string, long-form description + care instructions)
├── VendorId (UUID, FK → Vendor)
├── Category (enum: sarees, dresses, lehengas, festival_wear, kids)
├── SubCategory (string, nullable)
├── RetailPrice (decimal, ₹)
├── OfferPrice (decimal, ₹)
├── CostPrice (decimal, ₹, admin-only)
├── DiscountPercent (decimal, % or calculated from retail vs offer)
├── FinalPrice (decimal, ₹, same as OfferPrice for checkout)
├── Material (string, e.g., "Pure Silk")
├── Dimensions (string, e.g., "6.5m x 1.2m")
├── Weight (decimal, grams)
├── Color (string, default primary color / display color)
├── ColorVariants (JSON array, e.g., ["Blue", "Red", "Green"])
├── ColorHexMap (JSON object, e.g., {"Blue":"#1d4ed8","Red":"#b91c1c","Green":"#15803d"})
├── SizeVariants (JSON array, e.g., ["S", "M", "L"] or ["One Size"] for fixed-size products)
├── SizeSelectionMode (enum: selectable, fixed_single_size)
├── InventoryByVariant (JSON, e.g., {"Blue":{"S":2,"M":5},"Red":{"M":3}})
├── DefaultImageByColor (JSON object, e.g., {"Blue":"url1","Red":"url2","Green":"url3"})
├── Stock (integer, current quantity; can be aggregate across variants)
├── Status (enum: active, inactive, coming_soon, discontinued)
├── CreatedAt (datetime)
├── UpdatedAt (datetime)
├── PublishedAt (datetime, when made visible)
└── Metadata (JSON, flexible attributes)
```

**Design Decision:** A product may contain multiple colors and sizes in one listing, but the selected variant must remain explicit in cart and checkout.

**Relationships:**

- N:1 with Vendor
- 1:N with ProductImages
- 1:N with ProductVideos
- 1:N with CartItems
- 1:N with OrderItems

**Indexes:**

- VendorProductId
- Category
- Status
- CreatedAt

**Constraints:**

- OfferPrice <= RetailPrice
- FinalPrice = OfferPrice for active pricing logic
- ColorVariants and SizeVariants must be non-empty
- InventoryByVariant must align with variant pairs and stock counts
- Name is required and non-empty

---

### 1.4 ProductImage Entity

Media assets for products.

```
ProductImage
├── ProductImageId (UUID)
├── ProductId (UUID, FK → Product)
├── ColorName (string, nullable)
├── ImageUrl (string, MinIO bucket URL)
├── ThumbnailUrl (string, MinIO bucket URL)
├── AltText (string, for accessibility)
├── DisplayOrder (integer, sort order in carousel)
├── UploadedAt (datetime)
└── UploadedBy (string, admin name)
```

**Relationships:**

- N:1 with Product

**Indexes:**

- ProductId
- ColorName
- DisplayOrder

**Storage:**

- Original images stored in MinIO: `/products/{productId}/images/{imageId}.webp`
- Thumbnails auto-generated: `/products/{productId}/thumbnails/{imageId}.webp`
- No external CDN (all local MinIO)

---

### 1.5 ProductColorVariant Entity ← NEW

Represents a curated color variant created by the reviewer during the manual curation step. This is the entity that drives both the storefront swatch display and the grouped photo carousel.

```
ProductColorVariant
├── VariantId (UUID)
├── ProductId (UUID, FK → Product)
├── Label (string, e.g., "Navy & Rani Pink")         ← displayed in ColourSelector
├── SwatchTemplate (enum: solid, contrast-border, dual-tone, half-and-half, multicolor)
├── SlotA_PaletteColor (string, FK → 21 standard families)  ← primary/body color
├── SlotA_Hex (string, exact display hex)
├── SlotB_PaletteColor (string, nullable)            ← border/weft/right color
├── SlotB_Hex (string, nullable)
├── SlotC_PaletteColor (string, nullable)            ← multicolor only: 3rd quadrant
├── SlotC_Hex (string, nullable)
├── SlotD_PaletteColor (string, nullable)            ← multicolor only: 4th quadrant
├── SlotD_Hex (string, nullable)
├── DisplayOrder (integer, sort position in ColourSelector)
├── IsPublished (boolean, false while reviewer is still curating)
├── CuratedBy (UUID, FK → Admin User)
├── CuratedAt (datetime)
├── CreatedAt (datetime)
└── UpdatedAt (datetime)
```

**Relationships:**

- N:1 with Product
- 1:N with ProductImage (via PhotoGrouping junction)

**Junction Table: VariantPhotoGrouping**

```
VariantPhotoGrouping
├── VariantId (UUID, FK → ProductColorVariant)
├── ProductImageId (UUID, FK → ProductImage)
├── DisplayOrder (integer, photo order within this variant's gallery group)
└── CreatedAt (datetime)
```

**Behavior:**

- When a customer selects a swatch in the PDP, the gallery loads all ProductImages linked to that VariantId via VariantPhotoGrouping, ordered by DisplayOrder
- If no photos are grouped to a variant, the gallery falls back to the product's first default image
- Customers filter on PLP using `ProductColorVariant.SwatchTemplate` + `SlotA_PaletteColor` (not raw ExtractedColor)
- `IsPublished = false` prevents the swatch from appearing in the storefront until reviewer is satisfied

---

### 1.6 ExtractedColor Entity ← NEW

Stores the output of the K-Means automated color extraction step. Used by the reviewer as quick-pick suggestions, but not directly customer-facing.

```
ExtractedColor
├── ExtractionId (UUID)
├── ProductImageId (UUID, FK → ProductImage)
├── ProductId (UUID, FK → Product)
├── ExtractedHex (string, e.g., "#1a2d5e")
├── CoveragePercent (decimal, % of image covered by this cluster)
├── NormalizedPaletteFamily (string, one of 21 standard families)
├── DeltaEDistance (decimal, CIEDE2000 distance to nearest palette family)
├── ExtractedAt (datetime)
└── MicroserviceVersion (string, for audit trail)
```

**Relationships:**

- N:1 with ProductImage
- N:1 with Product

**Usage:**

- The top 3–5 extracted colors per image are surfaced in the Reviewer Curation Portal as "suggested" colors for each slot
- The reviewer is free to accept or override them with any of the 21 standard palette families
- This entity is internal only — never exposed to customer-facing APIs

---

### 1.7 ProductVideo Entity

Shoppable video content.

```
ProductVideo
├── ProductVideoId (UUID)
├── ProductId (UUID, FK → Product)
├── ColorName (string, nullable)
├── VideoUrl (string, MinIO bucket URL)
├── ThumbnailUrl (string, MinIO bucket URL)
├── Title (string)
├── Description (string)
├── DurationSeconds (integer)
├── DisplayOrder (integer)
├── UploadedAt (datetime)
└── UploadedBy (string, admin name)
```

**Relationships:**

- N:1 with Product (optional; video can exist without product)

**Storage:**

- Videos stored in MinIO: `/content/reels/{videoId}.mp4`
- Transcoded to 720p for playback
- Thumbnails auto-extracted at 0s

---

### 1.7 Cart Entity

Customer shopping cart (temporary storage before checkout).

```
Cart
├── CartId (UUID)
├── CustomerId (UUID, FK → Customer)
├── CreatedAt (datetime)
├── UpdatedAt (datetime)
└── ExpiresAt (datetime, 7 days for guests, indefinite for registered)
```

**Relationships:**

- 1:1 with Customer
- 1:N with CartItems

**Storage Strategy:**

- **Guests:** localStorage (browser) + optional Redis for fallback
- **Registered:** SQL Database (primary) + Redis (cache for performance)

---

### 1.8 CartItem Entity

Individual items in a cart.

```
CartItem
├── CartItemId (UUID)
├── CartId (UUID, FK → Cart)
├── ProductId (UUID, FK → Product)
├── Quantity (integer, 1–5)
├── SelectedColor (string, required)
├── SelectedSize (string, required; for fixed-size products use "One Size")
├── SelectedImageUrl (string, required; chosen color image)
├── AddedAt (datetime)
└── UpdatedAt (datetime)
```

**Relationships:**

- N:1 with Cart
- N:1 with Product

**Constraints:**

- Quantity between 1 and 5 (MVP limit)
- Product must exist and be active
- SelectedColor and SelectedSize must match product variant availability
- SelectedImageUrl must correspond to the selected color
- Duplicate items merged only if same product + same selected variant

---

### 1.9 Order Entity

Customer purchases.

```
Order
├── OrderId (UUID, e.g., "ORD-2026-08-29-0001")
├── CustomerId (UUID, FK → Customer)
├── OrderNumber (string, sequential for readability)
├── OrderDate (datetime)
├── DeliveryAddressId (UUID, FK → Address, snapshot at order time)
├── DeliveryAddressSnapshot (JSON, full address copy at checkout time)
├── DeliverySpeed (enum: standard, express)
├── OrderStatus (enum: pending, payment_received, awaiting_vendor_dispatch, ...)
├── PublicStatus (enum: processing, in_transit, delivered, issue_reported, refunded)
├── SubTotal (decimal, ₹)
├── ShippingCost (decimal, ₹, typically 0)
├── TotalAmount (decimal, ₹)
├── PaymentStatus (enum: pending, confirmed, failed, refunded)
├── PaymentMethod (enum: upi, card_future, netbanking_future)
├── PaymentReference (string, FK to payment gateway transaction)
├── CreatedAt (datetime)
├── UpdatedAt (datetime)
└── Metadata (JSON, flexible fields)
```

**Relationships:**

- N:1 with Customer
- 1:N with OrderItems
- 1:N with OrderEvents (state machine transitions)
- 1:1 with Payment (future normalization)

**Indexes:**

- OrderId (primary)
- CustomerId
- OrderDate
- OrderStatus
- PaymentStatus

---

### 1.10 OrderItem Entity

Individual products within an order.

```
OrderItem
├── OrderItemId (UUID)
├── OrderId (UUID, FK → Order)
├── ProductId (UUID, FK → Product, snapshot at order time)
├── ProductSnapshot (JSON, name, price, image at order time)
├── Quantity (integer)
├── UnitPrice (decimal, ₹, price at order time)
├── TotalPrice (decimal, ₹, UnitPrice × Quantity)
├── SelectedColor (string, required)
├── SelectedSize (string, required)
├── SelectedImageUrl (string, required)
├── FulfillmentRoute (enum: vendor_dropship, hub_dispatch)
├── TrackingId (string, Airway Bill, nullable until dispatched)
├── FulfillmentStatus (enum: pending, shipped, delivered)
├── DeliveryDate (datetime, nullable)
└── CreatedAt (datetime)
```

**Relationships:**

- N:1 with Order
- N:1 with Product (via snapshot)

**Indexes:**

- OrderId
- FulfillmentStatus
- TrackingId

---

### 1.11 OrderEvent Entity

Audit trail of order state transitions.

**Temporal Versions:** YES (System-Versioned Temporal Table in SQL Server or equivalent)

- Tracks all price, description, and quantity changes
- Maintains audit trail for compliance
- Supports "View product as of date X"

**Relationships:**

- N:1 with Vendor
- 1:N with ProductImages
- 1:N with ProductVideos
- 1:N with CartItems
- 1:N with OrderItems

**Indexes:**

- VendorProductId
- Category
- Status
- CreatedAt

**Constraints:**

- FinalPrice = RetailPrice - Discount (if discount applied)
- Stock >= 0 (prevents negative inventory)
- Name is required and non-empty

---

### 1.4 ProductImage Entity

Media assets for products.

```
ProductImage
├── ProductImageId (UUID)
├── ProductId (UUID, FK → Product)
├── ImageUrl (string, MinIO bucket URL)
├── ThumbnailUrl (string, MinIO bucket URL)
├── AltText (string, for accessibility)
├── DisplayOrder (integer, sort order in carousel)
├── UploadedAt (datetime)
└── UploadedBy (string, admin name)
```

**Relationships:**

- N:1 with Product

**Indexes:**

- ProductId
- DisplayOrder

**Storage:**

- Original images stored in MinIO: `/products/{productId}/images/{imageId}.webp`
- Thumbnails auto-generated: `/products/{productId}/thumbnails/{imageId}.webp`
- No external CDN (all local MinIO)

---

### 1.5 ProductVideo Entity

Shoppable video content.

```
ProductVideo
├── ProductVideoId (UUID)
├── ProductId (UUID, FK → Product)
├── VideoUrl (string, MinIO bucket URL)
├── ThumbnailUrl (string, MinIO bucket URL)
├── Title (string)
├── Description (string)
├── DurationSeconds (integer)
├── DisplayOrder (integer)
├── UploadedAt (datetime)
└── UploadedBy (string, admin name)
```

**Relationships:**

- N:1 with Product (optional; video can exist without product)

**Storage:**

- Videos stored in MinIO: `/content/reels/{videoId}.mp4`
- Transcoded to 720p for playback
- Thumbnails auto-extracted at 0s

---

### 1.6 Vendor Entity

Represents product suppliers/merchants.

```
Vendor
├── VendorId (UUID)
├── Name (string, e.g., "Handloom Artisans Co.")
├── Email (string)
├── PhoneNumber (string)
├── Bio (string, heritage story, certifications)
├── WebsiteUrl (string, nullable)
├── LogoUrl (string, MinIO bucket URL)
├── CoverImageUrl (string, MinIO bucket URL)
├── Location (string, city/state)
├── FulfillmentModel (enum: vendor_dropship, hub_dispatch, both)
├── AverageShippingDays (integer, expected days to ship)
├── Status (enum: active, inactive, pending_approval)
├── CreatedAt (datetime)
└── UpdatedAt (datetime)
```

**Relationships:**

- 1:N with Products
- 1:N with VendorInventorySyncs

**Indexes:**

- Name
- Status

---

### 1.7 Cart Entity

Customer shopping cart (temporary storage before checkout).

```
Cart
├── CartId (UUID)
├── CustomerId (UUID, FK → Customer)
├── CreatedAt (datetime)
├── UpdatedAt (datetime)
└── ExpiresAt (datetime, 7 days for guests, indefinite for registered)
```

**Relationships:**

- 1:1 with Customer
- 1:N with CartItems

**Storage Strategy:**

- **Guests:** localStorage (browser) + optional Redis for fallback
- **Registered:** SQL Database (primary) + Redis (cache for performance)

---

### 1.8 CartItem Entity

Individual items in a cart.

```
CartItem
├── CartItemId (UUID)
├── CartId (UUID, FK → Cart)
├── ProductId (UUID, FK → Product)
├── Quantity (integer, 1–5)
├── SelectedColor (string, nullable)
├── SelectedSize (string, nullable)
├── AddedAt (datetime)
└── UpdatedAt (datetime)
```

**Relationships:**

- N:1 with Cart
- N:1 with Product

**Constraints:**

- Quantity between 1 and 5 (MVP limit)
- Product must exist and be active
- Duplicate items merged (not allowed in same cart)

---

### 1.9 Order Entity

Customer purchases.

```
Order
├── OrderId (UUID, e.g., "ORD-2026-08-29-0001")
├── CustomerId (UUID, FK → Customer)
├── OrderNumber (string, sequential for readability)
├── OrderDate (datetime)
├── DeliveryAddressId (UUID, FK → Address, snapshot at order time)
├── DeliveryAddressSnapshot (JSON, full address copy at checkout time)
├── DeliverySpeed (enum: standard, express)
├── OrderStatus (enum: pending, payment_received, awaiting_vendor_dispatch, ...)
├── PublicStatus (enum: processing, in_transit, delivered, issue_reported, refunded)
├── SubTotal (decimal, ₹)
├── ShippingCost (decimal, ₹, typically 0)
├── TotalAmount (decimal, ₹)
├── PaymentStatus (enum: pending, confirmed, failed, refunded)
├── PaymentMethod (enum: upi, card_future, netbanking_future)
├── PaymentReference (string, FK to payment gateway transaction)
├── CreatedAt (datetime)
├── UpdatedAt (datetime)
└── Metadata (JSON, flexible fields)
```

**Temporal Versions:** Optional (tracks status changes)

**Relationships:**

- N:1 with Customer
- 1:N with OrderItems
- 1:N with OrderEvents (state machine transitions)
- 1:1 with Payment (future normalization)

**Indexes:**

- OrderId (primary)
- CustomerId
- OrderDate
- OrderStatus
- PaymentStatus

---

### 1.10 OrderItem Entity

Individual products within an order.

```
OrderItem
├── OrderItemId (UUID)
├── OrderId (UUID, FK → Order)
├── ProductId (UUID, FK → Product, snapshot at order time)
├── ProductSnapshot (JSON, name, price, image at order time)
├── Quantity (integer)
├── UnitPrice (decimal, ₹, price at order time)
├── TotalPrice (decimal, ₹, UnitPrice × Quantity)
├── SelectedColor (string, nullable)
├── SelectedSize (string, nullable)
├── FulfillmentRoute (enum: vendor_dropship, hub_dispatch)
├── TrackingId (string, Airway Bill, nullable until dispatched)
├── FulfillmentStatus (enum: pending, shipped, delivered)
├── DeliveryDate (datetime, nullable)
└── CreatedAt (datetime)
```

**Relationships:**

- N:1 with Order
- N:1 with Product (via snapshot)

**Indexes:**

- OrderId
- FulfillmentStatus
- TrackingId

---

### 1.11 OrderEvent Entity

Audit trail of order state transitions.

```
OrderEvent
├── OrderEventId (UUID)
├── OrderId (UUID, FK → Order)
├── EventType (enum: created, payment_received, status_changed, exception_flagged, refunded, etc.)
├── OldStatus (string, previous status)
├── NewStatus (string, new status)
├── ActorType (enum: system, admin, customer)
├── ActorId (string, admin user ID or "system")
├── Timestamp (datetime)
├── Metadata (JSON, additional context)
└── Notes (string, nullable)
```

**Relationships:**

- N:1 with Order

**Indexes:**

- OrderId
- EventType
- Timestamp

**Purpose:** Full audit trail for compliance and debugging

---

### 1.12 Payment Entity (Backend Only)

Payment transaction records (no financial data stored).

```
Payment
├── PaymentId (UUID)
├── OrderId (UUID, FK → Order)
├── TransactionId (string, payment gateway reference)
├── Amount (decimal, ₹)
├── PaymentMethod (enum: upi)
├── Status (enum: pending, confirmed, failed, refunded, reversed)
├── ConfirmedAt (datetime, when webhook received)
├── RefundedAt (datetime, nullable)
├── RefundAmount (decimal, ₹, nullable)
├── RefundReference (string, reverse transaction ID, nullable)
├── WebhookSignature (string, HMAC validation)
├── GatewayResponse (JSON, full gateway payload)
├── CreatedAt (datetime)
└── UpdatedAt (datetime)
```

**Relationships:**

- 1:1 with Order

**Indexes:**

- OrderId
- TransactionId
- Status

**Constraints:**

- NO payment instrument details (PCI compliance)
- Only tokenized references and transaction IDs

---

### 1.13 Exception Entity

Customer-reported issues post-delivery.

```
Exception
├── ExceptionId (UUID)
├── OrderId (UUID, FK → Order)
├── OrderItemId (UUID, FK → OrderItem, specific item with issue)
├── ReportedBy (enum: customer, admin)
├── ReportedAt (datetime)
├── IssueType (enum: damaged, quality, wrong_item, missing_item, other)
├── Description (string)
├── PhotoUrl (string, MinIO bucket URL, nullable)
├── Status (enum: open, under_review, resolved, closed)
├── AdminNotes (string, nullable)
├── ResolutionType (enum: refund, replace, store_credit, rejected)
├── ResolvedAt (datetime, nullable)
├── ResolvedBy (string, admin name)
└── Metadata (JSON)
```

**Relationships:**

- 1:1 with Order (exception per order)
- 1:1 with OrderItem (if single-item issue)
- 1:1 with Refund (if refund approved)

**Indexes:**

- OrderId
- Status
- IssueType
- ReportedAt

---

### 1.14 Refund Entity

Refund records (reverse payments).

```
Refund
├── RefundId (UUID, e.g., "RFD-2026-08-29-0001")
├── ExceptionId (UUID, FK → Exception)
├── OrderId (UUID, FK → Order)
├── PaymentId (UUID, FK → Payment)
├── Amount (decimal, ₹)
├── Reason (string, mandatory explanation)
├── Status (enum: initiated, processing, completed, failed)
├── ReverseTransactionId (string, payment gateway reverse reference)
├── InitiatedAt (datetime)
├── InitiatedBy (string, admin name)
├── CompletedAt (datetime, nullable)
├── ExpectedCompletionDate (date, 3–5 business days out)
└── Metadata (JSON)
```

**Relationships:**

- 1:1 with Exception
- 1:1 with Order
- 1:1 with Payment (the original payment being reversed)

**Indexes:**

- RefundId
- OrderId
- Status
- InitiatedAt

---

### 1.15 VendorInventorySync Entity

Record of vendor inventory updates.

```
VendorInventorySync
├── SyncId (UUID)
├── VendorId (UUID, FK → Vendor)
├── SyncDate (date)
├── SyncMethod (enum: manual_csv, api_push, spreadsheet)
├── ItemsUpdated (integer)
├── CreatedBy (string, admin name)
├── SyncedAt (datetime)
├── FileUrl (string, MinIO bucket URL if CSV upload)
└── Notes (string, nullable)
```

**Relationships:**

- N:1 with Vendor

**Indexes:**

- VendorId
- SyncDate

---

### 1.16 DailyTheme Entity

Theme rotation calendar.

```
DailyTheme
├── ThemeId (UUID)
├── Date (date, unique)
├── ThemeName (string, e.g., "Monochrome")
├── ColorPrimary (string, hex code)
├── ColorSecondary (string, hex code)
├── ColorAccent (string, hex code)
├── BackgroundColor (string, hex code)
├── TextColor (string, hex code)
├── FontFamily (string, optional override)
└── CreatedAt (datetime)
```

**Relationships:** None

**Indexes:**

- Date (primary lookup)

**Data Entry:** Populated 7 days in advance (allows edits before go-live)

---

## Section 2: Relational Diagram (Conceptual)

```
Customer
  ├─ 1:N → Address
  ├─ 1:N → Cart
  │        └─ 1:N → CartItem → Product
  └─ 1:N → Order
           ├─ 1:N → OrderItem → Product
           ├─ 1:1 → Payment
           ├─ 1:1 → Exception → Refund
           └─ 1:N → OrderEvent

Product
  ├─ N:1 ← Vendor
  ├─ 1:N → ProductImage
  ├─ 1:N → ProductVideo
  └─ 1:N ← OrderItem

Vendor
  ├─ 1:N → Product
  └─ 1:N → VendorInventorySync
```

---

## Section 3: Data Integrity & Constraints

### 3.1 Referential Integrity

- Foreign key constraints enforced at database level
- On deletion:
  - Customer deletion: Archive (don't delete; retain for legal)
  - Product deletion: Mark as discontinued (versioned history retained)
  - Vendor deletion: Prevent if active orders exist
  - Order deletion: Prevent (immutable audit trail)

### 3.2 Unique Constraints

| Entity     | Field                                   | Uniqueness           | Reason                      |
| ---------- | --------------------------------------- | -------------------- | --------------------------- |
| Customer   | PhoneNumber                             | Global               | Primary identifier          |
| Customer   | Email                                   | Global (if provided) | Account recovery            |
| Address    | (CustomerId, StreetAddress, PostalCode) | Per customer         | Prevent duplicate addresses |
| Product    | VendorProductId                         | Global               | External system mapping     |
| Order      | OrderNumber                             | Global               | User-friendly reference     |
| Payment    | TransactionId                           | Global               | Prevent duplicate webhooks  |
| DailyTheme | Date                                    | Global               | One theme per day           |

### 3.3 Not-Null Constraints

Critical fields that must always have values:

- Order.CustomerId
- Order.TotalAmount
- OrderItem.ProductId, Quantity, UnitPrice
- Payment.TransactionId, Amount, Status
- Customer.PhoneNumber

---

## Section 4: Calculated & Derived Fields

### 4.1 Fields That Are Derived (Not Stored Separately)

- **Order.TotalAmount** = SUM(OrderItem.TotalPrice) (calculated from line items)
- **OrderItem.TotalPrice** = UnitPrice × Quantity (calculated on insert)
- **Product.FinalPrice** = RetailPrice - Discount (calculated on update)
- **Cart.CartTotal** = SUM(CartItem.Quantity × Product.FinalPrice) (calculated on fetch)
- **Order.PublicStatus** = Mapped from OrderStatus (lookup table, not stored)

### 4.2 Fields That Are Snapshots (Denormalized for Audit)

- **OrderItem.ProductSnapshot** = JSON snapshot of Product at order time
  - Why: Product details may change after order; preserve what customer paid for
- **Order.DeliveryAddressSnapshot** = JSON snapshot of Address at checkout
  - Why: Customer may change saved address later; preserve original delivery address

---

## Section 5: Temporal Data & Versioning

### 5.1 System-Versioned Tables (SQL Server / PostgreSQL)

- **Products Table:** Tracks all changes (price, description, inventory)
  - Columns: ValidFrom, ValidTo (system-managed timestamps)
  - Allows time-travel queries: "What was product XYZ's price on Aug 15?"
  - Audit trail for compliance

### 5.2 Manual Audit Trail (OrderEvent Table)

- Records every state transition
- Allows reconstruction of order lifecycle
- Example: "Order moved from Pending → Payment_Received at 10:05 AM by webhook"

---

## Section 6: Data Volume Estimates (First Year)

| Entity                  | Estimated Records | Storage        |
| ----------------------- | ----------------- | -------------- |
| Customers               | 50,000            | 50 MB          |
| Products                | 5,000             | 100 MB         |
| Orders                  | 100,000           | 200 MB         |
| OrderItems              | 200,000           | 100 MB         |
| ProductImages           | 25,000            | 50 GB (MinIO)  |
| ProductVideos           | 1,000             | 100 GB (MinIO) |
| Payments                | 100,000           | 50 MB          |
| **Total Relational DB** | **~500K rows**    | **~600 MB**    |
| **Total MinIO Storage** | **~300K files**   | **~150 GB**    |

---

## Section 7: Backup & Disaster Recovery

### 7.1 Database Backups

- **Frequency:** Daily (incremental) + Weekly (full)
- **Retention:** 30 days (compliance minimum)
- **Location:** Local NAS + Cloud (future)

### 7.2 MinIO Backups

- **Replication:** Mirrored across 2 local drives (RAID 1)
- **Frequency:** Real-time sync
- **Recovery:** Full restore possible within 24 hours

---

**Status:** 🟢 Ready for Database Implementation

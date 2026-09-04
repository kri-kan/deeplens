# 01: VISION, PROBLEM, AND SCOPE

## Product Vision

**VAYYARI** is a curated e-commerce platform for traditional handlooms designed specifically for mature, culturally-conscious buyers who appreciate craftsmanship and authenticity.

### Core Problem

Traditional handloom weavers and artisans lack a modern, elegant digital storefront that:

- Showcases their craft with proper context and heritage
- Reaches customers who value quality over fast fashion
- Manages complex logistics (vendor coordination, inventory)
- Provides a frictionless purchasing experience (especially for mobile-first Indian audiences)

### Primary User Need

Enable mature buyers to discover, learn about, and purchase high-quality handlooms with confidence and simplicity.

### Value Proposition

VAYYARI provides a curated, heritage-focused marketplace where customers find authentic handlooms with elegant UX, transparent vendor stories, and secure, frictionless payment methods (UPI).

---

## Target Users

### Primary Persona

- **Age:** 35-65
- **Income:** Middle to upper-middle class (urban India)
- **Tech Comfort:** Moderate to high (uses WhatsApp, mobile banking)
- **Purchase Motivation:** Quality, heritage, gifting (weddings, festivals)
- **Pain Points:** Distrust in e-commerce authenticity, fear of low-quality copies, complicated checkout

### Secondary Personas

- **Younger (25-35)** buying for parents/gifts
- **Overseas Indians** (diaspora) purchasing traditional wear
- **Enterprise Buyers** (institutions, bulk orders)

---

## MVP Scope

### ✅ In Scope (MVP)

- **Product Catalog:** Handlooms (Sarees, Dresses, Lehengas, Festival Wear, Kids Collection)
- **Product Discovery:** Browse by category, basic filtering, search
- **Shoppable Social Content:** Reels carousel with quick-view purchase
- **Authentication:** Passwordless (Passkey + OTP fallback)
- **Cart & Checkout:** Single-click UPI checkout (QR for desktop)
- **Order Tracking:** Public tracker showing "Processing" → "In Transit"
- **Admin Dashboard:** Mobile app for order fulfillment management
- **Fulfillment Routes:** Vendor Dropship OR Local Hub Dispatch
- **Payment Processing:** UPI only, webhook reconciliation
- **Inventory Management:** Basic stock tracking and sync with vendors

### 🟡 Future Scope (Post-MVP)

- Multiple payment methods (Credit/Debit, NetBanking, Wallets)
- Product reviews and ratings
- Customer loyalty programs
- Vendor marketplace (sellers manage own inventory)
- Recommendation engine
- Customer service chatbot
- Subscription/recurring orders
- Bulk order management
- Analytics dashboard

### ❌ Out of Scope

- Third-party marketplace (Flipkart/Amazon integration)
- Live chat support (WhatsApp only)
- Video livestreaming sales
- Augmented Reality (try-on)
- Rental or subscription models (initial phase)

---

## Success Criteria (MVP)

| Metric                     | Target                | Owner            |
| -------------------------- | --------------------- | ---------------- |
| **Time to Purchase**       | < 90 seconds (mobile) | Product/Frontend |
| **Checkout Success Rate**  | > 92%                 | Backend/Payment  |
| **Mobile Conversion**      | 60%+ of traffic       | Product          |
| **Admin Order Processing** | < 2 hours             | Operations       |
| **Product Upload Speed**   | Bulk import < 5 min   | Backend          |

---

## Key Assumptions & Decisions

### Assumption 1: Vendors are Dropship-Capable

We assume vendors can directly ship to customers or deliver to our local hub.

### Assumption 2: UPI is Primary Payment Method

Given the target demographic, UPI is the primary payment instrument. Credit cards are future scope.

### Assumption 3: Inventory is Finite & Precious

Unlike mass-market e-commerce, inventory is limited and rapidly rotating (handmade goods). Overselling is not acceptable.

### Assumption 4: Customer Service is Minimal in MVP

Customers should not need post-purchase support for most transactions. Exceptions trigger admin actions.

---

## Open Questions

1. **Vendor Relationship:** Are vendors contractually obligated to dropship, or do we pick up items locally?
2. **Inventory Real-Time Sync:** How often do vendor inventory counts update? Real-time API, daily batch, or manual?
3. **Pricing Strategy:** Is vendor pricing fixed by us or do we apply markups dynamically?
4. **Refund Window:** How long can a customer request a refund after order confirmation?
5. **Seasonal Themes:** How frequently do Daily Themes rotate? Is there a content calendar?

---

**Status:** 🟡 Ready for Refinement

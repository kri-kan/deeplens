# 09: DECISIONS, OPEN QUESTIONS, AND ASSUMPTIONS

**Purpose:** Track all product decisions made, assumptions built-in, and unresolved questions requiring future decisions.

---

## Section 1: Key Product Decisions Made

### Decision 1: UPI-Only Payments (MVP)

- **Date:** Documented in initial spec
- **Context:** Target demographic is 35–65-year-old Indians; primarily use mobile banking
- **Options Considered:**
  1. UPI + Credit/Debit + NetBanking (feature-rich)
  2. UPI + Wallet (Paytm, PhonePe) (middle ground)
  3. UPI only (MVP, simplest)
- **Selected:** UPI only
- **Rationale:**
  - Reduces PCI compliance burden (no card storage)
  - Simpler UX (one payment flow)
  - Fastest checkout
  - Aligns with target user behavior
- **Consequences:**
  - Some overseas users (credit card preferred) can't shop
  - Wallet adoption unlikely initially
  - Future: Can add payment methods post-MVP
- **Revisit:** Q4 2026 (after 6-month data collection)

---

### Decision 2: Silent Guest Account Creation

- **Date:** Documented in initial spec
- **Context:** Maximize conversion; minimize signup friction
- **Options Considered:**
  1. Mandatory account creation before purchase (most secure)
  2. Explicit "Create account" after guest checkout (transparent)
  3. Silent account creation post-purchase (frictionless)
- **Selected:** Silent account creation
- **Rationale:**
  - Lowest friction for first-time buyers
  - Automatic account enables repeat-purchase UX
  - Guest still gets WhatsApp/email notifications (works same as account holder)
- **Consequences:**
  - Customer may not realize they have account (inform via email)
  - Account recovery flow important (use phone number + OTP)
  - Privacy consideration (account created without explicit consent) → disclose in Terms
- **Implementation Notes:**
  - Flag account as "guest_origin=true" in database
  - Send email after first purchase: "Your VAYYARI account is ready. Log in with your phone number."

---

### Decision 3: 72-Hour Refund Window (Post-Delivery)

- **Date:** Documented in business rules
- **Context:** Balance customer protection with operational efficiency
- **Options Considered:**
  1. 7-day refund window (customer-friendly, but operations nightmare)
  2. 14-day refund window (standard e-commerce)
  3. 72-hour refund window (tight but workable; handmade goods rot fast)
- **Selected:** 72 hours
- **Rationale:**
  - Handmade goods are precious; lengthy refunds tie up inventory
  - Most damage is visible immediately (packaging, transit damage)
  - 72 hours = 3 days = operational agility (resolve before second refund request)
  - Can extend window case-by-case for exceptional issues
- **Consequences:**
  - Customers must act fast (may miss window due to forgetfulness)
  - After window: Must contact WhatsApp support (exception handling)
  - Potential complaints for missed refunds → clear messaging required
- **Mitigation:** Email/WhatsApp reminder at 48-hour mark: "Report any issues within 24 hours"

---

### Decision 4: Partial Shipments Allowed

- **Date:** Documented in business rules
- **Context:** Multi-item orders can ship from different sources
- **Options Considered:**
  1. All-or-nothing (wait until all items ready; slower delivery)
  2. Partial shipments (faster; more complex tracking)
- **Selected:** Partial shipments allowed
- **Rationale:**
  - Different vendors may have different readiness times
  - Handlooms are made-to-order → can't always wait
  - Faster delivery improves customer satisfaction
  - Complexity manageable with separate AWB per shipment
- **Consequences:**
  - Multiple shipments to same customer (can confuse expectations)
  - Order not "complete" until all shipments received
  - Refund eligibility per shipment (72 hours from each delivery)
- **Customer Communication:** At checkout: "You'll receive 2 shipments with separate tracking" (if applicable)

---

### Decision 5: Cart Merging on Login (Not Auto-Merge)

- **Date:** Documented in cart rules
- **Context:** Multi-device browsing (mobile → desktop)
- **Options Considered:**
  1. Auto-merge on every page load (silent, transparent)
  2. Merge on login (explicit, user-initiated)
  3. No merging (customer manages manually)
- **Selected:** Merge on login (API endpoint /api/cart/merge)
- **Rationale:**
  - Explicit action provides transparency (customer knows cart was merged)
  - Prevents accidental cart duplication
  - Avoids complexity on first-page-load
  - Guest users keep independent localStorage cart per device
- **Consequences:**
  - If guest switches devices without logging in, cart doesn't transfer
  - Manual workaround: Login → Merge → Cart unified
- **Notification:** After merge, show toast: "2 items added to cart from your shopping history"

---

### Decision 6: Inventory Decremented at Payment Confirmation (Not Checkout)

- **Date:** Documented in business rules
- **Context:** When exactly should inventory be reserved?
- **Options Considered:**
  1. At cart (items reserved immediately)
  2. At checkout (items reserved when user enters checkout flow)
  3. At payment confirmation (items reserved only after money received)
- **Selected:** At payment confirmation (webhook arrives)
- **Rationale:**
  - No wasted inventory on cart abandonment (common problem)
  - Handmade goods are scarce; minimal waste important
  - Payment webhook is source of truth (not checkout button)
  - Simpler implementation (no cart expiry logic needed)
- **Consequences:**
  - Two customers can both have same item in cart; whomever pays first gets it
  - Customer may add item, go to checkout, see "Out of Stock" (race condition)
  - But statistically rare (must both be at checkout simultaneously)
- **User Communication:** At checkout: "Stock limited. If payment fails, item may not be available for retry" (implied by "limited handlooms" positioning)

---

### Decision 7: Admin-Only Refund Initiation (Not Customer-Initiated)

- **Date:** Documented in exception handling
- **Context:** Who should trigger refunds?
- **Options Considered:**
  1. Customer self-service refund (fastest, but high abuse potential)
  2. Customer requests; admin approves (hybrid, balanced)
  3. Admin-only initiation (safest, more controlled)
- **Selected:** Admin-only (customer reports issue; admin approves refund)
- **Rationale:**
  - Prevents abuse (customers can't refund for "style preference")
  - Aligns with handloom market norm (high-value goods require human judgment)
  - Provides opportunity to resolve via replacement/store credit (cheaper than refund)
  - Admin has full context (photos, vendor quality history)
- **Consequences:**
  - Slightly slower resolution (admin must review; not instant)
  - Customer support overhead (admin must handle every exception)
  - Potential customer dissatisfaction if admin rejects without explanation
- **Mitigation:** Clear exception rules + admin training + WhatsApp follow-up for rejected refunds

---

### Decision 8: Public Order Status Abstraction (4 states, not 9 internal states)

- **Date:** Documented in order state machine
- **Context:** How much operational detail should customers see?
- **Options Considered:**
  1. Show all 9 internal states (transparent, but confusing)
  2. Show 3 simplified states (Processing → In Transit → Delivered)
  3. Show 4 states (add "Issue Reported" for exceptions)
- **Selected:** 4 states (Processing, In Transit, Delivered, Issue Reported)
- **Rationale:**
  - Reduces cognitive load (customers don't care about internal workflow)
  - Prevents anxiety (hidden states = less "why is it stuck?")
  - Exception cases visible (if issue reported, customer sees status)
- **Consequences:**
  - Admin has full visibility; customers have simplified view
  - Complex mapping logic (9 internal → 4 public)
  - Potential UX confusion if admin forgets to update customer

---

### Decision 9: Vendor Inventory Sync Weekly (Not Real-Time)

- **Date:** Documented in inventory rules
- **Context:** How often should inventory update?
- **Options Considered:**
  1. Real-time API push (vendors update constantly)
  2. Daily batch (reconcile every 24 hours)
  3. Weekly batch (reconcile every 7 days)
- **Selected:** Weekly (Sunday 2 AM)
- **Rationale:**
  - Handmade goods have slow production (not daily updates needed)
  - Reduces API overhead for vendors (simpler integration)
  - Aligned with MVP scope (manual vendor management)
  - Future: Can move to daily or real-time
- **Consequences:**
  - Inventory data may be 1 week stale (worst case)
  - Risk of overselling if vendor's actual stock changes mid-week
  - Mitigation: Add safety buffer (mark as OOS if <2 units) or manual vendor communication
- **Revisit:** Post-MVP when vendor partnerships mature

---

### Decision 10: No "Cancel Order" Button (Customers Cannot Self-Cancel)

- **Date:** Documented in public order tracker
- **Context:** Should customers be able to cancel orders?
- **Options Considered:**
  1. Self-cancel anytime (maximum flexibility)
  2. Self-cancel before dispatch only (reasonable cutoff)
  3. No self-cancel; contact support (controlled)
- **Selected:** No self-cancel (admin-only cancellation)
- **Rationale:**
  - Handmade goods already in production (can't unwind)
  - Inventory management simpler (no partial refunds due to cancellations)
  - Admin has full context (can negotiate refund if customer insists)
  - Aligns with high-touch artisan positioning (not fast-fashion)
- **Consequences:**
  - Customer must contact WhatsApp to cancel (friction)
  - Potential bad reviews if cancellation perceived as difficult
  - Admin must handle every cancellation request manually
- **Mitigation:** Fast WhatsApp response SLA (< 2 hours); clear cancellation policy at checkout

---

## Section 2: Built-In Assumptions

### Assumption A: Vendors Are Dropship-Capable or Hub-Accessible

- **Assumption:** All vendors can either:
  1. Dropship directly to customers, OR
  2. Deliver to our local hub for further dispatch
- **If False:** Major logistics redesign needed; may require warehousing investment
- **Validation:** Vendor onboarding questionnaire; confirm fulfillment capability
- **Revisit:** Before onboarding new vendors

---

### Assumption B: UPI Payment Gateway Webhook Reliability > 99%

- **Assumption:** Razorpay (or chosen gateway) webhook delivery is highly reliable
- **If False:** Payment confirmations would be significantly delayed; customer experience degrades
- **Validation:** Gateway SLA documentation; test in sandbox environment
- **Mitigation:** Automatic webhook retry logic; polling backup

---

### Assumption C: Customer's Delivery Address Remains Valid

- **Assumption:** Address provided at checkout is still valid until delivery (5–7 days)
- **If False:** Delivery fails; customer may not be reachable; RTO (Return to Origin) cost incurred
- **Mitigation:** Phone verification 24 hours before dispatch; confirmation WhatsApp

---

### Assumption D: Handloom Customers Are Repeat Buyers

- **Assumption:** 40% of customers will purchase 2+ times within 12 months
- **If False:** Requires focus on new customer acquisition; loyalty programs needed
- **Validation:** Track repeat purchase rate post-launch
- **Revisit:** Q2 2027 (after 6 months of sales data)

---

### Assumption E: Daily Theme Rotation Doesn't Impact Conversion

- **Assumption:** Changing design theme daily doesn't confuse or deter customers
- **If False:** Daily themes might hurt conversion; prefer stable design
- **Validation:** A/B test theme frequency (daily vs. weekly vs. static)
- **Revisit:** Month 1–2 post-launch

---

### Assumption F: Admin Team Can Handle < 2 Hour Fulfillment SLA

- **Assumption:** Admin can assign fulfillment routes within 2 hours of order arrival
- **If False:** Orders pile up; delivery delays; customer complaints
- **Validation:** Capacity planning; hire admins accordingly (1 admin per ~100 orders/day)
- **Revisit:** Post-launch (month 1)

---

### Assumption G: WhatsApp Is Acceptable for Customer Support (MVP)

- **Assumption:** Customers won't demand live chat or phone support
- **If False:** Support overhead increases; customer dissatisfaction
- **Validation:** Capture support requests in feedback; monitor NPS
- **Revisit:** Q4 2026 (evaluate need for chat/phone)

---

### Assumption H: Inventory Accuracy Sufficient with Weekly Sync

- **Assumption:** Weekly inventory sync + safety buffer prevents significant overselling
- **If False:** Frequent "out of stock after payment" scenarios; bad customer experience
- **Validation:** Track overselling incidents; measure impact
- **Revisit:** If overselling > 5% of orders

---

## Section 3: Open Questions Requiring Future Decisions

### Question 1: Subscription/Replenishment Model (Future)

- **Scope:** Out of scope for MVP; consider post-launch
- **Question:** Should customers subscribe to handloom items (e.g., "New blue saree every month")?
- **Implications:**
  - Recurring revenue for platform
  - Requires vendor partnerships (curated collections)
  - Payment complexity (recurring charges)
- **Decision Needed:** Q4 2026 (if demand exists)

---

### Question 2: Multi-Language Support

- **Scope:** Out of scope for MVP (English only); MVP+1 feature
- **Question:** Should product descriptions be available in Tamil, Telugu, Hindi, etc.?
- **Implications:**
  - Broader market reach (3x user base in regional languages)
  - Translation overhead (quality, maintenance)
  - Localized payment methods (regional payment apps)
- **Decision Needed:** Q2 2027

---

### Question 3: Seller Marketplace (Vendor Self-Service)

- **Scope:** Out of scope for MVP (admin-curated only)
- **Question:** Should vendors manage their own inventory, pricing, and orders?
- **Implications:**
  - Vendor autonomy (less admin overhead)
  - Platform becomes genuine marketplace
  - Vendor conflict management (quality, pricing disputes)
- **Decision Needed:** Q4 2026 (if vendor scalability becomes bottleneck)

---

### Question 4: Recommendation Engine & Personalization

- **Scope:** Out of scope for MVP (basic browse/search only)
- **Question:** Should we recommend products based on browsing history?
- **Implications:**
  - Increased engagement
  - Complex ML infrastructure
  - Data privacy considerations (tracking)
- **Decision Needed:** Q1 2027 (after analyzing user behavior data)

---

### Question 5: Bulk Order Pricing

- **Scope:** Out of scope for MVP (individual purchases only)
- **Question:** Should there be discounts for bulk orders (e.g., businesses, events)?
- **Implications:**
  - New revenue segment (B2B channel)
  - Fulfillment complexity (large shipments)
  - Vendor negotiation (custom pricing)
- **Decision Needed:** Q3 2027 (after validating retail market)

---

### Question 6: Exchange/Return (Not Just Refunds)

- **Scope:** Out of scope for MVP (refunds only)
- **Question:** Should customers be able to exchange items (size, color change)?
- **Implications:**
  - Better customer satisfaction (alternative to refund)
  - Inventory complexity (item restock, validation)
  - Logistical cost (return shipping)
- **Decision Needed:** Q4 2026 (monitor exception types; if common, add exchange)

---

### Question 7: Vendor Performance Ratings (Public or Private?)

- **Scope:** Undecided
- **Question:** Should customers see vendor ratings? Should ratings be public?
- **Implications:**
  - Transparency (customers choose vendor)
  - Vendor pressure (bad ratings = less sales)
  - Quality incentive (vendors compete on reliability)
- **Options:**
  1. Public ratings (Etsy-style)
  2. Private ratings (admin-only visibility)
  3. No ratings (curated, no ratings needed)
- **Decision Needed:** Before MVP launch (affects vendor trust)

---

### Question 8: Refund Reversal SLA

- **Scope:** Documented as "3–5 business days" but not firm
- **Question:** What should we guarantee for refund arrival time?
- **Implications:**
  - Customer satisfaction (faster = better)
  - Vendor liability (if refund delayed, customer complains)
  - Bank processing time (outside our control)
- **Options:**
  1. "24–48 hours" (aggressive; requires gateway support)
  2. "3–5 business days" (standard; bank-dependent)
  3. "Up to 7 days" (safe, but slow)
- **Decision Needed:** During payment gateway selection

---

### Question 9: Loyalty/Rewards Program

- **Scope:** Out of scope for MVP
- **Question:** Should first-time buyers or repeat customers get discounts/credits?
- **Implications:**
  - Incentivizes repeat purchases
  - Requires loyalty system (tracking, point calculation)
  - Vendor margin reduction (platform absorbs discount)
- **Decision Needed:** Q2 2027 (after analyzing retention data)

---

### Question 10: Social Sharing & Referral

- **Scope:** Out of scope for MVP
- **Question:** Should customers be incentivized to share/refer friends?
- **Implications:**
  - Viral growth potential
  - Referral program management
  - Fraud prevention (fake referrals)
- **Decision Needed:** Q3 2027 (if organic growth plateau)

---

### Question 11: What If Vendor Cannot Fulfill Order?

- **Scope:** Partially documented (marked as exception); needs firm SLA
- **Question:** If vendor says "We ran out of stock," what's the protocol?
- **Options:**
  1. Admin initiates full refund (+ apology discount)
  2. Admin offers alternative product of same value
  3. Admin delays order (wait for restock) with customer approval
- **Decision Needed:** Before go-live (document in vendor SLA)

---

### Question 12: How Should We Handle Duplicate Orders?

- **Scope:** Not documented
- **Question:** If customer accidentally submits checkout twice (double-tap), do we charge twice?
- **Options:**
  1. Accept both orders (customer's fault; no refund)
  2. Detect and warn before payment (smart UX)
  3. Refund second order automatically (customer-friendly)
- **Decision Needed:** During frontend implementation (add safeguard)

---

## Section 4: Decisions to Revisit Post-Launch

| Decision              | Review Date | Trigger Condition                                       |
| --------------------- | ----------- | ------------------------------------------------------- |
| UPI-Only Payments     | Q4 2026     | If >10% checkout abandonment due to payment method      |
| Silent Guest Accounts | Q4 2026     | If > 5% support tickets about "I didn't create account" |
| 72-Hour Refund Window | Q1 2027     | If >20% of issues reported outside 72-hour window       |
| Partial Shipments     | Q4 2026     | If customer confusion/complaints > 5% of orders         |
| Weekly Inventory Sync | Q4 2026     | If overselling >2% of orders                            |
| WhatsApp-Only Support | Q4 2026     | If NPS < 6 or support response time > 4 hours           |
| No Self-Cancel        | Q1 2027     | If cancellation requests > 10% of support volume        |
| Daily Theme Rotation  | Month 2     | If A/B test shows negative impact on conversion         |

---

## Section 5: Risk Registry & Mitigation

| Risk                                                | Probability | Impact   | Mitigation                                                                  |
| --------------------------------------------------- | ----------- | -------- | --------------------------------------------------------------------------- |
| Vendor dropship fails; refund needed                | Medium      | High     | Clear vendor SLAs; manual fulfillment backup; customer SLA                  |
| Payment gateway down (hours)                        | Low         | High     | Use multiple gateways (future); clear customer comms; manual reconciliation |
| Inventory overselling (customer pays, out of stock) | Medium      | High     | Safety buffer; real-time sync (future); refund priority                     |
| Customer "lost" order after payment; demands refund | Medium      | Medium   | Webhook retry; polling backup; email confirmation; tracking link prominent  |
| Refund reversal fails (bank issue)                  | Low         | Medium   | Payment gateway handles; admin manual follow-up; ledger bot for audit       |
| Admin team overwhelmed (fulfillment backlog)        | Medium      | Medium   | Hire additional admins; capacity planning; SLA monitoring                   |
| Data breach (MinIO, database)                       | Low         | Critical | Encryption; access control; backup redundancy; incident response plan       |
| Vendor colludes to manipulate inventory             | Low         | Medium   | Audit trail; periodic reconciliation; vendor reputation system (future)     |

---

## Section 6: Change Log (Product Spec Versions)

| Date       | Version | Changes                                          |
| ---------- | ------- | ------------------------------------------------ |
| 2026-08-29 | 1.0     | Initial spec breakdown; all decisions documented |
| TBD        | 1.1     | Pending user feedback / stakeholder review       |
| TBD        | 1.2     | Post-MVP 1 (after 3-month soft launch)           |

---

**Status:** 🟡 Decisions Documented; Awaiting Leadership Validation
**Next Action:** Stakeholder review → Approval → Move to Implementation

---

### Decision N+1: PDP Gallery — Mobile Dot Carousel (No Thumbnail Strip)

- **Date:** 2026-08-30
- **Context:** Mobile thumbnail strip (horizontal row of square swatches above hero image) felt cluttered and unlike the native app patterns users were familiar with (Myntra, Ajio)
- **Options Considered:**
  1. Horizontal thumbnail strip above hero (original)
  2. Thumbnails below hero
  3. Dot indicators overlaid at bottom of full-width hero (Myntra pattern)
- **Selected:** Option 3 — dot indicators at bottom of hero
- **Rationale:**
  - More screen area for hero image (better product impression)
  - Familiar mobile carousel pattern — users understand tapping dots
  - Active dot morphs to wide pill to clearly show selected state
- **Consequences:**
  - Desktop retains side thumbnail strip (unchanged)
  - Dot tap = same state change as color card tap

---

### Decision N+2: Colour Selector — Grouped Thumbnail Cards

- **Date:** 2026-08-30
- **Context:** Plain color dot circles gave no visual product preview and no way to group tones
- **Options Considered:**
  1. Color dot circles only (original)
  2. Flat row of thumbnail cards (no grouping)
  3. Grouped thumbnail cards with tone family labels (Myntra pattern)
- **Selected:** Option 3 — grouped thumbnail cards
- **Rationale:**
  - Mini gradient swatch gives realistic color preview
  - Color name label eliminates ambiguity ("is this stone or sand?")
  - Grouping by tone family helps users navigate collections by mood
- **Consequences:**
  - Neutral colors (Stone, Sand) must be cross-listed in both warm + neutral groups
  - Card width fixed at 68px for consistent thumb appearance

---

### Decision N+3: Wishlist — Heart Icon (Global + PDP)

- **Date:** 2026-08-30
- **Context:** "Wishlist" text in header and PDP button felt like a utility label, not an emotional cue
- **Selected:** Heart icon replaces all Wishlist text labels
- **Rationale:**
  - Universal recognition (heart = save/love)
  - Saves horizontal space in header
  - Toggling hollow to filled gives satisfying tactile feedback
- **Implementation:**
  - Header: filled red heart (#e05a5a), always visible
  - PDP heart: toggles hollow (default) to filled red (#e05a5a) with tinted background (#fff5f5)
  - State: local session toggle for now; server-side persistence is future phase

---

### Decision N+4: Add to Bag — Sticky Bar on Mobile

- **Date:** 2026-08-30
- **Context:** The Add to Bag button was buried in the product panel; when scrolling into description/specs/reviews, users lost access to it
- **Options Considered:**
  1. Always-visible fixed button (blocks content even above product panel)
  2. Scroll-triggered sticky bar (Myntra pattern)
  3. Floating FAB button
- **Selected:** Option 2 — scroll-triggered sticky bar
- **Rationale:**
  - Only activates when contextually useful (user has scrolled past product info)
  - Shows price + product name, reinforcing what they are adding
  - Non-intrusive: disappears when scrolling back to product panel zone
- **Implementation:** onLayout captures product panel bottom Y; onScroll compares scrollY

---

### Decision N+5: PDP Below-the-Fold Content Structure

- **Date:** 2026-08-30
- **Context:** PDP previously ended after "You may also like." Myntra reference showed significantly richer below-fold content driving conversion and discovery
- **Sections Added:**
  1. Specifications (product attributes grid)
  2. Ratings and Reviews (aggregate + bars + photos + reviews)
  3. Frequently Bought Together (bundle purchasing)
  4. Fastest Selling Similar Products (urgency + social proof)
  5. Sponsored Products (monetisation surface)
  6. Similar Products (cross-sell)
  7. Trending among customers like you (personalisation hook)
  8. More Category Links (SEO + discovery)
  9. More Information (product code + expandable)
- **Rationale:** Increases average session depth and provides multiple conversion hooks below the fold
- **Design choice:** All horizontal scroll sections use 160px card width with rating badge overlaid at image bottom-left


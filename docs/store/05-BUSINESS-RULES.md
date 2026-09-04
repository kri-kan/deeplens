# 05: BUSINESS RULES AND OPERATIONAL LOGIC

**Purpose:** Explicit operational rules governing VAYYARI's behavior. These rules determine how the system responds to edge cases, conflicts, and customer requests.

---

## Section 1: Inventory Management Rules

### 1.1 Inventory Allocation Strategy

- **Allocation Trigger:** When order status transitions to "Confirmed" (payment webhook received)
- **Not at Cart:** Items in cart do NOT reserve inventory
- **Why:** Handmade goods are precious; must minimize overselling

### 1.2 Out-of-Stock Handling

- **Detection:** At checkout, if quantity exceeds available stock
- **Action:** Prevent checkout; show error message
- **Message:** "Sorry, only {remaining_qty} left. Update your quantity?"
- **Customer Options:**
  1. Reduce quantity to available amount
  2. Proceed with reduced quantity
  3. Add to Wishlist & get notified when back in stock (future)
  4. Browse alternatives (suggested products)

### 1.3 Inventory Decrement Timing

- **Decremented At:** "Confirmed" status (payment webhook validated)
- **Not Incremented Back Until:** Order status moves to "Cancelled" (exception case)
- **Consequence:** If customer closes app mid-checkout, inventory is NOT held; another customer can immediately purchase

### 1.4 Vendor Inventory Sync

- **MVP:** Manual sync (admin enters vendor stock counts)
- **Process:**
  1. Vendor provides updated inventory CSV
  2. Admin uploads via dashboard
  3. System reconciles: Existing SKU quantities updated
  4. Out-of-stock items marked unavailable (frontend shows "Coming Soon")
- **Frequency:** Weekly (Sunday) or on-demand
- **Conflict Resolution:** If customer places order for item that was marked OOS mid-sync, order proceeds if stock exists in database

---

## Section 2: Order State Machine (Internal & External)

### 2.1 Internal Operational States (Admin-Facing)

These represent the true operational status of an order.

| State                        | Entered From                                    | Entered When                          | Actions Available        | Next State                                         |
| ---------------------------- | ----------------------------------------------- | ------------------------------------- | ------------------------ | -------------------------------------------------- |
| **Pending**                  | N/A                                             | Order created, awaiting payment       | -                        | Payment_Received OR Cancelled                      |
| **Payment_Received**         | Pending                                         | Webhook validates payment             | Assign fulfillment route | Awaiting_Vendor_Dispatch OR Procuring_To_Local_Hub |
| **Awaiting_Vendor_Dispatch** | Payment_Received                                | Admin selects Vendor Dropship         | Monitor vendor           | Dispatched                                         |
| **Procuring_To_Local_Hub**   | Payment_Received                                | Admin selects Hub Dispatch            | Monitor hub              | Ready_For_Packaging                                |
| **Ready_For_Packaging**      | Procuring_To_Local_Hub                          | Items arrive at hub                   | Confirm pickup           | Dispatched                                         |
| **Dispatched**               | Awaiting_Vendor_Dispatch OR Ready_For_Packaging | Courier pickup confirmed; AWB entered | Monitor courier          | Delivered                                          |
| **Delivered**                | Dispatched                                      | Courier confirms delivery             | Allow issue reporting    | Complete OR Exception_Flagged                      |
| **Exception_Flagged**        | Delivered                                       | Customer reports issue                | Process refund/exchange  | Refunded OR Exchanged                              |
| **Refunded**                 | Exception_Flagged                               | Reverse payment processed             | -                        | Complete                                           |
| **Cancelled**                | Pending OR Payment_Received (rare)              | Admin or system cancellation          | (None)                   | Complete                                           |

### 2.2 Public Customer-Facing States

Customers see ONLY these simplified states; internal complexity is hidden.

| Public State       | Corresponds to Internal State(s)                                                                 | What Customer Sees                                             | Example Timeline                 |
| ------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | -------------------------------- |
| **Processing**     | Pending, Payment_Received, Awaiting_Vendor_Dispatch, Procuring_To_Local_Hub, Ready_For_Packaging | "We're preparing your order"                                   | After payment until AWB assigned |
| **In Transit**     | Dispatched                                                                                       | "Your order is on its way" + Courier name + AWB (if available) | After courier picks up           |
| **Delivered**      | Delivered                                                                                        | "Your order has arrived" + Delivery timestamp                  | After customer receives          |
| **Issue Reported** | Exception_Flagged                                                                                | "We're looking into your report" + Issue status                | Customer reported damage/quality |
| **Refunded**       | Refunded                                                                                         | "Refund processed" + Refund amount + Expected arrival date     | After admin approves refund      |

### 2.3 Transition Rules

#### Pending → Payment_Received

- **Trigger:** Webhook receives payment confirmation from gateway
- **Validation:** HMAC signature verified; Order ID matches
- **Action:** SignalR broadcasts NewOrderReceived event to admin dashboard
- **Side Effects:**
  - Inventory decremented by 1 per SKU
  - Customer receives order confirmation (Email + WhatsApp)
  - Ledger bot receives order details

#### Payment_Received → Awaiting_Vendor_Dispatch OR Procuring_To_Local_Hub

- **Trigger:** Admin selects fulfillment route in mobile app
- **Decision Point:** Admin groups items by fulfillment strategy
- **If Vendor Dropship:** Awaiting_Vendor_Dispatch
- **If Hub Dispatch:** Procuring_To_Local_Hub
- **Side Effects:**
  - Pick-list generated and sent to warehouse/vendor
  - Vendor/hub team notified via internal system

#### Awaiting_Vendor_Dispatch → Dispatched

- **Trigger:** Admin enters tracking ID (Airway Bill number)
- **Precondition:** Vendor has confirmed shipment ready
- **Action:**
  - Order status updated to Dispatched
  - Customer notified: "Your order is in transit" (WhatsApp + Email)
  - Public order tracker updates to "In Transit"
- **AWB Visibility:** Customer can now see Airway Bill number

#### Procuring_To_Local_Hub → Ready_For_Packaging

- **Trigger:** Hub warehouse confirms items received
- **Action:**
  - Status updated to Ready_For_Packaging
  - Warehouse team packages order
  - Awaiting courier pickup

#### Ready_For_Packaging → Dispatched

- **Trigger:** Admin enters tracking ID (Airway Bill number) after courier pickup
- **Action:** Same as Awaiting_Vendor_Dispatch → Dispatched transition

#### Dispatched → Delivered

- **Trigger:** Courier confirms delivery
- **Method:** Courier sends webhook (if integrated) OR admin manually marks delivered
- **Action:**
  - Order status updated to Delivered
  - Customer notified: "Order delivered" (WhatsApp + Email)
  - Timeline updated on public tracker
  - "Report Issue" button becomes available (72-hour window)

#### Delivered → Exception_Flagged

- **Trigger:** Customer taps "Report Issue" within 72 hours of delivery
- **Window:** Customer has 72 hours to report damage/quality issues
- **After Window:** Issue form disabled; customer must contact WhatsApp support
- **Action:**
  - Admin notified immediately (SignalR + WhatsApp bot)
  - Order visible in "Exceptions" section of admin dashboard

#### Exception_Flagged → Refunded (or Exchanged, future)

- **Trigger:** Admin decides "Refund" and confirms with order ID
- **Process:**
  1. Admin selects "Refund" action
  2. Admin enters reason (mandatory: Damaged, Quality, Wrong Item, Other)
  3. System shows confirmation: "Reverse ₹3,499 UPI payment?"
  4. Admin types order ID to confirm (typo prevention)
  5. Backend calls payment gateway refund API
  6. Customer notified via WhatsApp with refund reference number
  7. Status updated to Refunded
- **Refund Timeline:** 3–5 business days (bank-dependent)
- **Future Options:** Replace/Exchange (alternative to refund)

---

## Section 3: Payment Processing & Reconciliation

### 3.1 Order & Payment Lifecycle

#### Step 1: Order Created (Frontend)

- **Endpoint:** POST /api/orders
- **Body:** Cart items, delivery address, customer phone
- **Response:** OrderID, UPI Intent URI or QR code payload
- **Database Action:** Order created in **Pending** state
- **No Inventory Decremented Yet**

#### Step 2: Payment Handoff (Frontend)

- **Mobile:** Browser redirects to UPI Intent URI (OS app selector)
- **Desktop:** Modal shows QR code with countdown timer
- **No Backend Action Yet** (waiting for customer to complete payment)

#### Step 3: Payment Confirmation (Payment Gateway)

- **Gateway Behavior:** After successful payment, gateway POSTs to /api/checkout/webhook
- **Webhook Payload:**
  ```json
  {
    "orderId": "ORD-2026-08-29-0001",
    "transactionId": "TXN123456",
    "amount": 3499,
    "status": "success",
    "timestamp": "2026-08-29T10:05:00Z",
    "signature": "HMAC_SHA256_SIGNATURE"
  }
  ```

#### Step 4: Webhook Validation (Backend)

- **Endpoint:** POST /api/checkout/webhook
- **Validation Steps:**
  1. Verify HMAC signature using gateway's secret key
  2. Check OrderID exists in database
  3. Confirm amount matches order total
  4. Check transaction is not duplicate (idempotency key)
- **If Valid:** Proceed to Step 5
- **If Invalid:** Log error; respond 400; do NOT update order

#### Step 5: Order Confirmation (Backend)

- **Database Update:**
  - Order status: Pending → Payment_Received
  - Add payment reference: transactionId, timestamp
  - Decrement inventory by ordered quantities
- **Async Actions:**
  - SignalR broadcast NewOrderReceived to admin dashboard
  - Send order confirmation Email
  - Send order confirmation WhatsApp
  - Push order to Ledger bot (Telegram/WhatsApp)
- **Response to Gateway:** HTTP 200 (acknowledgment)

#### Step 6: Frontend Confirmation (Frontend)

- **Mobile: Redirect**
  - After payment app completes → Redirect to order confirmation page
  - Page polls backend every 3 seconds to check if webhook arrived
  - Once confirmed: Show "Order Confirmed" screen
- **Desktop: Polling**
  - Page continuously polls backend every 3 seconds
  - Once webhook confirmed: Show "Order Confirmed" screen
  - If no confirmation after 5 min: Show "Payment may be processing. Check order history."

### 3.2 Webhook Idempotency (Duplicate Prevention)

- **Problem:** Payment gateway may retry webhook multiple times
- **Solution:** Idempotency key (unique per transaction)
- **Implementation:**
  - Check if (orderId, transactionId) tuple already processed
  - If yes: Return 200 (success) but don't re-process
  - If no: Process normally
- **Storage:** Redis cache or database unique constraint

### 3.3 Payment Timeout & Retry

- **Scenario:** Customer closes app before gateway confirms payment
- **Timeline:**
  1. Customer initiates payment (order in Pending state)
  2. Customer closes app (no webhook yet)
  3. Payment actually succeeds in background
  4. Webhook arrives 30 seconds later
  5. Backend processes webhook normally (order moves to Payment_Received)
- **Customer Experience:**
  - If customer returns to app within 5 min: "Checking your payment..." screen
  - If webhook confirmed: Auto-redirect to order confirmation
  - If no confirmation after 5 min: "Payment may be in progress. Check order history."

### 3.4 Failed Payment Handling

- **Scenario:** Customer initiates payment; gateway declines
- **Options (Payment Gateway-Dependent):**
  1. **Option A:** Gateway POSTs webhook with status=failed
     - Backend moves order to Cancelled state
     - Inventory restored
     - Customer shown error: "Payment declined. Try again?"
  2. **Option B:** No webhook for failed payment
     - Frontend timeout (no confirmation after 5 min)
     - Show: "Payment unsuccessful. Try again?"
     - Order remains Pending (no inventory impact)
- **Customer Can Retry:** Same order ID, same payment flow

---

## Section 4: Refund & Exception Handling

### 4.1 Refund Eligibility Rules

- **Who Can Initiate:** Admin only (not customer in MVP)
- **Trigger:** Customer reports issue within 72 hours of delivery
- **Valid Reasons:**
  - Item damaged in transit
  - Item quality different from photos
  - Wrong item shipped
  - Item missing (partial shipment)
- **Out-of-Scope:** Style preference mismatch, "thought it would be smaller," etc.

### 4.2 Refund Process

1. **Customer Reports Issue**
   - Taps "Report Issue" from order tracker
   - Selects reason (multiple choice)
   - Optionally uploads photo
   - Submits

2. **Admin Reviews**
   - Mobile app shows new exception in dashboard
   - Admin can message customer via WhatsApp for more info (future)
   - Admin decides: Refund, Replace (future), or Reject

3. **Admin Approves Refund**
   - Types order ID to confirm (2-step verification)
   - System initiates reverse UPI payment
   - Payment gateway processes reversal within 24 hours
   - Refund appears in customer's bank account within 3–5 business days

4. **Customer Notification**
   - Immediate WhatsApp: "Your refund has been initiated. Reference: RFD-123456"
   - Order tracker updates to "Refunded"
   - Email with refund details

### 4.3 Special Case: Out-of-Stock After Payment

- **Scenario:** Item paid for but vendor cannot fulfill (e.g., lost in production)
- **Admin Action:** Flag as "Out of Stock Exception"
- **Decision Options:**
  - Full Refund (+ ₹500 store credit as goodwill)
  - Substitute with similar product (customer approval required)
- **Timing:** Within 24 hours of discovering stockout (before dispatch)

### 4.4 Refund Failure Handling

- **Scenario:** Reverse UPI fails (e.g., bank network issue)
- **Attempt:** Retry up to 3 times automatically (backend scheduled job)
- **If Still Fails:** Admin manually retries via mobile app
- **Customer Communication:** "Refund processing may take longer. We'll notify you."
- **Audit:** All attempts logged in database for compliance

---

## Section 5: Cart & Checkout Rules

### 5.1 Guest Checkout

- **Allowed?** Yes
- **Guest Account Creation:** "Silent" — after guest provides phone number and completes purchase, account created automatically
- **Phone Number Required:** Yes (for order tracking + WhatsApp notifications)
- **Email Optional:** Yes (for account recovery)
- **Can Guest Login Later?** Yes; use same phone number + OTP
- **Saved Items:** Cart persisted to new account after login

### 5.2 Cart Merging (Multi-Device)

- **Scenario:** Guest browses on mobile (cart in localStorage), returns on desktop
- **Expected:** Guest has same cart on desktop? NO (different device, different localStorage)
- **After Login:** When guest logs in on desktop, system calls /api/cart/merge
  - Backend fetches guest's historical cart from database/Redis
  - Merges with current localStorage cart
  - Resolves duplicates: Max quantity of each SKU
  - Saves merged cart to account
- **Example:**
  - Mobile cart: Blue Saree (qty 1), Red Saree (qty 1)
  - Desktop cart (after login merge): Blue Saree (qty 1), Red Saree (qty 1)
  - Result: Merged cart shows both items (no duplication)

### 5.3 Cart Expiry

- **Guest Cart:** Expires after 7 days of inactivity
- **Logged-in Cart:** Persists indefinitely (across sessions)
- **Action:** Expired carts archived; items not recovered
- **Why:** Handmade goods rotate; old cart items may be out of stock

### 5.4 Quantity Limits

- **Max Per SKU:** 5 (prevents bulk order abuse in MVP)
- **Exception:** Enterprise buyers (future scope)
- **Behavior:** Quantity input capped at 5; "Contact us for bulk orders" link below

### 5.5 Checkout Address Validation

- **Required Fields:** Full Name, Phone Number, Street Address, City, Postal Code
- **Format Validation:** Phone must be +91 format; Postal code 6 digits
- **Duplicate Detection:** If address exactly matches saved address, suggest "Use Saved Address"
- **Future:** Address autocomplete (Google Maps API)

---

## Section 6: Vendor Fulfillment Rules

### 6.1 Fulfillment Route Assignment

- **Options:**
  1. **Vendor Dropship:** Item ships directly from vendor to customer
  2. **Local Hub Dispatch:** Vendor delivers item to VAYYARI's local hub; hub ships to customer

- **Decision Criteria:**
  - Vendor capability (can they dropship?)
  - Lead time (which is faster?)
  - Customer location (proximity to hub or vendor?)
  - Inventory location (where is item physically?)

### 6.2 Multi-Item Order (Mixed Routes)

- **Scenario:** Customer orders Blue Saree (in stock at vendor) + Red Saree (in hub)
- **Handling:** Two separate shipments allowed
  - Blue Saree: Vendor Dropship (ships immediately)
  - Red Saree: Hub Dispatch (ships from hub)
- **Communication:** Customer informed: "You'll receive 2 shipments with separate tracking"
- **Tracking:** Separate Airway Bills for each shipment

### 6.3 Partial Shipment Rule

- **Allowed?** Yes
- **Notification:** Customer gets separate tracking for each shipment
- **Complete Order:** Order marked "Delivered" only after ALL items received
- **Refund Eligibility:** If item in second shipment is damaged, customer can report within 72 hours of that shipment's delivery

---

## Section 7: Timing & SLA Rules

### 7.1 Order Processing Timeline

| Stage                       | SLA                   | Owner           |
| --------------------------- | --------------------- | --------------- |
| Payment Confirmation        | < 2 min               | Payment Gateway |
| Order in Admin Dashboard    | < 30 sec              | Backend         |
| Fulfillment Assignment      | < 2 hours             | Admin           |
| Pick-List Generation        | < 5 min               | Backend         |
| Vendor/Hub Dispatch         | 24–48 hours           | Vendor/Hub      |
| Dispatch Confirmation (AWB) | < 1 hour after pickup | Admin           |
| Courier Delivery            | 5–7 days              | Courier         |
| Exception Resolution        | 24–48 hours           | Admin           |

### 7.2 Refund Processing Timeline

- **Admin Approval to Reverse API Call:** < 5 min
- **Reverse API to Bank Processing:** 24–48 hours
- **Bank Processing to Customer Account:** 3–5 business days
- **Total:** 3–6 business days (in normal cases)

### 7.3 Report Issue Window

- **Available After:** Delivery confirmed
- **Window:** 72 hours after delivery
- **After Window Closes:** "Report Issue" button disabled; customer must contact WhatsApp support

---

## Section 8: Notification Rules

### 8.1 Customer Notifications (Automatic)

| Event                 | Channel          | Timing                            | Message                                                    |
| --------------------- | ---------------- | --------------------------------- | ---------------------------------------------------------- |
| Order Confirmed       | Email + WhatsApp | Immediately after webhook         | "Your order #ORD-XX is confirmed. Tracking link: [url]"    |
| Processing Update     | WhatsApp         | When status changes to In Transit | "Your order is on the way! Tracking: [AWB]"                |
| Delivery Confirmation | WhatsApp + Email | When marked Delivered             | "Your order has arrived! Report issues: [link]"            |
| Refund Initiated      | WhatsApp + Email | When refund approved              | "Refund initiated. Reference: RFD-XX. Expect in 3–5 days." |

### 8.2 Admin Notifications

| Event                   | Channel                | Timing      |
| ----------------------- | ---------------------- | ----------- |
| New Order               | SignalR + WhatsApp Bot | Immediately |
| Customer Issue Reported | SignalR + WhatsApp Bot | Immediately |
| Refund Request          | Mobile App Badge       | Immediately |
| Vendor Delayed          | Manual Check           | Daily 9 AM  |

### 8.3 Notification Opt-Out

- **Customer Can Disable:** WhatsApp notifications only (Email retained)
- **Admin Cannot Opt-Out:** All notifications mandatory

---

## Section 9: Data Retention & Archival

### 9.1 How Long is Data Kept?

| Data Type          | Retention              | Reason                  |
| ------------------ | ---------------------- | ----------------------- |
| Orders (Complete)  | 7 years                | Legal/tax compliance    |
| Payment Records    | 7 years                | Fraud investigation     |
| Refund Records     | 7 years                | Chargeback defense      |
| Customer Profiles  | Until deletion request | User data retention     |
| Ledger Bot Backups | Indefinite             | Immutable audit trail   |
| Deleted Products   | History only           | Versioning; no deletion |

### 9.2 Right to Erasure (GDPR/Local)

- **Customer Can Request:** Delete all personal data
- **Exceptions:** Orders (kept for legal), payment records (kept for compliance)
- **Anonymization:** Customer name/email removed; order ID retained

---

## Section 10: Concurrent Order Conflicts

### 10.1 Race Condition: Two Customers, One Item

- **Scenario:**
  1. Customer A has Blue Saree in cart (1 qty available)
  2. Customer B has Blue Saree in cart
  3. Both proceed to checkout within 1 second
  4. Customer A pays first
  5. Inventory becomes 0
  6. Customer B attempts checkout

- **Behavior:**
  - Inventory decremented when Customer A's webhook arrives
  - Customer B's checkout blocked: "Out of stock. Qty available: 0"
  - Customer B cannot proceed; receives error message
  - Customer B can proceed with reduced quantity or browse alternatives

### 10.2 Race Condition: Same Customer, Multiple Browsers

- **Scenario:** Customer has 2 tabs open; adds item in tab 1, adds same item in tab 2
- **Behavior:** Both tabs have independent localStorage carts; merging happens at login only
- **On Checkout:** Server-side validation prevents overshopping (max 5 per SKU enforced)

---

## Section 11: Error States & Fallback Behavior

### 11.1 Payment Gateway Unavailable

- **Behavior:**
  1. Checkout page shows: "Payment service temporarily unavailable. Try again in 5 min."
  2. Cart is preserved
  3. Customer can retry
  4. SLA: Service restored within 1 hour (critical issue)

### 11.2 Inventory Service Unavailable

- **Behavior:**
  - Product detail pages load (cached data)
  - Checkout blocked: "Can't verify stock. Try again in 5 min."
  - Cart preserved
  - SLA: Resolved within 30 min

### 11.3 Email/WhatsApp Gateway Fails

- **Behavior:**
  - Order still processes
  - Notification queued for retry (up to 24 hours)
  - Admin notified of delivery failure
  - Customer can view order in account (fallback UI)

---

## Decision Log

| Decision                 | Context               | Options                              | Selected        | Rationale                                                   |
| ------------------------ | --------------------- | ------------------------------------ | --------------- | ----------------------------------------------------------- |
| UPI-Only Payments        | Payment methods       | UPI-only vs. Multiple                | UPI-only        | Simpler UX for target demographic; zero PCI overhead        |
| Silent Guest Accounts    | Guest checkout flow   | Explicit account creation vs. Silent | Silent          | Reduces friction; automatic account created post-purchase   |
| 72-Hour Issue Window     | Refund eligibility    | 7 days vs. 14 days vs. 72 hours      | 72 hours        | Balances customer protection with operational simplicity    |
| Cart Merging Trigger     | Multi-device shopping | Auto-merge vs. Manual                | On Login        | Explicit user action provides transparency                  |
| Max Qty Per SKU          | Quantity limits       | No limit vs. 5 vs. 10                | 5               | MVP scope (prevents bulk abuse); can raise for enterprise   |
| Partial Shipment Allowed | Order fulfillment     | Combine vs. Ship separately          | Ship separately | Faster delivery; acceptable for handlooms (different items) |

---

**Status:** 🟡 Needs Final Validation
**Open Questions:**

1. How often should vendor inventory sync? Daily batch or weekly?
2. Should there be auto-cancellation for orders stuck in "Awaiting_Vendor_Dispatch" > 48 hours?
3. Should we allow customer-initiated order modification (qty, address change) before dispatch?

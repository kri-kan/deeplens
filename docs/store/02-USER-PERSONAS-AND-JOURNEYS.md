# 02: USER PERSONAS AND JOURNEYS

## Primary Persona: Priya (Age 52, Urban Professional)

### Profile

- **Occupation:** Senior HR Manager in a tech company
- **Location:** Bangalore
- **Tech Comfort:** High (WhatsApp, online banking, Instagram)
- **Annual Handloom Spend:** ₹30,000–50,000
- **Shopping Behavior:** Deliberate, quality-focused, seasonal (festivals, weddings)

### Goals

- Discover authentic, high-quality sarees for festivals and celebrations
- Avoid counterfeit products or poor-quality knockoffs
- Quick, secure checkout without remembering passwords
- Know the story and craftsmanship behind each piece

### Frustrations

- Overwhelmed by fast-fashion sites mixing handlooms with machine-made copies
- Complicated checkout flows with too many payment options
- Distrust of online shopping quality (can't feel fabric)
- Poor customer service when something goes wrong

### Technology Context

- Browses on iPhone; shops at work on desktop
- Trusts Face ID/Touch ID authentication
- Prefers WhatsApp for communication
- Uses Google Pay and PhonePe regularly for UPI payments

### Typical Journey

1. **Discovery:** Sees a reel on Instagram featuring a handloom saree, clicks the link
2. **Exploration:** Browses the campaign page (filtered to sarees), reads product description
3. **Decision:** Taps "Quick View," confirms style/color/price
4. **Checkout:** Uses Face ID to log in, taps "Pay," scans QR with PhonePe → ✅ Done
5. **Tracking:** Checks order status sporadically (expects 5–7 day delivery)

---

## Secondary Persona: Rahul (Age 28, Digital Native Gift Buyer)

### Profile

- **Occupation:** Software Engineer
- **Location:** Hyderabad (but family in Tamil Nadu)
- **Tech Comfort:** Very high (apps, online payments, crypto-aware)
- **Annual Handloom Spend:** ₹15,000–25,000
- **Shopping Behavior:** Impulse buys for parents, weddings, festivals

### Goals

- Find authentic gifts for parents and relatives
- Quick checkout without friction
- Delivery to family in different city (Tamil Nadu)
- Ability to send money to parents (gift card feature future?)

### Frustrations

- Doesn't know quality differences between handlooms
- Worried about returns/exchanges for gifts
- Wants vendor/weaver backstories to share with parents

### Technology Context

- Mobile-first browsing on Android
- Comfortable with WebAuthn but prefers OTP as backup
- Uses Google Pay/PhonePe daily

### Typical Journey

1. **Trigger:** Realizes wedding is in 3 weeks, needs gift for aunt
2. **Discovery:** Searches "handloom saree" on VAYYARI
3. **Evaluation:** Filters by price, reads reviews, watches reel
4. **Purchase:** Logs in via OTP, enters delivery address (different from profile), pays via UPI
5. **Sharing:** Wishes he could share the weaver's story with his aunt

---

## Tertiary Persona: Meera (Age 68, Occasional Shopper)

### Profile

- **Occupation:** Retired teacher
- **Location:** Chennai
- **Tech Comfort:** Moderate (WhatsApp, basic mobile banking)
- **Annual Handloom Spend:** ₹10,000–20,000
- **Shopping Behavior:** Seasonal (festivals, grandchildren's events)

### Goals

- Purchase sarees and traditional wear without confusion
- Ensure authenticity (no cheap imitations)
- Simple interface, large text
- Human support if something goes wrong

### Frustrations

- Confusing password requirements
- Too many options overwhelm her
- Worried about "online scams"
- Prefers phone calls to chat

### Technology Context

- Uses WhatsApp to communicate with grandchildren
- Has a basic smartphone; not always comfortable with apps
- Would ask family member to help with checkout

### Typical Journey

1. **Trigger:** Festival season approaching
2. **Discovery:** Asks grandchild for help; browses together
3. **Exploration:** Grandchild does most of the searching; Meera approves choices
4. **Checkout:** Grandchild enters OTP; Meera pays via bank transfer (if possible)
5. **Reassurance:** Wants clear order confirmation and tracking

---

## Core User Journeys

### Journey 1: "Browse & Quick Buy" (5–10 min)

**Actor:** Priya (Primary Persona)  
**Trigger:** Sees Instagram reel of a beautiful saree  
**Precondition:** Has VAYYARI account; logged in via Passkey

```
1. User taps "Shop" link from reel
   → Lands on filtered catalog (Sarees, Monochrome theme)

2. User browses thumbnail grid (3 items visible on mobile)
   → Taps image to open Quick View modal

3. Quick View shows:
   - High-res product image
   - Price, size/color options
   - Brief description & weaver story
   - "Add to Cart" or "Buy Now" button

4. User taps "Buy Now"
   → Skips cart, goes directly to checkout

5. Checkout shows:
   - Order summary (1x Saree, ₹3,499)
   - Delivery address (auto-filled from profile)
   - "Pay Securely" button

6. User taps "Pay Securely"
   → Mobile: Opens UPI Intent → User selects PhonePe → Completes payment
   → Desktop: Shows QR code → User scans with phone → Completes payment

7. Order confirmed
   → User sees "Your order is processing" with Order ID
   → Email/WhatsApp confirmation sent
```

**Time to Completion:** 6–8 minutes  
**Success Criteria:** User completes purchase without logout or cart abandonment

---

### Journey 2: "Discover & Compare" (15–25 min)

**Actor:** Rahul (Secondary Persona)  
**Trigger:** Needs to buy wedding gift; browses for quality  
**Precondition:** No existing account (Guest browsing permitted, Signup mandatory for checkout)

```
1. User visits VAYYARI homepage as Guest
   → Browses curated weaves and seasonal collections without login

2. User taps "Browse All Sarees"
   → Lands on full category page

3. User filters:
   - Price: ₹2,000–₹5,000
   - Material: Silk
   - Color: Blue/Teal

4. User browses filtered results
   → Taps 3 different products
   → Reads descriptions, checks weave swatches and estimated delivery pincode

5. User selects favorite, taps "Add to Cart"

6. User continues browsing as guest, adds second item

7. User taps "Proceed to Cart"
   → Sees both items in cart
   → Can increase/decrease quantities
   → Can remove items

8. User taps "Proceed to Checkout"
   → [MANDATORY SIGNUP GATE] System intercepts unauthenticated checkout
   → AuthSheet displays: "Login or Signup is required to place your order"
   → User enters +91 mobile number and receives 6-digit OTP (or uses Google One-Tap)
   → User enters OTP → Authenticated patron session created
   → Guest cart automatically merged into authenticated profile

9. Checkout Screen (Authenticated Patron):
   - Delivery address selection/entry
   - Choose delivery timeframe ("Express Insured Dispatch")
   - "Pay Securely" → Instant UPI flow (Google Pay, PhonePe, Paytm)

10. Order Confirmed
    → Verified patron order confirmed
    → WhatsApp & SMS order receipt sent with tamper-proof tracking AWB
```

**Time to Completion:** 18–22 minutes  
**Success Criteria:** Frictionless guest exploration with transparent, one-tap signup gating upon checkout; verified order confirmation

---

### Journey 3: "Buy Again (Repeat Customer)" (3–5 min)

**Actor:** Priya (Existing customer, already has order history)  
**Trigger:** Remembers she loved a saree from last purchase  
**Precondition:** Logged in via Passkey

```
1. User taps "Account" → "Order History"
   → Sees previous purchase (Blue Saree, ₹3,499)

2. User taps "Buy Again"
   → System checks inventory
   → If in stock: Adds to cart, prompts for new delivery address
   → If out of stock: Shows similar recommendations instead

3. If item in stock:
   → Checkout flow (same as Journey 1)
   → Time to purchase: 2–3 minutes

4. Order confirmed → Tracking begins
```

**Time to Completion:** 3–5 minutes  
**Success Criteria:** Logged-in customer can repurchase with 2–3 taps

---

### Journey 4: "Exceptional Case: Order Issue" (Async, 24–48 hrs)

**Actor:** Priya  
**Trigger:** Order arrives with slight defect (minor stain)  
**Precondition:** Order is in "In Transit" or "Delivered" state

```
1. User logs in → Views order → Taps "Report Issue"

2. User selects reason:
   - Item is damaged
   - Item is different from photo
   - Item is missing

3. User uploads photo (optional)

4. System shows:
   - "We're reviewing this. WhatsApp us for urgent help."
   - Admin is notified instantly via SignalR

5. Admin reviews via mobile app:
   - Decides: Full refund, replacement, or store credit
   - If refund: Initiates reverse UPI payment via payment gateway
   - Sends message to customer via WhatsApp

6. Customer receives refund confirmation
   → Sees refund status in order tracker
```

**Time to Resolution:** 24–48 hours  
**Success Criteria:** Customer feels heard; issue resolved without escalation

---

## Shopping Patterns (By Season)

| Season                 | Primary Buyer      | Product Focus            | Volume   |
| ---------------------- | ------------------ | ------------------------ | -------- |
| **Festival (Oct–Nov)** | All personas       | Sarees, Festival wear    | Peak     |
| **Wedding (Dec–Mar)**  | Rahul (gift-buyer) | Lehengas, Premium sarees | High     |
| **Summer (Apr–Jun)**   | Priya              | Light dresses, cotton    | Moderate |
| **Daily Wear**         | All                | Everyday sarees, dresses | Steady   |

---

## Accessibility & Inclusivity Notes

- **Large Text Option:** For personas 65+, offer 1.25x font scale toggle
- **WhatsApp-First Support:** Avoid chat widgets; integrate WhatsApp as primary support channel
- **Familiar Language:** Product descriptions in English & regional languages (Tamil, Telugu, Hindi)
- **Familiar Payment:** UPI is standard for target demographics; wallets secondary

---

**Status:** 🟡 Ready for User Validation

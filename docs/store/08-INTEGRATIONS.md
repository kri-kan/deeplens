# 08: EXTERNAL INTEGRATIONS

**Purpose:** Define how VAYYARI integrates with external systems and third-party services.

---

## Section 1: Payment Gateway Integration

### 1.1 Payment Gateway: Razorpay (Example)

- **Why Razorpay?** Leading UPI provider in India; good webhook reliability; developer-friendly

### 1.2 UPI Payment Flow (Mobile)

#### Step 1: Generate UPI Intent URI (Backend)

```csharp
var upiIntentUri = $"upi://pay?pa={merchantVPA}&pn=VAYYARI&am={amount}&tn={description}&tr={orderId}";
// Example: upi://pay?pa=vayyari@razorpay&pn=VAYYARI&am=3499&tn=Order%2312345&tr=ORD-2026-08-29-0001
```

- **Parameters:**
  - `pa`: Merchant VPA (Virtual Payment Address)
  - `pn`: Merchant name
  - `am`: Amount in rupees
  - `tn`: Transaction description
  - `tr`: Reference ID (unique per transaction)

#### Step 2: Send to Frontend

- Backend returns `upiIntentUri` in POST /api/orders response
- Frontend stores order ID in session

#### Step 3: Mobile App Selector

- User taps "Pay" button in frontend
- Browser constructs UPI Intent → OS app selector shows (GPay, PhonePe, Paytm)
- User selects app → App opens with pre-filled payment details
- User completes payment in app

#### Step 4: Payment App Redirects Back

- After payment (success or failure), app returns to browser with deep link
- Browser handles redirect → Frontend checks payment status

#### Step 5: Webhook Confirmation (Async)

- Meanwhile, payment gateway POSTs to backend webhook
- Webhook updates order status to Confirmed
- Frontend polls every 3 seconds for confirmation
- Once webhook processed, frontend auto-redirects to order confirmation

### 1.3 QR Code Payment Flow (Desktop)

#### Step 1: Generate Dynamic QR Code (Backend via Gateway API)

```csharp
var qrRequest = new
{
    amount = 3499,
    orderId = "ORD-2026-08-29-0001",
    description = "Handloom Purchase"
};

var qrResponse = await _paymentGateway.GenerateQRAsync(qrRequest);
// Response: { qrCode: "base64-image", expiresAt: "2026-08-29T10:10:00Z" }
```

#### Step 2: Display QR to Customer

- Frontend shows modal with QR code image + countdown timer (60 sec)
- Message: "Scan this QR with your phone to complete payment"

#### Step 3: Mobile Phone Scanning

- User opens phone camera or dedicated QR scanner
- Scans QR code
- Browser on phone opens payment link → UPI app selector
- User selects app → Completes payment

#### Step 4: Webhook + Frontend Polling

- Payment gateway POSTs webhook (confirms payment)
- Frontend continuously polls: GET /api/orders/{orderId}/payment-status
- Once confirmed, redirect to order confirmation page

### 1.4 Webhook Payload & Validation

**Webhook Endpoint:** POST /api/checkout/webhook

**Payload:**

```json
{
  "event": "payment.completed",
  "payload": {
    "order": {
      "entity": "order",
      "id": "ORD-2026-08-29-0001",
      "amount": 349900,
      "amount_paid": 349900,
      "currency": "INR",
      "status": "paid",
      "created_at": 1693286700
    },
    "payment": {
      "entity": "payment",
      "id": "TXN123456",
      "order_id": "ORD-2026-08-29-0001",
      "amount": 349900,
      "method": "upi",
      "status": "captured",
      "created_at": 1693286750
    }
  },
  "timestamp": 1693286750,
  "signature": "HMAC_SHA256_SIGNATURE"
}
```

**Validation:**

```csharp
public bool ValidateWebhookSignature(string payload, string signature)
{
    var secretKey = _config["Payment:WebhookSecret"];
    var computedSignature = HMAC_SHA256(payload, secretKey);
    return computedSignature == signature; // Constant-time comparison
}
```

### 1.5 Failure Scenarios

#### Scenario A: Payment Succeeds but Webhook Fails

- **Issue:** Customer completes payment; gateway POSTs webhook but network drops
- **Recovery:** Backend retries webhook up to 5 times over 1 hour
- **Frontend:** Polling timeout after 5 min; shows "Payment may be processing. Check order history."
- **Customer:** Sees order in "Pending" status; can check later (webhook eventually arrives)

#### Scenario B: QR Code Expires

- **Timeout:** 60 seconds
- **Frontend:** Countdown timer reaches 0; shows "QR code expired. Generate new?"
- **User Action:** Taps "Generate New" → Backend generates fresh QR → Loops to Step 1

#### Scenario C: Payment Declined

- **Gateway Response:** POSTs webhook with status=declined
- **Backend:** Updates Order status to Cancelled; restores inventory
- **Frontend:** Detects failure; shows "Payment declined. Try again?"
- **User Action:** Can retry from checkout (new order ID generated)

### 1.6 Refund Integration

#### API Call to Gateway Refund Endpoint

```csharp
var refundRequest = new
{
    paymentId = "TXN123456",
    amount = 349900,
    reason = "Customer exception: Damaged item",
    reference = "EXC-2026-08-29-0001" // Exception ID
};

var refundResponse = await _paymentGateway.RefundAsync(refundRequest);
// Response: { refundId: "RFD123456", status: "initiated", expectedDate: "2026-09-02" }
```

#### Refund Status Tracking

- Refund initiated → Status: "processing"
- Webhook: Refund processed → Status: "completed"
- Customer notification: Refund amount + expected arrival date

---

## Section 2: Object Storage (MinIO)

### 2.1 MinIO Setup

- **Location:** Local server (Ubuntu LTS)
- **Bucket Structure:**
  ```
  vayyari-bucket/
  ├── products/
  │   ├── {productId}/
  │   │   ├── images/
  │   │   │   ├── {imageId}.webp
  │   │   │   └── {imageId}_thumb.webp
  │   │   └── videos/
  │   │       └── {videoId}.mp4
  ├── content/
  │   └── reels/
  │       ├── {videoId}.mp4
  │       └── {videoId}_thumb.jpg
  ├── exceptions/
  │   └── {exceptionId}/
  │       └── {photoId}.jpg
  └── invoices/
      └── {orderId}.pdf
  ```

### 2.2 Image Upload & Optimization

- **Upload:** Admin uploads via API or dashboard
- **Processing:**
  1. Accept image (max 10 MB)
  2. Resize to standard dimensions (1200x1600 px for products)
  3. Convert to WebP format (better compression)
  4. Generate thumbnail (300x400 px)
  5. Store both original and thumbnail
  6. Return S3-style URL
- **URL Structure:**
  ```
  https://minio.vayyari.local/vayyari-bucket/products/{productId}/images/{imageId}.webp
  ```

### 2.3 Video Upload & Streaming

- **Upload:** Admin uploads MP4 (max 500 MB)
- **Processing:**
  1. Validate codec (H.264 video, AAC audio)
  2. Transcode to 720p (if needed)
  3. Generate thumbnail at 0s
  4. Store MP4 + thumbnail
  5. Return streaming URL

- **Playback:** Frontend requests video URL → MinIO streams on-demand

### 2.4 Access Control

- **Public Bucket:** Products, reels (world-readable for frontend)
- **Private Bucket:** Invoices, exception photos (auth required for backend)

### 2.5 Backup Strategy

- **Replication:** Primary + Backup drives (RAID 1 mirror)
- **Snapshots:** Daily backup to external NAS
- **Retention:** 30 days of daily snapshots

---

## Section 3: Notification Services

### 3.1 WhatsApp Business API

- **Provider:** Twilio or direct WhatsApp Business integration
- **Use Cases:**
  - Order confirmations
  - Order status updates (In Transit, Delivered)
  - Refund notifications
  - Exception resolution updates
  - Support messages

- **Message Template (Example):**
  ```
  🆔 Your order #ORD-2026-08-29-0001 is confirmed
  📦 Items: Blue Silk Saree (₹3,499)
  🚚 Estimated delivery: 5-7 business days
  📍 Track here: [Order tracking link]
  ```

### 3.2 Email Notifications

- **Provider:** SendGrid or AWS SES
- **Use Cases:**
  - Order confirmations (same as WhatsApp)
  - Receipts & invoices
  - Delivery notifications
  - Refund confirmations
  - Account recovery links

### 3.3 Telegram/WhatsApp Bot (Ledger)

- **Private Channel:** Admin team receives order event log
- **Message:**
  ```
  🆕 Order #ORD-2026-08-29-0001
  👤 Priya Sharma (+91-98765-43210)
  📦 Items: Blue Saree × 1 (₹3,499)
  💳 Payment: UPI Confirmed (Txn #TXN123456)
  📍 Delivery: 123 MG Road, Bangalore
  🚚 Fulfillment: Hub Dispatch
  ⏰ Timestamp: 2026-08-29T10:05:00 IST
  ```
- **Purpose:** Immutable audit trail outside database

---

## Section 4: Courier & Logistics Integration

### 4.1 Courier API (Example: Ecom Express, Shiprocket)

#### Shipment Creation

```csharp
var shipmentRequest = new
{
    orderId = "ORD-2026-08-29-0001",
    customerName = "Priya Sharma",
    customerPhone = "+91-98765-43210",
    deliveryAddress = "123 MG Road, Bangalore",
    weight = 500, // grams
    items = new[] {
        new { description = "Blue Silk Saree", quantity = 1 }
    }
};

var shipmentResponse = await _courierAPI.CreateShipmentAsync(shipmentRequest);
// Response: { trackingId: "AWB123456789", pickupDate: "2026-08-30" }
```

#### Tracking Status Webhook

- Courier sends webhook when status changes
- Backend updates Order: Dispatched → In Transit → Delivered
- Customer notified of status update

### 4.2 Pickup & Dispatch Flow

- **Pick:** Courier picks item from vendor or local hub
- **In Transit:** Item moves through courier network
- **Out for Delivery:** Item reaches customer's city/area
- **Delivered:** Customer receives item

### 4.3 Return/RTO Handling

- **RTO (Return to Origin):** If delivery fails 3 times
- **Process:** Courier returns item to warehouse
- **Admin Action:** Decide refund or re-dispatch

---

## Section 5: Database Backup Services (Cloud, Future)

### 5.1 Database Backup to AWS S3

- **Frequency:** Daily full backup + hourly incremental
- **Retention:** 30 days
- **Encryption:** AES-256
- **Cost Estimate:** ~$50/month for 100 GB storage

### 5.2 Cross-Region Redundancy (Future)

- Replicate to secondary region for disaster recovery
- RTO: < 1 hour
- RPO: < 15 minutes

---

## Section 6: Analytics & Monitoring (Future)

### 6.1 Web Analytics

- **Tool:** Mixpanel or custom implementation
- **Tracked Events:**
  - Product viewed
  - Added to cart
  - Checkout initiated
  - Payment completed
  - Order confirmed

### 6.2 Application Monitoring

- **Tool:** Application Insights (Azure) or Datadog
- **Metrics:**
  - API response times
  - Error rates (4xx, 5xx)
  - Database query performance
  - Webhook success rates
  - Cache hit ratios

### 6.3 Customer Support Tools (Future)

- **Ticketing:** Might integrate Zendesk for support management
- **Chat:** Potentially add Intercom for in-app chat (post-MVP)

---

## Section 7: Inventory Sync with Vendors

### 7.1 Vendor Inventory Upload (MVP)

- **Frequency:** Weekly (Sunday 2 AM)
- **Format:** CSV file (VendorProductID, Quantity)
- **Upload Method:**
  - FTP server (secure)
  - Email with CSV attachment
  - Manual upload via admin dashboard

- **CSV Structure:**
  ```csv
  vendor_sku,quantity,last_updated
  VEN-001-BLUE,10,2026-08-29T10:00:00Z
  VEN-001-RED,5,2026-08-29T10:00:00Z
  VEN-002-GREEN,0,2026-08-28T14:30:00Z
  ```

### 7.2 Sync Process

1. Admin uploads CSV
2. Backend parses and validates
3. For each SKU: Match to Product.VendorProductId
4. Update Product.Stock
5. If quantity = 0: Mark as "Coming Soon"
6. Log sync record
7. Notify admin of any mismatches (SKU not found, etc.)

### 7.3 Real-Time Sync (Future)

- Vendor provides API endpoint
- Backend polls daily or uses webhook
- Instant inventory updates

---

## Section 8: Third-Party Service Dependencies

### 8.1 Critical Path (Order-to-Delivery)

```
Customer Payment → Razorpay → Webhook → Backend ✅ (Critical)
                                           ↓
                                    Order Created ✅
                                           ↓
                            Inventory Decremented ✅
                                           ↓
                            Admin Dashboard Updated ✅ (SignalR)
                                           ↓
                         Customer Notified ✅ (WhatsApp/Email)
                                           ↓
                            Admin Assigns Fulfillment ✅
                                           ↓
                         Courier Pickup Scheduled ✅
                                           ↓
                           Tracking Updated ✅ (Webhook)
```

### 8.2 Fallback Behavior (Service Unavailable)

| Service         | Impact    | Fallback                                         |
| --------------- | --------- | ------------------------------------------------ |
| Payment Gateway | Critical  | Show error; don't charge; retry payment later    |
| Inventory DB    | Critical  | Checkout blocked; show "Try again in 5 min"      |
| WhatsApp API    | Important | Queue notification; retry hourly (up to 24h)     |
| Email API       | Important | Queue notification; retry hourly                 |
| MinIO Storage   | Important | Product images cached; load from cache           |
| Courier API     | Important | Order stuck in "Processing"; manual intervention |

### 8.3 Monitoring & Alerting

- Health check endpoints for each critical service
- Automated alerts to admin team if service down > 30 min
- Incident response runbook per service

---

## Section 9: Integration Security

### 9.1 API Key Management

- All third-party API keys stored in Azure Key Vault (production)
- Rotated quarterly
- Separate keys for dev/staging/production environments

### 9.2 Webhook Signature Validation

- All webhooks must have valid HMAC-SHA256 signature
- Timestamp within 5 minutes (prevent replay)
- Idempotency: Track processed webhook IDs (prevent duplicates)

### 9.3 Data Encryption in Transit

- All API calls use HTTPS with TLS 1.2+
- Certificate pinning for critical gateways (payment, courier)

### 9.4 Data at Rest

- Database encrypted with transparent data encryption (TDE)
- MinIO objects encrypted with AES-256
- No plaintext payment data ever stored

---

**Status:** 🟡 Integration Plan Complete
**Next Steps:** Vendor API documentation, API key procurement, sandbox testing

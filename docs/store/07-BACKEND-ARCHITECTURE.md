# 07: BACKEND ARCHITECTURE AND IMPLEMENTATION

**Tech Stack:** .NET 8 Web API (C#) | Clean Architecture + CQRS | SQL Server or PostgreSQL | Redis | MinIO | Docker Compose

---

## Section 1: System Architecture Overview

### 1.1 Architecture Diagram (Conceptual)

```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend Layer (React/Next.js + React Native)                   │
├─────────────────────────────────────────────────────────────────┤
│ • Web Storefront (Next.js)                                       │
│ • Admin Mobile App (React Native Expo)                           │
└────────────┬────────────────────────────────────────────────────┘
             │ HTTP/WebSocket
┌────────────▼──────────────────────────────────────────────────┐
│ API Layer (.NET 8 Web API)                                    │
├──────────────────────────────────────────────────────────────┤
│ • REST Endpoints (Products, Orders, Cart, Auth, Payments)   │
│ • SignalR Hub (Real-time order updates for admins)          │
│ • Webhook Listener (Payment confirmations)                   │
│ • Background Jobs (Inventory sync, Ledger bot, Notifications)
└────────────┬──────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────┐
│ Application Layer (CQRS + Clean Architecture)              │
├──────────────────────────────────────────────────────────────┤
│ • Commands (Create Order, Process Payment, Submit Exception)│
│ • Queries (Get Product, List Orders, Order Status)         │
│ • Handlers (Business Logic Orchestration)                  │
│ • Domain Models (Order, Product, Customer, Payment)        │
└────────────┬──────────────────────────────────────────────────┘
             │
┌────────────┴──────────────────────────────────────────────────┐
│ Data & External Services                                    │
├──────────────────────────────────────────────────────────────┤
│ • SQL Database (Entity Framework Core + Temporal Tables)   │
│ • Redis Cache (Cart, Session, Rate-limiting)               │
│ • MinIO Object Storage (Images, Videos, Invoices)          │
│ • Payment Gateway (UPI Intent + Webhook)                   │
│ • Courier APIs (Tracking, AWB)                             │
│ • WhatsApp/Telegram Bot APIs                               │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Project Structure (Clean Architecture)

```
src/
├── Vayyari.API/                           # Web API entry point
│   ├── Controllers/                       # HTTP endpoints
│   ├── Program.cs                         # DI container, middleware
│   └── appsettings.json                   # Configuration
│
├── Vayyari.Application/                   # Business logic (CQRS)
│   ├── Commands/
│   │   ├── Orders/
│   │   │   ├── CreateOrderCommand.cs
│   │   │   ├── ConfirmPaymentCommand.cs
│   │   │   └── ProcessRefundCommand.cs
│   │   ├── Products/
│   │   └── Cart/
│   ├── Queries/
│   │   ├── Orders/
│   │   │   ├── GetOrderByIdQuery.cs
│   │   │   └── GetCustomerOrdersQuery.cs
│   │   ├── Products/
│   │   └── Cart/
│   ├── Handlers/          # CQRS command/query handlers
│   └── Services/          # Cross-cutting logic (payment, inventory, etc.)
│
├── Vayyari.Domain/                        # Domain models (entities, value objects)
│   ├── Entities/
│   │   ├── Order.cs
│   │   ├── Product.cs
│   │   ├── Customer.cs
│   │   └── ...
│   ├── ValueObjects/
│   │   ├── Money.cs
│   │   ├── OrderStatus.cs
│   │   └── PhoneNumber.cs
│   ├── Specifications/    # Query specifications (DDD)
│   └── Events/            # Domain events
│
├── Vayyari.Infrastructure/                # External integrations
│   ├── Data/
│   │   ├── VayyariDbContext.cs           # EF Core context
│   │   ├── Configurations/               # Entity configs
│   │   └── Migrations/
│   ├── ExternalServices/
│   │   ├── PaymentGateway/
│   │   │   ├── IPaymentGateway.cs
│   │   │   └── RazorpayPaymentGateway.cs
│   │   ├── Storage/
│   │   │   ├── IObjectStorage.cs
│   │   │   └── MinIOObjectStorage.cs
│   │   ├── Messaging/
│   │   │   ├── INotificationService.cs
│   │   │   └── WhatsAppNotificationService.cs
│   │   └── Courier/
│   ├── Caching/
│   │   ├── ICacheService.cs
│   │   └── RedisCacheService.cs
│   ├── Repositories/      # EF Core repository implementations
│   └── Persistence/       # Backup/archival services
│
├── Vayyari.Shared/                        # Cross-cutting (DTOs, enums, exceptions)
│   ├── DTOs/
│   ├── Enums/
│   ├── Exceptions/
│   └── Extensions/
│
└── docker-compose.yml                     # Local dev infrastructure
```

---

## Section 2: API Endpoints (REST)

### 2.1 Authentication Endpoints

#### POST /api/auth/start-passkey

- **Purpose:** Initiate WebAuthn credential challenge
- **Body:** `{ "phoneNumber": "+91-98765-43210" }`
- **Response:** `{ "challenge": "base64-challenge", "timeout": 60000 }`

#### POST /api/auth/verify-passkey

- **Purpose:** Verify Passkey credential
- **Body:** `{ "id": "base64-id", "response": {...} }`
- **Response:** `{ "jwt": "token", "customer": {...} }`
- **Errors:** 401 (invalid credential), 400 (challenge expired)

#### POST /api/auth/send-otp

- **Purpose:** Send OTP via SMS/WhatsApp
- **Body:** `{ "phoneNumber": "+91-98765-43210" }`
- **Response:** `{ "otpSent": true, "expiresIn": 60 }`

#### POST /api/auth/verify-otp

- **Purpose:** Verify OTP and issue JWT
- **Body:** `{ "phoneNumber": "+91-98765-43210", "otp": "123456" }`
- **Response:** `{ "jwt": "token", "customer": {...}, "isNewAccount": true/false }`

### 2.2 Product Endpoints

#### GET /api/products

- **Purpose:** List products with filters
- **Query Params:**
  - `category=sarees`
  - `price_min=1000&price_max=5000`
  - `color=blue`
  - `sort=new|popular|price_asc|price_desc`
  - `page=1&limit=20`
- **Response:** `{ "products": [...], "total": 500, "page": 1, "hasMore": true }`
- **Caching:** 5-minute Redis cache (invalidated on product update)

#### GET /api/products/:productId

- **Purpose:** Get single product detail
- **Response:** `{ "id", "name", "price", "images": [...], "vendor": {...}, "stock": 5 }`
- **Caching:** 10-minute Redis cache

#### GET /api/products/search

- **Purpose:** Full-text search with autocomplete
- **Query Params:**
  - `q=blue+saree` (search query)
  - `limit=10` (max suggestions)
- **Response:** `{ "suggestions": ["Blue Silk Saree", "Blue Cotton Saree", ...] }`
- **Implementation:** Full-text search in SQL (or Elasticsearch future)

---

### 2.3 Cart Endpoints

#### GET /api/cart

- **Purpose:** Retrieve current cart
- **Auth:** JWT (optional for guests using localStorage)
- **Response:** `{ "items": [...], "total": 3499, "itemCount": 1 }`
- **Logic:**
  - Guest: Pull from frontend localStorage
  - Registered: Fetch from database/Redis cache

#### POST /api/cart/items

- **Purpose:** Add item to cart
- **Body:** `{ "productId": "uuid", "quantity": 1, "color": "blue", "size": "M" }`
- **Response:** `{ "cartId": "uuid", "itemCount": 2, "total": 6998 }`
- **Validation:**
  - Quantity max 5
  - Product exists and active
  - Product stock available (informational; not reserved)

#### PUT /api/cart/items/:cartItemId

- **Purpose:** Update cart item quantity
- **Body:** `{ "quantity": 2 }`
- **Response:** Cart summary

#### DELETE /api/cart/items/:cartItemId

- **Purpose:** Remove item from cart
- **Response:** Cart summary

#### POST /api/cart/merge

- **Purpose:** Merge guest cart with authenticated user's saved cart
- **Body:** `{ "guestCartItems": [...] }`
- **Response:** `{ "mergedCart": {...} }`
- **Logic:**
  - Combine items from guest and registered cart
  - Resolve duplicates (max quantity)
  - Save merged cart to database

#### DELETE /api/cart

- **Purpose:** Clear entire cart
- **Response:** `{ "cleared": true }`

---

### 2.4 Order Endpoints

#### POST /api/orders

- **Purpose:** Create order from cart and initiate payment
- **Auth:** JWT required
- **Body:**
  ```json
  {
    "cartId": "uuid",
    "deliveryAddressId": "uuid | null",
    "deliverySpeed": "standard|express",
    "newAddress": { "street": "...", "city": "...", "postalCode": "..." } // if no addressId
  }
  ```
- **Response:**
  ```json
  {
    "orderId": "ORD-2026-08-29-0001",
    "amount": 3499,
    "paymentMode": "upi|qr",
    "upiIntentUri": "upi://pay?...",
    "qrCode": { "image": "base64", "expiresIn": 60 }
  }
  ```
- **Workflow:**
  1. Validate cart items (stock available)
  2. Lock inventory (decrement on payment webhook, not now)
  3. Create Order (Pending status)
  4. Return payment payload
- **Error Responses:**
  - 400: Out of stock
  - 400: Invalid address
  - 400: Cart empty

#### GET /api/orders

- **Purpose:** List customer's orders
- **Auth:** JWT required
- **Query Params:** `page=1&limit=10&status=all|processing|in_transit|delivered`
- **Response:** `{ "orders": [...], "total": 25, "page": 1 }`

#### GET /api/orders/:orderId

- **Purpose:** Get order detail (with public status only)
- **Auth:** JWT required (customer sees own order only)
- **Response:**
  ```json
  {
    "orderId": "ORD-2026-08-29-0001",
    "status": "processing|in_transit|delivered",
    "items": [...],
    "deliveryAddress": {...},
    "timeline": [
      { "status": "processing", "timestamp": "2026-08-29T10:05:00Z" },
      { "status": "in_transit", "timestamp": "2026-08-31T14:22:00Z" }
    ],
    "totalAmount": 3499,
    "deliveryEstimate": "2026-09-02T18:00:00Z"
  }
  ```
- **Public Status Calculation:**
  - Internal: Pending, Payment_Received, Awaiting_Vendor_Dispatch → Public: "Processing"
  - Internal: Dispatched → Public: "In Transit"
  - Internal: Delivered → Public: "Delivered"

---

### 2.5 Payment Webhook Endpoint

#### POST /api/checkout/webhook

- **Purpose:** Payment gateway confirmation (UPI payment success)
- **Auth:** None (gateway-signed; signature validation done server-side)
- **Header:** `X-Webhook-Signature: <HMAC-SHA256>`
- **Body:**
  ```json
  {
    "orderId": "ORD-2026-08-29-0001",
    "transactionId": "TXN123456",
    "amount": 3499,
    "status": "success|failed",
    "timestamp": "2026-08-29T10:05:00Z",
    "signature": "HMAC_SIGNATURE"
  }
  ```
- **Processing (Idempotent):**
  1. Verify HMAC signature
  2. Check OrderID and amount match database
  3. Check if webhook already processed (duplicate prevention)
  4. Update Order: Pending → Payment_Received
  5. Decrement inventory
  6. Broadcast SignalR event (admin dashboard)
  7. Send customer confirmation email/WhatsApp
  8. Respond HTTP 200
- **Error Handling:**
  - Invalid signature → 401
  - Order not found → 404
  - Amount mismatch → 400
  - Already processed → 200 (idempotent, no re-processing)
- **Retry Logic:** Payment gateway retries up to 5 times over 1 hour if non-200 response

---

### 2.6 Exception & Refund Endpoints

#### POST /api/orders/:orderId/report-issue

- **Purpose:** Customer reports damage/quality issue
- **Auth:** JWT required (customer of order only)
- **Body:**
  ```json
  {
    "issueType": "damaged|quality|wrong_item|missing_item|other",
    "description": "The saree has a small stain on the edge",
    "photo": "base64-image" // optional
  }
  ```
- **Response:**
  ```json
  {
    "exceptionId": "EXC-2026-08-29-0001",
    "status": "open",
    "message": "We've received your report. Our team will review and contact you soon."
  }
  ```
- **Validation:**
  - Order status must be "Delivered"
  - Less than 72 hours since delivery
  - No duplicate issue reported for same order
- **Side Effects:**
  - Admin notified immediately (SignalR + WhatsApp bot)
  - Exception visible in admin dashboard

#### POST /api/exceptions/:exceptionId/admin-refund

- **Purpose:** Admin approves refund (backend endpoint, called from mobile app)
- **Auth:** Admin JWT required
- **Body:**
  ```json
  {
    "reason": "Damaged in transit",
    "orderId": "ORD-2026-08-29-0001",
    "amount": 3499,
    "confirmationOrderId": "ORD-2026-08-29-0001" // typo-proof (copy-paste)
  }
  ```
- **Processing:**
  1. Verify orderId matches exception
  2. Verify confirmationOrderId (typo prevention)
  3. Call payment gateway refund API (server-to-server, UPI reverse)
  4. Wait for gateway response (can be async)
  5. Update Exception: open → resolved
  6. Update Order: Exception_Flagged → Refunded
  7. Send customer WhatsApp notification
  8. Log to Ledger bot
  9. Respond with refund reference

---

### 2.7 Admin Endpoints (Mobile App)

#### GET /api/admin/orders/live

- **Purpose:** Real-time order feed (live updates via WebSocket)
- **Auth:** Admin JWT required
- **WebSocket:** SignalR hub connection
- **Events Pushed:**
  - `NewOrderReceived` → Order card appears in dashboard
  - `OrderStatusChanged` → Timeline updates
  - `ExceptionFlagged` → Exception card appears
- **Initial Load:** Returns last 20 orders; then subscribes to real-time events

#### PUT /api/admin/orders/:orderId/assign-fulfillment

- **Purpose:** Assign fulfillment route (Vendor Dropship or Hub Dispatch)
- **Auth:** Admin JWT required
- **Body:**
  ```json
  {
    "items": [
      { "orderItemId": "uuid", "fulfillmentRoute": "vendor_dropship" },
      { "orderItemId": "uuid", "fulfillmentRoute": "hub_dispatch" }
    ]
  }
  ```
- **Response:** Order updated; pick-lists generated

#### PUT /api/admin/orders/:orderId/set-tracking

- **Purpose:** Input Airway Bill number when dispatched
- **Auth:** Admin JWT required
- **Body:** `{ "trackingId": "AWB123456789" }`
- **Response:** Order status: Dispatched; Customer notified; Public tracker updated

---

## Section 3: CQRS Pattern Implementation

### 3.1 Command Example: ConfirmPaymentCommand

```csharp
public class ConfirmPaymentCommand : ICommand
{
    public string OrderId { get; set; }
    public string TransactionId { get; set; }
    public decimal Amount { get; set; }
}

public class ConfirmPaymentCommandHandler : ICommandHandler<ConfirmPaymentCommand>
{
    public async Task Handle(ConfirmPaymentCommand command)
    {
        // 1. Fetch order
        var order = await _orderRepository.GetByIdAsync(command.OrderId);
        if (order == null) throw new OrderNotFoundException();

        // 2. Verify idempotency (check if already processed)
        if (order.PaymentStatus == PaymentStatus.Confirmed)
            return; // Already processed, idempotent

        // 3. Validate amount
        if (order.TotalAmount != command.Amount)
            throw new PaymentAmountMismatchException();

        // 4. Transition order state
        order.ConfirmPayment(command.TransactionId);

        // 5. Decrement inventory
        foreach (var item in order.Items)
        {
            await _inventoryService.DecrementAsync(item.ProductId, item.Quantity);
        }

        // 6. Save
        await _orderRepository.UpdateAsync(order);

        // 7. Publish domain events (for side effects)
        await _eventPublisher.PublishAsync(
            new PaymentConfirmedEvent(order.Id, order.CustomerId)
        );
    }
}
```

### 3.2 Query Example: GetProductByIdQuery

```csharp
public class GetProductByIdQuery : IQuery<ProductDto>
{
    public string ProductId { get; set; }
}

public class GetProductByIdQueryHandler : IQueryHandler<GetProductByIdQuery, ProductDto>
{
    public async Task<ProductDto> Handle(GetProductByIdQuery query)
    {
        // Check cache first
        var cached = await _cache.GetAsync<ProductDto>($"product:{query.ProductId}");
        if (cached != null) return cached;

        // Fetch from database
        var product = await _productRepository.GetByIdAsync(query.ProductId);
        if (product == null) throw new ProductNotFoundException();

        // Map to DTO
        var dto = _mapper.Map<ProductDto>(product);

        // Cache for 10 minutes
        await _cache.SetAsync($"product:{query.ProductId}", dto, TimeSpan.FromMinutes(10));

        return dto;
    }
}
```

---

## Section 4: Real-Time Features (SignalR)

### 4.1 SignalR Hub: OrderHub

```csharp
public class OrderHub : Hub
{
    // Admin joins the hub to receive real-time updates
    public override async Task OnConnectedAsync()
    {
        var adminId = Context.User?.FindFirst("admin_id")?.Value;
        if (adminId != null)
        {
            await Groups.AddToGroupAsync(Connection Id, "admins");
        }
        await base.OnConnectedAsync();
    }

    // Called by background service when new order arrives
    public async Task NotifyNewOrder(OrderDto order)
    {
        await Clients.Group("admins").SendAsync("NewOrderReceived", order);
    }

    // Called when order status changes
    public async Task NotifyOrderStatusChanged(string orderId, string newStatus)
    {
        await Clients.Group("admins").SendAsync("OrderStatusChanged", orderId, newStatus);
    }
}
```

### 4.2 Background Service: OrderStatusBroadcaster

```csharp
public class OrderStatusBroadcaster : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Poll for new orders every 5 seconds
            var newOrders = await _orderRepository
                .GetOrdersByStatusAsync(OrderStatus.PaymentReceived);

            foreach (var order in newOrders)
            {
                // Broadcast to admins via SignalR
                await _orderHub.NotifyNewOrder(_mapper.Map<OrderDto>(order));

                // Also push to Ledger bot (Telegram/WhatsApp)
                await _ledgerBot.LogOrderAsync(order);
            }

            await Task.Delay(5000, stoppingToken);
        }
    }
}
```

---

## Section 5: Background Jobs (IHostedService)

### 5.1 Inventory Sync Job

- **Frequency:** Every Sunday at 2 AM IST
- **Purpose:** Reconcile vendor inventory with database
- **Process:**
  1. Fetch latest CSV from vendor FTP
  2. Parse SKU, quantity
  3. Update database Product.Stock
  4. Mark out-of-stock items (inactive)
  5. Log sync record in VendorInventorySync table

### 5.2 Notification Retry Job

- **Frequency:** Every 1 hour
- **Purpose:** Retry failed email/WhatsApp notifications
- **Process:**
  1. Query failed notifications from queue
  2. Retry (up to 3 attempts)
  3. If still fails, mark as permanently failed (manual review)

### 5.3 Ledger Bot Job

- **Frequency:** Real-time (event-driven)
- **Purpose:** Push order events to Telegram/WhatsApp bot
- **Process:**
  1. Listen to domain events (PaymentConfirmed, OrderDispatched)
  2. Format message with order details
  3. POST to bot API

### 5.4 Order Timeout Job

- **Frequency:** Every 30 minutes
- **Purpose:** Auto-cancel orders stuck in "Pending" > 1 hour (no payment)
- **Process:**
  1. Find orders: Status=Pending, CreatedAt < 1 hour ago
  2. Cancel order
  3. Restore inventory
  4. Notify customer (payment didn't go through)

---

## Section 6: Middleware & Cross-Cutting Concerns

### 6.1 Authentication Middleware

- Extracts JWT from Authorization header
- Validates signature & expiry
- Populates User principal (for [Authorize] attribute)

### 6.2 Error Handling Middleware

- Catches exceptions globally
- Maps to HTTP status codes
- Returns standardized error response
- Logs to centralized logging service

### 6.3 Request Logging Middleware

- Logs all API requests (method, path, query params, response time)
- Excludes sensitive data (passwords, payment tokens)
- Used for debugging and performance monitoring

### 6.4 Rate Limiting Middleware

- Limits requests per IP / per user
- Prevents abuse of OTP, search endpoints
- Configurable per endpoint

---

## Section 7: Database Configuration (Entity Framework Core)

### 7.1 Entity Configurations (Example: Order)

```csharp
public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        // Primary key
        builder.HasKey(o => o.Id);

        // Properties
        builder.Property(o => o.OrderNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(o => o.TotalAmount)
            .HasPrecision(10, 2); // ₹9,999,999.99 max

        // Relationships
        builder.HasOne(o => o.Customer)
            .WithMany(c => c.Orders)
            .HasForeignKey(o => o.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(o => o.Items)
            .WithOne(oi => oi.Order)
            .HasForeignKey(oi => oi.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes
        builder.HasIndex(o => o.CustomerId);
        builder.HasIndex(o => o.OrderStatus);
        builder.HasIndex(o => o.OrderDate);
    }
}
```

### 7.2 Temporal Table Configuration (SQL Server)

```csharp
builder.ToTable("Products", t =>
    t.IsTemporal(ttb =>
    {
        ttb.WithValidFrom("ValidFrom");
        ttb.WithValidTo("ValidTo");
        ttb.HasHistoryTable("ProductsHistory");
    })
);
```

---

## Section 8: Deployment & Orchestration

### 8.1 Docker Compose (Local Development)

```yaml
version: "3.8"
services:
  vayyari-api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=Server=sqlserver;Database=vayyari;...
      - REDIS_URL=redis:6379
      - MINIO_ENDPOINT=minio:9000
    depends_on:
      - sqlserver
      - redis
      - minio

  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      - SA_PASSWORD=VerySecurePassword123!
      - ACCEPT_EULA=Y
    volumes:
      - sqlserver_data:/var/opt/mssql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio:latest
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

volumes:
  sqlserver_data:
  redis_data:
  minio_data:
```

---

## Section 9: Performance Optimization Strategies

### 9.1 Caching Strategy

| Entity             | TTL      | Invalidation      |
| ------------------ | -------- | ----------------- |
| Product            | 10 min   | On update         |
| Category           | 1 hour   | On update         |
| Cart               | 24 hours | On checkout       |
| Theme              | 24 hours | Daily rotation    |
| Search suggestions | 1 hour   | On product update |

### 9.2 Database Query Optimization

- Use `Include()` to prevent N+1 queries
- Implement repository pattern with specifications
- Add indexes on frequently queried columns
- Monitor slow queries (> 500ms) with Application Insights

### 9.3 API Response Caching

- GET endpoints cache in Redis (except auth endpoints)
- Cache-Control headers set appropriately
- Conditional requests (ETag, Last-Modified) supported

---

## Section 10: Security Considerations

### 10.1 Secrets Management

- API keys stored in Azure Key Vault (production) or .env (development)
- Never commit secrets to source control
- Rotate keys quarterly

### 10.2 HTTPS & TLS

- All API endpoints enforced to HTTPS only
- TLS 1.2+ required
- HSTS header set (Strict-Transport-Security)

### 10.3 Webhook Signature Validation

- Payment gateway signatures verified with HMAC-SHA256
- Timestamps validated (within 5 minutes)
- Prevents replay attacks

### 10.4 Input Validation

- All inputs validated server-side (never trust client)
- Phone numbers validated format + length
- Amounts validated against order total
- Addresses validated against postal code database

---

**Status:** 🟡 Ready for Development
**Dependencies:** .NET 8 SDK, Docker, SQL Server/PostgreSQL driver

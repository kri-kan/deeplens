# Kafka Event Schemas

## Topics Overview

### 1. `deeplens.catalog.sku-updated`
- **Producer**: `DeepLens.SearchApi` / `DeepLens.WorkerService`
- **Consumer**: `Store.Api`
- **Schema**:
```json
{
  "eventId": "uuid",
  "eventType": "SKU_UPDATED",
  "timestamp": "2026-09-04T10:00:00Z",
  "data": {
    "skuId": "SKU-10023",
    "title": "Rimless Titanium Aviator",
    "price": 2499.00,
    "stock": 42,
    "isActive": true,
    "attributes": {
      "frameShape": "Aviator",
      "frameMaterial": "Titanium"
    }
  }
}
```

### 2. `store.order.created`
- **Producer**: `Store.Api`
- **Consumer**: `DeepLens.WorkerService` / ERP Sync
- **Schema**:
```json
{
  "eventId": "uuid",
  "eventType": "ORDER_CREATED",
  "timestamp": "2026-09-04T10:00:00Z",
  "data": {
    "orderId": "ORD-2026-9041",
    "customerId": "CUST-5819",
    "totalAmount": 4998.00,
    "items": [
      {
        "sku": "SKU-10023",
        "quantity": 2,
        "unitPrice": 2499.00
      }
    ]
  }
}
```

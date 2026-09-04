# Shared Data Contracts & DTOs

## 1. Product & Catalog Canonical Contract
```typescript
export interface SharedProductSummary {
  id: string;
  sku: string;
  title: string;
  brand: string;
  category: string;
  subCategory?: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  currency: string;
  primaryImageUrl: string;
  thumbnailUrl: string;
  additionalImages: string[];
  stockQuantity: number;
  inStock: boolean;
  colorVariants?: {
    colorName: string;
    hexCode: string;
    sku: string;
    swatchUrl?: string;
  }[];
  attributes?: Record<string, string | number | boolean>;
  tags?: string[];
  updatedAt: string;
}
```

## 2. Inventory Delta Contract
```typescript
export interface InventoryReservationRequest {
  reservationId: string;
  orderId?: string;
  items: {
    sku: string;
    quantity: number;
  }[];
  ttlSeconds: number;
}

export interface InventoryReservationResponse {
  reservationId: string;
  success: boolean;
  expiresAt: string;
  failedItems?: {
    sku: string;
    requested: number;
    available: number;
  }[];
}
```

## 3. Order Placement Contract
```typescript
export interface OrderPlacementRequest {
  orderId: string;
  customerId: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: {
    sku: string;
    title: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
  }[];
  currency: string;
  subtotal: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: "RAZORPAY" | "COD" | "UPI" | "CARD";
  idempotencyKey: string;
}
```

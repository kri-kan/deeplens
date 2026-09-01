export interface Attachment {
  id: string;
  key: string;
  name: string;
  bucket?: string;
  tag?: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
}

export type OrderSource = 'None' | 'WhatsApp' | 'Instagram';
export type PaymentMode = 'None' | 'COD' | 'Prepaid';

/**
 * Shared types for Order ID management.
 * Mirrors OrderHistoryDto / OrderDetailDto from backend.
 */
export interface OrderIdEntry {
  id: string;
  source: OrderSource;
  paymentMode: PaymentMode | null;
  timestamp: string;
  customerName?: string;
  customerPhone?: string;
  sourceHandle?: string;
  instagramHandle?: string;
  instagramUserId?: string;
  customerAddress?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPincode?: string;
  isServiceable?: boolean | null;
  totalAmount?: number;
  advancePaid?: number;
  codBalance?: number;
  shippingCharges?: number;
  transactionId?: string;
  attachments?: Attachment[];
  items?: OrderItem[];
  orderDetails?: string;
  isDeleted?: boolean;
  customerId?: string;
}

/**
 * Payload for updating an order.
 * Mirrors OrderUpdateDto from backend.
 */
export interface OrderUpdateRequest {
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPincode?: string;
  isServiceable?: boolean;
  totalAmount?: number;
  advancePaid?: number;
  codBalance?: number;
  shippingCharges?: number;
  source?: OrderSource;
  sourceHandle?: string;
  paymentMode?: PaymentMode;
  transactionId?: string;
  customerId?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id?: number;
  productId?: string;
  productTitle?: string;
  productCode?: string;
  quantity?: number;
  unitPrice?: number;
  subtotal?: number;
  vendorId?: string;
  vendorName?: string;
  sourceType?: 'media' | 'catalog';
  photoUrl?: string;
  comments?: string;
  attachments?: Attachment[];
}

export interface OrderComment {
  id?: string;
  content: string;
  attachmentIds: string[];
  attachments?: Attachment[];
  createdAt: string;
}

export interface ShippingAddressDraft {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDelhiveryServiceable?: boolean | null;
  serviceabilityError?: string;
}

export interface OrderItemDraft {
  id: string; // client uuid
  sourceType: 'media' | 'catalog';
  mediaUri?: string;
  mediaId?: string;
  productId?: string;
  productTitle?: string;
  productCode?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  vendorId?: string;
  vendorName?: string;
  comments?: string;
  photoUrl?: string;
}


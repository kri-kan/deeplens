export interface Attachment {
  id: string;
  key: string;
  name: string;
  bucket?: string;
  tag?: string;
  mimeType?: string; // Fallback
  sizeBytes?: number;
  uploadedAt?: string;
}

export type OrderSource = 'None' | 'WhatsApp' | 'Instagram';
export type PaymentMode = 'None' | 'COD' | 'Prepaid';

/**
 * Shared types for Order ID management.
 * Mirrors OrderHistoryDto from backend.
 */
export interface OrderIdEntry {
  id: string;
  source: OrderSource;
  paymentMode: PaymentMode | null;
  timestamp: string;
  customerPhone?: string;
  sourceHandle?: string;
  instagramHandle?: string;
  instagramUserId?: string;
  customerAddress?: string;
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
  customerPhone?: string;
  customerAddress?: string;
  source?: OrderSource;
  sourceHandle?: string;
  paymentMode?: PaymentMode;
  transactionId?: string;
  customerId?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  productId?: string;
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

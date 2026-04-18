/**
 * Shared types for Order ID management.
 */
export interface OrderIdEntry {
  id: string;
  source: 'whatsapp' | 'instagram';
  paymentMethod: 'COD' | 'Prepaid' | null;
  timestamp: string;
  customerPhone?: string;
  instagramHandle?: string;
  instagramUserId?: string;
  customerAddress?: string;
  orderDetails?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  productId?: string;
  photoUrl?: string;
  comments?: string;
}

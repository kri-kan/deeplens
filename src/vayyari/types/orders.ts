/**
 * Shared types for Order ID management.
 */
export interface OrderIdEntry {
  id: string;
  source: 'whatsapp' | 'instagram';
  paymentMethod: 'COD' | 'Prepaid' | null;
  timestamp: string;
  customerPhone?: string;
  sourceHandle?: string;
  instagramHandle?: string;
  instagramUserId?: string;
  customerAddress?: string;
  transactionId?: string;
  attachments?: any[];
  items?: OrderItem[];
}

export interface OrderItem {
  productId?: string;
  photoUrl?: string;
  comments?: string;
  attachments?: any[];
}

export interface OrderComment {
  id?: string;
  content: string;
  attachmentIds: string[];
  attachments?: any[];
  createdAt: string;
}

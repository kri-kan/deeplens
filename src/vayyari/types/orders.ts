/**
 * Shared types for Order ID management.
 */
export interface OrderIdEntry {
  id: string;
  source: 'whatsapp' | 'instagram';
  paymentMethod: 'COD' | 'Prepaid' | null;
  timestamp: string;
}

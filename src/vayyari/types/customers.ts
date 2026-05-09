/**
 * Represents a customer.
 * Mirrors CustomerDto from backend.
 */
export interface Customer {
  id: string;
  customerId: number;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  instagramId?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  addresses?: CustomerAddress[];
  
  // Virtual field for UI
  fullName?: string; 
}

/**
 * Represents a customer address.
 * Mirrors CustomerAddressDto from backend.
 */
export interface CustomerAddress {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  pincode: string;
  city?: string;
  state?: string;
  isDefault: boolean;
}

/**
 * Payload for creating/updating a customer.
 * Mirrors CreateCustomerRequest from backend.
 */
export interface CreateCustomerRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  instagramId?: string;
  email?: string;
  notes?: string;
}

/**
 * Payload for creating/updating an address.
 * Mirrors CreateAddressRequest from backend.
 */
export interface CreateAddressRequest {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  pincode: string;
  city?: string;
  state?: string;
  isDefault?: boolean;
}

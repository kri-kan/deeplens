export interface CustomerInstagramAccount {
  id: string;
  username: string;
  fullName?: string;
  profilePictureUrl?: string;
  isPrimary: boolean;
}

export interface Language {
  code: string;
  name: string;
  isDefault: boolean;
}

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
  referralCode?: string;
  createdAt: string;
  addresses?: CustomerAddress[];
  instagramAccounts?: CustomerInstagramAccount[];
  preferredLanguages?: string[];
  
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
  instagramAccounts?: CustomerInstagramAccount[];
  preferredLanguages?: string[];
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

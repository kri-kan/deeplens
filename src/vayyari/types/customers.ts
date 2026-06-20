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
  gender?: 'Male' | 'Female';
  referralCode?: string;
  createdAt: string;
  addresses?: CustomerAddress[];
  instagramAccounts?: CustomerInstagramAccount[];
  preferredLanguages?: string[];
  orderCount?: number;
  enquiryCount?: number;
  
  // Virtual field for UI
  fullName?: string; 
}

export interface CustomerListResponse {
  customers: Customer[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  pincode: string;
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
  gender?: 'Male' | 'Female';
  instagramAccounts?: Omit<CustomerInstagramAccount, 'fullName' | 'profilePictureUrl'>[];
  preferredLanguages?: string[];
  addresses?: CreateAddressRequest[];
}

/**
 * Payload for creating/updating an address.
 * Mirrors CreateAddressRequest from backend.
 */
export interface CreateAddressRequest {
  id?: string;
  name: string;
  phone: string;
  line1: string;
  pincode: string;
  isDefault?: boolean;
}

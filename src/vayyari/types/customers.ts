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
  updatedAt: string;
  addresses?: CustomerAddress[];
  
  // Virtual field for UI
  fullName?: string; 
}

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
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  instagramId?: string;
  email?: string;
  notes?: string;
}

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

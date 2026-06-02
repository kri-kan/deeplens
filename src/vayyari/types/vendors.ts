export interface VendorResponse {
  id: string;
  vendorName: string;
  vendorCode?: string;
  firstName?: string;
  lastName?: string;
  whatsappPrimary?: string;
  whatsappSecondary?: string;
  orderGroupLink?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorListResponse {
  vendors: VendorResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VendorAddressRequest {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  pincode: string;
  city?: string;
  state?: string;
  isDefault: boolean;
}

export interface VendorAddressResponse {
  id: string;
  vendorId: string;
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

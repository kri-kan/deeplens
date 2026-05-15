export interface VendorResponse {
  id: string;
  vendorName: string;
  vendorCode?: string;
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

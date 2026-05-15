import { productMgmtApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { VendorListResponse, VendorResponse } from '@/types/vendors';

export const vendorService = {
  listVendors: async (page = 1, pageSize = 50, activeOnly?: boolean): Promise<VendorListResponse> => {
    return await productMgmtApiClient.get<VendorListResponse>(API_ROUTES.VENDORS.LIST, {
      params: { page, pageSize, activeOnly }
    });
  },

  getVendor: async (id: string): Promise<VendorResponse> => {
    return await productMgmtApiClient.get<VendorResponse>(API_ROUTES.VENDORS.DETAIL(id));
  }
};

import { productMgmtApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { VendorListResponse, VendorResponse, VendorAddressRequest, VendorAddressResponse } from '@/types/vendors';

export const vendorService = {
  listVendors: async (page = 1, pageSize = 50, activeOnly?: boolean): Promise<VendorListResponse> => {
    return await productMgmtApiClient.get<VendorListResponse>(API_ROUTES.VENDORS.LIST, {
      params: { page, pageSize, activeOnly }
    });
  },

  getVendor: async (id: string): Promise<VendorResponse> => {
    return await productMgmtApiClient.get<VendorResponse>(API_ROUTES.VENDORS.DETAIL(id));
  },

  createVendor: async (data: Partial<VendorResponse>): Promise<VendorResponse> => {
    return await productMgmtApiClient.post<VendorResponse>(API_ROUTES.VENDORS.LIST, data);
  },

  updateVendor: async (id: string, data: Partial<VendorResponse>): Promise<VendorResponse> => {
    return await productMgmtApiClient.patch<VendorResponse>(API_ROUTES.VENDORS.DETAIL(id), data);
  },

  deleteVendor: async (id: string): Promise<void> => {
    await productMgmtApiClient.delete(API_ROUTES.VENDORS.DETAIL(id));
  },

  getVendorAddresses: async (vendorId: string): Promise<VendorAddressResponse[]> => {
    return await productMgmtApiClient.get<VendorAddressResponse[]>(API_ROUTES.VENDORS.ADDRESSES(vendorId));
  },

  addVendorAddress: async (vendorId: string, address: VendorAddressRequest): Promise<VendorAddressResponse> => {
    return await productMgmtApiClient.post<VendorAddressResponse>(API_ROUTES.VENDORS.ADDRESSES(vendorId), address);
  },

  updateVendorAddress: async (addressId: string, address: VendorAddressRequest): Promise<VendorAddressResponse> => {
    return await productMgmtApiClient.put<VendorAddressResponse>(API_ROUTES.VENDORS.UPDATE_ADDRESS(addressId), address);
  },

  deleteVendorAddress: async (addressId: string): Promise<void> => {
    await productMgmtApiClient.delete(API_ROUTES.VENDORS.DELETE_ADDRESS(addressId));
  },

  setDefaultAddress: async (vendorId: string, addressId: string): Promise<void> => {
    await productMgmtApiClient.post(API_ROUTES.VENDORS.SET_DEFAULT_ADDRESS(vendorId, addressId), {});
  }
};

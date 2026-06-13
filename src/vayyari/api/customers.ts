import { searchApiClient } from './client';

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
  addresses?: CustomerAddress[];
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  line1: string;
  pincode: string;
  isDefault: boolean;
}

export const customersApi = {
  /**
   * Gets or creates a customer by phone number or instagram ID.
   * If the customer exists with this phone/handle, the backend returns the existing one.
   * Otherwise, it creates a new dummy customer.
   */
  getOrCreateCustomer: async (phone?: string, instagramId?: string): Promise<Customer> => {
    return searchApiClient.post<Customer>('/api/v1/customers', {
      phoneNumber: phone,
      instagramId: instagramId
    });
  },

  getCustomerById: async (id: string): Promise<Customer> => {
    return searchApiClient.get<Customer>(`/api/v1/customers/${id}`);
  },

  updateCustomerName: async (id: string, currentCustomer: Customer, firstName: string, lastName: string): Promise<void> => {
    await searchApiClient.put(`/api/v1/customers/${id}`, {
      ...currentCustomer,
      firstName,
      lastName
    });
  },

  /**
   * Only deletes if the customer has NO active orders.
   * Resolves silently if successfully deleted. Will throw/reject if linked to active orders.
   */
  cleanupDummyCustomer: async (id: string): Promise<void> => {
    try {
      await searchApiClient.delete(`/api/v1/customers/${id}/safe-delete-dummy`);
    } catch (e) {
      // Ignored - usually means the customer is linked to orders, so we keep them
      console.log('Could not safe-delete dummy customer (likely has orders):', id);
    }
  },

  getCustomerAddresses: async (id: string): Promise<CustomerAddress[]> => {
    // The GET /api/v1/customers/{id} endpoint returns the customer with their addresses.
    const customer = await customersApi.getCustomerById(id);
    return customer.addresses || [];
  },

  saveCustomerAddress: async (customerId: string, address: Omit<CustomerAddress, 'id' | 'customerId'>): Promise<string> => {
    const response = await searchApiClient.post<{ id: string }>(`/api/v1/customers/${customerId}/addresses`, address);
    return response.id;
  },
  
  updateCustomerAddress: async (addressId: string, address: Omit<CustomerAddress, 'id' | 'customerId'>): Promise<void> => {
    await searchApiClient.put(`/api/v1/customers/addresses/${addressId}`, address);
  }
};

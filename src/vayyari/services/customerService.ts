import { productMgmtApiClient } from '../api/client';
import { API_ROUTES } from '../constants/api-routes';
import type { 
  Customer, 
  CustomerAddress, 
  CreateCustomerRequest, 
  CreateAddressRequest 
} from '../types/customers';

class CustomerService {
  async getCustomers(limit = 50, offset = 0): Promise<Customer[]> {
    return productMgmtApiClient.get<Customer[]>(API_ROUTES.CUSTOMERS.LIST, {
      params: { limit, offset },
    });
  }

  async getCustomerById(id: string): Promise<Customer> {
    return productMgmtApiClient.get<Customer>(API_ROUTES.CUSTOMERS.GET_BY_ID(id));
  }

  async createCustomer(request: CreateCustomerRequest): Promise<Customer> {
    return productMgmtApiClient.post<Customer>(API_ROUTES.CUSTOMERS.CREATE, request);
  }

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<void> {
    return productMgmtApiClient.put(API_ROUTES.CUSTOMERS.UPDATE(id), customer);
  }

  async deleteCustomer(id: string): Promise<void> {
    return productMgmtApiClient.delete(API_ROUTES.CUSTOMERS.DELETE(id));
  }

  // Addresses
  async getAddresses(customerId: string): Promise<CustomerAddress[]> {
    return productMgmtApiClient.get<CustomerAddress[]>(API_ROUTES.CUSTOMERS.ADDRESSES(customerId));
  }

  async addAddress(customerId: string, address: CreateAddressRequest): Promise<{ id: string }> {
    return productMgmtApiClient.post<{ id: string }>(API_ROUTES.CUSTOMERS.ADD_ADDRESS(customerId), address);
  }

  async updateAddress(addressId: string, address: Partial<CustomerAddress>): Promise<void> {
    return productMgmtApiClient.put(API_ROUTES.CUSTOMERS.UPDATE_ADDRESS(addressId), address);
  }

  async deleteAddress(addressId: string): Promise<void> {
    return productMgmtApiClient.delete(API_ROUTES.CUSTOMERS.DELETE_ADDRESS(addressId));
  }

  async setDefaultAddress(customerId: string, addressId: string): Promise<void> {
    return productMgmtApiClient.post(API_ROUTES.CUSTOMERS.SET_DEFAULT_ADDRESS(customerId, addressId), {});
  }
}

export const customerService = new CustomerService();

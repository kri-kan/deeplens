import { productMgmtApiClient } from '../api/client';
import { API_ROUTES } from '../constants/api-routes';
import type { 
  Customer, 
  CustomerAddress, 
  CreateCustomerRequest, 
  CreateAddressRequest,
  Language
} from '../types/customers';

class CustomerService {
  async getCustomers(limit = 50, offset = 0): Promise<Customer[]> {
    return productMgmtApiClient.get<Customer[]>(API_ROUTES.CUSTOMERS.LIST, {
      params: { limit, offset },
    });
  }

  async getCustomerById(id: string): Promise<Customer> {
    return productMgmtApiClient.get<Customer>(API_ROUTES.CUSTOMERS.DETAIL(id));
  }

  async createCustomer(request: CreateCustomerRequest): Promise<Customer> {
    return productMgmtApiClient.post<Customer>(API_ROUTES.CUSTOMERS.UPSERT, request);
  }

  async updateCustomer(id: string, customer: CreateCustomerRequest): Promise<void> {
    return productMgmtApiClient.put(API_ROUTES.CUSTOMERS.DETAIL(id), customer);
  }

  async deleteCustomer(id: string): Promise<void> {
    return productMgmtApiClient.delete(API_ROUTES.CUSTOMERS.DELETE(id));
  }

  // Addresses
  async getAddresses(customerId: string): Promise<CustomerAddress[]> {
    return productMgmtApiClient.get<CustomerAddress[]>(API_ROUTES.CUSTOMERS.ADDRESSES(customerId));
  }

  async addAddress(customerId: string, address: CreateAddressRequest): Promise<{ id: string }> {
    return productMgmtApiClient.post<{ id: string }>(API_ROUTES.CUSTOMERS.ADDRESSES(customerId), address);
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

  async validateInstagram(username: string, currentCustomerId?: string): Promise<{ isValid: boolean }> {
    return productMgmtApiClient.get<{ isValid: boolean }>(API_ROUTES.CUSTOMERS.VALIDATE_INSTAGRAM(username, currentCustomerId));
  }

  async getLanguages(): Promise<Language[]> {
    return productMgmtApiClient.get<Language[]>(API_ROUTES.CUSTOMERS.LANGUAGES);
  }
}

export const customerService = new CustomerService();

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';
const TENANT_ID = import.meta.env.VITE_TENANT_ID || '2abbd721-873e-4bf0-9cb2-c93c6894c584';

export interface VendorContact {
    id?: string;
    vendorId?: string;
    contactName: string;
    contactRole?: string;
    phoneNumber?: string;
    alternatePhone?: string;
    email?: string;
    isPrimary: boolean;
    createdAt?: string;
}

export interface Vendor {
    id?: string;
    tenantId?: string;
    vendorName: string;
    vendorCode?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    email?: string;
    website?: string;
    notes?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    contacts?: VendorContact[];
}

export interface VendorListResponse {
    vendors: Vendor[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface CreateVendorRequest {
    vendorName: string;
    vendorCode?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    email?: string;
    website?: string;
    notes?: string;
    contacts?: Omit<VendorContact, 'id' | 'vendorId' | 'createdAt'>[];
}

export interface UpdateVendorRequest {
    vendorName?: string;
    vendorCode?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    email?: string;
    website?: string;
    notes?: string;
    isActive?: boolean;
}

class VendorService {
    async listVendors(page: number = 1, pageSize: number = 50, activeOnly?: boolean): Promise<VendorListResponse> {
        const params = new URLSearchParams({
            tenant: TENANT_ID,
            page: page.toString(),
            pageSize: pageSize.toString(),
        });

        if (activeOnly !== undefined) {
            params.append('activeOnly', activeOnly.toString());
        }

        const response = await axios.get(`${API_BASE_URL}/vendors?${params}`);
        return response.data;
    }

    async getVendor(vendorId: string): Promise<Vendor> {
        const response = await axios.get(`${API_BASE_URL}/vendors/${vendorId}?tenant=${TENANT_ID}`);
        return response.data;
    }

    async createVendor(request: CreateVendorRequest): Promise<Vendor> {
        const response = await axios.post(`${API_BASE_URL}/vendors?tenant=${TENANT_ID}`, request);
        return response.data;
    }

    async updateVendor(vendorId: string, request: UpdateVendorRequest): Promise<Vendor> {
        const response = await axios.patch(`${API_BASE_URL}/vendors/${vendorId}?tenant=${TENANT_ID}`, request);
        return response.data;
    }

    async deleteVendor(vendorId: string): Promise<void> {
        await axios.delete(`${API_BASE_URL}/vendors/${vendorId}?tenant=${TENANT_ID}`);
    }

    async addContact(vendorId: string, contact: Omit<VendorContact, 'id' | 'vendorId' | 'createdAt'>): Promise<VendorContact> {
        const response = await axios.post(`${API_BASE_URL}/vendors/${vendorId}/contacts?tenant=${TENANT_ID}`, contact);
        return response.data;
    }

    async removeContact(contactId: string): Promise<void> {
        await axios.delete(`${API_BASE_URL}/vendors/contacts/${contactId}?tenant=${TENANT_ID}`);
    }
}

export default new VendorService();

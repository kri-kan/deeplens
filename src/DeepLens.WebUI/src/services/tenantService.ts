import apiClient from './apiClient';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tier: 'Free' | 'Professional' | 'Enterprise';
  status: 'Active' | 'Suspended' | 'PendingSetup' | 'Deleted';
  databaseName: string;
  qdrantContainerName: string;
  qdrantHttpPort: number;
  qdrantGrpcPort: number;
  minioEndpoint: string;
  minioBucketName: string;
  maxStorageBytes: number;
  maxUsers: number;
  maxApiCallsPerDay: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTenantRequest {
  name: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  tier?: 'Free' | 'Professional' | 'Enterprise';
  description?: string;
}

export interface UpdateTenantRequest {
  description?: string;
  status?: 'Active' | 'Suspended';
  tier?: 'Free' | 'Professional' | 'Enterprise';
}

export const tenantService = {
  getAllTenants: async (): Promise<Tenant[]> => {
    const response = await apiClient.get('/api/tenants');
    return response.data;
  },

  getTenantById: async (id: string): Promise<Tenant> => {
    const response = await apiClient.get(`/api/tenants/${id}`);
    return response.data;
  },

  getTenantBySlug: async (slug: string): Promise<Tenant> => {
    const response = await apiClient.get(`/api/tenants/slug/${slug}`);
    return response.data;
  },

  createTenant: async (data: CreateTenantRequest): Promise<any> => {
    const response = await apiClient.post('/api/tenants', data);
    return response.data;
  },

  updateTenant: async (id: string, data: UpdateTenantRequest): Promise<Tenant> => {
    const response = await apiClient.put(`/api/tenants/${id}`, data);
    return response.data;
  },

  deleteTenant: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/tenants/${id}`);
  },
};

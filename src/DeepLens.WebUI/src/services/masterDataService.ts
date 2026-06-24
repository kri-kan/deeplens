import apiClient from './apiClient';

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconName: string | null;
  classificationKeywords: string[] | null;
}

export interface CategoryUpdateDto {
  id?: string;
  name: string;
  iconName?: string;
  classificationKeywords?: string[];
}

export interface AvailableIcon {
  id: string;
  name: string;
}

export const masterDataService = {
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get<Category[]>('/api/v1/MasterData/categories');
    return response.data;
  },

  upsertCategory: async (category: CategoryUpdateDto): Promise<void> => {
    await apiClient.post('/api/v1/MasterData/categories', category);
  },

  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/MasterData/categories/${id}`);
  },

  getAvailableIcons: async (): Promise<AvailableIcon[]> => {
    const response = await apiClient.get<AvailableIcon[]>('/api/v1/MasterData/icons');
    return response.data;
  }
};

export default masterDataService;

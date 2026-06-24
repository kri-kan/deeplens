import { searchApiClient } from '../api/client';

export interface AppCategory {
  id: string;
  name: string;
  slug: string;
  iconName?: string;
  classificationKeywords?: string[];
}

export interface AppIcon {
  id: string;
  name: string;
}

export const systemService = {
  getCategories: async (): Promise<AppCategory[]> => {
    return searchApiClient.get<AppCategory[]>('/api/v1/MasterData/categories');
  },

  getAvailableIcons: async (): Promise<AppIcon[]> => {
    return searchApiClient.get<AppIcon[]>('/api/v1/MasterData/icons');
  },

  upsertCategory: async (category: Partial<AppCategory>): Promise<void> => {
    return searchApiClient.post('/api/v1/MasterData/categories', category);
  },

  deleteCategory: async (id: string): Promise<void> => {
    return searchApiClient.delete(`/api/v1/MasterData/categories/${id}`);
  },
};

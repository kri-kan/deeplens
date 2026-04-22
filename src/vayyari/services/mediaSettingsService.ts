import { searchApiClient } from '../api/client';
import { API_ROUTES } from '../constants/api-routes';

export interface MediaPreference {
  id?: string;
  category: string | null;
  subCategory: string | null;
  thumbnailSizes: string[];
  retention: string;
  isActive: boolean;
  isGlobal?: boolean;
}

class MediaSettingsService {
  async getAll(): Promise<MediaPreference[]> {
    return await searchApiClient.get<MediaPreference[]>(API_ROUTES.MEDIA_SETTINGS.GET_ALL);
  }

  async upsert(request: MediaPreference): Promise<void> {
    await searchApiClient.post<void>(API_ROUTES.MEDIA_SETTINGS.UPSERT, request);
  }

  async delete(id: string): Promise<void> {
    await searchApiClient.delete<void>(API_ROUTES.MEDIA_SETTINGS.DELETE(id));
  }

  async lookup(category: string, subCategory?: string): Promise<MediaPreference> {
    return await searchApiClient.get<MediaPreference>(
      API_ROUTES.MEDIA_SETTINGS.LOOKUP(category, subCategory)
    );
  }

  async getRetentionOptions(): Promise<string[]> {
    return await searchApiClient.get<string[]>(API_ROUTES.MEDIA_SETTINGS.RETENTION_OPTIONS);
  }

  async getSchema(): Promise<Record<string, string[]>> {
    return await searchApiClient.get<Record<string, string[]>>(API_ROUTES.MEDIA_SETTINGS.SCHEMA);
  }
}

export const mediaSettingsService = new MediaSettingsService();
export default mediaSettingsService;

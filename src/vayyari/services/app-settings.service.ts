import { competitorApiClient } from '../api/client';

export interface AppSetting {
  key: string;
  value: string | null;
  label: string;
  description: string | null;
  isSecret: boolean;
  dataType: 'string' | 'integer' | 'boolean' | 'datetime';
  updatedAt: string;
}

export type AppSettingsGrouped = Record<string, AppSetting[]>;

class AppSettingsService {
  async getAll(): Promise<AppSettingsGrouped> {
    const response = await competitorApiClient.get<AppSettingsGrouped>('/api/AppSettings');
    return response || {};
  }

  async getSection(section: string): Promise<AppSetting[]> {
    const response = await competitorApiClient.get<AppSetting[]>(`/api/AppSettings/${section}`);
    return response || [];
  }

  async update(key: string, value: string): Promise<AppSetting> {
    // The C# API uses catch-all route {*key}, but we still url-encode to be safe
    const response = await competitorApiClient.put<{ message: string; setting: AppSetting }>(
      `/api/AppSettings/${encodeURIComponent(key)}`,
      { value }
    );
    return response.setting;
  }

  async seed(): Promise<void> {
    await competitorApiClient.post('/api/AppSettings/seed');
  }
}

export const appSettingsService = new AppSettingsService();

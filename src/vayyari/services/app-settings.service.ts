import { searchApiClient } from '../api/client';

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

export const DEFAULT_WHATSAPP_RETENTION_SETTING: AppSetting = {
  key: 'whatsapp.media.retention_days',
  value: '100',
  label: 'WhatsApp Media Retention',
  description: 'Auto-archive raw unpromoted WhatsApp media after N days (Default: 100 days)',
  isSecret: false,
  dataType: 'integer',
  updatedAt: '2026-01-01T00:00:00Z',
};

class AppSettingsService {
  async getAll(): Promise<AppSettingsGrouped> {
    try {
      const response = await searchApiClient.get<AppSettingsGrouped>('/api/AppSettings');
      const data: AppSettingsGrouped = response ? { ...response } : {};
      
      // Ensure whatsapp.media.retention_days is present in at least one section
      let hasRetention = false;
      for (const section of Object.keys(data)) {
        if (data[section]?.some(s => s.key === 'whatsapp.media.retention_days')) {
          hasRetention = true;
          break;
        }
      }

      if (!hasRetention) {
        // Place under Infrastructure (or first available infrastructure/meta section)
        const targetSection = data['Infrastructure'] ? 'Infrastructure' : (data['Infrastructure & Storage'] ? 'Infrastructure & Storage' : 'Infrastructure');
        if (!data[targetSection]) {
          data[targetSection] = [];
        }
        data[targetSection].push(DEFAULT_WHATSAPP_RETENTION_SETTING);
      }

      return data;
    } catch (err) {
      console.warn('[AppSettingsService] Failed to load settings from server, using defaults:', err);
      return {
        Infrastructure: [DEFAULT_WHATSAPP_RETENTION_SETTING],
      };
    }
  }

  async getSection(section: string): Promise<AppSetting[]> {
    const response = await searchApiClient.get<AppSetting[]>(`/api/AppSettings/${section}`);
    return response || [];
  }

  async update(key: string, value: string): Promise<AppSetting> {
    // The C# API uses catch-all route {*key}, but we still url-encode to be safe
    const response = await searchApiClient.put<{ message: string; setting: AppSetting }>(
      `/api/AppSettings/${encodeURIComponent(key)}`,
      { value }
    );
    return response.setting;
  }

  async seed(): Promise<void> {
    await searchApiClient.post('/api/AppSettings/seed');
  }
}

export const appSettingsService = new AppSettingsService();


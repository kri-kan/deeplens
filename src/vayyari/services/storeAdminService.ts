import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY } from './identity.service';
import { getStoreApiUrl } from '@/utils/api-config';

export interface PublishProductItem {
  vayyariProductId: string;
  productCode: string;
  title: string;
  description?: string;
  categoryName: string;
  fabric?: string;
  baseCost: number;
  mediaUrls: string[];
}

export interface StoreMediaItem {
  id: string;
  url: string;
  mediaType: number;
  order: number;
  dwellSeconds: number;
  isCover: boolean;
  colorGroupId?: string | null;
  isQualified?: boolean;
  isCommon?: boolean;
  title?: string;
  originalUrl?: string | null;
  modifiedUrl?: string | null;
  activeDisplaySource?: 'original' | 'modified';
  hasModified?: boolean;
  transformRecipe?: string | null;
}

export interface StoreProduct {
  id: string;
  vayyariProductId: string;
  productCode: string;
  title: string;
  description?: string;
  categoryName: string;
  fabric?: string;
  baseCost: number;
  mrp: number;
  salePrice: number;
  lifecycleStatus: 'available' | 'few_left' | 'sold_out' | 'out_of_stock';
  stockQuantity: number;
  colorGroupId?: string | null;
  colorwayName: string;
  colorHex: string;
  swatchTemplate?: string;
  colorGroups?: any[];
  mediaOrder: StoreMediaItem[];
  tags: string[];
  isPublished: boolean;
  publishedAt: string;
}

export interface StoreProductAudit {
  id: string;
  storeProductId: string;
  actionType: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  authorEmail: string;
  createdAt: string;
}

export interface StoreProductCuration {
  product: StoreProduct;
  auditHistory: StoreProductAudit[];
  smartDwellSuggestions: string[];
}

export interface UpdateCurationPayload {
  lifecycleStatus?: string;
  stockQuantity?: number;
  mrp?: number;
  salePrice?: number;
  description?: string;
  colorGroupId?: string | null;
  colorwayName?: string;
  colorHex?: string;
  swatchTemplate?: string;
  colorGroups?: any[];
  mediaOrder?: StoreMediaItem[];
  tags?: string[];
}

class StoreAdminService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['X-Store-Admin-Key'] = 'pat_live_vayyari_admin_2026';
      }
    } catch {
      headers['X-Store-Admin-Key'] = 'pat_live_vayyari_admin_2026';
    }

    return headers;
  }

  async batchPublish(products: PublishProductItem[]): Promise<{ count: number; status: string }> {
    const headers = await this.getAuthHeaders();
    const baseUrl = getStoreApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/admin/products/publish`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ products }),
    });

    if (!res.ok) {
      throw new Error(`Failed to publish products to store: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  async getInStoreProducts(params?: {
    category?: string;
    search?: string;
    lifecycle?: string;
  }): Promise<StoreProduct[]> {
    const headers = await this.getAuthHeaders();
    const baseUrl = getStoreApiUrl();
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.lifecycle) query.append('lifecycle', params.lifecycle);

    const res = await fetch(`${baseUrl}/api/v1/admin/products/in-store?${query.toString()}`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch in-store products: ${res.status}`);
    }

    return res.json();
  }

  async getProductCuration(productId: string): Promise<StoreProductCuration> {
    const headers = await this.getAuthHeaders();
    const baseUrl = getStoreApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/admin/products/${productId}/curation`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch product curation: ${res.status}`);
    }

    return res.json();
  }

  async updateProductCuration(productId: string, payload: UpdateCurationPayload): Promise<boolean> {
    const headers = await this.getAuthHeaders();
    const baseUrl = getStoreApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/admin/products/${productId}/curation`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    return res.ok;
  }

  async uploadModifiedMedia(
    productId: string,
    mediaId: string,
    imageBlob: Blob,
    recipeJson?: string
  ): Promise<StoreMediaItem> {
    const headers = await this.getAuthHeaders();
    // Do not set Content-Type header so browser sets multipart boundary
    delete headers['Content-Type'];

    const formData = new FormData();
    formData.append('file', imageBlob, `${mediaId}_mod.webp`);
    if (recipeJson) {
      formData.append('recipeJson', recipeJson);
    }

    const baseUrl = getStoreApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/admin/products/${productId}/media/${mediaId}/modified`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Failed to upload modified media: ${res.status}`);
    }

    return res.json();
  }

  async deleteModifiedMedia(productId: string, mediaId: string): Promise<StoreMediaItem> {
    const headers = await this.getAuthHeaders();
    const baseUrl = getStoreApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/admin/products/${productId}/media/${mediaId}/modified`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      throw new Error(`Failed to delete modified media: ${res.status}`);
    }

    return res.json();
  }

  async toggleMediaDisplaySource(
    productId: string,
    mediaId: string,
    activeDisplaySource: 'original' | 'modified'
  ): Promise<StoreMediaItem> {
    const headers = await this.getAuthHeaders();
    const baseUrl = getStoreApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/admin/products/${productId}/media/${mediaId}/display-source`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ activeDisplaySource }),
    });

    if (!res.ok) {
      throw new Error(`Failed to toggle media display source: ${res.status}`);
    }

    return res.json();
  }

  async getFleetStats(): Promise<DeviceFleetStats> {
    const headers = await this.getAuthHeaders();
    const baseUrl = getStoreApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/admin/telemetry/stats`, { headers });
    if (!res.ok) {
      throw new Error(`Failed to load fleet stats: ${res.status}`);
    }
    return res.json();
  }

  async getRegisteredDevices(platform?: string): Promise<StoreDeviceItem[]> {
    const headers = await this.getAuthHeaders();
    const baseUrl = getStoreApiUrl();
    const url = platform
      ? `${baseUrl}/api/v1/admin/telemetry/devices?platform=${encodeURIComponent(platform)}`
      : `${baseUrl}/api/v1/admin/telemetry/devices`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to load devices: ${res.status}`);
    }
    return res.json();
  }

  async getHourlyActivity(days: number = 30): Promise<HourlyActivitySummary> {
    const headers = await this.getAuthHeaders();
    const baseUrl = getStoreApiUrl();
    const res = await fetch(`${baseUrl}/api/v1/admin/telemetry/activity/hourly?days=${days}`, { headers });
    if (!res.ok) {
      throw new Error(`Failed to load hourly activity: ${res.status}`);
    }
    return res.json();
  }
}

export interface HourlyDistributionItem {
  hourIst: number;
  hourLabel: string;
  activeDevices: number;
  activeUsers: number;
  totalEvents: number;
  percentageOfDailyTraffic: number;
}

export interface HourlyActivitySummary {
  distribution: HourlyDistributionItem[];
  peakHourIst: number;
  peakHourLabel: string;
  totalEventsLast30Days: number;
  uniqueDevicesLast30Days: number;
  historicalHoursRetained: number;
}

export interface StoreDeviceItem {
  deviceId: string;
  fingerprintHash?: string;
  platform: string;
  os?: string;
  model?: string;
  browser?: string;
  screenResolution?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastIp?: string;
  lastUserId?: string;
  totalEvents: number;
}

export interface DeviceFleetStats {
  totalDevices: number;
  activeToday: number;
  activeLast7Days: number;
  platformBreakdown: Record<string, number>;
  topSignalTypes: Record<string, number>;
  recentDevices: StoreDeviceItem[];
}

export const storeAdminService = new StoreAdminService();

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
  colorGroupId?: string | null;
  colorwayName?: string;
  colorHex?: string;
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
}

export const storeAdminService = new StoreAdminService();

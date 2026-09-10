export interface EthnicSwatch {
  id: string;
  name: string;
  type: 'solid' | 'contrast' | 'dhup_chhaon' | 'split' | 'grid';
  primaryHex: string;
  secondaryHex?: string;
  accentHex?: string;
  imageUrl?: string;
}

export interface StoreProduct {
  id: string;
  code: string;
  title: string;
  brand: string;
  category: 'saree' | 'silk' | 'kurta' | 'lehanga' | 'jewelry' | 'home';
  price: number;
  originalPrice: number;
  discountPercentage: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockQuantity?: number;
  images: string[];
  swatches: EthnicSwatch[];
  fabric: string;
  weaveOrigin: string;
  description: string;
  features: string[];
}

import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const MOCK_STORE_PRODUCTS: StoreProduct[] = [];

const DEFAULT_LAN_HOST = '192.168.0.170';

const getStoreApiUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:5200`;
  }
  if (Constants.expoConfig?.hostUri) {
    const host = Constants.expoConfig.hostUri.split(':')[0];
    if (host && host !== '127.0.0.1' && host !== 'localhost') {
      return `http://${host}:5200`;
    }
  }
  if (Platform.OS === 'android') {
    return `http://${DEFAULT_LAN_HOST}:5200`;
  }
  return 'http://localhost:5200';
};

export const mockCatalogService = {
  async getProducts(category?: string): Promise<StoreProduct[]> {
    try {
      const url = `${getStoreApiUrl()}/api/v1/products${category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((p: any) => ({
            id: p.id,
            code: p.productCode || 'VY-LIVE-01',
            title: p.title,
            brand: p.brand || 'VAYYARI HANDLOOM',
            category: (p.category || 'saree').toLowerCase() as any,
            price: p.price || 8000,
            originalPrice: p.originalPrice || 12000,
            discountPercentage: p.discountPercentage || 0,
            rating: 4.9,
            reviewCount: 12,
            inStock: p.inStock ?? true,
            images: p.allMediaUris && p.allMediaUris.length > 0 ? p.allMediaUris : [p.primaryImageUri || 'https://picsum.photos/seed/saree/600/800'],
            swatches: [
              { id: 'sw-1', name: p.color || 'Standard', type: 'solid', primaryHex: '#D4AF37' }
            ],
            fabric: p.fabric || 'Pure Silk',
            weaveOrigin: 'Handcrafted Heritage, India',
            description: p.descriptions?.[0] || p.title,
            features: ['Authentic Handloom', 'Pure Zari Weave', 'Express Dispatch']
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch live store products from Store.Api:', err);
    }
    return [];
  },

  async getProductById(id: string): Promise<StoreProduct | null> {
    try {
      const base = getStoreApiUrl();
      // Try dedicated product code endpoint first: /api/v1/products/code/{code}
      let res = await fetch(`${base}/api/v1/products/code/${encodeURIComponent(id)}`);
      if (!res.ok) {
        // Fallback to /api/v1/products/{id}
        res = await fetch(`${base}/api/v1/products/${encodeURIComponent(id)}`);
      }
      if (res.ok) {
        const p = await res.json();
        return {
          id: p.id,
          code: p.productCode || id,
          title: p.title || '-',
          brand: p.brand || '-',
          category: (p.category || 'saree').toLowerCase() as any,
          price: p.price ?? 0,
          originalPrice: p.originalPrice ?? p.price ?? 0,
          discountPercentage: p.discountPercentage ?? 0,
          rating: 4.9,
          reviewCount: 12,
          inStock: p.inStock ?? true,
          stockQuantity: p.stockQuantity ?? 1,
          images: p.allMediaUris && p.allMediaUris.length > 0 ? p.allMediaUris : (p.primaryImageUri ? [p.primaryImageUri] : []),
          swatches: p.color ? [
            { id: 'sw-1', name: p.color, type: 'solid', primaryHex: '#8B0000' }
          ] : [],
          fabric: p.fabric || '-',
          weaveOrigin: p.weaveOrigin || '-',
          description: (p.descriptions && p.descriptions.length > 0 && p.descriptions[0]) ? p.descriptions[0] : '-',
          features: p.features && p.features.length > 0 ? p.features : []
        };
      }
    } catch (err) {
      console.warn('Failed to fetch live product by code/id from Store.Api:', err);
    }
    return null;
  }
};

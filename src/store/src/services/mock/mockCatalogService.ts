import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { SwatchTemplateType } from '../../components/atoms/SwatchDot/CustomSwatchDot';

export interface EthnicSwatch {
  id: string;
  name: string;
  type: 'solid' | 'contrast' | 'dhup_chhaon' | 'split' | 'grid' | SwatchTemplateType;
  primaryHex: string;
  secondaryHex?: string;
  accentHex?: string;
  imageUrl?: string;
}

export interface StoreColorGroup {
  id: string;
  name: string;
  colorwayCode?: string;
  template?: SwatchTemplateType;
  slotA?: string;
  slotB?: string;
  slotC?: string;
  slotD?: string;
  colors?: string[];
  colorCount?: number;
  isAvailable?: boolean;
}

export interface StoreMediaItem {
  id: string;
  url: string;
  mediaType?: number;
  order?: number;
  dwellSeconds?: number;
  isCover?: boolean;
  colorGroupId?: string;
  isQualified?: boolean;
  isCommon?: boolean;
  title?: string;
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
  colorGroupId?: string;
  colorwayName?: string;
  colorHex?: string;
  swatchTemplate?: SwatchTemplateType;
  colorGroups?: StoreColorGroup[];
  mediaOrder?: StoreMediaItem[];
}

export const MOCK_STORE_PRODUCTS: StoreProduct[] = [];

const DEFAULT_LAN_HOST = '192.168.0.170';

const normalizeMediaUrl = (url?: string): string => {
  if (!url) return '';
  return url
    .replace(/http:\/\/192\.168\.0\.170:9000/g, 'http://media.vayyarifashions.com')
    .replace(/http:\/\/localhost:9000/g, 'http://media.vayyarifashions.com');
};

const getStoreApiUrl = () => {
  if (process.env.EXPO_PUBLIC_STORE_API_URL) {
    return process.env.EXPO_PUBLIC_STORE_API_URL;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    if (window.location.hostname.endsWith('vayyarifashions.com')) {
      return `${window.location.protocol}//storeapi.vayyarifashions.com`;
    }
    return `http://${window.location.hostname}:5200`;
  }
  if (Constants.expoConfig?.hostUri) {
    const host = Constants.expoConfig.hostUri.split(':')[0];
    if (host && host !== '127.0.0.1' && host !== 'localhost') {
      return `http://${host}:5200`;
    }
  }
  return 'http://storeapi.vayyarifashions.com';
};

const mapRawProduct = (p: any, defaultCode?: string): StoreProduct => {
  const mappedColorGroups: StoreColorGroup[] = Array.isArray(p.colorGroups)
    ? p.colorGroups.map((cg: any) => ({
        id: cg.id,
        name: cg.name,
        colorwayCode: cg.colorwayCode,
        template: cg.template,
        slotA: cg.slotA,
        slotB: cg.slotB,
        slotC: cg.slotC,
        slotD: cg.slotD,
        colors: cg.colors,
        colorCount: cg.colorCount,
        isAvailable: cg.isAvailable ?? true,
      }))
    : [];

  const mappedMediaOrder: StoreMediaItem[] = Array.isArray(p.mediaOrder)
    ? p.mediaOrder.map((m: any) => ({
        id: m.id,
        url: normalizeMediaUrl(m.url),
        mediaType: m.mediaType,
        order: m.order,
        dwellSeconds: m.dwellSeconds,
        isCover: m.isCover,
        colorGroupId: m.colorGroupId,
        isQualified: m.isQualified,
        isCommon: m.isCommon,
        title: m.title,
      }))
    : [];

  const derivedImages: string[] =
    mappedMediaOrder.length > 0
      ? mappedMediaOrder.map((m) => m.url)
      : (p.allMediaUris && p.allMediaUris.length > 0
          ? p.allMediaUris
          : [p.primaryImageUri || 'https://picsum.photos/seed/saree/600/800']
        ).map(normalizeMediaUrl);

  const derivedSwatches: EthnicSwatch[] =
    mappedColorGroups.length > 0
      ? mappedColorGroups.map((cg) => ({
          id: cg.id,
          name: cg.name,
          type: (cg.template as any) || 'solid',
          primaryHex: cg.slotA || cg.colors?.[0] || '#D4AF37',
          secondaryHex: cg.slotB || cg.colors?.[1],
          accentHex: cg.slotC || cg.colors?.[2],
        }))
      : p.color
      ? [{ id: 'sw-1', name: p.color, type: 'solid', primaryHex: p.colorHex || '#8B0000' }]
      : [];

  return {
    id: p.id,
    code: p.productCode || defaultCode || 'VY-LIVE-01',
    title: p.title || '-',
    brand: p.brand || 'VAYYARI HANDLOOM',
    category: (p.category || 'saree').toLowerCase() as any,
    price: p.price ?? 8000,
    originalPrice: p.originalPrice ?? p.price ?? 12000,
    discountPercentage: p.discountPercentage ?? 0,
    rating: 4.9,
    reviewCount: 12,
    inStock: p.inStock ?? true,
    stockQuantity: p.stockQuantity ?? 1,
    images: derivedImages,
    swatches: derivedSwatches,
    fabric: p.fabric || 'Pure Silk',
    weaveOrigin: p.weaveOrigin || 'Handcrafted Heritage, India',
    description: (p.descriptions && p.descriptions.length > 0 && p.descriptions[0]) ? p.descriptions[0] : (p.title || '-'),
    features: p.features && p.features.length > 0 ? p.features : ['Authentic Handloom', 'Pure Zari Weave', 'Express Dispatch'],
    colorGroupId: p.colorGroupId,
    colorwayName: p.colorwayName || p.color,
    colorHex: p.colorHex,
    swatchTemplate: p.swatchTemplate,
    colorGroups: mappedColorGroups,
    mediaOrder: mappedMediaOrder,
  };
};

export const mockCatalogService = {
  async getProducts(category?: string): Promise<StoreProduct[]> {
    try {
      const url = `${getStoreApiUrl()}/api/v1/products${category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((p: any) => mapRawProduct(p));
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
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let res: Response;
      if (isGuid) {
        // Direct GUID lookup avoids 404 on /products/code/{guid}
        res = await fetch(`${base}/api/v1/products/${encodeURIComponent(id)}`);
      } else {
        // Dedicated product code endpoint first: /api/v1/products/code/{code}
        res = await fetch(`${base}/api/v1/products/code/${encodeURIComponent(id)}`);
        if (!res.ok) {
          // Fallback to /api/v1/products/{id}
          res = await fetch(`${base}/api/v1/products/${encodeURIComponent(id)}`);
        }
      }
      if (res.ok) {
        const p = await res.json();
        return mapRawProduct(p, id);
      }
    } catch (err) {
      console.warn('Failed to fetch live product by code/id from Store.Api:', err);
    }
    return null;
  },
};

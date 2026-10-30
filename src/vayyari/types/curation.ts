import { SwatchTemplateType } from '@/constants/palette';

export type StoreProductLifecycleState = 'available' | 'few_left' | 'sold_out' | 'out_of_stock' | 'archived';

export interface ExtractedColorCentroid {
  hex: string;
  name: string;
  percentage: number;
}

export interface StoreCurationMediaItem {
  id: string;
  uri: string;
  thumbnailUri?: string;
  rawVideoUrl?: string;
  mediaType: 'image' | 'video';
  durationSeconds?: number;
  sortOrder: number;
  isHero: boolean;
  isQualified: boolean; // true: appears in store PDP; false: excluded (blurry/noise)
  isCommon: boolean; // true: shows across all color group carousels
  colorGroupId?: string;
  dwellTimeSeconds?: number;
  detectedColors?: ExtractedColorCentroid[];
  title?: string;
  originalUri?: string;
  modifiedUri?: string | null;
  activeDisplaySource?: 'original' | 'modified';
  hasModified?: boolean;
  transformRecipe?: any;
  sourcePlatform?: 'instagram' | 'catalog' | 'whatsapp';
  sourceUrl?: string;
  sourcePostId?: string;
}

export interface StoreColorGroup {
  id: string;
  name: string;
  colorwayCode: string;
  template: SwatchTemplateType;
  slotA: string;
  slotB?: string;
  slotC?: string;
  slotD?: string;
  colors?: string[];
  colorCount?: number;
  isAvailable?: boolean;
  price?: number | null;
  mrp?: number | null;
  stockQuantity?: number;
  allowWaitlist?: boolean;
  customMessage?: string;
}

export interface StoreSkuItem {
  id: string;
  skuCode: string;
  colorwayName: string;
  colorHex: string;
  secondaryHex?: string;
  colorGroupId?: string;
  price?: number | null;
  mrp?: number | null;
  isPriceInherited: boolean;
  stockQuantity: number;
  allowWaitlist: boolean;
  customMessage?: string;
  thumbnailUrl?: string;
}

export interface StoreAuditLogEntry {
  id: string;
  timestamp: string;
  author: string;
  actionText: string;
}

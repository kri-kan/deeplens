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
}

export interface StoreAuditLogEntry {
  id: string;
  timestamp: string;
  author: string;
  actionText: string;
}

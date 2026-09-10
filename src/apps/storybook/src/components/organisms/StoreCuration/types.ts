import { SwatchTemplateType } from '../../atoms/SwatchDot/CustomSwatchDot';

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
  isQualified: boolean; // true: appears in store PDP; false: excluded (e.g. blurry/vendor chat noise)
  isCommon: boolean; // true: shows across all color group carousels (e.g. blouse, pallu, weave certificate)
  colorGroupId?: string; // Links media to a specific color group if not common
  dwellTimeSeconds?: number;
  detectedColors?: ExtractedColorCentroid[];
  title?: string;
}

export interface StoreColorGroup {
  id: string;
  name: string; // e.g. "Emerald Green & Gold"
  colorwayCode: string; // e.g. "VF2B58-EMR"
  template: SwatchTemplateType; // 'solid' | 'contrast-border' | 'multi-tone' | 'multi-shade' | 'multicolor'
  slotA: string; // Primary Body Hex or Standard Color Name
  slotB?: string; // Border / Contrast Hex
  slotC?: string; // Accent / Weft Hex
  slotD?: string; // Quaternary Hex
  colors?: string[]; // Dynamic N color hexes
  colorCount?: number; // Explicit slot count
  isAvailable?: boolean;
}

export interface StoreAuditLogEntry {
  id: string;
  timestamp: string;
  author: string;
  actionText: string;
}

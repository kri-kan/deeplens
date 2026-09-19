import { SwatchTemplateType } from '../../components/atoms/SwatchDot/CustomSwatchDot';
import { GalleryImage, SwatchItem } from '../../components/organisms/ProductGallery/ProductGallery';

export type SizeCategoryType = 'free-size' | 'letter' | 'numeric' | 'kids' | 'custom';

export interface SizeOption {
  id: string;
  label: string;
  subtitle?: string;
  measurement?: string;
  badge?: string;
  disabled?: boolean;
}

export interface SizeChartRow {
  size: string;
  label: string;
  chestInches?: string;
  chestCm?: string;
  waistInches?: string;
  waistCm?: string;
  lengthInches?: string;
  lengthCm?: string;
  shoulderInches?: string;
  shoulderCm?: string;
  age?: string;
  notes?: string;
}

export interface SizeChartData {
  title: string;
  subtitle?: string;
  unit: 'in' | 'cm';
  columns: { key: string; label: string }[];
  rows: SizeChartRow[];
  tips?: string[];
}

export interface ProductSizeConfig {
  type: SizeCategoryType;
  title?: string;
  options: SizeOption[];
  defaultSelected?: string;
  customNotes?: string;
  sizeChart?: SizeChartData;
}

export interface CatalogTestProduct {
  id: string;
  sku: string;
  title: string;
  brand: string;
  category: 'saree' | 'blouse' | 'dress' | 'kids' | 'lehenga';
  categoryLabel: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  fabric: string;
  stitchType: 'Unstitched' | 'Semi-Stitched' | 'Stitched' | 'Ready to Drape';
  weaveOrigin?: string;
  description: string;
  highlights: string[];
  sizeConfig: ProductSizeConfig;
  swatches: Record<string, SwatchItem>;
  selectedColorDefault: string;
  mediaGallery: string[];
}

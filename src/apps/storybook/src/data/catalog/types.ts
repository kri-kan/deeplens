import { SwatchTemplateType } from '../../components/atoms/SwatchDot/CustomSwatchDot';
import { GalleryImage, SwatchItem } from '../../components/organisms/ProductGallery/ProductGallery';

export type SizeCategoryType = 'no-size' | 'free-size' | 'letter' | 'numeric' | 'kids' | 'custom';

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
  bustInches?: string;
  bustCm?: string;
  underbustInches?: string;
  underbustCm?: string;
  waistInches?: string;
  waistCm?: string;
  hipInches?: string;
  hipCm?: string;
  lengthInches?: string;
  lengthCm?: string;
  shoulderInches?: string;
  shoulderCm?: string;
  armholeInches?: string;
  armholeCm?: string;
  sleeveInches?: string;
  sleeveCm?: string;
  flareInches?: string;
  flareCm?: string;
  heightCm?: string;
  age?: string;
  notes?: string;
}

export interface SizeChartData {
  id?: string;
  category?: 'saree' | 'blouse' | 'kurti' | 'dress' | 'kids' | 'lehenga';
  title: string;
  subtitle?: string;
  unit: 'in' | 'cm';
  columns: { key: string; label: string; minWidth?: number }[];
  rows: SizeChartRow[];
  tips?: string[];
  alterationNote?: string;
  drapeGuide?: {
    sareeLength: string;
    blousePiece: string;
    width: string;
    steps: { title: string; desc: string }[];
  };
  measuringGuide?: {
    points: { name: string; desc: string }[];
  };
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

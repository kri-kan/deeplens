import { SizeChartData, SizeCategoryType } from '../../../data/catalog/types';

export type SizeChartFormFactor = 'mobile' | 'tablet' | 'desktop';

export type SizeChartTab = 'table' | 'measuring' | 'drape';

export interface SizeChartModalProps {
  visible: boolean;
  onClose: () => void;
  data?: SizeChartData;
  category?: string;
  variant?: SizeCategoryType;
  noSizeVariant?: 'one-size' | 'free-size';
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
  formFactor?: SizeChartFormFactor;
  zIndex?: number;
}

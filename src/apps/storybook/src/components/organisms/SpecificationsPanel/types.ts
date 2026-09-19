export type Spec = {
  label: string;
  value: string;
  badge?: string;
};

export type SpecificationGroupIcon = 'heritage' | 'dimensions' | 'care' | 'general' | 'scissors' | 'package';

export type SpecificationGroup = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: SpecificationGroupIcon;
  specs: Spec[];
};

export type SpecificationsPanelViewMode = 'cards' | 'tabs' | 'accordion' | 'flat';

export interface SpecificationsPanelProps {
  specs?: Spec[];
  groupedSpecs?: SpecificationGroup[];
  title?: string;
  subtitle?: string;
  showSilkMarkBadge?: boolean;
  silkMarkText?: string;
  sku?: string;
  defaultViewMode?: SpecificationsPanelViewMode;
  enableViewModeToggle?: boolean;
}

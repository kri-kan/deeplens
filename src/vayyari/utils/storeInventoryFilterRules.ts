export type StoreSortOption = 'newest' | 'price_low' | 'price_high' | 'media_count';
export type PriceRangeOption = 'all' | 'under_5k' | '5k_10k' | '10k_20k' | 'above_20k';
export type StoreLifecycleFilter = 'all' | 'available' | 'few_left' | 'sold_out' | 'out_of_stock';
export type SkuFilterOption = 'all' | 'multi' | 'single';

export const CATEGORIES = ['All', 'Saree', 'Dress Material', 'Kurti / Set', 'Lehenga', 'Gown', 'Western', 'Kids'];
export const FABRIC_OPTIONS = ['All', 'Pure Silk', 'Kanjivaram', 'Banarasi', 'Georgette', 'Chiffon', 'Cotton', 'Linen', 'Organza', 'Tussar'];

export const PRICE_OPTIONS: { id: PriceRangeOption; label: string }[] = [
  { id: 'all', label: 'All Prices' },
  { id: 'under_5k', label: 'Under ₹5,000' },
  { id: '5k_10k', label: '₹5,000 – ₹10,000' },
  { id: '10k_20k', label: '₹10,000 – ₹20,000' },
  { id: 'above_20k', label: 'Above ₹20,000' },
];

export const SORT_OPTIONS: { id: StoreSortOption; label: string }[] = [
  { id: 'newest', label: 'Newest First' },
  { id: 'price_low', label: 'Price: Low to High' },
  { id: 'price_high', label: 'Price: High to Low' },
  { id: 'media_count', label: 'Most Images' },
];

export const LIFECYCLE_FILTERS: { id: StoreLifecycleFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All Status', icon: '⚪' },
  { id: 'available', label: 'In Stock', icon: '🟢' },
  { id: 'few_left', label: 'Few Left', icon: '🟡' },
  { id: 'sold_out', label: 'Sold Out', icon: '🔴' },
  { id: 'out_of_stock', label: 'Out of Stock', icon: '⚫' },
];

export interface StoreInventoryFilterState {
  sortBy: StoreSortOption;
  lifecycle: StoreLifecycleFilter;
  category: string;
  fabric: string;
  priceRange: PriceRangeOption;
  skuType?: SkuFilterOption;
}

export const DEFAULT_STORE_INVENTORY_FILTER_STATE: StoreInventoryFilterState = {
  sortBy: 'newest',
  lifecycle: 'all',
  category: 'All',
  fabric: 'All',
  priceRange: 'all',
  skuType: 'all',
};

export const getActiveStoreInventoryFilterCount = (
  filter: StoreInventoryFilterState
): number => {
  let count = 0;
  if (filter.sortBy && filter.sortBy !== 'newest') count++;
  if (filter.lifecycle && filter.lifecycle !== 'all') count++;
  if (filter.category && filter.category !== 'All') count++;
  if (filter.fabric && filter.fabric !== 'All') count++;
  if (filter.priceRange && filter.priceRange !== 'all') count++;
  if (filter.skuType && filter.skuType !== 'all') count++;
  return count;
};

export type StoreInventorySectionKey =
  | 'Sort'
  | 'Availability'
  | 'Category'
  | 'Fabric'
  | 'Price Range'
  | 'SKU Swatches';

export const getStoreInventorySectionBadge = (
  section: StoreInventorySectionKey | string,
  filter: StoreInventoryFilterState
): number => {
  switch (section) {
    case 'Sort':
      return filter.sortBy !== 'newest' ? 1 : 0;
    case 'Availability':
      return filter.lifecycle !== 'all' ? 1 : 0;
    case 'Category':
      return filter.category !== 'All' ? 1 : 0;
    case 'Fabric':
      return filter.fabric !== 'All' ? 1 : 0;
    case 'Price Range':
      return filter.priceRange !== 'all' ? 1 : 0;
    case 'SKU Swatches':
      return filter.skuType && filter.skuType !== 'all' ? 1 : 0;
    default:
      return 0;
  }
};

import {
  filterPublishUpdatesQueue,
  hasPendingStoreUpdates,
} from './publishDeltaRules';
import { VayyariStarredProductItem } from '../components/tamagui-ui/pages/AdminVayyariStorePublishPage';

export type StoreSortOption = 'newest' | 'price_low' | 'price_high' | 'media_count';
export type PriceRangeOption = 'all' | 'under_5k' | '5k_10k' | '10k_20k' | 'above_20k';
export type SkuFilterOption = 'all' | 'multi' | 'single';
export type DeltaSyncFilterOption = 'all' | 'pending_updates' | 'synced';

export const CATEGORIES = [
  'All',
  'Saree',
  'Dress Material',
  'Kurti / Set',
  'Lehenga',
  'Gown',
  'Western',
  'Kids',
];

export const FABRIC_OPTIONS = [
  'All',
  'Pure Silk',
  'Kanjivaram',
  'Banarasi',
  'Georgette',
  'Chiffon',
  'Cotton',
  'Linen',
  'Organza',
  'Tussar',
];

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

export const SKU_OPTIONS: { id: SkuFilterOption; label: string; desc: string }[] = [
  { id: 'all', label: 'All SKUs', desc: 'Show all starred products' },
  { id: 'multi', label: 'Multi-SKU (2+)', desc: 'Products with 2+ colour swatches' },
  { id: 'single', label: 'Single SKU', desc: 'Standalone single colourway only' },
];

export const SYNC_STATUS_OPTIONS: { id: DeltaSyncFilterOption; label: string; desc: string }[] = [
  { id: 'all', label: 'All Items', desc: 'All starred products in this queue' },
  { id: 'pending_updates', label: 'Pending Sync', desc: 'Products with media delta or updates pending' },
  { id: 'synced', label: 'Up to Date', desc: 'Products fully published with zero deltas' },
];

export interface StorePublishFilterState {
  sortBy: StoreSortOption;
  category: string;
  fabric: string;
  priceRange: PriceRangeOption;
  skuType?: SkuFilterOption;
  syncStatus?: DeltaSyncFilterOption;
}

export const DEFAULT_STORE_PUBLISH_FILTER_STATE: StorePublishFilterState = {
  sortBy: 'newest',
  category: 'All',
  fabric: 'All',
  priceRange: 'all',
  skuType: 'all',
  syncStatus: 'all',
};

export type StorePublishSectionKey =
  | 'Sort'
  | 'Category'
  | 'Fabric'
  | 'Price Range'
  | 'SKU Swatches'
  | 'Sync Status';

export const SECTIONS: readonly StorePublishSectionKey[] = [
  'Sort',
  'Category',
  'Fabric',
  'Price Range',
  'SKU Swatches',
  'Sync Status',
] as const;

export const getActiveStorePublishFilterCount = (
  filter: StorePublishFilterState
): number => {
  let count = 0;
  if (filter.sortBy && filter.sortBy !== 'newest') count++;
  if (filter.category && filter.category !== 'All') count++;
  if (filter.fabric && filter.fabric !== 'All') count++;
  if (filter.priceRange && filter.priceRange !== 'all') count++;
  if (filter.skuType && filter.skuType !== 'all') count++;
  if (filter.syncStatus && filter.syncStatus !== 'all') count++;
  return count;
};

export const getStorePublishSectionBadge = (
  section: StorePublishSectionKey | string,
  filter: StorePublishFilterState
): number => {
  switch (section) {
    case 'Sort':
      return filter.sortBy !== 'newest' ? 1 : 0;
    case 'Category':
      return filter.category !== 'All' ? 1 : 0;
    case 'Fabric':
      return filter.fabric !== 'All' ? 1 : 0;
    case 'Price Range':
      return filter.priceRange !== 'all' ? 1 : 0;
    case 'SKU Swatches':
      return filter.skuType && filter.skuType !== 'all' ? 1 : 0;
    case 'Sync Status':
      return filter.syncStatus && filter.syncStatus !== 'all' ? 1 : 0;
    default:
      return 0;
  }
};

export interface StorePublishFilterChip {
  id: string;
  label: string;
  field: keyof StorePublishFilterState;
}

export const getStorePublishFilterChips = (
  filter: StorePublishFilterState
): StorePublishFilterChip[] => {
  const chips: StorePublishFilterChip[] = [];

  if (filter.sortBy !== 'newest') {
    const s = SORT_OPTIONS.find((opt) => opt.id === filter.sortBy);
    chips.push({
      id: 'sort',
      label: `Sort: ${s?.label || filter.sortBy}`,
      field: 'sortBy',
    });
  }

  if (filter.category && filter.category !== 'All') {
    chips.push({
      id: 'cat',
      label: `Category: ${filter.category}`,
      field: 'category',
    });
  }

  if (filter.fabric && filter.fabric !== 'All') {
    chips.push({
      id: 'fab',
      label: `Fabric: ${filter.fabric}`,
      field: 'fabric',
    });
  }

  if (filter.priceRange && filter.priceRange !== 'all') {
    const p = PRICE_OPTIONS.find((opt) => opt.id === filter.priceRange);
    chips.push({
      id: 'price',
      label: p?.label || filter.priceRange,
      field: 'priceRange',
    });
  }

  if (filter.skuType && filter.skuType !== 'all') {
    const sku = SKU_OPTIONS.find((opt) => opt.id === filter.skuType);
    chips.push({
      id: 'sku',
      label: sku?.label || filter.skuType,
      field: 'skuType',
    });
  }

  if (filter.syncStatus && filter.syncStatus !== 'all') {
    const sync = SYNC_STATUS_OPTIONS.find((opt) => opt.id === filter.syncStatus);
    chips.push({
      id: 'sync',
      label: sync?.label || filter.syncStatus,
      field: 'syncStatus',
    });
  }

  return chips;
};

export const removeStorePublishFilterChip = (
  filter: StorePublishFilterState,
  chipId: string
): StorePublishFilterState => {
  const next = { ...filter };
  switch (chipId) {
    case 'sort':
      next.sortBy = 'newest';
      break;
    case 'cat':
      next.category = 'All';
      break;
    case 'fab':
      next.fabric = 'All';
      break;
    case 'price':
      next.priceRange = 'all';
      break;
    case 'sku':
      next.skuType = 'all';
      break;
    case 'sync':
      next.syncStatus = 'all';
      break;
  }
  return next;
};

export const filterStorePublishProducts = (
  products: VayyariStarredProductItem[],
  filter: StorePublishFilterState,
  searchQuery: string = '',
  activeQueue: 'all' | 'publish_updates' | 'failed' = 'all',
  failedProducts: VayyariStarredProductItem[] = []
): VayyariStarredProductItem[] => {
  const source = activeQueue === 'failed' ? failedProducts : products;

  let list = source.filter((p) => {
    // 1. Category Filter
    const catLower = (p.category || '').toLowerCase();
    const selCatLower = (filter.category || 'All').toLowerCase();
    const matchCat =
      filter.category === 'All' ||
      !catLower ||
      catLower.includes(selCatLower) ||
      selCatLower.includes(catLower);

    // 2. Fabric Filter
    const fabricLower = (p.fabric || '').toLowerCase();
    const selFabricLower = (filter.fabric || 'All').toLowerCase();
    const matchFabric =
      filter.fabric === 'All' ||
      !fabricLower ||
      fabricLower.includes(selFabricLower) ||
      selFabricLower.includes(fabricLower);

    // 3. Price Filter
    let matchPrice = true;
    const price = p.price || 8000;
    if (filter.priceRange === 'under_5k') matchPrice = price < 5000;
    else if (filter.priceRange === '5k_10k') matchPrice = price >= 5000 && price <= 10000;
    else if (filter.priceRange === '10k_20k') matchPrice = price > 10000 && price <= 20000;
    else if (filter.priceRange === 'above_20k') matchPrice = price > 20000;

    // 4. SKU Swatches Filter
    let matchSku = true;
    const swatches = p.swatchesCount ?? (p.siblingSwatches?.length ? p.siblingSwatches.length : 1);
    if (filter.skuType === 'multi') matchSku = swatches >= 2;
    else if (filter.skuType === 'single') matchSku = swatches <= 1;

    // 5. Sync Status Filter
    let matchSync = true;
    if (filter.syncStatus === 'pending_updates') {
      matchSync = hasPendingStoreUpdates(p);
    } else if (filter.syncStatus === 'synced') {
      matchSync = !hasPendingStoreUpdates(p);
    }

    // 6. Search Query
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.productCode.toLowerCase().includes(q) ||
      (p.fabric || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q);

    return matchCat && matchFabric && matchPrice && matchSku && matchSync && matchQuery;
  });

  // Apply Queue logic
  if (activeQueue === 'publish_updates') {
    list = filterPublishUpdatesQueue(list);
  } else if (activeQueue === 'all') {
    list = list.filter((p) => !p.isPublishedToStore && !p.isPublished);
  }

  // Sort
  if (filter.sortBy === 'price_low') {
    list = [...list].sort((a, b) => (a.price || 8000) - (b.price || 8000));
  } else if (filter.sortBy === 'price_high') {
    list = [...list].sort((a, b) => (b.price || 8000) - (a.price || 8000));
  } else if (filter.sortBy === 'media_count') {
    list = [...list].sort((a, b) => (b.mediaCount || 0) - (a.mediaCount || 0));
  }

  return list;
};

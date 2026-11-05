import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_STORE_PUBLISH_FILTER_STATE,
  getActiveStorePublishFilterCount,
  getStorePublishSectionBadge,
  getStorePublishFilterChips,
  removeStorePublishFilterChip,
  filterStorePublishProducts,
  StorePublishFilterState,
} from '../utils/storePublishFilterRules';
import { VayyariStarredProductItem } from '../components/tamagui-ui/pages/AdminVayyariStorePublishPage';

const mockProducts: VayyariStarredProductItem[] = [
  {
    id: 'prod-1',
    productCode: 'VAY-001',
    title: 'Kanjivaram Silk Saree Crimson Red',
    category: 'Saree',
    fabric: 'Pure Silk',
    price: 12500,
    mediaCount: 5,
    syncedMediaCount: 3,
    primaryImageUri: 'https://example.com/1.jpg',
    descriptions: ['Pure Silk Saree'],
    isStarred: true,
    isPublishedToStore: true,
    isPublished: true,
    swatchesCount: 3,
  },
  {
    id: 'prod-2',
    productCode: 'VAY-002',
    title: 'Chanderi Cotton Kurti Set',
    category: 'Kurti / Set',
    fabric: 'Cotton',
    price: 3500,
    mediaCount: 2,
    syncedMediaCount: 2,
    primaryImageUri: 'https://example.com/2.jpg',
    descriptions: ['Cotton Kurti'],
    isStarred: true,
    isPublishedToStore: false,
    swatchesCount: 1,
  },
  {
    id: 'prod-3',
    productCode: 'VAY-003',
    title: 'Banarasi Brocade Lehenga',
    category: 'Lehenga',
    fabric: 'Banarasi',
    price: 24000,
    mediaCount: 8,
    syncedMediaCount: 8,
    primaryImageUri: 'https://example.com/3.jpg',
    descriptions: ['Bridal Lehenga'],
    isStarred: true,
    isPublishedToStore: false,
    swatchesCount: 2,
  },
  {
    id: 'prod-4',
    productCode: 'VAY-004',
    title: 'Organza Floral Print Saree',
    category: 'Saree',
    fabric: 'Organza',
    price: 7200,
    mediaCount: 4,
    syncedMediaCount: 4,
    primaryImageUri: 'https://example.com/4.jpg',
    descriptions: ['Organza Saree'],
    isStarred: true,
    isPublishedToStore: true,
    isPublished: true,
    mediaUpdatedAt: '2026-11-05T10:00:00Z',
    storePublishUpdatedAt: '2026-11-01T10:00:00Z',
    swatchesCount: 1,
  },
];

describe('Store Publish Filter Rules', () => {
  it('default filter state has 0 active filters', () => {
    const count = getActiveStorePublishFilterCount(DEFAULT_STORE_PUBLISH_FILTER_STATE);
    assert.strictEqual(count, 0);
    assert.strictEqual(DEFAULT_STORE_PUBLISH_FILTER_STATE.sortBy, 'newest');
    assert.strictEqual(DEFAULT_STORE_PUBLISH_FILTER_STATE.category, 'All');
    assert.strictEqual(DEFAULT_STORE_PUBLISH_FILTER_STATE.fabric, 'All');
    assert.strictEqual(DEFAULT_STORE_PUBLISH_FILTER_STATE.priceRange, 'all');
    assert.strictEqual(DEFAULT_STORE_PUBLISH_FILTER_STATE.skuType, 'all');
    assert.strictEqual(DEFAULT_STORE_PUBLISH_FILTER_STATE.syncStatus, 'all');
  });

  it('accurately counts active filters across facets', () => {
    const filter1: StorePublishFilterState = {
      ...DEFAULT_STORE_PUBLISH_FILTER_STATE,
      category: 'Saree',
      fabric: 'Pure Silk',
    };
    assert.strictEqual(getActiveStorePublishFilterCount(filter1), 2);

    const filter2: StorePublishFilterState = {
      ...DEFAULT_STORE_PUBLISH_FILTER_STATE,
      sortBy: 'price_low',
      priceRange: '5k_10k',
      skuType: 'multi',
      syncStatus: 'pending_updates',
    };
    assert.strictEqual(getActiveStorePublishFilterCount(filter2), 4);
  });

  it('accurately calculates section badges for the left nav rail', () => {
    const filter: StorePublishFilterState = {
      sortBy: 'price_high',
      category: 'Saree',
      fabric: 'All', // inactive
      priceRange: 'all', // inactive
      skuType: 'multi',
      syncStatus: 'pending_updates',
    };

    assert.strictEqual(getStorePublishSectionBadge('Sort', filter), 1);
    assert.strictEqual(getStorePublishSectionBadge('Category', filter), 1);
    assert.strictEqual(getStorePublishSectionBadge('Fabric', filter), 0);
    assert.strictEqual(getStorePublishSectionBadge('Price Range', filter), 0);
    assert.strictEqual(getStorePublishSectionBadge('SKU Swatches', filter), 1);
    assert.strictEqual(getStorePublishSectionBadge('Sync Status', filter), 1);
    assert.strictEqual(getStorePublishSectionBadge('Unknown', filter), 0);
  });

  it('generates active filter chips with proper labels and keys', () => {
    const filter: StorePublishFilterState = {
      sortBy: 'price_low',
      category: 'Saree',
      fabric: 'Pure Silk',
      priceRange: '10k_20k',
      skuType: 'multi',
      syncStatus: 'pending_updates',
    };

    const chips = getStorePublishFilterChips(filter);
    assert.strictEqual(chips.length, 6);
    assert.deepStrictEqual(chips.map((c) => c.id), ['sort', 'cat', 'fab', 'price', 'sku', 'sync']);
    assert.ok(chips.some((c) => c.label.includes('Saree')));
    assert.ok(chips.some((c) => c.label.includes('Pure Silk')));
    assert.ok(chips.some((c) => c.label.includes('10,000')));
  });

  it('removes active filter chip without altering other facets', () => {
    let state: StorePublishFilterState = {
      sortBy: 'price_low',
      category: 'Saree',
      fabric: 'Pure Silk',
      priceRange: '10k_20k',
      skuType: 'multi',
      syncStatus: 'all',
    };

    state = removeStorePublishFilterChip(state, 'fab');
    assert.strictEqual(state.fabric, 'All');
    assert.strictEqual(state.category, 'Saree');
    assert.strictEqual(state.priceRange, '10k_20k');
    assert.strictEqual(state.sortBy, 'price_low');
    assert.strictEqual(state.skuType, 'multi');

    state = removeStorePublishFilterChip(state, 'price');
    assert.strictEqual(state.priceRange, 'all');
    assert.strictEqual(state.category, 'Saree');
  });

  it('filters products by category, fabric, price range, and SKU type', () => {
    // In activeQueue === 'all', only unpublished products are included (prod-2 and prod-3)
    // For general facet filtering, test on raw products
    const sarees = filterStorePublishProducts(mockProducts, {
      ...DEFAULT_STORE_PUBLISH_FILTER_STATE,
      category: 'Lehenga',
    }, '', 'all');
    assert.strictEqual(sarees.length, 1);
    assert.strictEqual(sarees[0].productCode, 'VAY-003');

    // Filter by price under 5k in all queue
    const cheap = filterStorePublishProducts(mockProducts, {
      ...DEFAULT_STORE_PUBLISH_FILTER_STATE,
      priceRange: 'under_5k',
    }, '', 'all');
    assert.strictEqual(cheap.length, 1);
    assert.strictEqual(cheap[0].productCode, 'VAY-002');

    // Filter by Multi-SKU (swatchesCount > 1) in all queue
    const multi = filterStorePublishProducts(mockProducts, {
      ...DEFAULT_STORE_PUBLISH_FILTER_STATE,
      skuType: 'multi',
    }, '', 'all');
    assert.strictEqual(multi.length, 1);
    assert.strictEqual(multi[0].productCode, 'VAY-003');

    // Sort price_high
    const sortedDesc = filterStorePublishProducts(mockProducts, {
      ...DEFAULT_STORE_PUBLISH_FILTER_STATE,
      sortBy: 'price_high',
    }, '', 'all');
    assert.strictEqual(sortedDesc[0].productCode, 'VAY-003');
    assert.strictEqual(sortedDesc[sortedDesc.length - 1].productCode, 'VAY-002');
  });

  it('filters publish_updates queue properly', () => {
    const updates = filterStorePublishProducts(mockProducts, {
      ...DEFAULT_STORE_PUBLISH_FILTER_STATE,
    }, '', 'publish_updates');

    // prod-1 is published with syncedMediaCount (3) < mediaCount (5)
    // prod-4 is published with mediaUpdatedAt > storePublishUpdatedAt
    assert.strictEqual(updates.length, 2);
    assert.ok(updates.some((p) => p.productCode === 'VAY-001'));
    assert.ok(updates.some((p) => p.productCode === 'VAY-004'));
  });
});

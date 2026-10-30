import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_STORE_INVENTORY_FILTER_STATE,
  getActiveStoreInventoryFilterCount,
  getStoreInventorySectionBadge,
  StoreInventoryFilterState,
} from '../utils/storeInventoryFilterRules';

describe('Store Inventory Dynamic Filter Drawer Rules', () => {
  it('default filter state has 0 active filters', () => {
    const count = getActiveStoreInventoryFilterCount(DEFAULT_STORE_INVENTORY_FILTER_STATE);
    assert.strictEqual(count, 0);
    assert.strictEqual(DEFAULT_STORE_INVENTORY_FILTER_STATE.sortBy, 'newest');
    assert.strictEqual(DEFAULT_STORE_INVENTORY_FILTER_STATE.category, 'All');
    assert.strictEqual(DEFAULT_STORE_INVENTORY_FILTER_STATE.fabric, 'All');
    assert.strictEqual(DEFAULT_STORE_INVENTORY_FILTER_STATE.priceRange, 'all');
    assert.strictEqual(DEFAULT_STORE_INVENTORY_FILTER_STATE.lifecycle, 'all');
    assert.strictEqual(DEFAULT_STORE_INVENTORY_FILTER_STATE.skuType, 'all');
  });

  it('accurately counts active filters across facets', () => {
    const filter1: StoreInventoryFilterState = {
      ...DEFAULT_STORE_INVENTORY_FILTER_STATE,
      category: 'Saree',
      fabric: 'Pure Silk',
    };
    assert.strictEqual(getActiveStoreInventoryFilterCount(filter1), 2);

    const filter2: StoreInventoryFilterState = {
      ...DEFAULT_STORE_INVENTORY_FILTER_STATE,
      sortBy: 'price_low',
      lifecycle: 'available',
      priceRange: '5k_10k',
      skuType: 'multi',
    };
    assert.strictEqual(getActiveStoreInventoryFilterCount(filter2), 4);
  });

  it('accurately calculates section badges for the left nav rail', () => {
    const filter: StoreInventoryFilterState = {
      sortBy: 'price_high',
      lifecycle: 'few_left',
      category: 'Saree',
      fabric: 'All', // inactive
      priceRange: 'all', // inactive
      skuType: 'multi',
    };

    assert.strictEqual(getStoreInventorySectionBadge('Sort', filter), 1);
    assert.strictEqual(getStoreInventorySectionBadge('Availability', filter), 1);
    assert.strictEqual(getStoreInventorySectionBadge('Category', filter), 1);
    assert.strictEqual(getStoreInventorySectionBadge('Fabric', filter), 0);
    assert.strictEqual(getStoreInventorySectionBadge('Price Range', filter), 0);
    assert.strictEqual(getStoreInventorySectionBadge('SKU Swatches', filter), 1);
    assert.strictEqual(getStoreInventorySectionBadge('Unknown', filter), 0);
  });

  it('isolates draft state changes in drawer until applied', () => {
    const appliedState: StoreInventoryFilterState = {
      ...DEFAULT_STORE_INVENTORY_FILTER_STATE,
      category: 'Saree',
    };

    // Simulate user opening drawer and modifying draft
    let draftState: StoreInventoryFilterState = { ...appliedState };
    draftState = { ...draftState, fabric: 'Pure Silk', priceRange: '10k_20k' };

    // Before apply, applied state remains untouched
    assert.strictEqual(appliedState.fabric, 'All');
    assert.strictEqual(appliedState.priceRange, 'all');
    assert.strictEqual(getActiveStoreInventoryFilterCount(appliedState), 1);
    assert.strictEqual(getActiveStoreInventoryFilterCount(draftState), 3);

    // Apply commits draft
    const newAppliedState = { ...draftState };
    assert.strictEqual(newAppliedState.fabric, 'Pure Silk');
    assert.strictEqual(newAppliedState.priceRange, '10k_20k');
    assert.strictEqual(getActiveStoreInventoryFilterCount(newAppliedState), 3);
  });

  it('supports individual active filter chip removal without clearing other facets', () => {
    let activeFilters: StoreInventoryFilterState = {
      sortBy: 'price_low',
      lifecycle: 'available',
      category: 'Saree',
      fabric: 'Pure Silk',
      priceRange: '5k_10k',
      skuType: 'multi',
    };
    assert.strictEqual(getActiveStoreInventoryFilterCount(activeFilters), 6);

    // User removes fabric chip
    activeFilters = { ...activeFilters, fabric: 'All' };
    assert.strictEqual(activeFilters.fabric, 'All');
    assert.strictEqual(activeFilters.category, 'Saree');
    assert.strictEqual(activeFilters.priceRange, '5k_10k');
    assert.strictEqual(getActiveStoreInventoryFilterCount(activeFilters), 5);

    // User removes price range chip
    activeFilters = { ...activeFilters, priceRange: 'all' };
    assert.strictEqual(activeFilters.priceRange, 'all');
    assert.strictEqual(activeFilters.skuType, 'multi');
    assert.strictEqual(getActiveStoreInventoryFilterCount(activeFilters), 4);
  });

  it('correctly filters product inventory by category, fabric, price range, and SKU type', () => {
    const products = [
      {
        id: '1',
        title: 'Banarasi Zari Saree',
        category: 'Saree',
        fabric: 'Pure Silk',
        price: 9500,
        mediaCount: 8,
        swatchesCount: 3,
        productCode: 'VF-01',
      },
      {
        id: '2',
        title: 'Cotton Printed Kurti',
        category: 'Kurti / Set',
        fabric: 'Cotton',
        price: 2500,
        mediaCount: 3,
        swatchesCount: 1,
        productCode: 'VF-02',
      },
      {
        id: '3',
        title: 'Bridal Velvet Lehenga',
        category: 'Lehenga',
        fabric: 'Velvet',
        price: 24000,
        mediaCount: 12,
        swatchesCount: 1,
        productCode: 'VF-03',
      },
    ];

    // Filter by category
    const sareeOnly = products.filter((p) => p.category.toLowerCase().includes('saree'));
    assert.strictEqual(sareeOnly.length, 1);
    assert.strictEqual(sareeOnly[0].productCode, 'VF-01');

    // Filter by price range (5k_10k)
    const midPrice = products.filter((p) => p.price >= 5000 && p.price <= 10000);
    assert.strictEqual(midPrice.length, 1);
    assert.strictEqual(midPrice[0].productCode, 'VF-01');

    // Filter by Multi-SKU (swatchesCount > 1)
    const multiSku = products.filter((p) => p.swatchesCount > 1);
    assert.strictEqual(multiSku.length, 1);
    assert.strictEqual(multiSku[0].productCode, 'VF-01');

    // Filter by Single-SKU (swatchesCount <= 1)
    const singleSku = products.filter((p) => p.swatchesCount <= 1);
    assert.strictEqual(singleSku.length, 2);

    // Sorting by mediaCount
    const sortedByMedia = [...products].sort((a, b) => b.mediaCount - a.mediaCount);
    assert.strictEqual(sortedByMedia[0].productCode, 'VF-03'); // 12 media
    assert.strictEqual(sortedByMedia[1].productCode, 'VF-01'); // 8 media
    assert.strictEqual(sortedByMedia[2].productCode, 'VF-02'); // 3 media
  });

  it('correctly filters conjunctively with keyword search query and dynamic panel facets', () => {
    const products = [
      {
        id: '1',
        title: 'Banarasi Zari Saree',
        category: 'Saree',
        fabric: 'Pure Silk',
        price: 9500,
        productCode: 'VF-BAN-01',
      },
      {
        id: '2',
        title: 'Kanjivaram Temple Border Saree',
        category: 'Saree',
        fabric: 'Pure Silk',
        price: 18000,
        productCode: 'VF-KAN-02',
      },
    ];

    const query = 'kan';
    const activeCategory: string = 'Saree';
    const activePriceRange = '10k_20k';

    const matched = products.filter((p) => {
      const matchCat = activeCategory === 'All' || p.category.toLowerCase().includes(activeCategory.toLowerCase());
      const matchPrice = activePriceRange === '10k_20k' && p.price > 10000 && p.price <= 20000;
      const q = query.toLowerCase();
      const matchQuery =
        p.title.toLowerCase().includes(q) ||
        p.productCode.toLowerCase().includes(q) ||
        p.fabric.toLowerCase().includes(q);

      return matchCat && matchPrice && matchQuery;
    });

    assert.strictEqual(matched.length, 1);
    assert.strictEqual(matched[0].productCode, 'VF-KAN-02');
  });
});

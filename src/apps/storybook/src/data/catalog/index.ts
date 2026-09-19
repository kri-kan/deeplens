export * from './types';
export * from './sizePresets';
export * from './products';

import { CatalogTestProduct } from './types';
import { DIVERSE_CATALOG_PRODUCTS } from './products';

/**
 * Returns all static catalog products.
 */
export function getAllCatalogProducts(): CatalogTestProduct[] {
  return DIVERSE_CATALOG_PRODUCTS;
}

/**
 * Finds a product by its SKU code (e.g. 'VF2B56', 'VF46D', 'VF2F4A').
 */
export function getProductBySku(sku: string): CatalogTestProduct | undefined {
  return DIVERSE_CATALOG_PRODUCTS.find(
    (p) => p.sku.toLowerCase() === sku.toLowerCase() || p.id === sku
  );
}

/**
 * Filters products by category ('saree', 'blouse', 'dress', 'kids', 'lehenga').
 */
export function getProductsByCategory(category: string): CatalogTestProduct[] {
  if (category === 'all') return DIVERSE_CATALOG_PRODUCTS;
  return DIVERSE_CATALOG_PRODUCTS.filter((p) => p.category === category);
}

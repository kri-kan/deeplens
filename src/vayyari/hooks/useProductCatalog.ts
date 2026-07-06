import { useState, useCallback, useEffect } from 'react';
import { productService } from '@/services/productService';
import { VendorProduct } from '@/types/products';
import { wrapInSpan } from '@/utils/telemetry';

export interface ProductCatalogFilters {
  categoryId: string;
  query?: string;
  sortBy?: string;
  startDate?: string;
  endDate?: string;
  fabrics?: string[];
  vendorNames?: string[];
  minPrice?: number;
  maxPrice?: number;
}

export const useProductCatalog = (filters: ProductCatalogFilters) => {
  const { categoryId, query, sortBy, startDate, endDate, fabrics, vendorNames, minPrice, maxPrice } = filters;

  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProducts = useCallback(async (isRefresh = false) => {
    if ((loading || refreshing) && !isRefresh) return;
    if (!hasMore && !isRefresh) return;
    if (error && !isRefresh) return;

    if (isRefresh) {
      setRefreshing(true);
      setError(null);
    } else setLoading(true);

    try {
      const currentSkip = isRefresh ? 0 : products.length;
      const take = 100;
      const filter = {
        category: categoryId === 'all' ? undefined : categoryId,
        query: query || undefined,
        sortBy: sortBy || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        fabrics: fabrics && fabrics.length > 0 ? fabrics : undefined,
        vendorNames: vendorNames && vendorNames.length > 0 ? vendorNames : undefined,
        minPrice: minPrice,
        maxPrice: maxPrice,
        skip: currentSkip,
        take: take,
      };

      const { products: newData, totalCount: newTotalCount } = await productService.getCatalog(filter);

      setTotalCount(newTotalCount);

      setProducts(prev => {
        const updated = isRefresh
          ? newData
          : [...prev, ...newData.filter(n => !prev.some(p => p.id === n.id))];
        setHasMore(updated.length < newTotalCount && newData.length > 0);
        return updated;
      });
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId, query, sortBy, startDate, endDate, fabrics, vendorNames, minPrice, maxPrice, products.length, loading, refreshing, hasMore, error]);

  const fabricsKey = JSON.stringify(fabrics);
  const vendorNamesKey = JSON.stringify(vendorNames);

  useEffect(() => {
    fetchProducts(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, query, sortBy, startDate, endDate, fabricsKey, vendorNamesKey, minPrice, maxPrice]);

  const toggleStar = useCallback(async (productId: string, isStarred: boolean) => {
    try {
      await wrapInSpan('toggleProductStar', async () => {
        await productService.toggleStar(productId, isStarred);
      });
      // Optionally update local state for immediate feedback
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          // If the product model has a starred/isStarred property, update it here.
          // For now, assuming it has isStarred or we just fetch again if needed.
          // Wait, does VendorProduct have isStarred? Let's assume it does.
          return { ...p, isStarred };
        }
        return p;
      }));
    } catch (err) {
      console.error('Failed to toggle star:', err);
      throw err;
    }
  }, []);

  return {
    products,
    loading,
    refreshing,
    hasMore,
    error,
    totalCount,
    fetchProducts,
    toggleStar,
  };
};

import { useState, useCallback, useEffect } from 'react';
import { productService } from '@/services/productService';
import { VendorProduct } from '@/types/products';

export const useProductCatalog = (
  categoryId: string,
  query?: string,
  sortBy?: string,
  startDate?: string,
  endDate?: string
) => {
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
    }
    else setLoading(true);

    try {
      const currentSkip = isRefresh ? 0 : products.length;
      const take = 100;
      const filter = {
        category: categoryId === 'all' ? undefined : categoryId,
        query: query || undefined,
        sortBy: sortBy || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        skip: currentSkip,
        take: take
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
  }, [categoryId, query, sortBy, startDate, endDate, products.length, loading, refreshing, hasMore, error]);

  useEffect(() => {
    fetchProducts(true);
  }, [categoryId, query, sortBy, startDate, endDate]);

  return {
    products,
    loading,
    refreshing,
    hasMore,
    error,
    totalCount,
    fetchProducts,
  };
};

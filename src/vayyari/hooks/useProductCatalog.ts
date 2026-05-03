import { useState, useCallback, useEffect } from 'react';
import { productService } from '@/services/productService';
import { VendorProduct } from '@/types/products';

export const useProductCatalog = (categoryId: string) => {
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (loading && !isRefresh) return;
    if (!hasMore && !isRefresh) return;
    if (error && !isRefresh) return;
    
    if (isRefresh) {
      setRefreshing(true);
      setError(null);
    }
    else setLoading(true);

    try {
      const currentSkip = isRefresh ? 0 : products.length;
      const take = 30;
      const filter = {
        category: categoryId === 'all' ? undefined : categoryId,
        skip: currentSkip,
        take: take
      };
      
      const { products: newData, totalCount } = await productService.getCatalog(filter);
      
      setProducts(prev => {
        const updated = isRefresh ? newData : [...prev, ...newData];
        setHasMore(updated.length < totalCount && newData.length > 0);
        return updated;
      });
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId, products.length, loading, hasMore, error]);

  useEffect(() => {
    fetchProducts(true);
  }, [categoryId]);

  return {
    products,
    loading,
    refreshing,
    hasMore,
    error,
    fetchProducts,
  };
};

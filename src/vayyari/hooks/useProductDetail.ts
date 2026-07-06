import { useState, useCallback, useEffect } from 'react';
import { productService } from '@/services/productService';
import { VendorProduct } from '@/types/products';
import { wrapInSpan } from '@/utils/telemetry';

export const useProductDetail = (productId: string | undefined) => {
  const [data, setData] = useState<VendorProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!productId) return;
    setIsLoading(true);
    setError(null);
    try {
      await wrapInSpan('fetchProductDetail', async () => {
        const product = await productService.getProductById(productId);
        setData(product);
      });
    } catch (err: any) {
      console.error('Failed to fetch product:', err);
      setError(err.message || 'Failed to load product');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const setDefaultMedia = useCallback(async (mediaId: string) => {
    if (!productId) return;
    try {
      await wrapInSpan('setDefaultMedia', async () => {
        await productService.setDefaultMedia(productId, mediaId);
      });
      await fetchProduct();
    } catch (err) {
      console.error('Failed to set default media:', err);
      throw err;
    }
  }, [productId, fetchProduct]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchProduct,
    setDefaultMedia,
  };
};

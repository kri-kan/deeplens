import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AdminVayyariStoreInventoryPage,
  StoreInventoryProductItem,
} from '@/components/tamagui-ui/pages/AdminVayyariStoreInventoryPage';
import { storeAdminService, StoreProduct } from '@/services/storeAdminService';

export default function StoreInventoryScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<StoreInventoryProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await storeAdminService.getInStoreProducts();
      // Group by catalog product (parentCatalogId or parentProductCode) so each catalog product
      // displays a clean tile with the swatches count (how many separate SKUs made from that catalog product)
      const catalogProductMap = new Map<string, StoreInventoryProductItem>();

      for (const p of data) {
        const groupKey = p.parentCatalogId || p.parentProductCode || p.id;
        const swatchesCount = Math.max(
          p.swatchesCount || 1,
          p.siblingSwatches?.length || 0,
          p.skus?.length || 0,
          p.colorGroups?.length || 0
        );
        const productCode = p.parentProductCode || p.productCode;

        if (!catalogProductMap.has(groupKey)) {
          catalogProductMap.set(groupKey, {
            id: p.id,
            productCode,
            parentProductCode: p.parentProductCode || undefined,
            title: p.title,
            category: p.categoryName || 'Saree',
            fabric: p.fabric || 'Pure Silk',
            price: p.salePrice || p.mrp || 8000,
            color: p.colorwayName || 'Standard',
            mediaCount: p.mediaOrder?.length || 1,
            primaryImageUri: p.mediaOrder?.[0]?.url || 'https://picsum.photos/seed/saree/600/800',
            descriptions: [p.description || ''],
            isStarred: true,
            isPublishedToStore: true,
            publishedAt: p.publishedAt,
            swatchesCount,
            siblingSwatches: p.siblingSwatches || [],
            isReviewPending: p.isReviewPending ?? false,
            reviewReason: p.reviewReason,
          });
        } else {
          const existing = catalogProductMap.get(groupKey)!;
          if (p.siblingSwatches && p.siblingSwatches.length > (existing.siblingSwatches?.length || 0)) {
            existing.siblingSwatches = p.siblingSwatches;
          }
          existing.swatchesCount = Math.max(existing.swatchesCount || 1, swatchesCount);
          if (p.isReviewPending) {
            existing.isReviewPending = true;
            existing.reviewReason = p.reviewReason || existing.reviewReason;
          }
        }
      }

      setProducts(Array.from(catalogProductMap.values()));
    } catch (err) {
      console.warn('Failed to load in-store products from Store.Api:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const reviewCount = useMemo(() => {
    return products.filter((p) => p.isReviewPending).length;
  }, [products]);

  const handleDismissReview = async (productId: string) => {
    const previousProducts = products;
    // Optimistically update local state: set isReviewPending = false
    setProducts((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, isReviewPending: false } : item))
    );

    try {
      await storeAdminService.dismissReview(productId);
    } catch (err) {
      console.error('Failed to dismiss review for product:', productId, err);
      // Rollback on failure
      setProducts(previousProducts);
      Alert.alert('Error', 'Failed to dismiss review. Please try again.');
    }
  };

  return (
    <AdminVayyariStoreInventoryPage
      products={products}
      reviewCount={reviewCount}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchProducts(true)}
      onBack={() => router.back()}
      onNavigateToStorePublish={() => router.push('/store/publish' as any)}
      onNavigateToStoreCuration={(id: string) => router.push(`/store/curate/${id}` as any)}
      onOpenPdp={(id: string) => router.push(`/product/${id}` as any)}
      onResyncProduct={async (id: string) => {
        console.log('Resyncing product:', id);
      }}
      onDismissReview={handleDismissReview}
    />
  );
}

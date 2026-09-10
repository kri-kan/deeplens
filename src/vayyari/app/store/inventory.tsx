import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { AdminVayyariStoreInventoryPage } from '@/components/tamagui-ui/pages/AdminVayyariStoreInventoryPage';
import { storeAdminService, StoreProduct } from '@/services/storeAdminService';
import { VayyariStarredProductItem } from '@/components/tamagui-ui/pages/AdminVayyariStorePublishPage';

export default function StoreInventoryScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<VayyariStarredProductItem[]>([]);
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
      const mapped: VayyariStarredProductItem[] = data.map((p) => ({
        id: p.id,
        productCode: p.productCode,
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
      }));
      setProducts(mapped);
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

  return (
    <AdminVayyariStoreInventoryPage
      products={products}
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
    />
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import {
  AdminVayyariStorePublishPage,
  VayyariStarredProductItem,
} from '@/components/tamagui-ui/pages/AdminVayyariStorePublishPage';
import { productService } from '@/services/productService';
import { storeAdminService, PublishProductItem } from '@/services/storeAdminService';

const PAGE_SIZE = 60;

export default function StorePublishScreen() {
  const router = useRouter();
  const [starredProducts, setStarredProducts] = useState<VayyariStarredProductItem[]>([]);
  const [publishedCount, setPublishedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [publishedVayyariIds, setPublishedVayyariIds] = useState<Set<string>>(new Set());

  const fetchInStoreMetadata = async () => {
    try {
      const inStore = await storeAdminService.getInStoreProducts();
      setPublishedCount(inStore.length);
      const ids = new Set<string>();
      inStore.forEach((p) => {
        if (p.vayyariProductId) ids.add(p.vayyariProductId);
      });
      setPublishedVayyariIds(ids);
      return ids;
    } catch (err) {
      console.warn('Failed to fetch in-store products from Store.Api:', err);
      return new Set<string>();
    }
  };

  const mapProducts = (rawProducts: any[], publishedIds: Set<string>): VayyariStarredProductItem[] => {
    const getProp = (obj: any, camel: string, pascal: string) =>
      obj[camel] !== undefined ? obj[camel] : obj[pascal];

    const unpublished = rawProducts.filter(
      (item: any) => !publishedIds.has(item.masterProductId || item.id)
    );

    return unpublished.map((item: any) => {
      const mediaList = item.media || [];
      let imageUri = 'https://picsum.photos/seed/saree/600/800';

      if (mediaList.length > 0) {
        let media = mediaList.find(
          (m: any) => getProp(m, 'isDefault', 'IsDefault') && getProp(m, 'mediaType', 'MediaType') === 1
        );
        if (!media) media = mediaList.find((m: any) => getProp(m, 'mediaType', 'MediaType') === 1);
        if (!media) media = mediaList.find((m: any) => getProp(m, 'isDefault', 'IsDefault'));
        if (!media) media = mediaList[0];

        if (media) {
          const mId = getProp(media, 'id', 'Id');
          const mPath = getProp(media, 'storagePath', 'StoragePath');

          if (mId && mId !== '00000000-0000-0000-0000-000000000000') {
            imageUri = productService.getThumbnailUrl(mId, 'large');
          } else if (mPath) {
            imageUri = productService.getThumbnailUrlByPath(mPath, 'large');
          }
        }
      }

      const allUris = mediaList.map((m: any) => {
        const mId = getProp(m, 'id', 'Id');
        const mPath = getProp(m, 'storagePath', 'StoragePath');
        if (mId && mId !== '00000000-0000-0000-0000-000000000000') {
          return productService.getThumbnailUrl(mId, 'large');
        } else if (mPath) {
          return productService.getThumbnailUrlByPath(mPath, 'large');
        }
        return imageUri;
      });

      return {
        id: item.masterProductId || item.id,
        productCode: item.productCode || 'PROD',
        title: item.title || 'Handloom Saree',
        category: item.category || 'Saree',
        fabric: item.fabric || 'Pure Silk',
        price: getProp(item, 'vendorPrice', 'VendorPrice') || 8000,
        color: item.color || (mediaList[0]?.color) || 'Standard',
        mediaCount: mediaList.length || 1,
        primaryImageUri: imageUri,
        allMediaUris: allUris,
        descriptions: item.exclusiveDescription ? [item.exclusiveDescription] : item.description ? [item.description] : [],
        isStarred: true,
        isPublishedToStore: false,
      };
    });
  };

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const inStoreIds = await fetchInStoreMetadata();

      const catalogData = await productService.getCatalog({
        isStarred: true,
        skip: 0,
        take: PAGE_SIZE,
      });

      if (catalogData && catalogData.products) {
        const mapped = mapProducts(catalogData.products, inStoreIds);
        setStarredProducts(mapped);
        setHasMore(catalogData.products.length >= PAGE_SIZE);
      }
    } catch (err) {
      console.warn('Failed to load initial catalog products:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || loading) return;

    try {
      setIsLoadingMore(true);
      const currentSkip = starredProducts.length;

      const catalogData = await productService.getCatalog({
        isStarred: true,
        skip: currentSkip,
        take: PAGE_SIZE,
      });

      if (catalogData && catalogData.products && catalogData.products.length > 0) {
        const mapped = mapProducts(catalogData.products, publishedVayyariIds);
        setStarredProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newItems = mapped.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newItems];
        });
        setHasMore(catalogData.products.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.warn('Failed to load more products:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePublishBatch = async (selectedIds: string[]) => {
    const selectedItems = starredProducts.filter((p) => selectedIds.includes(p.id));
    const payload: PublishProductItem[] = selectedItems.map((p) => ({
      vayyariProductId: p.id,
      productCode: p.productCode,
      title: p.title,
      categoryName: p.category,
      fabric: p.fabric,
      baseCost: p.price || 8000,
      mediaUrls: p.allMediaUris && p.allMediaUris.length > 0 ? p.allMediaUris : [p.primaryImageUri],
    }));

    try {
      const res = await storeAdminService.batchPublish(payload);
      Alert.alert('Published', `Successfully published ${res.count} products to Store!`);
      loadData(true);
    } catch (err) {
      console.error('Failed to batch publish:', err);
      Alert.alert('Error', 'Failed to publish to Store.');
    }
  };

  return (
    <AdminVayyariStorePublishPage
      products={starredProducts}
      publishedCount={publishedCount}
      loading={loading}
      refreshing={refreshing}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      onRefresh={() => loadData(true)}
      onLoadMore={handleLoadMore}
      onBack={() => router.back()}
      onPublishBatch={handlePublishBatch}
      onNavigateToStoreInventory={() => router.push('/store/inventory' as any)}
      onOpenPdp={(id) => router.push(`/product/${id}` as any)}
    />
  );
}

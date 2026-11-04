import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import {
  AdminVayyariStorePublishPage,
  VayyariStarredProductItem,
} from '@/components/tamagui-ui/pages/AdminVayyariStorePublishPage';
import { productService } from '@/services/productService';
import { storeAdminService, PublishProductItem, PublishMediaItem, StoreProduct } from '@/services/storeAdminService';

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

  const [inStoreProductsMap, setInStoreProductsMap] = useState<Map<string, StoreProduct>>(new Map());

  const fetchInStoreMetadata = async (): Promise<Map<string, StoreProduct>> => {
    try {
      const inStore = await storeAdminService.getInStoreProducts();
      setPublishedCount(inStore.length);
      const map = new Map<string, StoreProduct>();
      const ids = new Set<string>();
      inStore.forEach((p) => {
        const key = (p.vayyariProductId || p.id || '').toLowerCase();
        if (key) {
          map.set(key, p);
          ids.add(key);
        }
      });
      setPublishedVayyariIds(ids);
      setInStoreProductsMap(map);
      return map;
    } catch (err) {
      console.warn('Failed to fetch in-store products from Store.Api:', err);
      return new Map<string, StoreProduct>();
    }
  };

  const mapProducts = (rawProducts: any[], inStoreMap: Map<string, StoreProduct>): VayyariStarredProductItem[] => {
    const getProp = (obj: any, camel: string, pascal: string) =>
      obj[camel] !== undefined ? obj[camel] : obj[pascal];

    return rawProducts.map((item: any) => {
      const id = item.masterProductId || item.id;
      const key = (id || '').toLowerCase();
      const inStoreProduct = inStoreMap.get(key);
      const isPublished = Boolean(inStoreProduct || item.isPublished || item.is_published);

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

      const mediaCount = item.mediaCount ?? mediaList.length;
      const inStoreMediaCount = inStoreProduct?.mediaOrder?.length;
      const syncedMediaCount = inStoreMediaCount !== undefined ? inStoreMediaCount : (item.syncedMediaCount ?? 0);
      const mediaUpdatedAt = item.mediaUpdatedAt || item.media_updated_at;
      const platformPublishAt = item.storePublishUpdatedAt || item.store_publish_updated_at;
      const storePublishAt = inStoreProduct?.publishedAt;
      let storePublishUpdatedAt = storePublishAt || platformPublishAt;
      if (storePublishAt && platformPublishAt) {
        storePublishUpdatedAt =
          new Date(storePublishAt).getTime() > new Date(platformPublishAt).getTime()
            ? storePublishAt
            : platformPublishAt;
      }

      return {
        id,
        productCode: item.productCode || inStoreProduct?.productCode || 'PROD',
        title: item.title || inStoreProduct?.title || 'Handloom Saree',
        category: item.category || inStoreProduct?.categoryName || 'Saree',
        fabric: item.fabric || inStoreProduct?.fabric || 'Pure Silk',
        price: getProp(item, 'vendorPrice', 'VendorPrice') || inStoreProduct?.baseCost || 8000,
        color: item.color || inStoreProduct?.colorwayName || (mediaList[0]?.color) || 'Standard',
        mediaCount,
        primaryImageUri: imageUri,
        allMediaUris: allUris,
        descriptions: item.exclusiveDescription ? [item.exclusiveDescription] : item.description ? [item.description] : [],
        isStarred: Boolean(item.isStarred),
        isPublishedToStore: isPublished,
        isPublished,
        publishedAt: inStoreProduct?.publishedAt,
        syncedMediaCount,
        media_updated_at: mediaUpdatedAt,
        mediaUpdatedAt,
        store_publish_updated_at: storePublishUpdatedAt,
        storePublishUpdatedAt,
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

      const inStoreMap = await fetchInStoreMetadata();

      // Concurrently fetch published catalog items (guarantees published updates show up even if unstarred, e.g. VF1FC22)
      // and starred catalog items (first-time publishing queue)
      const [publishedRes, starredRes] = await Promise.allSettled([
        productService.getCatalog({
          isPublished: true,
          skip: 0,
          take: 100,
        }),
        productService.getCatalog({
          isStarred: true,
          skip: 0,
          take: PAGE_SIZE,
        }),
      ]);

      const productMap = new Map<string, any>();

      if (publishedRes.status === 'fulfilled' && publishedRes.value?.products) {
        publishedRes.value.products.forEach((p) => {
          const idKey = (p.masterProductId || p.id).toLowerCase();
          productMap.set(idKey, p);
        });
      }

      if (starredRes.status === 'fulfilled' && starredRes.value?.products) {
        starredRes.value.products.forEach((p) => {
          const idKey = (p.masterProductId || p.id).toLowerCase();
          if (!productMap.has(idKey)) {
            productMap.set(idKey, p);
          }
        });
      }

      // Ensure all in-store products are present in the list so published delta updates can be surfaced
      const missingInStoreIds = Array.from(inStoreMap.keys()).filter((id) => !productMap.has(id.toLowerCase()));
      if (missingInStoreIds.length > 0) {
        const inStoreCatalogDetails = await Promise.allSettled(
          missingInStoreIds.map((id) => productService.getProductById(id))
        );
        inStoreCatalogDetails.forEach((res) => {
          if (res.status === 'fulfilled' && res.value) {
            const idKey = (res.value.masterProductId || res.value.id).toLowerCase();
            productMap.set(idKey, res.value);
          }
        });
      }

      const fetchedProducts = Array.from(productMap.values());
      const mapped = mapProducts(fetchedProducts, inStoreMap);
      setStarredProducts(mapped);
      setHasMore(starredRes.status === 'fulfilled' && starredRes.value?.products ? starredRes.value.products.length >= PAGE_SIZE : false);
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
      const currentSkip = starredProducts.filter((p) => !p.isPublishedToStore).length;

      const catalogData = await productService.getCatalog({
        isStarred: true,
        skip: currentSkip,
        take: PAGE_SIZE,
      });

      if (catalogData && catalogData.products && catalogData.products.length > 0) {
        const mapped = mapProducts(catalogData.products, inStoreProductsMap);
        let newItemsCount = 0;
        setStarredProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newItems = mapped.filter((p) => !existingIds.has(p.id));
          newItemsCount = newItems.length;
          return [...prev, ...newItems];
        });
        if (newItemsCount === 0) {
          setHasMore(false);
        } else {
          setHasMore(catalogData.products.length >= PAGE_SIZE);
        }
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
    if (selectedIds.length === 0) return;

    try {
      const nowIso = new Date().toISOString();
      const isUpdating = starredProducts.some((p) => selectedIds.includes(p.id) && p.isPublishedToStore);
      const action = isUpdating ? 'sync_updates' : 'initial_publish';

      // 1. Submit asynchronous event-driven publish job to Kafka
      const job = await storeAdminService.submitPublishJob(action, selectedIds);
      console.log('Dispatched asynchronous publish job:', job);

      // 2. Immediately reflect state in local UI
      setStarredProducts((prev) =>
        prev.map((p) => {
          if (selectedIds.includes(p.id)) {
            return {
              ...p,
              isPublishedToStore: true,
              isPublished: true,
              publishedAt: nowIso,
              storePublishUpdatedAt: nowIso,
              store_publish_updated_at: nowIso,
              syncedMediaCount: p.mediaCount,
            };
          }
          return p;
        })
      );
      setPublishedCount((prev) => prev + selectedIds.length);

      // 3. Reload data from backend
      setTimeout(() => {
        loadData(true);
      }, 1500);
    } catch (err) {
      console.error('Failed to submit publish job:', err);
      Alert.alert('Error', 'Failed to submit publish job to Store.');
      throw err;
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

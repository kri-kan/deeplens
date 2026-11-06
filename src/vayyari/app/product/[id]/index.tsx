import React, { useState, useEffect, useCallback } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AdminProductDetailPage,
  AdminProductDetailData,
} from '@/components/tamagui-ui/pages/AdminProductDetailPage';
import { MediaSlideItem } from '@/components/tamagui-ui/molecules/AdminProductMediaCarousel';
import { VendorListingItemData } from '@/components/tamagui-ui/molecules/AdminVendorListingCard';
import { productService } from '@/services/productService';
import { storeAdminService } from '@/services/storeAdminService';
import { useProductDetail } from '@/hooks/useProductDetail';
import { downloadMedia } from '@/utils/media-helpers';
import { formatISTTimestamp } from '@/utils/date-format';
import { resolvePdpMediaItem } from '@/utils/pdpMediaHelpers';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data: product,
    isLoading: loading,
    refetch: fetchProductDetails,
    setDefaultMedia,
  } = useProductDetail(id);

  const [viewMode, setViewMode] = useState<'carousel' | 'gallery'>('carousel');
  const [storeSyncedMediaCount, setStoreSyncedMediaCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (id && (product?.isPublished || (product as any)?.isPublishedToStore)) {
      storeAdminService
        .getProductCuration(id)
        .then((curation) => {
          if (curation?.product?.mediaOrder) {
            setStoreSyncedMediaCount(curation.product.mediaOrder.length);
          }
        })
        .catch(() => {
          storeAdminService
            .getInStoreProducts()
            .then((inStore) => {
              const match = inStore.find(
                (p) => (p.vayyariProductId || p.id || '').toLowerCase() === (id || '').toLowerCase()
              );
              if (match?.mediaOrder) {
                setStoreSyncedMediaCount(match.mediaOrder.length);
              }
            })
            .catch(() => {});
        });
    }
  }, [id, product?.isPublished, (product as any)?.isPublishedToStore]);

  // Load view mode preference
  useEffect(() => {
    AsyncStorage.getItem('product-view-preference').then((val) => {
      if (val === 'gallery' || val === 'carousel') {
        setViewMode(val as 'carousel' | 'gallery');
      }
    });
  }, []);

  const handleToggleViewMode = () => {
    const nextMode = viewMode === 'gallery' ? 'carousel' : 'gallery';
    setViewMode(nextMode);
    AsyncStorage.setItem('product-view-preference', nextMode);
  };

  useFocusEffect(
    useCallback(() => {
      fetchProductDetails();
    }, [fetchProductDetails])
  );

  // Re-evaluate LLM pipeline
  const handleReevaluateLLM = async () => {
    if (!product?.id) return;
    try {
      await productService.reevaluateProducts([product.id]);
      Alert.alert('AI Pipeline', 'AI Re-evaluation initiated successfully.');
      fetchProductDetails();
    } catch (err) {
      console.error('Failed to reevaluate:', err);
      Alert.alert('Error', 'Failed to initiate AI re-evaluation.');
    }
  };

  // Update metadata
  const handleSaveMetadata = async (updates: {
    category?: string;
    fabric?: string;
    price?: number;
    useForTraining?: boolean;
  }) => {
    if (!id) return;
    try {
      await productService.updateProductMetadata(id, {
        categoryName: updates.category,
        fabric: updates.fabric,
        price: updates.price,
        useForTraining: updates.useForTraining ?? true,
      });
      fetchProductDetails();
      Alert.alert('Updated', 'Product metadata updated successfully.');
    } catch (error) {
      console.error('Failed to update metadata:', error);
      Alert.alert('Error', 'Failed to update metadata.');
    }
  };

  // Permanent Delete
  const handleDeleteProduct = async () => {
    if (!id) return;
    try {
      await productService.deleteProduct(id);
      Alert.alert('Deleted', 'Product deleted and WhatsApp media purged.');
      router.back();
    } catch (error) {
      console.error('Failed to delete product:', error);
      Alert.alert('Error', 'Failed to delete product.');
    }
  };

  // Star / Set Cover Media
  const handleStarMedia = async (mediaId: string) => {
    if (!id || !mediaId) return;
    try {
      await setDefaultMedia(mediaId);
      Alert.alert('Cover Updated', 'Media set as primary cover photo.');
      fetchProductDetails();
    } catch (error) {
      console.error('Failed to star media:', error);
      Alert.alert('Error', 'Failed to set cover media.');
    }
  };

  // Unarchive Product
  const handleUnarchive = async () => {
    if (!id) return;
    try {
      await productService.unarchiveProducts([id]);
      Alert.alert('Restored', 'Product restored to active catalog.');
      fetchProductDetails();
    } catch (e) {
      console.error('Failed to unarchive:', e);
      Alert.alert('Error', 'Failed to restore product.');
    }
  };

  // Download Media
  const handleDownloadMedia = async (mediaItem: MediaSlideItem) => {
    if (!mediaItem.url && !mediaItem.id) return;
    try {
      const downloadUrl =
        mediaItem.id && mediaItem.id !== '00000000-0000-0000-0000-000000000000'
          ? productService.getRawMediaUrl(mediaItem.id)
          : mediaItem.url || '';
      const path = mediaItem.url || '';
      const extension = mediaItem.mediaType === 'video' ? 'mp4' : path.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `product_${product?.productCode || 'vayyari'}_${mediaItem.id || Date.now()}.${extension}`;
      const savedUri = await downloadMedia(downloadUrl, filename);
      if (savedUri) {
        Alert.alert('Saved', 'Media downloaded successfully!');
      }
    } catch (err) {
      console.error('Failed to download media:', err);
      Alert.alert('Error', 'Failed to download media.');
    }
  };

  // Toggle Media Review Required Status
  const handleToggleMediaReviewRequired = async (isReviewRequired: boolean) => {
    if (!id) return;
    try {
      await productService.toggleMediaReviewRequired(id, isReviewRequired);
      fetchProductDetails();
    } catch (error) {
      console.error('Failed to toggle media review required status:', error);
      Alert.alert('Error', 'Failed to update media review status.');
    }
  };

  // Open WhatsApp Source Chat
  const handleOpenWhatsAppListing = (listing?: VendorListingItemData) => {
    let targetJid = listing?.sourceJid || product?.sourceJid;
    let targetGroupId = listing?.sourceGroupId || product?.sourceGroupId;

    // Resilient fallback from listings if not directly on the passed listing
    if (!targetJid && product?.listings && product.listings.length > 0) {
      const match = product.listings.find((l) => l.sourceJid);
      if (match?.sourceJid) {
        targetJid = match.sourceJid;
      }
    }
    if (!targetGroupId && product?.listings && product.listings.length > 0) {
      const match = product.listings.find((l) => l.sourceGroupId);
      if (match?.sourceGroupId) {
        targetGroupId = match.sourceGroupId;
      }
    }

    // Storage path regex fallback for group ID
    if (!targetGroupId && product?.media) {
      for (const m of product.media) {
        const path = m.storagePath || (m as any).url || '';
        const match = path.match(/general\/(product_[a-f0-9-]+)/);
        if (match) {
          targetGroupId = match[1];
          break;
        }
      }
    }

    if (!targetJid) {
      Alert.alert('No WhatsApp Source', 'This product does not have an associated WhatsApp chat.');
      return;
    }

    const encodedJid = encodeURIComponent(targetJid);
    const chatName = listing?.vendorName || product?.title || 'Source Chat';
    const highlightGroup = targetGroupId || '';

    router.push(
      `/utilities/whatsapp/messages/${encodedJid}?name=${encodeURIComponent(chatName)}&chatName=${encodeURIComponent(chatName)}&highlightGroupId=${encodeURIComponent(highlightGroup)}&targetGroupId=${encodeURIComponent(highlightGroup)}&sourceGroupId=${encodeURIComponent(highlightGroup)}&productId=${encodeURIComponent(product?.id || id || '')}&initialZoningMode=true` as any
    );
  };

  // Format product data for presentation
  const formattedProduct: AdminProductDetailData | null = product
    ? {
        id: product.id,
        title: product.title || 'Product',
        productCode: product.productCode || '---',
        vendorPrice: product.vendorPrice ? Number(product.vendorPrice) : undefined,
        category: product.category,
        fabric: product.fabric,
        timestamp: formatISTTimestamp(product.createdAt, product.sourceGroupId),
        exclusiveDescription: product.exclusiveDescription,
        isArchived: product.isArchived,
        isMediaReviewRequired: (product as any).isMediaReviewRequired,
        isPublished: Boolean(product.isPublished || (product as any).isPublishedToStore),
        isPublishedToStore: Boolean(product.isPublished || (product as any).isPublishedToStore),
        mediaUpdatedAt: (product as any).mediaUpdatedAt || (product as any).media_updated_at,
        storePublishUpdatedAt: (product as any).storePublishUpdatedAt || (product as any).store_publish_updated_at,
        syncedMediaCount: storeSyncedMediaCount ?? ((product as any).syncedMediaCount ?? 0),
        mediaCount: (product as any).mediaCount ?? (product.media?.length || 0),
        tags: (product as any).tags || [],
        sourceGroupId: product.sourceGroupId,
        sourceJid: product.sourceJid,
        unifiedAttributes: product.unifiedAttributes,
        craft: product.craft,
        motif: product.motif,
        border: product.border,
        stitchType: product.stitchType,
        occasions: product.occasions,
        confidenceScore: product.confidenceScore,
        media: (product.media || []).map((m) =>
          resolvePdpMediaItem(m, {
            getRawMediaUrl: (mediaId) => productService.getRawMediaUrl(mediaId),
            getMediaUrlByPath: (path) => productService.getMediaUrlByPath(path),
            getThumbnailUrl: (mediaId, spec) => productService.getThumbnailUrl(mediaId, spec),
            getThumbnailUrlByPath: (path, spec) => productService.getThumbnailUrlByPath(path, spec),
          })
        ),
        listings: (product.listings || []).map((l) => ({
          id: l.id,
          vendorName: l.vendorName || 'Unknown Vendor',
          price: l.price ? Number(l.price) : undefined,
          currency: l.currency || 'INR',
          isActive: l.isActive,
          isPlusShipping: l.isPlusShipping,
          updatedAt: formatISTTimestamp(l.updatedAt, l.sourceGroupId),
          description: l.description,
          sourceGroupId: l.sourceGroupId,
          sourceJid: l.sourceJid,
        })),
      }
    : null;

  return (
    <AdminProductDetailPage
      product={formattedProduct}
      isLoading={loading}
      initialViewMode={viewMode}
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        }
      }}
      onFindSimilar={() => {
        if (product) {
          router.push({
            pathname: '/utilities/product/product-similar-matches',
            params: { productId: id, productTitle: product.title || '' },
          } as any);
        }
      }}
      onShare={() => {
        if (id) {
          router.push(`/product/${id}/share`);
        }
      }}
      onStarMedia={handleStarMedia}
      onReevaluateLLM={handleReevaluateLLM}
      onDeleteProduct={handleDeleteProduct}
      onUnarchive={handleUnarchive}
      onSaveMetadata={handleSaveMetadata}
      onOpenWhatsAppListing={handleOpenWhatsAppListing}
      onDownloadMedia={handleDownloadMedia}
      onToggleMediaReviewRequired={handleToggleMediaReviewRequired}
      onPublishToStore={async () => {
        if (!product) return;
        try {
          const allMediaUrls = (product.media && product.media.length > 0)
            ? product.media
                .map((m) => {
                  if (m.id && m.id !== '00000000-0000-0000-0000-000000000000') {
                    return productService.getThumbnailUrl(m.id, 'large');
                  }
                  if (m.storagePath) {
                    return productService.getThumbnailUrlByPath(m.storagePath, 'large');
                  }
                  return null;
                })
                .filter((url): url is string => Boolean(url))
            : [
                product.media?.[0]?.storagePath
                  ? productService.getThumbnailUrlByPath(product.media[0].storagePath, 'large')
                  : 'https://picsum.photos/seed/saree/600/800',
              ];

          const resolvedItems = product.media && product.media.length > 0
            ? product.media
                .map((m) => {
                  let url: string | null = null;
                  if (m.id && m.id !== '00000000-0000-0000-0000-000000000000') {
                    url = productService.getThumbnailUrl(m.id, 'large');
                  } else if (m.storagePath) {
                    url = productService.getThumbnailUrlByPath(m.storagePath, 'large');
                  }
                  if (!url) return null;
                  return {
                    catalogMediaId: m.id && m.id !== '00000000-0000-0000-0000-000000000000' ? m.id : undefined,
                    url,
                    mediaType: m.mediaType || 1,
                  };
                })
                .filter((item): item is NonNullable<typeof item> => Boolean(item))
            : [];

          await storeAdminService.batchPublish([
            {
              vayyariProductId: product.id,
              productCode: product.productCode || 'PROD',
              title: product.title || 'Product',
              categoryName: product.category || 'Saree',
              fabric: product.fabric || 'Silk',
              baseCost: Number(product.vendorPrice) || 8000,
              mediaUrls: allMediaUrls,
              mediaItems: resolvedItems,
            },
          ]);
          await productService.recordStorePublish([product.id]);
          Alert.alert('Published to Store', 'Product has been synced to Store and is ready for curation.');
          fetchProductDetails();
        } catch (err) {
          console.error('Failed to publish to Store:', err);
          Alert.alert('Error', 'Failed to publish to Store.');
        }
      }}
      onSyncDelta={async (payload: any) => {
        if (!product?.id) return;
        try {
          await storeAdminService.triggerDeltaSync(product.id, payload);
          await productService.recordStorePublish([product.id]);
          Alert.alert('Delta Synced', 'Store media updates synced successfully.');
          fetchProductDetails();
        } catch (err: any) {
          console.error('Failed to sync delta:', err);
          Alert.alert('Error', err?.message || 'Failed to sync delta.');
        }
      }}
      onNavigateToStoreCuration={() => {
        if (id) {
          router.push(`/store/curate/${id}` as any);
        }
      }}
    />
  );
}

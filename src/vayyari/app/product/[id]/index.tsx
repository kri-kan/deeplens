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

  // Open WhatsApp Source Chat
  const handleOpenWhatsAppListing = (listing: VendorListingItemData) => {
    if (listing.sourceJid) {
      router.push({
        pathname: '/utilities/whatsapp/messages/[jid]',
        params: {
          jid: listing.sourceJid,
          name: 'Source Chat',
          highlightGroupId: listing.sourceGroupId || '',
          initialZoningMode: 'true',
        },
      } as any);
    }
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
        media: (product.media || []).map((m) => ({
          id: m.id,
          url:
            m.id && m.id !== '00000000-0000-0000-0000-000000000000'
              ? productService.getThumbnailUrl(m.id, 'large')
              : m.storagePath
              ? productService.getThumbnailUrlByPath(m.storagePath, 'large')
              : 'https://via.placeholder.com/400',
          thumbnailUrl:
            m.id && m.id !== '00000000-0000-0000-0000-000000000000'
              ? productService.getThumbnailUrl(m.id, 'medium')
              : undefined,
          mediaType: m.mediaType === 2 ? 'video' : 'image',
          isDefault: m.isDefault,
        })),
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
      onPublishToStore={async () => {
        if (!product) return;
        try {
          const firstMedia = product.media?.[0]?.storagePath
            ? productService.getThumbnailUrlByPath(product.media[0].storagePath, 'large')
            : 'https://picsum.photos/seed/saree/600/800';
          await storeAdminService.batchPublish([
            {
              vayyariProductId: product.id,
              productCode: product.productCode || 'PROD',
              title: product.title || 'Product',
              categoryName: product.category || 'Saree',
              fabric: product.fabric || 'Silk',
              baseCost: Number(product.vendorPrice) || 8000,
              mediaUrls: [firstMedia],
            },
          ]);
          Alert.alert('Published to Store', 'Product has been synced to Store and is ready for curation.');
          fetchProductDetails();
        } catch (err) {
          console.error('Failed to publish to Store:', err);
          Alert.alert('Error', 'Failed to publish to Store.');
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

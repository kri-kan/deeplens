import React, { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { cacheDirectory, createDownloadResumable, getInfoAsync } from 'expo-file-system/legacy';
import * as ExpoSharing from 'expo-sharing';
import { useProductSharing } from '@/hooks/useProductSharing';
import { useProductDetail } from '@/hooks/useProductDetail';
import { productService } from '@/services/productService';
import {
  AdminProductSharePage,
  ProductShareMediaItem,
  ProductVendorSource,
  PostShareAttributionPayload,
} from '@/components/tamagui-ui/pages/AdminProductSharePage';

async function downloadToCache(url: string, filename: string): Promise<string> {
  if (!cacheDirectory) throw new Error('No cache directory');
  const fileUri = `${cacheDirectory}share_${filename}`;
  const info = await getInfoAsync(fileUri);
  if (info.exists) return fileUri;
  const dl = createDownloadResumable(url, fileUri);
  const result = await dl.downloadAsync();
  if (!result?.uri) throw new Error('Download failed');
  return result.uri;
}

export default function ProductShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: product, isLoading: loadingProduct } = useProductDetail(id);

  const mediaItems: ProductShareMediaItem[] = useMemo(() => {
    return (product?.media || []).map((m, idx) => ({
      id: m.id,
      uri:
        m.id && m.id !== '00000000-0000-0000-0000-000000000000'
          ? productService.getThumbnailUrl(m.id, 'medium')
          : m.storagePath
          ? productService.getThumbnailUrlByPath(m.storagePath, 'medium')
          : 'https://picsum.photos/seed/saree/600/800',
      mediaType: m.mediaType === 2 ? 'video' : 'image',
      isPrimary: idx === 0,
    }));
  }, [product]);

  const vendorSources: ProductVendorSource[] = useMemo(() => {
    return (product?.listings || []).map((l, idx) => ({
      id: l.id || `v-${idx}`,
      vendorName: l.vendorName || 'Vendor',
      description: l.description || '',
    }));
  }, [product]);

  const handleShareFiles = async (selectedMediaIds: string[], caption: string) => {
    if (selectedMediaIds.length === 0) return;

    try {
      const selectedMedia = (product?.media || []).filter((m) => selectedMediaIds.includes(m.id));
      const firstMedia = selectedMedia[0];

      if (firstMedia) {
        const url = firstMedia.id
          ? productService.getThumbnailUrl(firstMedia.id, 'large')
          : firstMedia.storagePath
          ? productService.getThumbnailUrlByPath(firstMedia.storagePath, 'large')
          : null;

        if (url && (await ExpoSharing.isAvailableAsync())) {
          const localUri = await downloadToCache(url, `prod_${product?.productCode || 'share'}.jpg`);
          await ExpoSharing.shareAsync(localUri, {
            mimeType: 'image/jpeg',
            dialogTitle: `Share ${product?.productCode || 'Product'}`,
          });
        }
      }
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleConfirmAttribution = async (payload: PostShareAttributionPayload) => {
    try {
      console.log('Attribution payload recorded:', payload);
      Alert.alert(
        'Attribution Recorded',
        `Attributed to ${payload.platform === 'instagram' ? `@${payload.channel?.username || 'instagram'}` : 'WhatsApp'}.\nSchedule: ${payload.formattedScheduleLabel || 'Immediate'}`
      );
      router.back();
    } catch (err) {
      console.error('Failed to record attribution:', err);
      Alert.alert('Error', 'Failed to record attribution.');
    }
  };

  return (
    <AdminProductSharePage
      mode="catalog"
      productCode={product?.productCode || 'SAR-KAN-901'}
      productTitle={product?.title || 'Kanjivaram Silk Saree'}
      category={product?.category || 'Saree'}
      fabric={product?.fabric || 'Pure Silk'}
      price={Number(product?.vendorPrice) || 10999}
      media={mediaItems}
      vendorSources={vendorSources}
      initialDescription={product?.exclusiveDescription || ''}
      onBack={() => router.back()}
      onShareFiles={handleShareFiles}
      onConfirmAttribution={handleConfirmAttribution}
    />
  );
}

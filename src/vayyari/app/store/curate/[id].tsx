import React, { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import {
  AdminStoreProductCurationPage,
  StoreMediaItem,
  StoreColorVariant,
  StoreAuditLogEntry,
} from '@/components/tamagui-ui/pages/AdminStoreProductCurationPage';
import { storeAdminService, StoreProductCuration } from '@/services/storeAdminService';

export default function StoreCurationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [curationData, setCurationData] = useState<StoreProductCuration | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCuration = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await storeAdminService.getProductCuration(id);
      setCurationData(data);
    } catch (err) {
      console.warn('Failed to load curation data from Store.Api, using defaults:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCuration();
  }, [fetchCuration]);

  const handleSave = async (payload: any) => {
    if (!id) return;
    try {
      await storeAdminService.updateProductCuration(id, {
        lifecycleStatus: payload.lifecycleState,
        mrp: payload.mrp,
        salePrice: payload.salePrice,
        tags: payload.tags,
      });
      fetchCuration();
    } catch (err) {
      console.error('Failed to save curation to Store.Api:', err);
      Alert.alert('Error', 'Failed to save changes to Store.Api.');
    }
  };

  const product = curationData?.product;

  const mediaList: StoreMediaItem[] = (product?.mediaOrder || []).map((m, idx) => ({
    id: m.id || `m-${idx}`,
    uri: m.url,
    mediaType: m.mediaType === 2 ? 'video' : 'image',
    sortOrder: m.order || idx + 1,
    isHero: m.isCover || idx === 0,
    dwellTimeSeconds: m.dwellSeconds || 0,
  }));

  const auditLogs: StoreAuditLogEntry[] = (curationData?.auditHistory || []).map((a) => ({
    id: a.id,
    timestamp: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    author: a.authorEmail,
    actionText: `${a.actionType}: ${a.fieldName || ''} ${a.oldValue ? `(${a.oldValue} ➔ ${a.newValue})` : a.newValue || ''}`,
  }));

  return (
    <AdminStoreProductCurationPage
      productId={id}
      productCode={product?.productCode || 'SAR-KAN-901'}
      title={product?.title || 'Handloom Silk Saree'}
      baseCostPrice={product?.baseCost || 8499}
      initialMrp={product?.mrp || 14999}
      initialSalePrice={product?.salePrice || 10999}
      initialLifecycleState={(product?.lifecycleStatus as any) || 'available'}
      initialMedia={mediaList}
      initialTags={product?.tags || ['Bridal', 'Festive', 'Pure Silk']}
      initialAuditLogs={auditLogs}
      onBack={() => router.back()}
      onSave={handleSave}
    />
  );
}

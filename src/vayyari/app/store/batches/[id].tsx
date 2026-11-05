import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AdminStorePublishBatchDetailPage } from '@/components/tamagui-ui/pages/AdminStorePublishBatchesPage';
import { storeAdminService, PublishJobStatusResponse } from '@/services/storeAdminService';

export default function StorePublishBatchDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [batch, setBatch] = useState<PublishJobStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBatch = useCallback(async (isRefresh = false) => {
    if (!id) return;
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await storeAdminService.getPublishJobStatus(id);
      setBatch(data);
    } catch (err) {
      console.warn(`Failed to fetch publish job ${id}:`, err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  // Polling while this specific batch is running
  useEffect(() => {
    if (!batch) return;
    const isRunning = batch.status === 'in_progress' || batch.status === 'queued';
    if (!isRunning) return;

    const interval = setInterval(() => {
      if (!id) return;
      storeAdminService
        .getPublishJobStatus(id)
        .then((updated) => setBatch(updated))
        .catch((e) => console.warn('Polling batch error:', e));
    }, 2500);

    return () => clearInterval(interval);
  }, [batch, id]);

  return (
    <AdminStorePublishBatchDetailPage
      batch={batch}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchBatch(true)}
      onBack={() => router.back()}
      onOpenPdp={(productId) => router.push(`/product/${productId}` as any)}
    />
  );
}

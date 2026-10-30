import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  waProcessorService,
  PipelineEventsResponse,
} from '@/services/wa-processor.service';
import { AdminPipelineEventsPage } from '@/components/tamagui-ui/pages/AdminPipelineEventsPage';

export default function PipelineEventsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<PipelineEventsResponse | null>(null);
  const [forcePublishingId, setForcePublishingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await waProcessorService.fetchPipelineEvents('all', 100);
      setData(res);
    } catch (err: any) {
      console.warn('Failed to fetch pipeline events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleForcePublish = async (groupId: string) => {
    try {
      setForcePublishingId(groupId);
      await waProcessorService.forcePublishGroup(groupId);
      Alert.alert('Success', 'Group promotion event dispatched to Kafka.');
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to force publish');
    } finally {
      setForcePublishingId(null);
    }
  };

  return (
    <AdminPipelineEventsPage
      data={data}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onBack={() => router.back()}
      onOpenChat={(jid) => router.push(`/utilities/whatsapp/messages/${encodeURIComponent(jid)}`)}
      onOpenProduct={(productId) => router.push(`/admin/products/${productId}` as any)}
      onForcePromote={handleForcePublish}
      forcePromotingId={forcePublishingId}
    />
  );
}

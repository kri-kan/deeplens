import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  waProcessorService,
  ReviewInboxResponse,
  ReviewInboxItem,
} from '@/services/wa-processor.service';
import { WhatsAppReviewInboxPage } from '@/components/tamagui-ui/pages/WhatsAppReviewInboxPage';

export default function WhatsAppReviewInboxScreen() {
  const router = useRouter();

  const [activeStage, setActiveStage] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [data, setData] = useState<ReviewInboxResponse | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchData = useCallback(async (stageToFetch = activeStage) => {
    try {
      const res = await waProcessorService.fetchReviewInbox(stageToFetch, 100);
      setData(res);
    } catch (err: any) {
      console.warn('Failed to fetch review inbox items:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeStage]);

  useEffect(() => {
    fetchData(activeStage);
    const interval = setInterval(() => {
      fetchData(activeStage);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchData, activeStage]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(activeStage);
  };

  const handleSelectStage = (stage: string) => {
    setActiveStage(stage);
    setLoading(true);
    fetchData(stage);
  };

  const handleInspectZone = (item: ReviewInboxItem) => {
    const encodedJid = encodeURIComponent(item.jid);
    const chatName = encodeURIComponent(item.chatName || item.vendorName || 'Chat');
    const highlightGroup = encodeURIComponent(item.groupId);
    router.push(
      `/utilities/whatsapp/messages/${encodedJid}?name=${chatName}&chatName=${chatName}&highlightGroupId=${highlightGroup}&targetGroupId=${highlightGroup}&sourceGroupId=${highlightGroup}&initialZoningMode=true` as any
    );
  };

  const handleForcePromote = (item: ReviewInboxItem) => {
    Alert.alert(
      'Approve & Create Product',
      `Force promote group ${item.groupId.substring(0, 8)}? This bypasses remaining qualification checks and dispatches creation to Kafka.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Create',
          onPress: async () => {
            try {
              setActionLoadingId(item.groupId);
              await waProcessorService.forcePublishGroup(item.groupId);
              Alert.alert('Success', 'Product creation dispatched.');
              fetchData(activeStage);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to force publish group');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleIgnore = (item: ReviewInboxItem) => {
    Alert.alert(
      'Ignore Group',
      `Mark group ${item.groupId.substring(0, 8)} as ignored? It will not be processed as a product.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ignore',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(item.groupId);
              await waProcessorService.ignoreGroupReview(item.groupId, true);
              Alert.alert('Success', 'Group marked as ignored.');
              fetchData(activeStage);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to ignore group');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDismiss = (item: ReviewInboxItem) => {
    Alert.alert(
      'Dismiss Review Flag',
      `Clear the review flag for group ${item.groupId.substring(0, 8)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          onPress: async () => {
            try {
              setActionLoadingId(item.groupId);
              await waProcessorService.dismissGroupReview(item.groupId);
              Alert.alert('Success', 'Review flag dismissed.');
              fetchData(activeStage);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to dismiss review flag');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <WhatsAppReviewInboxPage
      data={data}
      loading={loading}
      refreshing={refreshing}
      activeStage={activeStage}
      onSelectStage={handleSelectStage}
      onRefresh={onRefresh}
      onBack={() => router.back()}
      onInspectZone={handleInspectZone}
      onForcePromote={handleForcePromote}
      onIgnore={handleIgnore}
      onDismiss={handleDismiss}
      actionLoadingId={actionLoadingId}
    />
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AdminPostPlannerPage } from '@/components/tamagui-ui/pages/AdminPostPlannerPage';
import {
  instagramService,
  PostPlannerChannelOption,
  PostPlannerItem,
  PostPlannerChannelAssignment,
} from '@/services/instagram.service';
import { getSearchApiUrl } from '@/utils/api-config';

export default function PostPlannerScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [channels, setChannels] = useState<PostPlannerChannelOption[]>([]);
  const [items, setItems] = useState<PostPlannerItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [channelsData, itemsData] = await Promise.all([
        instagramService.getPostPlannerChannels(),
        instagramService.getPostPlannerItems({
          curationStatus: 'all',
          take: 500,
        }),
      ]);

      const baseUrl = getSearchApiUrl() || '';
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      const resolveUri = (urlOrPath?: string) => {
        if (!urlOrPath) return undefined;
        if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) return urlOrPath;
        if (urlOrPath.startsWith('/')) return `${cleanBaseUrl}${urlOrPath}`;
        return `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(urlOrPath)}`;
      };

      const mappedChannels: PostPlannerChannelOption[] = (channelsData || []).map((ch) => ({
        ...ch,
        profilePicUrl: resolveUri(ch.profilePicUrl),
      }));

      const mappedItems: PostPlannerItem[] = (itemsData || []).map((it) => ({
        ...it,
        primaryImageUrl: resolveUri(it.primaryImageUrl),
        channelAssignments: (it.channelAssignments || []).map((a) => ({
          ...a,
          profilePicUrl: resolveUri(a.profilePicUrl),
        })),
      }));

      setChannels(mappedChannels);
      setItems(mappedItems);
    } catch (err) {
      console.error('Failed to load post planner data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleSaveMatching = useCallback(
    async (productId: string, watchlistIds: string[], isDonePlanning: boolean) => {
      await instagramService.matchProductChannels({
        productId,
        watchlistIds,
        isDonePlanning,
      });

      setItems((prev) =>
        prev.map((item) => {
          if (item.productId === productId) {
            const newPlanningStatus = isDonePlanning ? 'complete' : 'in_progress';
            const newAssignments: PostPlannerChannelAssignment[] = watchlistIds.map((wId) => {
              const ch = channels.find((c) => c.watchlistId === wId);
              const existing = (item.channelAssignments || []).find((a) => a.watchlistId === wId);
              return (
                existing || {
                  assignmentId: 'temp-' + Date.now(),
                  watchlistId: wId,
                  username: ch?.username || 'instagram',
                  displayName: ch?.displayName || ch?.username,
                  channelType: ch?.channelType || 'focus',
                  status: 'assigned',
                }
              );
            });
            return {
              ...item,
              planningStatus: newPlanningStatus,
              channelAssignments: newAssignments,
              assignedChannelIds: watchlistIds,
            };
          }
          return item;
        })
      );
    },
    [channels]
  );

  const handleRecordAction = useCallback(
    async (
      productId: string,
      watchlistId: string,
      actionType: 'shared_now' | 'scheduled' | 'excluded',
      scheduledAt?: string,
      publishedUrl?: string,
      captionUsed?: string
    ) => {
      await instagramService.recordPostAction({
        productId,
        watchlistId,
        actionType,
        scheduledAt,
        publishedUrl,
        captionUsed,
      });

      setItems((prev) =>
        prev.map((item) => {
          if (item.productId === productId) {
            const existingAssignments = item.channelAssignments || [];
            const otherAssignments = existingAssignments.filter((a) => a.watchlistId !== watchlistId);
            const ch = channels.find((c) => c.watchlistId === watchlistId);
            const newStatus =
              actionType === 'shared_now'
                ? 'shared'
                : actionType === 'scheduled'
                ? 'scheduled'
                : 'excluded';
            const updatedAssignment: PostPlannerChannelAssignment = {
              assignmentId: 'temp-' + Date.now(),
              watchlistId,
              username: ch?.username || 'instagram',
              displayName: ch?.displayName || ch?.username,
              channelType: ch?.channelType || 'focus',
              status: newStatus,
              scheduledAt,
              publishedAt: actionType === 'shared_now' ? new Date().toISOString() : undefined,
              publishedUrl,
              captionUsed,
            };
            return {
              ...item,
              channelAssignments: [...otherAssignments, updatedAssignment],
            };
          }
          return item;
        })
      );
    },
    [channels]
  );

  const handleSaveClassification = useCallback(
    async (
      watchlistId: string,
      channelType: 'focus' | 'dump',
      categoryFocus: string[],
      targetDemography?: string
    ) => {
      await instagramService.classifyChannel({
        watchlistId,
        channelType,
        categoryFocus,
        targetDemography,
      });

      setChannels((prev) =>
        prev.map((c) => {
          if (c.watchlistId === watchlistId) {
            return {
              ...c,
              channelType,
              categoryFocus,
              targetDemography,
            };
          }
          return c;
        })
      );
    },
    []
  );

  return (
    <AdminPostPlannerPage
      channels={channels}
      items={items}
      loading={loading}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      onBack={() => router.back()}
      initialTab={tab === 'sharing' || tab === 'post_planner' ? 'sharing' : 'curation'}
      onSaveMatching={handleSaveMatching}
      onRecordAction={handleRecordAction}
      onSaveClassification={handleSaveClassification}
    />
  );
}

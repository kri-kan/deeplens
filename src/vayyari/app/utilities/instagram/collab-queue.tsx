import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AdminCollabQueuePage } from '@/components/tamagui-ui/pages/AdminCollabQueuePage';
import {
  instagramService,
  CollabPlannerChannelDto,
  CollabPlannerPostDto,
} from '@/services/instagram.service';
import { TargetCollabAccount } from '@/components/tamagui-ui/molecules/TargetCollabAccountPicker';
import { CollabPostItem } from '@/components/tamagui-ui/organisms/CollabCurationModal';
import { getSearchApiUrl } from '@/utils/api-config';
import { getMediaUri } from '@/utils/instagram-helpers';

export default function CollabQueueRoute() {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [queueItems, setQueueItems] = useState<CollabPostItem[]>([]);
  const [accounts, setAccounts] = useState<TargetCollabAccount[]>([]);

  const loadData = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const baseUrl = getSearchApiUrl() || '';
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      const resolveProfilePic = (picUrl?: string, storagePath?: string) => {
        if (picUrl && picUrl.startsWith('/')) {
          return `${cleanBaseUrl}${picUrl}`;
        }
        if (storagePath) {
          return `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(storagePath)}`;
        }
        if (picUrl && (picUrl.startsWith('http://') || picUrl.startsWith('https://'))) {
          return picUrl;
        }
        return undefined;
      };

      // 1. Fetch owned business accounts
      const dbChannels: CollabPlannerChannelDto[] = await instagramService.getCollabChannels();
      const mappedAccounts: TargetCollabAccount[] = dbChannels.map((ch) => ({
        id: ch.username,
        username: ch.username,
        displayName: ch.displayName || ch.username,
        channelType: ch.channelType || 'focus',
        avatarUri: resolveProfilePic(ch.profilePicUrl, ch.profilePicStoragePath || ch.storagePath),
      }));
      setAccounts(mappedAccounts);

      // 2. Fetch active queued posts
      const rawQueue: CollabPlannerPostDto[] = await instagramService.getCollabQueue();
      const mappedQueue: CollabPostItem[] = rawQueue.map((p) => {
        const mediaUri = getMediaUri(p, 'medium') || p.thumbnailUrl || p.videoUrl || '';
        return {
          id: p.id,
          thumbnailUrl: mediaUri,
          mediaUrl: p.videoUrl || mediaUri,
          ownerUsername: p.ownerUsername,
          ownerAvatarUri: resolveProfilePic(p.ownerProfilePicUrl),
          caption: p.caption || p.title || '',
          postedAt: p.postedAt
            ? new Date(p.postedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : undefined,
          likes: p.likeCount || 0,
          comments: p.commentCount || 0,
          collaborators: (p.collaborators || []).map((c: any) =>
            typeof c === 'string' ? c : c.username
          ),
          targetCollabAccounts: p.targetCollabAccounts || [],
          curationStatus: 'queued',
        };
      });

      setQueueItems(mappedQueue);
    } catch (err: any) {
      console.error('Failed to load Collab Queue data', err);
      Alert.alert('Error', err.message || 'Failed to load Collab Queue data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/utilities/instagram/collab-planner' as any);
    }
  };

  const handleUnqueueItem = async (postId: string) => {
    try {
      await instagramService.unqueueCollabPost(postId);
      setQueueItems((prev) => prev.filter((item) => item.id !== postId));
    } catch (err: any) {
      console.error('Failed to unqueue post', err);
      Alert.alert('Error', err.message || 'Failed to unqueue post');
    }
  };

  const handleClearQueue = async () => {
    try {
      await instagramService.clearCollabQueue();
      setQueueItems([]);
    } catch (err: any) {
      console.error('Failed to clear queue', err);
      Alert.alert('Error', err.message || 'Failed to clear queue');
    }
  };

  const handleUpdateTargets = async (postId: string, newTargets: string[]) => {
    try {
      await instagramService.queueCollabPost(postId, newTargets);
      setQueueItems((prev) =>
        prev.map((item) =>
          item.id === postId ? { ...item, targetCollabAccounts: newTargets } : item
        )
      );
      Alert.alert('Updated', 'Collaboration targets updated successfully.');
    } catch (err: any) {
      console.error('Failed to update targets', err);
      Alert.alert('Error', err.message || 'Failed to update targets');
    }
  };

  if (loading && queueItems.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7E22CE" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminCollabQueuePage
        queueItems={queueItems}
        accounts={accounts}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => loadData(true)}
        onUnqueueItem={handleUnqueueItem}
        onClearQueue={handleClearQueue}
        onUpdateTargets={handleUpdateTargets}
        onBack={handleBack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AdminCollabPlannerPage } from '@/components/tamagui-ui/pages/AdminCollabPlannerPage';
import {
  instagramService,
  CollabPlannerChannelDto,
  CollabPlannerPostDto,
} from '@/services/instagram.service';
import { TargetChannelOption } from '@/components/tamagui-ui/molecules/TargetChannelAvatar';
import { TargetCollabAccount } from '@/components/tamagui-ui/molecules/TargetCollabAccountPicker';
import { CollabPostItem } from '@/components/tamagui-ui/organisms/CollabCurationModal';
import { getSearchApiUrl } from '@/utils/api-config';
import { getMediaUri } from '@/utils/instagram-helpers';

export default function CollabPlannerRoute() {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [channels, setChannels] = useState<TargetChannelOption[]>([]);
  const [accounts, setAccounts] = useState<TargetCollabAccount[]>([]);
  const [posts, setPosts] = useState<CollabPostItem[]>([]);
  const [queueItems, setQueueItems] = useState<CollabPostItem[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('vayyari_fashions');
  const [showCurated, setShowCurated] = useState<boolean>(false);
  const [isQueueActive, setIsQueueActive] = useState<boolean>(false);

  const loadData = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const baseUrl = getSearchApiUrl() || '';
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      // 1. Fetch active owned business accounts from real database
      const dbChannels: CollabPlannerChannelDto[] = await instagramService.getCollabChannels();

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

      // Exclude 'All Channels' - show only dedicated business channels directly
      const mappedChannels: TargetChannelOption[] = dbChannels.map((ch) => ({
        id: ch.username,
        username: ch.username,
        displayName: ch.displayName || ch.username,
        channelType: ch.channelType || 'focus',
        avatarUri: resolveProfilePic(ch.profilePicUrl, ch.profilePicStoragePath || ch.storagePath),
      }));

      const mappedAccounts: TargetCollabAccount[] = dbChannels.map((ch) => ({
        id: ch.username,
        username: ch.username,
        displayName: ch.displayName || ch.username,
        channelType: ch.channelType || 'focus',
        avatarUri: resolveProfilePic(ch.profilePicUrl, ch.profilePicStoragePath || ch.storagePath),
      }));

      setChannels(mappedChannels);
      setAccounts(mappedAccounts);

      // Default active channel to primary business account if current not set
      if (mappedChannels.length > 0) {
        setActiveChannelId((prev) =>
          prev && mappedChannels.some((c) => c.id === prev) ? prev : mappedChannels[0].id
        );
      }

      // 2. Fetch posts across all owned business accounts
      const dbPosts: CollabPlannerPostDto[] = await instagramService.getCollabPosts({
        includeCurated: true,
        take: 150,
      });

      const mapPost = (p: CollabPlannerPostDto): CollabPostItem => {
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
          curationStatus:
            p.collabCurationStatus === 'collab_curated'
              ? 'curated'
              : (p.collabCurationStatus as any) || 'pending',
        };
      };

      const mappedPosts: CollabPostItem[] = dbPosts.map(mapPost);
      setPosts(mappedPosts);

      // 3. Check automation queue items
      try {
        const rawQueue = await instagramService.getCollabQueue();
        const mappedQueue = rawQueue.map(mapPost);
        setQueueItems(mappedQueue);
        setIsQueueActive(mappedQueue.length > 0);
      } catch {
        // queue check non-fatal, fallback to queued items in posts list
      }
    } catch (err: any) {
      console.error('Failed to load Collab Planner data', err);
      Alert.alert('Error', err.message || 'Failed to load Collab Planner data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
    } catch (err: any) {
      console.error('Failed to load Collab Planner data', err);
      Alert.alert('Error', err.message || 'Failed to load Collab Planner data');
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
      router.replace('/utilities/instagram-explorer' as any);
    }
  };

  const handleMarkCurated = async (postId: string, selectedAccountIds: string[]) => {
    try {
      await instagramService.curateCollabPost(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, curationStatus: 'curated' } : p
        )
      );
    } catch (err: any) {
      console.error('Failed to curate post', err);
      Alert.alert('Error', err.message || 'Failed to mark post as curated');
    }
  };

  const handleQueueAutomation = async (postId: string, selectedAccountIds: string[]) => {
    try {
      await instagramService.queueCollabPost(postId, selectedAccountIds);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                curationStatus: 'queued',
                targetCollabAccounts: selectedAccountIds,
              }
            : p
        )
      );
      setIsQueueActive(true);
      Alert.alert(
        'Queued for Automation',
        `Post queued for AVD Maestro collaboration automation with ${selectedAccountIds.length} account(s).`
      );
    } catch (err: any) {
      console.error('Failed to queue post for automation', err);
      Alert.alert('Error', err.message || 'Failed to queue post for automation');
    }
  };

  if (loading && posts.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7E22CE" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminCollabPlannerPage
        channels={channels}
        accounts={accounts}
        posts={posts}
        activeChannelId={activeChannelId}
        onSelectChannel={setActiveChannelId}
        showCurated={showCurated}
        onToggleShowCurated={setShowCurated}
        isAutomationQueueActive={isQueueActive}
        queueItems={queueItems}
        refreshing={refreshing}
        onRefresh={() => loadData(true)}
        onBack={handleBack}
        onMarkCurated={handleMarkCurated}
        onQueueAutomation={handleQueueAutomation}
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

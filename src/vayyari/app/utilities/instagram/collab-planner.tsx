import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const PAGE_SIZE = 45;

export default function CollabPlannerRoute() {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);

  const [channels, setChannels] = useState<TargetChannelOption[]>([]);
  const [accounts, setAccounts] = useState<TargetCollabAccount[]>([]);
  const [posts, setPosts] = useState<CollabPostItem[]>([]);
  const [queueItems, setQueueItems] = useState<CollabPostItem[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('vayyari_fashions');
  const [showCurated, setShowCurated] = useState<boolean>(false);
  const [isQueueActive, setIsQueueActive] = useState<boolean>(false);

  const activeChannelRef = useRef(activeChannelId);
  activeChannelRef.current = activeChannelId;

  const showCuratedRef = useRef(showCurated);
  showCuratedRef.current = showCurated;

  const mapPost = useCallback((p: CollabPlannerPostDto): CollabPostItem => {
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
      channelPhases: p.channelPhases || [],
      curationStatus:
        p.collabCurationStatus === 'collab_curated'
          ? 'curated'
          : (p.collabCurationStatus as any) || 'pending',
    };
  }, []);

  const fetchChannelPosts = useCallback(
    async (
      channelUsername: string,
      pageIndex: number,
      includeCurated: boolean,
      isAppend = false
    ) => {
      const skip = pageIndex * PAGE_SIZE;
      const dbPosts: CollabPlannerPostDto[] = await instagramService.getCollabPosts({
        username: channelUsername,
        includeCurated,
        take: PAGE_SIZE,
        skip,
      });

      // Guard against race conditions if active channel or filter changed while awaiting
      if (
        activeChannelRef.current !== channelUsername ||
        showCuratedRef.current !== includeCurated
      ) {
        return;
      }

      const total =
        dbPosts.length > 0 && dbPosts[0].totalCount !== undefined
          ? dbPosts[0].totalCount
          : undefined;

      setTotalCount(total);
      if (total !== undefined) {
        setHasMore(skip + dbPosts.length < total);
      } else {
        setHasMore(dbPosts.length === PAGE_SIZE);
      }

      const mappedPosts = dbPosts.map(mapPost);

      if (isAppend) {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const fresh = mappedPosts.filter((p) => !existingIds.has(p.id));
          return [...prev, ...fresh];
        });
      } else {
        setPosts(mappedPosts);
      }
    },
    [mapPost]
  );

  const loadInitialData = useCallback(
    async (isPullRefresh = false, targetChannelOverride?: string) => {
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

        // 1. Fetch active owned business accounts from real database
        const dbChannels: CollabPlannerChannelDto[] = await instagramService.getCollabChannels();

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

        // Determine active channel
        const targetChannel =
          targetChannelOverride ||
          activeChannelRef.current ||
          (mappedChannels.length > 0 ? mappedChannels[0].id : 'vayyari_fashions');

        setActiveChannelId(targetChannel);
        activeChannelRef.current = targetChannel;

        // 2. Fetch page 0 for this active channel
        setPage(0);
        await fetchChannelPosts(targetChannel, 0, showCuratedRef.current, false);

        // 3. Check automation queue items
        try {
          const rawQueue = await instagramService.getCollabQueue();
          const mappedQueue = rawQueue.map(mapPost);
          setQueueItems(mappedQueue);
          setIsQueueActive(mappedQueue.length > 0);
        } catch {
          // queue check non-fatal
        }
      } catch (err: any) {
        console.error('Failed to load Collab Planner data', err);
        Alert.alert('Error', err.message || 'Failed to load Collab Planner data');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchChannelPosts, mapPost]
  );

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleSelectChannel = useCallback(
    async (channelId: string) => {
      if (channelId === activeChannelRef.current) return;
      setActiveChannelId(channelId);
      activeChannelRef.current = channelId;
      setPosts([]);
      setPage(0);
      setHasMore(true);
      setLoading(true);
      try {
        await fetchChannelPosts(channelId, 0, showCuratedRef.current, false);
      } catch (err: any) {
        console.error('Failed to switch channel', err);
        Alert.alert('Error', err.message || 'Failed to switch channel');
      } finally {
        setLoading(false);
      }
    },
    [fetchChannelPosts]
  );

  const handleToggleShowCurated = useCallback(
    async (newCurated: boolean) => {
      setShowCurated(newCurated);
      showCuratedRef.current = newCurated;
      setPosts([]);
      setPage(0);
      setHasMore(true);
      setLoading(true);
      try {
        await fetchChannelPosts(activeChannelRef.current, 0, newCurated, false);
      } catch (err: any) {
        console.error('Failed to toggle curated filter', err);
        Alert.alert('Error', err.message || 'Failed to update filter');
      } finally {
        setLoading(false);
      }
    },
    [fetchChannelPosts]
  );

  const handleEndReached = useCallback(async () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      await fetchChannelPosts(activeChannelRef.current, nextPage, showCuratedRef.current, true);
      setPage(nextPage);
    } catch (err: any) {
      console.error('Failed to load more collab posts', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, page, fetchChannelPosts]);

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

  if (loading && channels.length === 0) {
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
        totalCount={totalCount}
        activeChannelId={activeChannelId}
        onSelectChannel={handleSelectChannel}
        showCurated={showCurated}
        onToggleShowCurated={handleToggleShowCurated}
        isAutomationQueueActive={isQueueActive}
        queueItems={queueItems}
        onOpenQueuePage={() => router.push('/utilities/instagram/collab-queue' as any)}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.8}
        refreshing={refreshing}
        onRefresh={() => loadInitialData(true)}
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

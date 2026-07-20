import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TouchableWithoutFeedback, Alert, Dimensions, Linking, ScrollView, DeviceEventEmitter, Modal, Animated, BackHandler } from 'react-native';
import { Text, Button, Divider, useTheme, ActivityIndicator, Portal, Dialog, IconButton, TextInput, Icon, Menu, Checkbox } from 'react-native-paper';
import { useRouter, Stack, useFocusEffect, useNavigation } from 'expo-router';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import Svg, { Circle } from 'react-native-svg';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEventListener } from 'expo';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { instagramService, StoryGroup, InstagramPost, InstagramProfile, InstagramMediaType } from '@/services/instagram.service';
import { wrapInSpan } from '@/utils/telemetry';
import { getMediaUri } from '@/utils/instagram-helpers';
import { UnifiedPlannerItem } from '@/services/instagram.service';
import { getIdentityApiUrl, getSearchApiUrl, getWhatsappProcessorUrl, getOtelEndpointUrl } from '@/utils/api-config';


const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

// ── Story Ring Helpers ────────────────────────────────────────────────────────
const getStoryRingParams = (count: number) => {
  if (!count || count <= 0) return null;

  // Colors
  // 1-4: Red, 5-10: Orange, 11-15: Yellow, 16+: Green
  let color = '#FF2D55'; // Red
  if (count >= 5 && count <= 10) {
    color = '#FB8C00'; // Orange
  } else if (count >= 11 && count <= 15) {
    color = '#FFD54F'; // Yellow
  } else if (count > 15) {
    color = '#4CAF50'; // Green
  }

  const radius = 27;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius; // ~169.646

  let dashArray = '';
  if (count === 1) {
    dashArray = `${circumference}`;
  } else {
    // Compensate for strokeLinecap="round" by adding slightly larger gap visually
    const gap = 5;
    const dashLength = Math.max(1, (circumference / count) - gap);
    dashArray = `${dashLength} ${gap}`;
  }

  return { color, radius, strokeWidth, circumference, dashArray };
};

const formatRelativeTime = (dateStr?: string) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
};

const getProfilePicUri = (p: InstagramProfile) => {
  if (!p) return null;
  const path = p.storagePath;
  const baseUrl = getSearchApiUrl() || '';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  if (path) {
    return `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(path)}`;
  }
  if (p.profilePictureUrl) {
    return p.profilePictureUrl.startsWith('/') ? `${cleanBaseUrl}${p.profilePictureUrl}` : p.profilePictureUrl;
  }
  return null;
};

const getAvatarColor = (username: string) => {
  const colors = ['#8D6E63', '#2E7D32', '#558B2F', '#1565C0', '#6A1B9A', '#AD1457'];
  if (!username) return colors[0];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// ── Story Video Player ────────────────────────────────────────────────────────
interface StoryVideoPlayerProps {
  uri: string;
  isPaused: boolean;
  onProgress: (val: number) => void;
  onComplete: () => void;
}

function StoryVideoPlayer({ uri, isPaused, onProgress, onComplete }: StoryVideoPlayerProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.05;
    p.muted = false;
    if (!isPaused) {
      p.play();
    }
  });

  const [isReady, setIsReady] = useState(player.status === 'readyToPlay');

  useEffect(() => {
    if (isPaused) {
      player.pause();
    } else {
      player.play();
    }
  }, [isPaused, player]);

  useEventListener(player, 'timeUpdate', (event) => {
    const duration = player.duration;
    if (duration > 0) {
      onProgress(event.currentTime / duration);
    }
  });

  useEventListener(player, 'playToEnd', () => {
    onComplete();
  });

  useEventListener(player, 'statusChange', (event) => {
    if (event.status === 'readyToPlay') {
      setIsReady(true);
    }
  });

  return (
    <View style={styles.storyMediaContainer}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      {!isReady && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}
    </View>
  );
}

// ── Story Viewer Modal ────────────────────────────────────────────────────────
interface StoryViewerModalProps {
  visible: boolean;
  profile: InstagramProfile | null;
  onClose: () => void;
}

function StoryViewerModal({ visible, profile, onClose }: StoryViewerModalProps) {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setPaused] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const touchStartTime = useRef(0);

  // Fetch stories when visible & profile changes
  useEffect(() => {
    if (!visible || !profile) {
      setPosts([]);
      setLoading(true);
      setActiveIndex(0);
      setProgress(0);
      setPaused(false);
      setDetailsExpanded(false);
      return;
    }

    let isMounted = true;
    const fetchStories = async () => {
      try {
        setLoading(true);
        const fetched = await instagramService.getRecentStories(profile.id);
        if (isMounted) {
          setPosts(fetched);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch recent stories', err);
        if (isMounted) {
          Alert.alert('Error', 'Failed to fetch recent stories.');
          onClose();
        }
      }
    };

    fetchStories();

    return () => {
      isMounted = false;
    };
  }, [visible, profile]);

  // Handle closing when posts are empty after loading
  useEffect(() => {
    if (visible && !loading && posts.length === 0) {
      Alert.alert('Info', 'No stories posted in the last 24 hours.');
      onClose();
    }
  }, [loading, posts, visible]);

  const activePost = posts[activeIndex];
  const isVideo = activePost && (activePost.mediaType === 'VIDEO' || activePost.mediaType === InstagramMediaType.VIDEO || activePost.mediaType === '2');

  // Image timer logic
  useEffect(() => {
    if (loading || posts.length === 0 || isVideo || isPaused) {
      return;
    }

    const intervalDuration = 50; // tick every 50ms
    const totalDuration = 5000;  // 5 seconds total
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + (intervalDuration / totalDuration);
        if (next >= 1) {
          clearInterval(timer);
          goToNext();
          return 0;
        }
        return next;
      });
    }, intervalDuration);

    return () => clearInterval(timer);
  }, [activeIndex, isPaused, loading, posts.length, isVideo]);

  const goToNext = () => {
    if (activeIndex < posts.length - 1) {
      setProgress(0);
      setActiveIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const goToPrev = () => {
    if (activeIndex > 0) {
      setProgress(0);
      setActiveIndex(prev => prev - 1);
    } else {
      setProgress(0);
    }
  };

  const handlePressIn = () => {
    touchStartTime.current = Date.now();
    setPaused(true);
  };

  const handlePressOut = (action: () => void) => {
    setPaused(false);
    const duration = Date.now() - touchStartTime.current;
    if (duration < 300) {
      action();
    }
  };

  if (!visible || !profile) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.storyModalOverlay}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={{ color: '#ffffff', marginTop: 12 }}>Loading stories...</Text>
          </View>
        ) : posts.length === 0 ? null : (
          <View style={StyleSheet.absoluteFill}>
            {/* Segmented Progress Bars */}
            <View style={styles.storyProgressContainer}>
              {posts.map((_, idx) => {
                let fill = 0;
                if (idx < activeIndex) fill = 1;
                else if (idx === activeIndex) fill = progress;

                return (
                  <View key={idx} style={styles.storyProgressBarTrack}>
                    <View style={[styles.storyProgressBarFill, { width: `${fill * 100}%` }]} />
                  </View>
                );
              })}
            </View>

            {/* Story Header */}
            <View style={styles.storyHeader}>
              {profile.profilePictureUrl || profile.storagePath ? (
                <Image
                  source={{ uri: getProfilePicUri(profile) ?? undefined }}
                  style={styles.storyHeaderAvatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.storyHeaderAvatar, { backgroundColor: getAvatarColor(profile.username), justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>
                    {profile.username.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.storyHeaderInfo}>
                <Text style={styles.storyHeaderUsername}>@{profile.username}</Text>
                {activePost.sharedAt && (
                  <Text style={styles.storyHeaderTime}>
                    Shared {formatRelativeTime(activePost.sharedAt)}
                  </Text>
                )}
              </View>
              <IconButton
                icon="close"
                iconColor="#ffffff"
                size={24}
                style={styles.storyCloseButton}
                onPress={onClose}
              />
            </View>

            {/* Media Content */}
            <View style={styles.storyMediaContainer}>
              {isVideo ? (
                <StoryVideoPlayer
                  uri={getMediaUri(activePost)}
                  isPaused={isPaused}
                  onProgress={setProgress}
                  onComplete={goToNext}
                />
              ) : (
                <Image
                  source={{ uri: getMediaUri(activePost, 'large') }}
                  style={styles.storyImage}
                  contentFit="contain"
                />
              )}
            </View>

            {/* Navigation Touch Zones */}
            <View style={[StyleSheet.absoluteFillObject, { top: 100, bottom: detailsExpanded ? '40%' : 110 }]}>
              <View style={{ flex: 1, flexDirection: 'row' }}>
                <TouchableWithoutFeedback
                  onPressIn={handlePressIn}
                  onPressOut={() => handlePressOut(goToPrev)}
                >
                  <View style={{ flex: 3 }} />
                </TouchableWithoutFeedback>

                <TouchableWithoutFeedback
                  onPressIn={handlePressIn}
                  onPressOut={() => handlePressOut(goToNext)}
                >
                  <View style={{ flex: 7 }} />
                </TouchableWithoutFeedback>
              </View>
            </View>

            {/* Collapsible Bottom Details Sheet */}
            <View style={[
              styles.storyDetailsSheet,
              detailsExpanded ? styles.storyDetailsExpanded : styles.storyDetailsCollapsed
            ]}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setDetailsExpanded(!detailsExpanded)}
                style={styles.storyDetailsDragHandle}
              />
              
              <View style={styles.storyDetailsHeader}>
                <Text variant="titleSmall" style={{ color: '#ffffff', fontWeight: 'bold' }}>
                  @{activePost.ownerUsername || 'Post'}
                </Text>
                <TouchableOpacity onPress={() => setDetailsExpanded(!detailsExpanded)}>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}>
                    {detailsExpanded ? 'Hide info' : 'Tap for info'}
                  </Text>
                </TouchableOpacity>
              </View>

              {detailsExpanded ? (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
                  <View style={styles.storyDetailsStatsRow}>
                    <View style={styles.storyDetailsStatBadge}>
                      <Text style={styles.storyDetailsStatText}>👍 {activePost.rightSwipes || 0} Right</Text>
                    </View>
                    <View style={styles.storyDetailsStatBadge}>
                      <Text style={styles.storyDetailsStatText}>👎 {activePost.leftSwipes || 0} Left</Text>
                    </View>
                    <View style={styles.storyDetailsStatBadge}>
                      <Text style={styles.storyDetailsStatText}>🔁 {activePost.shareCount || 0} Shared</Text>
                    </View>
                    <View style={styles.storyDetailsStatBadge}>
                      <Text style={styles.storyDetailsStatText}>❤️ {activePost.likeCount || 0} Likes</Text>
                    </View>
                  </View>

                  {activePost.caption ? (
                    <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13, lineHeight: 18, marginTop: 4 }}>
                      {activePost.caption}
                    </Text>
                  ) : (
                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, fontStyle: 'italic' }}>
                      No caption
                    </Text>
                  )}

                  {activePost.permalink && (
                    <Button
                      mode="contained"
                      icon="instagram"
                      style={{ marginTop: 16, backgroundColor: '#E1306C' }}
                      onPress={() => Linking.openURL(activePost.permalink!).catch(() => {})}
                    >
                      Open in Instagram
                    </Button>
                  )}
                </ScrollView>
              ) : (
                <View style={{ flex: 1 }}>
                  {activePost.caption ? (
                    <Text numberOfLines={1} style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, marginTop: 2 }}>
                      {activePost.caption}
                    </Text>
                  ) : null}
                  <View style={styles.storyDetailsStatsRow}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}>
                      👍 {activePost.rightSwipes || 0}  |  💬 {activePost.commentCount || 0}  |  🔁 {activePost.shareCount || 0}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

export default function StorySharingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();

  // State
  const [loading, setLoading] = useState(true);
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);
  const [storyViewerProfile, setStoryViewerProfile] = useState<InstagramProfile | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ownProfiles, setOwnProfiles] = useState<InstagramProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<InstagramProfile | null>(null);
  const [allShares, setAllShares] = useState<UnifiedPlannerItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [collapsedSectionsByProfile, setCollapsedSectionsByProfile] = useState<Record<string, Set<string>>>({});
  const [previewPost, setPreviewPost] = useState<InstagramPost | null>(null);
  const [sharingPost, setSharingPost] = useState(false);
  const [confirmShareVisible, setConfirmShareVisible] = useState(false);
  const [postToShare, setPostToShare] = useState<InstagramPost | null>(null);
  
  const [selectedItems, setSelectedItems] = useState<Map<string, { item: UnifiedPlannerItem; order: number }>>(new Map());
  const selectionCounter = useRef(0);
  const [selectionMenuVisible, setSelectionMenuVisible] = useState(false);
  const selectionMode = selectedItems.size > 0;

  const toggleSelection = (plannerItem: UnifiedPlannerItem) => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      if (next.has(plannerItem.id)) {
        next.delete(plannerItem.id);
      } else {
        selectionCounter.current += 1;
        next.set(plannerItem.id, { item: plannerItem, order: selectionCounter.current });
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedItems(new Map());
    selectionCounter.current = 0;
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (selectionMode) {
        e.preventDefault();
        clearSelection();
      }
    });
    return unsubscribe;
  }, [navigation, selectionMode]);

  useEffect(() => {
    const onBackPress = () => {
      if (selectionMode) {
        clearSelection();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [selectionMode]);

  const offsetRef = useRef(0);
  const PAGE_SIZE = 100;

  const handleQueueForStory = async () => {
    setSelectionMenuVisible(false);
    if (selectedItems.size === 0) return;
    
    const targetProfile = selectedProfile || ownProfiles[0];
    if (!targetProfile) {
      Alert.alert('Error', 'No profile available to queue for.');
      return;
    }

    try {
      // Sort entries by selection order so first-selected gets the lowest queue index
      const orderedEntries = Array.from(selectedItems.values())
        .sort((a, b) => a.order - b.order);

      let queuedCount = 0;
      let skippedCount = 0;
      
      for (const { item } of orderedEntries) {
        if (item.type === 'post' && item.post) {
          const result = await instagramService.queueForStory(item.post.id, targetProfile.id);
          if (result.duplicate) skippedCount++; else queuedCount++;
        } else if (item.type === 'group' && item.group) {
          const starred = item.group.posts?.filter(p => (p as any).isStarred) || [];
          const toQueue = starred.length > 0 ? starred.slice(0, 2) : (item.group.posts?.slice(0, 1) || []);
          
          for (const p of toQueue) {
            const result = await instagramService.queueForStory(p.id, targetProfile.id, item.group.id);
            if (result.duplicate) skippedCount++; else queuedCount++;
          }
        }
      }
      
      clearSelection();
      const skipMsg = skippedCount > 0 ? ` (${skippedCount} already in queue, skipped)` : '';
      Alert.alert('Success', `Queued ${queuedCount} items for story posting to @${targetProfile.username}${skipMsg}`);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to queue items');
    }
  };

  // Load Watchlist (Own Accounts)
  const loadProfiles = async () => {
    try {
      const watchlist = await wrapInSpan('StorySharingScreen: getWatchlist', () => 
        instagramService.getWatchlist()
      );
      const own = watchlist.filter(p => p.profileCategory === 'My Business');
      setOwnProfiles(own);
      if (own.length > 0) {
        setSelectedProfile(own[0]);
      }
    } catch (error) {
      console.error('Failed to load watchlist profiles', error);
      Alert.alert('Error', 'Failed to load accounts.');
    }
  };

  // Load Eligible Shares
  const loadShares = async (profileId?: string, reset = false, showPullRefresh = false) => {
    const pid = profileId || selectedProfile?.id;
    if (!pid) return;
    if (reset) {
      if (showPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      offsetRef.current = 0;
    } else {
      setLoadingMore(true);
    }
    try {
      const { items, totalCount: total } = await wrapInSpan('StorySharingScreen: getEligibleShares', () =>
        instagramService.getEligibleShares(pid, PAGE_SIZE, offsetRef.current)
      );
      if (reset) {
        setAllShares(items);
      } else {
        setAllShares(prev => [...prev, ...items]);
      }
      setTotalCount(total);
      offsetRef.current += items.length;
    } catch (error) {
      console.error('Failed to load eligible shares', error);
      Alert.alert('Error', 'Failed to load eligible shares.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    if (selectedProfile) {
      loadShares(selectedProfile.id, true, true);
    }
  }, [selectedProfile]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || loading) return;
    if (allShares.length >= totalCount) return;
    loadShares();
  }, [loadingMore, loading, allShares.length, totalCount, selectedProfile]);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('GroupFinished', (event: { groupId: string }) => {
      setAllShares(prev => prev.filter(i => !(i.type === 'group' && i.group?.id === event.groupId)));
    });
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (selectedProfile) {
        loadShares(selectedProfile.id, true);
      }
    }, [selectedProfile])
  );

  const handleSharePostDirectly = async (post: InstagramPost) => {
    if (!post.permalink) {
      Alert.alert('Error', 'Permalink not available for this post.');
      return;
    }

    try {
      if (post.caption) {
        await Clipboard.setStringAsync(post.caption);
      }
      await Linking.openURL(post.permalink);
      setPostToShare(post);
      setConfirmShareVisible(true);
    } catch (error) {
      console.error('Failed to open link', error);
      Alert.alert('Error', 'Failed to open Instagram.');
    }
  };

  const handleConfirmDirectPost = async () => {
    if (!selectedProfile || !postToShare) return;
    setSharingPost(true);
    try {
      await wrapInSpan('StorySharingScreen: markPostPostedDirect', () =>
        instagramService.markPostPosted(postToShare.id, selectedProfile.id, undefined)
      );
      // Hide tile completely
      setAllShares(prev => prev.filter(i => !(i.type === 'post' && i.post?.id === postToShare.id)));
      setConfirmShareVisible(false);
      setPostToShare(null);
      Alert.alert('Recorded', 'Story share recorded!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record share');
    } finally {
      setSharingPost(false);
    }
  };

  // Helpers

  const renderGroupAvatars = (group: StoryGroup) => {
    const mapped = ownProfiles.filter(p => group.eligibleAccounts?.includes(p.id));
    if (mapped.length === 0) return null;

    const maxVisible = 3;
    const visibleProfiles = mapped.slice(0, maxVisible);
    const extraCount = mapped.length - maxVisible;

    return (
      <View style={styles.groupAvatarsRow}>
        {visibleProfiles.map((profile, index) => {
          const uri = getProfilePicUri(profile);
          const initials = profile.username?.substring(0, 2).toUpperCase() || '??';
          return (
            <View 
              key={profile.id} 
              style={[
                styles.groupAvatarCircle,
                { zIndex: 10 - index, marginLeft: index === 0 ? 0 : -8 }
              ]}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.groupAvatarImage} />
              ) : (
                <View style={[styles.groupAvatarFallback, { backgroundColor: getAvatarColor(profile.username) }]}>
                  <Text style={styles.groupAvatarFallbackText}>{initials}</Text>
                </View>
              )}
            </View>
          );
        })}
        {extraCount > 0 && (
          <View style={[styles.groupAvatarCircle, styles.groupAvatarExtra, { zIndex: 5, marginLeft: -8 }]}>
            <Text style={styles.groupAvatarExtraText}>+{extraCount}</Text>
          </View>
        )}
      </View>
    );
  };

  const getItemDate = (item: UnifiedPlannerItem) => {
    if (item.type === 'group' && item.group?.posts && item.group.posts.length > 0) {
      const timestamps = item.group.posts
        .map(p => p.timestamp ? new Date(p.timestamp).getTime() : 0)
        .filter(t => t > 0);
      if (timestamps.length > 0) {
        return Math.max(...timestamps);
      }
    }
    return new Date(item.timestamp).getTime();
  };

  const isSharedRecently = (item: UnifiedPlannerItem) => {
    const lastPostedStr = item.type === 'group' ? (item.group?.lastPostedAt || item.group?.posts?.[0]?.lastPostedAt) : item.post?.lastPostedAt;
    if (!lastPostedStr) return false;
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    return (new Date().getTime() - new Date(lastPostedStr).getTime()) < twentyFourHoursMs;
  };

  // Filter items
  const eligibleItems = allShares;

  const now = new Date().getTime();
  const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;

  // Client-side sectioning only. Backend already sorts by latest_post_at DESC.
  // isSharedRecently stays for the grey-out logic.
  // We partition into recent/older sections for display but don't re-sort within each.
  const recentItems = eligibleItems.filter(i => {
    const shared = isSharedRecently(i);
    const date = getItemDate(i);
    return !shared && (now - date) <= fifteenDaysMs;
  });

  const olderItems = eligibleItems.filter(i => {
    const shared = isSharedRecently(i);
    const date = getItemDate(i);
    return !shared && (now - date) > fifteenDaysMs;
  });

  const recentlySharedItems = eligibleItems.filter(i => isSharedRecently(i));

  // Build flat sections list for FlatList.
  // We chunk grid items into rows of 3 so section headers can span full width
  // without breaking the grid layout (numColumns mixes up full-width headers).
  type SectionHeader = { _type: 'header'; label: string; icon: string; color: string; key: string; count: number; collapsed: boolean };
  type GridRow = { _type: 'row'; key: string; items: UnifiedPlannerItem[] };
  type FlatListRow = SectionHeader | GridRow;

  const buildSectionRows = (label: string, icon: string, color: string, items: UnifiedPlannerItem[]): FlatListRow[] => {
    const rows: FlatListRow[] = [];
    const currentCollapsed = collapsedSectionsByProfile[selectedProfile?.id || 'default'] || new Set(['Active Content', 'Recently Shared (Last 24h)']);
    const isCollapsed = currentCollapsed.has(label);
    rows.push({ _type: 'header', label, icon, color, key: `header-${label}`, count: items.length, collapsed: isCollapsed });
    if (!isCollapsed) {
      for (let i = 0; i < items.length; i += 3) {
        rows.push({
          _type: 'row',
          key: `row-${label}-${i}`,
          items: items.slice(i, i + 3)
        });
      }
    }
    return rows;
  };

  const flatData: FlatListRow[] = [
    ...(recentItems.length > 0 ? buildSectionRows('Recent Content (Last 15 Days)', 'clock-outline', '#6200ee', recentItems) : []),
    ...(olderItems.length > 0 ? buildSectionRows('Active Content', 'fire', '#03dac6', olderItems) : []),
    ...(recentlySharedItems.length > 0 ? buildSectionRows('Recently Shared (Last 24h)', 'check-circle-outline', 'gray', recentlySharedItems) : []),
  ];

  // Stats badge row (shared by post and group tiles)
  const renderStatsBadge = (right: number, left: number, shares: number) => (
    <View style={styles.statsBadgeRow}>
      <Text style={styles.statsBadgeText}>👍{right}</Text>
      <Text style={styles.statsBadgeText}>👎{left}</Text>
      {shares > 0 && <Text style={styles.statsBadgeText}>🔁{shares}</Text>}
    </View>
  );

  const renderGridCell = (item: UnifiedPlannerItem) => {
    const isShared = isSharedRecently(item);
    const opacityStyle = isShared ? { opacity: 0.4 } : {};

    if (item.type === 'group' && item.group) {
      const group = item.group;
      const starredPost = group.posts?.find(p => p.isStarred) || group.posts?.[0];
      const right = group.rightSwipes || 0;
      const left = group.leftSwipes || 0;
      const shares = group.shareCount || 0;

      return (
        <TouchableOpacity
          key={`group-${group.id}`}
          style={[styles.gridCell, opacityStyle]}
          activeOpacity={0.8}
          onPress={() => {
            if (selectionMode) {
              toggleSelection(item);
            } else {
              router.push({
                pathname: '/utilities/instagram/story-planner/[groupId]',
                params: { groupId: group.id, profileId: selectedProfile?.id }
              });
            }
          }}
          onLongPress={() => toggleSelection(item)}
        >
          <Image
            source={{ uri: starredPost ? getMediaUri(starredPost, 'medium') : '' }}
            style={styles.cellImage}
            contentFit="cover"
            transition={200}
          />
          {selectionMode && (() => {
            const entry = selectedItems.get(item.id);
            return (
              <View style={styles.selectionOrderBadge}>
                {entry ? (
                  <Text style={styles.selectionOrderText}>{entry.order}</Text>
                ) : (
                  <Icon source="checkbox-blank-circle-outline" size={20} color={theme.colors.primary} />
                )}
              </View>
            );
          })()}
          <View style={styles.groupTopInfo}>
            {renderGroupAvatars(group)}
            <View style={styles.groupPostCountBadge}>
              <Text style={styles.groupPostCountText}>
                {group.posts?.length || 0} {(group.posts?.length || 0) === 1 ? 'post' : 'posts'}
              </Text>
            </View>
          </View>
          <View style={styles.groupBottomOverlay}>
            <Text style={styles.groupBottomTitle} numberOfLines={1}>
              {group.name}
            </Text>
            {renderStatsBadge(right, left, shares)}
          </View>
        </TouchableOpacity>
      );
    } else if (item.type === 'post' && item.post) {
      const post = item.post;
      const right = post.rightSwipes || 0;
      const left = post.leftSwipes || 0;
      const shares = post.shareCount || 0;
      return (
        <TouchableOpacity
          key={`post-${post.id}`}
          style={[styles.gridCell, opacityStyle]}
          activeOpacity={0.8}
          onPress={() => {
            if (selectionMode) {
              toggleSelection(item);
            } else {
              setPreviewPost(post);
            }
          }}
          onLongPress={() => toggleSelection(item)}
        >
          <Image
            source={{ uri: getMediaUri(post, 'medium') }}
            style={styles.cellImage}
            contentFit="cover"
            transition={200}
          />
          {selectionMode && (() => {
            const entry = selectedItems.get(item.id);
            return (
              <View style={styles.selectionOrderBadge}>
                {entry ? (
                  <Text style={styles.selectionOrderText}>{entry.order}</Text>
                ) : (
                  <Icon source="checkbox-blank-circle-outline" size={20} color={theme.colors.primary} />
                )}
              </View>
            );
          })()}

          {/* Share button overlay */}
          {!selectionMode && (
            <TouchableOpacity
              style={styles.shareIconBadge}
              activeOpacity={0.7}
              onPress={() => handleSharePostDirectly(post)}
            >
              <Icon source="instagram" size={16} color="white" />
            </TouchableOpacity>
          )}

          <View style={styles.groupBottomOverlay}>
            <Text style={styles.groupBottomTitle} numberOfLines={1}>
              {post.ownerUsername || 'Post'}
            </Text>
            {renderStatsBadge(right, left, shares)}
          </View>
        </TouchableOpacity>
      );
    }
    return null;
  };


  const toggleSection = (label: string) => {
    const profileId = selectedProfile?.id || 'default';
    setCollapsedSectionsByProfile(prev => {
      const currentSet = prev[profileId] || new Set(['Active Content', 'Recently Shared (Last 24h)']);
      const nextSet = new Set(currentSet);
      if (nextSet.has(label)) nextSet.delete(label);
      else nextSet.add(label);
      return { ...prev, [profileId]: nextSet };
    });
  };

  const renderFlatRow = ({ item }: { item: FlatListRow }) => {
    if (item._type === 'header') {
      const h = item as SectionHeader;
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => toggleSection(h.label)}
          style={styles.sectionHeader}
        >
          <Icon source={h.icon} size={16} color={h.color} />
          <Text variant="titleSmall" style={[styles.sectionTitle, { color: h.color, flex: 1 }]}>
            {h.label}
          </Text>
          <Text variant="labelSmall" style={{ color: h.color, opacity: 0.7, marginRight: 6 }}>
            {h.count}
          </Text>
          <Icon
            source={h.collapsed ? 'chevron-down' : 'chevron-up'}
            size={18}
            color={h.color}
          />
        </TouchableOpacity>
      );
    }
    // _type === 'row': render up to 3 grid cells in a flex row
    const row = item as GridRow;
    return (
      <View style={{ flexDirection: 'row' }}>
        {row.items.map(cell => renderGridCell(cell))}
        {/* Fill remaining slots so the last row aligns left */}
        {row.items.length < 3 && Array.from({ length: 3 - row.items.length }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.gridCell} />
        ))}
      </View>
    );
  };

  return (
    <ScreenWrapper 
      title={selectedItems.size > 0 ? `${selectedItems.size} Selected` : 'Story Sharing'} 
      subtitle="Share Curation to Stories" 
      withScrollView={false}
      onBack={selectionMode ? () => clearSelection() : undefined}
      actions={
        selectionMode ? (
          <Menu
            visible={selectionMenuVisible}
            onDismiss={() => setSelectionMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                onPress={() => setSelectionMenuVisible(true)}
              />
            }
          >
            <Menu.Item onPress={handleQueueForStory} title="Queue for story posting" />
          </Menu>
        ) : (
          <IconButton 
            icon="clipboard-list-outline" 
            onPress={() => router.push('/utilities/instagram/story-queue')} 
          />
        )
      }
    >
      <Stack.Screen options={{ headerTitle: selectedItems.size > 0 ? `${selectedItems.size} Selected` : 'Story Sharing' }} />

      {/* Target Account Selector */}
      <View style={styles.accountSelectorContainer}>
        <Text variant="labelMedium" style={styles.selectorLabel}>Select Target Channel:</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={ownProfiles}
          keyExtractor={p => p.id}
          style={{ marginTop: 12 }}
          contentContainerStyle={{ gap: 16, paddingHorizontal: 4 }}
          renderItem={({ item: p }) => {
            const isSelected = selectedProfile?.id === p.id;
            const baseUrl = getSearchApiUrl() || '';
            const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const avatarUri = p.storagePath
              ? `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(p.storagePath)}`
              : p.profilePictureUrl;

            const hasStories = p.storiesPostedLast24h !== undefined && p.storiesPostedLast24h > 0;
            const ringParams = hasStories ? getStoryRingParams(p.storiesPostedLast24h!) : null;

            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedProfile(p)}
                disabled={selectionMode}
                onLongPress={() => {
                  if (hasStories) {
                    setStoryViewerProfile(p);
                    setStoryViewerVisible(true);
                  }
                }}
                delayLongPress={300}
                activeOpacity={0.8}
                style={[
                  styles.avatarWrapper,
                  selectionMode && !isSelected && { opacity: 0.4 }
                ]}
              >
                <View style={[
                  styles.avatarBorder,
                  isSelected && !hasStories && { borderColor: theme.colors.primary, borderWidth: 3 }
                ]}>
                  {avatarUri ? (
                    <Image 
                      source={{ uri: avatarUri }} 
                      style={[
                        styles.channelAvatar,
                        isSelected && hasStories && { borderWidth: 2, borderColor: theme.colors.primary }
                      ]} 
                      contentFit="cover" 
                    />
                  ) : (
                    <View style={[
                      styles.channelAvatar, 
                      { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
                      isSelected && hasStories && { borderWidth: 2, borderColor: theme.colors.primary }
                    ]}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{p.username.substring(0, 2).toUpperCase()}</Text>
                    </View>
                  )}

                  {/* Svg story ring */}
                  {hasStories && ringParams && (
                    <Svg width={60} height={60} viewBox="0 0 60 60" style={{ position: 'absolute', top: -3, left: -3 }}>
                      <Circle
                        cx={30}
                        cy={30}
                        r={27}
                        fill="transparent"
                        stroke={ringParams.color}
                        strokeWidth={3}
                        strokeDasharray={ringParams.dashArray}
                        strokeLinecap={p.storiesPostedLast24h! > 1 ? "round" : "butt"}
                        transform="rotate(-90 30 30)"
                      />
                    </Svg>
                  )}
                </View>
                <Text
                  variant="labelSmall"
                  numberOfLines={1}
                  style={[
                    styles.avatarLabel,
                    isSelected && { color: theme.colors.primary, fontWeight: 'bold' }
                  ]}
                >
                  @{p.username}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <Divider />

      {loading && allShares.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12 }}>Loading story planner...</Text>
        </View>
      ) : eligibleItems.length === 0 ? (
        <View style={styles.center}>
          <IconButton icon="check-decagram-outline" size={48} style={{ opacity: 0.3 }} />
          <Text variant="bodyLarge" style={{ opacity: 0.5 }}>All caught up!</Text>
          <Text variant="bodySmall" style={{ opacity: 0.5, textAlign: 'center', marginTop: 4, paddingHorizontal: 40 }}>
            No active content mapped to @{selectedProfile?.username}.
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={item => item.key}
          renderItem={renderFlatRow}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={{ paddingBottom: 60 }}
          ListFooterComponent={loadingMore ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null}
        />
      )}

      {/* Post Preview Modal */}
      {previewPost && (
        <Portal>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text variant="titleMedium" style={{ flex: 1 }} numberOfLines={1}>
                  @{previewPost.ownerUsername || 'Post'}
                </Text>
                <IconButton icon="close" size={20} onPress={() => setPreviewPost(null)} />
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Image */}
                <Image
                  source={{ uri: getMediaUri(previewPost, 'large') }}
                  style={styles.modalImage}
                  contentFit="cover"
                />

                {/* Stats row */}
                <View style={styles.modalStatsRow}>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatValue}>👍 {previewPost.rightSwipes || 0}</Text>
                    <Text style={styles.modalStatLabel}>Right</Text>
                  </View>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatValue}>👎 {previewPost.leftSwipes || 0}</Text>
                    <Text style={styles.modalStatLabel}>Left</Text>
                  </View>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatValue}>🔁 {previewPost.shareCount || 0}</Text>
                    <Text style={styles.modalStatLabel}>Shared</Text>
                  </View>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatValue}>❤️ {previewPost.likeCount || 0}</Text>
                    <Text style={styles.modalStatLabel}>Likes</Text>
                  </View>
                  <View style={styles.modalStat}>
                    <Text style={styles.modalStatValue}>💬 {previewPost.commentCount || 0}</Text>
                    <Text style={styles.modalStatLabel}>Comments</Text>
                  </View>
                </View>

                {/* Caption */}
                {previewPost.caption ? (
                  <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                    <Text variant="bodySmall" numberOfLines={4} style={{ opacity: 0.7 }}>
                      {previewPost.caption}
                    </Text>
                  </View>
                ) : null}

                {/* Status controls */}
                <View style={styles.modalStatusRow}>
                  {(['active', 'suspend', 'ignore'] as const).map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusChip,
                        previewPost.status === s && styles.statusChipActive
                      ]}
                      onPress={async () => {
                        try {
                          await instagramService.updateVideoStatus(previewPost.id, {
                            status: s,
                            suspendDays: s === 'suspend' ? 1 : undefined
                          });
                          setPreviewPost(p => p ? { ...p, status: s } : p);
                          // Remove from list if now inactive
                          if (s !== 'active') {
                            setAllShares(prev => prev.filter(i =>
                              !(i.type === 'post' && i.post?.id === previewPost.id)
                            ));
                            setPreviewPost(null);
                          }
                        } catch (e) {
                          Alert.alert('Error', 'Failed to update post status');
                        }
                      }}
                    >
                      <Text style={[
                        styles.statusChipText,
                        previewPost.status === s && styles.statusChipTextActive
                      ]}>
                        {s === 'ignore' ? 'Inactive' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Action buttons */}
              <View style={{ padding: 16, flexDirection: 'row', gap: 12 }}>
                <Button
                  mode="outlined"
                  icon="instagram"
                  style={{ flex: 1 }}
                  onPress={() => {
                    const post = previewPost;
                    setPreviewPost(null);
                    handleSharePostDirectly(post);
                  }}
                >
                  Share
                </Button>
                <Button
                  mode="contained"
                  loading={sharingPost}
                  disabled={sharingPost}
                  icon="share"
                  style={{ flex: 1 }}
                  onPress={async () => {
                    if (!selectedProfile) return;
                    setSharingPost(true);
                    try {
                      await wrapInSpan('StorySharingScreen: markPostPosted', () =>
                        instagramService.markPostPosted(previewPost.id, selectedProfile.id, undefined)
                      );
                      // Open Instagram if possible
                      if (previewPost.permalink) {
                        Linking.openURL(previewPost.permalink).catch(() => {});
                      }
                      // Hide tile completely
                      setAllShares(prev => prev.filter(i => !(i.type === 'post' && i.post?.id === previewPost.id)));
                      setPreviewPost(null);
                      Alert.alert('Recorded', 'Story share recorded!');
                    } catch (err: any) {
                      Alert.alert('Error', err.message || 'Failed to record share');
                    } finally {
                      setSharingPost(false);
                    }
                  }}
                >
                  Mark as Shared
                </Button>
              </View>
            </View>
          </View>
        </Portal>
      )}

      {/* Share Confirmation Dialog */}
      <Portal>
        <Dialog visible={confirmShareVisible} onDismiss={() => setConfirmShareVisible(false)}>
          <Dialog.Title>Story Shared?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 10 }}>
              Did you successfully share this story to the target account?
            </Text>
            {selectedProfile && (
              <View style={styles.confirmationAccountRow}>
                {getProfilePicUri(selectedProfile) ? (
                  <Image 
                    source={{ uri: getProfilePicUri(selectedProfile) ?? undefined }} 
                    style={styles.confirmationAvatar} 
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.confirmationAvatar, { backgroundColor: getAvatarColor(selectedProfile.username), justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>
                      {selectedProfile.username.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text variant="titleMedium" style={styles.confirmationAccountName}>
                  @{selectedProfile.username}
                </Text>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmShareVisible(false)}>Cancel</Button>
            <Button mode="contained" loading={sharingPost} disabled={sharingPost} onPress={handleConfirmDirectPost}>Confirm</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Story Viewer Modal */}
      <StoryViewerModal
        visible={storyViewerVisible}
        profile={storyViewerProfile}
        onClose={() => {
          setStoryViewerVisible(false);
          setStoryViewerProfile(null);
        }}
      />
    </ScreenWrapper>
  );
}


const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  bold: {
    fontWeight: 'bold'
  },
  accountSelectorContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.02)'
  },
  selectorLabel: {
    fontWeight: 'bold',
    opacity: 0.8
  },
  avatarWrapper: {
    alignItems: 'center',
    gap: 4
  },
  avatarBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    borderColor: 'transparent',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center'
  },
  channelAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25
  },
  avatarLabel: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.6)',
    maxWidth: 70
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.07)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  sectionTitle: {
    fontWeight: 'bold'
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  gridCell: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
    position: 'relative'
  },
  cellImage: {
    width: '100%',
    height: '100%'
  },
  selectionOrderBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(98, 0, 238, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionOrderText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  groupTopInfo: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'column',
    alignItems: 'flex-start',
    zIndex: 5,
  },
  groupAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupAvatarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    overflow: 'hidden',
  },
  groupAvatarImage: {
    width: '100%',
    height: '100%',
  },
  groupAvatarFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarFallbackText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  groupAvatarExtra: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  groupAvatarExtraText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  groupPostCountBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  groupPostCountText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  groupBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupBottomTitle: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
    flex: 1,
  },
  groupSwipeScore: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  detailBackButton: {
    padding: 4,
  },
  statusControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  statusButton: {
    flex: 1,
  },
  detailGridScroll: {
    paddingBottom: 40,
  },
  shareIconBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(98, 0, 238, 0.95)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  itemIndexBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 5,
  },
  itemIndexText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  previewDialog: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewMediaImage: {
    width: '100%',
    height: 240,
    borderRadius: 8,
    backgroundColor: '#000000',
    marginBottom: 12,
  },
  previewStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  previewCaptionText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#333333',
  },
  statsBadgeRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  statsBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    flex: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#111',
  },
  modalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  modalStat: {
    alignItems: 'center',
    gap: 2,
  },
  modalStatValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalStatLabel: {
    fontSize: 10,
    opacity: 0.5,
  },
  modalStatusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  statusChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.15)',
    backgroundColor: 'transparent',
  },
  statusChipActive: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  statusChipTextActive: {
    color: '#ffffff',
  },
  confirmationAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    padding: 10,
    borderRadius: 8,
    gap: 10,
    marginTop: 8,
  },
  confirmationAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  confirmationAccountName: {
    fontWeight: 'bold',
    color: '#333333',
  },
  storyModalOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyProgressContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    zIndex: 20,
  },
  storyProgressBarTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    marginHorizontal: 2,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  storyProgressBarFill: {
    height: '100%',
    backgroundColor: '#ffffff',
  },
  storyHeader: {
    position: 'absolute',
    top: 65,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  storyHeaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  storyHeaderInfo: {
    flex: 1,
  },
  storyHeaderUsername: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  storyHeaderTime: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  storyCloseButton: {
    margin: 0,
  },
  storyMediaContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  storyDetailsSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    zIndex: 30,
  },
  storyDetailsCollapsed: {
    height: 110,
  },
  storyDetailsExpanded: {
    maxHeight: '60%',
  },
  storyDetailsDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  storyDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storyDetailsStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
    flexWrap: 'wrap',
  },
  storyDetailsStatBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  storyDetailsStatText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
});

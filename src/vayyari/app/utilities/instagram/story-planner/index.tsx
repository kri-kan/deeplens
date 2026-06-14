import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity, Alert, Dimensions, RefreshControl, BackHandler } from 'react-native';
import { Text, Button, IconButton, Checkbox, TextInput, useTheme, Card, Portal, Dialog, Modal, ActivityIndicator, Divider, Icon } from 'react-native-paper';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { instagramService, StoryGroup, InstagramPost, InstagramProfile, InstagramMediaType } from '@/services/instagram.service';
import { wrapInSpan } from '@/utils/telemetry';
import { getMediaUri } from '@/utils/instagram-helpers';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

interface UnifiedItem {
  type: 'post' | 'group';
  id: string;
  timestamp: string;
  post?: InstagramPost & { ownerUsername?: string; ownerProfilePictureUrl?: string };
  group?: StoryGroup;
}

export default function StoryPlannerDashboard() {
  const theme = useTheme();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [ownProfiles, setOwnProfiles] = useState<InstagramProfile[]>([]);
  const [allPosts, setAllPosts] = useState<InstagramPost[]>([]);
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  
  // Selection
  const [selectedItems, setSelectedItems] = useState<Map<string, UnifiedItem>>(new Map());

  // Pagination & Smart Loading State
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const LIMIT = 24;

  // Merge Preview Dialog State
  const [mergeDialogVisible, setMergeDialogVisible] = useState(false);
  const [mergeGroupName, setMergeGroupName] = useState('');
  const [mergeKeywords, setMergeKeywords] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());

  // Edit Group Dialog State
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [activeGroup, setActiveGroup] = useState<StoryGroup | null>(null);
  const [suspendDays, setSuspendDays] = useState('7');
  const [editGroupName, setEditGroupName] = useState('');
  const [editKeywords, setEditKeywords] = useState('');

  // Search Filter State
  const [searchQuery, setSearchQuery] = useState('');

  const getProfilePicUri = (p: any) => {
    if (!p) return null;
    const path = p.storagePath;
    const baseUrl = process.env.EXPO_PUBLIC_SEARCH_API_URL || '';
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

  // Load Data
  const loadData = async (isRefreshing = false, search = searchQuery) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // 1. Fetch own accounts
      const watchlist = await wrapInSpan('StoryPlannerDashboard: getWatchlist', () => 
        instagramService.getWatchlist()
      );
      const own = watchlist.filter(p => p.isOwnAccount);
      setOwnProfiles(own);
 
      // 2. Fetch first page of posts (offset = 0) with search filter
      const posts = await wrapInSpan('StoryPlannerDashboard: getOwnAccountsVideos', () => 
        instagramService.getOwnAccountsVideos('date', 'desc', LIMIT, 0, search)
      );
      const baseUrl = process.env.EXPO_PUBLIC_SEARCH_API_URL || '';
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const normalizedPosts = posts.map(post => {
        const avatarUri = post.ownerProfilePictureUrl?.startsWith('/')
          ? `${cleanBaseUrl}${post.ownerProfilePictureUrl}`
          : post.ownerProfilePictureUrl;
        return {
          ...post,
          ownerProfilePictureUrl: avatarUri
        };
      });
      setAllPosts(normalizedPosts);
      setOffset(0);
      setHasMore(normalizedPosts.length >= LIMIT);
 
      // 3. Fetch groups with search filter
      const storyGroups = await wrapInSpan('StoryPlannerDashboard: getStoryGroups', () => 
        instagramService.getStoryGroups(search)
      );
      setGroups(storyGroups);
    } catch (error) {
      console.error('Failed to load data', error);
      Alert.alert('Error', 'Failed to load story planner data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
 
  const handleRefresh = () => {
    loadData(true, searchQuery);
  };
 
  const loadMorePosts = async () => {
    if (loadingMore || !hasMore || loading || refreshing || ownProfiles.length === 0) return;
    
    setLoadingMore(true);
    try {
      const nextOffset = offset + LIMIT;
      const posts = await wrapInSpan('StoryPlannerDashboard: getOwnAccountsVideosMore', () => 
        instagramService.getOwnAccountsVideos('date', 'desc', LIMIT, nextOffset, searchQuery)
      );
      const baseUrl = process.env.EXPO_PUBLIC_SEARCH_API_URL || '';
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const normalizedPosts = posts.map(post => {
        const avatarUri = post.ownerProfilePictureUrl?.startsWith('/')
          ? `${cleanBaseUrl}${post.ownerProfilePictureUrl}`
          : post.ownerProfilePictureUrl;
        return {
          ...post,
          ownerProfilePictureUrl: avatarUri
        };
      });
 
      if (normalizedPosts.length > 0) {
        setAllPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const filtered = normalizedPosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...filtered];
        });
        setOffset(nextOffset);
      }
      
      setHasMore(normalizedPosts.length >= LIMIT);
    } catch (error) {
      console.error('Failed to load more posts', error);
    } finally {
      setLoadingMore(false);
    }
  };
 
  const isFirstRender = useRef(true);
 
  // Debounced search query trigger
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (searchQuery === '') {
      loadData(false, '');
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      loadData(false, searchQuery);
    }, 500);
 
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);
 
  useEffect(() => {
    loadData();
  }, []);

  // Back handler for clearing selection
  useFocusEffect(
    React.useCallback(() => {
      const backAction = () => {
        if (selectedItems.size > 0) {
          setSelectedItems(new Map());
          return true;
        }
        return false;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }, [selectedItems.size])
  );

  // Compute unified list
  // 1. Find all post IDs that are already grouped
  const groupedPostIds = new Set<string>();
  groups.forEach(g => {
    if (g.posts) {
      g.posts.forEach(p => groupedPostIds.add(p.id));
    }
  });

  // 2. Add ungrouped posts
  const unifiedList: UnifiedItem[] = allPosts
    .filter(p => !groupedPostIds.has(p.id))
    .map(p => ({
      type: 'post',
      id: p.id,
      timestamp: p.timestamp || '',
      post: p
    }));

  // 3. Add groups
  groups.forEach(g => {
    // Latest post timestamp in the group determines its sequence
    const latestPostTimestamp = g.posts && g.posts.length > 0
      ? g.posts.reduce((max, p) => p.timestamp && p.timestamp > max ? p.timestamp : max, '')
      : g.createdAt;

    unifiedList.push({
      type: 'group',
      id: g.id,
      timestamp: latestPostTimestamp || g.createdAt,
      group: g
    });
  });

  // 4. Sort unified list chronologically (newest first)
  unifiedList.sort((a, b) => {
    const da = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const db = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return db - da;
  });

  // Toggle selection
  const handleItemSelect = (item: UnifiedItem) => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, item);
      }
      return next;
    });
  };

  // Determine top and bottom merge items
  const getMergePreviewData = () => {
    const items = Array.from(selectedItems.values());
    if (items.length === 0) return null;
    if (items.length === 1 && items[0].type !== 'post') return null;

    const groupsInSelection = items.filter(item => item.type === 'group');

    let destinationItem: UnifiedItem;
    let mergedItems: UnifiedItem[] = [];

    if (groupsInSelection.length > 0) {
      // Oldest group remains alive (destination)
      groupsInSelection.sort((a, b) => {
        const d1 = new Date(a.group!.createdAt).getTime();
        const d2 = new Date(b.group!.createdAt).getTime();
        return d1 - d2;
      });
      destinationItem = groupsInSelection[0];
      mergedItems = items.filter(item => item.id !== destinationItem.id);
    } else {
      // No groups: oldest post becomes cover/destination
      const postsInSelection = [...items];
      postsInSelection.sort((a, b) => {
        const d1 = new Date(a.post!.timestamp || 0).getTime();
        const d2 = new Date(b.post!.timestamp || 0).getTime();
        return d1 - d2;
      });
      destinationItem = postsInSelection[0];
      mergedItems = items.filter(item => item.id !== destinationItem.id);
    }

    return { destinationItem, mergedItems };
  };


  const openMergeDialog = () => {
    const data = getMergePreviewData();
    if (!data) {
      Alert.alert('Selection Error', 'Please select two or more items to merge.');
      return;
    }

    const { destinationItem, mergedItems } = data;

    // Helper to get target watchlist ID from username
    const getProfileIdByUsername = (username: string): string | undefined => {
      if (!username) return undefined;
      const normalized = username.toLowerCase().trim();
      const found = ownProfiles.find(p => p.username.toLowerCase().trim() === normalized);
      return found?.id;
    };

    // Helper to get owner channel IDs for any UnifiedItem (post or group)
    const getOwnerIdsForItem = (item: UnifiedItem): string[] => {
      const ids: string[] = [];
      if (item.type === 'post' && item.post?.ownerUsername) {
        const id = getProfileIdByUsername(item.post.ownerUsername);
        if (id) ids.push(id);
      } else if (item.type === 'group') {
        if (item.group?.posts) {
          item.group.posts.forEach(gp => {
            const foundPost = allPosts.find(ap => ap.id === gp.id) as any;
            if (foundPost?.ownerUsername) {
              const id = getProfileIdByUsername(foundPost.ownerUsername);
              if (id && !ids.includes(id)) ids.push(id);
            }
          });
        }
        if (ids.length === 0 && item.group?.eligibleAccounts) {
          item.group.eligibleAccounts.forEach(accId => {
            if (!ids.includes(accId)) ids.push(accId);
          });
        }
      }
      return ids;
    };

    const defaultUsernames = ['vayyari_fashions', 'everydayvayyari', 'editionsbyvayyari'];
    const defaultChannelIds = ownProfiles
      .filter(p => defaultUsernames.includes(p.username.toLowerCase()))
      .map(p => p.id);

    if (destinationItem.type === 'group') {
      setMergeGroupName(destinationItem.group!.name);
      setMergeKeywords(destinationItem.group!.keywords || '');
      
      // For existing groups: union of existing selected + merged items owner channels
      const initialTargets = new Set<string>(destinationItem.group!.eligibleAccounts || []);
      mergedItems.forEach(item => {
        getOwnerIdsForItem(item).forEach(id => initialTargets.add(id));
      });
      setSelectedTargets(initialTargets);
    } else {
      setMergeGroupName('');
      setMergeKeywords('');
      
      // For new groups: default channels + owner channels of all posts being grouped
      const initialTargets = new Set<string>(defaultChannelIds);
      getOwnerIdsForItem(destinationItem).forEach(id => initialTargets.add(id));
      mergedItems.forEach(item => {
        getOwnerIdsForItem(item).forEach(id => initialTargets.add(id));
      });
      setSelectedTargets(initialTargets);
    }

    setMergeDialogVisible(true);
  };

  const handleMergeConfirm = async () => {
    const data = getMergePreviewData();
    if (!data) return;

    const { destinationItem, mergedItems } = data;
    setLoading(true);
    setMergeDialogVisible(false);

    try {
      if (destinationItem.type === 'group') {
        const parentId = destinationItem.id;
        
        // 1. Merge groups
        const groupsToMerge = mergedItems.filter(item => item.type === 'group');
        for (const g of groupsToMerge) {
          await wrapInSpan('StoryPlannerDashboard: mergeStoryGroups', () => 
            instagramService.mergeStoryGroups(parentId, g.id)
          );
        }

        // 2. Add posts
        const postsToMerge = mergedItems.filter(item => item.type === 'post');
        if (postsToMerge.length > 0) {
          const existingPostIds = destinationItem.group!.posts ? destinationItem.group!.posts.map(p => p.id) : [];
          const newPostIds = postsToMerge.map(item => item.id);
          const combinedPostIds = Array.from(new Set([...existingPostIds, ...newPostIds]));
          
          await wrapInSpan('StoryPlannerDashboard: updateStoryGroupPosts', () => 
            instagramService.updateStoryGroup(parentId, {
              postIds: combinedPostIds
            })
          );
        }

        // 3. Rename group, update keywords, and save target eligibilities (union)
        const updatePayload: any = {
          targetWatchlistIds: Array.from(selectedTargets)
        };
        if (mergeGroupName.trim() && mergeGroupName.trim() !== destinationItem.group!.name) {
          updatePayload.name = mergeGroupName.trim();
        }
        if (mergeKeywords.trim() !== (destinationItem.group!.keywords || '')) {
          updatePayload.keywords = mergeKeywords.trim();
        }
        await wrapInSpan('StoryPlannerDashboard: updateStoryGroupDetails', () => 
          instagramService.updateStoryGroup(parentId, updatePayload)
        );
      } else {
        // Destination is a post. Only posts were selected.
        const postIds = [destinationItem.id, ...mergedItems.map(item => item.id)];
        await wrapInSpan('StoryPlannerDashboard: createStoryGroup', () => 
          instagramService.createStoryGroup({
            name: mergeGroupName.trim() || 'New Story Group',
            postIds,
            targetWatchlistIds: Array.from(selectedTargets),
            keywords: mergeKeywords.trim()
          })
        );
      }

      setSelectedItems(new Map());
      loadData();
      Alert.alert('Success', 'Items linked successfully.');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Merge Failed', error.message || 'Failed to complete merge');
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: 'active' | 'suspend' | 'ignore') => {
    if (!activeGroup) return;

    try {
      setLoading(true);
      const payload: any = { status };
      if (status === 'suspend') {
        payload.suspendDays = parseInt(suspendDays, 10) || 7;
      }
      await wrapInSpan('StoryPlannerDashboard: updateStatus', () => 
        instagramService.updateStoryGroup(activeGroup.id, payload)
      );
      setEditDialogVisible(false);
      loadData();
      Alert.alert('Success', 'Status updated.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update status.');
      setLoading(false);
    }
  };

  const handleUpdateGroupDetails = async () => {
    if (!activeGroup) return;

    try {
      setLoading(true);
      await wrapInSpan('StoryPlannerDashboard: updateGroupDetails', () => 
        instagramService.updateStoryGroup(activeGroup.id, {
          name: editGroupName.trim(),
          keywords: editKeywords.trim()
        })
      );
      setEditDialogVisible(false);
      loadData();
      Alert.alert('Success', 'Group details updated.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update group details.');
      setLoading(false);
    }
  };

  const handleRenew = async (groupId: string) => {
    try {
      setLoading(true);
      await wrapInSpan('StoryPlannerDashboard: renewGroup', () => 
        instagramService.renewStoryGroup(groupId)
      );
      setEditDialogVisible(false);
      loadData();
      Alert.alert('Success', 'Eligibility renewed.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to renew.');
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this story group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await wrapInSpan('StoryPlannerDashboard: deleteGroup', () => 
                instagramService.deleteStoryGroup(groupId)
              );
              setEditDialogVisible(false);
              loadData();
              Alert.alert('Success', 'Group deleted.');
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to delete group.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Render Unified Grid Item
  const renderUnifiedGridItem = ({ item }: { item: UnifiedItem }) => {
    const isSelected = selectedItems.has(item.id);
    const selectionMode = selectedItems.size > 0;
    
    if (item.type === 'post') {
      const post = item.post!;
      return (
        <TouchableOpacity 
          style={[styles.gridCell, isSelected && styles.gridCellSelected]}
          onPress={() => handleItemSelect(item)}
          onLongPress={() => handleItemSelect(item)}
          delayLongPress={300}
          activeOpacity={0.8}
        >
          <Image 
            source={{ uri: getMediaUri(post) }} 
            style={[styles.cellImage, isSelected && { opacity: 0.7 }]} 
            contentFit="cover"
            transition={200}
          />
          
          {selectionMode ? (
            <View style={styles.selectionIndicator}>
              <Icon 
                source={isSelected ? "check-circle" : "circle-outline"} 
                size={22} 
                color={isSelected ? theme.colors.primary : "white"} 
              />
            </View>
          ) : post.ownerProfilePictureUrl ? (
            <Image 
              source={{ uri: post.ownerProfilePictureUrl }} 
              style={styles.ownerAvatar} 
            />
          ) : (
            <Text variant="labelSmall" style={styles.ownerBadge} numberOfLines={1}>
              @{post.ownerUsername}
            </Text>
          )}

          {post.mediaType === InstagramMediaType.VIDEO && !selectionMode && (
            <View style={styles.centerPlayButton}>
              <Icon source="play" size={14} color="white" />
            </View>
          )}

          {!selectionMode && (
            <View style={styles.videoStats}>
              <View style={styles.statsRow}>
                <Text style={styles.statsText}>❤️ {(post.likeCount || 0).toLocaleString()}</Text>
                <Text style={styles.statsText}>💬 {(post.commentCount || 0).toLocaleString()}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      );
    } else {
      const group = item.group!;
      const starredPost = group.posts?.find(p => (p as any).isStarred) || group.posts?.[0];

      return (
        <TouchableOpacity 
          style={[
            styles.gridCell, 
            isSelected && styles.gridCellSelected,
            group.needsReview && !isSelected && { borderColor: theme.colors.error, borderWidth: 1 }
          ]}
          onPress={() => {
            if (selectionMode) {
              handleItemSelect(item);
            } else {
              setActiveGroup(group);
              setEditGroupName(group.name);
              setEditKeywords(group.keywords || '');
              setEditDialogVisible(true);
            }
          }}
          onLongPress={() => handleItemSelect(item)}
          delayLongPress={300}
          activeOpacity={0.8}
        >
          <Image 
            source={{ uri: starredPost ? getMediaUri(starredPost) : '' }} 
            style={[styles.cellImage, isSelected && { opacity: 0.7 }]} 
            contentFit="cover"
            transition={200}
          />
          
          {selectionMode ? (
            <View style={styles.selectionIndicator}>
              <Icon 
                source={isSelected ? "check-circle" : "circle-outline"} 
                size={22} 
                color={isSelected ? theme.colors.primary : "white"} 
              />
            </View>
          ) : (
            <>
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
                {group.needsReview && (
                  <Text style={styles.groupNeedsReviewBadge}>⚠️ Review</Text>
                )}
              </View>
            </>
          )}
        </TouchableOpacity>
      );
    }
  };

  const renderMergedItemsCollage = (mergedItems: UnifiedItem[]) => {
    if (mergedItems.length === 1) {
      const item = mergedItems[0];
      const mediaItem = item.type === 'post' 
        ? item.post!
        : (item.group!.posts?.find(p => (p as any).isStarred) || item.group!.posts?.[0]);
      return (
        <Image source={{ uri: getMediaUri(mediaItem) }} style={styles.tileBackground} contentFit="cover" />
      );
    }
    
    if (mergedItems.length === 2) {
      const media1 = mergedItems[0].type === 'post' 
        ? mergedItems[0].post!
        : (mergedItems[0].group!.posts?.find(p => (p as any).isStarred) || mergedItems[0].group!.posts?.[0]);
      const media2 = mergedItems[1].type === 'post' 
        ? mergedItems[1].post!
        : (mergedItems[1].group!.posts?.find(p => (p as any).isStarred) || mergedItems[1].group!.posts?.[0]);
      
      return (
        <View style={{ flexDirection: 'row', width: '100%', height: '100%' }}>
          <Image source={{ uri: getMediaUri(media1) }} style={{ width: '50%', height: '100%' }} contentFit="cover" />
          <Image source={{ uri: getMediaUri(media2) }} style={{ width: '50%', height: '100%' }} contentFit="cover" />
        </View>
      );
    }

    if (mergedItems.length === 3) {
      const media1 = mergedItems[0].type === 'post' 
        ? mergedItems[0].post!
        : (mergedItems[0].group!.posts?.find(p => (p as any).isStarred) || mergedItems[0].group!.posts?.[0]);
      const media2 = mergedItems[1].type === 'post' 
        ? mergedItems[1].post!
        : (mergedItems[1].group!.posts?.find(p => (p as any).isStarred) || mergedItems[1].group!.posts?.[0]);
      const media3 = mergedItems[2].type === 'post' 
        ? mergedItems[2].post!
        : (mergedItems[2].group!.posts?.find(p => (p as any).isStarred) || mergedItems[2].group!.posts?.[0]);

      return (
        <View style={{ flexDirection: 'row', width: '100%', height: '100%' }}>
          <Image source={{ uri: getMediaUri(media1) }} style={{ width: '50%', height: '100%' }} contentFit="cover" />
          <View style={{ width: '50%', height: '100%' }}>
            <Image source={{ uri: getMediaUri(media2) }} style={{ width: '100%', height: '50%' }} contentFit="cover" />
            <Image source={{ uri: getMediaUri(media3) }} style={{ width: '100%', height: '50%' }} contentFit="cover" />
          </View>
        </View>
      );
    }

    // 4 or more items
    const medias = mergedItems.slice(0, 3).map(item => {
      return item.type === 'post' 
        ? item.post!
        : (item.group!.posts?.find(p => (p as any).isStarred) || item.group!.posts?.[0]);
    });

    const lastItem = mergedItems[3];
    const media4 = lastItem.type === 'post'
      ? lastItem.post!
      : (lastItem.group!.posts?.find(p => (p as any).isStarred) || lastItem.group!.posts?.[0]);

    const remaining = mergedItems.length - 4;

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', height: '100%' }}>
        <Image source={{ uri: getMediaUri(medias[0]) }} style={{ width: '50%', height: '50%' }} contentFit="cover" />
        <Image source={{ uri: getMediaUri(medias[1]) }} style={{ width: '50%', height: '50%' }} contentFit="cover" />
        <Image source={{ uri: getMediaUri(medias[2]) }} style={{ width: '50%', height: '50%' }} contentFit="cover" />
        <View style={{ width: '50%', height: '50%', position: 'relative' }}>
          <Image source={{ uri: getMediaUri(media4) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          {remaining > 0 && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>+{remaining + 1}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const mergeData = getMergePreviewData();

  const filteredList = unifiedList;

  const renderHeaderTitle = () => {
    if (selectedItems.size === 0) {
      return "Story Planner";
    }

    const items = Array.from(selectedItems.values());

    return (
      <View style={styles.headerRow}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.headerScrollContent}
          style={{ flex: 1 }}
        >
          {items.map(item => {
            const starredPost = item.type === 'group' 
              ? (item.group?.posts?.find(p => (p as any).isStarred) || item.group?.posts?.[0])
              : item.post;
            const isGroup = item.type === 'group';

            return (
              <View key={item.id} style={styles.headerItemContainer}>
                <Image 
                  source={{ uri: starredPost ? getMediaUri(starredPost) : '' }} 
                  style={styles.headerItemImage}
                  contentFit="cover"
                />
                {isGroup && (
                  <View style={styles.headerItemGroupBadge}>
                    <Icon source="folder" size={10} color="white" />
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.headerItemCloseBtn}
                  activeOpacity={0.8}
                  onPress={() => handleItemSelect(item)}
                >
                  <Icon source="close" size={10} color="white" />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>

        <Button
          mode="contained"
          compact
          icon="link"
          style={styles.headerLinkButton}
          labelStyle={{ fontSize: 11, marginHorizontal: 8 }}
          onPress={openMergeDialog}
        >
          Link
        </Button>
      </View>
    );
  };

  return (
    <ScreenWrapper title={renderHeaderTitle()} subtitle="Curation Dashboard" withScrollView={false}>
      <Stack.Screen options={{ headerTitle: selectedItems.size > 0 ? `${selectedItems.size} Selected` : 'Story Planner' }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12 }}>Loading story timeline...</Text>
        </View>
      ) : (
        <>
          <View style={[
            styles.searchBarContainer,
            selectedItems.size > 0 && { marginTop: -6 }
          ]}>
            <TextInput
              placeholder="Search name, keywords, caption..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              mode="flat"
              dense
              activeUnderlineColor="transparent"
              underlineColor="transparent"
              style={styles.searchBarInput}
              left={<TextInput.Icon icon="magnify" size={20} />}
              right={searchQuery ? <TextInput.Icon icon="close" size={20} onPress={() => setSearchQuery('')} /> : null}
            />
          </View>
          <FlatList
            data={filteredList}
            renderItem={renderUnifiedGridItem}
            keyExtractor={item => `${item.type}-${item.id}`}
            numColumns={3}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 80 }}
            onEndReached={loadMorePosts}
            onEndReachedThreshold={0.5}
            removeClippedSubviews={true}
            maxToRenderPerBatch={12}
            windowSize={5}
            initialNumToRender={12}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <ActivityIndicator animating={true} color={theme.colors.primary} />
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <IconButton icon="alert-circle-outline" size={48} style={{ opacity: 0.3 }} />
                <Text variant="bodyLarge" style={{ opacity: 0.5 }}>No items found</Text>
              </View>
            }
          />
        </>
      )}



      {/* Merge Preview Bottom Sheet Modal */}
      <Portal>
        <Modal
          visible={mergeDialogVisible}
          onDismiss={() => setMergeDialogVisible(false)}
          contentContainerStyle={[
            styles.bottomSheetContainer, 
            { backgroundColor: theme.colors.elevation.level3 }
          ]}
        >
          {/* Drag Handle Indicator */}
          <View style={styles.dragHandle} />

          {/* Bottom Sheet Title */}
          <Text variant="titleLarge" style={styles.bottomSheetTitle}>
            Link / Merge Preview
          </Text>

          {/* Scrollable Content */}
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bottomSheetScrollContent}
            style={{ maxHeight: '72%' }}
          >
            {mergeData && (
              <View style={styles.mergePreviewContainer}>
                
                {mergeData.mergedItems.length > 0 ? (
                  <>
                    {/* Left Tile: New Item being merged */}
                    <View style={styles.previewSection}>
                      <Text variant="labelSmall" style={styles.previewSectionLabel}>NEW ITEM BEING MERGED</Text>
                      <View style={styles.previewTileSquare}>
                        {renderMergedItemsCollage(mergeData.mergedItems)}
                        <View style={styles.tileOverlay}>
                          <Text style={styles.tileOverlayText} numberOfLines={1}>
                            {mergeData.mergedItems.length === 1 
                              ? (mergeData.mergedItems[0].type === 'post' ? 'Ungrouped Reel' : mergeData.mergedItems[0].group!.name)
                              : `${mergeData.mergedItems.length} items`}
                          </Text>
                          <Text style={styles.tileOverlaySubtitle} numberOfLines={1}>
                            {mergeData.mergedItems.length === 1 
                              ? (mergeData.mergedItems[0].type === 'post' ? (mergeData.mergedItems[0].post!.caption || 'No caption') : `${mergeData.mergedItems[0].group!.posts?.length || 0} reels`)
                              : 'Merging multiple files'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Icon source="arrow-right-bold" size={24} color={theme.colors.onSurfaceVariant} />
                  </>
                ) : null}

                {/* Right Tile: Group being merged into / Post to be grouped */}
                <View style={styles.previewSection}>
                  <Text variant="labelSmall" style={styles.previewSectionLabel}>
                    {mergeData.mergedItems.length === 0 ? 'POST TO BE GROUPED' : 'MERGING INTO'}
                  </Text>
                  
                  <View style={styles.previewTileSquare}>
                    {/* Destination Cover Image */}
                    <Image 
                      source={{ 
                        uri: mergeData.destinationItem.type === 'post'
                          ? getMediaUri(mergeData.destinationItem.post!)
                          : getMediaUri(mergeData.destinationItem.group!.posts?.find(p => (p as any).isStarred) || mergeData.destinationItem.group!.posts?.[0])
                      }} 
                      style={styles.tileBackground}
                      contentFit="cover"
                    />
                    
                    {/* Small tiles adjusted to the group tile (preview overlay) */}
                    <View style={styles.bottomTileSmallTiles}>
                      <Text style={styles.bottomTileSmallTilesTitle} numberOfLines={1}>
                        {mergeData.destinationItem.type === 'group' 
                          ? `Destination: ${mergeData.destinationItem.group!.name}`
                          : 'Selected Reel (Group cover)'}
                      </Text>
                      
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.smallTilesScroll}
                      >
                        {mergeData.destinationItem.type === 'group' ? (
                          mergeData.destinationItem.group!.posts?.map((p, idx) => (
                            <Image 
                              key={p.id || idx} 
                              source={{ uri: getMediaUri(p) }} 
                              style={styles.smallTileItemImage} 
                              contentFit="cover"
                            />
                          ))
                        ) : (
                          <Image 
                            source={{ uri: getMediaUri(mergeData.destinationItem.post!) }} 
                            style={styles.smallTileItemImage} 
                            contentFit="cover"
                          />
                        )}
                      </ScrollView>
                    </View>
                  </View>
                </View>
              </View>
            )}

            <Divider style={{ marginVertical: 16 }} />

            <TextInput
              label="Group Name"
              value={mergeGroupName}
              onChangeText={setMergeGroupName}
              mode="outlined"
              placeholder="e.g. Summer Silks"
              style={{ marginBottom: 12 }}
            />

            <TextInput
              label="Keywords (comma-separated)"
              value={mergeKeywords}
              onChangeText={setMergeKeywords}
              mode="outlined"
              placeholder="e.g. summer, silks, floral"
              style={{ marginBottom: 16 }}
            />

            {mergeData?.destinationItem.type === 'post' && (
              <>
                <Text variant="labelMedium" style={{ marginBottom: 8, paddingHorizontal: 4 }}>Target Eligibilities:</Text>
                <View style={styles.eligibilityRow}>
                  {ownProfiles.map(p => {
                    const isChecked = selectedTargets.has(p.id);
                    const baseUrl = process.env.EXPO_PUBLIC_SEARCH_API_URL || '';
                    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
                    const avatarUri = p.storagePath
                      ? `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(p.storagePath)}`
                      : p.profilePictureUrl;

                    return (
                      <View key={p.id} style={styles.eligibilityItem}>
                        <TouchableOpacity 
                          onPress={() => {
                            setSelectedTargets(prev => {
                              const next = new Set(prev);
                              if (next.has(p.id)) next.delete(p.id);
                              else next.add(p.id);
                              return next;
                            });
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={[
                            styles.eligibilityAvatarContainer, 
                            isChecked && { borderColor: theme.colors.primary }
                          ]}>
                            {avatarUri ? (
                              <Image source={{ uri: avatarUri }} style={styles.eligibilityAvatar} contentFit="cover" />
                            ) : (
                              <View style={[styles.eligibilityAvatar, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{p.username.substring(0, 2).toUpperCase()}</Text>
                              </View>
                            )}
                            {isChecked && (
                              <View style={[styles.eligibilityCheckBadge, { backgroundColor: theme.colors.primary }]}>
                                <Icon source="check" size={10} color="white" />
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                        <Text style={styles.eligibilityText} numberOfLines={1}>@{p.username}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          <Divider style={{ marginVertical: 12 }} />

          {/* Action Buttons */}
          <View style={styles.bottomSheetActions}>
            <Button 
              mode="outlined" 
              style={{ flex: 1 }} 
              onPress={() => setMergeDialogVisible(false)}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              style={{ flex: 1 }} 
              onPress={handleMergeConfirm}
            >
              Confirm Merge
            </Button>
          </View>
        </Modal>

        {/* Edit Group Options Dialog */}
        <Dialog visible={editDialogVisible} onDismiss={() => setEditDialogVisible(false)}>
          <Dialog.Title>Edit Group: {activeGroup?.name}</Dialog.Title>
          <ScrollView style={{ maxHeight: 400 }}>
            <Dialog.Content style={{ gap: 12 }}>
              <TextInput
                label="Group Name"
                value={editGroupName}
                onChangeText={setEditGroupName}
                mode="outlined"
                placeholder="e.g. Summer Silks"
              />

              <TextInput
                label="Keywords (comma-separated)"
                value={editKeywords}
                onChangeText={setEditKeywords}
                mode="outlined"
                placeholder="e.g. summer, silks, floral"
              />

              <Button 
                mode="contained" 
                icon="content-save-outline" 
                onPress={handleUpdateGroupDetails}
                style={{ marginVertical: 4 }}
              >
                Save Details
              </Button>

              <Divider style={{ marginVertical: 4 }} />

              <Text variant="labelMedium">Manage status, renew eligibility, or delete group:</Text>
              
              {activeGroup?.needsReview && (
                <View style={{ backgroundColor: theme.colors.errorContainer, padding: 12, borderRadius: 8, marginVertical: 4 }}>
                  <Text style={{ color: theme.colors.onErrorContainer, fontWeight: 'bold' }}>⚠️ Needs Review / Renew</Text>
                  <Text style={{ color: theme.colors.onErrorContainer, fontSize: 11, marginTop: 2 }}>
                    Suspension ended or posts are older than 15 days.
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 4 }}>
                <Button 
                  mode={activeGroup?.status === 'active' ? 'contained' : 'contained-tonal'} 
                  icon="check-circle-outline" 
                  style={{ flex: 1, backgroundColor: activeGroup?.status === 'active' ? 'green' : undefined }} 
                  onPress={() => handleRenew(activeGroup!.id)}
                >
                  Renew (Active)
                </Button>
                <Button 
                  mode={activeGroup?.status === 'ignore' ? 'contained' : 'contained-tonal'} 
                  icon="eye-off-outline" 
                  style={{ flex: 1, backgroundColor: activeGroup?.status === 'ignore' ? 'green' : undefined }} 
                  onPress={() => handleUpdateStatus('ignore')}
                >
                  Ignore
                </Button>
              </View>

              <Divider style={{ marginVertical: 4 }} />

              <Text variant="labelMedium">Suspend Group:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <TextInput
                  label="Days"
                  value={suspendDays}
                  onChangeText={setSuspendDays}
                  keyboardType="numeric"
                  mode="outlined"
                  style={{ width: 80, height: 42 }}
                />
                <Button 
                  mode={activeGroup?.status === 'suspend' ? 'contained' : 'contained-tonal'} 
                  icon="clock-alert-outline" 
                  style={{ backgroundColor: activeGroup?.status === 'suspend' ? 'green' : undefined }}
                  onPress={() => handleUpdateStatus('suspend')}
                >
                  Suspend
                </Button>
              </View>

              <Divider style={{ marginVertical: 4 }} />

              <Button mode="outlined" icon="delete-outline" textColor={theme.colors.error} style={{ borderColor: theme.colors.error }} onPress={() => handleDeleteGroup(activeGroup!.id)}>
                Delete Group
              </Button>
            </Dialog.Content>
          </ScrollView>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 60,
    gap: 8,
  },
  headerScrollContent: {
    alignItems: 'center',
    gap: 12,
    paddingRight: 8,
    paddingVertical: 4,
  },
  headerItemContainer: {
    width: 42,
    height: 42,
    borderRadius: 8,
    overflow: 'visible',
    position: 'relative',
  },
  headerItemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  headerItemGroupBadge: {
    position: 'absolute',
    bottom: -3,
    left: -3,
    backgroundColor: '#6200ee',
    borderRadius: 4,
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerItemCloseBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  headerLinkButton: {
    borderRadius: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  gridCell: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  gridCellSelected: {
    borderColor: '#6200ee',
    borderWidth: 2,
  },
  cellImage: {
    width: '100%',
    height: '100%',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
  },
  ownerBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 'bold',
  },
  ownerAvatar: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  centerPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -16,
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  videoStats: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    minHeight: 24,
  },
  statsRow: {
    flexDirection: 'row', 
    gap: 8,
  },
  statsText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  // Group-specific styles
  groupHeaderOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(98, 0, 238, 0.8)',
    borderRadius: 4,
    paddingRight: 6,
  },
  groupHeaderText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  groupStats: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    minHeight: 24,
  },
  groupStatsText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  groupNeedsReviewText: {
    color: '#ffb300',
    fontSize: 9,
    fontWeight: 'bold',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 8,
  },
  actionBarText: {
    fontWeight: 'bold',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  mergePreviewContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginVertical: 10,
  },
  previewSection: {
    alignItems: 'center',
    gap: 4,
  },
  previewSectionLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    opacity: 0.6,
  },
  previewTileSquare: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.05)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  tileBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  tileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tileOverlayText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tileOverlaySubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 7,
    textAlign: 'center',
    marginTop: 1,
  },
  bottomTileSmallTiles: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  bottomTileSmallTilesTitle: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
    opacity: 0.8,
  },
  smallTilesScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallTilesScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallTileItemImage: {
    width: 20,
    height: 20,
    borderRadius: 2,
    marginHorizontal: 1.5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  eligibilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 8,
    justifyContent: 'center',
  },
  eligibilityItem: {
    alignItems: 'center',
    width: 64,
  },
  eligibilityAvatarContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eligibilityAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  eligibilityCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  eligibilityText: {
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.7,
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 28, // safe padding for system home bar
    maxHeight: '85%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  bottomSheetScrollContent: {
    paddingBottom: 16,
  },
  bottomSheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  searchBarContainer: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 6,
    backgroundColor: 'transparent',
  },
  searchBarInput: {
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
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
  groupNeedsReviewBadge: {
    color: '#ffb300',
    fontSize: 8,
    fontWeight: 'bold',
  },
});

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Dimensions } from 'react-native';
import { Text, Button, Divider, useTheme, ActivityIndicator, Portal, Dialog, IconButton, TextInput, Icon } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { instagramService, StoryGroup, InstagramPost, InstagramProfile } from '@/services/instagram.service';
import { wrapInSpan } from '@/utils/telemetry';
import { getMediaUri } from '@/utils/instagram-helpers';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

export default function GroupDetailScreen() {
  const { groupId, profileId } = useLocalSearchParams<{ groupId: string; profileId: string }>();
  const theme = useTheme();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<StoryGroup | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<InstagramProfile | null>(null);
  
  // Dialog States
  const [previewPost, setPreviewPost] = useState<InstagramPost | null>(null);
  const [confirmShareVisible, setConfirmShareVisible] = useState(false);
  const [suspendDialogVisible, setSuspendDialogVisible] = useState(false);
  const [suspendDays, setSuspendDays] = useState('7');

  // Load Group Details & Profiles
  const loadData = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      // 1. Fetch group
      const fetchedGroup = await wrapInSpan('GroupDetailScreen: getStoryGroup', () => 
        instagramService.getStoryGroup(groupId)
      );
      setGroup(fetchedGroup);

      // 2. Fetch profile if profileId provided
      if (profileId) {
        const watchlist = await wrapInSpan('GroupDetailScreen: getWatchlist', () => 
          instagramService.getWatchlist()
        );
        const profile = watchlist.find(p => p.id === profileId);
        if (profile) {
          setSelectedProfile(profile);
        }
      }
    } catch (error) {
      console.error('Failed to load group details', error);
      Alert.alert('Error', 'Failed to load group details.');
    } finally {
      setLoading(false);
    }
  };

  const getProfilePicUri = (p: InstagramProfile) => {
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

  useEffect(() => {
    loadData();
  }, [groupId, profileId]);

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
      setConfirmShareVisible(true);
    } catch (error) {
      console.error('Failed to open link', error);
      Alert.alert('Error', 'Failed to open Instagram.');
    }
  };

  const handleToggleStar = async (post: InstagramPost) => {
    if (!group) return;
    const isCurrentlyStarred = !!post.isStarred;

    // Optimistic UI update: Toggle current target post, clear all others in the group
    const updatedPosts = group.posts.map(p => ({
      ...p,
      isStarred: p.id === post.id ? !isCurrentlyStarred : false
    }));

    // Re-sort posts so that the starred post is ordered first
    const sortedPosts = [...updatedPosts].sort((a, b) => {
      const aStarred = a.isStarred ? 1 : 0;
      const bStarred = b.isStarred ? 1 : 0;
      return bStarred - aStarred;
    });

    setGroup({
      ...group,
      posts: sortedPosts
    });

    try {
      const starredPostIds = isCurrentlyStarred ? [] : [post.id];
      await wrapInSpan('GroupDetailScreen: updateStoryGroupStarred', () => 
        instagramService.updateStoryGroup(group.id, { starredPostIds })
      );
      
      // Reload details from server to confirm status and DB state
      const fetchedGroup = await wrapInSpan('GroupDetailScreen: getStoryGroupReload', () => 
        instagramService.getStoryGroup(group.id)
      );
      setGroup(fetchedGroup);
    } catch (error) {
      console.error('Failed to update starred status', error);
      Alert.alert('Error', 'Failed to update starred status.');
      // Revert to original database state on error
      loadData();
    }
  };

  const handleConfirmDirectPost = async () => {
    if (!group || !selectedProfile) return;
    try {
      setLoading(true);
      await wrapInSpan('GroupDetailScreen: markGroupPosted', () => 
        instagramService.markGroupPosted(group.id, selectedProfile.id)
      );
      setConfirmShareVisible(false);
      
      // Go back to the story sharing list screen
      router.back();
      Alert.alert('Success', 'Story posting recorded.');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to record story post');
    } finally {
      setLoading(false);
    }
  };

  const updateGroupStatusDirect = async (status: 'active' | 'suspend' | 'ignore', days?: number) => {
    if (!group) return;
    try {
      setLoading(true);
      const payload: any = { status };
      if (status === 'suspend' && days) {
        payload.suspendDays = days;
      }
      await wrapInSpan('GroupDetailScreen: updateStoryGroupStatus', () => 
        instagramService.updateStoryGroup(group.id, payload)
      );
      
      if (status === 'active') {
        setGroup({ ...group, status });
        Alert.alert('Success', `Group status set to ${status.toUpperCase()}.`);
      } else {
        // If suspended or ignored, it shouldn't show in sharing list anymore, so go back
        router.back();
        Alert.alert('Success', `Group status set to ${status.toUpperCase()} and removed from active list.`);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendSubmitDirect = () => {
    const days = parseInt(suspendDays, 10) || 7;
    setSuspendDialogVisible(false);
    updateGroupStatusDirect('suspend', days);
  };

  if (loading && !group) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 12 }}>Loading details...</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.center}>
        <Text>Group not found.</Text>
        <Button onPress={() => router.back()} style={{ marginTop: 12 }}>Go Back</Button>
      </View>
    );
  }

  const postCount = group.posts?.length || 0;

  return (
    <ScreenWrapper title={group.name} subtitle={`${postCount} posts in group`} withScrollView={false}>
      <Stack.Screen options={{ headerTitle: group.name }} />

      <View style={{ flex: 1 }}>
        {/* Status controls */}
        <View style={styles.statusControlBar}>
          <Text variant="labelMedium" style={{ marginRight: 8, opacity: 0.7 }}>Group Status:</Text>
          <Button
            mode={group.status === 'active' ? 'contained' : 'outlined'}
            compact
            style={styles.statusButton}
            labelStyle={{ fontSize: 10, fontWeight: 'bold' }}
            onPress={() => updateGroupStatusDirect('active')}
          >
            Active
          </Button>
          <Button
            mode={group.status === 'suspend' ? 'contained' : 'outlined'}
            compact
            style={styles.statusButton}
            labelStyle={{ fontSize: 10, fontWeight: 'bold' }}
            onPress={() => setSuspendDialogVisible(true)}
          >
            Suspend
          </Button>
          <Button
            mode={group.status === 'ignore' ? 'contained' : 'outlined'}
            compact
            style={styles.statusButton}
            labelStyle={{ fontSize: 10, fontWeight: 'bold' }}
            onPress={() => updateGroupStatusDirect('ignore')}
          >
            Ignore
          </Button>
        </View>

        <Divider />

        {/* 3-Column Grid of Post Tiles */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.detailGridScroll}>
          <View style={styles.gridContainer}>
            {group.posts?.map((post, index) => {
              return (
                <TouchableOpacity
                  key={post.id || index}
                  style={styles.gridCell}
                  activeOpacity={0.8}
                  onPress={() => setPreviewPost(post)}
                  onLongPress={() => setPreviewPost(post)}
                  delayLongPress={200}
                >
                  <Image
                    source={{ uri: getMediaUri(post, 'medium') }}
                    style={styles.cellImage}
                    contentFit="cover"
                  />
                  
                  {/* Share button overlay */}
                  <TouchableOpacity
                    style={styles.shareIconBadge}
                    activeOpacity={0.7}
                    onPress={() => handleSharePostDirectly(post)}
                  >
                    <Icon source="instagram" size={16} color="white" />
                  </TouchableOpacity>

                  {/* Star/Unstar button overlay */}
                  <TouchableOpacity
                    style={[
                      styles.starIconBadge,
                      post.isStarred && styles.starIconBadgeStarred
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleToggleStar(post)}
                  >
                    <Icon 
                      source={post.isStarred ? "star" : "star-outline"} 
                      size={16} 
                      color={post.isStarred ? "#FFD700" : "white"} 
                    />
                  </TouchableOpacity>
                  
                  {/* Index badge */}
                  <View style={styles.itemIndexBadge}>
                    <Text style={styles.itemIndexText}>#{index + 1}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Suspend Sub-Dialog */}
      <Portal>
        <Dialog visible={suspendDialogVisible} onDismiss={() => setSuspendDialogVisible(false)}>
          <Dialog.Title>Suspend Story Group</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
              Suspend story eligibility for "{group.name}" for:
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                label="Days"
                value={suspendDays}
                onChangeText={setSuspendDays}
                keyboardType="numeric"
                mode="outlined"
                style={{ flex: 1 }}
              />
              <Button mode="contained" onPress={handleSuspendSubmitDirect}>Suspend</Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSuspendDialogVisible(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
            <Button mode="contained" onPress={handleConfirmDirectPost}>Confirm</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Post Preview Dialog */}
      <Portal>
        <Dialog 
          visible={previewPost !== null} 
          onDismiss={() => setPreviewPost(null)}
          style={styles.previewDialog}
        >
          <Dialog.Title style={{ fontSize: 16, paddingBottom: 0 }}>Post Preview</Dialog.Title>
          <Dialog.Content style={{ paddingHorizontal: 16 }}>
            {previewPost && (
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={true}>
                <Image
                  source={{ uri: getMediaUri(previewPost, 'large') }}
                  style={styles.previewMediaImage}
                  contentFit="contain"
                />
                
                <View style={styles.previewStatsRow}>
                  <Text variant="labelMedium" style={{ fontWeight: 'bold' }}>
                    @{previewPost.ownerUsername || 'unknown'}
                  </Text>
                  <Text variant="labelMedium" style={{ opacity: 0.7 }}>
                    ❤️ {previewPost.likeCount || 0} | 💬 {previewPost.commentCount || 0}
                  </Text>
                </View>

                {previewPost.timestamp && (
                  <Text variant="bodySmall" style={{ opacity: 0.5, marginBottom: 8 }}>
                    Posted: {new Date(previewPost.timestamp).toLocaleString()}
                  </Text>
                )}

                <Divider style={{ marginVertical: 8 }} />

                <Text variant="bodyMedium" style={styles.previewCaptionText}>
                  {previewPost.caption || 'No caption.'}
                </Text>
              </ScrollView>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPreviewPost(null)}>Close</Button>
            {previewPost && (
              <Button 
                mode="contained" 
                icon="instagram"
                onPress={() => {
                  const post = previewPost;
                  setPreviewPost(null);
                  handleSharePostDirectly(post);
                }}
              >
                Share
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  bold: {
    fontWeight: 'bold',
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
    position: 'relative',
  },
  cellImage: {
    width: '100%',
    height: '100%',
  },
  shareIconBadge: {
    position: 'absolute',
    bottom: 6,
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
  starIconBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  starIconBadgeStarred: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 1,
    borderColor: '#FFD700',
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
});

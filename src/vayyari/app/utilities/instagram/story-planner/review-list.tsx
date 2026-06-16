import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Text, Button, Card, Divider, useTheme, ActivityIndicator, IconButton, Portal, Dialog, TextInput } from 'react-native-paper';
import { Stack } from 'expo-router';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { instagramService, StoryGroup, InstagramPost } from '@/services/instagram.service';
import { wrapInSpan } from '@/utils/telemetry';
import { getMediaUri } from '@/utils/instagram-helpers';

interface ReviewItem {
  type: 'group' | 'video';
  id: string;
  name: string;
  reason: string;
  group?: StoryGroup;
  video?: InstagramPost;
}

export default function StoryReviewListScreen() {
  const theme = useTheme();

  // State
  const [loading, setLoading] = useState(true);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);

  // Suspend Dialog
  const [suspendDialogVisible, setSuspendDialogVisible] = useState(false);
  const [activeItem, setActiveItem] = useState<ReviewItem | null>(null);
  const [suspendDays, setSuspendDays] = useState('7');

  const loadReviewItems = async () => {
    setLoading(true);
    try {
      // 1. Fetch story groups
      const allGroups = await wrapInSpan('StoryReviewListScreen: getStoryGroups', () => 
        instagramService.getStoryGroups()
      );
      const needingReviewGroups: ReviewItem[] = allGroups
        .filter(g => g.needsReview)
        .map(g => ({
          type: 'group',
          id: g.id,
          name: g.name,
          reason: g.status === 'suspend' ? 'Suspension Expired' : 'Reel post age > 15 days',
          group: g
        }));

      // 2. Fetch suspended videos
      const suspendedVideos = await wrapInSpan('StoryReviewListScreen: getSuspendedVideos', () => 
        instagramService.getSuspendedVideos()
      );
      const now = new Date();
      const needingReviewVideos: ReviewItem[] = suspendedVideos
        .filter(v => v.suspendUntil && new Date(v.suspendUntil) < now)
        .map(v => ({
          type: 'video',
          id: v.id,
          name: v.caption || 'Unnamed Reel',
          reason: 'Video Suspension Expired',
          video: v
        }));

      // Combine them
      setReviewItems([...needingReviewGroups, ...needingReviewVideos]);
    } catch (error) {
      console.error('Failed to load review items', error);
      Alert.alert('Error', 'Failed to load items needing review.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviewItems();
  }, []);

  const handleRenew = async (item: ReviewItem) => {
    try {
      setLoading(true);
      if (item.type === 'group') {
        await wrapInSpan('StoryReviewListScreen: renewStoryGroup', () => 
          instagramService.renewStoryGroup(item.id)
        );
      } else {
        await wrapInSpan('StoryReviewListScreen: updateVideoStatusActive', () => 
          instagramService.updateVideoStatus(item.id, { status: 'active' })
        );
      }
      await loadReviewItems();
      Alert.alert('Success', 'Item status updated to ACTIVE.');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to renew item');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendSubmit = async () => {
    if (!activeItem) return;

    try {
      setLoading(true);
      const days = parseInt(suspendDays, 10) || 7;
      if (activeItem.type === 'group') {
        await wrapInSpan('StoryReviewListScreen: updateStoryGroupSuspend', () => 
          instagramService.updateStoryGroup(activeItem.id, {
            status: 'suspend',
            suspendDays: days
          })
        );
      } else {
        await wrapInSpan('StoryReviewListScreen: updateVideoStatusSuspend', () => 
          instagramService.updateVideoStatus(activeItem.id, {
            status: 'suspend',
            suspendDays: days
          })
        );
      }
      setSuspendDialogVisible(false);
      await loadReviewItems();
      Alert.alert('Success', `Suspension extended for ${days} days.`);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to suspend item');
    } finally {
      setLoading(false);
    }
  };

  const handleIgnore = async (item: ReviewItem) => {
    try {
      setLoading(true);
      if (item.type === 'group') {
        await wrapInSpan('StoryReviewListScreen: updateStoryGroupIgnore', () => 
          instagramService.updateStoryGroup(item.id, {
            status: 'ignore'
          })
        );
      } else {
        await wrapInSpan('StoryReviewListScreen: updateVideoStatusIgnore', () => 
          instagramService.updateVideoStatus(item.id, {
            status: 'ignore'
          })
        );
      }
      await loadReviewItems();
      Alert.alert('Success', 'Item status updated to IGNORE.');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to ignore item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: ReviewItem) => {
    if (item.type === 'video') {
      // For videos, "Delete" just ignores them since they are scraped
      handleIgnore(item);
      return;
    }

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
              await wrapInSpan('StoryReviewListScreen: deleteStoryGroup', () => 
                instagramService.deleteStoryGroup(item.id)
              );
              await loadReviewItems();
              Alert.alert('Success', 'Group deleted.');
            } catch (error: any) {
              console.error(error);
              Alert.alert('Error', 'Failed to delete group');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScreenWrapper title="Review Queue" subtitle="Story Eligibility Audit" withScrollView={false}>
      <Stack.Screen options={{ headerTitle: 'Review Queue' }} />

      {loading && reviewItems.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12 }}>Refreshing queue...</Text>
        </View>
      ) : reviewItems.length === 0 ? (
        <View style={styles.center}>
          <IconButton icon="check-all" size={48} iconColor={theme.colors.secondary} style={{ opacity: 0.8 }} />
          <Text variant="bodyLarge" style={styles.bold}>All Clear!</Text>
          <Text variant="bodySmall" style={{ opacity: 0.5, textAlign: 'center', marginTop: 4, paddingHorizontal: 40 }}>
            No groups or posts require review or renewal at this time.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
          <Text variant="labelSmall" style={styles.listSubtitle}>
            The following items have expired suspensions or contain posts older than 15 days:
          </Text>
          
          {reviewItems.map(item => {
            let starredPostUri = '';
            let detailsText = '';

            if (item.type === 'group' && item.group) {
              const starredPost = item.group.posts?.find(p => (p as any).isStarred) || item.group.posts?.[0];
              starredPostUri = starredPost ? getMediaUri(starredPost, 'medium') : '';
              
              const newestPost = item.group.posts && item.group.posts.length > 0
                ? new Date(item.group.posts.reduce((max, p) => p.timestamp && new Date(p.timestamp) > new Date(max) ? p.timestamp : max, item.group.posts[0].timestamp || ''))
                : null;
              detailsText = newestPost
                ? `Newest item age: ${Math.floor((new Date().getTime() - newestPost.getTime()) / (1000 * 60 * 60 * 24))} days`
                : 'No posts';
            } else if (item.type === 'video' && item.video) {
              starredPostUri = getMediaUri(item.video, 'medium');
              detailsText = item.video.timestamp 
                ? `Posted: ${new Date(item.video.timestamp).toLocaleDateString()}`
                : 'Scraped reel';
            }

            return (
              <Card key={item.id} style={[styles.groupCard, { borderLeftWidth: 6, borderLeftColor: theme.colors.error }]}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <IconButton
                          icon={item.type === 'group' ? 'folder-outline' : 'play-circle-outline'}
                          size={16}
                          style={{ margin: 0, width: 20, height: 20 }}
                        />
                        <Text variant="titleMedium" style={styles.bold} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                      <Text variant="bodySmall" style={{ color: theme.colors.error, fontWeight: 'bold', marginTop: 2 }}>
                        {item.reason}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {detailsText}
                      </Text>
                    </View>
                    {starredPostUri ? (
                      <Image 
                        source={{ uri: starredPostUri }} 
                        style={styles.headerThumbnail} 
                      />
                    ) : null}
                  </View>

                  <Divider style={{ marginVertical: 12 }} />
 
                  {/* Actions Grid */}
                  {(() => {
                    const currentStatus = item.type === 'group' ? item.group?.status : item.video?.status;
                    return (
                      <View style={styles.actionsGrid}>
                        <Button 
                          mode={currentStatus === 'active' ? 'contained' : 'contained-tonal'} 
                          compact 
                          icon="check-circle-outline"
                          onPress={() => handleRenew(item)}
                          style={{ flex: 1, backgroundColor: currentStatus === 'active' ? 'green' : undefined }}
                        >
                          Renew
                        </Button>
                        <Button 
                          mode={currentStatus === 'suspend' ? 'contained' : 'contained-tonal'} 
                          compact 
                          icon="clock-alert-outline"
                          onPress={() => { setActiveItem(item); setSuspendDialogVisible(true); }}
                          style={{ flex: 1, backgroundColor: currentStatus === 'suspend' ? 'green' : undefined }}
                        >
                          Suspend
                        </Button>
                        <Button 
                          mode={currentStatus === 'ignore' ? 'contained' : 'contained-tonal'} 
                          compact 
                          icon="eye-off-outline"
                          onPress={() => handleIgnore(item)}
                          style={{ flex: 1, backgroundColor: currentStatus === 'ignore' ? 'green' : undefined }}
                        >
                          Ignore
                        </Button>
                        <IconButton 
                          icon="delete-outline" 
                          iconColor={theme.colors.error} 
                          size={20}
                          onPress={() => handleDelete(item)}
                          style={{ margin: 0 }}
                        />
                      </View>
                    );
                  })()}
                </Card.Content>
              </Card>
            );
          })}
        </ScrollView>
      )}

      {/* Suspend Options Dialog */}
      <Portal>
        <Dialog visible={suspendDialogVisible} onDismiss={() => setSuspendDialogVisible(false)}>
          <Dialog.Title>Suspend Story Eligibility</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
              Suspend "{activeItem?.name}" from story eligibility for:
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                label="Days to Suspend"
                value={suspendDays}
                onChangeText={setSuspendDays}
                keyboardType="numeric"
                mode="outlined"
                style={{ flex: 1 }}
              />
              <Button mode="contained" onPress={handleSuspendSubmit}>Suspend</Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSuspendDialogVisible(false)}>Cancel</Button>
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
    padding: 20
  },
  bold: {
    fontWeight: 'bold'
  },
  listSubtitle: {
    marginBottom: 16,
    opacity: 0.7
  },
  groupCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 1,
    overflow: 'hidden'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6
  },
  actionsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  }
});

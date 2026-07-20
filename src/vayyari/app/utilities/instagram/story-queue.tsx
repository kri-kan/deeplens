import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, Dimensions, BackHandler, TouchableOpacity } from 'react-native';
import { useTheme, Text, Button, ActivityIndicator, IconButton, Menu } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { instagramService, InstagramPost, InstagramProfile } from '@/services/instagram.service';
import { getSearchApiUrl } from '@/utils/api-config';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

// Tile sizes: in selection mode tiles shrink so gaps are visible between them
const TILE_SELECTION_GAP = 6;
const TILE_SELECTION = (width - TILE_SELECTION_GAP * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

export default function StoryQueueScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profileUsername } = useLocalSearchParams<{ profileUsername?: string }>();
  const [queue, setQueue] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownProfiles, setOwnProfiles] = useState<InstagramProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  // ── Long-press selection mode ─────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);

  const enterSelectionMode = () => setSelectionMode(true);
  const exitSelectionMode = () => setSelectionMode(false);

  // First back press exits selection mode; second navigates back normally
  useEffect(() => {
    const onBackPress = () => {
      if (selectionMode) {
        exitSelectionMode();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [selectionMode]);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (ownProfiles.length > 0 && profileUsername) {
      const match = ownProfiles.find(p => p.username === profileUsername);
      if (match) {
        setSelectedProfileId(match.id!);
      }
    }
  }, [profileUsername, ownProfiles]);

  useEffect(() => {
    if (selectedProfileId) {
      loadQueue();
    }
  }, [selectedProfileId]);

  const loadProfiles = async () => {
    try {
      const watchlist = await instagramService.getWatchlist();
      const myProfiles = watchlist.filter(p => p.profileCategory?.toLowerCase() === 'my business');
      setOwnProfiles(myProfiles);
      if (myProfiles.length > 0) {
        if (profileUsername) {
          const match = myProfiles.find(p => p.username === profileUsername);
          setSelectedProfileId(match ? match.id! : myProfiles[0].id!);
        } else {
          setSelectedProfileId(myProfiles[0].id!);
        }
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      if (err?.status !== 401) {
        Alert.alert('Error', 'Failed to load profiles');
      }
      setLoading(false);
    }
  };

  const loadQueue = async () => {
    if (!selectedProfileId) return;
    setLoading(true);
    try {
      const items = await instagramService.getStoryQueue(selectedProfileId);
      setQueue(items);
    } catch (err: any) {
      console.error(err);
      if (err?.status !== 401) {
        Alert.alert('Error', 'Failed to load queue');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromQueue = async (item: InstagramPost) => {
    const historyId = item.historyId;
    if (!historyId) {
      Alert.alert('Error', 'Cannot remove: missing history ID');
      return;
    }
    // Optimistic removal for instant feedback
    setQueue(prev => prev.filter(q => q.historyId !== historyId));
    try {
      await instagramService.removeFromStoryQueue(historyId);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to remove item from queue');
      loadQueue(); // Restore state on failure
    }
  };

  const handleStartAutomation = () => {
    Alert.alert('Automation', 'Maestro will intercept this button and start the automation loop.', [
      { text: 'OK' }
    ]);
  };

  const getMediaUri = (post: InstagramPost) => {
    const baseUrl = getSearchApiUrl() || '';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    if (post.storagePath) {
      return `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(post.storagePath)}`;
    }
    return post.thumbnailUrl || post.mediaUrl || '';
  };

  const renderQueueItem = ({ item, index }: { item: InstagramPost, index: number }) => {
    const tileSize = selectionMode ? TILE_SELECTION : ITEM_SIZE;
    const tileMargin = selectionMode ? TILE_SELECTION_GAP / 2 : 1;

    return (
      <TouchableOpacity
        style={[
          styles.tileContainer,
          { width: tileSize, height: tileSize, margin: tileMargin, padding: 0 }
        ]}
        activeOpacity={0.9}
        onLongPress={!selectionMode ? enterSelectionMode : undefined}
        delayLongPress={400}
      >
        <View style={[styles.tileInner, selectionMode && styles.tileInnerSelection]}>
          <Image
            source={{ uri: getMediaUri(item) }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />

          {/* Queue position badge — normal mode */}
          {!selectionMode && (
            <View style={styles.indexBadge}>
              <Text style={styles.indexBadgeText}>{index + 1}</Text>
            </View>
          )}

          {/* Minus remove badge — selection mode */}
          {selectionMode && (
            <View style={styles.removeBadgeWrapper}>
              <IconButton
                icon="minus-circle"
                iconColor="#ffffff"
                containerColor="rgba(211, 47, 47, 0.9)"
                size={16}
                style={styles.removeBadge}
                onPress={() => handleRemoveFromQueue(item)}
              />
            </View>
          )}

          {/* Action buttons — normal mode only */}
          {!selectionMode && (
            <View style={styles.tileActions}>
              <IconButton
                icon="instagram"
                mode="contained-tonal"
                size={20}
                onPress={() => {
                  import('react-native').then(({ Linking }) => {
                    const link = item.permalink || `https://instagram.com/p/${item.id}`;
                    Linking.openURL(link);
                  });
                }}
                testID={`share-queue-item-${index}`}
                style={styles.actionButton}
              />
              <IconButton
                icon="check"
                mode="contained"
                iconColor="white"
                containerColor={theme.colors.primary}
                size={20}
                onPress={async () => {
                  try {
                    const targetProfile = ownProfiles.find(p => p.id === selectedProfileId);
                    if (targetProfile) {
                      await instagramService.markPostPosted(item.id, targetProfile.id);
                      loadQueue();
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                testID={`mark-shared-queue-item-${index}`}
                style={styles.actionButton}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper
      title={selectionMode ? 'Remove items' : 'Story Posting Queue'}
      withScrollView={false}
      onBack={selectionMode ? exitSelectionMode : undefined}
    >
      <View style={[styles.content, { flex: 1 }]}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
          </View>
        ) : ownProfiles.length === 0 ? (
          <View style={styles.center}>
            <Text>No business profiles found.</Text>
          </View>
        ) : (
          <>
            <View style={styles.queueHeader}>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setMenuVisible(true)}
                    icon="chevron-down"
                    contentStyle={{ flexDirection: 'row-reverse' }}
                  >
                    @{ownProfiles.find(p => p.id === selectedProfileId)?.username}
                  </Button>
                }
              >
                {ownProfiles.map((p) => (
                  <Menu.Item
                    key={p.id}
                    onPress={() => {
                      setSelectedProfileId(p.id!);
                      setMenuVisible(false);
                      if (selectionMode) exitSelectionMode();
                    }}
                    title={`@${p.username}`}
                    leadingIcon={p.id === selectedProfileId ? "check" : undefined}
                  />
                ))}
              </Menu>
              <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginTop: 8 }}>
                {queue.length} item{queue.length === 1 ? '' : 's'} pending
                {selectionMode
                  ? ' — tap \u2212 to remove, back to exit'
                  : ' — long press to edit queue'}
              </Text>
            </View>

            <FlatList
              data={queue}
              keyExtractor={(item) => (item as any).historyId || item.id}
              renderItem={renderQueueItem}
              numColumns={COLUMN_COUNT}
              // key change forces numColumns re-layout; needed since numColumns is fixed per render
              key={selectionMode ? 'sel' : 'norm'}
              contentContainerStyle={[
                styles.listContent,
                selectionMode && styles.listContentSelection,
              ]}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Text style={{ color: theme.colors.outline }}>Queue is empty.</Text>
                </View>
              )}
              onLongPress={undefined}
            />

            <View style={styles.footer}>
              {selectionMode ? (
                <Button
                  mode="outlined"
                  onPress={exitSelectionMode}
                  icon="check"
                  style={{ borderRadius: 8, flex: 1 }}
                >
                  Done
                </Button>
              ) : (
                <>
                  <Button
                    mode="contained"
                    onPress={handleStartAutomation}
                    disabled={queue.length === 0}
                    icon="robot-outline"
                    style={{ borderRadius: 8, flex: 1, marginRight: 8 }}
                    testID="start-automation-btn"
                  >
                    Start Automation
                  </Button>
                  <IconButton
                    icon="pencil-minus-outline"
                    mode="outlined"
                    disabled={queue.length === 0}
                    onPress={enterSelectionMode}
                    style={{ borderRadius: 8, margin: 0 }}
                  />
                </>
              )}
            </View>
          </>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  listContent: {
    padding: 0,
  },
  listContentSelection: {
    padding: TILE_SELECTION_GAP / 2,
  },
  tileContainer: {
    // width/height/margin set dynamically per mode
  },
  tileInner: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    position: 'relative',
    overflow: 'hidden',
  },
  tileInnerSelection: {
    borderRadius: 6,
  },
  indexBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeBadgeWrapper: {
    position: 'absolute',
    top: -2,
    right: -2,
    zIndex: 10,
  },
  removeBadge: {
    margin: 0,
    width: 28,
    height: 28,
  },
  tileActions: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  actionButton: {
    margin: 0,
    width: 36,
    height: 36,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
  }
});

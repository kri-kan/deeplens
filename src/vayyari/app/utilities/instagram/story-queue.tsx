import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, Dimensions, BackHandler, TouchableOpacity } from 'react-native';
import { useTheme, Text, Button, ActivityIndicator, IconButton, Menu, Icon } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { instagramService, InstagramPost, InstagramProfile, InstagramMediaType } from '@/services/instagram.service';
import { getMediaUri, getMediaFallbackUri, openInstagramPost, getInstagramPostUrl } from '@/utils/instagram-helpers';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

// Tile sizes: in selection mode tiles shrink so gaps are visible between them
const TILE_SELECTION_GAP = 6;
const TILE_SELECTION = (width - TILE_SELECTION_GAP * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

interface QueueTileProps {
  item: InstagramPost;
  index: number;
  selectionMode: boolean;
  tileSize: number;
  tileMargin: number;
  primaryColor: string;
  onLongPress: () => void;
  onRemove: (item: InstagramPost) => void;
  onMarkPosted: (item: InstagramPost) => void;
}

const QueueTile = React.memo(({
  item,
  index,
  selectionMode,
  tileSize,
  tileMargin,
  primaryColor,
  onLongPress,
  onRemove,
  onMarkPosted,
}: QueueTileProps) => {
  const primaryUri = getMediaUri(item, 'medium');
  const fallbackUri = getMediaFallbackUri(item);
  const [imageUri, setImageUri] = useState<string>(primaryUri || fallbackUri);

  useEffect(() => {
    setImageUri(getMediaUri(item, 'medium') || getMediaFallbackUri(item));
  }, [item]);

  return (
    <TouchableOpacity
      style={[
        styles.tileContainer,
        { width: tileSize, height: tileSize, margin: tileMargin, padding: 0 }
      ]}
      activeOpacity={0.85}
      onLongPress={!selectionMode ? onLongPress : undefined}
      delayLongPress={400}
    >
      <View style={[styles.tileInner, selectionMode && styles.tileInnerSelection]}>
        <Image
          source={{ uri: imageUri }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
          onError={() => {
            if (fallbackUri && imageUri !== fallbackUri) {
              setImageUri(fallbackUri);
            }
          }}
        />

        {/* Video play indicator if reel/video */}
        {item.mediaType === InstagramMediaType.VIDEO && !selectionMode && (
          <View style={styles.centerPlayButton}>
            <Icon source="play" size={16} color="white" />
          </View>
        )}

        {/* Queue sequence badge — top-left (matches Image 1 sharing.tsx) */}
        {!selectionMode && (
          <View style={styles.itemIndexBadge}>
            <Text style={styles.itemIndexBadgeText}>#{index + 1}</Text>
          </View>
        )}

        {/* Instagram action button — top-right purple badge (matches Image 1 sharing.tsx) */}
        {!selectionMode && (
          <TouchableOpacity
            style={styles.shareIconBadge}
            activeOpacity={0.7}
            onPress={() => openInstagramPost(item)}
            testID={`share-queue-item-${index}`}
          >
            <Icon source="instagram" size={16} color="white" />
          </TouchableOpacity>
        )}

        {/* Minus remove badge — selection mode */}
        {selectionMode && (
          <TouchableOpacity
            style={styles.removeBadgeWrapper}
            activeOpacity={0.7}
            onPress={() => onRemove(item)}
          >
            <View style={styles.removeCircle}>
              <Icon source="minus" size={14} color="#ffffff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Sleek bottom overlay bar with username and mark posted checkmark */}
        {!selectionMode && (
          <View style={styles.groupBottomOverlay}>
            <Text style={styles.groupBottomTitle} numberOfLines={1}>
              {item.ownerUsername ? `@${item.ownerUsername}` : 'Post'}
            </Text>
            <TouchableOpacity
              style={[styles.markPostedBadge, { backgroundColor: primaryColor }]}
              activeOpacity={0.7}
              onPress={() => onMarkPosted(item)}
              testID={`mark-shared-queue-item-${index}`}
            >
              <Icon source="check" size={13} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

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
      const validItems = items.filter(item => Boolean(getInstagramPostUrl(item)));
      setQueue(validItems);
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

  const handleMarkPosted = async (item: InstagramPost) => {
    try {
      const targetProfile = ownProfiles.find(p => p.id === selectedProfileId);
      if (targetProfile) {
        await instagramService.markPostPosted(item.id, targetProfile.id);
        loadQueue();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderQueueItem = ({ item, index }: { item: InstagramPost, index: number }) => {
    const tileSize = selectionMode ? TILE_SELECTION : ITEM_SIZE;
    const tileMargin = selectionMode ? TILE_SELECTION_GAP / 2 : 0;

    return (
      <QueueTile
        item={item}
        index={index}
        selectionMode={selectionMode}
        tileSize={tileSize}
        tileMargin={tileMargin}
        primaryColor={theme.colors.primary}
        onLongPress={enterSelectionMode}
        onRemove={handleRemoveFromQueue}
        onMarkPosted={handleMarkPosted}
      />
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
    overflow: 'hidden',
  },
  tileInner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  tileInnerSelection: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  centerPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -14,
    marginLeft: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
  itemIndexBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 5,
  },
  itemIndexBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 13,
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
  removeBadgeWrapper: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
  },
  removeCircle: {
    backgroundColor: 'rgba(211, 47, 47, 0.95)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  groupBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 5,
  },
  groupBottomTitle: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
    marginRight: 4,
  },
  markPostedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
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

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Dimensions } from 'react-native';
import { Text, Button, Divider, useTheme, ActivityIndicator, Portal, Dialog, IconButton, TextInput, Icon } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { instagramService, StoryGroup, InstagramPost, InstagramProfile } from '@/services/instagram.service';
import { wrapInSpan } from '@/utils/telemetry';
import { getMediaUri } from '@/utils/instagram-helpers';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

export default function StorySharingScreen() {
  const theme = useTheme();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [ownProfiles, setOwnProfiles] = useState<InstagramProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<InstagramProfile | null>(null);
  const [allGroups, setAllGroups] = useState<StoryGroup[]>([]);

  // Load Watchlist (Own Accounts)
  const loadProfiles = async () => {
    try {
      const watchlist = await wrapInSpan('StorySharingScreen: getWatchlist', () => 
        instagramService.getWatchlist()
      );
      const own = watchlist.filter(p => p.isOwnAccount);
      setOwnProfiles(own);
      if (own.length > 0) {
        setSelectedProfile(own[0]);
      }
    } catch (error) {
      console.error('Failed to load watchlist profiles', error);
      Alert.alert('Error', 'Failed to load accounts.');
    }
  };

  // Load Story Groups (Eligible for selected channel)
  const loadGroups = async (profileId?: string) => {
    const pid = profileId || selectedProfile?.id;
    if (!pid) return;
    setLoading(true);
    try {
      const groups = await wrapInSpan('StorySharingScreen: getEligibleGroups', () => 
        instagramService.getEligibleGroups(pid)
      );
      setAllGroups(groups);
    } catch (error) {
      console.error('Failed to load story groups', error);
      Alert.alert('Error', 'Failed to load story groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (selectedProfile) {
      loadGroups();
    }
  }, [selectedProfile]);

  // Profile Picture Helpers
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

  const getGroupDate = (g: StoryGroup) => {
    if (g.posts && g.posts.length > 0) {
      const timestamps = g.posts.map(p => p.timestamp ? new Date(p.timestamp).getTime() : 0);
      return Math.max(...timestamps);
    }
    return new Date(g.createdAt).getTime();
  };

  // Filter groups mapped to current selected profile & are active
  const eligibleGroups = selectedProfile
    ? allGroups.filter(g => g.status === 'active' && g.eligibleAccounts.includes(selectedProfile.id))
    : [];

  // Split into recent (last 15 days) and older
  const now = new Date().getTime();
  const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;

  const recentGroups = eligibleGroups
    .filter(g => {
      const groupDate = getGroupDate(g);
      return (now - groupDate) <= fifteenDaysMs;
    })
    .sort((a, b) => getGroupDate(b) - getGroupDate(a)); // sorted chronologically (newest first)

  const olderGroups = eligibleGroups
    .filter(g => {
      const groupDate = getGroupDate(g);
      return (now - groupDate) > fifteenDaysMs;
    })
    .sort((a, b) => {
      const scoreA = (a.rightSwipes || 0) - (a.leftSwipes || 0);
      const scoreB = (b.rightSwipes || 0) - (b.leftSwipes || 0);
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // sort by net swipes descending
      }
      return getGroupDate(b) - getGroupDate(a); // tie breaker newest first
    });

  const renderGridCell = (group: StoryGroup) => {
    const starredPost = group.posts?.find(p => (p as any).isStarred) || group.posts?.[0];
    const netSwipes = (group.rightSwipes || 0) - (group.leftSwipes || 0);

    return (
      <TouchableOpacity
        key={group.id}
        style={styles.gridCell}
        activeOpacity={0.8}
        onPress={() => {
          router.push({
            pathname: '/utilities/instagram/story-planner/[groupId]',
            params: { groupId: group.id, profileId: selectedProfile?.id }
          });
        }}
      >
        <Image
          source={{ uri: starredPost ? getMediaUri(starredPost, 'medium') : '' }}
          style={styles.cellImage}
          contentFit="cover"
          transition={200}
        />
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
          <Text style={styles.groupSwipeScore}>👍 {netSwipes}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper title="Story Sharing" subtitle="Share Curation to Stories" withScrollView={false}>
      <Stack.Screen options={{ headerTitle: 'Story Sharing' }} />

      {/* Target Account Selector */}
      <View style={styles.accountSelectorContainer}>
        <Text variant="labelMedium" style={styles.selectorLabel}>Select Target Channel:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 4 }}>
            {ownProfiles.map(p => {
              const isSelected = selectedProfile?.id === p.id;
              const baseUrl = process.env.EXPO_PUBLIC_SEARCH_API_URL || '';
              const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
              const avatarUri = p.storagePath
                ? `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(p.storagePath)}`
                : p.profilePictureUrl;

              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedProfile(p)}
                  activeOpacity={0.8}
                  style={styles.avatarWrapper}
                >
                  <View style={[
                    styles.avatarBorder,
                    isSelected && { borderColor: theme.colors.primary, borderWidth: 3 }
                  ]}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.channelAvatar} contentFit="cover" />
                    ) : (
                      <View style={[styles.channelAvatar, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{p.username.substring(0, 2).toUpperCase()}</Text>
                      </View>
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
            })}
          </View>
        </ScrollView>
      </View>

      <Divider />

      {loading && allGroups.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12 }}>Loading story planner...</Text>
        </View>
      ) : eligibleGroups.length === 0 ? (
        <View style={styles.center}>
          <IconButton icon="check-decagram-outline" size={48} style={{ opacity: 0.3 }} />
          <Text variant="bodyLarge" style={{ opacity: 0.5 }}>All caught up!</Text>
          <Text variant="bodySmall" style={{ opacity: 0.5, textAlign: 'center', marginTop: 4, paddingHorizontal: 40 }}>
            No active story groups mapped to @{selectedProfile?.username}.
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Section 1: Recent */}
          {recentGroups.length > 0 && (
            <View>
              <View style={styles.sectionHeader}>
                <Icon source="clock-outline" size={16} color={theme.colors.primary} />
                <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                  Recent Content (Last 15 Days)
                </Text>
              </View>
              <View style={styles.gridContainer}>
                {recentGroups.map(renderGridCell)}
              </View>
            </View>
          )}

          {/* Section 2: Older */}
          {olderGroups.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <View style={styles.sectionHeader}>
                <Icon source="fire" size={16} color={theme.colors.secondary} />
                <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.secondary }]}>
                  Active Groups (Sorted by Swipe score)
                </Text>
              </View>
              <View style={styles.gridContainer}>
                {olderGroups.map(renderGridCell)}
              </View>
            </View>
          )}
        </ScrollView>
      )}
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
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.01)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)'
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
  }
});

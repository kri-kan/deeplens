import React, { useState, useRef, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, BackHandler, RefreshControl, Alert } from 'react-native';
import { Text, IconButton, Surface, ActivityIndicator, Appbar, Menu, Button, List, useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { VideoItem } from '@/components/utility/instagram/VideoItem';
import { ProfileHeader } from '@/components/utility/instagram/ProfileHeader';

import { useInstagramExplorer } from '@/hooks/useInstagramExplorer';
import { instagramService } from '@/services/instagram.service';
import { getInstagramPostUrl } from '@/utils/instagram-helpers';
import { ProfileAvatar } from '@/components/utility/instagram/ProfileAvatar';
import { CompetitorBanner } from '@/components/utility/instagram/CompetitorBanner';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from '@/styles/screens/instagram-explorer.styles';
import { useRouter, useFocusEffect, useNavigation, useLocalSearchParams } from 'expo-router';

export default function InstagramExplorer() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { profile: paramProfile, selectedProfile: paramSelectedProfile, from } = useLocalSearchParams<{ profile?: string; selectedProfile?: string; from?: string }>();
  const targetProfileParam = paramProfile || paramSelectedProfile;
  const processedProfileParamRef = useRef<string | null>(null);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      instagramService.getStoryGroups()
        .then(groups => {
          const count = groups.filter(g => g.needsReview).length;
          setNeedsReviewCount(count);
        })
        .catch(err => console.error('Failed to load story groups for badge', err));
    }, [])
  );

  const {
    watchlist,
    selectedProfile,
    setSelectedProfile,
    profileData,
    loading,
    quota,
    bioExpanded,
    setBioExpanded,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    refreshing,
    handleRefresh,
    manualSync,
    selectProfile,
    loadMorePosts,
    loadingMore,
    togglePin,
    profileCategories,
  } = useInstagramExplorer();

  // Auto-select profile when navigated to with `profile` or `selectedProfile` route param (only once per param change)
  React.useEffect(() => {
    if (targetProfileParam && targetProfileParam !== processedProfileParamRef.current) {
      processedProfileParamRef.current = targetProfileParam;
      selectProfile(targetProfileParam);
    } else if (!targetProfileParam) {
      processedProfileParamRef.current = null;
    }
  }, [targetProfileParam, selectProfile]);

  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Map<string, any>>(new Map());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [selectionMenuVisible, setSelectionMenuVisible] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const isNavigating = useRef(false);

  const selectionMode = selectedPosts.size > 0;

  const isCompetitorProfile = (profileData?.profile?.profileCategory || '').toLowerCase() === 'competitors' || 
    (profileData?.profile?.profileCategory || '').toLowerCase() === 'competitor';

  const renderVideoItem = useCallback(({ item }: { item: any }) => {
    const postItem = {
      ...item,
      isCompetitor: isCompetitorProfile || item.isCompetitor,
      profileCategory: profileData?.profile?.profileCategory,
    };

    return (
      <VideoItem 
        item={postItem} 
        onPress={() => {
          if (selectionMode) {
            toggleSelection(item);
          } else {
            if (isNavigating.current) return;
            isNavigating.current = true;
            instagramService.setLastFetchedPosts(profileData?.videos || []);
            router.push({
              pathname: '/utilities/instagram/post-detail',
              params: { 
                  id: item.id, 
                  username: selectedProfile,
                  sortBy,
                  sortOrder,
                  data: JSON.stringify(postItem) 
              }
            } as any);
            // Reset after a short delay to allow navigation to complete
            setTimeout(() => { isNavigating.current = false; }, 1000);
          }
        }} 
        onLongPress={() => toggleSelection(item)}
        isSelected={selectedPosts.has(item.id)}
        selectionMode={selectionMode}
      />
    );
  }, [selectionMode, selectedPosts, selectedProfile, sortBy, sortOrder, profileData?.videos, isCompetitorProfile, profileData?.profile?.profileCategory]);

  const handleBack = useCallback(() => {
    if (selectionMode) {
      setSelectedPosts(new Map());
      return true;
    }

    if (selectedProfile) {
      router.setParams({ profile: undefined, selectedProfile: undefined, from: undefined });
      processedProfileParamRef.current = null;
      setSelectedProfile(null);

      if (from === 'competitors') {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/utilities/instagram/competitors');
        }
      }
      return true;
    }

    return false;
  }, [selectionMode, selectedProfile, from, router, setSelectedProfile]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (selectionMode) {
        e.preventDefault();
        setSelectedPosts(new Map());
        return;
      }
      if (selectedProfile && from !== 'competitors') {
        // Stop exiting explorer entirely if there's a selected profile from non-competitors route
        e.preventDefault();
        router.setParams({ profile: undefined, selectedProfile: undefined, from: undefined });
        processedProfileParamRef.current = null;
        setSelectedProfile(null);
      }
    });
    return unsubscribe;
  }, [navigation, selectionMode, selectedProfile, from, router, setSelectedProfile]);

  useFocusEffect(
    React.useCallback(() => {
      const backAction = () => {
        if (selectionMode) {
          setSelectedPosts(new Map());
          return true;
        }
        if (selectedProfile) {
          handleBack();
          return true;
        }
        return false;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }, [selectionMode, selectedProfile, handleBack])
  );

  const toggleSelection = (post: any) => {
    setSelectedPosts(prev => {
      const next = new Map(prev);
      if (next.has(post.id)) {
        next.delete(post.id);
      } else {
        next.set(post.id, post);
      }
      return next;
    });
  };

  const handleQueueItems = async () => {
    setSelectionMenuVisible(false);
    if (!selectedProfile) return;
    try {
      const posts = Array.from(selectedPosts.values());
      
      // Need a target profile. For now, use the first ownProfile or we could fetch it.
      // Assuming instagram-explorer has access to ownProfiles? 
      // Actually, explorer might be viewing competitor profiles, so we need a target profile.
      const watchlist = await instagramService.getWatchlist();
      const ownProfiles = watchlist.filter(p => p.profileCategory?.toLowerCase() === 'mybusiness');
      const targetProfile = ownProfiles[0];
      
      if (!targetProfile) {
        Alert.alert('Error', 'No business profile found to queue to.');
        return;
      }

      let queuedCount = 0;
      let skippedInvalidCount = 0;
      for (const post of posts) {
        if (!getInstagramPostUrl(post)) {
          skippedInvalidCount++;
          continue;
        }
        await instagramService.queueForStory(post.id, targetProfile.id);
        queuedCount++;
      }
      
      setSelectedPosts(new Map());
      if (queuedCount === 0 && skippedInvalidCount > 0) {
        Alert.alert('Cannot Queue', 'Selected post(s) or reel(s) do not have valid Instagram links.');
      } else {
        const skipMsg = skippedInvalidCount > 0 ? ` (${skippedInvalidCount} skipped due to invalid URLs)` : '';
        Alert.alert('Success', `Queued ${queuedCount} items for story posting to @${targetProfile.username}${skipMsg}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to queue items');
    }
  };

  const formatDateDisplay = (dateString: string | null) => {
    if (!dateString) return 'Select';
    const d = new Date(dateString);
    return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear().toString().slice(-2)}`;
  };

  if (selectedProfile && !profileData && loading) {
    return (
      <Surface style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }]}>
        <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
        <Text variant="titleMedium" style={{ marginTop: 16, fontWeight: '700', color: theme.colors.onSurface }}>
          Loading @{selectedProfile}...
        </Text>
      </Surface>
    );
  }

  if (selectedProfile && profileData) {
    return (
      <Surface style={styles.container}>
        <Appbar.Header style={{ backgroundColor: theme.colors.surface, height: 48 }}>
          {selectionMode ? (
            <>
              <Appbar.Action icon="close" onPress={() => setSelectedPosts(new Map())} />
              <Appbar.Content title={`${selectedPosts.size} Selected`} titleStyle={styles.bold} />
              <Appbar.Action icon="plus-box" onPress={() => router.push({
                pathname: '/utilities/instagram/bulk-create',
                params: { posts: JSON.stringify(Array.from(selectedPosts.values())) }
              } as any)} />
              <Menu
                visible={selectionMenuVisible}
                onDismiss={() => setSelectionMenuVisible(false)}
                anchor={
                  <Appbar.Action icon="dots-vertical" onPress={() => setSelectionMenuVisible(true)} />
                }
              >
                <Menu.Item onPress={handleQueueItems} title="Queue for story posting" />
              </Menu>
            </>
          ) : (
            <>
              <Appbar.BackAction onPress={handleBack} />
              <Appbar.Content title={`@${selectedProfile}`} titleStyle={styles.bold} />
              <Appbar.Action icon="cloud-sync" onPress={() => router.push('/utilities/instagram-scraper')} />
              <Appbar.Action icon="clipboard-list-outline" onPress={() => router.push('/utilities/instagram/queue')} />
            </>
          )}
        </Appbar.Header>

        <FlatList
          data={profileData.videos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 20 }}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={2.0}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator animating={true} color={theme.colors.primary} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            <View>
              <ProfileHeader 
                profile={profileData.profile}
                metrics={profileData.metrics}
                isCompetitorProfile={isCompetitorProfile}
                onShowSettings={() => router.push({
                    pathname: '/utilities/instagram/settings',
                    params: { username: profileData.profile?.username }
                } as any)}
                bioExpanded={bioExpanded}
                onToggleBio={() => setBioExpanded(!bioExpanded)}
                onBack={handleBack}
              />

              {!selectionMode && (
                <View style={styles.filterBar}>
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>Sort:</Text>
                    <Menu
                      visible={sortMenuVisible}
                      onDismiss={() => setSortMenuVisible(false)}
                      anchor={
                        <Button 
                          mode="text" 
                          compact 
                          onPress={() => setSortMenuVisible(true)}
                          labelStyle={styles.filterButtonLabel}
                          style={styles.filterButton}
                        >
                          {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
                        </Button>
                      }
                    >
                      <Menu.Item onPress={() => { setSortBy('date'); setSortMenuVisible(false); }} title="Date" />
                      <Menu.Item onPress={() => { setSortBy('likes'); setSortMenuVisible(false); }} title="Likes" />
                      <Menu.Item onPress={() => { setSortBy('comments'); setSortMenuVisible(false); }} title="Comments" />
                    </Menu>

                    <IconButton 
                      icon={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} 
                      size={20} 
                      onPress={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                      style={styles.sortIcon}
                    />
                  </View>

                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>From:</Text>
                    <Button mode="text" compact onPress={() => setShowFromPicker(true)} labelStyle={styles.filterButtonLabel} style={styles.filterButton}>
                      {formatDateDisplay(fromDate)}
                    </Button>
                    
                    <Text style={styles.filterLabel}>To:</Text>
                    <Button mode="text" compact onPress={() => setShowToPicker(true)} labelStyle={styles.filterButtonLabel} style={styles.filterButton}>
                      {formatDateDisplay(toDate)}
                    </Button>

                    {(fromDate || toDate) && (
                      <IconButton 
                        icon="close-circle-outline" 
                        size={16} 
                        onPress={() => { setFromDate(null); setToDate(null); }} 
                        style={styles.closeFilterIcon}
                      />
                    )}
                  </View>
                </View>
              )}

              {showFromPicker && (
                <DateTimePicker
                  value={fromDate ? new Date(fromDate) : new Date()}
                  mode="date"
                  onChange={(event, date) => {
                    setShowFromPicker(false);
                    if (date) setFromDate(date.toISOString().split('T')[0]);
                  }}
                />
              )}

              {showToPicker && (
                <DateTimePicker
                  value={toDate ? new Date(toDate) : new Date()}
                  mode="date"
                  onChange={(event, date) => {
                    setShowToPicker(false);
                    if (date) setToDate(date.toISOString().split('T')[0]);
                  }}
                />
              )}

              {profileData.profile?.isDataDeleted && (
                <View style={styles.deletedPlaceholder}>
                    <IconButton icon="image-off-outline" size={48} style={{ opacity: 0.3 }} />
                    <Text variant="bodyMedium" style={{ opacity: 0.5 }}>Media data was removed</Text>
                    <Button mode="text" compact onPress={manualSync}>Sync now to restore</Button>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !profileData.profile?.isDataDeleted ? (
              <View style={styles.empty}>
                <Text variant="bodyLarge">No posts found</Text>
              </View>
            ) : null
          }
        />

        {/* Modals removed and replaced with navigable screens */}
      </Surface>
    );
  }

  return (
    <ScreenWrapper 
      title="Instagram Explorer"
      actions={
        <>
          <Appbar.Action icon="cloud-sync" onPress={() => router.push('/utilities/instagram-scraper')} />
          <Appbar.Action icon="clipboard-list-outline" onPress={() => router.push('/utilities/instagram/queue')} />
        </>
      }
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* Story Planner Section */}
      <View style={{ paddingHorizontal: 16, marginBottom: 18 }}>
        <Text variant="titleMedium" style={{ fontWeight: '800', marginBottom: 10, color: theme.colors.onSurface }}>
          Story Planner
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* Curation Card */}
          <TouchableOpacity 
            onPress={() => router.push('/utilities/instagram/story-planner')}
            activeOpacity={0.7}
            style={{ 
              flex: 1, 
              aspectRatio: 0.95,
              backgroundColor: theme.colors.surface, 
              borderRadius: 14, 
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant || 'rgba(0,0,0,0.08)',
              paddingVertical: 10, 
              paddingHorizontal: 4,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(5, 150, 105, 0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
              <MaterialCommunityIcons name="calendar-check" size={22} color="#059669" />
            </View>
            <Text variant="labelSmall" style={{ fontWeight: '700', textAlign: 'center', color: theme.colors.onSurface }}>Curation</Text>
          </TouchableOpacity>

          {/* Sharing Card */}
          <TouchableOpacity 
            onPress={() => router.push('/utilities/instagram/story-planner/sharing')}
            activeOpacity={0.7}
            style={{ 
              flex: 1, 
              aspectRatio: 0.95,
              backgroundColor: theme.colors.surface, 
              borderRadius: 14, 
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant || 'rgba(0,0,0,0.08)',
              paddingVertical: 10, 
              paddingHorizontal: 4,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(37, 99, 235, 0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
              <MaterialCommunityIcons name="share-variant" size={22} color="#2563EB" />
            </View>
            <Text variant="labelSmall" style={{ fontWeight: '700', textAlign: 'center', color: theme.colors.onSurface }}>Sharing</Text>
          </TouchableOpacity>

          {/* Swipe Game Card */}
          <TouchableOpacity 
            onPress={() => router.push('/utilities/instagram/story-planner/swipe-game')}
            activeOpacity={0.7}
            style={{ 
              flex: 1, 
              aspectRatio: 0.95,
              backgroundColor: theme.colors.surface, 
              borderRadius: 14, 
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant || 'rgba(0,0,0,0.08)',
              paddingVertical: 10, 
              paddingHorizontal: 4,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(217, 119, 6, 0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
              <MaterialCommunityIcons name="cards-heart" size={22} color="#D97706" />
            </View>
            <Text variant="labelSmall" style={{ fontWeight: '700', textAlign: 'center', color: theme.colors.onSurface }}>Swipes</Text>
          </TouchableOpacity>

          {/* Review List Card */}
          <TouchableOpacity 
            onPress={() => router.push('/utilities/instagram/story-planner/review-list')}
            activeOpacity={0.7}
            style={{ 
              flex: 1, 
              aspectRatio: 0.95,
              backgroundColor: theme.colors.surface, 
              borderRadius: 14, 
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant || 'rgba(0,0,0,0.08)',
              paddingVertical: 10, 
              paddingHorizontal: 4,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
            }}
          >
            <View style={{ position: 'relative', width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(220, 38, 38, 0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
              <MaterialCommunityIcons name="alert-decagram" size={22} color="#DC2626" />
              {needsReviewCount > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -6, backgroundColor: '#DC2626', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#FFFFFF' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>{needsReviewCount > 99 ? '99+' : needsReviewCount}</Text>
                </View>
              )}
            </View>
            <Text variant="labelSmall" style={{ fontWeight: '700', textAlign: 'center', color: theme.colors.onSurface }}>Review</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Post Planner Section */}
      <View style={{ paddingHorizontal: 16, marginBottom: 18 }}>
        <Text variant="titleMedium" style={{ fontWeight: '800', marginBottom: 10, color: theme.colors.onSurface }}>Post Planner</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* Tile 1: Product Curation */}
          <TouchableOpacity 
            onPress={() => router.push('/utilities/instagram/post-planner?tab=curation' as any)}
            activeOpacity={0.7}
            style={{ 
              width: 82, 
              aspectRatio: 0.95,
              backgroundColor: theme.colors.surface, 
              borderRadius: 14, 
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant || 'rgba(0,0,0,0.08)',
              paddingVertical: 10, 
              paddingHorizontal: 4,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(5, 150, 105, 0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
              <MaterialCommunityIcons name="calendar-check" size={22} color="#059669" />
            </View>
            <Text variant="labelSmall" style={{ fontWeight: '700', textAlign: 'center', color: theme.colors.onSurface, fontSize: 10 }} numberOfLines={1}>
              Curation
            </Text>
          </TouchableOpacity>

          {/* Tile 2: Post Planner */}
          <TouchableOpacity 
            onPress={() => router.push('/utilities/instagram/post-planner?tab=sharing' as any)}
            activeOpacity={0.7}
            style={{ 
              width: 82, 
              aspectRatio: 0.95,
              backgroundColor: theme.colors.surface, 
              borderRadius: 14, 
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant || 'rgba(0,0,0,0.08)',
              paddingVertical: 10, 
              paddingHorizontal: 4,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 1,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(126, 34, 206, 0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
              <MaterialCommunityIcons name="grid-large" size={22} color="#7E22CE" />
            </View>
            <Text variant="labelSmall" style={{ fontWeight: '700', textAlign: 'center', color: theme.colors.onSurface, fontSize: 10 }} numberOfLines={1}>
              Post Planner
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Active Profiles Section */}
      <View style={{ paddingBottom: 24 }}>
        <Text variant="titleLarge" style={[styles.sectionTitle, { marginBottom: 12, marginTop: -4, fontWeight: '900' }]}>Active Profiles</Text>
          {profileCategories.map((category) => {
            const isCompetitorCategory = category.id.toLowerCase() === 'competitors' || category.id.toLowerCase() === 'competitor';
            const categoryProfiles = watchlist.filter(p => {
              const pCat = (p.profileCategory || '').toLowerCase();
              const cId = category.id.toLowerCase();
              if (isCompetitorCategory) {
                return pCat === 'competitors' || pCat === 'competitor';
              }
              if (cId === 'mybusiness') {
                return pCat === 'mybusiness' || pCat === 'my business';
              }
              if (cId === 'mygeneral') {
                return pCat === 'mygeneral' || pCat === 'my general';
              }
              return pCat === cId;
            });

            if (categoryProfiles.length === 0 && !isCompetitorCategory) return null;
            const isExpanded = expandedCategories[category.id] !== false;

            return (
              <View 
                key={category.id} 
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant || 'rgba(0,0,0,0.08)',
                  marginHorizontal: 16,
                  marginBottom: 12,
                  overflow: 'hidden',
                  elevation: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.03,
                  shadowRadius: 4,
                }}
              >
                {/* Category Header */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setExpandedCategories(prev => ({
                      ...prev,
                      [category.id]: prev[category.id] === false ? true : false
                    }));
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text variant="titleSmall" style={{ fontWeight: '800', color: theme.colors.onSurface }}>
                      {category.name}
                    </Text>
                    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.onSurfaceVariant }}>
                        {categoryProfiles.length}
                      </Text>
                    </View>
                  </View>

                  <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={theme.colors.onSurfaceVariant} 
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <>
                    {isCompetitorCategory && (
                      <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
                        <CompetitorBanner />
                      </View>
                    )}

                    {categoryProfiles.length > 0 ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 12, rowGap: 8 }}>
                        {categoryProfiles.map(item => (
                          <TouchableOpacity 
                            key={item.id || item.username} 
                            onPress={() => selectProfile(item.username)}
                            onLongPress={(e) => {
                              const { pageX, pageY } = e.nativeEvent;
                              setMenuAnchor({ x: pageX, y: pageY });
                              setActiveMenu(item.username);
                            }}
                            activeOpacity={0.7}
                            style={{ width: '25%', alignItems: 'center', marginVertical: 4 }}
                          >
                            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                              <ProfileAvatar 
                                profile={{ ...item, isInWatchlist: true }} 
                                size={58} 
                                showBadge={true}
                              />
                            </View>
                            <Text 
                              variant="labelSmall" 
                              style={{ textAlign: 'center', marginTop: 6, fontWeight: '600', fontSize: 11, color: theme.colors.onSurface }} 
                              numberOfLines={1}
                            >
                              {item.username}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          No profiles in this category
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          })}

        <Menu
          visible={!!activeMenu}
          onDismiss={() => setActiveMenu(null)}
          anchor={menuAnchor}
        >
          <Menu.Item 
            onPress={() => {
              const profile = watchlist.find(p => p.username === activeMenu);
              if (profile) {
                togglePin(profile.username, !!profile.isPinned);
              }
              setActiveMenu(null);
            }} 
            title={
              watchlist.find(p => p.username === activeMenu)?.isPinned 
                ? "Unpin Account" 
                : "Pin Account"
            } 
          />
        </Menu>
      </View>

      {/* ControlCenter removed and replaced with navigable screen */}

      {loading && (
        <View style={styles.empty}>
           <ActivityIndicator animating={true} color={theme.colors.primary} />
           <Text style={{ marginTop: 16 }}>Loading profile data...</Text>
        </View>
      )}
    </ScreenWrapper>
  );
}

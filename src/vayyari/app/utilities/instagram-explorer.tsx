import React, { useState, useRef, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, BackHandler, RefreshControl } from 'react-native';
import { Text, IconButton, Surface, ActivityIndicator, Appbar, Menu, Button, List, useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { VideoItem } from '@/components/utility/instagram/VideoItem';
import { ProfileHeader } from '@/components/utility/instagram/ProfileHeader';

import { useInstagramExplorer } from '@/hooks/useInstagramExplorer';
import { instagramService } from '@/services/instagram.service';
import { ProfileAvatar } from '@/components/utility/instagram/ProfileAvatar';
import { styles } from '@/styles/screens/instagram-explorer.styles';
import { useRouter, useFocusEffect } from 'expo-router';

export default function InstagramExplorer() {
  const theme = useTheme();
  const router = useRouter();
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

  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Map<string, any>>(new Map());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const isNavigating = useRef(false);

  const selectionMode = selectedPosts.size > 0;

  const renderVideoItem = useCallback(({ item }: { item: any }) => (
    <VideoItem 
      item={item} 
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
                data: JSON.stringify(item) 
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
  ), [selectionMode, selectedPosts, selectedProfile, sortBy, sortOrder, profileData?.videos]);

  useFocusEffect(
    React.useCallback(() => {
      const backAction = () => {
        if (selectionMode) {
          setSelectedPosts(new Map());
          return true;
        }
        if (selectedProfile) {
          setSelectedProfile(null);
          return true;
        }
        return false;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }, [selectionMode, selectedProfile])
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

  const formatDateDisplay = (dateString: string | null) => {
    if (!dateString) return 'Select';
    const d = new Date(dateString);
    return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear().toString().slice(-2)}`;
  };

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
            </>
          ) : (
            <>
              <Appbar.BackAction onPress={() => { setSelectedProfile(null); }} />
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
                onShowSettings={() => router.push({
                    pathname: '/utilities/instagram/settings',
                    params: { username: profileData.profile?.username }
                } as any)}
                bioExpanded={bioExpanded}
                onToggleBio={() => setBioExpanded(!bioExpanded)}
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
      <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
        <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12, color: theme.colors.onSurface }}>Story Planner</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          {/* Curation Card */}
          <TouchableOpacity 
            onPress={() => router.push('/utilities/instagram/story-planner')}
            activeOpacity={0.8}
            style={{ 
              flex: 1, 
              backgroundColor: theme.colors.surfaceVariant, 
              borderRadius: 16, 
              padding: 8, 
              aspectRatio: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconButton icon="calendar-edit" size={28} iconColor={theme.colors.secondary} style={{ margin: 0 }} />
            <Text variant="labelSmall" style={{ fontWeight: 'bold', textAlign: 'center', marginTop: 4 }}>Curation</Text>
          </TouchableOpacity>

          {/* Sharing Card */}
          <TouchableOpacity 
            onPress={() => router.push('/utilities/instagram/story-planner/sharing')}
            activeOpacity={0.8}
            style={{ 
              flex: 1, 
              backgroundColor: theme.colors.surfaceVariant, 
              borderRadius: 16, 
              padding: 8, 
              aspectRatio: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconButton icon="share-variant" size={28} iconColor={theme.colors.secondary} style={{ margin: 0 }} />
            <Text variant="labelSmall" style={{ fontWeight: 'bold', textAlign: 'center', marginTop: 4 }}>Sharing</Text>
          </TouchableOpacity>

          {/* Swipe Game Card */}
          <TouchableOpacity 
            onPress={() => router.push('/utilities/instagram/story-planner/swipe-game')}
            activeOpacity={0.8}
            style={{ 
              flex: 1, 
              backgroundColor: theme.colors.surfaceVariant, 
              borderRadius: 16, 
              padding: 8, 
              aspectRatio: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconButton icon="cards-heart" size={28} iconColor={theme.colors.secondary} style={{ margin: 0 }} />
            <Text variant="labelSmall" style={{ fontWeight: 'bold', textAlign: 'center', marginTop: 4 }}>Swipes</Text>
          </TouchableOpacity>

          {/* Review List Card */}
          <TouchableOpacity 
            onPress={() => router.push('/utilities/instagram/story-planner/review-list')}
            activeOpacity={0.8}
            style={{ 
              flex: 1, 
              backgroundColor: theme.colors.surfaceVariant, 
              borderRadius: 16, 
              padding: 8, 
              aspectRatio: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ position: 'relative' }}>
              <IconButton icon="alert-decagram" size={28} iconColor={theme.colors.error} style={{ margin: 0 }} />
              {needsReviewCount > 0 && (
                <View style={{ position: 'absolute', top: 0, right: 0, backgroundColor: theme.colors.error, borderRadius: 10, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ color: theme.colors.onError, fontSize: 9, fontWeight: 'bold' }}>{needsReviewCount}</Text>
                </View>
              )}
            </View>
            <Text variant="labelSmall" style={{ fontWeight: 'bold', textAlign: 'center', marginTop: 4 }}>Review</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.profileList}>
        <Text variant="titleLarge" style={[styles.sectionTitle, { marginBottom: 0, marginTop: -8 }]}>Active Profiles</Text>
          {profileCategories.map((category) => {
            const categoryProfiles = watchlist.filter(p => p.profileCategory === category.id);
            if (categoryProfiles.length === 0) return null;
            return (
              <List.Accordion 
                key={category.id} 
                id={category.id}
                title={`${category.name} (${categoryProfiles.length})`}
                titleStyle={{ fontWeight: 'bold' }}
                expanded={expandedCategories[category.id] !== false}
                onPress={() => {
                  setExpandedCategories(prev => ({
                    ...prev,
                    [category.id]: prev[category.id] === false ? true : false
                  }));
                }}
              >
                <View style={styles.profileGrid}>
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
                      style={styles.profileGridItem}
                    >
                      <View style={styles.profileCard}>
                        <ProfileAvatar 
                          profile={{ ...item, isInWatchlist: true }} 
                          size={60} 
                          showBadge={true}
                        />
                      </View>
                      <Text 
                        variant="labelSmall" 
                        style={styles.profileUsername} 
                        numberOfLines={1}
                      >
                        {item.username}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </List.Accordion>
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

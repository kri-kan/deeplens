import React, { useState, useEffect } from 'react';
import { View, ScrollView, FlatList, TouchableOpacity, Modal, BackHandler } from 'react-native';
import { Text, Avatar, IconButton, Surface, ActivityIndicator, Appbar, Menu, Button, Portal, Dialog } from 'react-native-paper';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { VideoItem } from '@/components/utility/instagram/VideoItem';
import { ProfileHeader } from '@/components/utility/instagram/ProfileHeader';
import { QuotaDashboard } from '@/components/utility/instagram/QuotaDashboard';
import { ControlCenter } from '@/components/utility/instagram/ControlCenter';
import { SettingsModal } from '@/components/utility/instagram/SettingsModal';
import { PostDetailView } from '@/components/utility/instagram/PostDetailView';
import { BentoCard } from '@/components/ui/BentoCard';

import { useInstagramExplorer } from '@/hooks/useInstagramExplorer';
import { styles } from '@/styles/screens/instagram-explorer.styles';
import { useTheme } from 'react-native-paper';

export default function InstagramExplorer() {
  const theme = useTheme();
  const {
    watchlist,
    selectedProfile,
    setSelectedProfile,
    profileData,
    loading,
    activeQueue,
    jobHistory,
    quota,
    showQueue,
    setShowQueue,
    showConfig,
    setShowConfig,
    showQueueHistory,
    setShowQueueHistory,
    syncMode,
    setSyncMode,
    targetPostCount,
    setTargetPostCount,
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
    manualSync,
    deleteProfileData,
    toggleWatch,
    toggleOwn,
    fetchQueue,
    selectProfile,
  } = useInstagramExplorer();

  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

  useEffect(() => {
    const backAction = () => {
      if (selectedPost) {
        setSelectedPost(null);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedPost]);

  const formatDateDisplay = (dateString: string | null) => {
    if (!dateString) return 'Select';
    const d = new Date(dateString);
    return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear().toString().slice(-2)}`;
  };

  if (selectedProfile && profileData) {
    return (
      <Surface style={styles.container}>
        <Appbar.Header style={{ backgroundColor: theme.colors.surface, height: 48 }}>
          <Appbar.BackAction onPress={() => { setSelectedProfile(null); }} />
          <Appbar.Content title={`@${selectedProfile}`} titleStyle={styles.bold} />
          <Appbar.Action icon="clipboard-list-outline" onPress={() => setShowQueue(true)} />
        </Appbar.Header>

        <FlatList
          data={profileData.videos}
          renderItem={({ item }) => <VideoItem item={item} onPress={() => setSelectedPost(item)} />}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListHeaderComponent={
            <View>
              <ProfileHeader 
                profile={profileData.profile}
                metrics={profileData.metrics}
                onShowSettings={() => setShowConfig(true)}
                bioExpanded={bioExpanded}
                onToggleBio={() => setBioExpanded(!bioExpanded)}
              />

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

              {profileData.profile.is_data_deleted && (
                <View style={styles.deletedPlaceholder}>
                    <IconButton icon="image-off-outline" size={48} style={{ opacity: 0.3 }} />
                    <Text variant="bodyMedium" style={{ opacity: 0.5 }}>Media data was removed</Text>
                    <Button mode="text" compact onPress={manualSync}>Sync now to restore</Button>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !profileData.profile.is_data_deleted ? (
              <View style={styles.empty}>
                <Text variant="bodyLarge">No posts found</Text>
              </View>
            ) : null
          }
        />

        <SettingsModal 
          visible={showConfig}
          onClose={() => setShowConfig(false)}
          profile={profileData.profile}
          syncMode={syncMode}
          onSyncModeChange={setSyncMode}
          targetPostCount={targetPostCount}
          onTargetPostCountChange={setTargetPostCount}
          onSync={manualSync}
          onDeleteData={deleteProfileData}
          onToggleWatch={() => toggleWatch(profileData.profile.username, profileData.profile.is_active)}
          onToggleOwn={() => toggleOwn(profileData.profile.username, profileData.profile.is_own_account)}
          loading={loading}
        />

        <ControlCenter 
          visible={showQueue}
          onClose={() => setShowQueue(false)}
          activeQueue={activeQueue}
          jobHistory={jobHistory}
          showHistory={showQueueHistory}
          onToggleHistory={setShowQueueHistory}
          onRefresh={fetchQueue}
        />

        <Portal>
          <Modal
            visible={!!selectedPost}
            animationType="slide"
            onRequestClose={() => setSelectedPost(null)}
          >
            {selectedPost && (
              <View style={styles.modalContent}>
                <PostDetailView 
                  item={selectedPost} 
                  onClose={() => setSelectedPost(null)} 
                />
              </View>
            )}
          </Modal>
        </Portal>
      </Surface>
    );
  }

  return (
    <ScreenWrapper 
      title="Instagram Explorer"
      actions={<Appbar.Action icon="clipboard-list-outline" onPress={() => setShowQueue(true)} />}
    >
      <QuotaDashboard quota={quota} />

      <View style={styles.profileList}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Active Profiles</Text>
        <View style={styles.profileGrid}>
          {watchlist.map(item => (
            <TouchableOpacity 
              key={item.id} 
              onPress={() => selectProfile(item.username)}
              activeOpacity={0.7}
              style={styles.profileGridItem}
            >
              <View style={styles.profileCard}>
                {item.profilePictureUrl ? (
                  <Avatar.Image 
                    size={60} 
                    source={{ uri: item.profilePictureUrl }} 
                  />
                ) : (
                  <Avatar.Text 
                    size={60} 
                    label={item.username?.substring(0, 2).toUpperCase() || '??'} 
                  />
                )}
                {item.isOwnAccount && (
                  <View style={styles.ownAccountBadge}>
                    <Avatar.Icon size={16} icon="check-decagram" />
                  </View>
                )}
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
      </View>

      <ControlCenter 
        visible={showQueue}
        onClose={() => setShowQueue(false)}
        activeQueue={activeQueue}
        jobHistory={jobHistory}
        showHistory={showQueueHistory}
        onToggleHistory={setShowQueueHistory}
        onRefresh={fetchQueue}
      />

      {loading && (
        <View style={styles.empty}>
           <ActivityIndicator animating={true} color={theme.colors.primary} />
           <Text style={{ marginTop: 16 }}>Loading profile data...</Text>
        </View>
      )}
    </ScreenWrapper>
  );
}

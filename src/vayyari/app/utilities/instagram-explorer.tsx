import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Dimensions, Alert, RefreshControl, Linking, BackHandler, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text, Button, Card, Avatar, IconButton, Divider, Surface, Chip, SegmentedButtons, TextInput, useTheme, Switch, List, ActivityIndicator, Icon, Appbar, Menu } from 'react-native-paper';
import { BentoCard } from '@/components/ui/BentoCard';
import { instagramService } from '../../services/instagram.service';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

export default function InstagramExplorer() {
  const theme = useTheme();
  const { token } = useAuth();
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeQueue, setActiveQueue] = useState<any[]>([]);
  const [jobHistory, setJobHistory] = useState<any[]>([]);
  const [quota, setQuota] = useState<any | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showQueueHistory, setShowQueueHistory] = useState(false);
  const [syncMode, setSyncMode] = useState<'recent' | 'full'>('recent');
  const [targetPostCount, setTargetPostCount] = useState('12');

  const [bioExpanded, setBioExpanded] = useState(false);

  const [sortBy, setSortBy] = useState<'date' | 'likes' | 'comments'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    try {
      const data = await instagramService.getWatchlist();
      setWatchlist(data);
    } catch (err) {
      console.error('Failed to fetch watchlist', err);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const [active, history] = await Promise.all([
        instagramService.getActiveJobs(),
        instagramService.getJobHistory()
      ]);
      setActiveQueue(active);
      setJobHistory(history);
    } catch (err) {
      console.error('Failed to fetch queue', err);
    }
  }, []);

  const fetchQuota = useCallback(async () => {
    try {
      const data = await instagramService.getQuota();
      setQuota(data);
    } catch (err) {
      console.error('Failed to fetch quota', err);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
    fetchQuota();
  }, [fetchWatchlist, fetchQuota]);

  useEffect(() => {
    if (showQueue) {
      fetchQueue();
      const interval = setInterval(fetchQueue, 5000);
      return () => clearInterval(interval);
    }
  }, [showQueue, fetchQueue]);

  const selectProfile = async (username: string, sBy?: string, sOrder?: string, fDate?: string | null, tDate?: string | null) => {
    setSelectedProfile(username);
    setLoading(true);
    try {
      const data = await instagramService.getProfileDetails(
        username, 
        sBy || sortBy, 
        sOrder || sortOrder, 
        fDate === undefined ? fromDate || undefined : fDate || undefined, 
        tDate === undefined ? toDate || undefined : tDate || undefined
      );
      setProfileData(data);
    } catch (err) {
      console.error('Failed to fetch profile details', err);
      Alert.alert("Error", "Could not load profile data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProfile) {
      selectProfile(selectedProfile, sortBy, sortOrder, fromDate, toDate);
    }
  }, [sortBy, sortOrder, fromDate, toDate]);

  useEffect(() => {
    const backAction = () => {
      if (selectedProfile) {
        setSelectedProfile(null);
        setProfileData(null);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [selectedProfile]);

  const manualSync = async () => {
    if (!selectedProfile) return;
    setLoading(true);
    try {
      const count = syncMode === 'full' ? 0 : parseInt(targetPostCount, 10);
      await instagramService.syncProfile(selectedProfile, count);
      Alert.alert("Success", syncMode === 'full' ? "Full profile sync queued." : `Sync for ${count} posts queued.`);
      setShowConfig(false);
      fetchQueue();
    } catch (err) {
      Alert.alert("Sync Failed", "Could not complete the scraping. Check rate limits.");
    } finally {
      setLoading(false);
    }
  };

  const deleteProfileData = async () => {
    if (!selectedProfile) return;
    Alert.alert(
      "Confirm Delete",
      "This will remove all downloaded media tiles for this profile. Database records will remain but media won't show until re-scraped.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await instagramService.deleteProfileData(selectedProfile);
              Alert.alert("Success", "Media data removed.");
              selectProfile(selectedProfile);
            } catch (err) {
              Alert.alert("Error", "Failed to delete data.");
            }
          }
        }
      ]
    );
  };

  const toggleWatch = async (username: string, currentStatus: boolean) => {
    try {
      await instagramService.toggleWatchStatus(username, !currentStatus);
      fetchWatchlist();
      if (selectedProfile === username) {
        selectProfile(username);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update status.");
    }
  };

  const toggleOwn = async (username: string, currentStatus: boolean) => {
    try {
      await instagramService.toggleOwnAccount(username, !currentStatus);
      fetchWatchlist();
      if (selectedProfile === username) {
        selectProfile(username);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update ownership status.");
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      await instagramService.deleteJob(jobId);
      fetchQueue();
    } catch (err) {
      Alert.alert("Error", "Failed to delete job.");
    }
  };

  const updatePriority = async (jobId: string, priority: number) => {
    try {
      await instagramService.updateJob(jobId, { priority });
      fetchQueue();
    } catch (err) {
      Alert.alert("Error", "Failed to update priority.");
    }
  };

  const healQueue = async () => {
    try {
      await instagramService.healQueue();
      fetchQueue();
      Alert.alert("Success", "Queue self-healing triggered.");
    } catch (err) {
      Alert.alert("Error", "Failed to trigger recovery.");
    }
  };

  const formatDateDisplay = (dateString: string | null) => {
    if (!dateString) return 'Select';
    const d = new Date(dateString);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  const getMediaUri = (item: any) => {
    // Check both camelCase and PascalCase just in case of serialization differences
    const path = item.storagePath || item.StoragePath;
    if (path) {
      return `http://192.168.0.170:5000/api/v1/Attachment/download?path=${encodeURIComponent(path)}`;
    }
    return item.thumbnailUrl || item.mediaUrl;
  };

  const renderVideoItem = ({ item }: { item: any }) => (
    <View style={styles.videoItem}>
      <Image 
        source={{ uri: getMediaUri(item) }} 
        style={styles.thumbnail}
        contentFit="cover"
        transition={200}
      />
      {item.permalink && (
        <IconButton 
          icon="open-in-new" 
          iconColor="white" 
          size={16} 
          style={styles.openLinkIcon}
          onPress={() => Linking.openURL(item.permalink)}
        />
      )}
      {(item.mediaType === 'VIDEO' || item.mediaType === 'REEL') && (
        <View style={styles.reelBadge}>
          <Icon source="play" size={10} color="white" />
          <Text style={styles.badgeText}> REEL</Text>
        </View>
      )}
      <View style={styles.videoStats}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={styles.statsText}>❤️ {(item.likeCount || 0).toLocaleString()}</Text>
                <Text style={styles.statsText}>💬 {(item.commentsCount || 0).toLocaleString()}</Text>
            </View>
            <IconButton 
              icon="link-variant" 
              iconColor="white" 
              size={14} 
              style={{ margin: 0 }}
              onPress={async () => {
                if (item.permalink) {
                  await Clipboard.setStringAsync(item.permalink);
                }
              }}
            />
        </View>
      </View>
    </View>
  );

  return (
    <Surface style={styles.container}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface, height: 48 }}>
        {selectedProfile ? (
          <Appbar.BackAction onPress={() => { setSelectedProfile(null); setProfileData(null); }} />
        ) : (
          <Appbar.Action icon="instagram" />
        )}
        <Appbar.Content title={selectedProfile ? `@${selectedProfile}` : "Instagram Explorer"} titleStyle={styles.bold} />
        <Appbar.Action icon="clipboard-list-outline" onPress={() => setShowQueue(true)} />
      </Appbar.Header>

      {selectedProfile && profileData ? (
        <View style={{ flex: 1 }}>
          <FlatList
            data={profileData.videos}
            renderItem={renderVideoItem}
            keyExtractor={(item) => item.id}
            numColumns={COLUMN_COUNT}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={{ paddingVertical: 8 }}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                  <Image 
                    source={{ uri: profileData.profile.profilePictureUrl }} 
                    style={{ width: 80, height: 80, borderRadius: 40 }}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.profileMeta}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 4 }}>
                        <Text variant="titleLarge" style={styles.bold}>{profileData.profile.name}</Text>
                        {profileData.profile.is_own_account && <Icon source="check-decagram" size={20} color={theme.colors.primary} />}
                      </View>
                      <IconButton icon="cog" size={20} style={{ margin: 0 }} onPress={() => setShowConfig(true)} />
                    </View>
                    <Text 
                      variant="bodySmall" 
                      style={{ marginTop: 2 }} 
                      numberOfLines={bioExpanded ? undefined : 3}
                      onPress={() => setBioExpanded(!bioExpanded)}
                    >
                      {profileData.profile.biography}
                    </Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text variant="titleMedium" style={styles.bold}>{(profileData.profile.followersCount || 0).toLocaleString()}</Text>
                    <Text variant="labelSmall">Followers</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text variant="titleMedium" style={styles.bold}>{profileData.profile.mediaCount}</Text>
                    <Text variant="labelSmall">Posts</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text variant="titleMedium" style={styles.bold}>{(profileData.metrics.avgLikes || 0).toLocaleString()}</Text>
                    <Text variant="labelSmall">Avg. Likes</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text variant="titleMedium" style={styles.bold}>{profileData.metrics.engagementRate?.toFixed(2)}%</Text>
                    <Text variant="labelSmall">Eng. Rate</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 0 }}>
                  {/* Sort & Order Group */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.outline, fontSize: 13, fontWeight: 'bold' }}>Sort:</Text>
                    <Menu
                      visible={sortMenuVisible}
                      onDismiss={() => setSortMenuVisible(false)}
                      anchor={
                        <Button 
                          mode="text" 
                          compact 
                          onPress={() => setSortMenuVisible(true)}
                          labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
                          style={{ marginLeft: -4 }}
                        >
                          {sortBy === 'date' ? 'Date' : sortBy === 'likes' ? 'Likes' : 'Comments'}
                        </Button>
                      }
                    >
                      <Menu.Item onPress={() => { setSortBy('date'); setSortMenuVisible(false); }} title="Date" titleStyle={{ fontSize: 14 }} />
                      <Menu.Item onPress={() => { setSortBy('likes'); setSortMenuVisible(false); }} title="Likes" titleStyle={{ fontSize: 14 }} />
                      <Menu.Item onPress={() => { setSortBy('comments'); setSortMenuVisible(false); }} title="Comments" titleStyle={{ fontSize: 14 }} />
                    </Menu>

                    <IconButton 
                      icon={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} 
                      size={20} 
                      onPress={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                      style={{ margin: 0, marginLeft: -4 }}
                    />
                  </View>

                  {/* Date Range Group */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.outline, fontSize: 13, fontWeight: 'bold' }}>From:</Text>
                    <Button 
                      mode="text" 
                      compact 
                      onPress={() => setShowFromPicker(true)}
                      labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
                      style={{ marginLeft: -4 }}
                    >
                      {formatDateDisplay(fromDate)}
                    </Button>
                    
                    <Text style={{ color: theme.colors.outline, fontSize: 13, fontWeight: 'bold', marginLeft: 4 }}>To:</Text>
                    <Button 
                      mode="text" 
                      compact 
                      onPress={() => setShowToPicker(true)}
                      labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
                      style={{ marginLeft: -4 }}
                    >
                      {formatDateDisplay(toDate)}
                    </Button>

                    {(fromDate || toDate) && (
                      <IconButton 
                        icon="close-circle-outline" 
                        size={16} 
                        onPress={() => { setFromDate(null); setToDate(null); }} 
                        style={{ margin: 0, marginLeft: -4 }}
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
                      <Button mode="text" compact onPress={() => manualSync()}>Sync now to restore</Button>
                  </View>
                )}
              </View>
            }
            ListEmptyComponent={
              !profileData.profile.is_data_deleted ? (
                <View style={styles.empty}>
                  <Text variant="bodyLarge">No posts found for this profile</Text>
                </View>
              ) : null
            }
          />
        </View>
      ) : !selectedProfile ? (
        <ScrollView style={{ flex: 1 }}>
          {/* Quota Dashboard */}
          {quota && (
            <Surface style={[styles.quotaCard, { backgroundColor: theme.colors.surfaceVariant, margin: 16 }]} elevation={1}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Icon source="gauge" size={20} color={theme.colors.primary} />
                        <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>Quota Dashboard</Text>
                    </View>
                    <Text variant="labelSmall" style={{ opacity: 0.6 }}>Updated {new Date(quota.lastUpdated).toLocaleTimeString()}</Text>
                </View>
                
                <View style={styles.quotaGrid}>
                    <View style={styles.quotaItem}>
                        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                            {quota.requestsInLastHour}
                        </Text>
                        <Text variant="labelSmall">Last Hour</Text>
                    </View>
                    <View style={styles.quotaItem}>
                        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                            {quota.metrics.callCount}%
                        </Text>
                        <Text variant="labelSmall">App Usage</Text>
                    </View>
                    <View style={styles.quotaItem}>
                        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: quota.estimatedRemainingRequests < 100 ? theme.colors.error : theme.colors.tertiary }}>
                            {quota.estimatedRemainingRequests}
                        </Text>
                        <Text variant="labelSmall">Est. Left</Text>
                    </View>
                </View>
            </Surface>
          )}

          <View style={{ padding: 0 }}>
             <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12, paddingHorizontal: 16, marginTop: 16 }}>Active Profiles</Text>
             <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0 }}>
               {watchlist.map(item => {
                 const GRID_COLUMN_COUNT = 4;
                 const GRID_GAP = 0;
                 const GRID_PADDING = 0;
                 const GRID_TILE_SIZE = width / GRID_COLUMN_COUNT;

                 return (
                   <TouchableOpacity 
                     key={item.id} 
                     onPress={() => selectProfile(item.username)}
                     activeOpacity={0.7}
                     style={{ width: GRID_TILE_SIZE, height: GRID_TILE_SIZE + 20 }}
                   >
                     <BentoCard 
                        surfaceLevel="surfaceContainerLow"
                        style={{ padding: 0, alignItems: 'center', justifyContent: 'center', height: GRID_TILE_SIZE, borderRadius: 0 }}
                     >
                       <Avatar.Image 
                         size={GRID_TILE_SIZE * 0.6} 
                         source={{ uri: item.profilePictureUrl }} 
                       />
                       {item.isOwnAccount && (
                         <View style={{ position: 'absolute', top: 4, right: 4 }}>
                            <Icon source="check-decagram" size={14} color={theme.colors.primary} />
                         </View>
                       )}
                     </BentoCard>
                     <Text 
                       variant="labelSmall" 
                       style={{ textAlign: 'center', marginTop: 4, fontWeight: 'bold' }} 
                       numberOfLines={1}
                     >
                       {item.username}
                     </Text>
                   </TouchableOpacity>
                 );
               })}
             </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.empty}>
           <ActivityIndicator animating={true} color={theme.colors.primary} />
           <Text style={{ marginTop: 16 }}>Loading profile data...</Text>
        </View>
      )}

      {showConfig && profileData && (
        <Surface style={styles.configModal} elevation={4}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text variant="titleLarge" style={styles.bold}>Profile Settings</Text>
                <IconButton icon="close" onPress={() => setShowConfig(false)} />
            </View>

            {/* Watching Toggle */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, backgroundColor: theme.colors.surfaceVariant, paddingHorizontal: 16, borderRadius: 12, marginBottom: 12 }}>
                <View>
                    <Text variant="labelLarge" style={styles.bold}>Watchlist Status</Text>
                    <Text variant="labelSmall" style={{ opacity: 0.7 }}>{profileData.profile.is_active ? 'Active (Syncing)' : 'Paused (Ignored)'}</Text>
                </View>
                <Switch 
                    value={profileData.profile.is_active} 
                    onValueChange={() => toggleWatch(profileData.profile.username, profileData.profile.is_active)} 
                />
            </View>

            {/* My Account Toggle */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, backgroundColor: theme.colors.surfaceVariant, paddingHorizontal: 16, borderRadius: 12, marginBottom: 24 }}>
                <View>
                    <Text variant="labelLarge" style={styles.bold}>My Account</Text>
                    <Text variant="labelSmall" style={{ opacity: 0.7 }}>{profileData.profile.is_own_account ? 'Flagged as Mine' : 'Competitor Account'}</Text>
                </View>
                <Switch 
                    value={profileData.profile.is_own_account} 
                    onValueChange={() => toggleOwn(profileData.profile.username, profileData.profile.is_own_account)} 
                />
            </View>

            <Divider style={{ marginBottom: 24 }} />

            {/* Manual Sync Section */}
            <Text variant="labelLarge" style={[styles.bold, { marginBottom: 12 }]}>Trigger Manual Sync</Text>
            <SegmentedButtons
                value={syncMode}
                onValueChange={v => setSyncMode(v as any)}
                buttons={[
                    { value: 'recent', label: 'Recent', icon: 'clock-outline' },
                    { value: 'full', label: 'Full Profile', icon: 'all-inclusive' },
                ]}
                style={{ marginBottom: 16 }}
            />

            {syncMode === 'recent' && (
                <TextInput
                    label="Number of posts"
                    value={targetPostCount}
                    onChangeText={setTargetPostCount}
                    keyboardType="numeric"
                    mode="outlined"
                    dense
                    style={{ marginBottom: 16 }}
                />
            )}

            <Button 
                mode="contained" 
                onPress={manualSync} 
                loading={loading}
                icon="sync"
                style={{ marginBottom: 24, borderRadius: 8 }}
            >
                Run Scrape Now
            </Button>

            <Divider style={{ marginVertical: 8 }} />
            <Text variant="labelSmall" style={{ color: theme.colors.error, marginBottom: 8, fontWeight: 'bold' }}>DANGER ZONE</Text>
            <Button 
                mode="contained-tonal" 
                buttonColor={theme.colors.errorContainer}
                textColor={theme.colors.error}
                icon="delete-forever"
                onPress={() => { setShowConfig(false); deleteProfileData(); }}
                style={{ borderRadius: 8 }}
            >
                Delete Profile Data
            </Button>
        </Surface>
      )}


      {/* Queue Modal */}
      {showQueue && (
          <Surface style={[styles.configModal, { height: '80%' }]} elevation={5}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Scraper Control Center</Text>
                <IconButton icon="autorenew" onPress={healQueue} />
              </View>

              <SegmentedButtons
                value={showQueueHistory ? 'history' : 'active'}
                onValueChange={(v) => setShowQueueHistory(v === 'history')}
                buttons={[
                  { value: 'active', label: `Active (${activeQueue.length})` },
                  { value: 'history', label: 'History' },
                ]}
                style={{ marginBottom: 16 }}
              />
              
              <ScrollView>
                  {!showQueueHistory ? (
                    activeQueue.map((item) => (
                      <View key={item.id} style={styles.queueItem}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>@{item.username}</Text>
                                {item.priority > 1 && <Chip compact textStyle={{ fontSize: 8 }}>HIGH</Chip>}
                            </View>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                {item.origin} • {item.job_type.toUpperCase()} • {item.scraped_count || 0}/{item.target_count === 0 ? 'All' : item.target_count} Posts
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                                <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                                    Next: {item.next_run_at ? new Date(item.next_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ASAP'}
                                </Text>
                            </View>
                            <IconButton icon="arrow-up-bold-outline" size={18} onPress={() => updatePriority(item.id, 10)} />
                            <IconButton icon="close" size={18} iconColor={theme.colors.error} onPress={() => deleteJob(item.id)} />
                          </View>
                      </View>
                    ))
                  ) : (
                    jobHistory.map((item) => (
                        <View key={item.id} style={[styles.queueItem, { opacity: 0.8 }]}>
                            <View style={{ flex: 1 }}>
                                <Text variant="labelMedium" style={{ fontWeight: 'bold' }}>@{item.username}</Text>
                                <Text variant="labelSmall">{item.job_type.toUpperCase()} • {item.status}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text variant="labelSmall">{new Date(item.completed_at).toLocaleDateString()}</Text>
                                <Text variant="labelSmall" style={{ fontWeight: 'bold' }}>{item.scraped_count} Posts</Text>
                            </View>
                        </View>
                    ))
                  )}
                  {((!showQueueHistory && activeQueue.length === 0) || (showQueueHistory && jobHistory.length === 0)) && (
                      <Text style={{ textAlign: 'center', marginTop: 40 }}>Nothing to show</Text>
                  )}
              </ScrollView>

              <Button mode="contained" onPress={() => setShowQueue(false)} style={{ marginTop: 16 }}>
                  Close
              </Button>
          </Surface>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bold: {
    fontWeight: 'bold',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  profileMeta: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 4,
  },
  statBox: {
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  videoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  videoStats: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  reelBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  openLinkIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    margin: 0,
  },
  empty: {
    marginTop: 100,
    alignItems: 'center',
  },
  deletedPlaceholder: {
    alignItems: 'center',
    paddingVertical: 60,
    opacity: 0.8,
  },
  configModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: 'white',
    zIndex: 1000,
  },
  queueItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  quotaCard: {
    margin: 16,
    padding: 0,
    borderRadius: 16,
    marginTop: 0,
  },
  quotaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  quotaItem: {
    alignItems: 'center',
  },
});

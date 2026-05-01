import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, FlatList, Image, Dimensions, Alert } from 'react-native';
import { Surface, Text, Appbar, Avatar, Card, Button, List, Divider, useTheme, ActivityIndicator, IconButton, SegmentedButtons, Chip, ProgressBar, Switch } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { instagramService, InstagramProfile, InstagramVideo, MetaQuotaInfo } from '../../services/instagram.service';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

export default function InstagramExplorer() {
  const theme = useTheme();
  const router = useRouter();
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [activeQueue, setActiveQueue] = useState<any[]>([]);
  const [jobHistory, setJobHistory] = useState<any[]>([]);
  const [syncMode, setSyncMode] = useState<'recent' | 'full'>('recent');
  const [targetPostCount, setTargetPostCount] = useState('50');
  const [quota, setQuota] = useState<MetaQuotaInfo | null>(null);

  useEffect(() => {
    loadWatchlist();
    loadQuota();
    
    // Auto-refresh jobs if the queue is open
    const interval = setInterval(() => {
      if (showQueue) {
        loadQueue();
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [showQueue]);

  const loadQuota = async () => {
    try {
      const q = await instagramService.getQuota();
      setQuota(q);
    } catch (error) {
      console.error('Failed to load quota', error);
    }
  };

  const loadWatchlist = async () => {
    try {
      const data = await instagramService.getWatchlist();
      setProfiles(data);
    } catch (error) {
      console.error('Failed to load watchlist', error);
    }
  };

  const selectProfile = async (username: string, refresh: boolean = false) => {
    setSelectedProfile(username);
    if (!refresh) setShowWatchlist(false);
    setLoading(true);
    try {
      const data = await instagramService.getProfileDetails(username);
      setProfileData(data);
      // Load jobs too
      const allJobs = await instagramService.getActiveJobs();
      setJobs(allJobs);
      const myJob = allJobs.find(j => j.username === username);
      setActiveJob(myJob);
    } catch (error) {
      console.error('Failed to load profile details', error);
    } finally {
      setLoading(false);
    }
  };

  const startDeepScrape = async () => {
    if (!profileData) return;
    try {
      await instagramService.createJob({
        watchlistId: profileData.profile.username,
        target_count: 500,
        priority: 3
      });
      Alert.alert("Deep Sync Queued", `A comprehensive scan for @${profileData.profile.username} has been added to the queue.`);
      selectProfile(profileData.profile.username);
    } catch (error) {
      console.error("Failed to start job", error);
    }
  };

  const toggleJob = async () => {
    if (!activeJob) return;
    try {
      if (activeJob.status === 'paused') {
          await instagramService.updateJob(activeJob.id, { status: 'pending' });
      } else {
          await instagramService.updateJob(activeJob.id, { status: 'paused' });
      }
      selectProfile(selectedProfile!);
    } catch (error) {
       console.error("Failed to toggle job", error);
    }
  };

  const saveConfig = async (oneTimeTarget: number) => {
    if (!profileData) return;
    try {
      await instagramService.createJob({
          watchlistId: profileData.profile.username,
          target_count: oneTimeTarget,
          job_type: 'manual',
          priority: 5
      });
      Alert.alert("Backfill Queued", `A one-time sync for ${oneTimeTarget} posts has been added.`);
      setShowConfig(false);
      selectProfile(selectedProfile!);
    } catch (error) {
       console.error("Failed to queue backfill", error);
    }
  };

  const manualSync = async () => {
    if (!selectedProfile) {
      Alert.alert("No Profile Selected", "Please select a profile from the watchlist first.");
      return;
    }
    
    try {
      setLoading(true);
      const count = syncMode === 'full' ? 0 : parseInt(targetPostCount) || 50;
      const result: any = await instagramService.syncProfile(selectedProfile, count);
      
      Alert.alert(
        "Job Queued", 
        `Deep sync for @${selectedProfile} has been added to the queue (Job ID: ${result.jobId.substring(0, 8)}). You can monitor progress in the Control Center.`
      );
      
      // Refresh current view to show the job status if it's active
      await selectProfile(selectedProfile);
      await loadQuota();
    } catch (error) {
      console.error("Manual sync failed", error);
      Alert.alert("Sync Failed", "Could not complete the scraping. Check rate limits.");
    } finally {
      setLoading(false);
    }
  };

  const deleteJob = async (id: string) => {
      try {
          await instagramService.deleteJob(id);
          loadQueue();
      } catch (error) {
           console.error("Delete job failed", error);
      }
  };

  const updatePriority = async (id: string, priority: number) => {
    try {
        await instagramService.updateJob(id, { priority });
        loadQueue();
    } catch (error) {
         console.error("Update priority failed", error);
    }
  };

  const loadQueue = async () => {
    try {
        const q = await instagramService.getActiveJobs();
        setActiveQueue(q);
        const h = await instagramService.getJobHistory();
        setJobHistory(h);
    } catch (error) {
        console.error("Failed to load queue", error);
    }
  };

  const healQueue = async () => {
    try {
        await instagramService.healQueue();
        loadQueue();
    } catch (error) {
        console.error("Failed to heal queue", error);
    }
  };

  const deleteProfileData = async () => {
    if (!profileData) return;
    const username = profileData.profile.username;

    Alert.alert(
      "Delete Profile Data?",
      "This will permanently delete all downloaded thumbnails and post history for this profile. The profile record itself will remain in your watchlist.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Everything", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await instagramService.deleteProfileData(username);
              Alert.alert("Data Deleted", "All media and posts have been removed.");
              selectProfile(username, true);
            } catch (error) {
              console.error("Delete data failed", error);
              Alert.alert("Error", "Failed to delete profile data.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getMediaUri = (item: any) => {
    if (item.storagePath) {
      // Proxy through our backend to get MinIO image
      // Assuming searchApiClient.defaults.baseURL is available or similar
      return `http://10.0.2.2:5000/api/v1/Attachment/download?path=${encodeURIComponent(item.storagePath)}`;
    }
    return item.thumbnailUrl || item.mediaUrl;
  };

  const renderVideoItem = ({ item }: { item: any }) => (
    <View style={styles.videoItem}>
      <Image source={{ uri: getMediaUri(item) }} style={styles.thumbnail} />
      {item.mediaType === 'reel' && (
        <View style={styles.reelBadge}>
          <Text style={styles.badgeText}>REEL</Text>
        </View>
      )}
      <View style={styles.videoStats}>
        <Text style={styles.statsText}>❤️ {(item.likeCount || 0).toLocaleString()}</Text>
      </View>
    </View>
  );

  const toggleWatch = async (username: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await instagramService.toggleWatchStatus(username, newStatus);
      // Update local state
      setProfiles(prev => prev.map(p => p.username === username ? { ...p, is_active: newStatus } : p));
      if (profileData?.profile?.username === username) {
        setProfileData({ ...profileData, profile: { ...profileData.profile, is_active: newStatus } });
      }
    } catch (error) {
      console.error("Toggle watch failed", error);
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        {selectedProfile ? (
          <Appbar.BackAction onPress={() => setSelectedProfile(null)} />
        ) : (
          <Appbar.BackAction onPress={() => router.back()} />
        )}
        <Appbar.Content title={selectedProfile ? `@${selectedProfile}` : "Instagram Explorer"} />
        <Appbar.Action icon="tray-full" onPress={() => { loadQueue(); setShowQueue(true); }} />
        <Appbar.Action icon="refresh" onPress={loadWatchlist} />
      </Appbar.Header>

      {!selectedProfile ? (
        <View style={{ flex: 1 }}>
          {/* Quota Dashboard (Moved to main list) */}
          {quota && (
            <Surface style={[styles.quotaCard, { backgroundColor: theme.colors.surfaceVariant, margin: 16 }]} elevation={1}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <IconButton icon="gauge" size={20} style={{ margin: 0 }} />
                  <Text variant="labelLarge" style={{ fontWeight: 'bold' }}>Meta API Quota</Text>
                </View>
                <IconButton icon="refresh" size={18} style={{ margin: 0 }} onPress={loadQuota} />
              </View>
              
              <View style={styles.quotaGrid}>
                <View style={styles.quotaItem}>
                  <Text variant="displaySmall" style={{ fontSize: 24, fontWeight: 'bold' }}>{quota.metrics.callCount}%</Text>
                  <Text variant="labelSmall">Usage</Text>
                </View>
                <View style={styles.quotaItem}>
                  <Text variant="displaySmall" style={{ fontSize: 24, fontWeight: 'bold' }}>{quota.requestsInLastHour}</Text>
                  <Text variant="labelSmall">Req/Hr</Text>
                </View>
                <View style={styles.quotaItem}>
                  <Text variant="displaySmall" style={{ fontSize: 24, fontWeight: 'bold', color: quota.estimatedRemainingRequests < 20 ? theme.colors.error : theme.colors.primary }}>
                    {quota.estimatedRemainingRequests}
                  </Text>
                  <Text variant="labelSmall">Remaining</Text>
                </View>
              </View>

              <ProgressBar 
                progress={quota.metrics.callCount / 100} 
                color={quota.metrics.callCount > 90 ? theme.colors.error : theme.colors.primary} 
                style={{ height: 6, borderRadius: 3, marginTop: 12 }} 
              />
            </Surface>
          )}

          {/* Add New Profile Search */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
             <Card style={{ padding: 4 }} elevation={2}>
               <List.Item
                 title="Add New Profile"
                 description="Enter Instagram handle to scrape"
                 left={props => <List.Icon {...props} icon="plus-circle-outline" />}
                 onPress={() => setShowConfig(true)}
               />
             </Card>
          </View>

          <FlatList
            data={profiles}
            keyExtractor={(item) => item.id}
            refreshing={loading}
            onRefresh={loadWatchlist}
            ListHeaderComponent={() => (
              <Text variant="titleMedium" style={{ paddingHorizontal: 16, marginBottom: 8, fontWeight: 'bold' }}>
                Watched Profiles ({profiles.length})
              </Text>
            )}
            renderItem={({ item }) => (
              <List.Item
                title={`@${item.username}`}
                description={item.display_name}
                onPress={() => selectProfile(item.username)}
                left={props => <Avatar.Image {...props} size={40} source={{ uri: item.profile_pic_url }} />}
                right={props => (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text variant="labelSmall" style={{ opacity: 0.6, marginRight: 4 }}>
                      {item.is_data_deleted ? 'Deleted' : (item.is_active ? 'Watching' : 'Paused')}
                    </Text>
                    <Switch 
                      value={item.is_active} 
                      onValueChange={() => toggleWatch(item.username, item.is_active)} 
                    />
                  </View>
                )}
              />
            )}
            ItemSeparatorComponent={Divider}
          />
        </View>
      ) : (
        <ScrollView>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 50 }} />
          ) : profileData?.profile ? (
            <View style={styles.content}>
            {profileData.profile.is_data_deleted && (
              <Surface style={styles.deletedBanner} elevation={1}>
                <IconButton icon="delete-variant" iconColor={theme.colors.error} size={20} />
                <Text variant="labelMedium" style={{ color: theme.colors.error, fontWeight: 'bold' }}>
                  POST DATA DELETED
                </Text>
              </Surface>
            )}
            <View style={styles.profileHeader}>
              <View style={{ position: 'relative' }}>
                <Avatar.Image size={80} source={{ uri: profileData.profile.profilePictureUrl }} />
                {profileData.profile.is_verified && (
                  <IconButton 
                    icon="check-decagram" 
                    iconColor={theme.colors.primary} 
                    size={20} 
                    style={{ position: 'absolute', bottom: -10, right: -10, margin: 0, backgroundColor: theme.colors.surface }} 
                  />
                )}
              </View>
              <View style={styles.profileMeta}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="headlineSmall" style={[styles.bold, { flex: 1 }]} numberOfLines={1}>
                    {profileData.profile.name || profileData.profile.username}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text variant="labelSmall" style={{ opacity: 0.7 }}>Watching</Text>
                    <Switch 
                      value={profileData.profile.is_active} 
                      onValueChange={() => toggleWatch(profileData.profile.username, profileData.profile.is_active)} 
                    />
                  </View>
                </View>
                {profileData.profile.category_name && (
                  <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 4 }}>
                    {profileData.profile.category_name}
                  </Text>
                )}
                <Text variant="bodyMedium" numberOfLines={3}>{profileData.profile.biography}</Text>
                {profileData.profile.website && (
                  <Button compact mode="text" labelStyle={{ fontSize: 12 }} style={{ alignSelf: 'flex-start', marginLeft: -8 }}>
                    {profileData.profile.website}
                  </Button>
                )}
                
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
                  <View>
                    <Text variant="titleSmall" style={styles.bold}>{profileData.profile.followersCount?.toLocaleString()}</Text>
                    <Text variant="labelSmall" style={{ opacity: 0.6 }}>Followers</Text>
                  </View>
                  <View>
                    <Text variant="titleSmall" style={styles.bold}>{profileData.profile.followsCount?.toLocaleString()}</Text>
                    <Text variant="labelSmall" style={{ opacity: 0.6 }}>Following</Text>
                  </View>
                  <View>
                    <Text variant="titleSmall" style={styles.bold}>{profileData.profile.mediaCount?.toLocaleString()}</Text>
                    <Text variant="labelSmall" style={{ opacity: 0.6 }}>Posts</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text variant="titleMedium" style={styles.bold}>{(profileData.metrics.avgLikes || 0).toLocaleString()}</Text>
                <Text variant="labelSmall">Avg Likes</Text>
              </View>
              <View style={styles.statBox}>
                <Text variant="titleMedium" style={styles.bold}>{profileData.metrics.engagementRate?.toFixed(2)}%</Text>
                <Text variant="labelSmall">Eng. Rate</Text>
              </View>
              {profileData.metrics.postFrequency && (
                <View style={styles.statBox}>
                  <Text variant="titleMedium" style={styles.bold}>{profileData.metrics.postFrequency.toFixed(1)}</Text>
                  <Text variant="labelSmall">Posts/Wk</Text>
                </View>
              )}
            </View>

            <View style={styles.syncOptions}>
              <Text variant="labelLarge" style={{ marginBottom: 8, fontWeight: 'bold' }}>Sync Scope</Text>
              <SegmentedButtons
                value={syncMode}
                onValueChange={v => setSyncMode(v as any)}
                buttons={[
                  { value: 'recent', label: 'Recent' },
                  { value: 'full', label: 'Full Profile' },
                ]}
                style={{ marginBottom: 12 }}
              />
              
              {syncMode === 'recent' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text variant="bodyMedium">Last</Text>
                  <SegmentedButtons
                    value={targetPostCount}
                    onValueChange={setTargetPostCount}
                    density="medium"
                    buttons={[
                      { value: '25', label: '25' },
                      { value: '50', label: '50' },
                      { value: '100', label: '100' },
                      { value: '200', label: '200' },
                    ]}
                    style={{ flex: 1 }}
                  />
                  <Text variant="bodyMedium">Posts</Text>
                </View>
              )}
            </View>

            <View style={styles.actionRow}>
              <Button 
                mode="contained" 
                icon={syncMode === 'full' ? 'sync' : 'flash'} 
                loading={loading}
                onPress={manualSync}
                style={{ flex: 1, marginRight: 8 }}
              >
                {syncMode === 'full' ? 'Full Sync' : 'Sync Recent'}
              </Button>
              <Button 
                mode="outlined" 
                icon="cog" 
                onPress={() => setShowConfig(true)}
                style={{ flex: 1 }}
              >
                Actions
              </Button>
            </View>

            {activeJob ? (
              <Surface style={styles.jobBar} elevation={1}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text variant="labelMedium" style={{ fontWeight: 'bold' }}>
                    {activeJob.status.toUpperCase()} Sync: {activeJob.scraped_count} Posts
                  </Text>
                  <Button compact mode="contained-tonal" onPress={toggleJob}>
                    {activeJob.status === 'paused' ? 'Resume' : 'Pause'}
                  </Button>
                </View>
                <ProgressBar progress={(activeJob.scraped_count || 0) / (activeJob.target_count || 1)} color={theme.colors.primary} />
              </Surface>
            ) : (
                <Button 
                    mode="text" 
                    icon="auto-fix" 
                    onPress={startDeepScrape}
                    style={{ marginBottom: 16 }}
                >
                    Initiate Deep Scrape
                </Button>
            )}



            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.bold}>Latest Content</Text>
              {!profileData.profile.is_data_deleted && (
                <Button compact mode="text" onPress={() => setShowRaw(!showRaw)}>
                  {showRaw ? "Hide Raw" : "View Raw"}
                </Button>
              )}
            </View>

            {profileData.profile.is_data_deleted ? (
               <View style={styles.deletedPlaceholder}>
                  <IconButton icon="image-off-outline" size={48} style={{ opacity: 0.3 }} />
                  <Text variant="bodyMedium" style={{ opacity: 0.5 }}>Media data was removed</Text>
                  <Button mode="text" compact onPress={() => manualSync()}>Sync now to restore</Button>
               </View>
            ) : showRaw ? (
              <Surface style={styles.rawBox} elevation={1}>
                <Text style={styles.rawText}>{JSON.stringify(profileData, null, 2)}</Text>
              </Surface>
            ) : (
              <View style={styles.grid}>
                {profileData.videos.map((item: any) => (
                  <View key={item.id} style={styles.videoItem}>
                    <Image source={{ uri: getMediaUri(item) }} style={styles.thumbnail} />
                    <View style={styles.videoStats}>
                      <Text style={styles.statsText}>❤️ {(item.likeCount || 0).toLocaleString()}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
          ) : (
            <View style={styles.empty}>
              <Text variant="bodyLarge">No profile data found</Text>
            </View>
          )}
        </ScrollView>
      )}

      {showConfig && profileData && (
        <Surface style={styles.configModal} elevation={4}>
            <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: 'bold' }}>Scrape Actions</Text>
            
            <Text variant="labelSmall">ONE-TIME FULL BACKFILL</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button 
                    mode="contained-tonal" 
                    onPress={() => saveConfig(500)}
                    compact
                    style={{ flex: 1 }}
                >
                    500 Posts
                </Button>
                <Button 
                    mode="contained-tonal" 
                    onPress={() => saveConfig(1000)}
                    compact
                    style={{ flex: 1 }}
                >
                    1000 Posts
                </Button>
            </View>

            <Divider style={{ marginVertical: 16 }} />
            <Text variant="labelSmall" style={{ color: theme.colors.error }}>DESTRUCTIVE ACTIONS</Text>
            <Button 
                mode="contained-tonal" 
                buttonColor={theme.colors.errorContainer}
                textColor={theme.colors.error}
                icon="delete-forever"
                onPress={() => { setShowConfig(false); deleteProfileData(); }}
                style={{ marginTop: 8 }}
            >
                Delete Profile Data
            </Button>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 8 }}>
                <Button mode="outlined" onPress={() => setShowConfig(false)}>Cancel</Button>
            </View>
        </Surface>
      )}

      {/* Queue Modal */}
      {showQueue && (
          <Surface style={[styles.configModal, { height: '80%' }]} elevation={5}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Scraper Control Center</Text>
                <IconButton icon="refresh" onPress={healQueue} />
              </View>

              <SegmentedButtons
                value={showRaw ? 'history' : 'active'}
                onValueChange={(v) => setShowRaw(v === 'history')}
                buttons={[
                  { value: 'active', label: `Active (${activeQueue.length})` },
                  { value: 'history', label: 'History' },
                ]}
                style={{ marginBottom: 16 }}
              />
              
              <ScrollView>
                  {!showRaw ? (
                    activeQueue.map((item) => (
                      <View key={item.id} style={styles.queueItem}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>@{item.username}</Text>
                                {item.priority > 1 && <Chip compact textStyle={{ fontSize: 8 }}>HIGH</Chip>}
                            </View>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                {item.origin} • {item.job_type.toUpperCase()} • {item.scraped_count || 0}/{item.target_count || 12} Posts
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
                  {((!showRaw && activeQueue.length === 0) || (showRaw && jobHistory.length === 0)) && (
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
  content: {
    // paddingVertical: 16,
  },
  deletedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    marginHorizontal: 16,
    paddingRight: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  deletedPlaceholder: {
    alignItems: 'center',
    paddingVertical: 60,
    opacity: 0.8,
  },
  watchlistDropdown: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 100,
    borderRadius: 8,
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
  bold: {
    fontWeight: 'bold',
  },
  syncOptions: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
    // paddingHorizontal: 16,
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
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  videoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderWidth: 0.5,
    borderColor: 'white',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  reelBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  videoStats: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  statsText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  rawBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  rawText: {
    fontFamily: 'monospace',
    fontSize: 10,
  },
  empty: {
    marginTop: 100,
    alignItems: 'center',
  },
  jobBar: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff3e0',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffe0b2',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f57c00',
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
    padding: 12,
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
  }
});

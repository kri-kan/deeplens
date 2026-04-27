import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, FlatList, Image, Dimensions, Alert } from 'react-native';
import { Surface, Text, Appbar, Avatar, Card, Button, List, Divider, useTheme, ActivityIndicator, IconButton, SegmentedButtons, Chip, ProgressBar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { instagramService, InstagramProfile, InstagramVideo } from '../../services/instagram.service';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT - 10;

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
  const [depth, setDepth] = useState('12');
  const [frequency, setFrequency] = useState('0');
  const [showQueue, setShowQueue] = useState(false);
  const [activeQueue, setActiveQueue] = useState<any[]>([]);
  const [jobHistory, setJobHistory] = useState<any[]>([]);

  useEffect(() => {
    loadWatchlist();
  }, []);

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
        target_count: 500
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

  const saveConfig = async (oneTimeTarget?: number) => {
    if (!profileData) return;
    try {
      if (oneTimeTarget) {
        await instagramService.createJob({
            watchlistId: profileData.profile.username,
            target_count: oneTimeTarget,
            job_type: 'manual'
        });
        Alert.alert("Backfill Queued", `A one-time sync for ${oneTimeTarget} posts has been added.`);
        setShowConfig(false);
        selectProfile(selectedProfile!);
        return;
      }

      const mins = frequency === '0' ? 0 : Math.round(1440 / parseInt(frequency));
      await instagramService.updateConfig(profileData.profile.id, {
        posts_depth: parseInt(depth),
        frequency_profile_mins: mins
      });
      setShowConfig(false);
      loadWatchlist();
    } catch (error) {
       console.error("Failed to save config", error);
    }
  };

  const manualSync = async () => {
    if (!selectedProfile) {
      Alert.alert("No Profile Selected", "Please select a profile from the watchlist first.");
      return;
    }
    
    try {
      setLoading(true);
      await instagramService.syncProfile(selectedProfile);
      Alert.alert("Sync Requested", `A priority update for @${selectedProfile} has been added to the queue.`);
      // Refresh current view to show the new active job
      setTimeout(() => selectProfile(selectedProfile), 1000);
    } catch (error) {
      console.error("Manual sync failed", error);
      Alert.alert("Sync Failed", "Could not reach the scraper service.");
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

  const renderVideoItem = ({ item }: { item: InstagramVideo }) => (
    <View style={styles.videoItem}>
      <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
      {item.media_type === 'reel' && (
        <View style={styles.reelBadge}>
          <Text style={styles.badgeText}>REEL</Text>
        </View>
      )}
      <View style={styles.videoStats}>
        <Text style={styles.statsText}>❤️ {(item.like_count || 0).toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Profile Explorer" />
        <Appbar.Action icon="tray-full" onPress={() => { loadQueue(); setShowQueue(true); }} />
        <Appbar.Action icon="account-search" onPress={loadWatchlist} />
      </Appbar.Header>

      <ScrollView stickyHeaderIndices={[0]}>
        {/* Selector Header */}
        <View style={{ backgroundColor: theme.colors.background, padding: 16 }}>
          <Button 
            mode="outlined" 
            onPress={() => setShowWatchlist(!showWatchlist)}
            icon={showWatchlist ? "chevron-up" : "chevron-down"}
            contentStyle={{ flexDirection: 'row-reverse' }}
          >
            {selectedProfile ? `@${selectedProfile}` : "Select Profile..."}
          </Button>
          
          {showWatchlist && (
            <Surface style={styles.watchlistDropdown} elevation={2}>
              {profiles.map((p) => (
                <List.Item
                  key={p.id}
                  title={`@${p.username}`}
                  description={p.display_name}
                  left={props => <Avatar.Image {...props} size={32} source={{ uri: p.profile_pic_url }} />}
                  onPress={() => selectProfile(p.username)}
                />
              ))}
            </Surface>
          )}
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 50 }} />
        ) : profileData ? (
          <View style={styles.content}>
            <View style={styles.profileHeader}>
              <View style={{ position: 'relative' }}>
                <Avatar.Image size={80} source={{ uri: profileData.profile.profile_pic_url }} />
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
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                  <Text variant="headlineSmall" style={styles.bold}>{profileData.profile.display_name}</Text>
                  {profileData.profile.is_business && (
                    <Chip compact textStyle={{ fontSize: 10 }} style={{ height: 24 }}>BUSINESS</Chip>
                  )}
                </View>
                {profileData.profile.category_name && (
                  <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 4 }}>
                    {profileData.profile.category_name}
                  </Text>
                )}
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{profileData.profile.bio}</Text>
                
                {(profileData.profile.public_email || profileData.profile.contact_phone || profileData.profile.external_url) && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    {profileData.profile.public_email && <IconButton icon="email-outline" size={18} style={{ margin: 0 }} />}
                    {profileData.profile.contact_phone && <IconButton icon="phone-outline" size={18} style={{ margin: 0 }} />}
                    {profileData.profile.external_url && <IconButton icon="link-variant" size={18} style={{ margin: 0 }} onPress={() => {}} />}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.actionRow}>
              <Button 
                mode="contained" 
                icon="flash" 
                loading={loading}
                onPress={manualSync}
                style={{ flex: 1, marginRight: 8 }}
              >
                Sync Now
              </Button>
              <Button 
                mode="outlined" 
                icon="cog" 
                onPress={() => setShowConfig(true)}
                style={{ flex: 1 }}
              >
                Settings
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

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text variant="titleLarge" style={styles.bold}>{(profileData.profile.follower_count || 0).toLocaleString()}</Text>
                <Text variant="labelSmall">Followers</Text>
              </View>
              <View style={styles.statBox}>
                <Text variant="titleLarge" style={styles.bold}>{(profileData.profile.following_count || 0).toLocaleString()}</Text>
                <Text variant="labelSmall">Following</Text>
              </View>
              <View style={styles.statBox}>
                <Text variant="titleLarge" style={styles.bold}>{(profileData.profile.post_count || 0).toLocaleString()}</Text>
                <Text variant="labelSmall">Posts</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.bold}>Latest Content</Text>
              <Button compact mode="text" onPress={() => setShowRaw(!showRaw)}>
                {showRaw ? "Hide Raw" : "View Raw"}
              </Button>
            </View>

            {showRaw ? (
              <Surface style={styles.rawBox} elevation={1}>
                <Text style={styles.rawText}>{JSON.stringify(profileData, null, 2)}</Text>
              </Surface>
            ) : (
              <FlatList
                data={profileData.videos}
                renderItem={renderVideoItem}
                keyExtractor={item => item.id}
                numColumns={COLUMN_COUNT}
                scrollEnabled={false}
                contentContainerStyle={styles.grid}
              />
            )}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text variant="bodyLarge">No profile selected</Text>
          </View>
        )}
      </ScrollView>

      {showConfig && profileData && (
        <Surface style={styles.configModal} elevation={4}>
            <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: 'bold' }}>Scrape Preferences</Text>
            
            <Text variant="labelSmall">SYNC FREQUENCY (PER DAY)</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {['0', '1', '2', '4'].map(f => (
                    <Button 
                        key={f}
                        mode={frequency === f ? 'contained' : 'outlined'}
                        onPress={() => setFrequency(f)}
                        compact
                    >
                        {f === '0' ? 'Manual' : `${f}x`}
                    </Button>
                ))}
            </View>

            <View style={{ height: 24 }} />

            <Text variant="labelSmall">CONTENT DEPTH (PER SYNC)</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {['12', '50', '100'].map(d => (
                    <Button 
                        key={d}
                        mode={depth === d ? 'contained' : 'outlined'}
                        onPress={() => setDepth(d)}
                        compact
                    >
                        {d}
                    </Button>
                ))}
            </View>

            <View style={{ height: 24 }} />
            <Divider />
            <View style={{ height: 16 }} />

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

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 8 }}>
                <Button onPress={() => setShowConfig(false)}>Cancel</Button>
                <Button mode="contained" onPress={() => saveConfig()}>Save Preferences</Button>
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
                                    Next: {new Date(item.next_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
    padding: 16,
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
    marginBottom: 24,
  },
  profileMeta: {
    flex: 1,
  },
  bold: {
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 24,
  },
  statBox: {
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  grid: {
    gap: 10,
  },
  videoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: 5,
    borderRadius: 8,
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
  }
});

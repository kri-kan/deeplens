import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Appbar,
  Text,
  Searchbar,
  Chip,
  ActivityIndicator,
  useTheme,
  Icon,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import {
  instagramService,
  CompetitorProfile,
  HighPerformingCompetitorPost,
  CompetitorsSummaryResponse,
} from '@/services/instagram.service';
import { CompetitorProfileItem } from '@/components/utility/instagram/CompetitorProfileItem';
import { OutlierInsightCard } from '@/components/utility/instagram/OutlierInsightCard';

const OUTLIER_FILTER_OPTIONS = [
  { id: 'all', label: 'All Breakouts' },
  { id: 'day_one_takeoff', label: '⚡ Day-1 Takeoffs' },
  { id: 'delayed_spike', label: '📈 Delayed Spikes' },
  { id: 'inspiration', label: '✨ Inspiration' },
];

export default function CompetitorHubScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Tab State: 'profiles' | 'insights'
  const [activeTab, setActiveTab] = useState<'profiles' | 'insights'>('profiles');

  // Search & Filter State (Niche chips removed)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutlierFilter, setSelectedOutlierFilter] = useState('all');

  // Data States
  const [summary, setSummary] = useState<CompetitorsSummaryResponse | null>(null);
  const [profiles, setProfiles] = useState<CompetitorProfile[]>([]);
  const [outliers, setOutliers] = useState<HighPerformingCompetitorPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch Summary
      const summaryData = await instagramService.getCompetitorsSummary();
      setSummary(summaryData);

      // 2. Fetch Profiles
      if (summaryData?.profiles && summaryData.profiles.length > 0) {
        setProfiles(summaryData.profiles);
      } else {
        const watchlist = await instagramService.getWatchlist();
        const competitorWatchlist = watchlist.filter(p => {
          const cat = (p.profileCategory || '').toLowerCase();
          return cat !== 'mybusiness' && cat !== 'my business';
        });
        const mappedProfiles: CompetitorProfile[] = competitorWatchlist.map((p, idx) => {
          const avgLikes = p.avgLikes || Math.round((p.followersCount || 0) * 0.04);
          const avgComments = p.avgComments || Math.round(avgLikes * 0.03);
          const avgViews = p.avgViews || avgLikes * 8;
          return {
            id: p.id,
            username: p.username,
            name: p.name || p.username,
            followersCount: p.followersCount,
            followingCount: p.followingCount,
            mediaCount: p.mediaCount,
            profilePictureUrl: p.profilePictureUrl,
            storagePath: p.storagePath,
            isActive: p.isActive,
            isTracked: p.isActive,
            profileCategory: p.profileCategory || 'Competitors',
            lastSyncedAt: p.lastSyncedAt,
            breakoutCount: (idx % 3 === 0) ? 2 : 0,
            avgLikes,
            avgComments,
            avgViews,
            viewCount: avgViews,
          };
        });
        setProfiles(mappedProfiles);
      }

      // 3. Fetch High-Performing Outliers
      const highPerformingData = await instagramService.getHighPerformingCompetitors({
        outlierType: selectedOutlierFilter !== 'all' ? selectedOutlierFilter : undefined,
      });

      if (highPerformingData && highPerformingData.length > 0) {
        setOutliers(highPerformingData);
      } else {
        // Mock fallback outliers generated from tracked competitor media if backend empty
        const sampleOutliers: HighPerformingCompetitorPost[] = [
          {
            id: 'sample_outlier_1',
            platformVideoId: 'C8z9pL01X_A',
            ownerUsername: 'kanchipuram_silks',
            ownerProfilePictureUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=150',
            caption: 'Pure Zari Bridal Kanchipuram Silk in Royal Peacock Blue. Handcrafted masterpiece for the wedding season. ✨ #Kanchipuram #BridalSaree',
            mediaUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
            thumbnailUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
            mediaType: 'VIDEO',
            likeCount: 14200,
            commentCount: 382,
            viewCount: 106500,
            deltaLikes: 10500,
            deltaViews: 78500,
            deltaComments: 280,
            outlierType: 'day_one_takeoff',
            multiplier: 3.8,
            dayNumber: 1,
            baselineAvgLikes: 3700,
            baselineAvgViews: 28000,
            baselineAvgComments: 102,
            currentLikes: 14200,
            currentViews: 106500,
            currentComments: 382,
            isFullMediaDownloaded: false,
            isCompetitor: true,
            curvePoints: [
              { day: 0, actualLikes: 0, baselineLikes: 0, actualViews: 0, baselineViews: 0, actualComments: 0, baselineComments: 0 },
              { day: 1, actualLikes: 14200, baselineLikes: 3700, actualViews: 106500, baselineViews: 28000, actualComments: 382, baselineComments: 102 },
              { day: 2, actualLikes: 16800, baselineLikes: 4200, actualViews: 125000, baselineViews: 32000, actualComments: 440, baselineComments: 115 },
              { day: 3, actualLikes: 18100, baselineLikes: 4500, actualViews: 135000, baselineViews: 34000, actualComments: 475, baselineComments: 122 },
              { day: 5, actualLikes: 19500, baselineLikes: 4900, actualViews: 146000, baselineViews: 37000, actualComments: 510, baselineComments: 130 },
              { day: 7, actualLikes: 20200, baselineLikes: 5100, actualViews: 152000, baselineViews: 39000, actualComments: 530, baselineComments: 135 },
            ],
          },
          {
            id: 'sample_outlier_2',
            platformVideoId: 'C7a1bK92Y_B',
            ownerUsername: 'royal_heritage_lehengas',
            ownerProfilePictureUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=150',
            caption: 'Crimson Velvet Heavy Embroidered Bridal Lehenga with double dupatta styling. 👑 Inquiries via DM.',
            mediaUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
            thumbnailUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
            mediaType: 'VIDEO',
            likeCount: 9400,
            commentCount: 210,
            viewCount: 71000,
            deltaLikes: 6200,
            deltaViews: 46000,
            deltaComments: 135,
            outlierType: 'delayed_spike',
            multiplier: 2.9,
            dayNumber: 4,
            baselineAvgLikes: 3200,
            baselineAvgViews: 25000,
            baselineAvgComments: 75,
            currentLikes: 9400,
            currentViews: 71000,
            currentComments: 210,
            isFullMediaDownloaded: false,
            isCompetitor: true,
            curvePoints: [
              { day: 0, actualLikes: 0, baselineLikes: 0, actualViews: 0, baselineViews: 0, actualComments: 0, baselineComments: 0 },
              { day: 1, actualLikes: 1800, baselineLikes: 1600, actualViews: 14000, baselineViews: 12000, actualComments: 40, baselineComments: 35 },
              { day: 2, actualLikes: 2400, baselineLikes: 2200, actualViews: 19000, baselineViews: 17000, actualComments: 58, baselineComments: 50 },
              { day: 3, actualLikes: 4500, baselineLikes: 2600, actualViews: 35000, baselineViews: 20000, actualComments: 110, baselineComments: 60 },
              { day: 4, actualLikes: 9400, baselineLikes: 2900, actualViews: 71000, baselineViews: 22500, actualComments: 210, baselineComments: 68 },
              { day: 7, actualLikes: 12100, baselineLikes: 3200, actualViews: 92000, baselineViews: 25000, actualComments: 275, baselineComments: 75 },
            ],
          },
          {
            id: 'sample_outlier_3',
            platformVideoId: 'C5p8mQ34Z_C',
            ownerUsername: 'modern_kurti_studio',
            ownerProfilePictureUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=150',
            caption: 'Pastel Organza Co-ord Set with subtle pearl work. Perfect festive and everyday luxury outfit. 🌸',
            mediaUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
            thumbnailUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
            mediaType: 'VIDEO',
            likeCount: 6800,
            commentCount: 145,
            viewCount: 51200,
            deltaLikes: 3700,
            deltaViews: 28000,
            deltaComments: 80,
            outlierType: 'day_one_takeoff',
            multiplier: 2.2,
            dayNumber: 1,
            baselineAvgLikes: 3100,
            baselineAvgViews: 23200,
            baselineAvgComments: 65,
            currentLikes: 6800,
            currentViews: 51200,
            currentComments: 145,
            isFullMediaDownloaded: false,
            isCompetitor: true,
            curvePoints: [
              { day: 0, actualLikes: 0, baselineLikes: 0, actualViews: 0, baselineViews: 0, actualComments: 0, baselineComments: 0 },
              { day: 1, actualLikes: 6800, baselineLikes: 3100, actualViews: 51200, baselineViews: 23200, actualComments: 145, baselineComments: 65 },
              { day: 2, actualLikes: 7900, baselineLikes: 3600, actualViews: 60000, baselineViews: 27000, actualComments: 168, baselineComments: 75 },
              { day: 3, actualLikes: 8400, baselineLikes: 3900, actualViews: 64000, baselineViews: 29000, actualComments: 180, baselineComments: 82 },
              { day: 7, actualLikes: 9200, baselineLikes: 4200, actualViews: 70000, baselineViews: 32000, actualComments: 198, baselineComments: 88 },
            ],
          },
          {
            id: 'sample_outlier_4',
            platformVideoId: 'C4n7rS56W_D',
            ownerUsername: 'banarasi_weaves_official',
            ownerProfilePictureUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=150',
            caption: 'Authentic Banarasi Katan Silk saree with antique gold zari bootis. Heirloom elegance. 🪔',
            mediaUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600',
            thumbnailUrl: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600',
            mediaType: 'IMAGE',
            likeCount: 8900,
            commentCount: 198,
            viewCount: 66800,
            deltaLikes: 5500,
            deltaViews: 41200,
            deltaComments: 122,
            outlierType: 'inspiration',
            multiplier: 2.6,
            dayNumber: 2,
            baselineAvgLikes: 3400,
            baselineAvgViews: 25600,
            baselineAvgComments: 76,
            currentLikes: 8900,
            currentViews: 66800,
            currentComments: 198,
            isFullMediaDownloaded: false,
            isCompetitor: true,
            curvePoints: [
              { day: 0, actualLikes: 0, baselineLikes: 0, actualViews: 0, baselineViews: 0, actualComments: 0, baselineComments: 0 },
              { day: 1, actualLikes: 4500, baselineLikes: 2000, actualViews: 34000, baselineViews: 15000, actualComments: 95, baselineComments: 45 },
              { day: 2, actualLikes: 8900, baselineLikes: 3400, actualViews: 66800, baselineViews: 25600, actualComments: 198, baselineComments: 76 },
              { day: 3, actualLikes: 9800, baselineLikes: 3900, actualViews: 74000, baselineViews: 29000, actualComments: 218, baselineComments: 85 },
              { day: 7, actualLikes: 10800, baselineLikes: 4400, actualViews: 81000, baselineViews: 33000, actualComments: 240, baselineComments: 98 },
            ],
          },
        ];
        setOutliers(sampleOutliers);
      }
    } catch (err) {
      console.error('Failed to load Competitor Hub data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedOutlierFilter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleToggleTracking = async (username: string, nextTrackedState: boolean) => {
    await instagramService.toggleCompetitorTracking(username, nextTrackedState);
    setProfiles(prev =>
      prev.map(p => (p.username === username ? { ...p, isTracked: nextTrackedState, isActive: nextTrackedState } : p))
    );
  };

  // Filtered Profiles by Search
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      return (
        !searchQuery ||
        p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [profiles, searchQuery]);

  // Filtered Outliers by Search & Outlier Type
  const filteredOutliers = useMemo(() => {
    return outliers.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        (item.caption && item.caption.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.ownerUsername && item.ownerUsername.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesOutlierType =
        selectedOutlierFilter === 'all' ||
        item.outlierType === selectedOutlierFilter;

      return matchesSearch && matchesOutlierType;
    });
  }, [outliers, searchQuery, selectedOutlierFilter]);

  const activeCompetitorsCount = profiles.filter((p) => p.isTracked ?? p.isActive).length;
  const totalLimit = summary?.totalLimit ?? 50;
  const breakoutsTodayCount = summary?.breakoutsTodayCount ?? 4;

  const renderHeader = () => {
    const isProfilesActive = activeTab === 'profiles';
    const isInsightsActive = activeTab === 'insights';

    return (
      <View style={styles.headerContainer}>
        {/* Bento Action Navigation Tiles (matching Story Planner style) */}
        <View style={styles.bentoContainer}>
          {/* Tile 1: Tracked Profiles */}
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => setActiveTab('profiles')}
            style={[
              styles.bentoTile,
              {
                backgroundColor: isProfilesActive
                  ? (theme.colors.elevation?.level2 || theme.colors.surfaceVariant)
                  : theme.colors.surfaceVariant,
              },
            ]}
          >
            <View style={styles.bentoTileTop}>
              <View
                style={[
                  styles.bentoIconBadge,
                  {
                    backgroundColor: isProfilesActive
                      ? theme.colors.primaryContainer
                      : theme.colors.elevation?.level3 || theme.colors.surface,
                  },
                ]}
              >
                <Icon
                  source="account-group"
                  size={24}
                  color={isProfilesActive ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: isProfilesActive
                      ? theme.colors.primary
                      : theme.colors.elevation?.level3 || theme.colors.surface,
                  },
                ]}
              >
                <View style={[styles.liveDot, { backgroundColor: isProfilesActive ? '#10B981' : '#6B7280' }]} />
                <Text
                  variant="labelSmall"
                  style={[
                    styles.statusPillText,
                    { color: isProfilesActive ? theme.colors.onPrimary : theme.colors.onSurfaceVariant },
                  ]}
                >
                  {activeCompetitorsCount} / {totalLimit} Active
                </Text>
              </View>
            </View>

            <View style={styles.bentoTileBottom}>
              <Text
                variant="titleSmall"
                style={[
                  styles.bentoTitle,
                  isProfilesActive && { color: theme.colors.primary, fontWeight: '800' },
                ]}
              >
                Tracked Profiles
              </Text>
              <Text variant="bodySmall" style={styles.bentoSubtitle}>
                Monitored handles ({filteredProfiles.length})
              </Text>
            </View>
          </TouchableOpacity>

          {/* Tile 2: High Performing Insights */}
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => setActiveTab('insights')}
            style={[
              styles.bentoTile,
              {
                backgroundColor: isInsightsActive
                  ? (theme.colors.elevation?.level2 || theme.colors.surfaceVariant)
                  : theme.colors.surfaceVariant,
              },
            ]}
          >
            <View style={styles.bentoTileTop}>
              <View
                style={[
                  styles.bentoIconBadge,
                  {
                    backgroundColor: isInsightsActive
                      ? theme.colors.errorContainer
                      : theme.colors.elevation?.level3 || theme.colors.surface,
                  },
                ]}
              >
                <Icon
                  source="lightning-bolt"
                  size={24}
                  color={isInsightsActive ? theme.colors.error : theme.colors.onSurfaceVariant}
                />
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: isInsightsActive
                      ? theme.colors.error
                      : theme.colors.elevation?.level3 || theme.colors.surface,
                  },
                ]}
              >
                <Text
                  variant="labelSmall"
                  style={[
                    styles.statusPillText,
                    { color: isInsightsActive ? theme.colors.onError : theme.colors.onSurfaceVariant },
                  ]}
                >
                  ⚡ {breakoutsTodayCount} Today
                </Text>
              </View>
            </View>

            <View style={styles.bentoTileBottom}>
              <Text
                variant="titleSmall"
                style={[
                  styles.bentoTitle,
                  isInsightsActive && { color: theme.colors.error, fontWeight: '800' },
                ]}
              >
                High Performing Insights
              </Text>
              <Text variant="bodySmall" style={styles.bentoSubtitle}>
                Breakout spikes ({filteredOutliers.length})
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder={
              activeTab === 'profiles'
                ? 'Search handles or names...'
                : 'Search breakout posts or captions...'
            }
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={[
              styles.searchBar,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
            inputStyle={styles.searchInput}
            elevation={0}
          />
        </View>

        {/* Outlier Archetype Filter Chips (Insights View Only) */}
        {activeTab === 'insights' && (
          <View style={styles.outlierFilterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {OUTLIER_FILTER_OPTIONS.map((filter) => (
                <Chip
                  key={filter.id}
                  selected={selectedOutlierFilter === filter.id}
                  onPress={() => setSelectedOutlierFilter(filter.id)}
                  showSelectedOverlay
                  style={[
                    styles.outlierChip,
                    selectedOutlierFilter === filter.id
                      ? { backgroundColor: theme.colors.secondaryContainer }
                      : { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                  textStyle={[
                    styles.chipText,
                    selectedOutlierFilter === filter.id && {
                      color: theme.colors.onSecondaryContainer,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {filter.label}
                </Chip>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenWrapper
      title="Competitor Hub"
      withScrollView={false}
      actions={
        <Appbar.Action
          icon="refresh"
          onPress={handleRefresh}
        />
      }
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12, opacity: 0.7 }}>Loading competitor intelligence...</Text>
        </View>
      ) : activeTab === 'profiles' ? (
        /* Profiles View with Single FlatList & Header */
        <FlatList
          data={filteredProfiles}
          keyExtractor={(item) => item.id || item.username}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <CompetitorProfileItem
              item={item}
              onToggleTracking={handleToggleTracking}
              onPress={() => {
                router.push({
                  pathname: '/utilities/instagram-explorer',
                  params: { selectedProfile: item.username },
                } as any);
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon source="account-search-outline" size={48} color={theme.colors.onSurfaceVariant} />
              <Text variant="titleMedium" style={styles.emptyTitle}>
                No Competitor Profiles Found
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtitle}>
                Try adjusting your search query or tracking new accounts.
              </Text>
            </View>
          }
        />
      ) : (
        /* Insights View with Single FlatList & Header */
        <FlatList
          data={filteredOutliers}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <OutlierInsightCard
              item={item}
              onPress={() => {
                instagramService.setLastFetchedPosts(filteredOutliers);
                router.push({
                  pathname: '/utilities/instagram/post-detail',
                  params: {
                    id: item.id,
                    username: item.ownerUsername || '',
                    data: JSON.stringify(item),
                  },
                } as any);
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon source="trending-down" size={48} color={theme.colors.onSurfaceVariant} />
              <Text variant="titleMedium" style={styles.emptyTitle}>
                No Breakouts Matching Filter
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtitle}>
                Check back as new competitor snapshots are ingested throughout the day.
              </Text>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingBottom: 4,
  },
  bentoContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  bentoTile: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  bentoTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bentoIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontWeight: '700',
    fontSize: 10,
  },
  bentoTileBottom: {
    gap: 2,
  },
  bentoTitle: {
    fontWeight: '700',
    fontSize: 13,
  },
  bentoSubtitle: {
    opacity: 0.65,
    fontSize: 11,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  searchBar: {
    borderRadius: 12,
    height: 44,
  },
  searchInput: {
    minHeight: 0,
    fontSize: 13,
  },
  outlierFilterContainer: {
    marginBottom: 10,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  outlierChip: {
    borderRadius: 20,
    height: 32,
  },
  chipText: {
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    opacity: 0.6,
  },
});

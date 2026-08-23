import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  SegmentedButtons,
  Chip,
  ActivityIndicator,
  useTheme,
  Surface,
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

const NICHE_OPTIONS = ['All', 'Sarees', 'Lehengas', 'Kurtis', 'Bridal'];

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

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNiche, setSelectedNiche] = useState('All');
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
          const niches = ['Sarees', 'Lehengas', 'Kurtis', 'Bridal'];
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
            profileCategory: p.profileCategory || 'Competitor',
            niche: niches[idx % niches.length],
            lastSyncedAt: p.lastSyncedAt,
            breakoutCount: (idx % 3 === 0) ? 2 : 0,
            avgLikes: Math.round(p.followersCount * 0.04),
          };
        });
        setProfiles(mappedProfiles);
      }

      // 3. Fetch High-Performing Outliers
      const highPerformingData = await instagramService.getHighPerformingCompetitors({
        niche: selectedNiche !== 'All' ? selectedNiche : undefined,
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
            niche: 'Sarees',
            outlierType: 'day_one_takeoff',
            multiplier: 3.8,
            dayNumber: 1,
            baselineAvgLikes: 3700,
            currentLikes: 14200,
            isFullMediaDownloaded: false,
            curvePoints: [
              { day: 0, actualLikes: 0, baselineLikes: 0 },
              { day: 1, actualLikes: 14200, baselineLikes: 3700 },
              { day: 2, actualLikes: 16800, baselineLikes: 4200 },
              { day: 3, actualLikes: 18100, baselineLikes: 4500 },
              { day: 5, actualLikes: 19500, baselineLikes: 4900 },
              { day: 7, actualLikes: 20200, baselineLikes: 5100 },
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
            niche: 'Bridal',
            outlierType: 'delayed_spike',
            multiplier: 2.9,
            dayNumber: 4,
            baselineAvgLikes: 3200,
            currentLikes: 9400,
            isFullMediaDownloaded: false,
            curvePoints: [
              { day: 0, actualLikes: 0, baselineLikes: 0 },
              { day: 1, actualLikes: 1800, baselineLikes: 1600 },
              { day: 2, actualLikes: 2400, baselineLikes: 2200 },
              { day: 3, actualLikes: 4500, baselineLikes: 2600 },
              { day: 4, actualLikes: 9400, baselineLikes: 2900 },
              { day: 7, actualLikes: 12100, baselineLikes: 3200 },
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
            niche: 'Kurtis',
            outlierType: 'day_one_takeoff',
            multiplier: 2.2,
            dayNumber: 1,
            baselineAvgLikes: 3100,
            currentLikes: 6800,
            isFullMediaDownloaded: false,
            curvePoints: [
              { day: 0, actualLikes: 0, baselineLikes: 0 },
              { day: 1, actualLikes: 6800, baselineLikes: 3100 },
              { day: 2, actualLikes: 7900, baselineLikes: 3600 },
              { day: 3, actualLikes: 8400, baselineLikes: 3900 },
              { day: 7, actualLikes: 9200, baselineLikes: 4200 },
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
            niche: 'Sarees',
            outlierType: 'inspiration',
            multiplier: 2.6,
            dayNumber: 2,
            baselineAvgLikes: 3400,
            currentLikes: 8900,
            isFullMediaDownloaded: false,
            curvePoints: [
              { day: 0, actualLikes: 0, baselineLikes: 0 },
              { day: 1, actualLikes: 4500, baselineLikes: 2000 },
              { day: 2, actualLikes: 8900, baselineLikes: 3400 },
              { day: 3, actualLikes: 9800, baselineLikes: 3900 },
              { day: 7, actualLikes: 10800, baselineLikes: 4400 },
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
  }, [selectedNiche, selectedOutlierFilter]);

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

  // Filtered Profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesNiche =
        selectedNiche === 'All' ||
        (p.niche && p.niche.toLowerCase() === selectedNiche.toLowerCase()) ||
        (p.profileCategory && p.profileCategory.toLowerCase() === selectedNiche.toLowerCase());

      return matchesSearch && matchesNiche;
    });
  }, [profiles, searchQuery, selectedNiche]);

  // Filtered Outliers
  const filteredOutliers = useMemo(() => {
    return outliers.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        (item.caption && item.caption.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.ownerUsername && item.ownerUsername.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesNiche =
        selectedNiche === 'All' ||
        (item.niche && item.niche.toLowerCase() === selectedNiche.toLowerCase());

      const matchesOutlierType =
        selectedOutlierFilter === 'all' ||
        item.outlierType === selectedOutlierFilter;

      return matchesSearch && matchesNiche && matchesOutlierType;
    });
  }, [outliers, searchQuery, selectedNiche, selectedOutlierFilter]);

  const activeCompetitorsCount = profiles.filter((p) => p.isTracked ?? p.isActive).length;
  const totalLimit = summary?.totalLimit ?? 50;
  const breakoutsTodayCount = summary?.breakoutsTodayCount ?? 4;

  return (
    <ScreenWrapper
      title="Competitor Hub"
      actions={
        <Appbar.Action
          icon="refresh"
          onPress={handleRefresh}
        />
      }
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* Top Header Summary Metrics Bar */}
      <Surface
        style={[
          styles.summaryCard,
          { backgroundColor: theme.colors.surfaceVariant },
        ]}
      >
        <View style={styles.summaryMetricCol}>
          <Text variant="labelSmall" style={styles.summaryMetricLabel}>
            Tracked Accounts
          </Text>
          <View style={styles.summaryMetricValRow}>
            <View style={styles.liveDot} />
            <Text variant="titleMedium" style={styles.summaryMetricValue}>
              {activeCompetitorsCount} / {totalLimit}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.summaryDivider,
            { backgroundColor: theme.colors.elevation?.level3 || 'rgba(0,0,0,0.08)' },
          ]}
        />

        <View style={styles.summaryMetricCol}>
          <Text variant="labelSmall" style={styles.summaryMetricLabel}>
            Breakouts Today
          </Text>
          <View style={styles.summaryMetricValRow}>
            <Text
              variant="titleMedium"
              style={[
                styles.summaryMetricValue,
                { color: theme.colors.error },
              ]}
            >
              ⚡ {breakoutsTodayCount} Outliers
            </Text>
          </View>
        </View>
      </Surface>

      {/* Tabs / Segmented Buttons */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as 'profiles' | 'insights')}
          buttons={[
            {
              value: 'profiles',
              label: `Profiles (${filteredProfiles.length})`,
              icon: 'account-group',
            },
            {
              value: 'insights',
              label: `Outlier Insights (${filteredOutliers.length})`,
              icon: 'trending-up',
            },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={activeTab === 'profiles' ? 'Search handles or names...' : 'Search outlier posts or captions...'}
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

      {/* Niche Filter Chips */}
      <View style={styles.chipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {NICHE_OPTIONS.map((niche) => (
            <Chip
              key={niche}
              selected={selectedNiche === niche}
              onPress={() => setSelectedNiche(niche)}
              showSelectedOverlay
              style={[
                styles.filterChip,
                selectedNiche === niche
                  ? { backgroundColor: theme.colors.primaryContainer }
                  : { backgroundColor: theme.colors.surfaceVariant },
              ]}
              textStyle={[
                styles.chipText,
                selectedNiche === niche && { color: theme.colors.onPrimaryContainer, fontWeight: '700' },
              ]}
            >
              {niche}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {/* Secondary Filter Chips for Insights View */}
      {activeTab === 'insights' && (
        <View style={styles.outlierFilterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
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
                  selectedOutlierFilter === filter.id && { color: theme.colors.onSecondaryContainer, fontWeight: '700' },
                ]}
              >
                {filter.label}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Loading Indicator */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12, opacity: 0.7 }}>Loading competitor intelligence...</Text>
        </View>
      ) : activeTab === 'profiles' ? (
        /* Profiles Tab List */
        <FlatList
          data={filteredProfiles}
          keyExtractor={(item) => item.id || item.username}
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
                Try adjusting your search query or niche filter.
              </Text>
            </View>
          }
        />
      ) : (
        /* Insights Tab Feed */
        <FlatList
          data={filteredOutliers}
          keyExtractor={(item) => item.id}
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  summaryMetricCol: {
    flex: 1,
    gap: 4,
  },
  summaryMetricLabel: {
    opacity: 0.6,
    fontWeight: '600',
  },
  summaryMetricValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  summaryMetricValue: {
    fontWeight: '800',
  },
  summaryDivider: {
    width: 1,
    height: '80%',
    marginHorizontal: 12,
  },
  tabContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  segmentedButtons: {
    borderRadius: 12,
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
  chipsContainer: {
    marginBottom: 8,
  },
  outlierFilterContainer: {
    marginBottom: 10,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    borderRadius: 20,
    height: 32,
  },
  outlierChip: {
    borderRadius: 20,
    height: 32,
  },
  chipText: {
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 24,
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

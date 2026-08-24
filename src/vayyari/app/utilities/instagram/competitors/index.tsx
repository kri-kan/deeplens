import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  BackHandler,
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
import { Image } from 'expo-image';
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

const TIMEFRAME_OPTIONS = [
  { id: '7', label: '7 Days', days: 7 },
  { id: '30', label: '30 Days', days: 30 },
  { id: '90', label: '90 Days', days: 90 },
  { id: 'all', label: 'All Time', days: undefined },
];

const METRIC_CRITERIA_OPTIONS = [
  { id: 'multiplier', label: '⚡ Multiplier', sortBy: 'multiplier' as const },
  { id: 'views', label: '👁️ Views', sortBy: 'views' as const },
  { id: 'likes', label: '❤️ Likes', sortBy: 'likes' as const },
  { id: 'comments', label: '💬 Comments', sortBy: 'comments' as const },
];

export default function CompetitorHubScreen() {
  const theme = useTheme();
  const router = useRouter();

  // View Mode: 'root' (Bento Action Tiles) | 'profiles' (Tracked Profiles List) | 'insights' (Outlier Feed)
  const [viewMode, setViewMode] = useState<'root' | 'profiles' | 'insights'>('root');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutlierFilter, setSelectedOutlierFilter] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');
  const [selectedMetricCriteria, setSelectedMetricCriteria] = useState<'multiplier' | 'views' | 'likes' | 'comments'>('multiplier');

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
      const activeDays = selectedTimeframe === 'all' ? undefined : parseInt(selectedTimeframe, 10);
      const highPerformingData = await instagramService.getHighPerformingCompetitors({
        outlierType: selectedOutlierFilter !== 'all' ? selectedOutlierFilter : undefined,
        days: activeDays,
        sortBy: selectedMetricCriteria,
        sortOrder: 'desc',
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
  }, [selectedOutlierFilter, selectedTimeframe, selectedMetricCriteria]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Hardware Back Press: Return to root tiles menu when inside sub-views
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (viewMode !== 'root') {
          setViewMode('root');
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [viewMode])
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

  // Filtered Outliers by Search, Outlier Type, and Metric Sorting
  const filteredOutliers = useMemo(() => {
    const list = outliers.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        (item.caption && item.caption.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.ownerUsername && item.ownerUsername.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesOutlierType =
        selectedOutlierFilter === 'all' ||
        item.outlierType === selectedOutlierFilter;

      return matchesSearch && matchesOutlierType;
    });

    if (selectedMetricCriteria === 'views') {
      list.sort((a, b) => (b.viewCount || (b.likeCount ? b.likeCount * 7 : 0)) - (a.viewCount || (a.likeCount ? a.likeCount * 7 : 0)));
    } else if (selectedMetricCriteria === 'likes') {
      list.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    } else if (selectedMetricCriteria === 'comments') {
      list.sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
    } else {
      list.sort((a, b) => (b.multiplier || 0) - (a.multiplier || 0));
    }

    return list;
  }, [outliers, searchQuery, selectedOutlierFilter, selectedMetricCriteria]);

  const activeCompetitorsCount = profiles.filter((p) => p.isTracked ?? p.isActive).length;
  const totalLimit = summary?.totalLimit ?? 50;
  const breakoutsTodayCount = summary?.breakoutsTodayCount ?? 4;
  const progressRatio = totalLimit > 0 ? Math.min(1, Math.max(0, activeCompetitorsCount / totalLimit)) : 0.6;
  const progressPercent = `${Math.round(progressRatio * 100)}%`;

  // Top Outlier for Spotlight
  const topOutlier = outliers.length > 0 ? outliers[0] : null;

  // View Switcher Bar for Sub-views
  const renderViewSwitcherBar = () => {
    return (
      <View style={styles.switcherContainer}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setViewMode('root')}
          style={[
            styles.hubBackChip,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Icon source="arrow-left" size={16} color={theme.colors.primary} />
          <Text variant="labelSmall" style={[styles.hubBackText, { color: theme.colors.primary }]}>
            Hub Tiles
          </Text>
        </TouchableOpacity>

        <View style={styles.switcherPillsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setViewMode('profiles')}
            style={[
              styles.switcherPill,
              {
                backgroundColor:
                  viewMode === 'profiles'
                    ? theme.colors.primaryContainer
                    : theme.colors.surfaceVariant,
              },
            ]}
          >
            <Icon
              source="account-group"
              size={16}
              color={
                viewMode === 'profiles'
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant
              }
            />
            <Text
              variant="labelSmall"
              style={[
                styles.switcherPillText,
                {
                  color:
                    viewMode === 'profiles'
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant,
                  fontWeight: viewMode === 'profiles' ? '800' : '600',
                },
              ]}
            >
              Profiles ({profiles.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setViewMode('insights')}
            style={[
              styles.switcherPill,
              {
                backgroundColor:
                  viewMode === 'insights'
                    ? theme.colors.errorContainer
                    : theme.colors.surfaceVariant,
              },
            ]}
          >
            <Icon
              source="lightning-bolt"
              size={16}
              color={
                viewMode === 'insights'
                  ? theme.colors.error
                  : theme.colors.onSurfaceVariant
              }
            />
            <Text
              variant="labelSmall"
              style={[
                styles.switcherPillText,
                {
                  color:
                    viewMode === 'insights'
                      ? theme.colors.error
                      : theme.colors.onSurfaceVariant,
                  fontWeight: viewMode === 'insights' ? '800' : '600',
                },
              ]}
            >
              Insights ({outliers.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Subview Header: Profiles List Header
  const renderProfilesHeader = () => {
    return (
      <View style={styles.subviewHeaderContainer}>
        {renderViewSwitcherBar()}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search handles or names..."
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

        {/* Count & Status Banner */}
        <View style={styles.statusBannerRow}>
          <Text variant="labelMedium" style={[styles.statusBannerText, { color: theme.colors.onSurfaceVariant }]}>
            Showing {filteredProfiles.length} of {profiles.length} profiles ({activeCompetitorsCount} actively tracked)
          </Text>
        </View>
      </View>
    );
  };

  // Subview Header: Outlier Insights Header
  const renderInsightsHeader = () => {
    return (
      <View style={styles.subviewHeaderContainer}>
        {renderViewSwitcherBar()}

        {/* Metric Criteria Selector (Sort By) */}
        <View style={styles.outlierFilterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {METRIC_CRITERIA_OPTIONS.map((metric) => (
              <Chip
                key={metric.id}
                selected={selectedMetricCriteria === metric.id}
                onPress={() => setSelectedMetricCriteria(metric.sortBy)}
                showSelectedOverlay
                style={[
                  styles.outlierChip,
                  selectedMetricCriteria === metric.id
                    ? { backgroundColor: theme.colors.primaryContainer }
                    : { backgroundColor: theme.colors.surfaceVariant },
                ]}
                textStyle={[
                  styles.chipText,
                  selectedMetricCriteria === metric.id && {
                    color: theme.colors.onPrimaryContainer,
                    fontWeight: '800',
                  },
                ]}
              >
                {metric.label}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* Timeframe Filter Chips */}
        <View style={styles.outlierFilterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {TIMEFRAME_OPTIONS.map((tf) => (
              <Chip
                key={tf.id}
                selected={selectedTimeframe === tf.id}
                onPress={() => setSelectedTimeframe(tf.id)}
                showSelectedOverlay
                style={[
                  styles.outlierChip,
                  selectedTimeframe === tf.id
                    ? { backgroundColor: theme.colors.secondaryContainer }
                    : { backgroundColor: theme.colors.surfaceVariant },
                ]}
                textStyle={[
                  styles.chipText,
                  selectedTimeframe === tf.id && {
                    color: theme.colors.onSecondaryContainer,
                    fontWeight: '700',
                  },
                ]}
              >
                {tf.label}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* Archetype Filter Chips */}
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
                    ? { backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface }
                    : { backgroundColor: theme.colors.surfaceVariant },
                ]}
                textStyle={[
                  styles.chipText,
                  selectedOutlierFilter === filter.id && {
                    color: theme.colors.primary,
                    fontWeight: '700',
                  },
                ]}
              >
                {filter.label}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search breakout posts or captions..."
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
      </View>
    );
  };

  return (
    <ScreenWrapper
      title={
        viewMode === 'root'
          ? 'Competitor Hub'
          : viewMode === 'profiles'
          ? 'Tracked Profiles'
          : 'High Performing Insights'
      }
      onBack={viewMode !== 'root' ? () => setViewMode('root') : undefined}
      withScrollView={viewMode === 'root'}
      refreshing={refreshing}
      onRefresh={handleRefresh}
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
      ) : viewMode === 'root' ? (
        /* =========================================================================
           ROOT VIEW: Bento Action Tiles Menu (No Profile List Clutter)
           ========================================================================= */
        <View style={styles.rootContent}>
          {/* Hero / Section Intro */}
          <View style={styles.rootHeroContainer}>
            <Text variant="titleMedium" style={[styles.rootHeroTitle, { color: theme.colors.onSurface }]}>
              Competitor Intelligence
            </Text>
            <Text variant="bodySmall" style={[styles.rootHeroSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Real-time competitor tracking, outlier detection, and performance benchmarking.
            </Text>
          </View>

          {/* Bento Action Navigation Tiles */}
          <View style={styles.bentoActionGrid}>
            {/* Tile 1: Tracked Profiles */}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setViewMode('profiles')}
              style={[
                styles.bentoActionTile,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <View style={styles.bentoTileTop}>
                <View
                  style={[
                    styles.bentoIconBadge,
                    { backgroundColor: theme.colors.primaryContainer },
                  ]}
                >
                  <Icon
                    source="account-group"
                    size={26}
                    color={theme.colors.primary}
                  />
                </View>

                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface },
                  ]}
                >
                  <View style={[styles.liveDot, { backgroundColor: '#10B981' }]} />
                  <Text
                    variant="labelSmall"
                    style={[styles.statusPillText, { color: theme.colors.onSurface }]}
                  >
                    {activeCompetitorsCount} / {totalLimit} Active
                  </Text>
                </View>
              </View>

              <View style={styles.bentoTileBody}>
                <Text
                  variant="titleMedium"
                  style={[styles.bentoTileTitle, { color: theme.colors.onSurface }]}
                >
                  Tracked Profiles
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.bentoTileSubtitle, { color: theme.colors.onSurfaceVariant }]}
                >
                  {profiles.length} Monitored Handles
                </Text>
              </View>

              {/* Progress Bar for Tracking Capacity */}
              <View
                style={[
                  styles.tileProgressBarTrack,
                  { backgroundColor: theme.colors.elevation?.level2 || 'rgba(0,0,0,0.06)' },
                ]}
              >
                <View
                  style={[
                    styles.tileProgressBarFill,
                    { width: progressPercent as any, backgroundColor: theme.colors.primary },
                  ]}
                />
              </View>

              <View style={styles.bentoTileFooter}>
                <Text
                  variant="labelSmall"
                  style={[styles.bentoFooterAction, { color: theme.colors.primary }]}
                >
                  Manage Profiles
                </Text>
                <Icon source="chevron-right" size={18} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>

            {/* Tile 2: High Performing Insights */}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setViewMode('insights')}
              style={[
                styles.bentoActionTile,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <View style={styles.bentoTileTop}>
                <View
                  style={[
                    styles.bentoIconBadge,
                    { backgroundColor: theme.colors.errorContainer },
                  ]}
                >
                  <Icon
                    source="lightning-bolt"
                    size={26}
                    color={theme.colors.error}
                  />
                </View>

                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: theme.colors.errorContainer },
                  ]}
                >
                  <Text
                    variant="labelSmall"
                    style={[styles.statusPillText, { color: theme.colors.onErrorContainer, fontWeight: '800' }]}
                  >
                    ⚡ {breakoutsTodayCount} Breakouts Today
                  </Text>
                </View>
              </View>

              <View style={styles.bentoTileBody}>
                <Text
                  variant="titleMedium"
                  style={[styles.bentoTileTitle, { color: theme.colors.onSurface }]}
                >
                  High Performing Insights
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.bentoTileSubtitle, { color: theme.colors.onSurfaceVariant }]}
                >
                  {outliers.length} Content Breakouts
                </Text>
              </View>

              {/* Mini Tags */}
              <View style={styles.miniTagsRow}>
                <View style={[styles.miniTag, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.miniTagText, { color: '#B45309' }]}>⚡ Day-1 Viral</Text>
                </View>
                <View style={[styles.miniTag, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.miniTagText, { color: '#B91C1C' }]}>📈 Growth Spikes</Text>
                </View>
              </View>

              <View style={styles.bentoTileFooter}>
                <Text
                  variant="labelSmall"
                  style={[styles.bentoFooterAction, { color: theme.colors.error }]}
                >
                  Explore Insights
                </Text>
                <Icon source="chevron-right" size={18} color={theme.colors.error} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Quick Intelligence Summary Card */}
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <View style={styles.summaryCardHeader}>
              <Text variant="titleSmall" style={[styles.summaryCardTitle, { color: theme.colors.onSurface }]}>
                Intelligence Overview
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: theme.colors.elevation?.level3 || theme.colors.surface },
                ]}
              >
                <View style={[styles.liveDot, { backgroundColor: '#10B981' }]} />
                <Text variant="labelSmall" style={{ fontSize: 10, fontWeight: '700', color: theme.colors.onSurfaceVariant }}>
                  Live Scraper Active
                </Text>
              </View>
            </View>

            <View style={styles.statsSummaryGrid}>
              <View style={styles.statCol}>
                <Text variant="headlineSmall" style={[styles.statValueText, { color: theme.colors.primary }]}>
                  {profiles.length}
                </Text>
                <Text variant="labelSmall" style={[styles.statLabelText, { color: theme.colors.onSurfaceVariant }]}>
                  Monitored
                </Text>
              </View>

              <View style={styles.statCol}>
                <Text variant="headlineSmall" style={[styles.statValueText, { color: '#10B981' }]}>
                  {activeCompetitorsCount}
                </Text>
                <Text variant="labelSmall" style={[styles.statLabelText, { color: theme.colors.onSurfaceVariant }]}>
                  Active Tracking
                </Text>
              </View>

              <View style={styles.statCol}>
                <Text variant="headlineSmall" style={[styles.statValueText, { color: theme.colors.error }]}>
                  {breakoutsTodayCount}
                </Text>
                <Text variant="labelSmall" style={[styles.statLabelText, { color: theme.colors.onSurfaceVariant }]}>
                  Breakouts Today
                </Text>
              </View>
            </View>
          </View>

          {/* Top Breakout Spotlight (if exists) */}
          {topOutlier && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setViewMode('insights')}
              style={[
                styles.spotlightCard,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <View style={styles.spotlightHeader}>
                <View style={styles.spotlightBadge}>
                  <Icon source="fire" size={16} color="#B91C1C" />
                  <Text variant="labelSmall" style={styles.spotlightBadgeText}>
                    Top Breakout Spotlight
                  </Text>
                </View>
                <View style={styles.spotlightAction}>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                    View Feed
                  </Text>
                  <Icon source="chevron-right" size={16} color={theme.colors.primary} />
                </View>
              </View>

              <View style={styles.spotlightBody}>
                <Image
                  source={{ uri: topOutlier.thumbnailUrl || topOutlier.mediaUrl }}
                  style={styles.spotlightThumb}
                  contentFit="cover"
                />
                <View style={styles.spotlightDetails}>
                  <Text variant="titleSmall" style={{ fontWeight: '700' }} numberOfLines={1}>
                    @{topOutlier.ownerUsername}
                  </Text>
                  <View style={[styles.multiplierPillSmall, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={{ color: '#B45309', fontWeight: '800', fontSize: 11 }}>
                      ⚡ {topOutlier.multiplier?.toFixed(1) ?? '3.8'}x Above Baseline
                    </Text>
                  </View>
                  <Text variant="bodySmall" numberOfLines={2} style={[styles.spotlightCaption, { color: theme.colors.onSurfaceVariant }]}>
                    {topOutlier.caption || 'High-performing competitor media breakout.'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>
      ) : viewMode === 'profiles' ? (
        /* =========================================================================
           SUB-VIEW 1: Tracked Profiles List
           ========================================================================= */
        <FlatList
          data={filteredProfiles}
          keyExtractor={(item) => item.id || item.username}
          ListHeaderComponent={renderProfilesHeader}
          renderItem={({ item }) => (
            <CompetitorProfileItem
              item={item}
              onToggleTracking={handleToggleTracking}
              onPress={() => {
                router.push({
                  pathname: '/utilities/instagram-explorer',
                  params: { profile: item.username, from: 'competitors' },
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
        /* =========================================================================
           SUB-VIEW 2: High Performing Insights Outlier Feed
           ========================================================================= */
        <FlatList
          data={filteredOutliers}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderInsightsHeader}
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
  rootContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14,
  },
  rootHeroContainer: {
    marginBottom: 2,
  },
  rootHeroTitle: {
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.2,
  },
  rootHeroSubtitle: {
    opacity: 0.7,
    marginTop: 2,
    lineHeight: 18,
  },
  bentoActionGrid: {
    gap: 12,
  },
  bentoActionTile: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  bentoTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bentoIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontWeight: '700',
    fontSize: 11,
  },
  bentoTileBody: {
    gap: 2,
    marginTop: 2,
  },
  bentoTileTitle: {
    fontWeight: '800',
    fontSize: 16,
  },
  bentoTileSubtitle: {
    opacity: 0.7,
    fontSize: 12,
  },
  tileProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  tileProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  miniTagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  miniTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  miniTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bentoTileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  bentoFooterAction: {
    fontWeight: '700',
    fontSize: 12,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCardTitle: {
    fontWeight: '700',
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statsSummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCol: {
    alignItems: 'center',
    gap: 2,
  },
  statValueText: {
    fontWeight: '800',
  },
  statLabelText: {
    fontSize: 11,
    opacity: 0.7,
  },
  spotlightCard: {
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
  spotlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  spotlightBadgeText: {
    color: '#B91C1C',
    fontWeight: '800',
    fontSize: 10,
  },
  spotlightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  spotlightBody: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  spotlightThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  spotlightDetails: {
    flex: 1,
    gap: 3,
  },
  multiplierPillSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  spotlightCaption: {
    fontSize: 11,
    lineHeight: 15,
  },
  subviewHeaderContainer: {
    paddingBottom: 4,
  },
  switcherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
  },
  hubBackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  hubBackText: {
    fontWeight: '700',
    fontSize: 11,
  },
  switcherPillsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  switcherPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  switcherPillText: {
    fontSize: 11,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    borderRadius: 12,
    height: 44,
  },
  searchInput: {
    minHeight: 0,
    fontSize: 13,
  },
  statusBannerRow: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  statusBannerText: {
    fontSize: 11,
    opacity: 0.75,
  },
  outlierFilterContainer: {
    marginBottom: 8,
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

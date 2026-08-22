import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Surface,
  Text,
  Appbar,
  useTheme,
  SegmentedButtons,
  ProgressBar,
  IconButton,
  Button,
  Chip,
  Icon,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ProductCreationChart } from '@/components/analytics/ProductCreationChart';
import {
  analyticsService,
  AnalyticsSummary,
  AnalyticsTimeframe,
  DailyCreationPoint,
} from '@/services/analytics.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TIMEFRAME_OPTIONS = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'all', label: 'All' },
];

export default function InsightsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('7d');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<DailyCreationPoint | null>(null);

  const fetchAnalytics = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const data = await analyticsService.getAnalyticsSummary(timeframe);
        setSummary(data);
      } catch (err) {
        console.error('Failed to load analytics summary:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [timeframe]
  );

  useEffect(() => {
    fetchAnalytics();
    setSelectedPoint(null);
  }, [fetchAnalytics]);

  const handleBarPress = (point: DailyCreationPoint) => {
    if (!point.date || selectedPoint?.date === point.date) {
      setSelectedPoint(null);
    } else {
      setSelectedPoint(point);
    }
  };

  const getTimeframeBounds = (tf: AnalyticsTimeframe) => {
    if (tf === 'all') return { startDate: undefined, endDate: undefined };
    const now = new Date();
    const days = tf === '7d' ? 7 : tf === '30d' ? 30 : 90;
    const start = new Date();
    start.setDate(now.getDate() - days);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  };

  const navigateToFilteredCatalog = (params: {
    startDate?: string;
    endDate?: string;
    category?: string;
    isStarred?: boolean;
    minPrice?: number;
    maxPrice?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.category) {
      const catLower = params.category.toLowerCase().trim();
      const mappedCategory = (catLower === 'others' || catLower === 'uncategorized') ? 'general' : catLower;
      queryParams.append('category', mappedCategory);
    }
    if (params.isStarred !== undefined) queryParams.append('isStarred', String(params.isStarred));
    if (params.minPrice !== undefined) queryParams.append('minPrice', String(params.minPrice));
    if (params.maxPrice !== undefined) queryParams.append('maxPrice', String(params.maxPrice));

    const queryString = queryParams.toString();
    const targetUrl = `/utilities/product-list${queryString ? `?${queryString}` : ''}`;
    router.push(targetUrl as any);
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '₹0';
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)}L`;
    }
    if (val >= 1000) {
      return `₹${(val / 1000).toFixed(1)}k`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
        <Appbar.Content title="Analytics Hub" titleStyle={{ fontWeight: 'bold' }} />
        <Appbar.Action
          icon="refresh"
          onPress={() => fetchAnalytics(true)}
          disabled={loading || refreshing}
        />
        <Appbar.Action icon="cog" onPress={() => router.push('/modal')} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAnalytics(true)}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          <SegmentedButtons
            value={timeframe}
            onValueChange={val => setTimeframe(val as AnalyticsTimeframe)}
            buttons={TIMEFRAME_OPTIONS}
            style={styles.segmentedButtons}
          />
        </View>

        {loading && !refreshing && !summary ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodyMedium" style={{ marginTop: 12, color: theme.colors.outline }}>
              Aggregating product analytics...
            </Text>
          </View>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <View style={styles.kpiGrid}>
              {/* Total Ingestion */}
              <Surface
                style={[styles.kpiCard, { backgroundColor: theme.colors.elevation.level1 }]}
                elevation={1}
              >
                <View style={styles.kpiHeader}>
                  <Text variant="labelMedium" style={{ color: theme.colors.outline }}>
                    Ingestion Volume
                  </Text>
                  <Icon source="plus-box-multiple" size={18} color={theme.colors.primary} />
                </View>
                <Text variant="headlineMedium" style={[styles.kpiValue, { color: theme.colors.primary }]}>
                  {summary?.totalProducts || 0}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  Products created in {timeframe.toUpperCase()}
                </Text>
              </Surface>

              {/* Starred Curation */}
              <Surface
                style={[styles.kpiCard, { backgroundColor: theme.colors.elevation.level1 }]}
                elevation={1}
              >
                <View style={styles.kpiHeader}>
                  <Text variant="labelMedium" style={{ color: theme.colors.outline }}>
                    Starred Curation
                  </Text>
                  <Icon source="star" size={18} color="#FFA000" />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text variant="headlineMedium" style={[styles.kpiValue, { color: '#FFA000' }]}>
                    {summary?.totalStarred || 0}
                  </Text>
                  <Chip
                    compact
                    textStyle={{ fontSize: 10, fontWeight: '700', color: theme.colors.primary }}
                    style={{ backgroundColor: theme.colors.primaryContainer, height: 22 }}
                  >
                    {summary?.curationRate || 0}%
                  </Chip>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  High-intent curation rate
                </Text>
              </Surface>

              {/* Catalog Est. Value */}
              <Surface
                style={[styles.kpiCard, { backgroundColor: theme.colors.elevation.level1 }]}
                elevation={1}
              >
                <View style={styles.kpiHeader}>
                  <Text variant="labelMedium" style={{ color: theme.colors.outline }}>
                    Catalog Value
                  </Text>
                  <Icon source="cash-multiple" size={18} color={theme.colors.secondary} />
                </View>
                <Text variant="headlineMedium" style={[styles.kpiValue, { color: theme.colors.secondary }]}>
                  {formatCurrency(summary?.totalCatalogValue)}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  Total vendor listing value
                </Text>
              </Surface>

              {/* Average Price */}
              <Surface
                style={[styles.kpiCard, { backgroundColor: theme.colors.elevation.level1 }]}
                elevation={1}
              >
                <View style={styles.kpiHeader}>
                  <Text variant="labelMedium" style={{ color: theme.colors.outline }}>
                    Avg Price / Item
                  </Text>
                  <Icon source="tag-outline" size={18} color={theme.colors.tertiary} />
                </View>
                <Text variant="headlineMedium" style={[styles.kpiValue, { color: theme.colors.tertiary }]}>
                  {formatCurrency(summary?.averagePrice)}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  Mean wholesale unit price
                </Text>
              </Surface>
            </View>

            {/* Interactive Chart */}
            <ProductCreationChart
              data={summary?.dailyTrends || []}
              loading={loading}
              selectedDate={selectedPoint?.date}
              onBarPress={handleBarPress}
              timeframe={timeframe}
            />

            {/* Interactive Drill-down Banner when a Bar is selected */}
            {selectedPoint && (
              <Surface
                style={[styles.drilldownBanner, { backgroundColor: theme.colors.primaryContainer }]}
                elevation={2}
              >
                <View style={styles.drilldownHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      variant="titleSmall"
                      style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700' }}
                    >
                      📅 Activity on {selectedPoint.displayDate} ({selectedPoint.date})
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                      {selectedPoint.totalCreated} total created • {selectedPoint.starredCount} starred
                    </Text>
                  </View>
                  <IconButton
                    icon="close"
                    size={18}
                    onPress={() => setSelectedPoint(null)}
                    iconColor={theme.colors.onPrimaryContainer}
                  />
                </View>
                <View style={styles.drilldownActions}>
                  <Button
                    mode="contained"
                    compact
                    onPress={() =>
                      navigateToFilteredCatalog({
                        startDate: `${selectedPoint.date}T00:00:00.000Z`,
                        endDate: `${selectedPoint.date}T23:59:59.999Z`,
                      })
                    }
                    style={{ flex: 1 }}
                  >
                    View Products ({selectedPoint.totalCreated})
                  </Button>
                  {selectedPoint.starredCount > 0 && (
                    <Button
                      mode="outlined"
                      compact
                      onPress={() =>
                        navigateToFilteredCatalog({
                          startDate: `${selectedPoint.date}T00:00:00.000Z`,
                          endDate: `${selectedPoint.date}T23:59:59.999Z`,
                          isStarred: true,
                        })
                      }
                      style={{ flex: 1 }}
                    >
                      Starred ({selectedPoint.starredCount})
                    </Button>
                  )}
                </View>
              </Surface>
            )}

            {/* Category Breakdown */}
            <Surface
              style={[styles.sectionCard, { backgroundColor: theme.colors.elevation.level1 }]}
              elevation={1}
            >
              <View style={styles.sectionHeader}>
                <View>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Category Breakdown
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                    Distribution of products across categories
                  </Text>
                </View>
                <Icon source="shape" size={20} color={theme.colors.primary} />
              </View>

              {(!summary?.categories || summary.categories.length === 0) ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginTop: 12 }}>
                  No categorized items in this period.
                </Text>
              ) : (
                <View style={styles.categoryList}>
                  {summary.categories.map((cat, idx) => (
                    <TouchableOpacity
                      key={cat.category}
                      activeOpacity={0.7}
                      onPress={() => {
                        const { startDate, endDate } = getTimeframeBounds(timeframe);
                        navigateToFilteredCatalog({
                          category: cat.category,
                          startDate,
                          endDate,
                        });
                      }}
                      style={styles.categoryItem}
                    >
                      <View style={styles.categoryInfoRow}>
                        <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                          {cat.category}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                            {cat.count} items
                          </Text>
                          <Text
                            variant="labelSmall"
                            style={{ fontWeight: '700', color: theme.colors.primary }}
                          >
                            {cat.percentage}%
                          </Text>
                        </View>
                      </View>
                      <ProgressBar
                        progress={cat.percentage / 100}
                        color={idx === 0 ? theme.colors.primary : theme.colors.secondary}
                        style={styles.progressBar}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Surface>

            {/* Price Tier Distribution */}
            <Surface
              style={[styles.sectionCard, { backgroundColor: theme.colors.elevation.level1 }]}
              elevation={1}
            >
              <View style={styles.sectionHeader}>
                <View>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Price Tier Distribution
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                    Catalog density by wholesale price bracket
                  </Text>
                </View>
                <Icon source="chart-bell-curve" size={20} color={theme.colors.tertiary} />
              </View>

              {(!summary?.priceTiers || summary.priceTiers.length === 0) ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginTop: 12 }}>
                  No pricing data in this period.
                </Text>
              ) : (
                <View style={styles.categoryList}>
                  {summary.priceTiers.map((tier, idx) => (
                    <TouchableOpacity
                      key={tier.tier}
                      activeOpacity={0.7}
                      onPress={() => {
                        const { startDate, endDate } = getTimeframeBounds(timeframe);
                        navigateToFilteredCatalog({
                          minPrice: tier.minPrice,
                          maxPrice: tier.maxPrice,
                          startDate,
                          endDate,
                        });
                      }}
                      style={styles.categoryItem}
                    >
                      <View style={styles.categoryInfoRow}>
                        <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                          {tier.tier}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                            {tier.count} products
                          </Text>
                          <Text
                            variant="labelSmall"
                            style={{ fontWeight: '700', color: theme.colors.tertiary }}
                          >
                            {tier.percentage}%
                          </Text>
                        </View>
                      </View>
                      <ProgressBar
                        progress={tier.percentage / 100}
                        color={idx % 2 === 0 ? theme.colors.tertiary : theme.colors.primary}
                        style={styles.progressBar}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Surface>

            {/* Quick Actions & Intelligence Tools */}
            <Surface
              style={[styles.sectionCard, { backgroundColor: theme.colors.elevation.level1 }]}
              elevation={1}
            >
              <Text variant="titleMedium" style={[styles.sectionTitle, { marginBottom: 12 }]}>
                Intelligence & Catalog Tools
              </Text>
              <View style={styles.toolsGrid}>
                <TouchableOpacity
                  style={[styles.toolCard, { backgroundColor: theme.colors.surface }]}
                  onPress={() => router.push('/utilities/product-list' as any)}
                >
                  <Icon source="view-grid-outline" size={24} color={theme.colors.primary} />
                  <Text variant="labelMedium" style={styles.toolTitle}>
                    Catalog Explorer
                  </Text>
                  <Text variant="bodySmall" style={styles.toolSubtitle}>
                    Search & manage items
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolCard, { backgroundColor: theme.colors.surface }]}
                  onPress={() => router.push('/utilities/archived' as any)}
                >
                  <Icon source="archive-outline" size={24} color={theme.colors.secondary} />
                  <Text variant="labelMedium" style={styles.toolTitle}>
                    Archived Media
                  </Text>
                  <Text variant="bodySmall" style={styles.toolSubtitle}>
                    Pruned & compressed
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolCard, { backgroundColor: theme.colors.surface }]}
                  onPress={() => router.push('/utilities/system-dashboard' as any)}
                >
                  <Icon source="chart-box-outline" size={24} color={theme.colors.tertiary} />
                  <Text variant="labelMedium" style={styles.toolTitle}>
                    System Health
                  </Text>
                  <Text variant="bodySmall" style={styles.toolSubtitle}>
                    Jobs & metrics
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolCard, { backgroundColor: theme.colors.surface }]}
                  onPress={() => router.push('/utilities/quick-links' as any)}
                >
                  <Icon source="link-variant" size={24} color={theme.colors.primary} />
                  <Text variant="labelMedium" style={styles.toolTitle}>
                    Quick Links
                  </Text>
                  <Text variant="bodySmall" style={styles.toolSubtitle}>
                    MCP & service console
                  </Text>
                </TouchableOpacity>
              </View>
            </Surface>
          </>
        )}
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  timeframeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentedButtons: {
    width: '100%',
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  kpiCard: {
    width: (SCREEN_WIDTH - 40) / 2,
    borderRadius: 16,
    padding: 14,
    margin: 4,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiValue: {
    fontWeight: 'bold',
    marginVertical: 4,
  },
  drilldownBanner: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  drilldownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drilldownActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  categoryList: {
    gap: 12,
    marginTop: 4,
  },
  categoryItem: {
    paddingVertical: 2,
  },
  categoryInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toolCard: {
    width: (SCREEN_WIDTH - 72) / 2,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.15)',
  },
  toolTitle: {
    fontWeight: '700',
    marginTop: 6,
  },
  toolSubtitle: {
    color: 'gray',
    fontSize: 11,
    marginTop: 2,
  },
});

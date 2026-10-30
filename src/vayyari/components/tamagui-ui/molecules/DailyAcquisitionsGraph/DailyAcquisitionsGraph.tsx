import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { DailyGrowthSummary, DailyAcquisitionItem, GrowthGranularity } from '@/services/storeAdminService';
import { LuTrendingUp, LuMonitor, LuUsers, LuCalendar, LuSparkles } from '../../icons/lu';

// Only enable legacy layout animations when not running on Fabric New Architecture
if (
  Platform.OS === 'android' &&
  !(global as any).nativeFabricUIManager &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type GrowthSeriesMode = 'both' | 'devices' | 'users';

export interface RangeOption {
  label: string;
  value: number;
}

export const PROJECTION_RANGES: Record<GrowthGranularity, RangeOption[]> = {
  day: [
    { label: '10D', value: 10 },
    { label: '14D', value: 14 },
    { label: '30D', value: 30 },
    { label: '60D', value: 60 },
  ],
  week: [
    { label: '10W', value: 10 },
    { label: '12W', value: 12 },
    { label: '24W', value: 24 },
    { label: '52W', value: 52 },
  ],
  month: [
    { label: '10M', value: 10 },
    { label: '6M', value: 6 },
    { label: '12M', value: 12 },
    { label: '24M', value: 24 },
  ],
};

export interface DailyAcquisitionsGraphProps {
  growth: DailyGrowthSummary | null;
  loading?: boolean;
  granularity?: GrowthGranularity;
  range?: number;
  onGranularityChange?: (granularity: GrowthGranularity) => void;
  onRangeChange?: (range: number) => void;
  onSelectDay?: (day: DailyAcquisitionItem) => void;
}

export const DailyAcquisitionsGraph: React.FC<DailyAcquisitionsGraphProps> = ({
  growth,
  loading = false,
  granularity: controlledGranularity,
  range: controlledRange,
  onGranularityChange,
  onRangeChange,
  onSelectDay,
}) => {
  // Local state fallbacks if uncontrolled
  const [internalGranularity, setInternalGranularity] = useState<GrowthGranularity>('day');
  const [internalRange, setInternalRange] = useState<number>(10);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(null);
  const [seriesMode, setSeriesMode] = useState<GrowthSeriesMode>('both');

  const activeGranularity = controlledGranularity ?? internalGranularity;
  const activeRange = controlledRange ?? internalRange;

  const records = growth?.dailyRecords || [];

  // Ref to the horizontal bar chart ScrollView to ensure default view is anchored at the right end (latest bars)
  const scrollViewRef = useRef<ScrollView>(null);
  const lastContentKeyRef = useRef<string>('');

  const contentKey = `${activeGranularity}_${activeRange}_${records.length}_${records[records.length - 1]?.date ?? ''}`;

  const scrollToRightEnd = (animated = false) => {
    scrollViewRef.current?.scrollToEnd({ animated });
  };

  const handleContentSizeChange = () => {
    if (lastContentKeyRef.current !== contentKey) {
      lastContentKeyRef.current = contentKey;
      scrollToRightEnd(false);
    }
  };

  useEffect(() => {
    // Immediate and frame-delayed scrollToEnd to ensure robust positioning across web & native render cycles
    scrollToRightEnd(false);
    const timer = setTimeout(() => {
      scrollToRightEnd(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [contentKey]);

  // Reset selected item if records change and current selection is not present
  useEffect(() => {
    if (selectedPeriodKey && !records.some((r) => r.date === selectedPeriodKey)) {
      setSelectedPeriodKey(null);
    }
  }, [records, selectedPeriodKey]);

  // Determine currently inspected period (user selected, or latest with activity, or last period)
  const activeItem = useMemo(() => {
    if (records.length === 0) return null;
    if (selectedPeriodKey) {
      const found = records.find((r) => r.date === selectedPeriodKey);
      if (found) return found;
    }
    // Default to the latest period with new devices/users, or simply the last period
    const lastWithActivity = [...records].reverse().find((r) => r.newDevices > 0 || r.newUsers > 0);
    return lastWithActivity || records[records.length - 1];
  }, [records, selectedPeriodKey]);

  // Compute scale max for relative bar heights
  const maxCombined = Math.max(...records.map((r) => Math.max(r.newDevices, r.newUsers)), 1);

  const handleGranularitySelect = (newGran: GrowthGranularity) => {
    if (newGran === activeGranularity) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setInternalGranularity(newGran);
    onGranularityChange?.(newGran);

    // Default to latest 10 bars when switching projection
    const defaultRange = 10;
    setInternalRange(defaultRange);
    onRangeChange?.(defaultRange);
    setSelectedPeriodKey(null);
  };

  const handleRangeSelect = (newRange: number) => {
    if (newRange === activeRange) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setInternalRange(newRange);
    onRangeChange?.(newRange);
  };

  const handleSelectPeriod = (day: DailyAcquisitionItem) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedPeriodKey(day.date);
    onSelectDay?.(day);
  };

  const handleModeChange = (mode: GrowthSeriesMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSeriesMode(mode);
  };

  const availableRanges = PROJECTION_RANGES[activeGranularity];

  const granularityTitle =
    activeGranularity === 'week'
      ? 'Weekly First-Seen Growth'
      : activeGranularity === 'month'
      ? 'Monthly First-Seen Growth'
      : 'Daily First-Seen Growth';

  const granularitySubtitle =
    activeGranularity === 'week'
      ? `Hardware & shoppers grouped by week (Latest ${records.length} weeks)`
      : activeGranularity === 'month'
      ? `Hardware & shoppers grouped by month (Latest ${records.length} months)`
      : `Hardware & shoppers recorded for the very first time on that date (Latest ${records.length} days)`;

  // Loading skeleton state
  if (loading && !growth) {
    return (
      <View style={styles.container}>
        <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
          <YStack gap="$1">
            <View style={[styles.skeletonBar, { width: 180, height: 16 }]} />
            <View style={[styles.skeletonBar, { width: 240, height: 12 }]} />
          </YStack>
        </XStack>
        <View style={styles.skeletonTrack} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Top Header: Projection Switcher (Day / Week / Month) ── */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$2.5" flexWrap="wrap" gap="$2">
        <XStack alignItems="center" gap="$2.5">
          <View style={styles.headerIconBadge}>
            <LuTrendingUp size={18} color="#10B981" />
          </View>
          <YStack>
            <XStack alignItems="center" gap="$1.5">
              <Text style={styles.title}>{granularityTitle}</Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEVER SEEN BEFORE</Text>
              </View>
            </XStack>
            <Text style={styles.subtitle}>{granularitySubtitle}</Text>
          </YStack>
        </XStack>

        {/* 1. Projection Options (Day | Week | Month) */}
        <XStack backgroundColor="#1E293B" borderRadius={8} padding={3} gap={3} borderWidth={1} borderColor="#334155">
          {(['day', 'week', 'month'] as GrowthGranularity[]).map((g) => {
            const isGranActive = activeGranularity === g;
            return (
              <Pressable
                key={g}
                onPress={() => handleGranularitySelect(g)}
                style={[styles.granularityPill, isGranActive && styles.granularityPillActive]}
              >
                <Text style={[styles.granularityText, isGranActive && styles.granularityTextActive]}>
                  {g === 'day' ? 'Day' : g === 'week' ? 'Week' : 'Month'}
                </Text>
              </Pressable>
            );
          })}
        </XStack>
      </XStack>

      {/* ── Secondary Controls: Respective Date/Week/Month Range Filters & Series Mode ── */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3" flexWrap="wrap" gap="$2">
        {/* Dynamic Range Filters (Day Range / Week Range / Month Range) */}
        <XStack alignItems="center" gap="$1.5">
          <Text fontSize={10} color="#6B7280" textTransform="uppercase" fontWeight="700">
            {activeGranularity === 'week' ? 'Week Range:' : activeGranularity === 'month' ? 'Month Range:' : 'Date Range:'}
          </Text>
          <XStack backgroundColor="#1F2937" borderRadius={6} padding={2} gap={2}>
            {availableRanges.map((opt) => {
              const isRangeActive = activeRange === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleRangeSelect(opt.value)}
                  style={[styles.rangePill, isRangeActive && styles.rangePillActive]}
                >
                  <Text style={[styles.rangeText, isRangeActive && styles.rangeTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </XStack>
        </XStack>

        {/* Series Filter Toggle (Both / Devices / Users) */}
        <XStack backgroundColor="#1F2937" borderRadius={6} padding={2} gap={2}>
          {(['both', 'devices', 'users'] as GrowthSeriesMode[]).map((mode) => {
            const isActive = seriesMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => handleModeChange(mode)}
                style={[styles.modePill, isActive && styles.modePillActive]}
              >
                <Text style={[styles.modeText, isActive && styles.modeTextActive]}>
                  {mode === 'both' ? 'Both' : mode === 'devices' ? 'Devices' : 'Users'}
                </Text>
              </Pressable>
            );
          })}
        </XStack>
      </XStack>

      {/* ── Aggregate Totals Banner ── */}
      <XStack gap="$2" alignItems="center" marginBottom="$2.5">
        <View style={styles.deviceKpiPill}>
          <LuMonitor size={12} color="#10B981" />
          <Text style={styles.deviceKpiText}>
            +{growth?.totalNewDevices ?? 0} New Devices
          </Text>
        </View>

        <View style={styles.userKpiPill}>
          <LuUsers size={12} color="#F59E0B" />
          <Text style={styles.userKpiText}>
            +{growth?.totalNewUsers ?? 0} New Users
          </Text>
        </View>

        <View style={styles.barCountBadge}>
          <Text style={styles.barCountBadgeText}>
            {records.length} {activeGranularity} bars shown
          </Text>
        </View>
      </XStack>

      {/* ── Active Period Inspection Card (Drill-Down on Tap) ── */}
      {activeItem && (
        <View style={styles.inspectionCard}>
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap="$2">
              <LuCalendar size={14} color="#9CA3AF" />
              <Text fontSize={13} fontWeight="700" color="#FFFFFF">
                {activeItem.dateLabel} {activeItem.dayOfWeek ? `(${activeItem.dayOfWeek})` : ''}
              </Text>
              {activeItem.dateLabel === growth?.peakNewDevicesDate ? (
                <View style={styles.peakTag}>
                  <LuSparkles size={10} color="#10B981" />
                  <Text style={styles.peakTagText}>Peak Devices</Text>
                </View>
              ) : null}
            </XStack>

            <Text fontSize={10} color="#6B7280" textTransform="uppercase">
              {activeGranularity} Bucket
            </Text>
          </XStack>

          <XStack marginTop="$2" gap="$4" flexWrap="wrap">
            <YStack flex={1} minWidth={120}>
              <Text fontSize={10} color="#9CA3AF" textTransform="uppercase">
                First-Seen Devices
              </Text>
              <XStack alignItems="baseline" gap="$1.5" marginTop="$0.5">
                <Text fontSize={18} fontWeight="800" color="#10B981">
                  +{activeItem.newDevices}
                </Text>
                <Text fontSize={11} color="#6EE7B7">
                  ({activeItem.cumulativeDevices} fleet total)
                </Text>
              </XStack>
            </YStack>

            <YStack flex={1} minWidth={120}>
              <Text fontSize={10} color="#9CA3AF" textTransform="uppercase">
                First-Seen Users
              </Text>
              <XStack alignItems="baseline" gap="$1.5" marginTop="$0.5">
                <Text fontSize={18} fontWeight="800" color="#F59E0B">
                  +{activeItem.newUsers}
                </Text>
                <Text fontSize={11} color="#FCD34D">
                  ({activeItem.cumulativeUsers} registered)
                </Text>
              </XStack>
            </YStack>
          </XStack>
        </View>
      )}

      {/* ── Interactive Bar Chart (Latest N Bars, Default 10) ── */}
      {records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No device or user acquisitions recorded for this window.</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={handleContentSizeChange}
          contentContainerStyle={styles.scrollTrack}
        >
          {records.map((item) => {
            const isSelected = activeItem?.date === item.date;
            const hasActivity = item.newDevices > 0 || item.newUsers > 0;

            // Height scaling relative to max in series
            const devHeightPct =
              seriesMode === 'both' || seriesMode === 'devices'
                ? Math.max(6, Math.round((item.newDevices / maxCombined) * 80))
                : 0;

            const userHeightPct =
              seriesMode === 'both' || seriesMode === 'users'
                ? Math.max(6, Math.round((item.newUsers / maxCombined) * 80))
                : 0;

            // Display label depending on granularity
            let primaryLabel = item.dateLabel;
            let secondaryLabel = item.dayOfWeek;

            if (activeGranularity === 'day') {
              primaryLabel = item.dateLabel.split(' ')[1] || item.dateLabel;
              secondaryLabel = item.dayOfWeek;
            } else if (activeGranularity === 'week') {
              primaryLabel = item.dayOfWeek; // "W44"
              secondaryLabel = item.dateLabel.replace('Wk of ', ''); // "Oct 26"
            } else if (activeGranularity === 'month') {
              primaryLabel = item.dateLabel.split(' ')[0] || item.dateLabel; // "Oct"
              secondaryLabel = item.dayOfWeek; // "2026"
            }

            return (
              <Pressable
                key={item.date}
                onPress={() => handleSelectPeriod(item)}
                style={({ pressed }) => [
                  styles.dayColumn,
                  isSelected && styles.dayColumnSelected,
                  pressed && styles.dayColumnPressed,
                ]}
              >
                {/* Count Badge above bars */}
                <View style={styles.columnCounts}>
                  {seriesMode !== 'users' && item.newDevices > 0 ? (
                    <Text style={styles.barCountDevice}>+{item.newDevices}</Text>
                  ) : null}
                  {seriesMode !== 'devices' && item.newUsers > 0 ? (
                    <Text style={styles.barCountUser}>+{item.newUsers}</Text>
                  ) : null}
                  {!hasActivity ? (
                    <Text style={styles.barCountEmpty}>-</Text>
                  ) : null}
                </View>

                {/* Bars track */}
                <View style={styles.barsWrapper}>
                  {/* Device Bar */}
                  {seriesMode !== 'users' ? (
                    <View
                      style={[
                        styles.barDevice,
                        {
                          height: `${item.newDevices > 0 ? devHeightPct : 4}%`,
                          backgroundColor:
                            item.newDevices > 0
                              ? isSelected
                                ? '#34D399'
                                : '#10B981'
                              : '#1F2937',
                        },
                      ]}
                    />
                  ) : null}

                  {/* User Bar */}
                  {seriesMode !== 'devices' ? (
                    <View
                      style={[
                        styles.barUser,
                        {
                          height: `${item.newUsers > 0 ? userHeightPct : 4}%`,
                          backgroundColor:
                            item.newUsers > 0
                              ? isSelected
                                ? '#FBBF24'
                                : '#F59E0B'
                              : '#1F2937',
                        },
                      ]}
                    />
                  ) : null}
                </View>

                {/* Date & Period labels */}
                <Text
                  style={[
                    styles.dateLabel,
                    isSelected && styles.dateLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  {primaryLabel}
                </Text>
                <Text
                  style={[
                    styles.dayOfWeekLabel,
                    isSelected && styles.dayOfWeekLabelSelected,
                  ]}
                  numberOfLines={1}
                >
                  {secondaryLabel}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* ── Chart Legend & Explanation Footer ── */}
      <XStack justifyContent="space-between" alignItems="center" style={styles.chartFooter}>
        <XStack gap="$3" alignItems="center">
          <XStack alignItems="center" gap="$1.5">
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>New Devices (Hardware)</Text>
          </XStack>
          <XStack alignItems="center" gap="$1.5">
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>New Users (Accounts)</Text>
          </XStack>
        </XStack>
        <Text style={styles.footerNote}>
          {records.length > 7 ? '← Swipe for earlier • Tap bar to inspect' : 'Tap bar to inspect period'}
        </Text>
      </XStack>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  headerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  newBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  granularityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  granularityPillActive: {
    backgroundColor: '#0D9488',
  },
  granularityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  granularityTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  rangePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  rangePillActive: {
    backgroundColor: '#10B981',
  },
  rangeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  rangeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  deviceKpiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deviceKpiText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  userKpiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  userKpiText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  barCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  barCountBadgeText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  modePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  modePillActive: {
    backgroundColor: '#374151',
  },
  modeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  modeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inspectionCard: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  peakTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  peakTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#34D399',
  },
  scrollTrack: {
    paddingVertical: 6,
    alignItems: 'flex-end',
    gap: 8,
    minHeight: 140,
  },
  dayColumn: {
    alignItems: 'center',
    width: 44,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  dayColumnSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(16, 185, 129, 0.5)',
    borderWidth: 1,
  },
  dayColumnPressed: {
    transform: [{ scale: 0.96 }],
  },
  columnCounts: {
    height: 24,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
  },
  barCountDevice: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
  },
  barCountUser: {
    fontSize: 8,
    fontWeight: '700',
    color: '#F59E0B',
  },
  barCountEmpty: {
    fontSize: 9,
    color: '#4B5563',
  },
  barsWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 80,
    width: '100%',
    justifyContent: 'center',
  },
  barDevice: {
    width: 10,
    borderRadius: 2,
    minHeight: 3,
  },
  barUser: {
    width: 10,
    borderRadius: 2,
    minHeight: 3,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 6,
  },
  dateLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayOfWeekLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 1,
  },
  dayOfWeekLabelSelected: {
    color: '#10B981',
    fontWeight: '700',
  },
  chartFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    marginTop: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  footerNote: {
    fontSize: 10,
    color: '#6B7280',
  },
  skeletonTrack: {
    height: 120,
    backgroundColor: '#1F2937',
    borderRadius: 8,
  },
  skeletonBar: {
    backgroundColor: '#1F2937',
    borderRadius: 4,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 11,
    color: '#6B7280',
  },
});

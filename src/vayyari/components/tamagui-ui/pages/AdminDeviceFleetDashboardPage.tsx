import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LuArrowLeft, LuRefreshCw, LuChevronRight, LuMonitor, LuClock, LuSparkles } from '../icons/lu';
import { DeviceFleetStats, StoreDeviceItem, HourlyActivitySummary, DailyGrowthSummary, DailyAcquisitionItem, GrowthGranularity } from '@/services/storeAdminService';
import { DeviceFleetMetricsHeader } from '../organisms/DeviceFleetMetricsHeader/DeviceFleetMetricsHeader';
import { DeviceFleetCard } from '../molecules/DeviceFleetCard/DeviceFleetCard';
import { DeviceJourneyDrawer } from '../organisms/DeviceJourneyDrawer/DeviceJourneyDrawer';

export interface AdminDeviceFleetDashboardPageProps {
  stats: DeviceFleetStats | null;
  hourlyActivity?: HourlyActivitySummary | null;
  dailyGrowth?: DailyGrowthSummary | null;
  growthGranularity?: GrowthGranularity;
  growthRange?: number;
  growthDays?: number;
  onGrowthGranularityChange?: (granularity: GrowthGranularity) => void;
  onGrowthRangeChange?: (range: number) => void;
  onGrowthDaysChange?: (days: number) => void;
  onGrowthDaySelect?: (day: DailyAcquisitionItem) => void;
  recentDevices?: StoreDeviceItem[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack?: () => void;
  onNavigateToDevicesList?: (params?: {
    filter?: string;
    platform?: string;
    signal?: string;
    hour?: number | string;
  }) => void;
  onSelectDevice?: (device: StoreDeviceItem) => void;
  selectedDeviceId?: string | null;
  selectedDevice?: StoreDeviceItem | null;
  onCloseDeviceDrawer?: () => void;
}

export const AdminDeviceFleetDashboardPage: React.FC<AdminDeviceFleetDashboardPageProps> = ({
  stats,
  hourlyActivity = null,
  dailyGrowth = null,
  growthGranularity = 'day',
  growthRange = 10,
  growthDays,
  onGrowthGranularityChange,
  onGrowthRangeChange,
  onGrowthDaysChange,
  onGrowthDaySelect,
  recentDevices = [],
  loading = false,
  refreshing = false,
  onRefresh,
  onBack,
  onNavigateToDevicesList,
  onSelectDevice,
  selectedDeviceId = null,
  selectedDevice = null,
  onCloseDeviceDrawer,
}) => {
  const insets = useSafeAreaInsets();
  const liveDevices = recentDevices.length > 0 ? recentDevices : stats?.recentDevices || [];

  // Edge-to-right swipe-back gesture (< 60px from left edge)
  const edgeSwipeBackGesture = Gesture.Pan()
    .activeOffsetX(25)
    .failOffsetY([-25, 25])
    .hitSlop({ left: 0, width: 60 })
    .cancelsTouchesInView(false)
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX > 45 || e.velocityX > 300) {
        if (selectedDeviceId) {
          onCloseDeviceDrawer?.();
        } else if (onBack) {
          onBack();
        }
      }
    });

  // Header swipe-back gesture anywhere across the top bar
  const headerSwipeBackGesture = Gesture.Pan()
    .activeOffsetX(25)
    .failOffsetY([-25, 25])
    .cancelsTouchesInView(false)
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX > 45 || e.velocityX > 300) {
        if (selectedDeviceId) {
          onCloseDeviceDrawer?.();
        } else if (onBack) {
          onBack();
        }
      }
    });

  return (
    <GestureDetector gesture={edgeSwipeBackGesture}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* ── Top App Bar ── */}
        <GestureDetector gesture={headerSwipeBackGesture}>
          <XStack
            justifyContent="space-between"
            alignItems="center"
            paddingHorizontal="$4"
            paddingVertical="$3"
            borderBottomWidth={1}
            borderBottomColor="#1F2937"
          >
            <XStack alignItems="center" gap="$3">
              {onBack ? (
                <Pressable onPress={onBack} style={styles.iconButton}>
                  <LuArrowLeft size={20} color="#FFFFFF" />
                </Pressable>
              ) : null}
              <YStack>
                <Text fontSize={17} fontWeight="700" color="#FFFFFF">
                  Device Fleet Intelligence
                </Text>
                <Text fontSize={11} color="#9CA3AF">
                  Unified Signal Ingestion &bull; Live Telemetry
                </Text>
              </YStack>
            </XStack>

            <XStack alignItems="center" gap="$2">
              {onRefresh ? (
                <Pressable
                  onPress={onRefresh}
                  disabled={refreshing}
                  style={[styles.iconButton, refreshing && styles.iconButtonDisabled]}
                >
                  <LuRefreshCw size={18} color={refreshing ? '#6B7280' : '#10B981'} />
                </Pressable>
              ) : null}
            </XStack>
          </XStack>
        </GestureDetector>

      {/* ── Main Scrollable Body ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0D9488"
              colors={['#0D9488']}
            />
          ) : undefined
        }
      >
        {/* 1. Organism: Interactive KPI Overview, Shopper Activity & Distribution Panels */}
        <DeviceFleetMetricsHeader
          stats={stats}
          hourlyActivity={hourlyActivity}
          dailyGrowth={dailyGrowth}
          growthGranularity={growthGranularity}
          growthRange={growthRange}
          growthDays={growthDays}
          onGrowthGranularityChange={onGrowthGranularityChange}
          onGrowthRangeChange={onGrowthRangeChange}
          onGrowthDaysChange={onGrowthDaysChange}
          onGrowthDaySelect={onGrowthDaySelect}
          onLaunchBannerSelect={(type) => onNavigateToDevicesList?.({ filter: type })}
          onMetricSelect={(metric) => onNavigateToDevicesList?.({ filter: metric })}
          onPlatformSelect={(plat) => onNavigateToDevicesList?.({ platform: plat.toLowerCase() })}
          onSignalSelect={(sig) => onNavigateToDevicesList?.({ signal: sig })}
          onHourSelect={(hr) => onNavigateToDevicesList?.({ hour: hr })}
          onViewAllDevices={() => onNavigateToDevicesList?.()}
        />

        {/* 2. Primary Navigation CTA Card: Explore Dedicated Devices Directory */}
        <Pressable
          style={({ pressed }) => [styles.exploreFleetCta, pressed && styles.exploreFleetCtaPressed]}
          onPress={() => onNavigateToDevicesList?.()}
        >
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap="$3" flex={1}>
              <View style={styles.ctaIconBadge}>
                <LuMonitor size={22} color="#10B981" />
              </View>
              <YStack flex={1}>
                <Text fontSize={14} fontWeight="700" color="#FFFFFF">
                  All Hardware Devices Directory
                </Text>
                <Text fontSize={11} color="#9CA3AF" marginTop="$0.5">
                  Explore and search all {stats?.totalDevices ?? 0} registered devices with deep filters
                </Text>
              </YStack>
            </XStack>
            <View style={styles.ctaArrowCircle}>
              <LuChevronRight size={18} color="#FFFFFF" />
            </View>
          </XStack>
        </Pressable>

        {/* 3. Live Recent Hardware Activity Preview (Past Few Hours) */}
        <YStack marginTop="$4" gap="$2.5">
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap="$2">
              <View style={styles.livePulseDot} />
              <Text fontSize={14} fontWeight="700" color="#FFFFFF">
                Recent Shopper Touchpoints
              </Text>
            </XStack>
            <Pressable onPress={() => onNavigateToDevicesList?.()}>
              <Text fontSize={11} fontWeight="600" color="#0D9488">
                View All ({stats?.totalDevices ?? 0}) &rarr;
              </Text>
            </Pressable>
          </XStack>

          {liveDevices.length === 0 ? (
            <View style={styles.emptyRecent}>
              <LuClock size={28} color="#4B5563" />
              <Text fontSize={12} color="#9CA3AF" marginTop="$2">
                Awaiting real-time hardware touchpoints.
              </Text>
            </View>
          ) : (
            liveDevices.slice(0, 4).map((device) => (
              <DeviceFleetCard
                key={device.deviceId}
                device={device}
                onSelect={onSelectDevice}
              />
            ))
          )}
        </YStack>
      </ScrollView>

      {/* 4. Organism: User-Level Journey Drill-Down Drawer Modal (Last 30 Days) */}
      <DeviceJourneyDrawer
        deviceId={selectedDeviceId}
        device={selectedDevice}
        visible={Boolean(selectedDeviceId)}
        onClose={onCloseDeviceDrawer || (() => {})}
      />
    </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F17',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  exploreFleetCta: {
    marginTop: 4,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 12,
    padding: 14,
    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
  },
  exploreFleetCtaPressed: {
    backgroundColor: '#131D2E',
    borderColor: '#10B981',
  },
  ctaIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  emptyRecent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
});

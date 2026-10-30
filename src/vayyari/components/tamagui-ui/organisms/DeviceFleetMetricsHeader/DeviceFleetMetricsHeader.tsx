import React from 'react';
import { View, StyleSheet } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { DeviceFleetStats, HourlyActivitySummary, DailyGrowthSummary, DailyAcquisitionItem, GrowthGranularity } from '@/services/storeAdminService';
import { MetricStatCard } from '../../atoms/MetricStatCard/MetricStatCard';
import { ShopperActivityBarChart } from '../../molecules/ShopperActivityBarChart/ShopperActivityBarChart';
import { DailyAcquisitionsGraph } from '../../molecules/DailyAcquisitionsGraph/DailyAcquisitionsGraph';
import { TelemetryDistributionRow } from '../../molecules/TelemetryDistributionRow/TelemetryDistributionRow';

export interface DeviceFleetMetricsHeaderProps {
  stats: DeviceFleetStats | null;
  hourlyActivity: HourlyActivitySummary | null;
  dailyGrowth?: DailyGrowthSummary | null;
  growthGranularity?: GrowthGranularity;
  growthRange?: number;
  growthDays?: number;
  onGrowthGranularityChange?: (granularity: GrowthGranularity) => void;
  onGrowthRangeChange?: (range: number) => void;
  onGrowthDaysChange?: (days: number) => void;
  onGrowthDaySelect?: (day: DailyAcquisitionItem) => void;
  onHourSelect?: (hour: number) => void;
  onMetricSelect?: (metricKey: 'all' | 'active_today' | 'active_7d' | 'has_events') => void;
  onPlatformSelect?: (platform: string) => void;
  onSignalSelect?: (signal: string) => void;
  onLaunchBannerSelect?: (type: 'waitlist' | 'shares') => void;
  onViewAllDevices?: () => void;
}

export const DeviceFleetMetricsHeader: React.FC<DeviceFleetMetricsHeaderProps> = ({
  stats,
  hourlyActivity,
  dailyGrowth,
  growthGranularity = 'day',
  growthRange = 10,
  growthDays,
  onGrowthGranularityChange,
  onGrowthRangeChange,
  onGrowthDaysChange,
  onGrowthDaySelect,
  onHourSelect,
  onMetricSelect,
  onPlatformSelect,
  onSignalSelect,
  onLaunchBannerSelect,
  onViewAllDevices,
}) => {
  const platformBreakdown = stats?.platformBreakdown || {};
  const topSignals = stats?.topSignalTypes || {};

  let totalEvents = 0;
  if (stats?.recentDevices) {
    totalEvents = stats.recentDevices.reduce((sum, d) => sum + (d.totalEvents || 0), 0);
  }

  // Calculate High-Intent Prelaunch & Store Conversion Velocity
  const waitlistClicks =
    (topSignals['waitlist_join_clicked'] || 0) +
    (topSignals['waitlist_joined'] || 0);

  const passShares =
    (topSignals['vip_pass_shared_whatsapp'] || 0) +
    (topSignals['vip_pass_copied'] || 0) +
    (topSignals['cart_shared_whatsapp'] || 0);

  const totalDevs = Math.max(stats?.totalDevices ?? 0, 1);
  const conversionPct = stats?.totalDevices
    ? Math.round((waitlistClicks / stats.totalDevices) * 100)
    : 0;

  const maxPlatform = Math.max(...Object.values(platformBreakdown), 1);
  const maxSignal = Math.max(...Object.values(topSignals), 1);

  return (
    <YStack gap="$3" marginBottom="$3">
      {/* ── Mature Launch Velocity Banner ── */}
      <View style={styles.launchBanner}>
        <XStack justifyContent="space-between" alignItems="center">
          <XStack alignItems="center" gap="$2">
            <View style={styles.livePulseDot} />
            <Text fontSize={12} fontWeight="700" color="#D4AF37" letterSpacing={0.8}>
              PRELAUNCH & STORE LAUNCH PULSE
            </Text>
          </XStack>
          <View style={styles.livePill}>
            <Text fontSize={10} fontWeight="700" color="#10B981">
              LIVE MONITORING
            </Text>
          </View>
        </XStack>

        <XStack gap="$3" marginTop="$2.5" flexWrap="wrap">
          <YStack
            flex={1}
            minWidth={140}
            onPress={() => onLaunchBannerSelect?.('waitlist')}
            style={onLaunchBannerSelect ? styles.interactiveBlock : undefined}
          >
            <Text fontSize={10} color="#9CA3AF" textTransform="uppercase">
              VIP Waitlist Intent
            </Text>
            <XStack alignItems="baseline" gap="$1.5" marginTop="$1">
              <Text fontSize={18} fontWeight="800" color="#F3D57D">
                {waitlistClicks}
              </Text>
              <Text fontSize={11} color="#10B981" fontWeight="600">
                ({conversionPct}% conv) &rarr;
              </Text>
            </XStack>
          </YStack>

          <YStack
            flex={1}
            minWidth={140}
            onPress={() => onLaunchBannerSelect?.('shares')}
            style={onLaunchBannerSelect ? styles.interactiveBlock : undefined}
          >
            <Text fontSize={10} color="#9CA3AF" textTransform="uppercase">
              Viral Pass Shares
            </Text>
            <XStack alignItems="baseline" gap="$1.5" marginTop="$1">
              <Text fontSize={18} fontWeight="800" color="#34D399">
                {passShares}
              </Text>
              <Text fontSize={11} color="#34D399" fontWeight="600">
                &rarr;
              </Text>
            </XStack>
          </YStack>

          <YStack
            flex={1.2}
            minWidth={160}
            onPress={() => {
              if (hourlyActivity?.peakHourIst !== undefined && hourlyActivity.peakHourIst >= 0) {
                onHourSelect?.(hourlyActivity.peakHourIst);
              }
            }}
            style={onHourSelect ? styles.interactiveBlock : undefined}
          >
            <Text fontSize={10} color="#9CA3AF" textTransform="uppercase">
              Peak IST Shopping Hour
            </Text>
            <Text fontSize={13} fontWeight="700" color="#FFFFFF" marginTop="$1" numberOfLines={1}>
              {hourlyActivity?.peakHourLabel || '19:00 IST (Evening Drapes)'} &rarr;
            </Text>
          </YStack>
        </XStack>
      </View>

      {/* 1. Four Interactive KPI Metric Cards */}
      <XStack flexWrap="wrap" gap="$2.5">
        <MetricStatCard
          label="Total Hardware"
          value={stats?.totalDevices ?? '-'}
          subtitle="Unique devices registered"
          valueColor="#FFFFFF"
          onPress={() => onMetricSelect?.('all')}
        />
        <MetricStatCard
          label="Active Today (24h)"
          value={stats?.activeToday ?? '-'}
          subtitle="Shoppers in last 24h"
          valueColor="#10B981"
          onPress={() => onMetricSelect?.('active_today')}
        />
        <MetricStatCard
          label="Active (7 Days)"
          value={stats?.activeLast7Days ?? '-'}
          subtitle="Weekly returning audience"
          valueColor="#06B6D4"
          onPress={() => onMetricSelect?.('active_7d')}
        />
        <MetricStatCard
          label="Journey Cues"
          value={totalEvents > 0 ? totalEvents : '-'}
          subtitle="Recorded touchpoints"
          valueColor="#F59E0B"
          onPress={() => onMetricSelect?.('has_events')}
        />
      </XStack>

      {/* 2. Daily First-Seen Growth (New Devices & Users Never Seen Before) */}
      <DailyAcquisitionsGraph
        growth={dailyGrowth ?? null}
        granularity={growthGranularity}
        range={growthRange ?? growthDays ?? 10}
        onGranularityChange={onGrowthGranularityChange}
        onRangeChange={(r) => {
          onGrowthRangeChange?.(r);
          onGrowthDaysChange?.(r);
        }}
        onSelectDay={onGrowthDaySelect}
      />

      {/* 3. 24-Hour Shopper Activity by Time of Day */}
      <ShopperActivityBarChart
        activity={hourlyActivity}
        onHourSelect={onHourSelect}
      />

      {/* 3. Platform & Top Signals Distribution Panels */}
      <XStack flexWrap="wrap" gap="$2.5">
        {/* Platform breakdown */}
        <View style={styles.panel}>
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$1">
            <Text style={styles.panelTitle}>Platform Distribution</Text>
            <Text fontSize={10} color="#6B7280">Tap to filter</Text>
          </XStack>
          {Object.keys(platformBreakdown).length === 0 ? (
            <Text style={styles.emptyText}>No platform signals yet.</Text>
          ) : (
            Object.entries(platformBreakdown).map(([platform, count]) => {
              const pct = Math.round((count / maxPlatform) * 100);
              return (
                <TelemetryDistributionRow
                  key={platform}
                  label={platform.toUpperCase()}
                  count={count}
                  percentage={pct}
                  barColor="#6366F1"
                  onPress={() => onPlatformSelect?.(platform)}
                />
              );
            })
          )}
        </View>

        {/* Top signals breakdown */}
        <View style={styles.panel}>
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$1">
            <Text style={styles.panelTitle}>Top User Journey Events</Text>
            <Text fontSize={10} color="#6B7280">Tap to filter</Text>
          </XStack>
          {Object.keys(topSignals).length === 0 ? (
            <Text style={styles.emptyText}>No journey events recorded yet.</Text>
          ) : (
            Object.entries(topSignals).slice(0, 5).map(([signal, count]) => {
              const pct = Math.round((count / maxSignal) * 100);
              return (
                <TelemetryDistributionRow
                  key={signal}
                  label={signal}
                  count={count}
                  percentage={pct}
                  barColor="#E11D48"
                  onPress={() => onSignalSelect?.(signal)}
                />
              );
            })
          )}
        </View>
      </XStack>
    </YStack>
  );
};

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 11,
    color: '#6B7280',
    paddingVertical: 8,
  },
  launchBanner: {
    backgroundColor: '#0A0F1D',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  livePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  interactiveBlock: {
    cursor: 'pointer' as any,
  },
});

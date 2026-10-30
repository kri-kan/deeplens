import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { HourlyActivitySummary } from '@/services/storeAdminService';

export interface ShopperActivityBarChartProps {
  activity: HourlyActivitySummary | null;
  onHourSelect?: (hour: number) => void;
}

export const ShopperActivityBarChart: React.FC<ShopperActivityBarChartProps> = ({
  activity,
  onHourSelect,
}) => {
  const dist = activity?.distribution || [];
  const peakHour = activity?.peakHourIst ?? -1;
  const maxEvt = Math.max(...dist.map((d) => d.totalEvents), 1);

  const scrollViewRef = useRef<ScrollView>(null);
  const lastDataKeyRef = useRef<string>('');

  const dataKey = `${dist.length}_${dist[dist.length - 1]?.totalEvents ?? ''}_${peakHour}`;

  const scrollToRightEnd = (animated = false) => {
    scrollViewRef.current?.scrollToEnd({ animated });
  };

  const handleContentSizeChange = () => {
    if (lastDataKeyRef.current !== dataKey) {
      lastDataKeyRef.current = dataKey;
      scrollToRightEnd(false);
    }
  };

  useEffect(() => {
    scrollToRightEnd(false);
    const timer = setTimeout(() => {
      scrollToRightEnd(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [dataKey]);

  return (
    <View style={styles.container}>
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$2" flexWrap="wrap" gap="$2">
        <YStack>
          <Text style={styles.title}>⏰ Activity by Time of Day (IST)</Text>
          <Text style={styles.subtitle}>Detailed records for last 30 days &bull; Hourly rollups &gt;30d</Text>
        </YStack>
        {activity?.peakHourLabel ? (
          <View style={styles.peakBadge}>
            <Text style={styles.peakText}>🔥 Peak: {activity.peakHourLabel}</Text>
          </View>
        ) : null}
      </XStack>

      {/* 24-hour horizontal bar chart */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={handleContentSizeChange}
        contentContainerStyle={styles.scrollTrack}
      >
        {dist.map((h) => {
          const heightPct = Math.max(10, Math.round((h.totalEvents / maxEvt) * 80));
          const isPeak = h.hourIst === peakHour && h.totalEvents > 0;
          const hasTraffic = h.totalEvents > 0;

          return (
            <YStack
              key={h.hourIst}
              alignItems="center"
              width={28}
              justifyContent="flex-end"
              height={100}
              onPress={() => onHourSelect?.(h.hourIst)}
            >
              {h.totalEvents > 0 ? (
                <Text
                  style={[
                    styles.barCount,
                    { color: isPeak ? '#F43F5E' : '#9CA3AF' },
                  ]}
                >
                  {h.totalEvents}
                </Text>
              ) : null}
              <View
                style={[
                  styles.bar,
                  {
                    height: `${heightPct}%`,
                    backgroundColor: isPeak
                      ? '#E11D48'
                      : hasTraffic
                      ? '#06B6D4'
                      : '#1F2937',
                  },
                ]}
              />
              <Text
                style={[
                  styles.barLabel,
                  {
                    color: isPeak ? '#FFFFFF' : '#6B7280',
                    fontWeight: isPeak ? '700' : '400',
                  },
                ]}
              >
                {h.hourIst}
              </Text>
            </YStack>
          );
        })}
      </ScrollView>

      <XStack justifyContent="space-between" style={styles.phaseIndicator}>
        <Text style={styles.phaseText}>🌙 00:00</Text>
        <Text style={styles.phaseText}>🌅 06:00</Text>
        <Text style={styles.phaseText}>☀️ 12:00</Text>
        <Text style={styles.phaseText}>🌆 18:00</Text>
        <Text style={styles.phaseText}>✨ 23:00</Text>
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
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  peakBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  peakText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  scrollTrack: {
    paddingVertical: 10,
    alignItems: 'flex-end',
    gap: 6,
    minHeight: 120,
  },
  barCount: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 2,
  },
  bar: {
    width: 16,
    borderRadius: 3,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  phaseIndicator: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    marginTop: 4,
  },
  phaseText: {
    fontSize: 10,
    color: '#6B7280',
  },
});

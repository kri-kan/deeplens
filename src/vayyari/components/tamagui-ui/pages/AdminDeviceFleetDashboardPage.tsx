import React, { useState, useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  LuArrowLeft,
  LuRefreshCw,
  LuSearch,
  LuMonitor,
  LuCopy,
  LuCheck,
  LuClock,
  LuSlidersHorizontal,
} from '../icons/lu';
import { useTheme } from '@/theme';
import { DeviceFleetStats, StoreDeviceItem } from '@/services/storeAdminService';

function timeAgo(dateString: string): string {
  const now = Date.now();
  const past = new Date(dateString).getTime();
  const diffSec = Math.floor((now - past) / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function formatIST(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export interface AdminDeviceFleetDashboardPageProps {
  stats: DeviceFleetStats | null;
  devices: StoreDeviceItem[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack?: () => void;
}

export const AdminDeviceFleetDashboardPage: React.FC<AdminDeviceFleetDashboardPageProps> = ({
  stats,
  devices,
  loading = false,
  refreshing = false,
  onRefresh,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string) => {
    await Clipboard.setStringAsync(id);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        d.deviceId.toLowerCase().includes(q) ||
        (d.model || '').toLowerCase().includes(q) ||
        (d.os || '').toLowerCase().includes(q) ||
        (d.browser || '').toLowerCase().includes(q) ||
        (d.lastIp || '').toLowerCase().includes(q);

      const matchesPlatform =
        selectedPlatform === 'all' || d.platform.toLowerCase() === selectedPlatform.toLowerCase();

      return matchesQuery && matchesPlatform;
    });
  }, [devices, searchQuery, selectedPlatform]);

  const platformBreakdown = stats?.platformBreakdown || {};
  const topSignals = stats?.topSignalTypes || {};

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Top App Bar ── */}
      <View style={styles.topBar}>
        <XStack alignItems="center" gap="$3">
          {onBack && (
            <Pressable onPress={onBack} hitSlop={8} style={styles.iconBtn}>
              <LuArrowLeft size={20} color="#fff" />
            </Pressable>
          )}
          <YStack>
            <XStack alignItems="center" gap="$2">
              <Text fontSize={18} fontWeight="700" color="#fff">
                Device Fleet & Telemetry
              </Text>
              <View style={styles.liveBadge}>
                <View style={styles.pulseDot} />
                <Text fontSize={10} fontWeight="700" color="#10B981">
                  LIVE
                </Text>
              </View>
            </XStack>
            <Text fontSize={12} color="#9CA3AF">
              Active shoppers, platforms & journey cues
            </Text>
          </YStack>
        </XStack>

        <Pressable onPress={onRefresh} hitSlop={8} style={[styles.iconBtn, refreshing && styles.iconBtnSpin]}>
          <LuRefreshCw size={18} color="#0D9488" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D9488" />
          ) : undefined
        }
      >
        {/* ── 4 KPI Stats Cards ── */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TOTAL DEVICES</Text>
            <Text style={styles.kpiValue}>{stats ? stats.totalDevices.toLocaleString() : '-'}</Text>
            <Text style={styles.kpiSub}>Registered hardware</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>ACTIVE TODAY</Text>
            <Text style={[styles.kpiValue, { color: '#10B981' }]}>
              {stats ? stats.activeToday.toLocaleString() : '-'}
            </Text>
            <Text style={styles.kpiSub}>24h active shoppers</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>ACTIVE 7 DAYS</Text>
            <Text style={[styles.kpiValue, { color: '#06B6D4' }]}>
              {stats ? stats.activeLast7Days.toLocaleString() : '-'}
            </Text>
            <Text style={styles.kpiSub}>Weekly active shoppers</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TOTAL SIGNALS</Text>
            <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>
              {stats
                ? stats.recentDevices.reduce((sum, d) => sum + (d.totalEvents || 0), 0).toLocaleString()
                : '-'}
            </Text>
            <Text style={styles.kpiSub}>Journey cues logged</Text>
          </View>
        </View>

        {/* ── Platform & Signals Summary ── */}
        <View style={styles.summaryGrid}>
          {/* Platform Distribution */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Platform Distribution</Text>
            {Object.keys(platformBreakdown).length === 0 ? (
              <Text style={styles.emptyText}>No platform signals yet.</Text>
            ) : (
              Object.entries(platformBreakdown).map(([platform, count]) => {
                const total = Math.max(stats?.totalDevices || 1, 1);
                const pct = Math.round((count / total) * 100);
                return (
                  <View key={platform} style={styles.barRow}>
                    <Text style={styles.barLabel}>{platform.toUpperCase()}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: '#6366F1' }]} />
                    </View>
                    <Text style={styles.barVal}>{count}</Text>
                  </View>
                );
              })
            )}
          </View>

          {/* Top User Journey Events */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Top User Journey Events</Text>
            {Object.keys(topSignals).length === 0 ? (
              <Text style={styles.emptyText}>No user events recorded yet.</Text>
            ) : (
              Object.entries(topSignals).slice(0, 5).map(([signal, count]) => {
                const max = Math.max(...Object.values(topSignals));
                const pct = Math.round((count / max) * 100);
                return (
                  <View key={signal} style={styles.barRow}>
                    <Text style={styles.barLabel} numberOfLines={1}>
                      {signal}
                    </Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: '#E11D48' }]} />
                    </View>
                    <Text style={styles.barVal}>{count}</Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* ── Search & Platform Filter ── */}
        <View style={styles.searchSection}>
          <XStack alignItems="center" style={styles.searchBar} gap="$2">
            <LuSearch size={16} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by device ID, model, OS, IP..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </XStack>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {['all', 'pwa', 'android', 'web', 'ios'].map((p) => {
              const active = selectedPlatform === p;
              return (
                <Pressable
                  key={p}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedPlatform(p)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {p.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Device Cards List ── */}
        <YStack gap="$3" marginVertical="$2">
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 40 }} />
          ) : filteredDevices.length === 0 ? (
            <View style={styles.emptyState}>
              <LuMonitor size={48} color="#4B5563" />
              <Text fontSize={15} fontWeight="600" color="#9CA3AF" marginTop="$3">
                No devices found
              </Text>
              <Text fontSize={12} color="#6B7280" marginTop="$1">
                Browse on the Store App or PWA to register active devices.
              </Text>
            </View>
          ) : (
            filteredDevices.map((d) => {
              const isCopied = copiedId === d.deviceId;
              const cleanIp = (d.lastIp || 'Unknown').replace('/128', '').replace('/32', '');
              const isPWA = d.platform.toLowerCase() === 'pwa';
              const isAndroid = d.platform.toLowerCase() === 'android';

              return (
                <View key={d.deviceId} style={styles.deviceCard}>
                  {/* Top card row */}
                  <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
                    <XStack alignItems="center" gap="$2" flex={1}>
                      <View
                        style={[
                          styles.platformBadge,
                          isAndroid
                            ? styles.badgeAndroid
                            : isPWA
                            ? styles.badgePWA
                            : styles.badgeWeb,
                        ]}
                      >
                        <Text
                          style={[
                            styles.platformBadgeText,
                            isAndroid
                              ? styles.textAndroid
                              : isPWA
                              ? styles.textPWA
                              : styles.textWeb,
                          ]}
                        >
                          {d.platform.toUpperCase()}
                        </Text>
                      </View>

                      <Pressable
                        style={styles.idChip}
                        onPress={() => handleCopy(d.deviceId)}
                        hitSlop={6}
                      >
                        <Text style={styles.idText} numberOfLines={1}>
                          {d.deviceId}
                        </Text>
                        {isCopied ? (
                          <LuCheck size={12} color="#10B981" />
                        ) : (
                          <LuCopy size={12} color="#9CA3AF" />
                        )}
                      </Pressable>
                    </XStack>

                    <View style={styles.eventsBadge}>
                      <Text style={styles.eventsBadgeText}>{d.totalEvents} cues</Text>
                    </View>
                  </XStack>

                  {/* Specs */}
                  <View style={styles.specsRow}>
                    <YStack flex={1}>
                      <Text fontSize={14} fontWeight="600" color="#fff">
                        {d.model || 'Unknown Model'}
                      </Text>
                      <Text fontSize={12} color="#9CA3AF">
                        {d.os || 'Unknown OS'} &bull; {d.browser || 'Browser'}
                      </Text>
                    </YStack>

                    <YStack alignItems="flex-end">
                      <Text fontSize={12} fontWeight="600" color="#06B6D4">
                        {cleanIp}
                      </Text>
                      <Text fontSize={11} color="#6B7280">
                        {d.screenResolution || '-'}
                      </Text>
                    </YStack>
                  </View>

                  {/* Timestamps footer */}
                  <View style={styles.cardFooter}>
                    <XStack alignItems="center" gap="$1">
                      <LuClock size={12} color="#6B7280" />
                      <Text fontSize={11} color="#9CA3AF">
                        Last seen: {formatIST(d.lastSeenAt)} ({timeAgo(d.lastSeenAt)})
                      </Text>
                    </XStack>
                  </View>
                </View>
              );
            })
          )}
        </YStack>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F17',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSpin: {
    opacity: 0.6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 28,
  },
  kpiSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  panel: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#6B7280',
    paddingVertical: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  barLabel: {
    width: 110,
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#1F2937',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barVal: {
    width: 32,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  searchSection: {
    marginBottom: 12,
  },
  searchBar: {
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  deviceCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 14,
  },
  platformBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  platformBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeAndroid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  textAndroid: { color: '#34D399' },
  badgePWA: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  textPWA: { color: '#818CF8' },
  badgeWeb: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  textWeb: { color: '#22D3EE' },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 180,
  },
  idText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#E5E7EB',
  },
  eventsBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  eventsBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    marginTop: 6,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

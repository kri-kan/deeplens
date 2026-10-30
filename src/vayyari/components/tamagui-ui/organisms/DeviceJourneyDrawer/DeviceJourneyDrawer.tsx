import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { LuX, LuSparkles, LuCheck, LuCheckCircle2, LuMonitor, LuClock } from '../../icons/lu';
import { StoreDeviceItem, TelemetrySignalRecord } from '@/services/storeAdminService';
import {
  useGetDeviceSignalsQuery,
  useGetDeviceProfileQuery,
  useGetDeviceSessionsQuery,
} from '@/store/api/telemetryApi';

export interface DeviceJourneyDrawerProps {
  deviceId: string | null;
  device: StoreDeviceItem | null;
  visible: boolean;
  onClose: () => void;
}

export const DeviceJourneyDrawer: React.FC<DeviceJourneyDrawerProps> = ({
  deviceId,
  device,
  visible,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number>(30);

  const {
    data: signals = [],
    isLoading: signalsLoading,
    refetch: refetchSignals,
  } = useGetDeviceSignalsQuery(
    { deviceId: deviceId ?? '', limit: 200, days: selectedDays },
    { skip: !deviceId || !visible }
  );

  const { data: profile } = useGetDeviceProfileQuery(deviceId ?? '', {
    skip: !deviceId || !visible,
  });

  const { data: sessions = [] } = useGetDeviceSessionsQuery(
    { deviceId: deviceId ?? '', limit: 20 },
    { skip: !deviceId || !visible }
  );

  if (!visible || !deviceId) return null;

  const handleCopyId = () => {
    Clipboard.setString(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Funnel Stage Detection
  const hasLanded = signals.some((s) => s.signalType === 'session_start');
  const hasEngaged = signals.some(
    (s) => s.signalType === 'hero_video_action' || s.signalType === 'scroll_milestone'
  );
  const hasViewedCapsule = signals.some(
    (s) => s.signalType === 'silhouette_viewed' || s.signalType === 'product_viewed'
  );
  const hasJoinedWaitlist = signals.some(
    (s) => s.signalType === 'waitlist_join_clicked' || s.signalType.includes('waitlist')
  );
  const hasSharedPass = signals.some(
    (s) =>
      s.signalType === 'vip_pass_shared_whatsapp' ||
      s.signalType === 'vip_pass_copied' ||
      s.signalType === 'cart_shared_whatsapp'
  );
  const hasConverted = hasJoinedWaitlist || hasSharedPass;

  const formatIST = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const formatRelative = (dateStr: string) => {
    try {
      const ms = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(ms / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch {
      return '';
    }
  };

  const getSignalBadgeStyle = (type: string) => {
    if (type.includes('waitlist') || type.includes('order')) {
      return { bg: 'rgba(212, 175, 55, 0.15)', text: '#D4AF37', border: '#D4AF37' };
    }
    if (type.includes('pass') || type.includes('share') || type.includes('bag')) {
      return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: '#10B981' };
    }
    if (type.includes('silhouette') || type.includes('product')) {
      return { bg: 'rgba(139, 92, 246, 0.15)', text: '#A78BFA', border: '#8B5CF6' };
    }
    if (type.includes('scroll') || type.includes('video')) {
      return { bg: 'rgba(6, 182, 212, 0.15)', text: '#06B6D4', border: '#06B6D4' };
    }
    return { bg: 'rgba(55, 65, 81, 0.4)', text: '#9CA3AF', border: '#4B5563' };
  };

  const getPlatformColor = (plat?: string) => {
    const p = (plat || '').toLowerCase();
    if (p === 'web') return '#06B6D4';
    if (p === 'android') return '#10B981';
    if (p === 'ios') return '#F59E0B';
    if (p === 'pwa') return '#8B5CF6';
    return '#9CA3AF';
  };

  const platformColor = getPlatformColor(device?.platform);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.drawerCard}>
          {/* ── Drawer Header ── */}
          <XStack
            justifyContent="space-between"
            alignItems="flex-start"
            padding="$4"
            borderBottomWidth={1}
            borderBottomColor="#1F2937"
          >
            <YStack flex={1} gap="$1.5">
              <XStack alignItems="center" gap="$2">
                <View
                  style={[
                    styles.platformBadge,
                    {
                      backgroundColor: `${platformColor}20`,
                      borderColor: platformColor,
                    },
                  ]}
                >
                  <Text fontSize={10} fontWeight="700" color={platformColor}>
                    {(device?.platform || 'WEB').toUpperCase()}
                  </Text>
                </View>

                {profile?.isIdentified ? (
                  <View style={styles.identifiedBadge}>
                    <LuSparkles size={11} color="#10B981" />
                    <Text fontSize={10} fontWeight="600" color="#10B981">
                      VERIFIED CUSTOMER
                    </Text>
                  </View>
                ) : (
                  <View style={styles.anonymousBadge}>
                    <Text fontSize={10} color="#9CA3AF">
                      ANONYMOUS SHOPPER
                    </Text>
                  </View>
                )}
              </XStack>

              <Pressable onPress={handleCopyId} style={styles.deviceIdRow}>
                <Text fontSize={14} fontWeight="700" color="#FFFFFF" fontFamily="monospace">
                  {deviceId}
                </Text>
                <View style={styles.copyPill}>
                  {copied ? (
                    <LuCheck size={12} color="#10B981" />
                  ) : (
                    <Text fontSize={10} color="#9CA3AF">
                      COPY
                    </Text>
                  )}
                </View>
              </Pressable>

              <Text fontSize={12} color="#9CA3AF">
                {device?.model || 'Device'} &bull; {device?.os || 'OS'} &bull;{' '}
                {device?.browser || 'Browser'} &bull; {device?.screenResolution || ''}
              </Text>
            </YStack>

            <Pressable onPress={onClose} style={styles.closeButton}>
              <LuX size={20} color="#9CA3AF" />
            </Pressable>
          </XStack>

          {/* ── Scrollable Body ── */}
          <ScrollView contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* 1. Funnel Journey Progress Card */}
            <YStack style={styles.funnelCard} gap="$2">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={11} fontWeight="700" color="#D4AF37" letterSpacing={1}>
                  PRELAUNCH CONVERSION FUNNEL
                </Text>
                <Text fontSize={10} color="#9CA3AF">
                  {signals.length} recorded signals
                </Text>
              </XStack>

              <XStack justifyContent="space-between" marginTop="$2" gap="$1">
                <View style={[styles.funnelStep, hasLanded && styles.funnelStepDone]}>
                  <Text style={[styles.funnelStepText, hasLanded && styles.funnelStepTextDone]}>
                    1. Landed
                  </Text>
                </View>
                <View style={[styles.funnelStep, hasEngaged && styles.funnelStepDone]}>
                  <Text style={[styles.funnelStepText, hasEngaged && styles.funnelStepTextDone]}>
                    2. Engaged
                  </Text>
                </View>
                <View style={[styles.funnelStep, hasViewedCapsule && styles.funnelStepDone]}>
                  <Text style={[styles.funnelStepText, hasViewedCapsule && styles.funnelStepTextDone]}>
                    3. Silhouettes
                  </Text>
                </View>
                <View
                  style={[
                    styles.funnelStep,
                    hasJoinedWaitlist && styles.funnelStepGoldDone,
                  ]}
                >
                  <Text
                    style={[
                      styles.funnelStepText,
                      hasJoinedWaitlist && styles.funnelStepTextGold,
                    ]}
                  >
                    4. Waitlist
                  </Text>
                </View>
                <View style={[styles.funnelStep, hasSharedPass && styles.funnelStepGreenDone]}>
                  <Text style={[styles.funnelStepText, hasSharedPass && styles.funnelStepTextGreen]}>
                    5. Shared
                  </Text>
                </View>
              </XStack>
            </YStack>

            {/* 2. Device Vitals Grid */}
            <XStack gap="$2" marginVertical="$2">
              <YStack flex={1} style={styles.vitalBox}>
                <Text fontSize={10} color="#6B7280" textTransform="uppercase">
                  First Seen
                </Text>
                <Text fontSize={12} color="#E5E7EB" fontWeight="600" marginTop="$1">
                  {device ? formatRelative(device.firstSeenAt) : '-'}
                </Text>
                <Text fontSize={9} color="#9CA3AF">
                  {device ? formatIST(device.firstSeenAt) : ''}
                </Text>
              </YStack>

              <YStack flex={1} style={styles.vitalBox}>
                <Text fontSize={10} color="#6B7280" textTransform="uppercase">
                  Last Active
                </Text>
                <Text fontSize={12} color="#10B981" fontWeight="600" marginTop="$1">
                  {device ? formatRelative(device.lastSeenAt) : '-'}
                </Text>
                <Text fontSize={9} color="#9CA3AF">
                  {device ? formatIST(device.lastSeenAt) : ''}
                </Text>
              </YStack>

              <YStack flex={1} style={styles.vitalBox}>
                <Text fontSize={10} color="#6B7280" textTransform="uppercase">
                  Network IP
                </Text>
                <Text
                  fontSize={11}
                  color="#D1D5DB"
                  fontWeight="600"
                  numberOfLines={1}
                  marginTop="$1"
                >
                  {device?.lastIp ? device.lastIp.split('/')[0] : 'Private'}
                </Text>
                <Text fontSize={9} color="#9CA3AF">
                  Cloudflare Gateway
                </Text>
              </YStack>
            </XStack>

            {/* 3. Live Chronological User Journey Timeline */}
            <YStack marginTop="$3" gap="$2">
              <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="$2">
                <YStack>
                  <Text fontSize={13} fontWeight="700" color="#FFFFFF">
                    Journey Timeline ({signals.length})
                  </Text>
                  <Text fontSize={10} color="#9CA3AF">
                    Showing available events from last {selectedDays} days
                  </Text>
                </YStack>

                <XStack alignItems="center" gap="$1.5">
                  {[7, 14, 30].map((d) => {
                    const active = selectedDays === d;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => setSelectedDays(d)}
                        style={[
                          styles.timeframePill,
                          active && styles.timeframePillActive,
                        ]}
                      >
                        <Text
                          fontSize={10}
                          fontWeight={active ? '700' : '500'}
                          color={active ? '#10B981' : '#9CA3AF'}
                        >
                          {d}d
                        </Text>
                      </Pressable>
                    );
                  })}
                  <Pressable onPress={() => refetchSignals()} style={styles.timeframeRefreshBtn}>
                    <Text fontSize={11} color="#0D9488">
                      Refresh
                    </Text>
                  </Pressable>
                </XStack>
              </XStack>

              {signalsLoading ? (
                <ActivityIndicator size="small" color="#0D9488" style={{ marginTop: 24 }} />
              ) : signals.length === 0 ? (
                <View style={styles.emptySignals}>
                  <LuClock size={32} color="#4B5563" />
                  <Text fontSize={12} color="#9CA3AF" marginTop="$2">
                    No individual signals recorded yet for this device.
                  </Text>
                </View>
              ) : (
                <YStack gap="$2" marginTop="$1">
                  {signals.map((sig, idx) => {
                    const badge = getSignalBadgeStyle(sig.signalType);
                    const isExpanded = expandedSignalId === sig.id;

                    return (
                      <Pressable
                        key={sig.id}
                        onPress={() =>
                          setExpandedSignalId(isExpanded ? null : sig.id)
                        }
                        style={[styles.signalCard, isExpanded && styles.signalCardExpanded]}
                      >
                        <XStack justifyContent="space-between" alignItems="center">
                          <XStack alignItems="center" gap="$2">
                            <View
                              style={[
                                styles.signalPill,
                                {
                                  backgroundColor: badge.bg,
                                  borderColor: badge.border,
                                },
                              ]}
                            >
                              <Text fontSize={11} fontWeight="700" color={badge.text}>
                                {sig.signalType}
                              </Text>
                            </View>

                            {sig.properties?.sessionDurationSec !== undefined ? (
                              <Text fontSize={10} color="#6B7280">
                                +{sig.properties.sessionDurationSec}s
                              </Text>
                            ) : null}
                          </XStack>

                          <Text fontSize={10} color="#9CA3AF">
                            {sig.clientTimestamp
                              ? formatIST(sig.clientTimestamp)
                              : formatIST(sig.serverTimestamp)}
                          </Text>
                        </XStack>

                        {/* Inline Snippet Preview */}
                        {sig.properties && !isExpanded ? (
                          <Text
                            fontSize={11}
                            color="#9CA3AF"
                            numberOfLines={1}
                            marginTop="$1.5"
                            fontFamily="monospace"
                          >
                            {sig.properties.landingPage ||
                              sig.properties.title ||
                              sig.properties.source ||
                              sig.properties.action ||
                              JSON.stringify(sig.properties)}
                          </Text>
                        ) : null}

                        {/* Expanded JSON Inspector */}
                        {isExpanded && sig.properties ? (
                          <YStack
                            backgroundColor="#05080E"
                            padding="$2.5"
                            borderRadius={6}
                            marginTop="$2"
                            borderWidth={1}
                            borderColor="#1E293B"
                          >
                            <Text fontSize={10} color="#CBD5E1" fontFamily="monospace">
                              {JSON.stringify(sig.properties, null, 2)}
                            </Text>
                          </YStack>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </YStack>
              )}
            </YStack>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  drawerCard: {
    backgroundColor: '#0E131F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 40,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  identifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  anonymousBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deviceIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  copyPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#1E293B',
  },
  funnelCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  funnelStep: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#1F2937',
    alignItems: 'center',
  },
  funnelStepDone: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: '#06B6D4',
  },
  funnelStepGoldDone: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  funnelStepGreenDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  funnelStepText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  funnelStepTextDone: {
    color: '#22D3EE',
  },
  funnelStepTextGold: {
    color: '#F3D57D',
  },
  funnelStepTextGreen: {
    color: '#34D399',
  },
  vitalBox: {
    backgroundColor: '#111827',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  signalCard: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  signalCardExpanded: {
    borderColor: '#0D9488',
    backgroundColor: '#131D2E',
  },
  signalPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  emptySignals: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  timeframePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  timeframePillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  timeframeRefreshBtn: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
});

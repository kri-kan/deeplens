import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack, Text } from 'tamagui';
import {
  LuFilter,
  LuX,
  LuRotateCcw,
  LuCheck,
  LuClock,
  LuSparkles,
  LuMonitor,
} from '../../icons/lu';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(360, Math.max(300, SCREEN_WIDTH * 0.85));

export interface DeviceFleetFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedPlatform: string;
  onSelectPlatform: (platform: string) => void;
  activeFilter?: string;
  onSelectFilter: (filter?: string) => void;
  activeSignal?: string;
  onSelectSignal: (signal?: string) => void;
  activeHour?: string | number;
  onSelectHour: (hour?: string | number) => void;
  totalDevicesCount: number;
  filteredCount: number;
  onResetAll: () => void;
}

export const DeviceFleetFilterSheet: React.FC<DeviceFleetFilterSheetProps> = ({
  visible,
  onClose,
  selectedPlatform,
  onSelectPlatform,
  activeFilter,
  onSelectFilter,
  activeSignal,
  onSelectSignal,
  activeHour,
  onSelectHour,
  totalDevicesCount,
  filteredCount,
  onResetAll,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const platforms = [
    { key: 'all', label: 'All Platforms' },
    { key: 'pwa', label: 'PWA Mobile' },
    { key: 'android', label: 'Android' },
    { key: 'ios', label: 'iOS Safari' },
    { key: 'web', label: 'Web Browser' },
  ];

  const recencyFilters = [
    { key: undefined, label: 'All Time' },
    { key: 'active_today', label: '⚡ Active Today (24h)' },
    { key: 'active_7d', label: '📅 Active in 7 Days' },
    { key: 'has_events', label: '🎯 Has Recorded Events' },
  ];

  const intentFilters = [
    { key: undefined, label: 'All Visitors' },
    { key: 'waitlist', label: '👑 VIP Waitlist Intent' },
    { key: 'shares', label: '📲 Viral Pass / Cart Shares' },
  ];

  const timeBands = [
    { label: 'All Day', hour: undefined },
    { label: '🌅 Morning (07-11)', hour: '9' },
    { label: '☀️ Noon (12-16)', hour: '12' },
    { label: '🌆 Evening (17-21)', hour: '19' },
    { label: '🌙 Night (22-06)', hour: '23' },
  ];

  const commonSignals = [
    { key: undefined, label: 'All Signal Types' },
    { key: 'waitlist_join_clicked', label: 'waitlist_join_clicked' },
    { key: 'scroll_milestone', label: 'scroll_milestone' },
    { key: 'social_link_clicked', label: 'social_link_clicked' },
    { key: 'hero_video_action', label: 'hero_video_action' },
    { key: 'session_start', label: 'session_start' },
  ];

  const hasAnyFilter =
    selectedPlatform !== 'all' ||
    Boolean(activeFilter) ||
    Boolean(activeSignal) ||
    activeHour !== undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.modalRoot}>
        {/* Backdrop Tap to Dismiss */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={styles.backdropPressable} onPress={handleClose} />
        </Animated.View>

        {/* Sliding Left Sheet */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              width: DRAWER_WIDTH,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* ── Sheet Header ── */}
          <XStack
            justifyContent="space-between"
            alignItems="center"
            paddingHorizontal="$4"
            paddingBottom="$3"
            borderBottomWidth={1}
            borderBottomColor="#1F2937"
          >
            <XStack alignItems="center" gap="$2.5">
              <View style={styles.headerIconCircle}>
                <LuFilter size={18} color="#10B981" />
              </View>
              <YStack>
                <Text fontSize={16} fontWeight="700" color="#FFFFFF">
                  Fleet Filters
                </Text>
                <Text fontSize={11} color="#9CA3AF">
                  Narrow down hardware records
                </Text>
              </YStack>
            </XStack>

            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <LuX size={18} color="#9CA3AF" />
            </Pressable>
          </XStack>

          {/* ── Scrollable Filter Options ── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* 1. Platform Filter */}
            <YStack gap="$2" marginBottom="$4">
              <Text style={styles.sectionTitle}>PLATFORM & CLIENT</Text>
              <XStack flexWrap="wrap" gap="$2">
                {platforms.map((p) => {
                  const active = selectedPlatform.toLowerCase() === p.key;
                  return (
                    <Pressable
                      key={p.key}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => onSelectPlatform(p.key)}
                    >
                      {active ? (
                        <LuCheck size={12} color="#2DD4BF" style={{ marginRight: 4 }} />
                      ) : null}
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </XStack>
            </YStack>

            {/* 2. Recency & Activity Window */}
            <YStack gap="$2" marginBottom="$4">
              <Text style={styles.sectionTitle}>RECENCY & ACTIVITY</Text>
              <YStack gap="$1.5">
                {recencyFilters.map((r) => {
                  const active = activeFilter === r.key;
                  return (
                    <Pressable
                      key={r.label}
                      style={[styles.radioRow, active && styles.radioRowActive]}
                      onPress={() => onSelectFilter(r.key)}
                    >
                      <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
                        {active ? <View style={styles.radioDot} /> : null}
                      </View>
                      <Text
                        style={[styles.radioLabel, active && styles.radioLabelActive]}
                      >
                        {r.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </YStack>
            </YStack>

            {/* 3. Conversion Intent */}
            <YStack gap="$2" marginBottom="$4">
              <Text style={styles.sectionTitle}>CONVERSION & INTENT</Text>
              <YStack gap="$1.5">
                {intentFilters.map((it) => {
                  const active = activeFilter === it.key;
                  return (
                    <Pressable
                      key={it.label}
                      style={[styles.radioRow, active && styles.radioRowActive]}
                      onPress={() => onSelectFilter(it.key)}
                    >
                      <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
                        {active ? <View style={styles.radioDot} /> : null}
                      </View>
                      <Text
                        style={[styles.radioLabel, active && styles.radioLabelActive]}
                      >
                        {it.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </YStack>
            </YStack>

            {/* 4. Peak Shopping Hour (IST) */}
            <YStack gap="$2" marginBottom="$4">
              <XStack justifyContent="space-between" alignItems="center">
                <Text style={styles.sectionTitle}>TIME OF DAY (IST)</Text>
                {activeHour !== undefined ? (
                  <Pressable onPress={() => onSelectHour(undefined)}>
                    <Text fontSize={10} color="#0D9488">
                      Clear Hour
                    </Text>
                  </Pressable>
                ) : null}
              </XStack>
              <XStack flexWrap="wrap" gap="$2">
                {timeBands.map((tb) => {
                  const active =
                    activeHour === tb.hour ||
                    (tb.hour === undefined && activeHour === undefined);
                  return (
                    <Pressable
                      key={tb.label}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => onSelectHour(tb.hour)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}
                      >
                        {tb.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </XStack>
            </YStack>

            {/* 5. Specific Signal Type */}
            <YStack gap="$2" marginBottom="$4">
              <Text style={styles.sectionTitle}>KEY SIGNAL TYPE</Text>
              <YStack gap="$1.5">
                {commonSignals.map((sig) => {
                  const active = activeSignal === sig.key;
                  return (
                    <Pressable
                      key={sig.label}
                      style={[styles.radioRow, active && styles.radioRowActive]}
                      onPress={() => onSelectSignal(sig.key)}
                    >
                      <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
                        {active ? <View style={styles.radioDot} /> : null}
                      </View>
                      <Text
                        style={[
                          styles.radioLabel,
                          active && styles.radioLabelActive,
                          sig.key && { fontFamily: 'monospace' as any, fontSize: 11 },
                        ]}
                        numberOfLines={1}
                      >
                        {sig.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </YStack>
            </YStack>
          </ScrollView>

          {/* ── Fixed Footer Actions ── */}
          <View style={styles.sheetFooter}>
            <XStack gap="$2.5" alignItems="center">
              {hasAnyFilter ? (
                <Pressable onPress={onResetAll} style={styles.resetBtn}>
                  <LuRotateCcw size={14} color="#9CA3AF" />
                  <Text fontSize={12} color="#9CA3AF" fontWeight="600" marginLeft="$1">
                    Reset
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={handleClose}
                style={[styles.applyBtn, !hasAnyFilter && { flex: 1 }]}
              >
                <Text fontSize={13} fontWeight="700" color="#FFFFFF">
                  Show {filteredCount} {filteredCount === 1 ? 'Device' : 'Devices'}
                </Text>
              </Pressable>
            </XStack>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    height: '100%',
    backgroundColor: '#0F172A',
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: 'rgba(13, 148, 136, 0.18)',
    borderColor: '#0D9488',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  filterChipTextActive: {
    color: '#2DD4BF',
    fontWeight: '700',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  radioRowActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioCircleActive: {
    borderColor: '#10B981',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  radioLabel: {
    fontSize: 13,
    color: '#CBD5E1',
    flex: 1,
  },
  radioLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sheetFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  applyBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0D9488',
  },
});

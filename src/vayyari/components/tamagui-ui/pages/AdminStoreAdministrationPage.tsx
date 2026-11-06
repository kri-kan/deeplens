import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  LuArrowLeft,
  LuRefreshCw,
  LuMonitor,
  LuSmartphone,
  LuStore,
  LuSparkles,
} from '../icons/lu';
import { useTheme } from '@/theme';
import { DeviceFleetStats } from '@/services/storeAdminService';

export interface AdminStoreAdministrationPageProps {
  stats?: DeviceFleetStats | null;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack?: () => void;
  onNavigateToDevices?: () => void;
  onNavigateToDevicesList?: () => void;
  onNavigateToInventory?: () => void;
  onNavigateToPublish?: () => void;
  onNavigateToConfiguration?: () => void;
  disableSafeArea?: boolean;
}

export const AdminStoreAdministrationPage: React.FC<AdminStoreAdministrationPageProps> = ({
  stats = null,
  loading = false,
  refreshing = false,
  onRefresh,
  onBack,
  onNavigateToDevices,
  onNavigateToDevicesList,
  onNavigateToInventory,
  onNavigateToPublish,
  onNavigateToConfiguration,
  disableSafeArea = false,
}) => {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  const totalDevices = stats?.totalDevices ?? 0;
  const androidCount = stats?.platformBreakdown?.['android'] ?? 0;
  const iosCount = stats?.platformBreakdown?.['ios'] ?? 0;
  const webCount = stats?.platformBreakdown?.['web'] ?? 0;
  const activeToday = stats?.activeToday ?? 0;

  // Edge-to-right swipe-back gesture (< 60px from left edge)
  const edgeSwipeBackGesture = Gesture.Pan()
    .activeOffsetX(25)
    .failOffsetY([-25, 25])
    .hitSlop({ left: 0, width: 60 })
    .cancelsTouchesInView(false)
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX > 45 || e.velocityX > 300) {
        if (onBack) onBack();
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
        if (onBack) onBack();
      }
    });

  return (
    <GestureDetector gesture={edgeSwipeBackGesture}>
      <View style={[styles.container, { backgroundColor: tokens.background, paddingTop: topInset }]}>
        {/* ── Top App Bar ── */}
        <GestureDetector gesture={headerSwipeBackGesture}>
          <XStack
            justifyContent="space-between"
            alignItems="center"
            paddingHorizontal="$4"
            paddingVertical="$3"
            backgroundColor={tokens.surface}
            borderBottomWidth={1}
            borderBottomColor={tokens.border}
          >
            <XStack alignItems="center" gap="$3">
              {onBack ? (
                <Pressable
                  onPress={onBack}
                  accessibilityRole="button"
                  accessibilityLabel="Navigate back"
                  style={({ pressed }) => [
                    styles.iconButton,
                    { backgroundColor: pressed ? tokens.surfaceRaised : 'transparent' },
                  ]}
                >
                  <LuArrowLeft size={20} color={tokens.text} />
                </Pressable>
              ) : null}
              <YStack>
                <Text fontSize={17} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
                  Storefront Administration
                </Text>
                <Text fontSize={11} color={tokens.textMuted}>
                  Fleet telemetry, devices &amp; store operational governance
                </Text>
              </YStack>
            </XStack>

        <XStack alignItems="center" gap="$2">
          {onRefresh ? (
            <Pressable
              onPress={onRefresh}
              disabled={refreshing || loading}
              accessibilityRole="button"
              accessibilityLabel="Refresh administration telemetry"
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: pressed ? tokens.surfaceRaised : 'transparent' },
                refreshing && styles.iconButtonDisabled,
              ]}
            >
              <LuRefreshCw size={18} color={refreshing ? tokens.textMuted : tokens.accent} />
            </Pressable>
          ) : null}
        </XStack>
      </XStack>
    </GestureDetector>

      {/* ── Main Scrollable Body ── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + bottomInset }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={tokens.accent}
              colors={[tokens.accent]}
            />
          ) : undefined
        }
      >
        {/* ── Section: Operational Storefront Quick Links ── */}
        <YStack gap="$3">
          <XStack alignItems="center" gap="$2" paddingHorizontal="$1">
            <LuStore size={15} color={tokens.textMuted} />
            <Text fontSize={12} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.8}>
              Related Storefront Operations
            </Text>
          </XStack>

          <XStack gap="$3">
            {/* Storefront Inventory */}
            <Pressable
              onPress={onNavigateToInventory}
              accessibilityRole="button"
              accessibilityLabel="Navigate to Storefront Inventory"
              style={({ pressed }) => [
                styles.quickTile,
                {
                  backgroundColor: tokens.surface,
                  borderColor: pressed ? '#0D9488' : tokens.border,
                },
              ]}
            >
              <View style={[styles.smallIconCircle, { backgroundColor: '#0D948820' }]}>
                <LuStore size={20} color="#0D9488" />
              </View>
              <YStack gap="$0.5">
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  Storefront
                </Text>
                <Text fontSize={10.5} color={tokens.textMuted} numberOfLines={1}>
                  Live inventory &amp; SKUs
                </Text>
              </YStack>
            </Pressable>

            {/* Publish Batch */}
            <Pressable
              onPress={onNavigateToPublish}
              accessibilityRole="button"
              accessibilityLabel="Navigate to Publish Batch"
              style={({ pressed }) => [
                styles.quickTile,
                {
                  backgroundColor: tokens.surface,
                  borderColor: pressed ? '#8B5CF6' : tokens.border,
                },
              ]}
            >
              <View style={[styles.smallIconCircle, { backgroundColor: '#8B5CF620' }]}>
                <LuSparkles size={20} color="#8B5CF6" />
              </View>
              <YStack gap="$0.5">
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  Publish Batch
                </Text>
                <Text fontSize={10.5} color={tokens.textMuted} numberOfLines={1}>
                  Batch curate &amp; publish
                </Text>
              </YStack>
            </Pressable>

            {/* Store Configuration Studio */}
            <Pressable
              onPress={onNavigateToConfiguration}
              accessibilityRole="button"
              accessibilityLabel="Navigate to Store Configuration Studio"
              style={({ pressed }) => [
                styles.quickTile,
                {
                  backgroundColor: tokens.surface,
                  borderColor: pressed ? '#F59E0B' : tokens.border,
                },
              ]}
            >
              <View style={[styles.smallIconCircle, { backgroundColor: '#F59E0B20' }]}>
                <LuSparkles size={20} color="#F59E0B" />
              </View>
              <YStack gap="$0.5">
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  Studio
                </Text>
                <Text fontSize={10.5} color={tokens.textMuted} numberOfLines={1}>
                  PDP A/B Experiments
                </Text>
              </YStack>
            </Pressable>
          </XStack>
        </YStack>

        {/* ── Live Fleet Telemetry KPI Header Strip ── */}
        <YStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.lg}
          borderWidth={1}
          borderColor={tokens.border}
          padding="$4"
          gap="$3"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap="$2">
              <View style={[styles.pulseDot, { backgroundColor: '#10B981' }]} />
              <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.8}>
                Hardware &amp; Telemetry Status
              </Text>
            </XStack>
            <XStack
              backgroundColor={tokens.surfaceRaised}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius={tokens.radius.full}
            >
              <Text fontSize={10} fontWeight="700" color={tokens.accent}>
                Active Signal Sync
              </Text>
            </XStack>
          </XStack>

          <XStack justifyContent="space-between" alignItems="center" gap="$2">
            <YStack flex={1}>
              <Text fontSize={24} fontWeight="900" color={tokens.text} letterSpacing={-0.5}>
                {loading && !stats ? '...' : totalDevices}
              </Text>
              <Text fontSize={11} color={tokens.textMuted}>
                Total Registered Devices
              </Text>
            </YStack>

            <View style={[styles.kpiDivider, { backgroundColor: tokens.border }]} />

            <YStack flex={1}>
              <Text fontSize={24} fontWeight="900" color="#10B981" letterSpacing={-0.5}>
                {loading && !stats ? '...' : activeToday}
              </Text>
              <Text fontSize={11} color={tokens.textMuted}>
                Active Today
              </Text>
            </YStack>

            <View style={[styles.kpiDivider, { backgroundColor: tokens.border }]} />

            <YStack flex={1}>
              <Text fontSize={13} fontWeight="700" color={tokens.text}>
                {androidCount}A • {iosCount}i • {webCount}W
              </Text>
              <Text fontSize={11} color={tokens.textMuted}>
                Platform Breakdown
              </Text>
            </YStack>
          </XStack>
        </YStack>

        {/* ── Section: Fleet & Devices Administration ── */}
        <YStack gap="$3">
          <XStack alignItems="center" gap="$2" paddingHorizontal="$1">
            <LuMonitor size={15} color="#06B6D4" />
            <Text fontSize={12} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.8}>
              Fleet &amp; Devices
            </Text>
          </XStack>

          <XStack gap="$3">
            {/* Fleet & Devices Intelligence */}
            <Pressable
              onPress={onNavigateToDevices}
              accessibilityRole="button"
              accessibilityLabel="Open Fleet and Devices Intelligence"
              style={({ pressed }) => [
                styles.quickTile,
                {
                  backgroundColor: tokens.surface,
                  borderColor: pressed ? '#06B6D4' : tokens.border,
                },
              ]}
            >
              <View style={[styles.smallIconCircle, { backgroundColor: '#06B6D420' }]}>
                <LuMonitor size={20} color="#06B6D4" />
              </View>
              <YStack gap="$0.5">
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  Fleet &amp; Devices
                </Text>
                <Text fontSize={10.5} color={tokens.textMuted} numberOfLines={1}>
                  Live telemetry &amp; charts
                </Text>
              </YStack>
            </Pressable>

            {/* Hardware Fleet Directory */}
            <Pressable
              onPress={onNavigateToDevicesList}
              accessibilityRole="button"
              accessibilityLabel="Browse Hardware Fleet Directory"
              style={({ pressed }) => [
                styles.quickTile,
                {
                  backgroundColor: tokens.surface,
                  borderColor: pressed ? '#10B981' : tokens.border,
                },
              ]}
            >
              <View style={[styles.smallIconCircle, { backgroundColor: '#10B98120' }]}>
                <LuSmartphone size={20} color="#10B981" />
              </View>
              <YStack gap="$0.5">
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  Hardware Directory
                </Text>
                <Text fontSize={10.5} color={tokens.textMuted} numberOfLines={1}>
                  Device profiles &amp; filters
                </Text>
              </YStack>
            </Pressable>
          </XStack>
        </YStack>
      </ScrollView>
    </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  kpiDivider: {
    width: 1,
    height: 28,
  },
  quickTile: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  smallIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

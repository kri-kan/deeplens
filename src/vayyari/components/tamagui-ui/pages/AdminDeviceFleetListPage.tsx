import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuRefreshCw,
  LuSearch,
  LuMonitor,
  LuX,
  LuFilter,
  LuSlidersHorizontal,
} from '../icons/lu';
import { StoreDeviceItem } from '@/services/storeAdminService';
import { DeviceFleetCard } from '../molecules/DeviceFleetCard/DeviceFleetCard';
import { DeviceJourneyDrawer } from '../organisms/DeviceJourneyDrawer/DeviceJourneyDrawer';
import { DeviceFleetFilterSheet } from '../organisms/DeviceFleetFilterSheet/DeviceFleetFilterSheet';

export interface AdminDeviceFleetListPageProps {
  devices: StoreDeviceItem[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onBack?: () => void;
  initialPlatform?: string;
  initialFilter?: string;
  initialSignal?: string;
  initialHour?: string | number;
  onSelectDevice?: (device: StoreDeviceItem) => void;
  selectedDeviceId?: string | null;
  selectedDevice?: StoreDeviceItem | null;
  onCloseDeviceDrawer?: () => void;
}

export const AdminDeviceFleetListPage: React.FC<AdminDeviceFleetListPageProps> = ({
  devices,
  loading = false,
  refreshing = false,
  onRefresh,
  onBack,
  initialPlatform = 'all',
  initialFilter,
  initialSignal,
  initialHour,
  onSelectDevice,
  selectedDeviceId = null,
  selectedDevice = null,
  onCloseDeviceDrawer,
}) => {
  const insets = useSafeAreaInsets();
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    initialPlatform ? initialPlatform.toLowerCase() : 'all'
  );
  const [activeFilter, setActiveFilter] = useState<string | undefined>(initialFilter);
  const [activeSignal, setActiveSignal] = useState<string | undefined>(initialSignal);
  const [activeHour, setActiveHour] = useState<string | number | undefined>(initialHour);

  // Clear all filters back to default
  const handleClearFilters = () => {
    setSelectedPlatform('all');
    setActiveFilter(undefined);
    setActiveSignal(undefined);
    setActiveHour(undefined);
    setSearchQuery('');
  };

  const hasActiveFilter =
    selectedPlatform !== 'all' ||
    Boolean(activeFilter) ||
    Boolean(activeSignal) ||
    activeHour !== undefined;

  let activeFiltersCount = 0;
  if (selectedPlatform !== 'all') activeFiltersCount++;
  if (activeFilter) activeFiltersCount++;
  if (activeSignal) activeFiltersCount++;
  if (activeHour !== undefined && activeHour !== '') activeFiltersCount++;

  // Filter device items based on platform, special filter, hour, signal, and search query
  const filteredDevices = useMemo(() => {
    const now = Date.now();

    return devices.filter((d) => {
      // 1. Platform
      if (selectedPlatform !== 'all') {
        if (d.platform.toLowerCase() !== selectedPlatform.toLowerCase()) {
          return false;
        }
      }

      // 2. Special Filter Category
      if (activeFilter) {
        const lastSeen = new Date(d.lastSeenAt).getTime();
        const diffHours = (now - lastSeen) / (1000 * 60 * 60);

        if (activeFilter === 'active_today' && diffHours > 24) {
          return false;
        }
        if (activeFilter === 'active_7d' && diffHours > 24 * 7) {
          return false;
        }
        if (activeFilter === 'has_events' && (d.totalEvents || 0) <= 0) {
          return false;
        }
      }

      // 3. Hour (IST)
      if (activeHour !== undefined && activeHour !== '') {
        try {
          const istHour = new Date(d.lastSeenAt).toLocaleTimeString('en-US', {
            timeZone: 'Asia/Kolkata',
            hour12: false,
            hour: '2-digit',
          });
          if (parseInt(istHour, 10) !== parseInt(String(activeHour), 10)) {
            return false;
          }
        } catch {}
      }

      // 4. Search query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesSearch =
          d.deviceId.toLowerCase().includes(q) ||
          (d.model || '').toLowerCase().includes(q) ||
          (d.os || '').toLowerCase().includes(q) ||
          (d.browser || '').toLowerCase().includes(q) ||
          (d.lastIp || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [devices, selectedPlatform, activeFilter, activeHour, searchQuery]);

  // Human-readable description of current filter
  const getFilterBadgeLabel = () => {
    if (activeFilter === 'active_today') return 'Active in Last 24 Hours';
    if (activeFilter === 'active_7d') return 'Active in Last 7 Days';
    if (activeFilter === 'has_events') return 'Has Recorded Touchpoints';
    if (activeFilter === 'waitlist') return 'VIP Waitlist Shoppers';
    if (activeFilter === 'shares') return 'Viral Pass Sharers';
    if (activeSignal) return `Signal: ${activeSignal}`;
    if (activeHour !== undefined && activeHour !== '') return `Time of Day: ${activeHour}:00 IST`;
    if (selectedPlatform !== 'all') return `Platform: ${selectedPlatform.toUpperCase()}`;
    return null;
  };

  const filterBadgeLabel = getFilterBadgeLabel();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Top App Bar ── */}
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
              Hardware Fleet Directory
            </Text>
            <Text fontSize={11} color="#9CA3AF">
              {filteredDevices.length} of {devices.length} registered devices
            </Text>
          </YStack>
        </XStack>

        <XStack alignItems="center" gap="$2">
          {/* Left Sheet Filter Trigger */}
          <Pressable
            onPress={() => setIsFilterSheetOpen(true)}
            style={[
              styles.filterTriggerBtn,
              hasActiveFilter && styles.filterTriggerBtnActive,
            ]}
          >
            <LuFilter size={15} color={hasActiveFilter ? '#10B981' : '#E5E7EB'} />
            <Text
              fontSize={12}
              fontWeight="600"
              color={hasActiveFilter ? '#10B981' : '#E5E7EB'}
              marginLeft="$1.5"
            >
              Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
            </Text>
            {hasActiveFilter ? <View style={styles.filterDot} /> : null}
          </Pressable>

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
        {/* Active Filter Pill / Banner */}
        {hasActiveFilter ? (
          <View style={styles.activeFilterBanner}>
            <XStack justifyContent="space-between" alignItems="center">
              <Pressable
                onPress={() => setIsFilterSheetOpen(true)}
                style={styles.activeFilterLabelContainer}
              >
                <LuFilter size={14} color="#10B981" />
                <Text
                  fontSize={12}
                  fontWeight="600"
                  color="#E5E7EB"
                  numberOfLines={1}
                  marginLeft="$1.5"
                >
                  {filterBadgeLabel || `${activeFiltersCount} filters active`}
                </Text>
                <Text fontSize={10} color="#0D9488" marginLeft="$2">
                  (Edit in sheet &rarr;)
                </Text>
              </Pressable>

              <Pressable onPress={handleClearFilters} style={styles.clearFilterBtn}>
                <LuX size={12} color="#9CA3AF" />
                <Text fontSize={11} color="#9CA3AF" fontWeight="600" marginLeft="$1">
                  Clear
                </Text>
              </Pressable>
            </XStack>
          </View>
        ) : null}

        {/* Search Bar + Quick Filter Shortcut */}
        <XStack alignItems="center" gap="$2" marginTop="$2.5">
          <XStack alignItems="center" style={styles.searchBar} gap="$2" flex={1}>
            <LuSearch size={16} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search device ID, model, OS, IP..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <LuX size={14} color="#9CA3AF" />
              </Pressable>
            ) : null}
          </XStack>

          <Pressable
            onPress={() => setIsFilterSheetOpen(true)}
            style={[
              styles.quickFilterIconBtn,
              hasActiveFilter && styles.quickFilterIconBtnActive,
            ]}
          >
            <LuFilter size={18} color={hasActiveFilter ? '#10B981' : '#9CA3AF'} />
            {hasActiveFilter ? <View style={styles.badgeDot} /> : null}
          </Pressable>
        </XStack>

        {/* Platform Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {['all', 'pwa', 'android', 'web', 'ios'].map((p) => {
            const active = selectedPlatform.toLowerCase() === p;
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

        {/* List of Device Cards */}
        <YStack marginVertical="$2" gap="$2">
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 40 }} />
          ) : filteredDevices.length === 0 ? (
            <View style={styles.emptyState}>
              <LuMonitor size={44} color="#4B5563" />
              <Text fontSize={14} fontWeight="600" color="#9CA3AF" marginTop="$2">
                No matching devices found
              </Text>
              <Text fontSize={11} color="#6B7280" marginTop="$1">
                Try clearing search query or adjusting your filters.
              </Text>
              {hasActiveFilter ? (
                <Pressable onPress={handleClearFilters} style={styles.resetBtn}>
                  <Text fontSize={12} fontWeight="700" color="#10B981">
                    Reset All Filters
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            filteredDevices.map((device) => (
              <DeviceFleetCard
                key={device.deviceId}
                device={device}
                onSelect={onSelectDevice}
              />
            ))
          )}
        </YStack>
      </ScrollView>

      {/* ── Slide-in Left Filter Sheet Organism ── */}
      <DeviceFleetFilterSheet
        visible={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        selectedPlatform={selectedPlatform}
        onSelectPlatform={setSelectedPlatform}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        activeSignal={activeSignal}
        onSelectSignal={setActiveSignal}
        activeHour={activeHour}
        onSelectHour={setActiveHour}
        totalDevicesCount={devices.length}
        filteredCount={filteredDevices.length}
        onResetAll={handleClearFilters}
      />

      {/* User-Level Journey Drill-Down Drawer Modal (Last 30 Days) */}
      <DeviceJourneyDrawer
        deviceId={selectedDeviceId}
        device={selectedDevice}
        visible={Boolean(selectedDeviceId)}
        onClose={onCloseDeviceDrawer || (() => {})}
      />
    </View>
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
  filterTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  filterTriggerBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginLeft: 6,
  },
  activeFilterBanner: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activeFilterLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1F2937',
  },
  searchBar: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  quickFilterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  quickFilterIconBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  badgeDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  filterRow: {
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  filterChipActive: {
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    borderColor: '#0D9488',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  filterChipTextActive: {
    color: '#2DD4BF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginTop: 12,
  },
  resetBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
});

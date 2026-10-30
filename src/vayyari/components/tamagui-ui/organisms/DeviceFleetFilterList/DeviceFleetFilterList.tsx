import React from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { LuSearch, LuMonitor } from '../../icons/lu';
import { StoreDeviceItem } from '@/services/storeAdminService';
import { DeviceFleetCard } from '../../molecules/DeviceFleetCard/DeviceFleetCard';

export interface DeviceFleetFilterListProps {
  devices: StoreDeviceItem[];
  selectedPlatform: string;
  onSelectPlatform: (platform: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loading?: boolean;
  refreshing?: boolean;
  onSelectDevice?: (device: StoreDeviceItem) => void;
}

export const DeviceFleetFilterList: React.FC<DeviceFleetFilterListProps> = ({
  devices,
  selectedPlatform,
  onSelectPlatform,
  searchQuery,
  onSearchChange,
  loading = false,
  refreshing = false,
  onSelectDevice,
}) => {
  const filteredDevices = devices.filter((d) => {
    const matchesPlatform =
      selectedPlatform === 'all' ||
      d.platform.toLowerCase() === selectedPlatform.toLowerCase();

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesPlatform;

    const matchesSearch =
      d.deviceId.toLowerCase().includes(q) ||
      (d.model || '').toLowerCase().includes(q) ||
      (d.os || '').toLowerCase().includes(q) ||
      (d.browser || '').toLowerCase().includes(q) ||
      (d.lastIp || '').toLowerCase().includes(q);

    return matchesPlatform && matchesSearch;
  });

  return (
    <YStack gap="$2.5">
      {/* Search Input Bar */}
      <XStack alignItems="center" style={styles.searchBar} gap="$2">
        <LuSearch size={16} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by device ID, model, OS, IP..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={onSearchChange}
        />
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
              onPress={() => onSelectPlatform(p)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {p.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Device Cards List */}
      <YStack marginVertical="$1">
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 40 }} />
        ) : filteredDevices.length === 0 ? (
          <View style={styles.emptyState}>
            <LuMonitor size={44} color="#4B5563" />
            <Text fontSize={14} fontWeight="600" color="#9CA3AF" marginTop="$2">
              No devices found
            </Text>
            <Text fontSize={11} color="#6B7280" marginTop="$1">
              Browse on the Store App or PWA to register active hardware.
            </Text>
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
    </YStack>
  );
};

const styles = StyleSheet.create({
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
    color: '#FFFFFF',
    fontSize: 13,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
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
    paddingVertical: 50,
  },
});

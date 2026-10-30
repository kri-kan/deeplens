import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { XStack, YStack, Text } from 'tamagui';
import { LuClock } from '../../icons/lu';
import { StoreDeviceItem } from '@/services/storeAdminService';
import { DevicePlatformBadge } from '../../atoms/DevicePlatformBadge/DevicePlatformBadge';
import { CopyIdChip } from '../../atoms/CopyIdChip/CopyIdChip';

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

export interface DeviceFleetCardProps {
  device: StoreDeviceItem;
  onSelect?: (device: StoreDeviceItem) => void;
}

export const DeviceFleetCard: React.FC<DeviceFleetCardProps> = ({
  device,
  onSelect,
}) => {
  const cleanIp = (device.lastIp || 'Unknown').replace('/128', '').replace('/32', '');

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onSelect?.(device)}
    >
      {/* Top card row: Platform Badge & Copy Chip */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
        <XStack alignItems="center" gap="$2" flex={1}>
          <DevicePlatformBadge platform={device.platform} />
          <CopyIdChip id={device.deviceId} />
        </XStack>
        <Text style={styles.timeAgo}>{timeAgo(device.lastSeenAt)}</Text>
      </XStack>

      {/* Model & OS specs */}
      <XStack justifyContent="space-between" alignItems="center" marginVertical="$1">
        <Text style={styles.modelText} numberOfLines={1}>
          📱 {device.model || 'Unknown Device'} &bull; {device.os || 'OS'}
        </Text>
        <Text style={styles.browserText} numberOfLines={1}>
          {device.browser || 'Browser'}
        </Text>
      </XStack>

      {/* Screen resolution & IP */}
      <XStack justifyContent="space-between" alignItems="center" marginVertical="$1">
        <Text style={styles.specText}>
          🖥️ {device.screenResolution || 'Resolution'}
        </Text>
        <Text style={styles.ipText}>
          🌐 {cleanIp}
        </Text>
      </XStack>

      {/* Bottom meta row: Total Signals & IST Timestamp */}
      <XStack
        justifyContent="space-between"
        alignItems="center"
        paddingTop="$2"
        marginTop="$2"
        borderTopWidth={1}
        borderTopColor="#1F2937"
      >
        <XStack alignItems="center" gap="$1.5">
          <LuClock size={12} color="#9CA3AF" />
          <Text style={styles.istTimestamp}>
            {formatIST(device.lastSeenAt)}
          </Text>
        </XStack>

        <View style={styles.eventPill}>
          <Text style={styles.eventPillText}>
            ⚡ {device.totalEvents} {device.totalEvents === 1 ? 'signal' : 'signals'}
          </Text>
        </View>
      </XStack>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    marginVertical: 4,
  },
  cardPressed: {
    borderColor: '#374151',
    backgroundColor: '#161F30',
  },
  timeAgo: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  modelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F9FAFB',
    flex: 1,
  },
  browserText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  specText: {
    fontSize: 11,
    color: '#6B7280',
  },
  ipText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#9CA3AF',
  },
  istTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  eventPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  eventPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
});

import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { XStack, Text } from 'tamagui';
import { LuClock, LuCheck, LuBan, LuStar } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { ChannelSharingQueueItem } from '../post-planner.types';

export interface PostSharingQueueTileProps {
  item: ChannelSharingQueueItem;
  onPress?: (item: ChannelSharingQueueItem) => void;
}

export function PostSharingQueueTile({
  item,
  onPress,
}: PostSharingQueueTileProps) {
  const { tokens } = useTheme();

  const getStatusBadgeConfig = () => {
    switch (item.status) {
      case 'scheduled':
        return {
          bg: '#D97706',
          icon: <LuClock size={10} color="#FFFFFF" />,
          label: item.scheduledTimeLabel || 'Scheduled',
        };
      case 'shared':
        return {
          bg: '#16A34A',
          icon: <LuCheck size={10} color="#FFFFFF" />,
          label: item.scheduledTimeLabel || 'Shared',
        };
      case 'excluded':
        return {
          bg: '#6B7280',
          icon: <LuBan size={10} color="#FFFFFF" />,
          label: 'Excluded',
        };
      case 'assigned':
      default:
        return {
          bg: tokens.accent,
          icon: null,
          label: 'Ready',
        };
    }
  };

  const badge = getStatusBadgeConfig();

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`${item.productCode} - ${item.status}`}
    >
      {/* Garment Image */}
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.tileImage} resizeMode="cover" />
      ) : (
        <View style={[styles.tileImage, { backgroundColor: tokens.surfaceRaised }]} />
      )}

      {/* Top-Left Star Badge Overlay */}
      <View style={styles.starOverlayBadge}>
        <LuStar size={11} color="#D97706" fill="#D97706" />
      </View>

      {/* Top-Right Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
        <XStack alignItems="center" gap={3}>
          {badge.icon}
          <Text fontSize={9} fontWeight="800" color="#FFFFFF">
            {badge.label}
          </Text>
        </XStack>
      </View>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <Text fontSize={10} fontWeight="800" color="#FFFFFF" numberOfLines={1}>
          {item.productCode}
        </Text>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={11} fontWeight="800" color="#FDE047">
            ₹{item.price.toLocaleString('en-IN')}
          </Text>
          <Text fontSize={8} fontWeight="700" color="rgba(255,255,255,0.85)">
            {item.category}
          </Text>
        </XStack>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: '33.333%',
    aspectRatio: 0.82,
    margin: 2,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  starOverlayBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  statusBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    gap: 1,
  },
});

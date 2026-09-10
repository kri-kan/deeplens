import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuStar, LuCheck } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { PlannedProductInfo } from '../post-planner.types';

export interface PostPlannerProductTileProps {
  item: PlannedProductInfo;
  onPress?: (item: PlannedProductInfo) => void;
}

export function PostPlannerProductTile({
  item,
  onPress,
}: PostPlannerProductTileProps) {
  const { tokens } = useTheme();
  const isComplete = item.planningStatus === 'complete';
  const assignedCount = item.assignedChannelIds?.length || 0;

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`${item.productCode} - ₹${item.price.toLocaleString('en-IN')}`}
    >
      {/* Product Image */}
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.tileImage} resizeMode="cover" />
      ) : (
        <View style={[styles.tileImage, { backgroundColor: tokens.surfaceRaised }]} />
      )}

      {/* Top-Left Star Badge Overlay */}
      <View style={styles.starOverlayBadge}>
        <LuStar size={11} color="#D97706" fill="#D97706" />
      </View>

      {/* Top-Right Allocation Status Badge */}
      <View
        style={[
          styles.statusOverlayBadge,
          {
            backgroundColor: isComplete
              ? 'rgba(22, 101, 52, 0.90)'
              : assignedCount > 0
              ? 'rgba(180, 83, 9, 0.90)'
              : 'rgba(0, 0, 0, 0.65)',
          },
        ]}
      >
        <XStack alignItems="center" gap={3}>
          {isComplete && <LuCheck size={9} color="#FFFFFF" />}
          <Text fontSize={9} fontWeight="800" color="#FFFFFF">
            {isComplete
              ? `${assignedCount} Ch`
              : assignedCount > 0
              ? `${assignedCount} Draft`
              : 'Unassigned'}
          </Text>
        </XStack>
      </View>

      {/* Bottom Gradient Data Bar */}
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
  statusOverlayBadge: {
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

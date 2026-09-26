import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Text, XStack, YStack } from 'tamagui';
import { LuCamera, LuStar } from '../../icons/lu';
import { useTheme } from '@/theme';
import { getSearchApiUrl } from '@/utils/api-config';
import type {
  PostPlannerItem,
  PostPlannerChannelAssignment,
} from '@/services/instagram.service';

export interface PostPlannerMediaTileProps {
  item: PostPlannerItem;
  onPress: (item: PostPlannerItem) => void;
  getChannelColor?: (username: string) => string;
  showChannelAvatars?: boolean;
  borderStatus?: 'curated' | 'pending' | 'posted' | 'scheduled';
  borderColor?: string;
}

const DEFAULT_CHANNEL_COLORS: Record<string, string> = {
  vayyari_fashions: '#D97706',
  theblouseedition: '#7C3AED',
  dressbyvayyari: '#2563EB',
  vayyari_littles: '#DB2777',
  vayyari_prive: '#4F46E5',
  everydayvayyari: '#059669',
  vayyariplusyou: '#DC2626',
  eclipsevayyari: '#475569',
  vayyari_lifestyle: '#0891B2',
  vayyaristore: '#9333EA',
};

const defaultGetColor = (username: string): string => {
  const clean = username.replace(/^@/, '').toLowerCase().trim();
  if (DEFAULT_CHANNEL_COLORS[clean]) return DEFAULT_CHANNEL_COLORS[clean];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 45%)`;
};

export const PostPlannerMediaTile = React.memo(function PostPlannerMediaTile({
  item,
  onPress,
  getChannelColor = defaultGetColor,
  showChannelAvatars = true,
  borderStatus,
  borderColor,
}: PostPlannerMediaTileProps) {
  const { tokens } = useTheme();

  const isCurated = item.planningStatus === 'complete';
  const assignedChannels = useMemo(() => {
    return (item.channelAssignments || []).filter((a: PostPlannerChannelAssignment) => a.status !== 'excluded');
  }, [item.channelAssignments]);

  const imageUri = useMemo(() => {
    if (!item.primaryImageUrl) return null;
    if (item.primaryImageUrl.startsWith('http://') || item.primaryImageUrl.startsWith('https://')) {
      return item.primaryImageUrl;
    }
    const baseUrl = getSearchApiUrl() || '';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    if (item.primaryImageUrl.startsWith('/')) {
      return `${cleanBaseUrl}${item.primaryImageUrl}`;
    }
    return `${cleanBaseUrl}/api/v1/Attachment/download?path=${encodeURIComponent(item.primaryImageUrl)}`;
  }, [item.primaryImageUrl]);

  const resolvedBorderColor = useMemo(() => {
    if (borderColor) return borderColor;
    if (borderStatus) {
      switch (borderStatus) {
        case 'curated':
        case 'posted':
          return '#10B981';
        case 'scheduled':
          return '#3B82F6';
        case 'pending':
        default:
          return '#F59E0B';
      }
    }
    return isCurated ? '#10B981' : '#F59E0B';
  }, [borderColor, borderStatus, isCurated]);

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.tileContainer,
        { borderColor: resolvedBorderColor },
        pressed && styles.tilePressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Product ${item.productCode}, ${item.title}, Price ₹${item.price}`}
    >
      {/* 1:1 Square Image Container */}
      <View style={styles.imageWrapper}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.tileImage}
            contentFit="cover"
            recyclingKey={item.productId}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.tileImagePlaceholder}>
            <LuCamera size={24} color="#9CA3AF" />
          </View>
        )}

        {/* Top-Left: Star Badge */}
        {item.isStarred && (
          <View style={styles.starBadge}>
            <LuStar size={10} color="#F59E0B" />
          </View>
        )}

        {/* Bottom-Left: Media Count Pill */}
        {(item.mediaCount ?? 0) > 0 && (
          <View style={styles.mediaCountBadge}>
            <LuCamera size={9} color="#FFFFFF" />
            <Text fontSize={9} fontWeight="700" color="#FFFFFF">
              {item.mediaCount}
            </Text>
          </View>
        )}

        {/* Bottom-Right: Overlapping Channel Heads */}
        {showChannelAvatars && assignedChannels.length > 0 && (
          <View style={styles.channelAvatarsRow}>
            {assignedChannels.slice(0, 3).map((a: PostPlannerChannelAssignment, idx: number) => {
              const color = getChannelColor(a.username);
              const initials = (a.username || '').replace(/^@/, '').substring(0, 2).toUpperCase();
              return (
                <View
                  key={a.assignmentId || a.watchlistId || idx}
                  style={[
                    styles.miniChannelAvatar,
                    {
                      backgroundColor: color,
                      marginLeft: idx > 0 ? -6 : 0,
                      zIndex: 10 - idx,
                    },
                  ]}
                >
                  <Text fontSize={8} fontWeight="800" color="#FFFFFF">
                    {initials}
                  </Text>
                </View>
              );
            })}
            {assignedChannels.length > 3 && (
              <View style={[styles.miniChannelAvatar, styles.moreChannelsAvatar]}>
                <Text fontSize={8} fontWeight="800" color="#FFFFFF">
                  +{assignedChannels.length - 3}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Compact Information Base */}
      <YStack paddingHorizontal={6} paddingVertical={4} gap={1} backgroundColor="#FFFFFF">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={10} fontWeight="800" color="#1F2937" numberOfLines={1} style={{ flex: 1 }}>
            {item.productCode || 'ITEM'}
          </Text>
          <Text fontSize={11} fontWeight="900" color="#7E22CE">
            ₹{Number(item.price || 0).toLocaleString('en-IN')}
          </Text>
        </XStack>

        <Text fontSize={9} color="#6B7280" numberOfLines={1}>
          {item.title || item.category || 'Vayyari Item'}
        </Text>
      </YStack>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tileContainer: {
    flex: 1,
    maxWidth: '32.8%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 6,
  },
  tilePressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  starBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  mediaCountBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  channelAvatarsRow: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniChannelAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  moreChannelsAvatar: {
    backgroundColor: '#374151',
    marginLeft: -6,
    zIndex: 5,
  },
});

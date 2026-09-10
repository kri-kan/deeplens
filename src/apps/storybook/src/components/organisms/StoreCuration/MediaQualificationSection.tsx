import React, { useState } from 'react';
import { View, Pressable, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuCheck,
  LuX,
  LuVideo,
  LuImage,
  LuStar,
  LuSparkles,
  LuPlay,
  LuSquare,
  LuChevronUp,
  LuChevronDown,
  LuLayers,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { StoreCurationMediaItem, StoreColorGroup } from './types';

export interface MediaQualificationSectionProps {
  mediaList: StoreCurationMediaItem[];
  colorGroups: StoreColorGroup[];
  onToggleQualify: (id: string) => void;
  onToggleCommon: (id: string) => void;
  onSelectColorGroup: (mediaId: string, colorGroupId: string) => void;
  onSetHero: (id: string) => void;
  onMoveMedia: (index: number, direction: 'up' | 'down') => void;
  onApplySmartOrder: () => void;
}

export function MediaQualificationSection({
  mediaList,
  colorGroups,
  onToggleQualify,
  onToggleCommon,
  onSelectColorGroup,
  onSetHero,
  onMoveMedia,
  onApplySmartOrder,
}: MediaQualificationSectionProps) {
  const { tokens } = useTheme();
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [bufferingVideoId, setBufferingVideoId] = useState<string | null>(null);

  const qualifiedCount = mediaList.filter((m) => m.isQualified).length;
  const commonCount = mediaList.filter((m) => m.isQualified && m.isCommon).length;
  const videoCount = mediaList.filter((m) => m.mediaType === 'video').length;

  const handlePlayVideo = (mediaId: string) => {
    if (playingVideoId === mediaId) {
      setPlayingVideoId(null);
      return;
    }
    // Simulate smart lightweight buffering on play click
    setBufferingVideoId(mediaId);
    setTimeout(() => {
      setBufferingVideoId(null);
      setPlayingVideoId(mediaId);
    }, 700);
  };

  return (
    <YStack
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius.md}
      borderWidth={1}
      borderColor={tokens.border}
      padding={14}
      gap={12}
    >
      {/* Header & Qualification KPI metrics */}
      <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={8}>
        <YStack>
          <XStack alignItems="center" gap={6}>
            <LuLayers size={16} color={tokens.accent} />
            <Text fontSize={13} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
              Media Qualification &amp; Presentation Order
            </Text>
          </XStack>
          <Text fontSize={11} color={tokens.textMuted}>
            Qualify product visuals for Store PDP, assign to color groups or mark as universal common media.
          </Text>
        </YStack>

        <XStack gap={6} alignItems="center">
          <View style={[styles.kpiPill, { backgroundColor: `${tokens.accent}14` }]}>
            <Text fontSize={10} fontWeight="800" color={tokens.accent}>
              ✓ {qualifiedCount}/{mediaList.length} Qualified
            </Text>
          </View>
          <View style={[styles.kpiPill, { backgroundColor: '#F59E0B1A' }]}>
            <Text fontSize={10} fontWeight="800" color="#D97706">
              ★ {commonCount} Common
            </Text>
          </View>
          <View style={[styles.kpiPill, { backgroundColor: '#3B82F614' }]}>
            <Text fontSize={10} fontWeight="800" color="#2563EB">
              🎥 {videoCount} Videos
            </Text>
          </View>
        </XStack>
      </XStack>

      {/* Smart Dwell Reorder Action Banner */}
      <YStack
        backgroundColor={`${tokens.accent}0D`}
        borderRadius={8}
        borderWidth={1}
        borderColor={`${tokens.accent}30`}
        padding={10}
        gap={6}
      >
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" gap={6}>
            <LuSparkles size={14} color={tokens.accent} />
            <Text fontSize={11} fontWeight="800" color={tokens.accent}>
              Smart Engagement Reorder
            </Text>
          </XStack>
          <Pressable
            onPress={onApplySmartOrder}
            style={({ pressed }) => [
              styles.smartBtn,
              { backgroundColor: pressed ? tokens.accentSubtle : tokens.surface, borderColor: `${tokens.accent}60` },
            ]}
          >
            <Text fontSize={11} fontWeight="800" color={tokens.accent}>
              ✨ Auto-Apply Dwell Order
            </Text>
          </Pressable>
        </XStack>
        <Text fontSize={11} color={tokens.textSecondary}>
          Promotes high-dwell photos and videos to early carousel slots to maximize conversion.
        </Text>
      </YStack>

      {/* Media Cards List */}
      <YStack gap={10}>
        {mediaList.map((item, index) => {
          const isPlaying = playingVideoId === item.id;
          const isBuffering = bufferingVideoId === item.id;
          const assignedGroup = colorGroups.find((g) => g.id === item.colorGroupId);

          return (
            <YStack
              key={item.id}
              backgroundColor={item.isQualified ? tokens.surfaceRaised : `${tokens.surface}80`}
              borderRadius={tokens.radius.md}
              borderWidth={item.isHero ? 2 : 1}
              borderColor={item.isHero ? tokens.accent : item.isQualified ? tokens.border : `${tokens.border}80`}
              padding={10}
              gap={8}
              opacity={item.isQualified ? 1 : 0.65}
            >
              <XStack alignItems="center" justifyContent="space-between" gap={8}>
                {/* Left: Thumbnail & Badges */}
                <XStack alignItems="center" gap={10} flex={1}>
                  {/* Sort Order Badge */}
                  <View
                    style={[
                      styles.orderBadge,
                      {
                        backgroundColor: item.isHero
                          ? tokens.accent
                          : item.isQualified
                          ? tokens.surface
                          : '#ccc',
                      },
                    ]}
                  >
                    <Text
                      fontSize={11}
                      fontWeight="800"
                      color={item.isHero ? tokens.accentForeground : tokens.text}
                    >
                      {item.sortOrder}
                    </Text>
                  </View>

                  {/* Thumbnail / Video Preview Box */}
                  <View style={styles.thumbWrapper}>
                    <Image
                      source={{ uri: item.thumbnailUri || item.uri }}
                      style={styles.mediaThumb}
                      resizeMode="cover"
                    />

                    {item.mediaType === 'video' && (
                      <Pressable
                        onPress={() => handlePlayVideo(item.id)}
                        style={styles.playOverlayBtn}
                        accessibilityLabel="Play video preview"
                      >
                        {isBuffering ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : isPlaying ? (
                          <LuSquare size={14} color="#fff" />
                        ) : (
                          <LuPlay size={14} color="#fff" />
                        )}
                      </Pressable>
                    )}

                    <View style={styles.mediaTypeBadge}>
                      {item.mediaType === 'video' ? (
                        <XStack alignItems="center" gap={3}>
                          <LuVideo size={10} color="#fff" />
                          <Text fontSize={8} fontWeight="800" color="#fff">
                            {item.durationSeconds ? `0:${item.durationSeconds}` : 'VIDEO'}
                          </Text>
                        </XStack>
                      ) : (
                        <XStack alignItems="center" gap={3}>
                          <LuImage size={10} color="#fff" />
                          <Text fontSize={8} fontWeight="800" color="#fff">
                            PHOTO
                          </Text>
                        </XStack>
                      )}
                    </View>
                  </View>

                  {/* Info Column */}
                  <YStack flex={1} gap={3}>
                    <XStack alignItems="center" gap={5} flexWrap="wrap">
                      {item.isHero && (
                        <View style={styles.heroPill}>
                          <Text fontSize={9} fontWeight="800" color={tokens.accent}>
                            ★ COVER HERO
                          </Text>
                        </View>
                      )}
                      {item.isCommon && (
                        <View style={styles.commonPill}>
                          <Text fontSize={9} fontWeight="800" color="#B45309">
                            ★ COMMON (ALL COLORS)
                          </Text>
                        </View>
                      )}
                      {!item.isQualified && (
                        <View style={styles.disqualifiedPill}>
                          <Text fontSize={9} fontWeight="800" color="#DC2626">
                            ✕ EXCLUDED FROM STORE
                          </Text>
                        </View>
                      )}
                    </XStack>

                    <Text fontSize={12} fontWeight="700" color={tokens.text} numberOfLines={1}>
                      {item.title || `Media Asset #${item.sortOrder}`}
                    </Text>

                    {/* Detected Colors */}
                    {item.detectedColors && item.detectedColors.length > 0 && (
                      <XStack alignItems="center" gap={6}>
                        <Text fontSize={9} color={tokens.textMuted}>
                          Extracted:
                        </Text>
                        {item.detectedColors.map((c, cIdx) => (
                          <XStack key={cIdx} alignItems="center" gap={3}>
                            <View style={[styles.miniColorDot, { backgroundColor: c.hex }]} />
                            <Text fontSize={9} color={tokens.textMuted}>
                              {c.name} ({Math.round(c.percentage)}%)
                            </Text>
                          </XStack>
                        ))}
                      </XStack>
                    )}
                  </YStack>
                </XStack>

                {/* Right: Reorder & Make Hero */}
                <XStack alignItems="center" gap={4}>
                  {item.isQualified && !item.isHero && (
                    <Pressable
                      onPress={() => onSetHero(item.id)}
                      hitSlop={6}
                      style={styles.heroBtn}
                    >
                      <Text fontSize={10} fontWeight="700" color={tokens.accent}>
                        Make Hero
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={() => onMoveMedia(index, 'up')}
                    disabled={index === 0}
                    hitSlop={6}
                    style={[styles.arrowBtn, { opacity: index === 0 ? 0.3 : 1 }]}
                  >
                    <LuChevronUp size={14} color={tokens.text} />
                  </Pressable>

                  <Pressable
                    onPress={() => onMoveMedia(index, 'down')}
                    disabled={index === mediaList.length - 1}
                    hitSlop={6}
                    style={[styles.arrowBtn, { opacity: index === mediaList.length - 1 ? 0.3 : 1 }]}
                  >
                    <LuChevronDown size={14} color={tokens.text} />
                  </Pressable>
                </XStack>
              </XStack>

              {/* Video Active Buffering/Streaming Notification */}
              {isPlaying && (
                <View style={styles.activeVideoBanner}>
                  <XStack alignItems="center" justifyContent="space-between">
                    <XStack alignItems="center" gap={6}>
                      <View style={styles.livePulseDot} />
                      <Text fontSize={11} fontWeight="700" color="#10B981">
                        Active MP4 Stream Buffered ({item.rawVideoUrl ? 'MinIO /raw' : 'Local Stream'})
                      </Text>
                    </XStack>
                    <Pressable onPress={() => setPlayingVideoId(null)} hitSlop={6}>
                      <Text fontSize={10} fontWeight="800" color="#666">
                        Stop
                      </Text>
                    </Pressable>
                  </XStack>
                </View>
              )}

              {/* Bottom Action Strip: Qualify Toggle + Common Toggle + Color Group Selector */}
              <XStack
                borderTopWidth={1}
                borderTopColor={tokens.border}
                paddingTop={6}
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                gap={8}
              >
                {/* 1. Qualify Checkbox */}
                <Pressable
                  onPress={() => onToggleQualify(item.id)}
                  style={styles.actionCheckbox}
                >
                  <View
                    style={[
                      styles.checkboxSquare,
                      {
                        backgroundColor: item.isQualified ? tokens.accent : 'transparent',
                        borderColor: item.isQualified ? tokens.accent : tokens.border,
                      },
                    ]}
                  >
                    {item.isQualified && <LuCheck size={11} color="#fff" strokeWidth={3} />}
                  </View>
                  <Text fontSize={11} fontWeight={item.isQualified ? '700' : '500'} color={tokens.text}>
                    {item.isQualified ? 'Qualified for Store' : 'Excluded from Store'}
                  </Text>
                </Pressable>

                {/* 2. Common Media Toggle */}
                {item.isQualified && (
                  <Pressable
                    onPress={() => onToggleCommon(item.id)}
                    style={[
                      styles.commonToggleBtn,
                      {
                        backgroundColor: item.isCommon ? '#FEF3C7' : tokens.surface,
                        borderColor: item.isCommon ? '#F59E0B' : tokens.border,
                      },
                    ]}
                  >
                    <LuStar size={12} color={item.isCommon ? '#D97706' : tokens.textMuted} />
                    <Text
                      fontSize={11}
                      fontWeight={item.isCommon ? '800' : '600'}
                      color={item.isCommon ? '#B45309' : tokens.textMuted}
                    >
                      {item.isCommon ? 'Common (All Colors)' : 'Mark as Common'}
                    </Text>
                  </Pressable>
                )}

                {/* 3. Color Group Assignment (Only when not common) */}
                {item.isQualified && !item.isCommon && (
                  <XStack alignItems="center" gap={4}>
                    <Text fontSize={10} color={tokens.textMuted}>
                      Group:
                    </Text>
                    <XStack gap={4}>
                      {colorGroups.map((cg) => {
                        const isSelected = item.colorGroupId === cg.id;
                        return (
                          <Pressable
                            key={cg.id}
                            onPress={() => onSelectColorGroup(item.id, cg.id)}
                            style={[
                              styles.groupChip,
                              {
                                backgroundColor: isSelected ? tokens.accent : tokens.surface,
                                borderColor: isSelected ? tokens.accent : tokens.border,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.chipColorDot,
                                { backgroundColor: cg.slotA },
                              ]}
                            />
                            <Text
                              fontSize={10}
                              fontWeight={isSelected ? '800' : '600'}
                              color={isSelected ? tokens.accentForeground : tokens.text}
                            >
                              {cg.name.split(' ')[0]}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </XStack>
                  </XStack>
                )}
              </XStack>
            </YStack>
          );
        })}
      </YStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  kpiPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  smartBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  orderBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbWrapper: {
    width: 54,
    height: 54,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  playOverlayBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaTypeBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  heroPill: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  commonPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  disqualifiedPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  miniColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  arrowBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  activeVideoBanner: {
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  actionCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
  },
  checkboxSquare: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commonToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    cursor: 'pointer',
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    cursor: 'pointer',
  },
  chipColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

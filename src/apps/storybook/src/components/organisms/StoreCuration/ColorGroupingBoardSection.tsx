import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuLayers, LuStar, LuVideo, LuImage, LuCheck, LuArrowRight } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { CustomSwatchDot } from '../../atoms/SwatchDot/CustomSwatchDot';
import { StoreColorGroup, StoreCurationMediaItem } from './types';

export interface ColorGroupingBoardSectionProps {
  colorGroups: StoreColorGroup[];
  mediaList: StoreCurationMediaItem[];
  onToggleCommon: (id: string) => void;
  onSelectColorGroup: (mediaId: string, colorGroupId: string) => void;
}

export function ColorGroupingBoardSection({
  colorGroups,
  mediaList,
  onToggleCommon,
  onSelectColorGroup,
}: ColorGroupingBoardSectionProps) {
  const { tokens } = useTheme();

  const qualifiedMedia = mediaList.filter((m) => m.isQualified);
  const commonMedia = qualifiedMedia.filter((m) => m.isCommon);

  return (
    <YStack
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius.md}
      borderWidth={1}
      borderColor={tokens.border}
      padding={14}
      gap={14}
    >
      {/* Header */}
      <YStack gap={4}>
        <XStack alignItems="center" gap={6}>
          <LuLayers size={16} color={tokens.accent} />
          <Text fontSize={13} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
            Color Grouping &amp; Universal Common Media Matrix
          </Text>
        </XStack>
        <Text fontSize={11} color={tokens.textMuted}>
          Assign photos to specific colorways or flag universal craft assets (Zari Pallu, Weave certificate, Blouse piece) to appear across every variant carousel.
        </Text>
      </YStack>

      {/* Universal Common Media Banner */}
      <YStack
        backgroundColor="#FEF3C7"
        borderRadius={8}
        borderWidth={1}
        borderColor="#FDE68A"
        padding={12}
        gap={8}
      >
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" gap={6}>
            <LuStar size={16} color="#B45309" />
            <Text fontSize={12} fontWeight="800" color="#B45309">
              ★ Universal Common Media ({commonMedia.length} Assets)
            </Text>
          </XStack>
          <View style={styles.autoPill}>
            <Text fontSize={10} fontWeight="700" color="#B45309">
              Injected into ALL Colorway Carousels
            </Text>
          </View>
        </XStack>

        <Text fontSize={11} color="#92400E">
          These assets are not tied to a single color shade; when customers browse ANY color variant on the PDP, these photos/videos will be included.
        </Text>

        <XStack flexWrap="wrap" gap={10} paddingTop={4}>
          {commonMedia.map((item) => (
            <XStack
              key={item.id}
              backgroundColor="#FFFFFF"
              borderRadius={8}
              padding={8}
              gap={8}
              alignItems="center"
              borderWidth={1}
              borderColor="#FCD34D"
              flexBasis="48%"
              flexGrow={1}
            >
              <View style={styles.miniThumbBox}>
                <Image source={{ uri: item.thumbnailUri || item.uri }} style={styles.thumbImg} resizeMode="cover" />
                {item.mediaType === 'video' && (
                  <View style={styles.miniVideoBadge}>
                    <LuVideo size={8} color="#fff" />
                  </View>
                )}
              </View>
              <YStack flex={1} gap={2}>
                <Text fontSize={11} fontWeight="700" color="#1E293B" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text fontSize={9} color="#64748B">
                  {item.mediaType === 'video' ? `Video · 0:${item.durationSeconds}s` : 'Photo · Macro Detail'}
                </Text>
              </YStack>
              <Pressable onPress={() => onToggleCommon(item.id)} hitSlop={6} style={styles.unmarkBtn}>
                <Text fontSize={9} fontWeight="700" color="#B45309">
                  Unmark
                </Text>
              </Pressable>
            </XStack>
          ))}
        </XStack>
      </YStack>

      {/* Colorway Variant Columns */}
      <YStack gap={10}>
        <Text fontSize={11} fontWeight="800" color={tokens.text} textTransform="uppercase">
          Colorway Variant Groupings:
        </Text>

        <YStack gap={12}>
          {colorGroups.map((cg) => {
            const groupSpecificMedia = qualifiedMedia.filter(
              (m) => m.colorGroupId === cg.id && !m.isCommon
            );
            const totalOnPdp = groupSpecificMedia.length + commonMedia.length;

            return (
              <YStack
                key={cg.id}
                backgroundColor={tokens.surfaceRaised}
                borderRadius={8}
                borderWidth={1}
                borderColor={tokens.border}
                padding={12}
                gap={10}
              >
                {/* Variant Header Bar */}
                <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={8}>
                  <XStack alignItems="center" gap={10}>
                    <CustomSwatchDot
                      template={cg.template}
                      primaryColor={cg.slotA}
                      secondaryColor={cg.slotB}
                      size={28}
                    />
                    <YStack>
                      <Text fontSize={13} fontWeight="800" color={tokens.text}>
                        {cg.name}
                      </Text>
                      <Text fontSize={10} color={tokens.textMuted}>
                        SKU: {cg.colorwayCode} · Swatch: {cg.template}
                      </Text>
                    </YStack>
                  </XStack>

                  <View style={[styles.pdpSummaryBadge, { backgroundColor: `${tokens.accent}14` }]}>
                    <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                      {totalOnPdp} Total Photos on Storefront
                    </Text>
                  </View>
                </XStack>

                {/* Media Cards for this variant */}
                <XStack flexWrap="wrap" gap={8}>
                  {/* Group-specific photos */}
                  {groupSpecificMedia.map((m) => (
                    <XStack
                      key={m.id}
                      backgroundColor="#FFFFFF"
                      borderRadius={6}
                      padding={6}
                      gap={8}
                      alignItems="center"
                      borderWidth={1}
                      borderColor={tokens.border}
                      flexBasis="48%"
                      flexGrow={1}
                    >
                      <View style={styles.miniThumbBox}>
                        <Image source={{ uri: m.thumbnailUri || m.uri }} style={styles.thumbImg} resizeMode="cover" />
                        {m.mediaType === 'video' && (
                          <View style={styles.miniVideoBadge}>
                            <LuVideo size={8} color="#fff" />
                          </View>
                        )}
                      </View>
                      <YStack flex={1}>
                        <Text fontSize={10} fontWeight="700" color={tokens.text} numberOfLines={1}>
                          {m.title}
                        </Text>
                        <Text fontSize={9} color={tokens.textMuted}>
                          Slide #{m.sortOrder} {m.isHero ? '★ Cover' : ''}
                        </Text>
                      </YStack>
                    </XStack>
                  ))}

                  {/* Common photos (represented with gold outline) */}
                  {commonMedia.map((cm) => (
                    <XStack
                      key={`common-${cg.id}-${cm.id}`}
                      backgroundColor="#FFFBEB"
                      borderRadius={6}
                      padding={6}
                      gap={8}
                      alignItems="center"
                      borderWidth={1}
                      borderColor="#FCD34D"
                      flexBasis="48%"
                      flexGrow={1}
                    >
                      <View style={styles.miniThumbBox}>
                        <Image source={{ uri: cm.thumbnailUri || cm.uri }} style={styles.thumbImg} resizeMode="cover" />
                        <View style={styles.commonOverlayDot}>
                          <LuStar size={6} color="#B45309" />
                        </View>
                      </View>
                      <YStack flex={1}>
                        <Text fontSize={10} fontWeight="700" color="#92400E" numberOfLines={1}>
                          {cm.title}
                        </Text>
                        <Text fontSize={9} color="#B45309">
                          ★ Inherited (Common)
                        </Text>
                      </YStack>
                    </XStack>
                  ))}
                </XStack>
              </YStack>
            );
          })}
        </YStack>
      </YStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  autoPill: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniThumbBox: {
    width: 36,
    height: 36,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  miniVideoBadge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 1,
    borderRadius: 2,
  },
  commonOverlayDot: {
    position: 'absolute',
    top: 1,
    left: 1,
    backgroundColor: '#FDE68A',
    borderRadius: 6,
    padding: 1,
  },
  unmarkBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FDE68A',
  },
  pdpSummaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
});

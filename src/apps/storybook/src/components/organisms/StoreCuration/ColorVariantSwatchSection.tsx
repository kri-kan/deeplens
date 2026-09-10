import React, { useState } from 'react';
import { View, Pressable, StyleSheet, TextInput, ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuPalette,
  LuPlus,
  LuSparkles,
  LuLayers,
  LuCheck,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';
import {
  CustomSwatchDot,
  SwatchTemplateType,
  STANDARD_PALETTE,
  STANDARD_COLOR_NAMES,
  StandardColorName,
  resolveColorHex,
} from '../../atoms/SwatchDot/CustomSwatchDot';
import { StoreColorGroup, StoreCurationMediaItem } from './types';

export interface ColorVariantSwatchSectionProps {
  colorGroups: StoreColorGroup[];
  selectedGroupId: string;
  mediaList: StoreCurationMediaItem[];
  onSelectGroup: (groupId: string) => void;
  onUpdateGroup: (updated: StoreColorGroup) => void;
  onAddGroup: () => void;
}

const TEMPLATE_OPTIONS: { id: SwatchTemplateType; label: string; desc: string }[] = [
  { id: 'contrast-border', label: 'Contrast Border', desc: '80% body + 20% border/zari strip' },
  { id: 'multi-tone', label: 'Multi-Tone Gradient', desc: 'Iridescent warp/weft diagonal gradient' },
  { id: 'solid', label: 'Solid Monochrome', desc: 'Single consistent body fabric shade' },
  { id: 'multi-shade', label: 'Multi-Shade (Split)', desc: '2-way split, 3-way pie, or 4-way cross' },
  { id: 'multicolor', label: 'Multicolor Grid', desc: '16-cell ethnic print or bandhani mosaic' },
];

export function ColorVariantSwatchSection({
  colorGroups,
  selectedGroupId,
  mediaList,
  onSelectGroup,
  onUpdateGroup,
  onAddGroup,
}: ColorVariantSwatchSectionProps) {
  const { tokens } = useTheme();
  const [showFullPaletteSlot, setShowFullPaletteSlot] = useState<'A' | 'B' | null>(null);

  const activeGroup = colorGroups.find((g) => g.id === selectedGroupId) || colorGroups[0];

  // Derive auto-extracted candidate colors across all qualified media
  const candidateColors = React.useMemo(() => {
    const map = new Map<string, { hex: string; name: string; maxPercent: number }>();
    mediaList
      .filter((m) => m.isQualified)
      .forEach((m) => {
        (m.detectedColors || []).forEach((c) => {
          const existing = map.get(c.hex);
          if (!existing || c.percentage > existing.maxPercent) {
            map.set(c.hex, { hex: c.hex, name: c.name, maxPercent: c.percentage });
          }
        });
      });
    return Array.from(map.values()).sort((a, b) => b.maxPercent - a.maxPercent);
  }, [mediaList]);

  // Count photos assigned to this group + common photos
  const groupPhotoCount = mediaList.filter(
    (m) => m.isQualified && m.colorGroupId === activeGroup?.id && !m.isCommon
  ).length;
  const commonPhotoCount = mediaList.filter((m) => m.isQualified && m.isCommon).length;
  const totalPdpPhotos = groupPhotoCount + commonPhotoCount;

  const handleTemplateChange = (template: SwatchTemplateType) => {
    if (!activeGroup) return;
    onUpdateGroup({
      ...activeGroup,
      template,
    });
  };

  const handleSlotChange = (slot: 'A' | 'B' | 'C' | 'D', colorHex: string) => {
    if (!activeGroup) return;
    onUpdateGroup({
      ...activeGroup,
      [slot === 'A' ? 'slotA' : slot === 'B' ? 'slotB' : slot === 'C' ? 'slotC' : 'slotD']: colorHex,
    });
  };

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
      <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={8}>
        <YStack>
          <XStack alignItems="center" gap={6}>
            <LuPalette size={16} color={tokens.accent} />
            <Text fontSize={13} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
              Color Variants &amp; Ethnic Swatch Editor
            </Text>
          </XStack>
          <Text fontSize={11} color={tokens.textMuted}>
            Configure ethnic colorway swatch geometry, map slot hues from auto-extracted colors, and define photo groupings.
          </Text>
        </YStack>

        <Pressable
          onPress={onAddGroup}
          style={({ pressed }) => [
            styles.addGroupBtn,
            { backgroundColor: pressed ? tokens.accentSubtle : tokens.surfaceRaised, borderColor: tokens.accent },
          ]}
        >
          <LuPlus size={12} color={tokens.accent} />
          <Text fontSize={11} fontWeight="800" color={tokens.accent}>
            New Color Group
          </Text>
        </Pressable>
      </XStack>

      {/* Color Groups Tabbed Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
        {colorGroups.map((cg) => {
          const isSelected = cg.id === selectedGroupId;
          return (
            <Pressable
              key={cg.id}
              onPress={() => onSelectGroup(cg.id)}
              style={[
                styles.groupTabCard,
                {
                  backgroundColor: isSelected ? `${tokens.accent}14` : tokens.surfaceRaised,
                  borderColor: isSelected ? tokens.accent : tokens.border,
                },
              ]}
            >
              <XStack alignItems="center" gap={8}>
                <CustomSwatchDot
                  template={cg.template}
                  primaryColor={cg.slotA}
                  secondaryColor={cg.slotB}
                  size={26}
                  selected={isSelected}
                />
                <YStack>
                  <Text fontSize={12} fontWeight={isSelected ? '800' : '600'} color={tokens.text}>
                    {cg.name}
                  </Text>
                  <Text fontSize={10} color={tokens.textMuted}>
                    {cg.colorwayCode}
                  </Text>
                </YStack>
              </XStack>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Active Colorway Configuration Form */}
      {activeGroup && (
        <YStack
          backgroundColor={tokens.surfaceRaised}
          borderRadius={tokens.radius.md}
          borderWidth={1}
          borderColor={tokens.border}
          padding={12}
          gap={12}
        >
          {/* Variant Label & SKU */}
          <XStack gap={10} flexWrap="wrap">
            <YStack flex={1.5} gap={4}>
              <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                Colorway Title:
              </Text>
              <TextInput
                value={activeGroup.name}
                onChangeText={(text) => onUpdateGroup({ ...activeGroup, name: text })}
                style={styles.textInput}
                placeholder="e.g. Banarasi Emerald & Gold Zari"
              />
            </YStack>

            <YStack flex={1} gap={4}>
              <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                Variant SKU Code:
              </Text>
              <TextInput
                value={activeGroup.colorwayCode}
                onChangeText={(text) => onUpdateGroup({ ...activeGroup, colorwayCode: text })}
                style={styles.textInput}
                placeholder="e.g. VF2B58-EMR"
              />
            </YStack>
          </XStack>

          {/* Swatch Template Selector */}
          <YStack gap={6}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
              Ethnic Swatch Template Geometry:
            </Text>
            <XStack flexWrap="wrap" gap={8}>
              {TEMPLATE_OPTIONS.map((tpl) => {
                const isSelected = activeGroup.template === tpl.id;
                return (
                  <Pressable
                    key={tpl.id}
                    onPress={() => handleTemplateChange(tpl.id)}
                    style={[
                      styles.templateCard,
                      {
                        backgroundColor: isSelected ? '#FFFFFF' : tokens.surface,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <XStack alignItems="center" justifyContent="space-between" width="100%">
                      <YStack gap={2} flex={1}>
                        <Text fontSize={11} fontWeight={isSelected ? '800' : '600'} color={tokens.text}>
                          {tpl.label}
                        </Text>
                        <Text fontSize={9} color={tokens.textMuted} numberOfLines={1}>
                          {tpl.desc}
                        </Text>
                      </YStack>
                      <CustomSwatchDot
                        template={tpl.id}
                        primaryColor={activeGroup.slotA}
                        secondaryColor={activeGroup.slotB || '#D4AF37'}
                        size={24}
                      />
                    </XStack>
                  </Pressable>
                );
              })}
            </XStack>
          </YStack>

          {/* Slot Color Assignment (Slot A + Slot B) */}
          <XStack gap={12} flexWrap="wrap">
            {/* Slot A: Body Color */}
            <YStack flex={1} backgroundColor={tokens.surface} borderRadius={8} borderWidth={1} borderColor={tokens.border} padding={10} gap={8}>
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={11} fontWeight="800" color={tokens.text}>
                  Slot A: Primary Body (80%)
                </Text>
                <View style={[styles.activeColorPill, { backgroundColor: resolveColorHex(activeGroup.slotA) }]} />
              </XStack>

              <Text fontSize={10} color={tokens.textMuted}>
                Auto-Extracted Candidates (Oklab Centroids):
              </Text>
              <XStack flexWrap="wrap" gap={6}>
                {candidateColors.slice(0, 4).map((c) => (
                  <Pressable
                    key={`slotA-${c.hex}`}
                    onPress={() => handleSlotChange('A', c.hex)}
                    style={[
                      styles.colorSuggestionChip,
                      {
                        borderColor: activeGroup.slotA === c.hex ? tokens.accent : tokens.border,
                        backgroundColor: activeGroup.slotA === c.hex ? `${tokens.accent}14` : tokens.surfaceRaised,
                      },
                    ]}
                  >
                    <View style={[styles.miniDot, { backgroundColor: c.hex }]} />
                    <Text fontSize={10} fontWeight="700" color={tokens.text}>
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </XStack>

              {/* Toggle 32 Oklch Palette */}
              <Pressable onPress={() => setShowFullPaletteSlot(showFullPaletteSlot === 'A' ? null : 'A')}>
                <Text fontSize={10} fontWeight="800" color={tokens.accent}>
                  {showFullPaletteSlot === 'A' ? '▲ Hide 32-Anchor Palette' : '▼ Browse 32 Oklch Anchors...'}
                </Text>
              </Pressable>

              {showFullPaletteSlot === 'A' && (
                <XStack flexWrap="wrap" gap={4} maxHeight={120} overflow="hidden">
                  {STANDARD_COLOR_NAMES.map((name) => (
                    <Pressable
                      key={name}
                      onPress={() => handleSlotChange('A', STANDARD_PALETTE[name])}
                      style={[styles.paletteChip, { backgroundColor: STANDARD_PALETTE[name] }]}
                      accessibilityLabel={name}
                    />
                  ))}
                </XStack>
              )}
            </YStack>

            {/* Slot B: Contrast Border / Weft */}
            {activeGroup.template !== 'solid' && (
              <YStack flex={1} backgroundColor={tokens.surface} borderRadius={8} borderWidth={1} borderColor={tokens.border} padding={10} gap={8}>
                <XStack alignItems="center" justifyContent="space-between">
                  <Text fontSize={11} fontWeight="800" color={tokens.text}>
                    Slot B: Border / Accent (20%)
                  </Text>
                  <View style={[styles.activeColorPill, { backgroundColor: resolveColorHex(activeGroup.slotB || '#D4AF37') }]} />
                </XStack>

                <Text fontSize={10} color={tokens.textMuted}>
                  Auto-Extracted Candidates (Oklab Centroids):
                </Text>
                <XStack flexWrap="wrap" gap={6}>
                  {candidateColors.slice(0, 4).map((c) => (
                    <Pressable
                      key={`slotB-${c.hex}`}
                      onPress={() => handleSlotChange('B', c.hex)}
                      style={[
                        styles.colorSuggestionChip,
                        {
                          borderColor: activeGroup.slotB === c.hex ? tokens.accent : tokens.border,
                          backgroundColor: activeGroup.slotB === c.hex ? `${tokens.accent}14` : tokens.surfaceRaised,
                        },
                      ]}
                    >
                      <View style={[styles.miniDot, { backgroundColor: c.hex }]} />
                      <Text fontSize={10} fontWeight="700" color={tokens.text}>
                        {c.name}
                      </Text>
                    </Pressable>
                  ))}
                </XStack>

                {/* Toggle 32 Oklch Palette */}
                <Pressable onPress={() => setShowFullPaletteSlot(showFullPaletteSlot === 'B' ? null : 'B')}>
                  <Text fontSize={10} fontWeight="800" color={tokens.accent}>
                    {showFullPaletteSlot === 'B' ? '▲ Hide 32-Anchor Palette' : '▼ Browse 32 Oklch Anchors...'}
                  </Text>
                </Pressable>

                {showFullPaletteSlot === 'B' && (
                  <XStack flexWrap="wrap" gap={4} maxHeight={120} overflow="hidden">
                    {STANDARD_COLOR_NAMES.map((name) => (
                      <Pressable
                        key={name}
                        onPress={() => handleSlotChange('B', STANDARD_PALETTE[name])}
                        style={[styles.paletteChip, { backgroundColor: STANDARD_PALETTE[name] }]}
                        accessibilityLabel={name}
                      />
                    ))}
                  </XStack>
                )}
              </YStack>
            )}
          </XStack>

          {/* Live Resulting Swatch Preview & Media Allocation Summary */}
          <XStack
            backgroundColor="#FFFFFF"
            borderRadius={8}
            borderWidth={1}
            borderColor={tokens.border}
            padding={10}
            alignItems="center"
            justifyContent="space-between"
          >
            <XStack alignItems="center" gap={12}>
              <CustomSwatchDot
                template={activeGroup.template}
                primaryColor={activeGroup.slotA}
                secondaryColor={activeGroup.slotB || '#D4AF37'}
                size={40}
                selected={true}
              />
              <YStack gap={2}>
                <Text fontSize={12} fontWeight="800" color={tokens.text}>
                  Live Swatch: {activeGroup.template.toUpperCase()}
                </Text>
                <Text fontSize={11} color={tokens.textSecondary}>
                  Slot A: {activeGroup.slotA} · Slot B: {activeGroup.slotB || 'N/A'}
                </Text>
              </YStack>
            </XStack>

            <YStack alignItems="flex-end" gap={2}>
              <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                {totalPdpPhotos} Total Slides on PDP
              </Text>
              <Text fontSize={10} color={tokens.textMuted}>
                ({groupPhotoCount} group-specific + {commonPhotoCount} common)
              </Text>
            </YStack>
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  addGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    cursor: 'pointer',
  },
  tabsContainer: {
    gap: 8,
    paddingVertical: 2,
  },
  groupTabCard: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    cursor: 'pointer',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: '#1E293B',
  },
  templateCard: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: 8,
    borderRadius: 6,
    cursor: 'pointer',
  },
  activeColorPill: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  colorSuggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    cursor: 'pointer',
  },
  miniDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  paletteChip: {
    width: 16,
    height: 16,
    borderRadius: 3,
    cursor: 'pointer',
  },
});

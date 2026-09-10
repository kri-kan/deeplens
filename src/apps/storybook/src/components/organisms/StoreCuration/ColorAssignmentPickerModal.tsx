import React, { useState, useEffect, useMemo } from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuX, LuCheck, LuSparkles, LuPlus } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import {
  CustomSwatchDot,
  SwatchTemplateType,
  STANDARD_PALETTE,
  STANDARD_COLOR_NAMES,
  StandardColorName,
  resolveColorHex,
} from '../../atoms/SwatchDot/CustomSwatchDot';
import { StoreColorGroup, ExtractedColorCentroid } from './types';

export interface ColorAssignmentPickerModalProps {
  visible: boolean;
  colorGroup: StoreColorGroup | null;
  template: SwatchTemplateType;
  extractedColors: ExtractedColorCentroid[];
  colorCount?: number;
  onApply: (updatedGroup: StoreColorGroup) => void;
  onClose: () => void;
}

export interface SlotConfig {
  slot: string; // 'A', 'B', 'C', 'D', ...
  index: number;
  label: string;
}

const FALLBACK_PALETTE: readonly string[] = [
  '#1B4D3E', // Emerald
  '#D4AF37', // Antique Gold
  '#C0392B', // Ruby Red
  '#1A2875', // Navy Blue
  '#E91E63', // Magenta / Rani Pink
  '#6B7C3A', // Olive Khaki
  '#38B4B4', // Turquoise
  '#E07A5C', // Coral Salmon
  '#7A2E8C', // Violet Plum
];

function getContrastTextColor(hex: string): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return '#FFFFFF';
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? '#1E293B' : '#FFFFFF';
}

/**
 * Resolve friendly display name for any given hex code from photo centroids or standard palette
 */
export function resolveColorName(
  hex: string,
  extractedColors: ExtractedColorCentroid[] = []
): string {
  if (!hex) return '';
  const clean = hex.trim().toLowerCase();

  // 1. Check extracted colors
  const matchedExtracted = extractedColors.find(
    (c) => c.hex.toLowerCase() === clean
  );
  if (matchedExtracted && matchedExtracted.name) {
    return matchedExtracted.name;
  }

  // 2. Check STANDARD_PALETTE
  const matchedPalette = Object.entries(STANDARD_PALETTE).find(
    ([_, val]) => val.toLowerCase() === clean
  );
  if (matchedPalette) {
    return matchedPalette[0];
  }

  return hex.toUpperCase();
}

/**
 * Extract or generate initial array of slot colors based on colorGroup, template, and requested colorCount
 */
export function getInitialSlotColors(
  group: StoreColorGroup | null,
  template: SwatchTemplateType,
  overrideCount?: number
): string[] {
  if (!group) return ['#1B4D3E'];

  // 1. If colors array exists on group, prioritize it
  if (group.colors && group.colors.length > 0) {
    return [...group.colors];
  }

  // 2. Collect defined individual slots
  const collected: string[] = [group.slotA || '#1B4D3E'];
  if (group.slotB) collected.push(group.slotB);
  if (group.slotC) collected.push(group.slotC);
  if (group.slotD) collected.push(group.slotD);

  // 3. Determine target slot count
  let desired = overrideCount || group.colorCount;
  if (!desired) {
    if (template === 'solid') {
      desired = 1;
    } else if (template === 'contrast-border') {
      desired = 2;
    } else {
      // multi-shade / multi-tone: default to collected count, minimum 2
      desired = Math.max(collected.length, 2);
    }
  }

  while (collected.length < desired) {
    collected.push(FALLBACK_PALETTE[collected.length % FALLBACK_PALETTE.length]);
  }

  return collected.slice(0, Math.max(desired, collected.length));
}

export function ColorAssignmentPickerModal({
  visible,
  colorGroup,
  template,
  extractedColors,
  colorCount: propColorCount,
  onApply,
  onClose,
}: ColorAssignmentPickerModalProps) {
  const { tokens } = useTheme();

  // Dynamic slot colors state supporting 1, 2, 3, 4, ... N slots
  const [slotColors, setSlotColors] = useState<string[]>(['#1B4D3E', '#D4AF37']);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  const [paletteFamily, setPaletteFamily] = useState<'all' | 'photos' | 'silks' | 'festive' | 'metallics'>('all');

  // Sync state when sheet opens or active group changes
  useEffect(() => {
    if (colorGroup) {
      const initialSlots = getInitialSlotColors(colorGroup, template, propColorCount);
      setSlotColors(initialSlots);
      setActiveSlotIndex(0);
    }
  }, [colorGroup, template, propColorCount]);

  if (!visible || !colorGroup) return null;

  // Multicolor does not require slot picking
  if (template === 'multicolor') return null;

  // Dynamic header title derived live from all selected slot colors (supporting N slots)
  const slotNames = slotColors.map((hex) => resolveColorName(hex, extractedColors));
  const dynamicHeaderTitle = useMemo(() => {
    if (slotNames.length === 0) return colorGroup.name;
    if (slotNames.length === 1) return slotNames[0] || colorGroup.name;
    if (slotNames.length === 2) return `${slotNames[0]} & ${slotNames[1]}`;
    // 3 or more colors: "Name A, Name B & Name C"
    const allButLast = slotNames.slice(0, -1).join(', ');
    const last = slotNames[slotNames.length - 1];
    return `${allButLast} & ${last}`;
  }, [slotNames, colorGroup.name]);

  const activeSlotHex = slotColors[activeSlotIndex] || slotColors[0] || '#1B4D3E';

  const handleSelectColor = (hex: string) => {
    setSlotColors((prev) => {
      const updated = [...prev];
      updated[activeSlotIndex] = hex;
      return updated;
    });

    // Auto-advance to next slot if not on the last slot
    if (activeSlotIndex < slotColors.length - 1) {
      setActiveSlotIndex((prev) => prev + 1);
    }
  };

  const handleAddSlot = () => {
    const nextColor = FALLBACK_PALETTE[slotColors.length % FALLBACK_PALETTE.length];
    const newColors = [...slotColors, nextColor];
    setSlotColors(newColors);
    setActiveSlotIndex(newColors.length - 1);
  };

  const handleRemoveSlot = (indexToRemove: number) => {
    if (slotColors.length <= 1) return;
    const newColors = slotColors.filter((_, idx) => idx !== indexToRemove);
    setSlotColors(newColors);
    setActiveSlotIndex((prev) => Math.min(prev, newColors.length - 1));
  };

  const handleSave = () => {
    onApply({
      ...colorGroup,
      name: dynamicHeaderTitle,
      template,
      slotA: slotColors[0] || colorGroup.slotA,
      slotB: slotColors.length > 1 ? slotColors[1] : undefined,
      slotC: slotColors.length > 2 ? slotColors[2] : undefined,
      slotD: slotColors.length > 3 ? slotColors[3] : undefined,
      colors: slotColors,
      colorCount: slotColors.length,
    });
    onClose();
  };

  // Filter 32-anchor palette by family
  const filteredPaletteNames: StandardColorName[] = STANDARD_COLOR_NAMES.filter((name) => {
    if (name === 'Multicolor') return false;
    if (paletteFamily === 'metallics') {
      return ['Antique Gold', 'Rose Gold', 'Silver', 'Mustard'].includes(name);
    }
    if (paletteFamily === 'silks') {
      return ['Emerald', 'Ruby Red', 'Wine Maroon', 'Navy Blue', 'Royal Blue', 'Teal Peacock', 'Violet Plum'].includes(name);
    }
    if (paletteFamily === 'festive') {
      return ['Rose Pink', 'Blush Pink', 'Coral Salmon', 'Magenta', 'Tangerine', 'Rust Burnt', 'Mint Seafoam', 'Lavender'].includes(name);
    }
    return true;
  });

  return (
    <View style={styles.sheetBackdrop}>
      <Pressable style={styles.dismissArea} onPress={onClose} />
      <YStack style={styles.sheetContainer}>
        {/* Sheet Top Drag Handle Bar */}
        <View style={styles.sheetHandleBar} />

        {/* Dynamic Header: Live derived title from active selection */}
        <XStack
          backgroundColor={tokens.surface}
          borderBottomWidth={1}
          borderBottomColor={tokens.border}
          paddingHorizontal={14}
          paddingVertical={10}
          alignItems="center"
          justifyContent="space-between"
        >
          <XStack alignItems="center" gap={10} flex={1}>
            <CustomSwatchDot
              template={template}
              primaryColor={slotColors[0] || '#1B4D3E'}
              secondaryColor={slotColors[1] || '#D4AF37'}
              tertiaryColor={slotColors[2]}
              quaternaryColor={slotColors[3]}
              colors={slotColors}
              colorCount={Math.min(Math.max(slotColors.length, 2), 4) as 2 | 3 | 4}
              size={38}
              selected={true}
            />
            <YStack flex={1} marginRight={6}>
              <Text fontSize={12.5} fontWeight="900" color={tokens.text} numberOfLines={1}>
                {dynamicHeaderTitle}
              </Text>
              <Text fontSize={9.5} color={tokens.textMuted}>
                {slotColors.length} Color Slot{slotColors.length === 1 ? '' : 's'} · {template.toUpperCase()}
              </Text>
            </YStack>
          </XStack>

          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <LuX size={18} color={tokens.textMuted} />
          </Pressable>
        </XStack>

        {/* Top Swipeable Square Slot Tiles Bar */}
        <View style={styles.slotsBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slotsScrollContainer}
          >
            {slotColors.map((hex, idx) => {
              const isSlotActive = activeSlotIndex === idx;
              const slotLetter = String.fromCharCode(65 + idx); // 'A', 'B', 'C', 'D', ...

              return (
                <Pressable
                  key={`slot-${slotLetter}-${idx}`}
                  onPress={() => setActiveSlotIndex(idx)}
                  style={[
                    styles.slotSquareTile,
                    {
                      borderColor: isSlotActive ? tokens.accent : tokens.border,
                      backgroundColor: isSlotActive ? `${tokens.accent}14` : tokens.surface,
                      borderWidth: isSlotActive ? 2 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.slotSquareColorChip,
                      { backgroundColor: resolveColorHex(hex) },
                    ]}
                  />
                  <Text
                    fontSize={10}
                    fontWeight={isSlotActive ? '900' : '700'}
                    color={isSlotActive ? tokens.accent : tokens.text}
                    marginTop={3}
                  >
                    {`Slot ${slotLetter}`}
                  </Text>

                  {/* Remove Slot Action if more than 2 slots */}
                  {slotColors.length > 2 && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemoveSlot(idx);
                      }}
                      hitSlop={6}
                      style={styles.slotRemoveBtn}
                    >
                      <LuX size={9} color="#FFFFFF" strokeWidth={3} />
                    </Pressable>
                  )}
                </Pressable>
              );
            })}

            {/* Square Add Slot Tile for multi-slot templates */}
            {template !== 'solid' && (
              <Pressable onPress={handleAddSlot} style={styles.addSlotSquareTile}>
                <LuPlus size={16} color={tokens.textMuted} />
                <Text fontSize={9} fontWeight="800" color={tokens.textMuted}>
                  + Slot
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>

        {/* Filter Chips Bar (Sleek horizontal chips, no redundant section header) */}
        <View style={styles.filterChipsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsScroll}
          >
            {(['all', 'photos', 'silks', 'festive', 'metallics'] as const).map((fam) => {
              if (fam === 'photos' && extractedColors.length === 0) return null;
              const label =
                fam === 'all'
                  ? `All (${STANDARD_COLOR_NAMES.length - 1})`
                  : fam === 'photos'
                  ? `Photos (${Math.min(extractedColors.length, 8)})`
                  : fam;

              return (
                <Pressable
                  key={fam}
                  onPress={() => setPaletteFamily(fam)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: paletteFamily === fam ? tokens.accent : tokens.surfaceRaised,
                    },
                  ]}
                >
                  <Text
                    fontSize={9}
                    fontWeight="800"
                    color={paletteFamily === fam ? tokens.accentForeground : tokens.textMuted}
                    textTransform="capitalize"
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 4-Column Compact Color Grid */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContentContainer}
        >
          {/* Photo Centroids (Shown if 'photos' or 'all' selected) */}
          {(paletteFamily === 'photos' || (paletteFamily === 'all' && extractedColors.length > 0)) && (
            <YStack gap={4} marginBottom={paletteFamily === 'all' ? 6 : 0}>
              {paletteFamily === 'all' && (
                <XStack alignItems="center" gap={4} paddingHorizontal={2} marginBottom={2}>
                  <LuSparkles size={11} color={tokens.accent} />
                  <Text fontSize={9} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                    Photo Centroids
                  </Text>
                </XStack>
              )}
              <View style={styles.colorGridRow}>
                {extractedColors.slice(0, paletteFamily === 'photos' ? 8 : 4).map((c) => {
                  const isColorChosen = activeSlotHex.toLowerCase() === c.hex.toLowerCase();

                  return (
                    <Pressable
                      key={`centroid-${c.hex}`}
                      onPress={() => handleSelectColor(c.hex)}
                      style={styles.colorCircleItem}
                    >
                      <View
                        style={[
                          styles.bigColorCircle,
                          {
                            backgroundColor: resolveColorHex(c.hex),
                            borderColor: isColorChosen ? tokens.accent : 'rgba(0,0,0,0.12)',
                            borderWidth: isColorChosen ? 3 : 1.5,
                          },
                        ]}
                      >
                        {isColorChosen && (
                          <View
                            style={[
                              styles.selectedInnerCheck,
                              {
                                backgroundColor:
                                  getContrastTextColor(c.hex) === '#FFFFFF'
                                    ? 'rgba(0,0,0,0.45)'
                                    : 'rgba(255,255,255,0.7)',
                              },
                            ]}
                          >
                            <LuCheck size={14} color={getContrastTextColor(c.hex)} strokeWidth={3} />
                          </View>
                        )}
                      </View>

                      <Text
                        fontSize={9}
                        fontWeight={isColorChosen ? '900' : '600'}
                        color={isColorChosen ? tokens.accent : tokens.text}
                        textAlign="center"
                        numberOfLines={1}
                        style={styles.circleCaption}
                      >
                        {c.name}
                      </Text>

                      <View style={styles.percentBadge}>
                        <Text fontSize={7.5} fontWeight="800" color="#64748B">
                          {c.percentage}%
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </YStack>
          )}

          {/* Standard Palette Anchors (Shown if not strictly 'photos') */}
          {paletteFamily !== 'photos' && (
            <View style={styles.colorGridRow}>
              {filteredPaletteNames.map((name) => {
                const hex = STANDARD_PALETTE[name];
                const isColorChosen = activeSlotHex.toLowerCase() === hex.toLowerCase();

                return (
                  <Pressable
                    key={name}
                    onPress={() => handleSelectColor(hex)}
                    style={styles.colorCircleItem}
                  >
                    <View
                      style={[
                        styles.bigColorCircle,
                        {
                          backgroundColor: hex,
                          borderColor: isColorChosen ? tokens.accent : 'rgba(0,0,0,0.12)',
                          borderWidth: isColorChosen ? 3 : 1.5,
                        },
                      ]}
                    >
                      {isColorChosen && (
                        <View
                          style={[
                            styles.selectedInnerCheck,
                            {
                              backgroundColor:
                                getContrastTextColor(hex) === '#FFFFFF'
                                  ? 'rgba(0,0,0,0.45)'
                                  : 'rgba(255,255,255,0.7)',
                            },
                          ]}
                        >
                          <LuCheck size={14} color={getContrastTextColor(hex)} strokeWidth={3} />
                        </View>
                      )}
                    </View>

                    <Text
                      fontSize={9}
                      fontWeight={isColorChosen ? '900' : '600'}
                      color={isColorChosen ? tokens.accent : tokens.text}
                      textAlign="center"
                      numberOfLines={1}
                      style={styles.circleCaption}
                    >
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Sheet Footer Actions */}
        <XStack
          backgroundColor={tokens.surface}
          borderTopWidth={1}
          borderTopColor={tokens.border}
          paddingHorizontal={16}
          paddingVertical={12}
          justifyContent="space-between"
          alignItems="center"
        >
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
              Cancel
            </Text>
          </Pressable>

          <Pressable onPress={handleSave} style={[styles.applyBtn, { backgroundColor: tokens.accent }]}>
            <LuCheck size={15} color={tokens.accentForeground} strokeWidth={3} />
            <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
              Apply Colors
            </Text>
          </Pressable>
        </XStack>
      </YStack>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
    cursor: 'pointer',
  },
  slotsBarWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
  },
  slotsScrollContainer: {
    paddingHorizontal: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotSquareTile: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
  },
  slotSquareColorChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.18)',
  },
  slotRemoveBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  addSlotSquareTile: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    gap: 2,
  },
  filterChipsRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterChipsScroll: {
    paddingHorizontal: 12,
    gap: 6,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    cursor: 'pointer',
  },
  gridContentContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  colorGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 4,
  },
  colorCircleItem: {
    width: '23.8%',
    maxWidth: '24.2%',
    alignItems: 'center',
    paddingVertical: 6,
    cursor: 'pointer',
  },
  bigColorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedInnerCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCaption: {
    width: '100%',
    textAlign: 'center',
    marginTop: 3,
  },
  percentBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginTop: 1,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    cursor: 'pointer',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    cursor: 'pointer',
  },
});

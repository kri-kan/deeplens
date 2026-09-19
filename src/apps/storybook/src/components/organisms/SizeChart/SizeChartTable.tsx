import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuCheck, LuInfo } from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { SizeChartData, SizeChartRow } from '../../../data/catalog/types';

export interface SizeChartTableProps {
  data: SizeChartData;
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
  defaultUnit?: 'in' | 'cm';
}

export function SizeChartTable({
  data,
  selectedSize,
  onSelectSize,
  defaultUnit = 'in',
}: SizeChartTableProps) {
  const { tokens } = useTheme();
  const [unit, setUnit] = useState<'in' | 'cm'>(defaultUnit);

  // Helper to extract measurement value for a given column key
  const getCellValue = (row: SizeChartRow, colKey: string): string => {
    switch (colKey) {
      case 'size':
        return row.label || row.size;
      case 'age':
        return row.age || '-';
      case 'bust':
      case 'chest':
        return unit === 'cm' && (row.bustCm || row.chestCm)
          ? row.bustCm || row.chestCm || '-'
          : row.bustInches || row.chestInches || '-';
      case 'underbust':
        return unit === 'cm' && row.underbustCm ? row.underbustCm : row.underbustInches || '-';
      case 'waist':
        return unit === 'cm' && row.waistCm ? row.waistCm : row.waistInches || '-';
      case 'hip':
        return unit === 'cm' && row.hipCm ? row.hipCm : row.hipInches || '-';
      case 'shoulder':
        return unit === 'cm' && row.shoulderCm ? row.shoulderCm : row.shoulderInches || '-';
      case 'armhole':
        return unit === 'cm' && row.armholeCm ? row.armholeCm : row.armholeInches || '-';
      case 'length':
        return unit === 'cm' && row.lengthCm ? row.lengthCm : row.lengthInches || '-';
      case 'flare':
        return unit === 'cm' && row.flareCm ? row.flareCm : row.flareInches || '-';
      case 'height':
        return row.heightCm || '-';
      case 'component':
        return row.label || row.size;
      case 'notes':
      case 'details':
      case 'craftsmanship':
        return row.notes || '-';
      case 'rangeInches':
        return row.chestInches || '-';
      case 'rangeCm':
        return row.chestCm || '-';
      case 'specification':
        return unit === 'cm' && row.chestCm ? row.chestCm : row.chestInches || '-';
      default:
        return (row as any)[colKey] || '-';
    }
  };

  const hasUnitToggle = data.category !== 'saree';

  return (
    <YStack gap={12} width="100%">
      {/* Top Controls: Unit Switcher & Selected Size Badge */}
      <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={8}>
        {hasUnitToggle ? (
          <XStack
            backgroundColor={tokens.surfaceRaised}
            borderRadius={8}
            padding={3}
            gap={4}
            borderWidth={1}
            borderColor={tokens.border}
          >
            <Pressable onPress={() => setUnit('in')}>
              <XStack
                paddingHorizontal={12}
                paddingVertical={5}
                borderRadius={6}
                backgroundColor={unit === 'in' ? tokens.accent : 'transparent'}
                cursor="pointer"
              >
                <Text
                  fontSize={11}
                  fontWeight="800"
                  color={unit === 'in' ? tokens.accentForeground : tokens.textSecondary}
                >
                  Inches (in)
                </Text>
              </XStack>
            </Pressable>

            <Pressable onPress={() => setUnit('cm')}>
              <XStack
                paddingHorizontal={12}
                paddingVertical={5}
                borderRadius={6}
                backgroundColor={unit === 'cm' ? tokens.accent : 'transparent'}
                cursor="pointer"
              >
                <Text
                  fontSize={11}
                  fontWeight="800"
                  color={unit === 'cm' ? tokens.accentForeground : tokens.textSecondary}
                >
                  Centimeters (cm)
                </Text>
              </XStack>
            </Pressable>
          </XStack>
        ) : (
          <View />
        )}

        {selectedSize ? (
          <XStack alignItems="center" gap={6} backgroundColor={`${tokens.accent}14`} paddingHorizontal={8} paddingVertical={4} borderRadius={6}>
            <LuCheck size={12} color={tokens.accent} />
            <Text fontSize={11} fontWeight="800" color={tokens.accent}>
              Selected on PDP: {selectedSize}
            </Text>
          </XStack>
        ) : null}
      </XStack>

      {/* Measurement Table Container */}
      <YStack
        borderWidth={1}
        borderColor={tokens.border}
        borderRadius={12}
        overflow="hidden"
        backgroundColor={tokens.surface}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={{ width: '100%' }}
        >
          <YStack minWidth="100%">
            {/* Table Header */}
            <XStack
              backgroundColor={tokens.surfaceRaised}
              paddingVertical={10}
              paddingHorizontal={14}
              borderBottomWidth={1}
              borderBottomColor={tokens.border}
              alignItems="center"
            >
              {data.columns.map((col, idx) => (
                <View
                  key={col.key}
                  style={{
                    width: col.minWidth || (idx === 0 ? 110 : 120),
                    paddingRight: 10,
                  }}
                >
                  <Text
                    fontSize={11}
                    fontWeight="800"
                    color={tokens.text}
                    textTransform="uppercase"
                    letterSpacing={0.5}
                    numberOfLines={1}
                  >
                    {col.label}
                  </Text>
                </View>
              ))}
            </XStack>

            {/* Table Rows */}
            <ScrollView style={{ maxHeight: 380 }}>
              {data.rows.map((row, rIdx) => {
                const isSelected = selectedSize === row.size || selectedSize === row.label;
                const isEven = rIdx % 2 === 0;

                return (
                  <Pressable
                    key={row.size || rIdx}
                    onPress={() => onSelectSize?.(row.size || row.label)}
                    style={{
                      cursor: onSelectSize ? 'pointer' : 'auto',
                    } as any}
                  >
                    <XStack
                      paddingVertical={11}
                      paddingHorizontal={14}
                      backgroundColor={
                        isSelected
                          ? `${tokens.accent}16`
                          : isEven
                          ? tokens.surface
                          : tokens.surfaceRaised
                      }
                      borderBottomWidth={rIdx === data.rows.length - 1 ? 0 : 1}
                      borderBottomColor={tokens.border}
                      alignItems="center"
                      borderLeftWidth={isSelected ? 3 : 0}
                      borderLeftColor={tokens.accent}
                    >
                      {data.columns.map((col, cIdx) => (
                        <View
                          key={col.key}
                          style={{
                            width: col.minWidth || (cIdx === 0 ? 110 : 120),
                            paddingRight: 10,
                          }}
                        >
                          <Text
                            fontSize={12}
                            fontWeight={cIdx === 0 ? '800' : isSelected ? '700' : '500'}
                            color={
                              cIdx === 0
                                ? tokens.accent
                                : isSelected
                                ? tokens.text
                                : tokens.textSecondary
                            }
                            numberOfLines={2}
                          >
                            {getCellValue(row, col.key)}
                          </Text>
                        </View>
                      ))}
                    </XStack>
                  </Pressable>
                );
              })}
            </ScrollView>
          </YStack>
        </ScrollView>
      </YStack>

      {/* Footer Instructions / Interaction Tip */}
      <XStack justifyContent="space-between" alignItems="center" paddingHorizontal={4}>
        <XStack alignItems="center" gap={4}>
          <LuInfo size={12} color={tokens.textMuted} />
          <Text fontSize={10} color={tokens.textMuted}>
            {onSelectSize
              ? 'Tap any row to select size directly for purchase'
              : 'Scroll horizontally to view all measurement checkpoints'}
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}

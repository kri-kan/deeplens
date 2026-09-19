import React, { useState } from 'react';
import { ScrollView, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuRuler, LuCheck, LuInfo, LuX } from 'react-icons/lu';
import { SizeChip } from '../../atoms/SizeChip/SizeChip';
import { BottomSheet } from '../../atoms/BottomSheet';
import { useTheme } from '../../../theme';
import {
  SizeOption,
  SizeCategoryType,
  SizeChartData,
} from '../../../data/catalog/types';
import {
  WOMEN_BLOUSE_CHART,
  KIDS_WEAR_CHART,
  SAREE_DRAPE_CHART,
} from '../../../data/catalog/sizePresets';

export type SizeSelectorProps = {
  sizes: (string | SizeOption)[];
  selected?: string;
  disabled?: string[];
  onSelect?: (size: string) => void;
  variant?: SizeCategoryType;
  showSizeChart?: boolean;
  customNotes?: string;
  category?: string;
};

export function SizeSelector({
  sizes,
  selected,
  disabled = [],
  onSelect,
  variant = 'letter',
  showSizeChart = true,
  customNotes,
  category,
}: SizeSelectorProps) {
  const { tokens } = useTheme();
  const [chartOpen, setChartOpen] = useState(false);
  const [chartUnit, setChartUnit] = useState<'in' | 'cm'>('in');

  // Normalize string array or SizeOption array
  const normalizedSizes: SizeOption[] = sizes.map((s) => {
    if (typeof s === 'string') {
      return {
        id: s,
        label: s,
        disabled: disabled.includes(s),
      };
    }
    return {
      ...s,
      disabled: s.disabled ?? disabled.includes(s.id) ?? disabled.includes(s.label),
    };
  });

  const isNoSize =
    variant === 'no-size' ||
    variant === 'free-size' ||
    (normalizedSizes.length === 1 &&
      (normalizedSizes[0].label.toLowerCase().includes('free size') ||
        normalizedSizes[0].label.toLowerCase().includes('one size')));

  // Select appropriate chart
  const resolvedChart: SizeChartData =
    variant === 'kids' || category?.toLowerCase().includes('kid')
      ? KIDS_WEAR_CHART
      : isNoSize || category?.toLowerCase().includes('saree')
      ? SAREE_DRAPE_CHART
      : WOMEN_BLOUSE_CHART;

  return (
    <YStack gap={10} width="100%">
      {/* Header Row */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" gap={6}>
          <Text
            fontSize={12}
            letterSpacing={1.2}
            textTransform="uppercase"
            color={tokens.textMuted}
            fontWeight="800"
          >
            {isNoSize ? 'Garment Size' : 'Select Size'}
          </Text>

          {selected && !isNoSize ? (
            <Text fontSize={12} fontWeight="800" color={tokens.accent}>
              : {selected}
            </Text>
          ) : null}
        </XStack>

        {showSizeChart && (
          <XStack
            alignItems="center"
            gap={4}
            cursor="pointer"
            onPress={() => setChartOpen(true)}
            hoverStyle={{ opacity: 0.8 }}
          >
            <LuRuler size={13} color={tokens.accent} />
            <Text
              fontSize={12}
              color={tokens.accent}
              fontWeight="700"
              hoverStyle={{ textDecorationLine: 'underline' }}
            >
              Size Chart
            </Text>
          </XStack>
        )}
      </XStack>

      {/* Chips Row */}
      {isNoSize ? (
        /* No Size: Informational Non-Selectable Badges / Buttons (One Size / Free Size) */
        <XStack flexWrap="wrap" gap={8} alignItems="center">
          {normalizedSizes.map((opt) => (
            <XStack
              key={opt.id}
              alignItems="center"
              gap={8}
              paddingHorizontal={12}
              paddingVertical={8}
              borderRadius={10}
              borderWidth={1.5}
              borderColor={tokens.accent}
              backgroundColor={`${tokens.accent}10`}
              cursor="default"
            >
              <LuInfo size={14} color={tokens.accent} />
              <YStack gap={1}>
                <XStack alignItems="center" gap={6}>
                  <Text fontSize={13} fontWeight="800" color={tokens.accent}>
                    {opt.label}
                  </Text>
                  {opt.badge && (
                    <XStack
                      backgroundColor="#FEF3C7"
                      paddingHorizontal={6}
                      paddingVertical={1.5}
                      borderRadius={4}
                    >
                      <Text fontSize={9} fontWeight="800" color="#B45309">
                        {opt.badge}
                      </Text>
                    </XStack>
                  )}
                </XStack>
                {opt.subtitle && (
                  <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                    {opt.subtitle}
                  </Text>
                )}
              </YStack>
            </XStack>
          ))}
        </XStack>
      ) : (
        /* Multi-size Selection Row (Letter, Numeric, Kids) */
        <XStack flexWrap="wrap" gap={8} alignItems="center">
          {normalizedSizes.map((opt) => (
            <SizeChip
              key={opt.id}
              label={opt.label}
              subtitle={opt.subtitle}
              badge={opt.badge}
              variant={variant === 'kids' || opt.subtitle ? 'detailed' : 'standard'}
              selected={selected === opt.id || selected === opt.label}
              disabled={opt.disabled}
              onPress={() => onSelect?.(opt.id)}
            />
          ))}
        </XStack>
      )}

      {/* Helpful Custom Fit Notes / Alteration Margin */}
      {customNotes ? (
        <XStack alignItems="center" gap={6} paddingTop={2}>
          <LuInfo size={13} color={tokens.textMuted} />
          <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
            {customNotes}
          </Text>
        </XStack>
      ) : null}

      {/* Interactive Size Chart BottomSheet / Modal */}
      <BottomSheet
        visible={chartOpen}
        onClose={() => setChartOpen(false)}
        title={resolvedChart.title}
        zIndex={400}
        maxHeight="85%"
      >
        <YStack gap={14} width="100%">
          {/* Subtitle description */}
          {resolvedChart.subtitle ? (
            <Text fontSize={12} color={tokens.textSecondary} lineHeight={17}>
              {resolvedChart.subtitle}
            </Text>
          ) : null}

          {/* Unit Switcher */}
          <XStack
            alignSelf="flex-start"
            backgroundColor={tokens.surfaceRaised}
            borderRadius={8}
            padding={3}
            gap={4}
            borderWidth={1}
            borderColor={tokens.border}
          >
            <Pressable onPress={() => setChartUnit('in')}>
              <XStack
                paddingHorizontal={12}
                paddingVertical={4}
                borderRadius={6}
                backgroundColor={chartUnit === 'in' ? tokens.accent : 'transparent'}
              >
                <Text
                  fontSize={11}
                  fontWeight="800"
                  color={chartUnit === 'in' ? tokens.accentForeground : tokens.textSecondary}
                >
                  Inches (in)
                </Text>
              </XStack>
            </Pressable>

            <Pressable onPress={() => setChartUnit('cm')}>
              <XStack
                paddingHorizontal={12}
                paddingVertical={4}
                borderRadius={6}
                backgroundColor={chartUnit === 'cm' ? tokens.accent : 'transparent'}
              >
                <Text
                  fontSize={11}
                  fontWeight="800"
                  color={chartUnit === 'cm' ? tokens.accentForeground : tokens.textSecondary}
                >
                  Centimeters (cm)
                </Text>
              </XStack>
            </Pressable>
          </XStack>

          {/* Measurement Table */}
          <YStack
            borderWidth={1}
            borderColor={tokens.border}
            borderRadius={12}
            overflow="hidden"
            backgroundColor={tokens.surface}
          >
            {/* Table Header */}
            <XStack
              backgroundColor={tokens.surfaceRaised}
              paddingVertical={10}
              paddingHorizontal={12}
              borderBottomWidth={1}
              borderBottomColor={tokens.border}
            >
              {resolvedChart.columns.map((col: { key: string; label: string }, idx: number) => (
                <Text
                  key={col.key}
                  flex={idx === 0 ? 1 : 1.2}
                  fontSize={11}
                  fontWeight="800"
                  color={tokens.text}
                  textTransform="uppercase"
                  letterSpacing={0.4}
                >
                  {col.label}
                </Text>
              ))}
            </XStack>

            {/* Table Rows */}
            <ScrollView style={{ maxHeight: 260 }}>
              {resolvedChart.rows.map((row: any, rIdx: number) => {
                const isEven = rIdx % 2 === 0;
                return (
                  <XStack
                    key={row.size || rIdx}
                    paddingVertical={9}
                    paddingHorizontal={12}
                    backgroundColor={isEven ? tokens.surface : tokens.surfaceRaised}
                    borderBottomWidth={rIdx === resolvedChart.rows.length - 1 ? 0 : 1}
                    borderBottomColor={tokens.border}
                    alignItems="center"
                  >
                    <Text flex={1} fontSize={12} fontWeight="800" color={tokens.accent}>
                      {row.label || row.size}
                    </Text>

                    {row.age ? (
                      <Text flex={1.2} fontSize={12} fontWeight="600" color={tokens.text}>
                        {row.age}
                      </Text>
                    ) : null}

                    {row.chestInches ? (
                      <Text flex={1.2} fontSize={12} color={tokens.text}>
                        {chartUnit === 'cm' && row.chestCm ? row.chestCm : row.chestInches}
                      </Text>
                    ) : null}

                    {row.lengthInches ? (
                      <Text flex={1.2} fontSize={12} color={tokens.textSecondary}>
                        {chartUnit === 'cm' && row.lengthCm ? row.lengthCm : row.lengthInches}
                      </Text>
                    ) : null}

                    {row.waistInches ? (
                      <Text flex={1.2} fontSize={12} color={tokens.textSecondary}>
                        {chartUnit === 'cm' && row.waistCm ? row.waistCm : row.waistInches}
                      </Text>
                    ) : null}

                    {row.shoulderInches ? (
                      <Text flex={1.2} fontSize={12} color={tokens.textSecondary}>
                        {chartUnit === 'cm' && row.shoulderCm ? row.shoulderCm : row.shoulderInches}
                      </Text>
                    ) : null}
                  </XStack>
                );
              })}
            </ScrollView>
          </YStack>

          {/* Measuring Tips */}
          {resolvedChart.tips && resolvedChart.tips.length > 0 ? (
            <YStack gap={4} paddingTop={4}>
              <Text fontSize={11} fontWeight="800" color={tokens.accent} letterSpacing={0.5} textTransform="uppercase">
                Helpful Measuring Notes
              </Text>
              {resolvedChart.tips.map((tip: string, idx: number) => (
                <XStack key={idx} alignItems="flex-start" gap={6}>
                  <Text fontSize={12} color={tokens.accent}>•</Text>
                  <Text fontSize={11} color={tokens.textSecondary} lineHeight={16} flex={1}>
                    {tip}
                  </Text>
                </XStack>
              ))}
            </YStack>
          ) : null}
        </YStack>
      </BottomSheet>
    </YStack>
  );
}

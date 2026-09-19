import React, { useState } from 'react';
import { ScrollView, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuRuler, LuCheck, LuInfo, LuX } from 'react-icons/lu';
import { SizeChip } from '../../atoms/SizeChip/SizeChip';
import { SizeChartModal } from '../SizeChart/SizeChartModal';
import { useTheme } from '../../../theme';
import {
  SizeOption,
  SizeCategoryType,
  SizeChartData,
} from '../../../data/catalog/types';
import { resolveSizeChartForProduct } from '../../../data/catalog/sizePresets';

export type SizeSelectorProps = {
  sizes: (string | SizeOption)[];
  selected?: string;
  disabled?: string[];
  onSelect?: (size: string) => void;
  variant?: SizeCategoryType;
  showSizeChart?: boolean;
  showHeader?: boolean;
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
  showHeader = true,
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
  const resolvedChart: SizeChartData = resolveSizeChartForProduct(category, variant);

  return (
    <YStack gap={10} width="100%">
      {/* Header Row */}
      {showHeader && (
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
      )}

      {/* Chips Row */}
      {isNoSize ? (
        /* No Size: Informational Non-Selectable Badges / Buttons (One Size / Free Size) */
        <XStack flexWrap="wrap" gap={8} alignItems="center" width="100%">
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
              maxWidth="100%"
            >
              <LuInfo size={14} color={tokens.accent} />
              <YStack gap={1} flex={1}>
                <XStack alignItems="center" gap={6} flexWrap="wrap">
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
                  <Text fontSize={11} color={tokens.textMuted} fontWeight="600" lineHeight={15}>
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

      {/* Interactive Size Chart Modal (Adapts across Mobile, Tablet, Desktop) */}
      <SizeChartModal
        visible={chartOpen}
        onClose={() => setChartOpen(false)}
        data={resolvedChart}
        category={category}
        variant={variant}
        selectedSize={selected}
        onSelectSize={onSelect}
      />
    </YStack>
  );
}

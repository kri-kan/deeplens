import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { SizeChip } from '../../atoms/SizeChip/SizeChip';
import { useTheme } from '../../../theme';

export type SizeSelectorProps = {
  sizes: string[];
  selected?: string;
  disabled?: string[];
  onSelect?: (size: string) => void;
};

export function SizeSelector({
  sizes,
  selected,
  disabled = [],
  onSelect,
}: SizeSelectorProps) {
  const { tokens } = useTheme();

  return (
    <YStack gap={10}>
      <XStack justifyContent="space-between" alignItems="center">
        <Text
          fontSize={12}
          letterSpacing={1.5}
          textTransform="uppercase"
          color={tokens.textMuted}
          fontWeight="800"
        >
          Select Size
        </Text>
        <Text
          fontSize={12}
          color={tokens.accent}
          fontWeight="700"
          cursor="pointer"
          hoverStyle={{ textDecorationLine: 'underline' }}
        >
          Size Chart 📏
        </Text>
      </XStack>

      <XStack flexWrap="wrap" gap={8}>
        {sizes.map((s) => (
          <SizeChip
            key={s}
            label={s}
            selected={selected === s}
            disabled={disabled.includes(s)}
            onPress={() => onSelect?.(s)}
          />
        ))}
      </XStack>
    </YStack>
  );
}

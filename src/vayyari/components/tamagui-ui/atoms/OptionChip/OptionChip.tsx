import React from 'react';
import { Pressable } from 'react-native';
import { XStack, Text } from 'tamagui';
import { LuCheck } from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';

export interface OptionChipProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  accessibilityLabel?: string;
  showCheckmark?: boolean;
  paddingHorizontal?: number;
  paddingVertical?: number;
}

export function OptionChip({
  label,
  selected,
  onSelect,
  accessibilityLabel,
  showCheckmark = true,
  paddingHorizontal = 14,
  paddingVertical = 8,
}: OptionChipProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onSelect}
      hitSlop={6}
      style={({ pressed }) => ({
        opacity: pressed ? 0.75 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <XStack
        paddingHorizontal={paddingHorizontal}
        paddingVertical={paddingVertical}
        borderRadius={tokens.radius.full}
        borderWidth={1.5}
        borderColor={selected ? tokens.accent : tokens.border}
        backgroundColor={selected ? `${tokens.accent}18` : tokens.surface}
        alignItems="center"
        justifyContent="center"
        gap={4}
        pointerEvents="none"
      >
        <Text
          fontSize={12}
          fontWeight={selected ? '800' : '600'}
          color={selected ? tokens.accent : tokens.text}
        >
          {label}
        </Text>
        {selected && showCheckmark && <LuCheck size={12} color={tokens.accent} />}
      </XStack>
    </Pressable>
  );
}

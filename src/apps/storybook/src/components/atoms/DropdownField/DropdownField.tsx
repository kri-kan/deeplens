import React from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuChevronDown } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface DropdownFieldProps {
  label: string;
  value: string;
  onPress: () => void;
  placeholder?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function DropdownField({
  label,
  value,
  onPress,
  placeholder = 'Select',
  accessibilityLabel,
  accessibilityHint = 'Tap to choose from list',
}: DropdownFieldProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      accessibilityRole="combobox"
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value || placeholder}`}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      hitSlop={4}
    >
      <YStack
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        paddingVertical={2}
        gap={1}
      >
        <Text fontSize={9} fontWeight="700" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.4}>
          {label}
        </Text>
        <XStack alignItems="center" justifyContent="space-between" height={22}>
          <Text fontSize={13} fontWeight="700" color={value ? tokens.text : tokens.textMuted} numberOfLines={1}>
            {value || placeholder}
          </Text>
          <LuChevronDown size={12} color={tokens.textMuted} />
        </XStack>
      </YStack>
    </Pressable>
  );
}

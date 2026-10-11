import React from 'react';
import { Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuChevronDown } from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';

export interface DropdownFieldProps {
  label: string;
  value: string;
  onPress: () => void;
  placeholder?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

export function DropdownField({
  label,
  value,
  onPress,
  placeholder = 'Select',
  accessibilityLabel,
  accessibilityHint = 'Tap to choose from list',
  disabled = false,
}: DropdownFieldProps) {
  const { tokens } = useTheme();

  return (
    <Pressable
      accessibilityRole="combobox"
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value || placeholder}`}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
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
          <Text
            fontSize={13}
            fontWeight="700"
            color={value ? (disabled ? tokens.textSecondary : tokens.text) : tokens.textMuted}
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
          {!disabled && <LuChevronDown size={12} color={tokens.textMuted} />}
        </XStack>
      </YStack>
    </Pressable>
  );
}

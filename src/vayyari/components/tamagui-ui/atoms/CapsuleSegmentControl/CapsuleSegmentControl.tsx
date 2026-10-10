import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme } from '@/theme';

export interface CapsuleSegmentOption<T extends string = string> {
  value: T;
  label: string;
  badge?: string;
}

export interface CapsuleSegmentControlProps<T extends string = string> {
  options: CapsuleSegmentOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  size?: 'sm' | 'md';
  allowDeselect?: boolean;
  accessibilityLabel?: string;
}

export function CapsuleSegmentControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  allowDeselect = false,
  accessibilityLabel,
}: CapsuleSegmentControlProps<T>) {
  const { tokens } = useTheme();

  const handleSelect = (val: T) => {
    if (allowDeselect && value === val) {
      onChange(null);
    } else {
      onChange(val);
    }
  };

  const isSmall = size === 'sm';

  return (
    <XStack
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius.full}
      borderWidth={1}
      borderColor={tokens.border}
      padding={3}
      gap={2}
      alignItems="center"
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <YStack
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={option.label}
            onPress={() => handleSelect(option.value)}
            paddingHorizontal={isSmall ? 12 : 16}
            paddingVertical={isSmall ? 5 : 7}
            borderRadius={tokens.radius.full}
            backgroundColor={isActive ? tokens.accent : 'transparent'}
            overflow="hidden"
            cursor="pointer"
            pressStyle={{ opacity: 0.85 }}
          >
            <XStack alignItems="center" gap={4}>
              <Text
                fontSize={isSmall ? 11 : 12}
                fontWeight="700"
                color={isActive ? tokens.accentForeground : tokens.textSecondary}
                letterSpacing={0.3}
              >
                {option.label}
              </Text>
              {option.badge && (
                <YStack
                  paddingHorizontal={5}
                  paddingVertical={1}
                  borderRadius={tokens.radius.full}
                  backgroundColor={isActive ? `${tokens.accentForeground}30` : tokens.border}
                >
                  <Text
                    fontSize={9}
                    fontWeight="800"
                    color={isActive ? tokens.accentForeground : tokens.textMuted}
                  >
                    {option.badge}
                  </Text>
                </YStack>
              )}
            </XStack>
          </YStack>
        );
      })}
    </XStack>
  );
}

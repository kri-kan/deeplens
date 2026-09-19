import React from 'react';
import { XStack, YStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export type SizeChipProps = {
  label: string;
  subtitle?: string;
  badge?: string;
  variant?: 'standard' | 'detailed' | 'wide';
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

export function SizeChip({
  label,
  subtitle,
  badge,
  variant = 'standard',
  selected = false,
  disabled = false,
  onPress,
}: SizeChipProps) {
  const { tokens } = useTheme();

  const isWide = variant === 'wide' || label.toLowerCase().includes('free size');
  const hasSubtitle = Boolean(subtitle);

  return (
    <XStack
      position="relative"
      minWidth={isWide ? 140 : hasSubtitle ? 64 : 52}
      height={hasSubtitle ? 48 : 42}
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={isWide ? 16 : hasSubtitle ? 10 : 12}
      paddingVertical={hasSubtitle ? 4 : 0}
      borderRadius={12}
      borderWidth={1}
      backgroundColor={
        disabled
          ? tokens.surfaceRaised
          : selected
          ? tokens.accent
          : tokens.surface
      }
      borderColor={
        disabled
          ? tokens.border
          : selected
          ? tokens.accent
          : tokens.border
      }
      opacity={disabled ? 0.45 : 1}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      onPress={disabled ? undefined : onPress}
      hoverStyle={
        disabled
          ? {}
          : {
              borderColor: tokens.accent,
              backgroundColor: selected ? tokens.accent : tokens.accentSubtle,
            }
      }
      pressStyle={disabled ? {} : { scale: 0.94 }}
    >
      <YStack alignItems="center" justifyContent="center" gap={1}>
        <Text
          fontSize={hasSubtitle ? 13 : 13}
          fontWeight="800"
          color={
            disabled
              ? tokens.textMuted
              : selected
              ? tokens.accentForeground
              : tokens.text
          }
          textDecorationLine={disabled ? 'line-through' : 'none'}
        >
          {label}
        </Text>

        {hasSubtitle ? (
          <Text
            fontSize={10}
            fontWeight="600"
            color={
              disabled
                ? tokens.textMuted
                : selected
                ? tokens.accentForeground
                : tokens.textSecondary
            }
            opacity={selected ? 0.9 : 0.85}
          >
            {subtitle}
          </Text>
        ) : null}
      </YStack>

      {/* Optional urgency/stock badge */}
      {badge && !disabled ? (
        <XStack
          position="absolute"
          top={-7}
          right={-4}
          backgroundColor={selected ? '#FFFFFF' : tokens.accent}
          paddingHorizontal={5}
          paddingVertical={1}
          borderRadius={9999}
          borderWidth={1}
          borderColor={tokens.border}
        >
          <Text
            fontSize={8}
            fontWeight="800"
            color={selected ? tokens.accent : tokens.accentForeground}
          >
            {badge}
          </Text>
        </XStack>
      ) : null}
    </XStack>
  );
}

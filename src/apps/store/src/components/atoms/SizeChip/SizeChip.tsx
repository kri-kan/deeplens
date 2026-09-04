import React from 'react';
import { XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export type SizeChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

export function SizeChip({
  label,
  selected = false,
  disabled = false,
  onPress,
}: SizeChipProps) {
  const { tokens } = useTheme();

  return (
    <XStack
      minWidth={52}
      height={42}
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={12}
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
      <Text
        fontSize={13}
        fontWeight="700"
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
    </XStack>
  );
}

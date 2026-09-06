import React from 'react';
import { XStack } from 'tamagui';
import { useTheme } from '../../../theme';

export type SwatchDotProps = {
  color: string;
  selected?: boolean;
  size?: number;
  onPress?: () => void;
};

export function SwatchDot({
  color,
  selected = false,
  size = 28,
  onPress,
}: SwatchDotProps) {
  const { tokens } = useTheme();

  return (
    <XStack
      width={size}
      height={size}
      borderRadius={9999}
      alignItems="center"
      justifyContent="center"
      backgroundColor={color}
      borderWidth={selected ? 2 : 1}
      borderColor={selected ? tokens.accent : 'rgba(0,0,0,0.1)'}
      outlineColor={selected ? tokens.accent : 'transparent'}
      outlineWidth={selected ? 2 : 0}
      outlineOffset={2}
      cursor="pointer"
      onPress={onPress}
      hoverStyle={{ scale: 1.12 }}
      pressStyle={{ scale: 0.9 }}
    />
  );
}

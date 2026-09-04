import React from 'react';
import { XStack } from 'tamagui';
import { useTheme } from '../../../theme';

export type CarouselDotProps = {
  active?: boolean;
  onPress?: () => void;
};

export function CarouselDot({ active = false, onPress }: CarouselDotProps) {
  const { tokens } = useTheme();

  return (
    <XStack
      width={active ? 24 : 8}
      height={8}
      borderRadius={9999}
      backgroundColor={active ? tokens.accent : tokens.border}
      borderColor={active ? tokens.accent : 'transparent'}
      borderWidth={1}
      cursor={onPress ? 'pointer' : 'default'}
      onPress={onPress}
      hoverStyle={onPress ? { opacity: 0.85, scale: 1.1 } : {}}
      pressStyle={onPress ? { scale: 0.9 } : {}}
    />
  );
}

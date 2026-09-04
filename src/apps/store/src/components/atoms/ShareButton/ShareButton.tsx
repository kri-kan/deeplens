import React from 'react';
import { XStack } from 'tamagui';
import { FiShare2 } from 'react-icons/fi';
import { useTheme } from '../../../theme';

export type ShareButtonProps = {
  size?: number;
  onPress?: () => void;
};

export function ShareButton({ size = 44, onPress }: ShareButtonProps) {
  const { tokens } = useTheme();

  return (
    <XStack
      width={size}
      height={size}
      borderRadius={12}
      borderWidth={1}
      alignItems="center"
      justifyContent="center"
      backgroundColor={tokens.surface}
      borderColor={tokens.border}
      cursor="pointer"
      onPress={onPress}
      hoverStyle={{
        borderColor: tokens.borderStrong,
        scale: 1.04,
        backgroundColor: tokens.surfaceRaised,
      }}
      pressStyle={{ scale: 0.94 }}
    >
      <FiShare2
        size={Math.round(size * 0.42)}
        color={tokens.text}
      />
    </XStack>
  );
}

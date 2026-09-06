import React from 'react';
import { XStack } from 'tamagui';
import { LuHeart } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type HeartButtonProps = {
  active?: boolean;
  size?: number;
  variant?: 'box' | 'plain';
  onPress?: () => void;
};

export function HeartButton({
  active = false,
  size = 44,
  variant = 'box',
  onPress,
}: HeartButtonProps) {
  const { tokens } = useTheme();
  const iconSize = variant === 'plain' ? Math.round(size * 0.68) : Math.round(size * 0.46);

  if (variant === 'plain') {
    return (
      <XStack
        width={size}
        height={size}
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        onPress={(e) => {
          e?.stopPropagation?.();
          onPress?.();
        }}
        hoverStyle={{ scale: 1.2 }}
        pressStyle={{ scale: 0.88 }}
        style={{
          filter: active
            ? 'drop-shadow(0 1px 4px rgba(229, 57, 53, 0.5))'
            : 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.7))',
        } as any}
      >
        <LuHeart
          size={iconSize}
          color={active ? '#e53935' : '#ffffff'}
          fill={active ? '#e53935' : 'none'}
          strokeWidth={2.4}
        />
      </XStack>
    );
  }

  return (
    <XStack
      width={size}
      height={size}
      borderRadius={12}
      borderWidth={1}
      alignItems="center"
      justifyContent="center"
      backgroundColor={active ? 'rgba(239, 68, 68, 0.12)' : tokens.surface}
      borderColor={active ? tokens.error : tokens.border}
      cursor="pointer"
      onPress={(e) => {
        e?.stopPropagation?.();
        onPress?.();
      }}
      hoverStyle={{
        borderColor: active ? tokens.error : tokens.borderStrong,
        scale: 1.05,
      }}
      pressStyle={{ scale: 0.92 }}
    >
      <LuHeart
        size={iconSize}
        color={active ? tokens.error : tokens.text}
        fill={active ? tokens.error : 'none'}
        strokeWidth={2}
      />
    </XStack>
  );
}

import React from 'react';
import { XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export type IconButtonProps = {
  icon: React.ReactNode;
  size?: number;
  active?: boolean;
  activeColor?: string;
  onPress?: () => void;
};

export function IconButton({
  icon,
  size = 44,
  active = false,
  activeColor,
  onPress,
}: IconButtonProps) {
  const { tokens } = useTheme();
  const highlightColor = activeColor || tokens.accent;

  return (
    <XStack
      width={size}
      height={size}
      borderRadius={12}
      borderWidth={1}
      alignItems="center"
      justifyContent="center"
      backgroundColor={active ? `${highlightColor}18` : tokens.surface}
      borderColor={active ? highlightColor : tokens.border}
      cursor="pointer"
      onPress={onPress}
      hoverStyle={{
        borderColor: highlightColor,
        scale: 1.04,
        backgroundColor: active ? `${highlightColor}22` : tokens.surfaceRaised,
      }}
      pressStyle={{ scale: 0.94 }}
    >
      {typeof icon === 'string' ? (
        <Text
          fontSize={Math.round(size * 0.42)}
          color={active ? highlightColor : tokens.text}
          userSelect="none"
        >
          {icon}
        </Text>
      ) : (
        icon
      )}
    </XStack>
  );
}

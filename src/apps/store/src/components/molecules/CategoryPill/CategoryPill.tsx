import React from 'react';
import { XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export type CategoryPillProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function CategoryPill({
  label,
  active = false,
  onPress,
}: CategoryPillProps) {
  const { tokens } = useTheme();

  return (
    <XStack
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={16}
      paddingVertical={9}
      borderRadius={9999}
      borderWidth={1}
      backgroundColor={active ? tokens.accent : tokens.surface}
      borderColor={active ? tokens.accent : tokens.border}
      cursor="pointer"
      onPress={onPress}
      hoverStyle={{
        borderColor: tokens.accent,
        scale: 1.03,
        backgroundColor: active ? tokens.accent : tokens.surfaceRaised,
      }}
      pressStyle={{ scale: 0.96 }}
    >
      <Text
        fontSize={13}
        fontWeight="700"
        letterSpacing={0.3}
        color={active ? tokens.accentForeground : tokens.text}
      >
        {label}
      </Text>
    </XStack>
  );
}

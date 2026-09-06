import React from 'react';
import { XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export type ChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function Chip({ label, active = false, onPress }: ChipProps) {
  const { tokens } = useTheme();

  return (
    <XStack
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={14}
      paddingVertical={7}
      borderRadius={9999}
      borderWidth={1}
      backgroundColor={active ? tokens.accentSubtle : tokens.surface}
      borderColor={active ? tokens.accent : tokens.border}
      cursor="pointer"
      onPress={onPress}
      hoverStyle={{
        borderColor: tokens.accent,
        backgroundColor: active ? tokens.accentSubtle : tokens.surfaceRaised,
      }}
      pressStyle={{ scale: 0.96 }}
    >
      <Text
        fontSize={12}
        fontWeight="700"
        letterSpacing={0.3}
        color={active ? tokens.accent : tokens.textSecondary}
      >
        {label}
      </Text>
    </XStack>
  );
}

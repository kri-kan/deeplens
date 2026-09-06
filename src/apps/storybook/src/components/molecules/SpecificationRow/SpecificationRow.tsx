import React from 'react';
import { XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export type SpecificationRowProps = {
  label: string;
  value: string;
  alt?: boolean;
};

export function SpecificationRow({
  label,
  value,
  alt = false,
}: SpecificationRowProps) {
  const { tokens } = useTheme();

  return (
    <XStack
      paddingHorizontal={16}
      paddingVertical={12}
      backgroundColor={alt ? tokens.surfaceRaised : tokens.surface}
      borderBottomWidth={1}
      borderBottomColor={tokens.border}
      alignItems="center"
      gap={12}
      hoverStyle={{
        backgroundColor: tokens.surfaceRaised,
      }}
    >
      <Text flex={1} fontSize={13} color={tokens.textSecondary} fontWeight="600">
        {label}
      </Text>
      <Text flex={1} fontSize={13} color={tokens.accent} fontWeight="700">
        {value}
      </Text>
    </XStack>
  );
}

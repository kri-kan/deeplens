import React from 'react';
import { YStack, Text } from 'tamagui';
import { SpecificationRow } from '../../molecules/SpecificationRow/SpecificationRow';
import { useTheme } from '../../../theme';

export type Spec = { label: string; value: string };

export type SpecificationsPanelProps = { specs: Spec[] };

export function SpecificationsPanel({ specs }: SpecificationsPanelProps) {
  const { tokens } = useTheme();

  return (
    <YStack paddingHorizontal={16} paddingTop={24} paddingBottom={12}>
      <Text fontSize={20} fontWeight="800" letterSpacing={-0.5} color={tokens.text} marginBottom={14}>
        Specifications &amp; Craft Details
      </Text>
      <YStack
        borderWidth={1}
        borderColor={tokens.border}
        borderRadius={16}
        overflow="hidden"
      >
        {specs.map((s, i) => (
          <SpecificationRow
            key={s.label}
            label={s.label}
            value={s.value}
            alt={i % 2 === 1}
          />
        ))}
      </YStack>
    </YStack>
  );
}

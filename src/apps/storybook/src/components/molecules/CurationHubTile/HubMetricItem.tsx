import React from 'react';
import { XStack, Text } from 'tamagui';

export interface HubMetricItemProps {
  icon?: React.ReactNode;
  label: string | number;
  color?: string;
  fontWeight?: '500' | '600' | '700' | '800' | '900';
  fontSize?: number;
  gap?: number;
}

export function HubMetricItem({
  icon,
  label,
  color = '#1E293B',
  fontWeight = '800',
  fontSize = 11,
  gap = 4,
}: HubMetricItemProps) {
  return (
    <XStack alignItems="center" gap={gap}>
      {icon}
      <Text fontSize={fontSize} fontWeight={fontWeight} color={color}>
        {label}
      </Text>
    </XStack>
  );
}

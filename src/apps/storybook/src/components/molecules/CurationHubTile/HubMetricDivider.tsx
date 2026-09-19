import React from 'react';
import { Text } from 'tamagui';

export interface HubMetricDividerProps {
  color?: string;
  marginHorizontal?: number;
}

export function HubMetricDivider({
  color = '#CBD5E1',
  marginHorizontal = 2,
}: HubMetricDividerProps) {
  return (
    <Text
      fontSize={11}
      fontWeight="400"
      color={color}
      marginHorizontal={marginHorizontal}
      userSelect="none"
    >
      |
    </Text>
  );
}

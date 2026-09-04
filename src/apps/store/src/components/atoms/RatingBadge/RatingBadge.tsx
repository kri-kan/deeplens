import React from 'react';
import { XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export type RatingBadgeProps = {
  rating: number;
  count?: number;
};

export function RatingBadge({ rating, count }: RatingBadgeProps) {
  const { tokens } = useTheme();

  const getColor = (r: number) => {
    if (r >= 4.0) return tokens.success;
    if (r >= 3.0) return tokens.warning;
    return tokens.error;
  };

  const starColor = getColor(rating);

  return (
    <XStack
      alignSelf="flex-start"
      alignItems="center"
      gap={4}
      backgroundColor={tokens.surface}
      borderColor={tokens.border}
      borderWidth={1}
      borderRadius={8}
      paddingHorizontal={7}
      paddingVertical={3}
      hoverStyle={{ scale: 1.03 }}
    >
      <Text fontSize={11} fontWeight="800" color={starColor}>
        {rating.toFixed(1)} ★
      </Text>
      {count !== undefined ? (
        <Text fontSize={10} color={tokens.textMuted} fontWeight="500">
          ({count})
        </Text>
      ) : null}
    </XStack>
  );
}

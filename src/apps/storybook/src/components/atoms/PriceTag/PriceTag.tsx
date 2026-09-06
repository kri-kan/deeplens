import React from 'react';
import { XStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';
import { Badge } from '../Badge/Badge';

export type PriceTagProps = {
  price: number;
  originalPrice?: number;
  offPercent?: number;
  size?: 'sm' | 'md' | 'lg';
};

const sizeMap = {
  sm: { current: 14, original: 11, gap: 6 },
  md: { current: 18, original: 13, gap: 8 },
  lg: { current: 28, original: 18, gap: 10 },
};

export function PriceTag({ price, originalPrice, offPercent, size = 'md' }: PriceTagProps) {
  const { tokens } = useTheme();
  const cfg = sizeMap[size];

  return (
    <XStack alignItems="baseline" gap={cfg.gap} flexWrap="wrap">
      <Text
        fontSize={cfg.current}
        fontWeight="800"
        color={originalPrice ? tokens.priceDiscounted : tokens.text}
        letterSpacing={-0.4}
      >
        ₹{price.toLocaleString('en-IN')}
      </Text>

      {originalPrice && originalPrice > price ? (
        <Text
          fontSize={cfg.original}
          color={tokens.priceOriginal}
          textDecorationLine="line-through"
          fontWeight="500"
        >
          ₹{originalPrice.toLocaleString('en-IN')}
        </Text>
      ) : null}

      {offPercent ? (
        <Badge
          label={`${offPercent}% OFF`}
          variant="offer"
          size={size === 'lg' ? 'md' : 'sm'}
        />
      ) : null}
    </XStack>
  );
}

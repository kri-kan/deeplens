import React from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { HorizontalProductCard } from '../../molecules/HorizontalProductCard/HorizontalProductCard';
import { Badge } from '../../atoms/Badge/Badge';
import { useTheme } from '../../../theme';

export type HProduct = {
  id: string;
  brand: string;
  name: string;
  price: number;
  originalPrice?: number;
  offPercent?: number;
  rating?: number;
  gradient?: [string, string];
};

export type HorizontalProductStripProps = {
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  products: HProduct[];
  showAddToBag?: boolean;
};

export function HorizontalProductStrip({
  title,
  subtitle,
  badgeLabel,
  products,
  showAddToBag = false,
}: HorizontalProductStripProps) {
  const { tokens } = useTheme();

  return (
    <YStack paddingHorizontal={16} paddingTop={24} paddingBottom={12} alignSelf="flex-start" width="100%">
      <XStack alignItems="center" gap={10} marginBottom={4}>
        <Text fontSize={22} fontWeight="800" letterSpacing={-0.5} color={tokens.text}>
          {title}
        </Text>
        {badgeLabel ? <Badge label={badgeLabel} variant="sponsored" /> : null}
      </XStack>

      {subtitle ? (
        <Text fontSize={13} color={tokens.accent} fontWeight="600" marginBottom={12}>
          {subtitle}
        </Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ gap: 14, paddingRight: 16, alignItems: 'flex-start' }}
      >
        {products.map((p) => (
          <HorizontalProductCard
            key={p.id}
            brand={p.brand}
            name={p.name}
            price={p.price}
            originalPrice={p.originalPrice}
            offPercent={p.offPercent}
            rating={p.rating}
            gradient={p.gradient}
            showAddToBag={showAddToBag}
          />
        ))}
      </ScrollView>
    </YStack>
  );
}

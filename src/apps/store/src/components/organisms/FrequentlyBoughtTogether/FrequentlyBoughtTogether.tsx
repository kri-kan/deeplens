import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { FrequentlyBoughtRow } from '../../molecules/FrequentlyBoughtRow/FrequentlyBoughtRow';
import { useTheme } from '../../../theme';

export type FBTItem = {
  id: string;
  brand: string;
  name: string;
  price: string;
  originalPrice?: string;
  offLabel?: string;
  gradient: [string, string];
  checked?: boolean;
};

export type FrequentlyBoughtTogetherProps = {
  items: FBTItem[];
  totalOriginal: string;
  totalPrice: string;
  totalOff: string;
  onAddAll?: () => void;
};

export function FrequentlyBoughtTogether({
  items,
  totalOriginal,
  totalPrice,
  totalOff,
  onAddAll,
}: FrequentlyBoughtTogetherProps) {
  const { tokens } = useTheme();

  return (
    <YStack
      paddingHorizontal={16}
      paddingTop={24}
      paddingBottom={16}
      backgroundColor={tokens.surface}
      borderWidth={1}
      borderColor={tokens.border}
      borderRadius={16}
    >
      <Text fontSize={20} fontWeight="800" letterSpacing={-0.5} color={tokens.text} marginBottom={8}>
        Frequently Bought Together
      </Text>

      {items.map((item) => (
        <FrequentlyBoughtRow
          key={item.id}
          brand={item.brand}
          name={item.name}
          price={item.price}
          originalPrice={item.originalPrice}
          offLabel={item.offLabel}
          gradient={item.gradient}
          checked={item.checked ?? true}
        />
      ))}

      <XStack
        alignItems="center"
        justifyContent="space-between"
        marginTop={18}
        gap={12}
        flexWrap="wrap"
      >
        <YStack gap={2}>
          <Text fontSize={12} color={tokens.textSecondary}>
            Total Price ({items.length} Items):
          </Text>
          <Text
            fontSize={12}
            color={tokens.priceOriginal}
            textDecorationLine="line-through"
          >
            {totalOriginal}
          </Text>
          <XStack alignItems="baseline" gap={6}>
            <Text fontSize={20} fontWeight="800" color={tokens.text} letterSpacing={-0.5}>
              {totalPrice}
            </Text>
            <Text fontSize={13} fontWeight="700" color={tokens.success}>
              ({totalOff})
            </Text>
          </XStack>
        </YStack>

        <XStack
          height={46}
          paddingHorizontal={20}
          borderRadius={9999}
          borderWidth={1.5}
          borderColor={tokens.accent}
          backgroundColor={tokens.surface}
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onPress={onAddAll}
          hoverStyle={{
            backgroundColor: tokens.accent,
          }}
          pressStyle={{ scale: 0.96 }}
        >
          <Text color={tokens.accent} fontWeight="800" fontSize={14}>
            Add {items.length} items to Bag
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}

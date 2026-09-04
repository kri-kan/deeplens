import React from 'react';
import { XStack, YStack, Text } from 'tamagui';
import { useTheme } from '../../../theme';

export type StickyAddToBagBarProps = {
  price: string;
  title: string;
  onAddToBag?: () => void;
};

export function StickyAddToBagBar({
  price,
  title,
  onAddToBag,
}: StickyAddToBagBarProps) {
  const { tokens } = useTheme();

  return (
    <XStack
      height={70}
      backgroundColor={tokens.surface}
      borderTopWidth={1}
      borderTopColor={tokens.border}
      alignItems="center"
      paddingHorizontal={20}
      gap={14}
      shadowColor="#000000"
      shadowOpacity={0.1}
      shadowRadius={16}
      shadowOffset={{ width: 0, height: -4 }}
    >
      <YStack flex={1} justifyContent="center">
        <Text fontSize={18} fontWeight="800" color={tokens.text} letterSpacing={-0.4}>
          {price}
        </Text>
        <Text fontSize={12} color={tokens.textSecondary} fontWeight="600" numberOfLines={1}>
          {title}
        </Text>
      </YStack>

      <XStack
        height={48}
        paddingHorizontal={24}
        backgroundColor={tokens.accent}
        borderRadius={9999}
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        onPress={onAddToBag}
        hoverStyle={{
          opacity: 0.92,
          scale: 1.02,
        }}
        pressStyle={{ scale: 0.96 }}
      >
        <Text
          color={tokens.accentForeground}
          fontWeight="800"
          fontSize={15}
          letterSpacing={0.2}
        >
          🛍 Add to Bag
        </Text>
      </XStack>
    </XStack>
  );
}

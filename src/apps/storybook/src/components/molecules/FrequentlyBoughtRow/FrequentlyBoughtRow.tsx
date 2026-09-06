import React from 'react';
import { XStack, YStack, Text } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme';

export type FrequentlyBoughtRowProps = {
  brand: string;
  name: string;
  price: string;
  originalPrice?: string;
  offLabel?: string;
  gradient: [string, string];
  checked?: boolean;
  onToggle?: () => void;
};

export function FrequentlyBoughtRow({
  brand,
  name,
  price,
  originalPrice,
  offLabel,
  gradient,
  checked = true,
  onToggle,
}: FrequentlyBoughtRowProps) {
  const { tokens } = useTheme();

  return (
    <XStack
      alignItems="center"
      gap={12}
      paddingVertical={14}
      borderBottomWidth={1}
      borderBottomColor={tokens.border}
      cursor={onToggle ? 'pointer' : 'default'}
      onPress={onToggle}
      hoverStyle={onToggle ? { backgroundColor: tokens.surfaceRaised } : {}}
    >
      <LinearGradient
        colors={gradient}
        style={{
          width: 72,
          height: 90,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: tokens.border,
        }}
      />

      <YStack flex={1} gap={4}>
        <Text fontSize={13} fontWeight="800" color={tokens.text}>
          {brand}
        </Text>
        <Text fontSize={13} color={tokens.textSecondary} numberOfLines={1}>
          {name}
        </Text>
        <XStack alignItems="center" gap={6} flexWrap="wrap">
          {originalPrice ? (
            <Text
              fontSize={12}
              color={tokens.priceOriginal}
              textDecorationLine="line-through"
            >
              {originalPrice}
            </Text>
          ) : null}
          <Text fontSize={14} fontWeight="800" color={tokens.text}>
            {price}
          </Text>
          {offLabel ? (
            <Text fontSize={12} color={tokens.success} fontWeight="700">
              {offLabel}
            </Text>
          ) : null}
        </XStack>
      </YStack>

      <XStack
        width={24}
        height={24}
        borderRadius={6}
        borderWidth={2}
        borderColor={checked ? tokens.accent : tokens.border}
        backgroundColor={checked ? tokens.accent : 'transparent'}
        alignItems="center"
        justifyContent="center"
      >
        {checked ? (
          <Text fontSize={13} color={tokens.accentForeground} fontWeight="800">
            ✓
          </Text>
        ) : null}
      </XStack>
    </XStack>
  );
}

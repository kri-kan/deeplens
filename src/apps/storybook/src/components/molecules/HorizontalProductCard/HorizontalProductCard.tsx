import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme';
import { RatingBadge } from '../../atoms/RatingBadge/RatingBadge';
import { PriceTag } from '../../atoms/PriceTag/PriceTag';

export type HorizontalProductCardProps = {
  brand: string;
  name: string;
  price: number;
  originalPrice?: number;
  offPercent?: number;
  rating?: number;
  gradient?: [string, string];
  showAddToBag?: boolean;
  onAddToBag?: () => void;
  onPress?: () => void;
};

export function HorizontalProductCard({
  brand,
  name,
  price,
  originalPrice,
  offPercent,
  rating,
  gradient = ['#f3e6d8', '#d3aa75'],
  showAddToBag = false,
  onAddToBag,
  onPress,
}: HorizontalProductCardProps) {
  const { tokens } = useTheme();

  return (
    <YStack
      width={164}
      alignSelf="flex-start"
      flexShrink={0}
      backgroundColor={tokens.surface}
      borderWidth={1}
      borderColor={tokens.border}
      borderRadius={16}
      overflow="hidden"
      cursor="pointer"
      onPress={onPress}
      hoverStyle={{
        y: -4,
        borderColor: tokens.accent,
        shadowColor: '#000000',
        shadowOpacity: 0.12,
        shadowRadius: 16,
      }}
      pressStyle={{ scale: 0.98 }}
    >
      {/* Product Image Canvas */}
      <YStack height={200} position="relative">
        <LinearGradient
          colors={gradient}
          style={{ width: '100%', height: '100%' }}
        />
        {rating != null ? (
          <XStack position="absolute" bottom={8} left={8}>
            <RatingBadge rating={rating} />
          </XStack>
        ) : null}
      </YStack>

      {/* Info Body with Uniform Locked Heights */}
      <YStack padding={12} gap={6}>
        {/* Brand Name (Single Line) */}
        <Text
          fontSize={12}
          fontWeight="800"
          color={tokens.text}
          letterSpacing={0.2}
          numberOfLines={1}
        >
          {brand}
        </Text>

        {/* Product Title: Fixed 2-Line Height Container (Ellipsis for >2 lines, Blank Space for 1 line) */}
        <YStack height={34} justifyContent="flex-start">
          <Text
            fontSize={12}
            color={tokens.textSecondary}
            lineHeight={17}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {name}
          </Text>
        </YStack>

        {/* Pricing Area with Fixed Min-Height so all cards align evenly */}
        <YStack minHeight={42} justifyContent="flex-start">
          <PriceTag
            price={price}
            originalPrice={originalPrice}
            offPercent={offPercent}
            size="sm"
          />
        </YStack>

        {/* Optional Add to Bag CTA Button */}
        {showAddToBag ? (
          <XStack
            marginTop={4}
            height={32}
            borderRadius={9999}
            borderWidth={1}
            borderColor={tokens.accent}
            backgroundColor={tokens.surface}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            onPress={(e) => {
              e.stopPropagation();
              onAddToBag?.();
            }}
            hoverStyle={{ backgroundColor: tokens.accent }}
            pressStyle={{ scale: 0.95 }}
          >
            <Text fontSize={12} fontWeight="700" color={tokens.accent}>
              Add to Bag
            </Text>
          </XStack>
        ) : null}
      </YStack>
    </YStack>
  );
}

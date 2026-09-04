import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { LuX, LuShare2, LuShoppingBag, LuBell } from 'react-icons/lu';
import { useTheme, useResponsive } from '../../../theme';
import { CustomSwatchDot, SwatchTemplateType } from '../../atoms/SwatchDot/CustomSwatchDot';

export type WishlistItemData = {
  id: string;
  category: string;
  brand: string;
  name: string;
  colorName: string;
  colorTemplate?: SwatchTemplateType;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  quaternaryColor?: string;
  price: number;
  originalPrice: number;
  gradient: [string, string];
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  stockLeft?: number;
};

export type WishlistCardProps = {
  item: WishlistItemData;
  onMoveToBag?: (item: WishlistItemData) => void;
  onRemove?: (id: string) => void;
  onShare?: (item: WishlistItemData) => void;
  onNotifyMe?: (item: WishlistItemData) => void;
  onClickItem?: (id: string) => void;
};

export function WishlistCard({
  item,
  onMoveToBag,
  onRemove,
  onShare,
  onNotifyMe,
  onClickItem,
}: WishlistCardProps) {
  const { tokens } = useTheme();
  const { isMobile } = useResponsive();

  const isOutOfStock = item.stockStatus === 'out_of_stock';
  const isLowStock = item.stockStatus === 'low_stock';
  const discountPercent = Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100);

  return (
    <YStack
      width="100%"
      backgroundColor={tokens.surface}
      borderColor={tokens.border}
      borderWidth={1}
      borderRadius={16}
      overflow="hidden"
      position="relative"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={0.04}
      shadowRadius={8}
      hoverStyle={{ borderColor: tokens.borderStrong, translateY: -2 }}
    >
      {/* Top Floating Action Buttons (Remove X & Share) */}
      <XStack
        position="absolute"
        top={10}
        right={10}
        zIndex={20}
        gap={6}
        alignItems="center"
      >
        {/* Share Button */}
        <XStack
          width={30}
          height={30}
          borderRadius={15}
          backgroundColor="rgba(255, 255, 255, 0.9)"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onPress={(e) => {
            e.stopPropagation();
            onShare?.(item);
          }}
          hoverStyle={{ scale: 1.1, backgroundColor: '#ffffff' }}
          pressStyle={{ scale: 0.92 }}
        >
          <LuShare2 size={15} color="#222222" />
        </XStack>

        {/* Remove Button */}
        <XStack
          width={30}
          height={30}
          borderRadius={15}
          backgroundColor="rgba(255, 255, 255, 0.9)"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onPress={(e) => {
            e.stopPropagation();
            onRemove?.(item.id);
          }}
          hoverStyle={{ scale: 1.1, backgroundColor: '#ffffff' }}
          pressStyle={{ scale: 0.92 }}
        >
          <LuX size={16} color="#222222" />
        </XStack>
      </XStack>

      {/* Saree Picture / Gradient Container (3:4 ratio) */}
      <YStack
        width="100%"
        aspectRatio={3 / 4}
        position="relative"
        cursor="pointer"
        onPress={() => onClickItem?.(item.id)}
      >
        <LinearGradient
          colors={item.gradient}
          style={{ width: '100%', height: '100%' }}
        />

        {/* Out of stock dark overlay */}
        {isOutOfStock && (
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0, 0, 0, 0.45)"
            alignItems="center"
            justifyContent="center"
            gap={4}
          >
            <Text fontSize={13} fontWeight="900" color="#ffffff" letterSpacing={1.2} textTransform="uppercase">
              SOLD OUT
            </Text>
            <Text fontSize={11} color="rgba(255,255,255,0.85)">
              Crafting Next Batch
            </Text>
          </YStack>
        )}

        {/* Stock / Scarcity Badge Top-Left */}
        {isLowStock && (
          <XStack
            position="absolute"
            top={10}
            left={10}
            backgroundColor="rgba(230, 74, 25, 0.92)"
            paddingHorizontal={8}
            paddingVertical={3}
            borderRadius={6}
            zIndex={10}
          >
            <Text fontSize={10} fontWeight="800" color="#ffffff">
              ⚡ Only {item.stockLeft || 2} Left
            </Text>
          </XStack>
        )}

        {/* Swatch Dot Pill Bottom-Left */}
        <XStack
          position="absolute"
          bottom={8}
          left={8}
          backgroundColor="rgba(0, 0, 0, 0.6)"
          paddingHorizontal={8}
          paddingVertical={3}
          borderRadius={12}
          alignItems="center"
          gap={6}
          zIndex={10}
        >
          <CustomSwatchDot
            template={item.colorTemplate || 'solid'}
            primaryColor={item.primaryColor || item.colorName}
            secondaryColor={item.secondaryColor}
            tertiaryColor={item.tertiaryColor}
            quaternaryColor={item.quaternaryColor}
            size={12}
          />
          <Text fontSize={10} fontWeight="700" color="#ffffff">
            {item.colorName}
          </Text>
        </XStack>
      </YStack>

      {/* Saree Details & Pricing */}
      <YStack padding={isMobile ? 10 : 14} gap={6}>
        <Text
          fontSize={11}
          fontWeight="800"
          color={tokens.textMuted}
          textTransform="uppercase"
          letterSpacing={0.8}
        >
          {item.brand}
        </Text>

        <Text
          fontSize={13}
          fontWeight="600"
          color={tokens.text}
          numberOfLines={1}
          ellipsizeMode="tail"
          cursor="pointer"
          onPress={() => onClickItem?.(item.id)}
          hoverStyle={{ color: tokens.accent }}
        >
          {item.name}
        </Text>

        {/* Pricing Row */}
        <XStack alignItems="baseline" gap={8} marginTop={2} flexWrap="wrap">
          <Text fontSize={15} fontWeight="900" color={tokens.text}>
            ₹{item.price.toLocaleString('en-IN')}
          </Text>
          {item.originalPrice > item.price && (
            <>
              <Text fontSize={12} color={tokens.textMuted} textDecorationLine="line-through">
                ₹{item.originalPrice.toLocaleString('en-IN')}
              </Text>
              <Text fontSize={11} fontWeight="800" color="#e53935">
                ({discountPercent}% OFF)
              </Text>
            </>
          )}
        </XStack>
      </YStack>

      {/* Bottom Action Button (Move to Bag / Notify Me) */}
      <YStack borderTopWidth={1} borderTopColor={tokens.border}>
        {isOutOfStock ? (
          <XStack
            cursor="pointer"
            height={44}
            backgroundColor={tokens.surfaceRaised}
            alignItems="center"
            justifyContent="center"
            gap={6}
            onPress={() => onNotifyMe?.(item)}
            hoverStyle={{ backgroundColor: tokens.border }}
          >
            <LuBell size={14} color={tokens.text} />
            <Text fontSize={12} fontWeight="800" color={tokens.text} letterSpacing={0.5}>
              NOTIFY WHEN AVAILABLE
            </Text>
          </XStack>
        ) : (
          <XStack
            cursor="pointer"
            height={44}
            backgroundColor="transparent"
            alignItems="center"
            justifyContent="center"
            gap={6}
            onPress={() => onMoveToBag?.(item)}
            hoverStyle={{ backgroundColor: 'rgba(229, 57, 53, 0.08)' }}
            pressStyle={{ scale: 0.98 }}
          >
            <LuShoppingBag size={15} color="#e53935" />
            <Text fontSize={12} fontWeight="900" color="#e53935" letterSpacing={0.8}>
              MOVE TO BAG
            </Text>
          </XStack>
        )}
      </YStack>
    </YStack>
  );
}

import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { LuX, LuChevronDown, LuRotateCcw, LuCheck, LuInfo } from 'react-icons/lu';
import { useTheme, useResponsive } from '../../../theme';
import { CustomSwatchDot, SwatchTemplateType } from '../../atoms/SwatchDot/CustomSwatchDot';

export type CartItemData = {
  id: string;
  brand: string;
  name: string;
  seller?: string;
  colorName: string;
  colorTemplate?: SwatchTemplateType;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  quaternaryColor?: string;
  size: string;
  availableSizes?: string[];
  quantity: number;
  maxQuantity?: number;
  price: number;
  originalPrice: number;
  gradient: [string, string];
  returnDays?: number;
  stockLeft?: number;
  selected?: boolean;
};

export type MyntraStyleCartItemProps = {
  item: CartItemData;
  onToggleSelect?: (id: string) => void;
  onQuantityChange?: (id: string, newQty: number) => void;
  onSizeChange?: (id: string, newSize: string) => void;
  onRemove?: (id: string) => void;
  onMoveToWishlist?: (id: string) => void;
};

export function MyntraStyleCartItem({
  item,
  onToggleSelect,
  onQuantityChange,
  onSizeChange,
  onRemove,
  onMoveToWishlist,
}: MyntraStyleCartItemProps) {
  const { tokens } = useTheme();
  const { isMobile } = useResponsive();

  const [isSizePickerOpen, setIsSizePickerOpen] = useState(false);
  const [isQtyPickerOpen, setIsQtyPickerOpen] = useState(false);

  const discountAmount = item.originalPrice - item.price;
  const discountPercent = Math.round((discountAmount / item.originalPrice) * 100);

  const availableSizes = item.availableSizes || ['Free Size', 'XS', 'S', 'M', 'L', 'XL'];
  const maxQty = item.maxQuantity || 5;

  return (
    <YStack
      width="100%"
      backgroundColor={tokens.surface}
      borderColor={tokens.border}
      borderWidth={1}
      borderRadius={16}
      padding={isMobile ? 12 : 16}
      position="relative"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={0.03}
      shadowRadius={8}
    >
      {/* Top Right Close Button */}
      <XStack
        position="absolute"
        top={isMobile ? 10 : 14}
        right={isMobile ? 10 : 14}
        zIndex={10}
        cursor="pointer"
        padding={6}
        borderRadius={20}
        onPress={() => onRemove?.(item.id)}
        hoverStyle={{ backgroundColor: tokens.surfaceRaised }}
      >
        <LuX size={18} color={tokens.textMuted} />
      </XStack>

      <XStack gap={isMobile ? 10 : 14} alignItems="flex-start">
        {/* Checkbox */}
        <XStack
          cursor="pointer"
          width={20}
          height={20}
          borderRadius={4}
          borderWidth={1.5}
          borderColor={item.selected ? '#e53935' : tokens.borderStrong}
          backgroundColor={item.selected ? '#e53935' : 'transparent'}
          alignItems="center"
          justifyContent="center"
          marginTop={6}
          onPress={() => onToggleSelect?.(item.id)}
        >
          {item.selected && <LuCheck size={14} color="#ffffff" strokeWidth={3} />}
        </XStack>

        {/* 3:4 Product Photograph Gradient Thumbnail */}
        <YStack
          width={isMobile ? 86 : 104}
          height={isMobile ? 114 : 138}
          borderRadius={10}
          overflow="hidden"
          position="relative"
          borderWidth={1}
          borderColor={tokens.border}
          flexShrink={0}
        >
          <LinearGradient
            colors={item.gradient}
            style={{ width: '100%', height: '100%' }}
          />

          {/* Color swatch dot pill in bottom-left */}
          <XStack
            position="absolute"
            bottom={4}
            left={4}
            backgroundColor="rgba(0,0,0,0.5)"
            paddingHorizontal={6}
            paddingVertical={2}
            borderRadius={10}
            alignItems="center"
            gap={4}
          >
            <CustomSwatchDot
              template={item.colorTemplate || 'solid'}
              primaryColor={item.primaryColor || item.colorName}
              secondaryColor={item.secondaryColor}
              tertiaryColor={item.tertiaryColor}
              quaternaryColor={item.quaternaryColor}
              size={10}
            />
            <Text fontSize={9} fontWeight="700" color="#ffffff">
              {item.colorName}
            </Text>
          </XStack>
        </YStack>

        {/* Product Details Column */}
        <YStack flex={1} gap={6} paddingRight={24}>
          {/* Brand Name */}
          <Text fontSize={14} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
            {item.brand}
          </Text>

          {/* Saree Title */}
          <Text
            fontSize={13}
            fontWeight="500"
            color={tokens.textSecondary}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>

          {/* Seller Tag */}
          <Text fontSize={11} color={tokens.textMuted}>
            Sold by: {item.seller || 'VAYYARI Artisan Guild'}
          </Text>

          {/* Size & Quantity Selector Chips */}
          <XStack gap={8} alignItems="center" marginTop={2} flexWrap="wrap">
            {/* Size Dropdown Chip */}
            <XStack
              cursor="pointer"
              paddingHorizontal={8}
              paddingVertical={4}
              borderRadius={6}
              backgroundColor={tokens.surfaceRaised}
              borderWidth={1}
              borderColor={tokens.border}
              alignItems="center"
              gap={4}
              onPress={() => setIsSizePickerOpen((o) => !o)}
              hoverStyle={{ borderColor: tokens.accent }}
            >
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                Size: {item.size}
              </Text>
              <LuChevronDown size={12} color={tokens.textSecondary} />
            </XStack>

            {/* Qty Dropdown Chip */}
            <XStack
              cursor="pointer"
              paddingHorizontal={8}
              paddingVertical={4}
              borderRadius={6}
              backgroundColor={tokens.surfaceRaised}
              borderWidth={1}
              borderColor={tokens.border}
              alignItems="center"
              gap={4}
              onPress={() => setIsQtyPickerOpen((o) => !o)}
              hoverStyle={{ borderColor: tokens.accent }}
            >
              <Text fontSize={12} fontWeight="700" color={tokens.text}>
                Qty: {item.quantity}
              </Text>
              <LuChevronDown size={12} color={tokens.textSecondary} />
            </XStack>

            {/* Low Stock Badge */}
            {item.stockLeft !== undefined && item.stockLeft <= 5 && (
              <XStack
                paddingHorizontal={6}
                paddingVertical={2}
                borderRadius={4}
                backgroundColor="rgba(255, 112, 67, 0.12)"
              >
                <Text fontSize={11} fontWeight="800" color="#e64a19">
                  {item.stockLeft} left
                </Text>
              </XStack>
            )}
          </XStack>

          {/* Pricing Row */}
          <XStack alignItems="baseline" gap={8} marginTop={4} flexWrap="wrap">
            <Text fontSize={15} fontWeight="800" color={tokens.text}>
              ₹{item.price.toLocaleString('en-IN')}
            </Text>
            {item.originalPrice > item.price && (
              <>
                <Text
                  fontSize={13}
                  color={tokens.textMuted}
                  textDecorationLine="line-through"
                >
                  ₹{item.originalPrice.toLocaleString('en-IN')}
                </Text>
                <Text fontSize={12} fontWeight="800" color="#e53935">
                  ₹{discountAmount.toLocaleString('en-IN')} OFF ({discountPercent}%)
                </Text>
              </>
            )}
          </XStack>

          {/* Return Policy Note */}
          <XStack alignItems="center" gap={6} marginTop={2}>
            <LuRotateCcw size={12} color={tokens.textMuted} />
            <Text fontSize={11} color={tokens.textSecondary}>
              <Text fontWeight="700" color={tokens.text}>{item.returnDays || 7} days</Text> return available
            </Text>
          </XStack>
        </YStack>
      </XStack>

      {/* Size Picker Dropdown Sheet/Menu */}
      {isSizePickerOpen && (
        <YStack
          marginTop={12}
          padding={10}
          backgroundColor={tokens.background}
          borderRadius={8}
          borderWidth={1}
          borderColor={tokens.border}
          gap={8}
        >
          <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
            Select Size:
          </Text>
          <XStack gap={8} flexWrap="wrap">
            {availableSizes.map((s) => (
              <XStack
                key={s}
                paddingHorizontal={12}
                paddingVertical={6}
                borderRadius={6}
                cursor="pointer"
                backgroundColor={item.size === s ? tokens.accent : tokens.surface}
                borderWidth={1}
                borderColor={item.size === s ? tokens.accent : tokens.border}
                onPress={() => {
                  onSizeChange?.(item.id, s);
                  setIsSizePickerOpen(false);
                }}
              >
                <Text
                  fontSize={12}
                  fontWeight="700"
                  color={item.size === s ? tokens.accentForeground : tokens.text}
                >
                  {s}
                </Text>
              </XStack>
            ))}
          </XStack>
        </YStack>
      )}

      {/* Qty Picker Dropdown Sheet/Menu */}
      {isQtyPickerOpen && (
        <YStack
          marginTop={12}
          padding={10}
          backgroundColor={tokens.background}
          borderRadius={8}
          borderWidth={1}
          borderColor={tokens.border}
          gap={8}
        >
          <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
            Select Quantity:
          </Text>
          <XStack gap={8} flexWrap="wrap">
            {Array.from({ length: maxQty }, (_, i) => i + 1).map((q) => (
              <XStack
                key={q}
                width={36}
                height={36}
                borderRadius={18}
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                backgroundColor={item.quantity === q ? '#e53935' : tokens.surface}
                borderWidth={1}
                borderColor={item.quantity === q ? '#e53935' : tokens.border}
                onPress={() => {
                  onQuantityChange?.(item.id, q);
                  setIsQtyPickerOpen(false);
                }}
              >
                <Text
                  fontSize={13}
                  fontWeight="800"
                  color={item.quantity === q ? '#ffffff' : tokens.text}
                >
                  {q}
                </Text>
              </XStack>
            ))}
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}

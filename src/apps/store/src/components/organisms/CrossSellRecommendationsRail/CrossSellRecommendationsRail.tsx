import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { LuPlus, LuCheck } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export type CrossSellProduct = {
  id: string;
  category: string;
  brand: string;
  name: string;
  price: number;
  originalPrice: number;
  gradient: [string, string];
};

export const SAMPLE_CROSS_SELL_PRODUCTS: CrossSellProduct[] = [
  {
    id: 'cs1',
    category: 'Jewellery Set',
    brand: 'VAYYARI JEWELS',
    name: 'Antique Temple Gold Kundan Choker Set',
    price: 1499,
    originalPrice: 2999,
    gradient: ['#f6d365', '#fda085'],
  },
  {
    id: 'cs2',
    category: 'Blouse Piece',
    brand: 'ARTISAN WEAVE',
    name: 'Hand-Embroidered Zari Raw Silk Blouse Piece',
    price: 899,
    originalPrice: 1799,
    gradient: ['#fbc2eb', '#a6c1ee'],
  },
  {
    id: 'cs3',
    category: 'Handbags',
    brand: 'POTLI CRAFTS',
    name: 'Velvet Zardozi Embroidered Bridal Potli Bag',
    price: 1199,
    originalPrice: 2499,
    gradient: ['#ff9a9e', '#fecfef'],
  },
  {
    id: 'cs4',
    category: 'Dupattas',
    brand: 'BANARAS HERITAGE',
    name: 'Pure Katan Silk Tanchoi Weave Dupatta',
    price: 2199,
    originalPrice: 4499,
    gradient: ['#a1c4fd', '#c2e9fb'],
  },
  {
    id: 'cs5',
    category: 'Clutches',
    brand: 'ROYAL ACCENTS',
    name: 'Meenakari Brass Inlaid Box Evening Clutch',
    price: 1699,
    originalPrice: 3299,
    gradient: ['#84fab0', '#8fd3f4'],
  },
];

export type CrossSellRecommendationsRailProps = {
  products?: CrossSellProduct[];
  onAddProduct?: (product: CrossSellProduct) => void;
};

export function CrossSellRecommendationsRail({
  products = SAMPLE_CROSS_SELL_PRODUCTS,
  onAddProduct,
}: CrossSellRecommendationsRailProps) {
  const { tokens } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const categories = ['All', 'Jewellery Set', 'Blouse Piece', 'Handbags', 'Dupattas', 'Clutches'];

  const filteredProducts =
    selectedCategory === 'All'
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const handleAdd = (prod: CrossSellProduct) => {
    setAddedIds((prev) => ({ ...prev, [prod.id]: true }));
    onAddProduct?.(prod);
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [prod.id]: false }));
    }, 2000);
  };

  return (
    <YStack
      width="100%"
      backgroundColor={tokens.surface}
      borderColor={tokens.border}
      borderWidth={1}
      borderRadius={16}
      padding={16}
      gap={14}
    >
      <Text fontSize={14} fontWeight="800" color={tokens.text} letterSpacing={0.4}>
        You May Also Like
      </Text>

      {/* Category Filter Pills (Horizontal Scroll) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 10 }}
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <XStack
              key={cat}
              paddingHorizontal={14}
              paddingVertical={6}
              borderRadius={20}
              cursor="pointer"
              backgroundColor={isSelected ? 'rgba(229, 57, 53, 0.08)' : tokens.surfaceRaised}
              borderWidth={1}
              borderColor={isSelected ? '#e53935' : tokens.border}
              alignItems="center"
              onPress={() => setSelectedCategory(cat)}
              hoverStyle={{ borderColor: '#e53935' }}
            >
              <Text
                fontSize={12}
                fontWeight={isSelected ? '800' : '600'}
                color={isSelected ? '#e53935' : tokens.textSecondary}
              >
                {cat}
              </Text>
            </XStack>
          );
        })}
      </ScrollView>

      {/* Products Horizontal Scroll Rail */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 14, paddingVertical: 4 }}
      >
        {filteredProducts.map((prod) => {
          const isAdded = !!addedIds[prod.id];
          const discount = Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100);

          return (
            <YStack
              key={prod.id}
              width={140}
              backgroundColor={tokens.background}
              borderColor={tokens.border}
              borderWidth={1}
              borderRadius={12}
              overflow="hidden"
              gap={6}
              paddingBottom={10}
            >
              {/* Product Thumbnail */}
              <YStack width={140} height={170} position="relative">
                <LinearGradient
                  colors={prod.gradient}
                  style={{ width: '100%', height: '100%' }}
                />

                {/* Add Button Floating Top-Right */}
                <XStack
                  position="absolute"
                  top={8}
                  right={8}
                  width={28}
                  height={28}
                  borderRadius={14}
                  backgroundColor={isAdded ? '#2e7d32' : 'rgba(255,255,255,0.92)'}
                  alignItems="center"
                  justifyContent="center"
                  cursor="pointer"
                  onPress={() => handleAdd(prod)}
                  shadowColor="#000"
                  shadowOpacity={0.12}
                  shadowRadius={4}
                  hoverStyle={{ scale: 1.1 }}
                  pressStyle={{ scale: 0.92 }}
                >
                  {isAdded ? (
                    <LuCheck size={16} color="#ffffff" strokeWidth={3} />
                  ) : (
                    <LuPlus size={16} color="#222222" strokeWidth={3} />
                  )}
                </XStack>
              </YStack>

              {/* Details */}
              <YStack paddingHorizontal={8} gap={2}>
                <Text fontSize={11} fontWeight="800" color={tokens.text} textTransform="uppercase" numberOfLines={1}>
                  {prod.brand}
                </Text>
                <Text fontSize={11} color={tokens.textSecondary} numberOfLines={1}>
                  {prod.name}
                </Text>
                <XStack alignItems="baseline" gap={6} marginTop={2}>
                  <Text fontSize={12} fontWeight="800" color={tokens.text}>
                    ₹{prod.price}
                  </Text>
                  <Text fontSize={10} color={tokens.textMuted} textDecorationLine="line-through">
                    ₹{prod.originalPrice}
                  </Text>
                </XStack>
                <Text fontSize={10} fontWeight="700" color="#e53935">
                  ({discount}% OFF)
                </Text>
              </YStack>
            </YStack>
          );
        })}
      </ScrollView>
    </YStack>
  );
}

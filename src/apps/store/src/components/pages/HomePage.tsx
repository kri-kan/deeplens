import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { StorefrontTemplate } from '../templates/StorefrontTemplate';
import { Header } from '../organisms/Header/Header';
import { CategoryRow } from '../organisms/CategoryRow/CategoryRow';
import { HorizontalProductStrip } from '../organisms/HorizontalProductStrip/HorizontalProductStrip';
import { CartDrawer, CartItem } from '../organisms/CartDrawer/CartDrawer';
import { ProductCard } from '../molecules/ProductCard/ProductCard';
import { PromoBanner } from '../molecules/PromoBanner/PromoBanner';
import { useTheme } from '../../theme';

export type HomePageProps = {
  onNavigateCatalog?: () => void;
  onNavigatePDP?: (productName?: string) => void;
};

const CATEGORIES = [
  'All Collections',
  'Festive Handlooms',
  'Pure Mulberry Silk',
  'Banarasi Zari',
  'Kanjivaram Weaves',
  'Designer Kurtas',
  'Fine Jewellery',
  'Heritage Home',
];

const HERO_SLIDES = [
  {
    eyebrow: 'ROYAL FESTIVE EDIT 2026',
    title: 'The Golden Loom of Varanasi',
    subtitle: 'Hand-spun mulberry silk woven with electroplated pure gold zari.',
    gradient: ['#d7b08b', '#7c5836'] as [string, string],
  },
];

const FEATURED_PRODUCTS = [
  {
    name: 'Ivory Gold Saree',
    price: 3299,
    originalPrice: 4999,
    gradient: ['#edd9c5', '#d2a77a'] as [string, string],
  },
  {
    name: 'Rose Bloom Silk',
    price: 2799,
    originalPrice: 4199,
    gradient: ['#f3d6d8', '#cc8d9a'] as [string, string],
  },
  {
    name: 'Celestial Organza',
    price: 3099,
    originalPrice: 4699,
    gradient: ['#dfe4f2', '#8aa0d7'] as [string, string],
  },
  {
    name: 'Emerald Jacquard',
    price: 3599,
    originalPrice: 5299,
    gradient: ['#dfe9d8', '#739d67'] as [string, string],
  },
];

const SIMILAR_PRODUCTS = [
  { id: '1', brand: 'VAANYA LUXE', name: 'Rose Mist Handloom Saree', price: 2432, originalPrice: 4499, offPercent: 46, rating: 4.5, gradient: ['#f0d5d1', '#bf7b71'] as [string, string] },
  { id: '2', brand: 'VAANYA HERITAGE', name: 'Dyed Jacquard Silk Drape', price: 2107, originalPrice: 4214, offPercent: 50, rating: 4.8, gradient: ['#dfe9d8', '#9ec38f'] as [string, string] },
  { id: '3', brand: 'VAANYA WEAVES', name: 'Celestial Organza Ensemble', price: 3499, originalPrice: 5299, offPercent: 34, rating: 4.2, gradient: ['#dfe4f2', '#8aa0d7'] as [string, string] },
  { id: '4', brand: 'VAANYA GOLD', name: 'Amber Glow Kanjivaram', price: 4299, originalPrice: 6599, offPercent: 35, rating: 4.9, gradient: ['#f3e6d8', '#d3aa75'] as [string, string] },
];

export function HomePage({ onNavigateCatalog, onNavigatePDP }: HomePageProps) {
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: '1',
      name: 'Ivory Gold Handloom Saree',
      color: 'Ivory Gold',
      size: 'M',
      price: '₹3,299',
      gradient: ['#edd9c5', '#d2a77a'],
    },
  ]);

  return (
    <StorefrontTemplate
      header={
        <Header
          onOpenCart={() => setCartOpen(true)}
          onOpenWishlist={onNavigateCatalog}
        />
      }
      hero={
        <YStack
          borderRadius={24}
          overflow="hidden"
          borderWidth={1}
          borderColor={tokens.border}
          minHeight={isMobile ? 320 : 420}
          position="relative"
          justifyContent="flex-end"
          padding={isMobile ? 24 : 48}
        >
          <LinearGradient
            colors={HERO_SLIDES[0].gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <YStack gap={10} maxWidth={640}>
            <Text
              fontSize={12}
              fontWeight="800"
              color={tokens.accentForeground}
              textTransform="uppercase"
              letterSpacing={2}
            >
              {HERO_SLIDES[0].eyebrow}
            </Text>
            <Text
              fontSize={isMobile ? 28 : 42}
              fontWeight="900"
              color="#ffffff"
              letterSpacing={-1}
              lineHeight={isMobile ? 34 : 48}
            >
              {HERO_SLIDES[0].title}
            </Text>
            <Text
              fontSize={isMobile ? 14 : 16}
              color="rgba(255,255,255,0.88)"
              lineHeight={22}
            >
              {HERO_SLIDES[0].subtitle}
            </Text>
            <XStack gap={14} marginTop={12} flexWrap="wrap">
              <XStack
                height={46}
                paddingHorizontal={24}
                borderRadius={9999}
                backgroundColor={tokens.accent}
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                onPress={onNavigateCatalog}
                hoverStyle={{ scale: 1.03 }}
                pressStyle={{ scale: 0.96 }}
              >
                <Text color={tokens.accentForeground} fontWeight="800" fontSize={14}>
                  Explore Collection →
                </Text>
              </XStack>
              <XStack
                height={46}
                paddingHorizontal={24}
                borderRadius={9999}
                backgroundColor="rgba(255,255,255,0.18)"
                borderWidth={1}
                borderColor="rgba(255,255,255,0.3)"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                onPress={() => onNavigatePDP?.('Ivory Gold Saree')}
                hoverStyle={{ backgroundColor: 'rgba(255,255,255,0.28)' }}
                pressStyle={{ scale: 0.96 }}
              >
                <Text color="#ffffff" fontWeight="700" fontSize={14}>
                  View Featured Saree
                </Text>
              </XStack>
            </XStack>
          </YStack>
        </YStack>
      }
      categories={
        <CategoryRow
          items={CATEGORIES}
          onSelect={() => onNavigateCatalog?.()}
        />
      }
      featured={
        <YStack gap={16}>
          <XStack justifyContent="space-between" alignItems="baseline">
            <YStack gap={2}>
              <Text fontSize={24} fontWeight="800" color={tokens.text} letterSpacing={-0.5}>
                Curated Masterpieces
              </Text>
              <Text fontSize={13} color={tokens.textSecondary}>
                Certified authentic weaves from India’s legendary handloom clusters
              </Text>
            </YStack>
            <Text
              fontSize={13}
              fontWeight="700"
              color={tokens.accent}
              cursor="pointer"
              onPress={onNavigateCatalog}
              hoverStyle={{ textDecorationLine: 'underline' }}
            >
              View all 124 designs ›
            </Text>
          </XStack>

          <XStack flexWrap="wrap" gap={16} alignItems="flex-start">
            {FEATURED_PRODUCTS.map((prod) => (
              <ProductCard
                key={prod.name}
                name={prod.name}
                price={prod.price}
                originalPrice={prod.originalPrice}
                gradient={prod.gradient}
                onPress={() => onNavigatePDP?.(prod.name)}
              />
            ))}
          </XStack>
        </YStack>
      }
      collections={
        <YStack gap={24}>
          <PromoBanner
            eyebrow="Special Artisan Initiative"
            title="Direct From The Master Weavers"
            subtitle="Eliminating middle-men markups — 100% of fair-trade profits go straight to artisan weaver families in Varanasi and Tamil Nadu."
          />

          <YStack backgroundColor={tokens.surface} borderColor={tokens.border} borderWidth={1} borderRadius={20} overflow="hidden">
            <HorizontalProductStrip
              title="Fastest Selling Handlooms"
              subtitle="Limited artisan batch releases selling out today"
              badgeLabel="POPULAR"
              products={SIMILAR_PRODUCTS}
              showAddToBag={true}
            />
          </YStack>
        </YStack>
      }
      trustBadges={
        <XStack
          backgroundColor={tokens.surface}
          borderColor={tokens.border}
          borderWidth={1}
          borderRadius={18}
          padding={20}
          justifyContent="space-around"
          flexWrap="wrap"
          gap={16}
        >
          <XStack alignItems="center" gap={10}>
            <Text fontSize={20}>🛡️</Text>
            <YStack>
              <Text fontSize={13} fontWeight="800" color={tokens.text}>100% Certified Silk</Text>
              <Text fontSize={11} color={tokens.textSecondary}>Govt. Silk Mark Guarantee</Text>
            </YStack>
          </XStack>
          <XStack alignItems="center" gap={10}>
            <Text fontSize={20}>✈️</Text>
            <YStack>
              <Text fontSize={13} fontWeight="800" color={tokens.text}>Free Express Shipping</Text>
              <Text fontSize={11} color={tokens.textSecondary}>Worldwide dispatch in 48 hrs</Text>
            </YStack>
          </XStack>
          <XStack alignItems="center" gap={10}>
            <Text fontSize={20}>🔄</Text>
            <YStack>
              <Text fontSize={13} fontWeight="800" color={tokens.text}>15-Day Effortless Returns</Text>
              <Text fontSize={11} color={tokens.textSecondary}>Hassle-free doorstep pickup</Text>
            </YStack>
          </XStack>
        </XStack>
      }
      footer={
        <YStack
          backgroundColor={tokens.surface}
          borderColor={tokens.border}
          borderWidth={1}
          borderRadius={20}
          padding={32}
          gap={24}
        >
          <XStack justifyContent="space-between" flexWrap="wrap" gap={24}>
            <YStack gap={8} maxWidth={320}>
              <Text fontSize={18} fontWeight="900" color={tokens.text} letterSpacing={1.5}>
                VAANYA LUXE
              </Text>
              <Text fontSize={13} color={tokens.textSecondary} lineHeight={20}>
                Preserving age-old Indian handloom weaving heritage through modern silhouettes and ethical craftsmanship.
              </Text>
            </YStack>
            <YStack gap={6}>
              <Text fontSize={12} fontWeight="800" color={tokens.accent} textTransform="uppercase">
                Collections
              </Text>
              {['Banarasi Sarees', 'Kanjivaram Silk', 'Chanderi Weaves', 'Artisan Kurtas'].map((l) => (
                <Text key={l} fontSize={13} color={tokens.textSecondary} cursor="pointer" hoverStyle={{ color: tokens.accent }}>
                  {l}
                </Text>
              ))}
            </YStack>
            <YStack gap={6}>
              <Text fontSize={12} fontWeight="800" color={tokens.accent} textTransform="uppercase">
                Customer Concierge
              </Text>
              {['Track Order', 'Silk Certification', 'Care Guide', 'Contact Us'].map((l) => (
                <Text key={l} fontSize={13} color={tokens.textSecondary} cursor="pointer" hoverStyle={{ color: tokens.accent }}>
                  {l}
                </Text>
              ))}
            </YStack>
          </XStack>
          <XStack
            borderTopWidth={1}
            borderTopColor={tokens.border}
            paddingTop={16}
            justifyContent="space-between"
            flexWrap="wrap"
            gap={10}
          >
            <Text fontSize={12} color={tokens.textMuted}>
              © 2026 VAANYA Luxury Retail Ltd. All rights reserved.
            </Text>
            <Text fontSize={12} color={tokens.textMuted}>
              Crafted with Tamagui &amp; Expo React Native
            </Text>
          </XStack>
        </YStack>
      }
      cartDrawer={
        cartOpen ? (
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.4)"
            justifyContent="flex-end"
            zIndex={300}
          >
            <CartDrawer
              items={cartItems}
              onClose={() => setCartOpen(false)}
              onCheckout={() => {
                alert('Proceeding to Secure Checkout');
                setCartOpen(false);
              }}
            />
          </YStack>
        ) : null
      }
    />
  );
}

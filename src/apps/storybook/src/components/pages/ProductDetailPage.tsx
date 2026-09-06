import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { ProductDetailTemplate } from '../templates/ProductDetailTemplate';
import { Header } from '../organisms/Header/Header';
import { ProductGallery, SwatchItem } from '../organisms/ProductGallery/ProductGallery';
import { ColourSelector, ColourOption } from '../organisms/ColourSelector/ColourSelector';
import { SizeSelector } from '../organisms/SizeSelector/SizeSelector';
import { FrequentlyBoughtTogether } from '../organisms/FrequentlyBoughtTogether/FrequentlyBoughtTogether';
import { SpecificationsPanel } from '../organisms/SpecificationsPanel/SpecificationsPanel';
import { RatingsPanel } from '../organisms/RatingsPanel/RatingsPanel';
import { HorizontalProductStrip } from '../organisms/HorizontalProductStrip/HorizontalProductStrip';
import { CartDrawer, CartItem } from '../organisms/CartDrawer/CartDrawer';
import { StickyAddToBagBar } from '../molecules/StickyAddToBagBar/StickyAddToBagBar';
import { Breadcrumbs } from '../molecules/Breadcrumbs/Breadcrumbs';
import { PriceTag } from '../atoms/PriceTag/PriceTag';
import { RatingBadge } from '../atoms/RatingBadge/RatingBadge';
import { HeartButton } from '../atoms/HeartButton/HeartButton';
import { ShareButton } from '../atoms/ShareButton/ShareButton';
import { useTheme, useResponsive } from '../../theme';

export type ProductDetailPageProps = {
  onNavigateHome?: () => void;
  onNavigateCatalog?: () => void;
};

const SWATCHES: Record<string, SwatchItem> = {
  navy_pink: {
    label: 'Navy & Rani Pink',
    template: 'contrast-border',
    primaryColor: '#1565C0',
    secondaryColor: '#E91E63',
    gradient: ['#1a2a4e', '#d81b60'],
    images: [
      { id: '1', label: 'Front Drape - Rani Pink Contrast Border', gradient: ['#1a2a4e', '#d81b60'] },
      { id: '2', label: 'Border Close-up - Electroplated Gold Zari', gradient: ['#d81b60', '#ffd54f'] },
      { id: '3', label: 'Pleats & Fall Texture', gradient: ['#1a2a4e', '#283593'] },
      { id: '4', label: 'Matching Blouse Piece Fabric', gradient: ['#c2185b', '#e91e63'] },
    ],
  },
  purple_emerald: {
    label: 'Violet & Emerald Dhup-Chhaon',
    template: 'multi-tone',
    primaryColor: '#6A1B9A',
    secondaryColor: '#2E7D32',
    gradient: ['#4a148c', '#1b5e20'],
    images: [
      { id: '1', label: 'Iridescent Silk Drape - Multi-Tone', gradient: ['#4a148c', '#1b5e20'] },
      { id: '2', label: 'Weft & Warp Shimmer Reflection', gradient: ['#7b1fa2', '#2e7d32'] },
      { id: '3', label: 'Intricate Pallu Motifs', gradient: ['#311b92', '#004d40'] },
      { id: '4', label: 'Back Drape Silhouette', gradient: ['#4a148c', '#388e3c'] },
    ],
  },
  mustard_green: {
    label: 'Mustard & Bottle Green',
    template: 'multi-shade',
    primaryColor: '#FBC02D',
    secondaryColor: '#1B5E20',
    colorCount: 2,
    gradient: ['#fbc02d', '#1b5e20'],
    images: [
      { id: '1', label: 'Multi-Shade - Pleats & Body Split', gradient: ['#fbc02d', '#1b5e20'] },
      { id: '2', label: 'Center Seam & Zari Piping', gradient: ['#f9a825', '#2e7d32'] },
      { id: '3', label: 'Full Ensemble Presentation', gradient: ['#fff176', '#1b5e20'] },
    ],
  },
  bandhani_multi: {
    label: 'Festive Bandhani Multi',
    template: 'multicolor',
    primaryColor: '#C62828',
    secondaryColor: '#FBC02D',
    tertiaryColor: '#2E7D32',
    quaternaryColor: '#1565C0',
    gradient: ['#c62828', '#1565c0'],
    images: [
      { id: '1', label: 'Traditional Bandhani Print - Multi Hues', gradient: ['#c62828', '#1565c0'] },
      { id: '2', label: 'Handcrafted Tie-Dye Texture Close-up', gradient: ['#e53935', '#fbc02d'] },
      { id: '3', label: 'Festive Drape with Tassel Embellishments', gradient: ['#43a047', '#1e88e5'] },
    ],
  },
  ivory_gold: {
    label: 'Pure Ivory Gold',
    template: 'solid',
    primaryColor: '#D4AF37',
    gradient: ['#f3e6d8', '#d3aa75'],
    images: [
      { id: '1', label: 'Pure Mulberry Silk Drape', gradient: ['#f3e6d8', '#d3aa75'] },
      { id: '2', label: 'Handwoven Tested Zari Pallu', gradient: ['#fff8e1', '#d4af37'] },
      { id: '3', label: 'Fabric Weave & Certified Silk Mark', gradient: ['#edd9c5', '#c9a063'] },
    ],
  },
};

const COLOUR_OPTIONS: ColourOption[] = [
  {
    key: 'navy_pink',
    label: 'Navy & Rani Pink',
    template: 'contrast-border',
    primaryColor: '#1565C0',
    secondaryColor: '#E91E63',
  },
  {
    key: 'purple_emerald',
    label: 'Violet & Emerald',
    template: 'multi-tone',
    primaryColor: '#6A1B9A',
    secondaryColor: '#2E7D32',
  },
  {
    key: 'mustard_green',
    label: 'Mustard & Green',
    template: 'multi-shade',
    primaryColor: '#FBC02D',
    secondaryColor: '#1B5E20',
    colorCount: 2,
  },
  {
    key: 'bandhani_multi',
    label: 'Bandhani Multi',
    template: 'multicolor',
    primaryColor: '#C62828',
    secondaryColor: '#FBC02D',
    tertiaryColor: '#2E7D32',
    quaternaryColor: '#1565C0',
  },
  {
    key: 'ivory_gold',
    label: 'Pure Ivory Gold',
    template: 'solid',
    primaryColor: '#D4AF37',
  },
];

const SIMILAR_PRODUCTS = [
  { id: '1', brand: 'VAANYA LUXE', name: 'Rose Mist Handloom Saree', price: 2432, originalPrice: 4499, offPercent: 46, rating: 4.5, gradient: ['#f0d5d1', '#bf7b71'] as [string, string] },
  { id: '2', brand: 'VAANYA HERITAGE', name: 'Dyed Jacquard Silk Drape', price: 2107, originalPrice: 4214, offPercent: 50, rating: 4.8, gradient: ['#dfe9d8', '#9ec38f'] as [string, string] },
  { id: '3', brand: 'VAANYA WEAVES', name: 'Celestial Organza Ensemble', price: 3499, originalPrice: 5299, offPercent: 34, rating: 4.2, gradient: ['#dfe4f2', '#8aa0d7'] as [string, string] },
];

export function ProductDetailPage({ onNavigateHome, onNavigateCatalog }: ProductDetailPageProps) {
  const { tokens } = useTheme();
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;
  const [selectedColor, setSelectedColor] = useState<string>('navy_pink');
  const [selectedSize, setSelectedSize] = useState('M');
  const [wishlisted, setWishlisted] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: '1',
      name: 'Ivory Flow Mulberry Silk Saree',
      color: 'Ivory Gold',
      size: 'M',
      price: '₹3,299',
      gradient: ['#f3e6d8', '#d3aa75'],
    },
  ]);

  const handleAddToBag = () => {
    setCartItems([
      {
        id: Date.now().toString(),
        name: 'Ivory Flow Mulberry Silk Saree',
        color: SWATCHES[selectedColor as keyof typeof SWATCHES]?.label || selectedColor,
        size: selectedSize,
        price: '₹3,299',
        gradient: SWATCHES[selectedColor as keyof typeof SWATCHES]?.gradient || ['#f3e6d8', '#d3aa75'],
      },
    ]);
    setCartOpen(true);
  };

  return (
    <ProductDetailTemplate
      header={
        <Header
          onOpenCart={() => setCartOpen(true)}
          onOpenWishlist={() => setWishlisted(!wishlisted)}
        />
      }
      breadcrumbs={
        <Breadcrumbs
          items={[
            { label: 'Home', onPress: onNavigateHome },
            { label: 'Women', onPress: onNavigateCatalog },
            { label: 'Handloom Sarees', onPress: onNavigateCatalog },
            { label: 'Ivory Flow Mulberry Silk Saree' },
          ]}
        />
      }
      gallery={
        <ProductGallery
          swatches={SWATCHES}
          selectedColor={selectedColor}
          onSelectColor={setSelectedColor}
        >
          {isCompact ? (
            <YStack
              backgroundColor={tokens.surface}
              borderColor={tokens.border}
              borderWidth={1}
              borderRadius={16}
              padding={16}
              gap={10}
            >
              <ColourSelector
                options={COLOUR_OPTIONS}
                selected={selectedColor}
                onSelect={setSelectedColor}
                format="dots"
              />
            </YStack>
          ) : null}
        </ProductGallery>
      }
      purchasePanel={
        <YStack
          backgroundColor={tokens.surface}
          borderColor={tokens.border}
          borderWidth={1}
          borderRadius={isMobile ? 16 : 20}
          padding={isMobile ? 16 : 24}
          gap={isMobile ? 14 : 18}
          width="100%"
        >
          <YStack gap={6}>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={12} fontWeight="800" color={tokens.accent} letterSpacing={1.2} textTransform="uppercase">
                VAANYA LUXE HERITAGE
              </Text>
              <RatingBadge rating={4.8} count={248} />
            </XStack>

            <Text
              fontSize={isMobile ? 20 : 24}
              fontWeight="900"
              color={tokens.text}
              letterSpacing={-0.5}
              lineHeight={isMobile ? 26 : 30}
            >
              Ivory Flow Mulberry Silk Saree
            </Text>

            <Text fontSize={13} color={tokens.textSecondary} lineHeight={20}>
              Handwoven with tested electroplated gold zari and certified 100% natural silk mark guarantee.
            </Text>
          </YStack>

          {/* Pricing */}
          <YStack paddingVertical={4}>
            <PriceTag price={3299} originalPrice={4999} offPercent={34} size={isMobile ? 'md' : 'lg'} />
            <Text fontSize={11} color={tokens.textMuted} marginTop={4}>
              Inclusive of all taxes. Free express shipping applied at checkout.
            </Text>
          </YStack>

          {/* Color Selector (Desktop only; on mobile & tablet it is located right below the carousel) */}
          {!isCompact ? (
            <ColourSelector
              options={COLOUR_OPTIONS}
              selected={selectedColor}
              onSelect={setSelectedColor}
              format="cards"
            />
          ) : null}

          {/* Size Selector */}
          <SizeSelector
            sizes={['Free Size', 'Custom Tailored Blouse']}
            selected={selectedSize}
            onSelect={setSelectedSize}
          />

          {/* CTA Buttons */}
          <XStack gap={10} marginTop={6} alignItems="center">
            <XStack
              flex={1}
              height={46}
              backgroundColor={tokens.accent}
              borderRadius={12}
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              onPress={handleAddToBag}
              hoverStyle={{ opacity: 0.92, scale: 1.02 }}
              pressStyle={{ scale: 0.96 }}
            >
              <Text color={tokens.accentForeground} fontWeight="800" fontSize={14}>
                🛍 Add to Bag
              </Text>
            </XStack>

            <HeartButton
              size={46}
              active={wishlisted}
              onPress={() => setWishlisted(!wishlisted)}
            />
            <ShareButton size={46} />
          </XStack>

          {/* Delivery & Assurance */}
          <XStack
            backgroundColor={tokens.surfaceRaised}
            borderRadius={12}
            padding={isMobile ? 12 : 14}
            alignItems="center"
            gap={10}
          >
            <Text fontSize={18}>⚡</Text>
            <YStack flex={1}>
              <Text fontSize={12} fontWeight="800" color={tokens.text}>
                Guaranteed Dispatch within 24 Hours
              </Text>
              <Text fontSize={11} color={tokens.textSecondary}>
                Expected delivery in 2-3 business days across India
              </Text>
            </YStack>
          </XStack>
        </YStack>
      }
      crossSells={
        <FrequentlyBoughtTogether
          items={[
            {
              id: '1',
              brand: 'VAANYA LUXE',
              name: 'Ivory Flow Mulberry Silk Saree',
              price: '₹3,299',
              originalPrice: '₹4,999',
              offLabel: '34% OFF',
              gradient: ['#f3e6d8', '#d3aa75'],
              checked: true,
            },
            {
              id: '2',
              brand: 'VAANYA HERITAGE',
              name: 'Silk Brocade Stitched Blouse Piece',
              price: '₹1,299',
              originalPrice: '₹1,999',
              offLabel: '35% OFF',
              gradient: ['#f0d5d1', '#bf7b71'],
              checked: true,
            },
          ]}
          totalPrice="₹4,598"
          totalOriginal="₹6,998"
          totalOff="₹2,400 OFF"
          onAddAll={handleAddToBag}
        />
      }
      specifications={
        <SpecificationsPanel
          specs={[
            { label: 'Fabric Composition', value: '100% Pure Mulberry Silk' },
            { label: 'Zari Material', value: 'Electroplated Tested Gold Zari' },
            { label: 'Length & Width', value: '5.5 Meters Saree + 0.8M Blouse' },
            { label: 'Weave Technique', value: 'Handloom Jacquard Weave' },
            { label: 'Silk Mark Certification', value: 'Certified SM/IND/2026/9102' },
            { label: 'Wash Care Instructions', value: 'Dry Clean Only, Store in Muslin Bag' },
          ]}
        />
      }
      reviews={
        <RatingsPanel
          averageRating={4.8}
          totalReviews={248}
          breakdown={[180, 45, 15, 5, 3]}
          photoColors={['#edd9c5', '#f3d6d8', '#dfe4f2', '#dfe9d8']}
          reviews={[
            {
              initials: 'AK',
              name: 'Ananya Krishnamurthy',
              date: '18 August 2026',
              rating: 5,
              text: 'The drape and texture exceeded my highest expectations. The zari has a classy, muted golden sheen rather than being overly flashy. Truly museum quality craft.',
            },
            {
              initials: 'PS',
              name: 'Priyanka Sharma',
              date: '12 August 2026',
              rating: 5,
              text: 'Came in a gorgeous silk-lined gift box with authentic certification card. Loved every detail!',
            },
          ]}
        />
      }
      recommendations={
        <YStack backgroundColor={tokens.surface} borderColor={tokens.border} borderWidth={1} borderRadius={20} overflow="hidden">
          <HorizontalProductStrip
            title="You May Also Cherish"
            subtitle="Similar handloom sarees selected by our master curators"
            badgeLabel="RECOMMENDED"
            products={SIMILAR_PRODUCTS}
            showAddToBag={true}
          />
        </YStack>
      }
      stickyBuyBar={
        <StickyAddToBagBar
          price="₹3,299"
          title="Ivory Flow Silk Saree"
          onAddToBag={handleAddToBag}
        />
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

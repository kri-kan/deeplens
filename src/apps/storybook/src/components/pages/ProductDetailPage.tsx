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
import {
  CatalogTestProduct,
  DIVERSE_CATALOG_PRODUCTS,
} from '../../data/catalog';
import { ProductCurationSpecs } from '../organisms/StoreCuration/types';
import { useTheme, useResponsive } from '../../theme';

export type ProductDetailPageProps = {
  product?: CatalogTestProduct;
  curatedSpecs?: ProductCurationSpecs;
  onNavigateHome?: () => void;
  onNavigateCatalog?: () => void;
};

const SIMILAR_PRODUCTS = [
  { id: '1', brand: 'VAANYA LUXE', name: 'Rose Mist Handloom Saree', price: 2432, originalPrice: 4499, offPercent: 46, rating: 4.5, gradient: ['#f0d5d1', '#bf7b71'] as [string, string] },
  { id: '2', brand: 'VAANYA HERITAGE', name: 'Dyed Jacquard Silk Drape', price: 2107, originalPrice: 4214, offPercent: 50, rating: 4.8, gradient: ['#dfe9d8', '#9ec38f'] as [string, string] },
  { id: '3', brand: 'VAANYA WEAVES', name: 'Celestial Organza Ensemble', price: 3499, originalPrice: 5299, offPercent: 34, rating: 4.2, gradient: ['#dfe4f2', '#8aa0d7'] as [string, string] },
];

export function ProductDetailPage({
  product: productProp,
  curatedSpecs,
  onNavigateHome,
  onNavigateCatalog,
}: ProductDetailPageProps) {
  const activeProduct = productProp || DIVERSE_CATALOG_PRODUCTS[0];
  const { tokens } = useTheme();
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;

  const [selectedColor, setSelectedColor] = React.useState<string>(activeProduct.selectedColorDefault);
  const [selectedSize, setSelectedSize] = React.useState<string>(
    activeProduct.sizeConfig.defaultSelected || activeProduct.sizeConfig.options[0]?.id || 'Free Size'
  );
  const [wishlisted, setWishlisted] = React.useState(false);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);

  // Synchronize color and size when product changes
  React.useEffect(() => {
    setSelectedColor(activeProduct.selectedColorDefault);
    setSelectedSize(
      activeProduct.sizeConfig.defaultSelected || activeProduct.sizeConfig.options[0]?.id || 'Free Size'
    );
  }, [activeProduct.id]);

  const swatches = activeProduct.swatches;

  const colourOptions: ColourOption[] = React.useMemo(() => {
    return Object.entries(swatches).map(([key, sw]) => ({
      key,
      label: sw.label,
      template: sw.template || 'solid',
      primaryColor: sw.primaryColor || (sw.gradient ? sw.gradient[0] : '#f3e6d8'),
      secondaryColor: sw.secondaryColor || (sw.gradient ? sw.gradient[1] : '#d3aa75'),
      tertiaryColor: sw.tertiaryColor,
      quaternaryColor: sw.quaternaryColor,
      colors: sw.colors,
      colorCount: sw.colorCount,
      gradient: sw.gradient,
    }));
  }, [swatches]);

  const handleAddToBag = () => {
    const activeSwatch = swatches[selectedColor] || Object.values(swatches)[0];
    setCartItems([
      {
        id: Date.now().toString(),
        name: activeProduct.title,
        color: activeSwatch?.label || selectedColor,
        size: selectedSize,
        price: `₹${activeProduct.price.toLocaleString('en-IN')}`,
        gradient: activeSwatch?.gradient || ['#f3e6d8', '#d3aa75'],
      },
    ]);
    setCartOpen(true);
  };

  const resolvedSpecs = React.useMemo(() => {
    if (curatedSpecs) {
      return [
        { label: 'Fabric Base', value: curatedSpecs.fabricName },
        { label: 'Weave Technique', value: curatedSpecs.weaveTechniqueName },
        { label: 'Regional Craft Origin', value: curatedSpecs.craftOriginName },
        { label: 'Motif & Patterns', value: curatedSpecs.motifPatternName },
        { label: 'Border & Pallu Detail', value: curatedSpecs.borderPalluName },
        { label: 'Zari / Inlay Material', value: curatedSpecs.zariMaterialName },
        { label: 'Work Heaviness', value: curatedSpecs.workHeavinessName },
        { label: 'Stitch & Sizing Profile', value: curatedSpecs.sizeDrapeText || curatedSpecs.stitchTypeName },
        { label: 'Blouse Format', value: curatedSpecs.blouseTypeName || 'Attached Unstitched Running Blouse' },
        { label: 'Saree Drape Length', value: `${curatedSpecs.sareeLengthMetres} metres` },
        { label: 'Blouse Piece Length', value: `${curatedSpecs.blousePieceLengthMetres} metres` },
        { label: 'Package Contents', value: curatedSpecs.packageContents },
        { label: 'Wash Care & Preservation', value: curatedSpecs.careInstructions },
        {
          label: 'Occasion & Styling',
          value: curatedSpecs.occasions?.map((o) => o.replace(/_/g, ' ')).join(', '),
        },
      ].filter((s) => Boolean(s.value));
    }
    return [
      { label: 'Fabric Composition', value: activeProduct.fabric },
      { label: 'Weave Technique', value: activeProduct.highlights?.[0] || 'Handloom Pitloom Weave' },
      { label: 'Regional Origin', value: activeProduct.weaveOrigin || 'Varanasi, Uttar Pradesh' },
      { label: 'Stitch Profile', value: activeProduct.stitchType },
      { label: 'Wash Care Instructions', value: 'Dry Clean Only, Store in Muslin Bag' },
    ];
  }, [curatedSpecs, activeProduct]);

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
            { label: activeProduct.categoryLabel, onPress: onNavigateCatalog },
            {
              label: activeProduct.weaveOrigin || `${activeProduct.fabric} Collection`,
              onPress: onNavigateCatalog,
            },
            { label: activeProduct.title },
          ]}
        />
      }
      gallery={
        <ProductGallery
          swatches={swatches}
          selectedColor={selectedColor}
          onSelectColor={setSelectedColor}
        >
          {isCompact ? (
            <ColourSelector
              options={colourOptions}
              selected={selectedColor}
              onSelect={setSelectedColor}
              format="dots"
              swatchesAlign="right"
            />
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
                {activeProduct.brand}
              </Text>
              <RatingBadge rating={activeProduct.rating} count={activeProduct.reviewCount} />
            </XStack>

            <Text
              fontSize={isMobile ? 20 : 24}
              fontWeight="900"
              color={tokens.text}
              letterSpacing={-0.5}
              lineHeight={isMobile ? 26 : 30}
            >
              {activeProduct.title}
            </Text>

            <Text fontSize={13} color={tokens.textSecondary} lineHeight={20}>
              {activeProduct.description}
            </Text>
          </YStack>

          {/* Pricing */}
          <YStack paddingVertical={4}>
            <PriceTag
              price={activeProduct.price}
              originalPrice={activeProduct.originalPrice > activeProduct.price ? activeProduct.originalPrice : undefined}
              offPercent={activeProduct.discountPercent > 0 ? activeProduct.discountPercent : undefined}
              size={isMobile ? 'md' : 'lg'}
            />
            <Text fontSize={11} color={tokens.textMuted} marginTop={4}>
              Inclusive of all taxes. Free express shipping applied at checkout.
            </Text>
          </YStack>

          {/* Color Selector (Desktop only; on mobile & tablet it is located right below the carousel) */}
          {!isCompact ? (
            <ColourSelector
              options={colourOptions}
              selected={selectedColor}
              onSelect={setSelectedColor}
              format="cards"
            />
          ) : null}

          {/* Size Selector */}
          <SizeSelector
            sizes={activeProduct.sizeConfig.options}
            selected={selectedSize}
            onSelect={setSelectedSize}
            variant={activeProduct.sizeConfig.type}
            customNotes={activeProduct.sizeConfig.customNotes}
            category={activeProduct.category}
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
        <SpecificationsPanel specs={resolvedSpecs} />
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

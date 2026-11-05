import React, { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuEye } from 'react-icons/lu';
import { CustomSwatchDot } from '../atoms/SwatchDot/CustomSwatchDot';
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

export type PdpSectionId =
  | 'color_variations'
  | 'frequently_bought'
  | 'specifications'
  | 'reviews'
  | 'similar_products'
  | 'you_may_like'
  | 'recently_viewed';

export interface PdpConfig {
  activeVariant?: 'control' | 'treatment' | 'custom';
  showRatings?: boolean;
  showViewsCount?: boolean;
  viewsCount?: number | string;
  descriptionDefaultCollapsed?: boolean;
  descriptionTruncateLines?: number;
  specsDefaultCollapsed?: boolean;
  specsShowSilkMark?: boolean;
  galleryThumbnailPosition?: 'in_container' | 'below_container';
  presentationMode?: 'grouped' | 'split';
  containerStyle?: 'cards' | 'borderless';
  visibleSections?: PdpSectionId[];
}

export const PDP_PRESETS: Record<'control' | 'treatment', PdpConfig> = {
  control: {
    activeVariant: 'control',
    showRatings: true,
    showViewsCount: false,
    viewsCount: '1.2k',
    descriptionDefaultCollapsed: false,
    descriptionTruncateLines: 2,
    specsDefaultCollapsed: false,
    specsShowSilkMark: true,
    galleryThumbnailPosition: 'in_container',
    presentationMode: 'grouped',
    containerStyle: 'cards',
    visibleSections: [
      'frequently_bought',
      'specifications',
      'reviews',
      'similar_products',
    ],
  },
  treatment: {
    activeVariant: 'treatment',
    showRatings: true,
    showViewsCount: true,
    viewsCount: '1.4k',
    descriptionDefaultCollapsed: true,
    descriptionTruncateLines: 2,
    specsDefaultCollapsed: true,
    specsShowSilkMark: true,
    galleryThumbnailPosition: 'in_container',
    presentationMode: 'grouped',
    containerStyle: 'cards',
    visibleSections: [
      'color_variations',
      'frequently_bought',
      'specifications',
      'reviews',
      'similar_products',
      'you_may_like',
      'recently_viewed',
    ],
  },
};

export const MOBILE_FLUSH_PRESET: PdpConfig = {
  activeVariant: 'custom',
  showRatings: true,
  showViewsCount: true,
  viewsCount: '1.4k',
  descriptionDefaultCollapsed: true,
  descriptionTruncateLines: 2,
  specsDefaultCollapsed: true,
  specsShowSilkMark: true,
  galleryThumbnailPosition: 'in_container',
  presentationMode: 'grouped',
  containerStyle: 'borderless',
  visibleSections: [
    'color_variations',
    'frequently_bought',
    'specifications',
    'reviews',
    'similar_products',
    'you_may_like',
    'recently_viewed',
  ],
};

export const DEFAULT_PDP_CONFIG: PdpConfig = MOBILE_FLUSH_PRESET;

export type ProductDetailPageProps = {
  product?: CatalogTestProduct;
  curatedSpecs?: ProductCurationSpecs;
  presentationMode?: 'grouped' | 'split';
  activeSkuCode?: string;
  config?: Partial<PdpConfig>;
  containerStyle?: 'cards' | 'borderless';
  onNavigateHome?: () => void;
  onNavigateCatalog?: () => void;
};

const SIMILAR_PRODUCTS = [
  { id: '1', brand: 'VAANYA LUXE', name: 'Rose Mist Handloom Saree', price: 2432, originalPrice: 4499, offPercent: 46, rating: 4.5, gradient: ['#f0d5d1', '#bf7b71'] as [string, string] },
  { id: '2', brand: 'VAANYA HERITAGE', name: 'Dyed Jacquard Silk Drape', price: 2107, originalPrice: 4214, offPercent: 50, rating: 4.8, gradient: ['#dfe9d8', '#9ec38f'] as [string, string] },
  { id: '3', brand: 'VAANYA WEAVES', name: 'Celestial Organza Ensemble', price: 3499, originalPrice: 5299, offPercent: 34, rating: 4.2, gradient: ['#dfe4f2', '#8aa0d7'] as [string, string] },
];

const YOU_MAY_LIKE_PRODUCTS = [
  { id: '4', brand: 'VAANYA LUXE', name: 'Zari Border Organza Saree', price: 3899, originalPrice: 5999, offPercent: 35, rating: 4.7, gradient: ['#fce7f3', '#db2777'] as [string, string] },
  { id: '5', brand: 'VAANYA WEAVES', name: 'Banarasi Brocade Silk Drape', price: 4299, originalPrice: 6500, offPercent: 33, rating: 4.9, gradient: ['#fef3c7', '#d97706'] as [string, string] },
  { id: '6', brand: 'VAANYA HERITAGE', name: 'Temple Border Kanjivaram', price: 4999, originalPrice: 7999, offPercent: 37, rating: 4.8, gradient: ['#ecfdf5', '#059669'] as [string, string] },
];

const RECENTLY_VIEWED_PRODUCTS = [
  { id: '7', brand: 'VAANYA WEAVES', name: 'Tissue Linen Festive Saree', price: 1899, originalPrice: 2999, offPercent: 36, rating: 4.4, gradient: ['#e0e7ff', '#4f46e5'] as [string, string] },
  { id: '8', brand: 'VAANYA LUXE', name: 'Pastel Chiffon Floral Saree', price: 2199, originalPrice: 3499, offPercent: 37, rating: 4.6, gradient: ['#fae8ff', '#a855f7'] as [string, string] },
];

export function ProductDetailPage({
  product: productProp,
  curatedSpecs,
  presentationMode: presentationModeProp = 'grouped',
  activeSkuCode,
  config: configProp,
  containerStyle,
  onNavigateHome,
  onNavigateCatalog,
}: ProductDetailPageProps) {
  const activeProduct = productProp || DIVERSE_CATALOG_PRODUCTS[0];
  const { tokens } = useTheme();
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;

  const effectiveConfig: PdpConfig = {
    ...DEFAULT_PDP_CONFIG,
    ...configProp,
    ...(containerStyle ? { containerStyle } : {}),
    presentationMode: configProp?.presentationMode || presentationModeProp,
  };

  const isBorderless = (effectiveConfig.containerStyle || containerStyle) === 'borderless';

  const rawSwatches = activeProduct.swatches;
  const isSplitMode = effectiveConfig.presentationMode === 'split';

  // Sibling SKUs for Split mode
  const siblingSkus = React.useMemo(() => {
    return Object.entries(rawSwatches).map(([key, sw], idx) => ({
      id: key,
      skuCode: `${activeProduct.sku || 'VF2B56'}${String(idx + 1).padStart(2, '0')}`,
      label: sw.label,
      colorHex: sw.primaryColor || (sw.gradient ? sw.gradient[0] : '#1B4D3E'),
      secondaryHex: sw.secondaryColor || (sw.gradient ? sw.gradient[1] : '#D4AF37'),
      price: activeProduct.price,
      originalPrice: activeProduct.originalPrice,
    }));
  }, [rawSwatches, activeProduct]);

  // Swatches displayed on this PDP
  const swatches = React.useMemo(() => {
    if (isSplitMode) {
      const firstEntry = Object.entries(rawSwatches)[0];
      return firstEntry ? { [firstEntry[0]]: firstEntry[1] } : rawSwatches;
    }
    return rawSwatches;
  }, [isSplitMode, rawSwatches]);

  // In grouped mode, initial can be selected or unselected ('')
  const [selectedColor, setSelectedColor] = React.useState<string>(() => {
    if (isSplitMode) return Object.keys(swatches)[0] || '';
    return activeProduct.selectedColorDefault || Object.keys(swatches)[0] || '';
  });

  const [selectedSize, setSelectedSize] = React.useState<string>(
    activeProduct.sizeConfig.defaultSelected || activeProduct.sizeConfig.options[0]?.id || 'Free Size'
  );
  const [wishlisted, setWishlisted] = React.useState(false);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
  const [mandatorySheetOpen, setMandatorySheetOpen] = React.useState(false);
  const [addedToBag, setAddedToBag] = React.useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = React.useState<boolean>(
    !effectiveConfig.descriptionDefaultCollapsed
  );

  React.useEffect(() => {
    setDescriptionExpanded(!effectiveConfig.descriptionDefaultCollapsed);
  }, [effectiveConfig.descriptionDefaultCollapsed]);

  // Synchronize color and size when product changes
  React.useEffect(() => {
    setSelectedColor(isSplitMode ? Object.keys(swatches)[0] || '' : activeProduct.selectedColorDefault);
    setSelectedSize(
      activeProduct.sizeConfig.defaultSelected || activeProduct.sizeConfig.options[0]?.id || 'Free Size'
    );
    setAddedToBag(false);
  }, [activeProduct.id, isSplitMode]);

  // If no swatch is selected in grouped mode, synthesize all media together!
  const allImagesCombined = React.useMemo(() => {
    return Object.values(swatches).flatMap((sw) => sw.images || []);
  }, [swatches]);

  const gallerySwatches = React.useMemo(() => {
    if (!selectedColor && !isSplitMode) {
      return {
        all: {
          label: 'All Curated Media',
          gradient: ['#1B4D3E', '#D4AF37'] as [string, string],
          template: 'contrast-border' as any,
          images: allImagesCombined,
        },
        ...swatches,
      };
    }
    return swatches;
  }, [selectedColor, isSplitMode, swatches, allImagesCombined]);

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

  // Handle color toggle (select or unselect to show all)
  const handleColorToggle = (colorKey: string) => {
    if (isSplitMode) return; // Split view has single locked swatch
    setSelectedColor((prev) => {
      const next = prev === colorKey ? '' : colorKey;
      setAddedToBag(false);
      return next;
    });
  };

  const executeAddToCart = (colorKey: string, sizeVal: string) => {
    const chosenSwatch = swatches[colorKey] || Object.values(swatches)[0];
    setCartItems([
      {
        id: Date.now().toString(),
        name: activeProduct.title,
        color: chosenSwatch?.label || colorKey,
        size: sizeVal,
        price: `₹${activeProduct.price.toLocaleString('en-IN')}`,
        gradient: chosenSwatch?.gradient || ['#f3e6d8', '#d3aa75'],
        image: chosenSwatch?.images?.[0]?.url,
      },
    ]);
    setAddedToBag(true);
    setMandatorySheetOpen(false);
  };

  const handleAddToBag = () => {
    if (addedToBag) {
      setCartOpen(true);
      return;
    }
    if (!selectedColor) {
      // Mandate swatch selection via bottom sheet (Myntra-style)
      setMandatorySheetOpen(true);
      return;
    }
    executeAddToCart(selectedColor, selectedSize);
  };

  const resolvedSpecs = React.useMemo(() => {
    if (curatedSpecs) {
      return [
        { label: 'Product Code / SKU', value: activeProduct.sku || activeProduct.id || 'VF2B56' },
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
      { label: 'Product Code / SKU', value: activeProduct.sku || activeProduct.id || 'VF2B56' },
      { label: 'Fabric Composition', value: activeProduct.fabric },
      { label: 'Weave Technique', value: activeProduct.highlights?.[0] || 'Handloom Pitloom Weave' },
      { label: 'Regional Origin', value: activeProduct.weaveOrigin || 'Varanasi, Uttar Pradesh' },
      { label: 'Stitch Profile', value: activeProduct.stitchType },
      { label: 'Wash Care Instructions', value: 'Dry Clean Only, Store in Muslin Bag' },
    ];
  }, [curatedSpecs, activeProduct]);

  return (
    <ProductDetailTemplate
      borderless={isBorderless && isMobile}
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
          swatches={gallerySwatches}
          selectedColor={selectedColor || 'all'}
          onSelectColor={handleColorToggle}
          borderless={isBorderless && isMobile}
        >
          {isCompact ? (
            <ColourSelector
              options={colourOptions}
              selected={selectedColor}
              onSelect={handleColorToggle}
              format="dots"
              swatchesAlign="right"
            />
          ) : null}
        </ProductGallery>
      }
      purchasePanel={
        <YStack
          backgroundColor={isBorderless && isMobile ? 'transparent' : tokens.surface}
          borderColor={isBorderless && isMobile ? 'transparent' : tokens.border}
          borderWidth={isBorderless && isMobile ? 0 : 1}
          borderRadius={isBorderless && isMobile ? 0 : (isMobile ? 16 : 20)}
          padding={isBorderless && isMobile ? 4 : (isMobile ? 16 : 24)}
          gap={isMobile ? 14 : 18}
          width="100%"
        >
          <YStack gap={6}>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={12} fontWeight="800" color={tokens.accent} letterSpacing={1.2} textTransform="uppercase">
                {activeProduct.brand}
              </Text>
              <XStack alignItems="center" gap={8}>
                {effectiveConfig.showViewsCount && (
                  <XStack
                    backgroundColor="#FEF3C7"
                    borderColor="#FDE68A"
                    borderWidth={1}
                    paddingHorizontal={8}
                    paddingVertical={3}
                    borderRadius={12}
                    alignItems="center"
                    gap={4}
                  >
                    <LuEye size={12} color="#B45309" />
                    <Text fontSize={11} fontWeight="800" color="#B45309">
                      {effectiveConfig.viewsCount || '1.4k'} viewing
                    </Text>
                  </XStack>
                )}
                {effectiveConfig.showRatings && (
                  <RatingBadge rating={activeProduct.rating} count={activeProduct.reviewCount} />
                )}
              </XStack>
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

            {isSplitMode && siblingSkus.length > 1 && (
              <XStack
                backgroundColor="#EFF6FF"
                borderColor="#BFDBFE"
                borderWidth={1}
                borderRadius={8}
                paddingHorizontal={10}
                paddingVertical={6}
                alignItems="center"
                justifyContent="space-between"
                marginTop={2}
              >
                <XStack alignItems="center" gap={6}>
                  <Text fontSize={13}>🎨</Text>
                  <Text fontSize={11} fontWeight="800" color="#1D4ED8">
                    Available in {siblingSkus.length - 1} other colorways
                  </Text>
                </XStack>
                <Text fontSize={10} fontWeight="700" color="#2563EB">
                  View SKUs Below ↓
                </Text>
              </XStack>
            )}

            <YStack gap={4}>
              <Text
                fontSize={13}
                color={tokens.textSecondary}
                lineHeight={20}
                numberOfLines={descriptionExpanded ? undefined : (effectiveConfig.descriptionTruncateLines || 2)}
              >
                {activeProduct.description}
              </Text>
              <Pressable
                onPress={() => setDescriptionExpanded((prev) => !prev)}
                style={{ alignSelf: 'flex-start', marginTop: 2, cursor: 'pointer' } as any}
              >
                <Text fontSize={12} fontWeight="700" color={tokens.accent}>
                  {descriptionExpanded ? 'Show Less ↑' : 'Read More... ↓'}
                </Text>
              </Pressable>
            </YStack>
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
              onSelect={handleColorToggle}
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
              backgroundColor={addedToBag ? '#16A34A' : tokens.accent}
              borderRadius={12}
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              onPress={addedToBag ? () => setCartOpen(true) : handleAddToBag}
              hoverStyle={{ opacity: 0.92, scale: 1.02 }}
              pressStyle={{ scale: 0.96 }}
            >
              <Text color={tokens.accentForeground} fontWeight="800" fontSize={14}>
                {addedToBag ? '🛍 Go to Bag →' : '🛍 Add to Bag'}
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
        (() => {
          const showColorVars = (effectiveConfig.visibleSections?.includes('color_variations') || isSplitMode) && siblingSkus.length > 1;
          const showFreqBought = effectiveConfig.visibleSections?.includes('frequently_bought');
          if (!showColorVars && !showFreqBought) return null;

          return (
            <YStack gap={16}>
              {showColorVars && (
                <YStack
                  backgroundColor={isBorderless && isMobile ? 'transparent' : tokens.surface}
                  borderColor={isBorderless && isMobile ? 'transparent' : tokens.border}
                  borderWidth={isBorderless && isMobile ? 0 : 1}
                  borderRadius={isBorderless && isMobile ? 0 : 20}
                  padding={isBorderless && isMobile ? 4 : 16}
                  gap={12}
                >
                  <XStack alignItems="center" justifyContent="space-between">
                    <YStack gap={2}>
                      <XStack alignItems="center" gap={6}>
                        <Text fontSize={14}>🎨</Text>
                        <Text fontSize={13} fontWeight="800" color={tokens.text} textTransform="uppercase">
                          Color Variations in this Saree
                        </Text>
                      </XStack>
                      <Text fontSize={11} color={tokens.textMuted}>
                        Each colorway has its dedicated spotlight PDP &amp; inventory tracking
                      </Text>
                    </YStack>
                    <XStack backgroundColor="#DBEAFE" paddingHorizontal={8} paddingVertical={3} borderRadius={12}>
                      <Text fontSize={10} fontWeight="800" color="#1E40AF">
                        {siblingSkus.length} SKUs
                      </Text>
                    </XStack>
                  </XStack>

                  <XStack gap={10} flexWrap="wrap">
                    {siblingSkus.map((sku) => {
                      const isCurrent = sku.id === Object.keys(swatches)[0];
                      return (
                        <YStack
                          key={sku.id}
                          width={isMobile ? '47%' : 170}
                          backgroundColor={isCurrent ? `${tokens.accent}08` : tokens.surfaceRaised}
                          borderColor={isCurrent ? tokens.accent : tokens.border}
                          borderWidth={isCurrent ? 2 : 1}
                          borderRadius={12}
                          padding={10}
                          gap={6}
                        >
                          <XStack alignItems="center" justifyContent="space-between">
                            <XStack
                              width={20}
                              height={20}
                              borderRadius={10}
                              backgroundColor={sku.colorHex}
                              borderWidth={2}
                              borderColor={sku.secondaryHex}
                            />
                            <XStack backgroundColor="#F1F5F9" paddingHorizontal={5} paddingVertical={2} borderRadius={4}>
                              <Text fontSize={9} fontWeight="900" color={tokens.text} fontFamily="$mono">
                                {sku.skuCode}
                              </Text>
                            </XStack>
                          </XStack>
                          <Text fontSize={11} fontWeight="800" color={tokens.text} numberOfLines={1}>
                            {sku.label}
                          </Text>
                          <Text fontSize={11} fontWeight="800" color="#16A34A">
                            ₹{sku.price.toLocaleString('en-IN')}
                          </Text>
                          <XStack
                            backgroundColor={isCurrent ? tokens.accent : '#F1F5F9'}
                            paddingVertical={5}
                            borderRadius={6}
                            alignItems="center"
                            justifyContent="center"
                            marginTop={4}
                          >
                            <Text fontSize={10} fontWeight="800" color={isCurrent ? tokens.accentForeground : tokens.text}>
                              {isCurrent ? 'Current PDP' : 'View Saree →'}
                            </Text>
                          </XStack>
                        </YStack>
                      );
                    })}
                  </XStack>
                </YStack>
              )}

              {showFreqBought && (
                <FrequentlyBoughtTogether
                  borderless={isBorderless && isMobile}
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
              )}
            </YStack>
          );
        })()
      }
      specifications={
        effectiveConfig.visibleSections?.includes('specifications') ? (
          <SpecificationsPanel
            specs={resolvedSpecs}
            sku={activeProduct.sku}
            showSilkMarkBadge={effectiveConfig.specsShowSilkMark ?? true}
            defaultCollapsed={effectiveConfig.specsDefaultCollapsed ?? false}
            isCollapsible={true}
            borderless={isBorderless && isMobile}
          />
        ) : null
      }
      reviews={
        effectiveConfig.visibleSections?.includes('reviews') ? (
          <RatingsPanel
            averageRating={4.8}
            totalReviews={248}
            breakdown={[180, 45, 15, 5, 3]}
            photoColors={['#edd9c5', '#f3d6d8', '#dfe4f2', '#dfe9d8']}
            borderless={isBorderless && isMobile}
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
        ) : null
      }
      recommendations={
        (() => {
          const showSimilar = effectiveConfig.visibleSections?.includes('similar_products');
          const showYouMayLike = effectiveConfig.visibleSections?.includes('you_may_like');
          const showRecentlyViewed = effectiveConfig.visibleSections?.includes('recently_viewed');
          if (!showSimilar && !showYouMayLike && !showRecentlyViewed) return null;

          return (
            <YStack gap={16}>
              {showSimilar && (
                <YStack
                  backgroundColor={isBorderless && isMobile ? 'transparent' : tokens.surface}
                  borderColor={isBorderless && isMobile ? 'transparent' : tokens.border}
                  borderWidth={isBorderless && isMobile ? 0 : 1}
                  borderRadius={isBorderless && isMobile ? 0 : 20}
                  overflow="hidden"
                >
                  <HorizontalProductStrip
                    title="You May Also Cherish"
                    subtitle="Similar handloom sarees selected by our master curators"
                    badgeLabel="RECOMMENDED"
                    products={SIMILAR_PRODUCTS}
                    showAddToBag={true}
                  />
                </YStack>
              )}

              {showYouMayLike && (
                <YStack
                  backgroundColor={isBorderless && isMobile ? 'transparent' : tokens.surface}
                  borderColor={isBorderless && isMobile ? 'transparent' : tokens.border}
                  borderWidth={isBorderless && isMobile ? 0 : 1}
                  borderRadius={isBorderless && isMobile ? 0 : 20}
                  overflow="hidden"
                >
                  <HorizontalProductStrip
                    title="Curated Masterpieces"
                    subtitle="Hand-picked weaves based on your styling preferences"
                    badgeLabel="CURATED"
                    products={YOU_MAY_LIKE_PRODUCTS}
                    showAddToBag={true}
                  />
                </YStack>
              )}

              {showRecentlyViewed && (
                <YStack
                  backgroundColor={isBorderless && isMobile ? 'transparent' : tokens.surface}
                  borderColor={isBorderless && isMobile ? 'transparent' : tokens.border}
                  borderWidth={isBorderless && isMobile ? 0 : 1}
                  borderRadius={isBorderless && isMobile ? 0 : 20}
                  overflow="hidden"
                >
                  <HorizontalProductStrip
                    title="Your Cherished Journey"
                    subtitle="Pieces you viewed during this session"
                    badgeLabel="RECENT"
                    products={RECENTLY_VIEWED_PRODUCTS}
                    showAddToBag={false}
                  />
                </YStack>
              )}
            </YStack>
          );
        })()
      }
      stickyBuyBar={
        <StickyAddToBagBar
          price={`₹${activeProduct.price.toLocaleString('en-IN')}`}
          title={activeProduct.title}
          buttonLabel={addedToBag ? '🛍 Go to Bag →' : '🛍 Add to Bag'}
          buttonBg={addedToBag ? '#16A34A' : undefined}
          onAddToBag={addedToBag ? () => setCartOpen(true) : handleAddToBag}
        />
      }
      cartDrawer={
        <>
          {cartOpen && (
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
          )}

          {/* Lean Single-Row Swatch Selection Sheet */}
          {mandatorySheetOpen && (
            <YStack
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.5)"
              justifyContent="flex-end"
              zIndex={350}
              onPress={() => setMandatorySheetOpen(false)}
            >
              <YStack
                backgroundColor={tokens.surface}
                borderTopLeftRadius={20}
                borderTopRightRadius={20}
                paddingHorizontal={20}
                paddingTop={16}
                paddingBottom={24}
                gap={12}
                onPress={(e) => e?.stopPropagation?.()}
              >
                {/* Lean Header */}
                <XStack alignItems="center" justifyContent="space-between">
                  <XStack alignItems="center" gap={8}>
                    <Text fontSize={14} fontWeight="800" color={tokens.text}>
                      Select Color
                    </Text>
                    {selectedColor && swatches[selectedColor] ? (
                      <Text fontSize={12} fontWeight="600" color={tokens.textSecondary}>
                        • {swatches[selectedColor].label}
                      </Text>
                    ) : null}
                  </XStack>
                  <Pressable
                    onPress={() => setMandatorySheetOpen(false)}
                    hitSlop={10}
                    style={{ cursor: 'pointer', padding: 4 } as any}
                  >
                    <Text fontSize={16} fontWeight="800" color={tokens.textMuted}>
                      ✕
                    </Text>
                  </Pressable>
                </XStack>

                {/* Lean Single Row of Swatches */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    paddingVertical: 6,
                  }}
                >
                  {colourOptions.map((opt) => {
                    const isSel = selectedColor === opt.key;
                    return (
                      <YStack
                        key={opt.key}
                        alignItems="center"
                        gap={6}
                        cursor="pointer"
                        onPress={() => {
                          setSelectedColor(opt.key);
                          executeAddToCart(opt.key, selectedSize);
                        }}
                        hoverStyle={{ scale: 1.08 }}
                        pressStyle={{ scale: 0.95 }}
                      >
                        <CustomSwatchDot
                          template={opt.template}
                          primaryColor={opt.primaryColor || (opt.gradient ? opt.gradient[0] : '#f3e6d8')}
                          secondaryColor={opt.secondaryColor || (opt.gradient ? opt.gradient[1] : '#d3aa75')}
                          tertiaryColor={opt.tertiaryColor}
                          quaternaryColor={opt.quaternaryColor}
                          colors={opt.colors}
                          colorCount={opt.colorCount}
                          size={38}
                          selected={isSel}
                        />
                        <Text
                          fontSize={11}
                          fontWeight={isSel ? '800' : '600'}
                          color={isSel ? tokens.accent : tokens.textSecondary}
                          numberOfLines={1}
                          maxWidth={70}
                          textAlign="center"
                        >
                          {opt.label}
                        </Text>
                      </YStack>
                    );
                  })}
                </ScrollView>
              </YStack>
            </YStack>
          )}
        </>
      }
    />
  );
}

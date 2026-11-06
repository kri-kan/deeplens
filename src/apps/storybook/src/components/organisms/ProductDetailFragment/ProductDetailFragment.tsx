import React, { useState, useMemo } from 'react';
import { View, Pressable, Platform, Share, StyleSheet } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuEye, LuArrowLeft, LuSparkles } from 'react-icons/lu';
import { useTheme, useResponsive } from '../../../theme';
import { ProductDetailTemplate } from '../../templates/ProductDetailTemplate';
import { ProductGallery, SwatchItem, GalleryImage } from '../ProductGallery/ProductGallery';
import { ColourSelector, ColourOption } from '../ColourSelector/ColourSelector';
import { SizeSelector } from '../SizeSelector/SizeSelector';
import { FrequentlyBoughtTogether } from '../FrequentlyBoughtTogether/FrequentlyBoughtTogether';
import { SpecificationsPanel } from '../SpecificationsPanel/SpecificationsPanel';
import { StickyAddToBagBar } from '../../molecules/StickyAddToBagBar/StickyAddToBagBar';
import { Breadcrumbs } from '../../molecules/Breadcrumbs/Breadcrumbs';
import { PriceTag } from '../../atoms/PriceTag/PriceTag';
import { HeartButton } from '../../atoms/HeartButton/HeartButton';
import { ShareButton } from '../../atoms/ShareButton/ShareButton';
import { SwatchTemplateType } from '../../atoms/SwatchDot/CustomSwatchDot';

export interface PdpProductMediaItem {
  id: string;
  url?: string;
  uri?: string;
  thumbnailUri?: string;
  originalUri?: string;
  mediaType?: 'image' | 'video' | string;
  colorGroupId?: string;
  isCommon?: boolean;
  isHero?: boolean;
  title?: string;
  sortOrder?: number;
  sourcePlatform?: 'catalog' | 'instagram' | 'whatsapp' | string;
  sourceUrl?: string;
  sourcePostId?: string;
}

export interface PdpProductColorGroup {
  id: string;
  name: string;
  colorwayCode?: string;
  template?: SwatchTemplateType;
  slotA?: string;
  slotB?: string;
  slotC?: string;
  slotD?: string;
  colors?: string[];
  colorCount?: number;
  gradient?: [string, string];
}

export interface PdpProductData {
  id?: string;
  code: string;
  sku?: string;
  title: string;
  brand?: string;
  category?: string;
  fabric?: string;
  weaveOrigin?: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  discountPercentage?: number;
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  stockQuantity?: number;
  colorGroups?: PdpProductColorGroup[];
  mediaList?: PdpProductMediaItem[];
  mediaOrder?: PdpProductMediaItem[];
  images?: string[];
  specifications?: Record<string, string | number> | Array<{ label: string; value: string | number }>;
  curatedSpecs?: any;
  highlights?: string[];
  stitchType?: string;
  sizeProfile?: string;
  customSkuMessage?: string;
  swatches?: any[];
}

export interface ProductDetailFragmentProps {
  product: PdpProductData;
  mode?: 'live' | 'preview';
  borderless?: boolean;
  selectedColorId?: string;
  onSelectColorId?: (id: string) => void;
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
  onAddToCart?: (product: PdpProductData, selectedColorId: string, selectedSize: string) => void;
  onToggleWishlist?: (productId: string) => void;
  isWishlisted?: boolean;
  onShare?: () => void;
  onBack?: () => void;
  topBanner?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  onNavigateHome?: () => void;
  onNavigateCatalog?: () => void;
  relatedProducts?: PdpProductData[];
  onSelectRelatedProduct?: (code: string) => void;
}

export const ProductDetailFragment: React.FC<ProductDetailFragmentProps> = ({
  product,
  mode = 'live',
  borderless,
  selectedColorId: controlledColorId,
  onSelectColorId,
  selectedSize: controlledSize,
  onSelectSize,
  onAddToCart,
  onToggleWishlist,
  isWishlisted = false,
  onShare,
  onBack,
  topBanner,
  breadcrumbs,
  onNavigateHome,
  onNavigateCatalog,
}) => {
  const { tokens } = useTheme();
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;
  const isBorderless = borderless ?? isMobile;

  const [internalColorId, setInternalColorId] = useState<string>(() => {
    if (product.colorGroups && product.colorGroups.length > 0) {
      return product.colorGroups[0].id;
    }
    return 'default';
  });

  const [internalSize, setInternalSize] = useState<string>('Free Size');
  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(false);
  const [addedToBag, setAddedToBag] = useState<boolean>(false);

  const activeColorId = controlledColorId !== undefined ? controlledColorId : internalColorId;
  const activeSize = controlledSize !== undefined ? controlledSize : internalSize;

  const handleSelectColor = (id: string) => {
    if (onSelectColorId) {
      onSelectColorId(id);
    } else {
      setInternalColorId(id);
    }
    setAddedToBag(false);
  };

  const handleSelectSize = (size: string) => {
    if (onSelectSize) {
      onSelectSize(size);
    } else {
      setInternalSize(size);
    }
  };

  // Derive Colour Options and Swatches Map
  const { colourOptions, swatchesMap } = useMemo(() => {
    const opts: ColourOption[] = [];
    const map: Record<string, SwatchItem> = {};

    const colorGroups = product.colorGroups || [];
    if (colorGroups.length > 0) {
      colorGroups.forEach((cg) => {
        opts.push({
          key: cg.id,
          label: cg.name,
          template: cg.template || 'solid',
          primaryColor: cg.slotA || cg.colors?.[0] || '#D4AF37',
          secondaryColor: cg.slotB || cg.colors?.[1],
          tertiaryColor: cg.slotC || cg.colors?.[2],
          quaternaryColor: cg.slotD || cg.colors?.[3],
          colors: cg.colors,
          colorCount: (cg.colorCount as 2 | 3 | 4) || (cg.colors?.length as any),
        });

        // Filter media
        const allMedia = product.mediaList || product.mediaOrder || [];
        const variantMedia = allMedia
          .filter((m) => m.colorGroupId === cg.id && !m.isCommon)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const commonMedia = allMedia
          .filter((m) => m.isCommon || (!m.colorGroupId && m.colorGroupId !== cg.id))
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const combined = [...variantMedia, ...commonMedia];

        const images: GalleryImage[] = (
          combined.length > 0
            ? combined
            : (product.images || []).map((url, i) => ({
                id: `${cg.id}-${i}`,
                url,
                title: `${cg.name} Drape ${i + 1}`,
              }))
        ).map((m: any, idx: number) => ({
          id: m.id || `${cg.id}-${idx}`,
          label: m.title || `${cg.name} - View ${idx + 1}`,
          url: m.url || m.uri,
          gradient: [cg.slotA || '#1a2a4e', cg.slotB || '#d81b60'],
          sourcePlatform: m.sourcePlatform,
          sourceUrl: m.sourceUrl,
          sourcePostId: m.sourcePostId,
        }));

        map[cg.id] = {
          label: cg.name,
          template: cg.template || 'solid',
          primaryColor: cg.slotA || '#D4AF37',
          secondaryColor: cg.slotB,
          tertiaryColor: cg.slotC,
          quaternaryColor: cg.slotD,
          colors: cg.colors,
          colorCount: (cg.colorCount as 2 | 3 | 4) || (cg.colors?.length as any),
          gradient: [cg.slotA || '#1a2a4e', cg.slotB || '#d81b60'],
          images: images.length > 0 ? images : [
            {
              id: '1',
              label: `${cg.name} - Front Drape`,
              gradient: [cg.slotA || '#1a2a4e', cg.slotB || '#d81b60'],
            },
          ],
        };
      });
    } else {
      const defaultKey = 'default';
      opts.push({
        key: defaultKey,
        label: 'Original Artisan Weave',
        template: 'solid',
        primaryColor: '#D4AF37',
      });

      const images: GalleryImage[] = (product.images || []).map((url, idx) => ({
        id: `img-${idx}`,
        label: `${product.title} - View ${idx + 1}`,
        url,
        gradient: ['#1a2a4e', '#d81b60'],
      }));

      map[defaultKey] = {
        label: 'Original Artisan Weave',
        template: 'solid',
        primaryColor: '#D4AF37',
        gradient: ['#1a2a4e', '#d81b60'],
        images: images.length > 0 ? images : [
          {
            id: '1',
            label: `${product.title} - Front Drape`,
            gradient: ['#1a2a4e', '#d81b60'],
          },
        ],
      };
    }

    return { colourOptions: opts, swatchesMap: map };
  }, [product]);

  // Active color label
  const activeColorLabel = useMemo(() => {
    return swatchesMap[activeColorId]?.label || 'Selected';
  }, [swatchesMap, activeColorId]);

  // Pricing derivation
  const salePrice = product.price;
  const originalPrice = product.originalPrice || Math.round(salePrice * 1.5);
  const discountPercent =
    product.discountPercent ??
    product.discountPercentage ??
    (originalPrice > salePrice ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0);

  // Specifications
  const specsList = useMemo(() => {
    if (Array.isArray(product.specifications)) {
      return product.specifications;
    }
    if (product.specifications && typeof product.specifications === 'object') {
      return Object.entries(product.specifications).map(([label, value]) => ({ label, value }));
    }
    if (product.curatedSpecs) {
      const cs = product.curatedSpecs;
      return [
        { label: 'Product Code / SKU', value: product.sku || product.code },
        { label: 'Fabric Composition', value: cs.fabricName || product.fabric || 'Pure Mulberry Silk' },
        { label: 'Weave Technique', value: cs.weaveTechniqueName || 'Traditional Handloom' },
        { label: 'Regional Craft Origin', value: cs.craftOriginName || product.weaveOrigin || 'Varanasi' },
        { label: 'Silk Mark Certification', value: 'Certified SM/IND/2026/9102' },
        { label: 'Wash Care Instructions', value: cs.careInstructions || 'Dry Clean Only, Store in Muslin Bag' },
      ].filter((s) => Boolean(s.value));
    }
    return [
      { label: 'Product Code / SKU', value: product.code || product.sku || '-' },
      { label: 'Fabric Composition', value: product.fabric || '100% Pure Mulberry Silk' },
      { label: 'Weave Origin / Craft', value: product.weaveOrigin || 'Handloom Traditional Weave' },
      { label: 'Silk Mark Certification', value: 'Certified SM/IND/2026/9102' },
      { label: 'Wash Care Instructions', value: 'Dry Clean Only, Store in Muslin Bag' },
      {
        label: 'Dispatch Timeline',
        value: product.inStock !== false ? 'Guaranteed Dispatch within 24 Hours' : 'Made to Order (Ships in 4-6 Days)',
      },
    ];
  }, [product]);

  // Size Options
  const sizeOptions = useMemo(() => {
    const cat = (product.category || '').toLowerCase();
    const title = (product.title || '').toLowerCase();
    if (cat.includes('kid') || title.match(/\b(kid|boy|girl|baby|toddler)\b/)) {
      return [
        { id: '16', label: '16 (0-6M)' },
        { id: '18', label: '18 (6-12M)' },
        { id: '20', label: '20 (1-2Y)' },
        { id: '22', label: '22 (2-3Y)' },
        { id: '24', label: '24 (3-4Y)' },
      ];
    }
    if (cat.includes('blouse') || title.match(/\b(blouse|choli)\b/)) {
      return [
        { id: '32', label: '32' },
        { id: '34', label: '34' },
        { id: '36', label: '36' },
        { id: '38', label: '38' },
        { id: '40', label: '40' },
        { id: '42', label: '42' },
      ];
    }
    if (
      cat.includes('dress') ||
      cat.includes('kurta') ||
      cat.includes('suit') ||
      title.match(/\b(dress|kurti|kurta|suit|anarkali|gown)\b/)
    ) {
      return [
        { id: 'XS', label: 'XS' },
        { id: 'S', label: 'S' },
        { id: 'M', label: 'M' },
        { id: 'L', label: 'L' },
        { id: 'XL', label: 'XL' },
        { id: 'XXL', label: 'XXL' },
      ];
    }
    return [
      { id: 'Free Size', label: 'Free Size (5.5m + 0.8m Blouse)' },
    ];
  }, [product]);

  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({
            title: product.title,
            text: `Check out ${product.title} on Vayyari Store`,
            url: typeof window !== 'undefined' ? window.location.href : '',
          });
        }
      } else {
        await Share.share({
          message: `Check out ${product.title} on Vayyari: ₹${salePrice.toLocaleString('en-IN')}`,
          title: product.title,
        });
      }
    } catch {}
  };

  const handleAddToBag = () => {
    if (mode === 'preview') return;
    if (onAddToCart) {
      onAddToCart(product, activeColorId, activeSize);
    }
    setAddedToBag(true);
  };

  const isOutOfStock = product.inStock === false;

  return (
    <ProductDetailTemplate
      borderless={isBorderless}
      header={
        topBanner ||
        (mode === 'preview' ? (
          <XStack
            backgroundColor="#FEF3C7"
            borderColor="#FDE68A"
            borderWidth={1}
            borderRadius={8}
            paddingVertical={6}
            paddingHorizontal={12}
            alignItems="center"
            justifyContent="space-between"
            marginHorizontal={isBorderless ? 12 : 0}
            marginBottom={4}
          >
            <XStack alignItems="center" gap={6}>
              <LuEye size={13} color="#B45309" />
              <Text fontSize={11} fontWeight="800" color="#92400E">
                Storefront PDP Preview
              </Text>
            </XStack>
            {onBack && (
              <Pressable onPress={onBack} hitSlop={8}>
                <Text fontSize={11} fontWeight="700" color="#92400E">
                  ✕ Close
                </Text>
              </Pressable>
            )}
          </XStack>
        ) : onBack ? (
          <XStack
            alignItems="center"
            paddingHorizontal={isBorderless ? 12 : 0}
            paddingVertical={6}
            gap={8}
          >
            <Pressable onPress={onBack} hitSlop={8}>
              <XStack alignItems="center" gap={4}>
                <LuArrowLeft size={18} color={tokens.text} />
                <Text fontSize={13} fontWeight="700" color={tokens.text}>
                  Back
                </Text>
              </XStack>
            </Pressable>
          </XStack>
        ) : null)
      }
      breadcrumbs={
        mode === 'preview' ? null : (
          breadcrumbs || (
            <Breadcrumbs
              items={[
                { label: 'Home', onPress: onNavigateHome },
                { label: product.category || 'Handloom Sarees', onPress: onNavigateCatalog },
                { label: product.weaveOrigin || product.fabric || 'Silk Collection', onPress: onNavigateCatalog },
                { label: product.title },
              ]}
            />
          )
        )
      }
      gallery={
        <ProductGallery
          swatches={swatchesMap}
          selectedColor={activeColorId}
          onSelectColor={handleSelectColor}
          borderless={isBorderless}
        >
          {isCompact && colourOptions.length > 1 ? (
            <ColourSelector
              options={colourOptions}
              selected={activeColorId}
              onSelect={handleSelectColor}
              format="dots"
              swatchesAlign="right"
            />
          ) : null}
        </ProductGallery>
      }
      purchasePanel={
        <YStack
          backgroundColor={isBorderless ? 'transparent' : tokens.surface}
          borderColor={isBorderless ? 'transparent' : tokens.border}
          borderWidth={isBorderless ? 0 : 1}
          borderRadius={isBorderless ? 0 : (isMobile ? 16 : 20)}
          padding={isBorderless ? 4 : (isMobile ? 16 : 24)}
          gap={isMobile ? 12 : 18}
          width="100%"
        >
          <YStack gap={6}>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={12} fontWeight="800" color={tokens.accent} letterSpacing={1.2} textTransform="uppercase">
                {product.brand || 'VAYYARI LUXE'}
              </Text>
            </XStack>

            <Text
              fontSize={isMobile ? 19 : 24}
              fontWeight="900"
              color={tokens.text}
              letterSpacing={-0.4}
              lineHeight={isMobile ? 25 : 30}
            >
              {product.title}
            </Text>

            {product.customSkuMessage && (
              <XStack
                backgroundColor="#EFF6FF"
                borderColor="#BFDBFE"
                borderWidth={1}
                borderRadius={8}
                paddingHorizontal={10}
                paddingVertical={6}
                alignItems="center"
                gap={6}
                marginTop={2}
              >
                <Text fontSize={13}>✨</Text>
                <Text fontSize={11} fontWeight="800" color="#1D4ED8">
                  {product.customSkuMessage}
                </Text>
              </XStack>
            )}

            <YStack gap={4}>
              <Text
                fontSize={13}
                color={tokens.textSecondary}
                lineHeight={20}
                numberOfLines={descriptionExpanded ? undefined : 2}
              >
                {product.description ||
                  `Hand-spun ${product.fabric || 'pure mulberry silk'} drape crafted with traditional handloom weaving technique from ${product.weaveOrigin || 'master artisan clusters'}. Certified authentic.`}
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
              price={salePrice}
              originalPrice={originalPrice > salePrice ? originalPrice : undefined}
              offPercent={discountPercent > 0 ? discountPercent : undefined}
              size={isMobile ? 'md' : 'lg'}
            />
            <Text fontSize={11} color={tokens.textMuted} marginTop={4}>
              Inclusive of all taxes. Free express shipping applied at checkout.
            </Text>
          </YStack>

          {/* Color Selector (Desktop only) */}
          {!isCompact && colourOptions.length > 1 && (
            <ColourSelector
              options={colourOptions}
              selected={activeColorId}
              onSelect={handleSelectColor}
              format="cards"
            />
          )}

          {/* Size Selector */}
          <SizeSelector
            sizes={sizeOptions}
            selected={activeSize}
            onSelect={handleSelectSize}
            category={product.category}
          />

          {/* CTA Buttons */}
          <XStack gap={10} marginTop={6} alignItems="center">
            {isOutOfStock ? (
              <XStack
                flex={1}
                height={46}
                backgroundColor="#94A3B8"
                borderRadius={12}
                alignItems="center"
                justifyContent="center"
              >
                <Text color="#FFFFFF" fontWeight="800" fontSize={14}>
                  Sold Out (No Restock)
                </Text>
              </XStack>
            ) : (
              <XStack
                flex={1}
                height={46}
                backgroundColor={addedToBag ? '#16A34A' : tokens.accent}
                borderRadius={12}
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                onPress={handleAddToBag}
                hoverStyle={{ opacity: 0.92, scale: 1.02 }}
                pressStyle={{ scale: 0.96 }}
              >
                <Text color={tokens.accentForeground} fontWeight="800" fontSize={14}>
                  {mode === 'preview'
                    ? 'Publish Preview (Storefront)'
                    : addedToBag
                    ? '🛍 Added to Bag ✓'
                    : '🛍 Add to Bag'}
                </Text>
              </XStack>
            )}

            <HeartButton
              size={46}
              active={isWishlisted}
              onPress={() => onToggleWishlist?.(product.id || product.code)}
            />
            <ShareButton size={46} onPress={handleShare} />
          </XStack>

          {/* Dispatch Assurance */}
          <XStack
            backgroundColor={tokens.surfaceRaised}
            borderRadius={12}
            padding={isMobile ? 12 : 14}
            alignItems="center"
            gap={10}
          >
            <Text fontSize={18}>{isOutOfStock ? '⏳' : '⚡'}</Text>
            <YStack flex={1}>
              <Text fontSize={12} fontWeight="800" color={tokens.text}>
                {isOutOfStock
                  ? 'Currently Out of Stock – Check back for new artisan releases'
                  : 'Guaranteed Dispatch within 24 Hours'}
              </Text>
              <Text fontSize={11} color={tokens.textSecondary}>
                Delivered with tamper-proof silk bag & silk mark certificate
              </Text>
            </YStack>
          </XStack>
        </YStack>
      }
      crossSells={
        <FrequentlyBoughtTogether
          borderless={isBorderless}
          items={[
            {
              id: product.id || product.code,
              brand: product.brand || 'VAANYA LUXE',
              name: product.title,
              price: `₹${salePrice.toLocaleString('en-IN')}`,
              originalPrice: `₹${originalPrice.toLocaleString('en-IN')}`,
              offLabel: discountPercent > 0 ? `${discountPercent}% OFF` : undefined,
              gradient: ['#f3e6d8', '#d3aa75'],
              checked: true,
            },
            {
              id: 'cross-blouse-1',
              brand: 'VAANYA HERITAGE',
              name: 'Silk Brocade Stitched Blouse Piece',
              price: '₹1,299',
              originalPrice: '₹1,999',
              offLabel: '35% OFF',
              gradient: ['#f0d5d1', '#bf7b71'],
              checked: true,
            },
          ]}
          totalPrice={`₹${(salePrice + 1299).toLocaleString('en-IN')}`}
          totalOriginal={`₹${(originalPrice + 1999).toLocaleString('en-IN')}`}
          totalOff={`₹${(originalPrice + 1999 - (salePrice + 1299)).toLocaleString('en-IN')} OFF`}
          onAddAll={handleAddToBag}
        />
      }
      specifications={
        <SpecificationsPanel
          specs={specsList}
          sku={product.code || product.sku}
          showSilkMarkBadge={true}
          defaultCollapsed={true}
          isCollapsible={true}
          borderless={isBorderless}
        />
      }
      stickyBuyBar={
        <StickyAddToBagBar
          price={`₹${salePrice.toLocaleString('en-IN')}`}
          title={`${product.title} (${activeColorLabel})`}
          onAddToBag={handleAddToBag}
          buttonLabel={
            mode === 'preview'
              ? 'Publish Preview'
              : isOutOfStock
              ? 'Sold Out'
              : addedToBag
              ? '🛍 Added to Bag ✓'
              : '🛍 Add to Bag'
          }
          buttonBg={
            mode === 'preview'
              ? '#BE185D'
              : isOutOfStock
              ? '#94A3B8'
              : addedToBag
              ? '#16A34A'
              : undefined
          }
        />
      }
    />
  );
};

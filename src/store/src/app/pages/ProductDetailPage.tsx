import React, { useState, useEffect, useMemo } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { Platform, Share } from 'react-native';
import { useNavigation } from '../NavigationContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { usePermissions } from '../../context/PermissionsContext';
import { useToast } from '../../context/ToastContext';
import {
  mockCatalogService,
  StoreProduct,
  EthnicSwatch,
} from '../../services/mock/mockCatalogService';
import { FullscreenMediaViewer, FullscreenMediaItem } from '../../components/media';

// Design System Components shared directly with Storybook
import { ProductDetailTemplate } from '../../components/templates/ProductDetailTemplate';
import { Header } from '../../components/organisms/Header/Header';
import { ProductGallery, SwatchItem, GalleryImage } from '../../components/organisms/ProductGallery/ProductGallery';
import { ColourSelector, ColourOption } from '../../components/organisms/ColourSelector/ColourSelector';
import { SizeSelector } from '../../components/organisms/SizeSelector/SizeSelector';
import { FrequentlyBoughtTogether } from '../../components/organisms/FrequentlyBoughtTogether/FrequentlyBoughtTogether';
import { SpecificationsPanel } from '../../components/organisms/SpecificationsPanel/SpecificationsPanel';
import { RatingsPanel } from '../../components/organisms/RatingsPanel/RatingsPanel';
import { HorizontalProductStrip } from '../../components/organisms/HorizontalProductStrip/HorizontalProductStrip';
import { StickyAddToBagBar } from '../../components/molecules/StickyAddToBagBar/StickyAddToBagBar';
import { Breadcrumbs } from '../../components/molecules/Breadcrumbs/Breadcrumbs';
import { PriceTag } from '../../components/atoms/PriceTag/PriceTag';
import { RatingBadge } from '../../components/atoms/RatingBadge/RatingBadge';
import { HeartButton } from '../../components/atoms/HeartButton/HeartButton';
import { ShareButton } from '../../components/atoms/ShareButton/ShareButton';
import { useTheme, useResponsive } from '../../theme';

export const ProductDetailPage: React.FC = () => {
  const { params, goBack, navigate } = useNavigation();
  const { addItem, openDrawer } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const { tokens } = useTheme();
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('Free Size');
  const [zoomModalVisible, setZoomModalVisible] = useState(false);

  const targetCode = params.code || params.id || 'vf2b58';

  useEffect(() => {
    setLoading(true);
    mockCatalogService.getProductByCode(targetCode).then((p) => {
      setProduct(p);
      if (p) {
        const initialCgId =
          p.colorGroupId ||
          (p.colorGroups && p.colorGroups.length > 0 ? p.colorGroups[0].id : '') ||
          (p.swatches && p.swatches.length > 0 ? p.swatches[0].id : 'default');
        setSelectedColor(initialCgId);
      }
      setLoading(false);
    });

    mockCatalogService.getProducts().then((all) => {
      const filtered = all.filter((item) => item.code !== targetCode).slice(0, 4);
      setRelatedProducts(filtered);
    });
  }, [targetCode]);

  // Build Colour Options and Swatches Map from Store Product
  const { colourOptions, swatchesMap } = useMemo(() => {
    if (!product) return { colourOptions: [], swatchesMap: {} };

    const opts: ColourOption[] = [];
    const map: Record<string, SwatchItem> = {};

    if (product.colorGroups && product.colorGroups.length > 0) {
      product.colorGroups.forEach((cg) => {
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

        // Filter media items for this color group
        const matchingMedia =
          product.mediaOrder?.filter(
            (m) => m.colorGroupId === cg.id || m.isCommon || !m.colorGroupId
          ) || [];

        const images: GalleryImage[] = (matchingMedia.length > 0
          ? matchingMedia
          : (product.images || []).map((url, i) => ({
              id: `${cg.id}-${i}`,
              url,
              title: `${cg.name} Drape ${i + 1}`,
            }))
        ).map((m: any, idx: number) => ({
          id: m.id || `${cg.id}-${idx}`,
          label: m.title || `${cg.name} - View ${idx + 1}`,
          url: m.url,
          gradient: [cg.slotA || '#1a2a4e', cg.slotB || '#d81b60'],
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
    } else if (product.swatches && product.swatches.length > 0) {
      product.swatches.forEach((sw) => {
        opts.push({
          key: sw.id,
          label: sw.name,
          template: sw.type as any,
          primaryColor: sw.primaryHex,
          secondaryColor: sw.secondaryHex,
          tertiaryColor: sw.accentHex,
        });

        const images: GalleryImage[] = (product.images || []).map((url, idx) => ({
          id: `${sw.id}-${idx}`,
          label: `${sw.name} - View ${idx + 1}`,
          url,
          gradient: [sw.primaryHex || '#1a2a4e', sw.secondaryHex || '#d81b60'],
        }));

        map[sw.id] = {
          label: sw.name,
          template: sw.type as any,
          primaryColor: sw.primaryHex,
          secondaryColor: sw.secondaryHex,
          tertiaryColor: sw.accentHex,
          gradient: [sw.primaryHex || '#1a2a4e', sw.secondaryHex || '#d81b60'],
          images: images.length > 0 ? images : [
            {
              id: '1',
              label: `${sw.name} - Front Drape`,
              gradient: [sw.primaryHex || '#1a2a4e', sw.secondaryHex || '#d81b60'],
            },
          ],
        };
      });
    } else {
      const defaultKey = 'default';
      opts.push({
        key: defaultKey,
        label: product.colorwayName || 'Original Artisan Weave',
        template: product.swatchTemplate || 'solid',
        primaryColor: product.colorHex || '#D4AF37',
      });

      const images: GalleryImage[] = (product.images || []).map((url, idx) => ({
        id: `img-${idx}`,
        label: `${product.title} - View ${idx + 1}`,
        url,
        gradient: ['#1a2a4e', '#d81b60'],
      }));

      map[defaultKey] = {
        label: product.colorwayName || 'Original Artisan Weave',
        template: product.swatchTemplate || 'solid',
        primaryColor: product.colorHex || '#D4AF37',
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

  // Ensure active color matches available options
  const activeColorKey = useMemo(() => {
    if (selectedColor && swatchesMap[selectedColor]) {
      return selectedColor;
    }
    const firstKey = Object.keys(swatchesMap)[0];
    return firstKey || 'default';
  }, [selectedColor, swatchesMap]);

  // Prepare full-screen media viewer items
  const fullscreenMedia = useMemo<FullscreenMediaItem[]>(() => {
    if (!product) return [];
    const activeSwatch = swatchesMap[activeColorKey];
    if (activeSwatch?.images && activeSwatch.images.length > 0) {
      return activeSwatch.images
        .filter((img) => Boolean(img.url))
        .map((img) => ({
          id: img.id,
          url: img.url!,
          title: img.label,
        }));
    }
    return (product.images || []).map((url, idx) => ({
      id: `img-${idx}`,
      url,
      title: `${product.title} - View ${idx + 1}`,
    }));
  }, [product, swatchesMap, activeColorKey]);

  if (loading) {
    return (
      <YStack flex={1} backgroundColor={tokens.background} alignItems="center" justifyContent="center" gap={12}>
        <Text fontSize={16} fontWeight="700" color={tokens.text}>
          Loading Handloom Details...
        </Text>
        <Text fontSize={13} color={tokens.textSecondary}>
          Fetching authenticated GI weave records
        </Text>
      </YStack>
    );
  }

  if (!product) {
    return (
      <YStack flex={1} backgroundColor={tokens.background} alignItems="center" justifyContent="center" padding={24} gap={16}>
        <Text fontSize={22} fontWeight="900" color={tokens.text}>
          Product Not Found
        </Text>
        <Text fontSize={14} color={tokens.textSecondary} textAlign="center" maxWidth={420}>
          Product with code '{targetCode}' was not found in the live published catalog.
        </Text>
        <XStack
          backgroundColor={tokens.accent}
          paddingHorizontal={20}
          paddingVertical={12}
          borderRadius={12}
          cursor="pointer"
          onPress={() => navigate('catalog')}
          hoverStyle={{ opacity: 0.92 }}
        >
          <Text color={tokens.accentForeground} fontWeight="800" fontSize={14}>
            ← Return to Catalog
          </Text>
        </XStack>
      </YStack>
    );
  }

  const wishlisted = isInWishlist(product.id);

  const handleAddToBag = () => {
    const activeOption = colourOptions.find((o) => o.key === activeColorKey);
    const swatch: EthnicSwatch = {
      id: activeColorKey,
      name: activeOption?.label || product.colorwayName || 'Original',
      type: activeOption?.template || 'solid',
      primaryHex: activeOption?.primaryColor || product.colorHex || '#D4AF37',
      secondaryHex: activeOption?.secondaryColor,
      accentHex: activeOption?.tertiaryColor,
    };

    addItem(product, swatch);
    showToast({
      message: `Added ${product.title.slice(0, 24)}... to Bag`,
      type: 'success',
    });
    openDrawer();
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product.id);
    const added = !wishlisted;
    showToast({
      message: added ? 'Saved to Wishlist' : 'Removed from Wishlist',
      type: added ? 'success' : 'info',
    });
  };

  const handleShare = async () => {
    const shareUrl =
      typeof window !== 'undefined'
        ? window.location.href
        : `https://store.vayyarifashions.com/product/${product.code}`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: product.title,
          text: `Explore ${product.title} from ${product.brand} on Vayyari`,
          url: shareUrl,
        });
      } else if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        showToast({ message: 'Product link copied to clipboard!', type: 'success' });
      } else {
        await Share.share({
          message: `${product.title} - ${shareUrl}`,
          title: product.title,
        });
      }
    } catch {
      // User cancelled or clipboard fallback
    }
  };

  const formattedPrice = `₹${product.price.toLocaleString('en-IN')}`;
  const formattedOrigPrice = `₹${product.originalPrice.toLocaleString('en-IN')}`;
  const activeColorLabel =
    colourOptions.find((o) => o.key === activeColorKey)?.label || product.colorwayName || 'Silk Drape';

  return (
    <>
      <ProductDetailTemplate
        header={
          <Header
            onOpenCart={openDrawer}
            onOpenWishlist={() => navigate('wishlist')}
            onOpenSearch={() => navigate('catalog')}
          />
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Home', onPress: () => navigate('home') },
              {
                label: product.category
                  ? product.category.charAt(0).toUpperCase() + product.category.slice(1)
                  : 'Catalog',
                onPress: () => navigate('catalog'),
              },
              {
                label: product.weaveOrigin ? `${product.weaveOrigin} Weaves` : 'Handloom Sarees',
                onPress: () => navigate('catalog'),
              },
              { label: product.title },
            ]}
          />
        }
        gallery={
          <ProductGallery
            swatches={swatchesMap}
            selectedColor={activeColorKey}
            onSelectColor={setSelectedColor}
          >
            {/* Mobile: Compact ColourSelector Card right below Carousel */}
            {isMobile && colourOptions.length > 0 ? (
              <YStack
                backgroundColor={tokens.surface}
                borderColor={tokens.border}
                borderWidth={1}
                borderRadius={16}
                padding={16}
                gap={10}
              >
                <ColourSelector
                  options={colourOptions}
                  selected={activeColorKey}
                  onSelect={setSelectedColor}
                  format="dots"
                />
              </YStack>
            ) : isTablet && colourOptions.length > 0 ? (
              /* Tablet: Raw ColourSelector embedded in the right side of tablet split card */
              <ColourSelector
                options={colourOptions}
                selected={activeColorKey}
                onSelect={setSelectedColor}
                format="dots"
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
            {/* Brand Header & Rating Badge */}
            <YStack gap={6}>
              <XStack justifyContent="space-between" alignItems="center">
                <Text
                  fontSize={12}
                  fontWeight="800"
                  color={tokens.accent}
                  letterSpacing={1.2}
                  textTransform="uppercase"
                >
                  {product.brand || 'VAANYA LUXE HERITAGE'}
                </Text>
                <RatingBadge rating={product.rating || 4.8} count={product.reviewCount || 248} />
              </XStack>

              <Text
                fontSize={isMobile ? 20 : 24}
                fontWeight="900"
                color={tokens.text}
                letterSpacing={-0.5}
                lineHeight={isMobile ? 26 : 30}
              >
                {product.title}
              </Text>

              <Text fontSize={13} color={tokens.textSecondary} lineHeight={20}>
                {product.description ||
                  `Handcrafted authentic ${product.weaveOrigin || 'Chanderi'} weave with certified natural silk mark guarantee.`}
              </Text>
            </YStack>

            {/* Pricing Section */}
            <YStack paddingVertical={4}>
              <PriceTag
                price={product.price}
                originalPrice={product.originalPrice > product.price ? product.originalPrice : undefined}
                offPercent={product.discountPercentage > 0 ? product.discountPercentage : undefined}
                size={isMobile ? 'md' : 'lg'}
              />
              <Text fontSize={11} color={tokens.textMuted} marginTop={4}>
                Inclusive of all taxes. Free express delivery applied at checkout.
              </Text>
            </YStack>

            {/* Desktop only: ColourSelector format="cards" */}
            {!isCompact && colourOptions.length > 0 ? (
              <ColourSelector
                options={colourOptions}
                selected={activeColorKey}
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

            {/* Call to Actions */}
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
                onPress={handleToggleWishlist}
              />
              <ShareButton size={46} onPress={handleShare} />
            </XStack>

            {/* In-Stock & Dispatch Assurance */}
            <XStack
              backgroundColor={tokens.surfaceRaised}
              borderRadius={12}
              padding={isMobile ? 12 : 14}
              alignItems="center"
              gap={10}
            >
              <Text fontSize={18}>{product.inStock ? '⚡' : '📦'}</Text>
              <YStack flex={1}>
                <Text fontSize={12} fontWeight="800" color={tokens.text}>
                  {product.inStock
                    ? 'Guaranteed Dispatch within 24 Hours'
                    : 'Crafted on Demand (Ships in 4-6 business days)'}
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
            items={[
              {
                id: product.id,
                brand: product.brand || 'VAANYA LUXE',
                name: product.title,
                price: formattedPrice,
                originalPrice: formattedOrigPrice,
                offLabel: product.discountPercentage > 0 ? `${product.discountPercentage}% OFF` : undefined,
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
            totalPrice={`₹${(product.price + 1299).toLocaleString('en-IN')}`}
            totalOriginal={`₹${(product.originalPrice + 1999).toLocaleString('en-IN')}`}
            totalOff={`₹${(product.originalPrice + 1999 - (product.price + 1299)).toLocaleString('en-IN')} OFF`}
            onAddAll={handleAddToBag}
          />
        }
        specifications={
          <SpecificationsPanel
            specs={[
              { label: 'Fabric Composition', value: product.fabric || '100% Pure Mulberry Silk' },
              { label: 'Weave Origin / Craft', value: product.weaveOrigin || 'Handloom Traditional Weave' },
              { label: 'Product Code / SKU', value: product.code || '-' },
              { label: 'Silk Mark Certification', value: 'Certified SM/IND/2026/9102' },
              { label: 'Wash Care Instructions', value: 'Dry Clean Only, Store in Muslin Bag' },
              {
                label: 'Dispatch Timeline',
                value: product.inStock
                  ? 'Guaranteed Dispatch within 24 Hours'
                  : 'Made to Order (Ships in 4-6 Days)',
              },
            ]}
          />
        }
        reviews={
          <RatingsPanel
            averageRating={product.rating || 4.8}
            totalReviews={product.reviewCount || 248}
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
          relatedProducts.length > 0 ? (
            <YStack
              backgroundColor={tokens.surface}
              borderColor={tokens.border}
              borderWidth={1}
              borderRadius={20}
              overflow="hidden"
            >
              <HorizontalProductStrip
                title="You May Also Cherish"
                subtitle="Similar handloom sarees selected by our master curators"
                badgeLabel="RECOMMENDED"
                products={relatedProducts.map((p, idx) => ({
                  id: p.id,
                  brand: p.brand || 'VAANYA LUXE',
                  name: p.title,
                  price: p.price,
                  originalPrice: p.originalPrice,
                  offPercent: p.discountPercentage,
                  rating: p.rating,
                  gradient: (idx % 2 === 0
                    ? ['#f0d5d1', '#bf7b71']
                    : ['#dfe9d8', '#9ec38f']) as [string, string],
                }))}
                showAddToBag={true}
                onProductPress={(id) => {
                  const target = relatedProducts.find((p) => p.id === id);
                  if (target) {
                    navigate('pdp', { code: target.code, id: target.id });
                  }
                }}
              />
            </YStack>
          ) : null
        }
        stickyBuyBar={
          <StickyAddToBagBar
            price={formattedPrice}
            title={`${product.title} (${activeColorLabel})`}
            onAddToBag={handleAddToBag}
          />
        }
      />

      {/* Fullscreen High-Res Media Viewer Modal */}
      {fullscreenMedia.length > 0 && (
        <FullscreenMediaViewer
          visible={zoomModalVisible}
          onClose={() => setZoomModalVisible(false)}
          media={fullscreenMedia}
          productTitle={product.title}
          productCode={product.code}
        />
      )}
    </>
  );
};

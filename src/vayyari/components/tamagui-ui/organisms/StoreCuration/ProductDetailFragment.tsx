import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Image,
  Pressable,
  Platform,
  Share,
  Dimensions,
  StyleSheet,
  Modal,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LuArrowLeft,
  LuChevronLeft,
  LuChevronRight,
  LuHeart,
  LuShare2,
  LuShieldCheck,
  LuEye,
  LuPlay,
  LuX,
  LuInstagram,
  LuCheck,
  LuStore,
} from '@/components/tamagui-ui/icons/lu';
import { useTheme } from '@/theme';
import { CustomSwatchDot, SwatchTemplateType } from '@/components/tamagui-ui/atoms/SwatchDot/CustomSwatchDot';
import { getMediaDisplayUri } from '@/utils/curationMediaRules';
import { PdpConfig, DEFAULT_PDP_CONFIG } from '@/constants/pdpConfig';

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
  config?: Partial<PdpConfig>;
}

export const ProductDetailFragment: React.FC<ProductDetailFragmentProps> = ({
  product,
  mode = 'live',
  borderless = true,
  selectedColorId: controlledColorId,
  onSelectColorId,
  selectedSize: controlledSize,
  onSelectSize,
  onAddToCart,
  onToggleWishlist,
  isWishlisted: controlledWishlisted,
  onShare,
  onBack,
  topBanner,
  config: userConfig,
}) => {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = Dimensions.get('window');
  const isMobile = windowWidth < 768;

  const effectiveConfig: PdpConfig = useMemo(() => {
    return {
      ...DEFAULT_PDP_CONFIG,
      ...userConfig,
    };
  }, [userConfig]);

  // ── Color Groups Resolution ──
  const colorGroups = useMemo<PdpProductColorGroup[]>(() => {
    if (product.colorGroups && product.colorGroups.length > 0) {
      return product.colorGroups;
    }
    return [
      {
        id: 'default',
        name: 'Original Artisan Weave',
        template: 'solid',
        slotA: '#D4AF37',
        colors: ['#D4AF37'],
      },
    ];
  }, [product.colorGroups]);

  const [internalColorId, setInternalColorId] = useState<string>(() => {
    return controlledColorId || colorGroups[0]?.id || 'default';
  });
  const activeColorId = controlledColorId !== undefined ? controlledColorId : internalColorId;

  const handleSelectColor = (id: string) => {
    if (onSelectColorId) {
      onSelectColorId(id);
    } else {
      setInternalColorId(id);
    }
    setActiveSlideIndex(0);
  };

  // ── Media Pool Resolution ──
  const normalizedMediaList = useMemo<PdpProductMediaItem[]>(() => {
    if (product.mediaList && product.mediaList.length > 0) {
      return product.mediaList;
    }
    if (product.mediaOrder && product.mediaOrder.length > 0) {
      return product.mediaOrder;
    }
    if (product.images && product.images.length > 0) {
      return product.images.map((url, idx) => ({
        id: `img-${idx}`,
        url,
        title: `${product.title} - View ${idx + 1}`,
        mediaType: 'image',
        sortOrder: idx,
      }));
    }
    return [];
  }, [product.mediaList, product.mediaOrder, product.images]);

  const activeGroup = colorGroups.find((g) => g.id === activeColorId) || colorGroups[0];

  // Swatch-specific filtering: assigned media for active color + common/shared media
  const displayMedia = useMemo(() => {
    if (!activeColorId) {
      return [...normalizedMediaList].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    const filtered = normalizedMediaList.filter((m) => {
      if (m.isCommon) return true;
      if (m.colorGroupId) return m.colorGroupId === activeColorId;
      return colorGroups.length <= 1;
    });
    const pool = filtered.length > 0 ? filtered : normalizedMediaList;
    return [...pool].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [normalizedMediaList, activeColorId, colorGroups.length]);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);

  // ── Size Configuration ──
  const sizeOptions = useMemo(() => {
    const cat = (product.category || '').toLowerCase();
    const title = (product.title || '').toLowerCase();

    if (cat.includes('kid') || title.match(/\b(kid|boy|girl|baby)\b/)) {
      return ['16', '18', '20', '22', '24', '26', '28'];
    }
    if (cat.includes('blouse') || title.match(/\b(blouse|choli)\b/)) {
      return ['32', '34', '36', '38', '40', '42', '44'];
    }
    if (cat.includes('dress') || cat.includes('kurta') || title.match(/\b(dress|kurti|anarkali|gown)\b/)) {
      return ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
    }
    return ['Free Size'];
  }, [product.category, product.title]);

  const [internalSize, setInternalSize] = useState<string>(() => {
    return controlledSize || sizeOptions[0] || 'Free Size';
  });
  const activeSize = controlledSize !== undefined ? controlledSize : internalSize;

  const handleSelectSize = (size: string) => {
    if (onSelectSize) {
      onSelectSize(size);
    } else {
      setInternalSize(size);
    }
  };

  // ── Local Interaction State ──
  const [internalWishlisted, setInternalWishlisted] = useState(false);
  const isWishlisted = controlledWishlisted !== undefined ? controlledWishlisted : internalWishlisted;

  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(
    !effectiveConfig.descriptionDefaultCollapsed
  );
  const [specsCollapsed, setSpecsCollapsed] = useState<boolean>(
    effectiveConfig.specsDefaultCollapsed ?? true
  );
  const [addedToBagNotice, setAddedToBagNotice] = useState<string | null>(null);

  // ── Pricing Calculations ──
  const price = product.price || 0;
  const originalPrice = product.originalPrice || 0;
  const discountPercent =
    product.discountPercent ??
    product.discountPercentage ??
    (originalPrice > price && originalPrice > 0
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0);

  // ── Specifications Resolution ──
  const resolvedSpecs = useMemo(() => {
    if (product.curatedSpecs) {
      const cs = product.curatedSpecs;
      return [
        { label: 'Product Code / SKU', value: product.sku || product.code },
        { label: 'Fabric Base', value: cs.fabricName || product.fabric },
        { label: 'Weave Technique', value: cs.weaveTechniqueName || 'Handloom Pitloom Weave' },
        { label: 'Regional Craft Origin', value: cs.craftOriginName || product.weaveOrigin || 'Varanasi, Uttar Pradesh' },
        { label: 'Motif & Patterns', value: cs.motifPatternName || 'Traditional Floral Buti & Zari Border' },
        { label: 'Border & Pallu Detail', value: cs.borderPalluName || 'Intricate Heavy Zari Pallu' },
        { label: 'Zari Material', value: cs.zariMaterialName || 'Tested Metallic Gold Zari' },
        { label: 'Work Heaviness', value: cs.workHeavinessName || 'Festive / Bridal Heritage' },
        { label: 'Saree Drape Length', value: `${cs.sareeLengthMetres || 5.5} metres` },
        { label: 'Blouse Format', value: cs.blouseTypeName || `${cs.blousePieceLengthMetres || 0.8}m Unstitched Running Blouse` },
        { label: 'Wash Care & Preservation', value: cs.careInstructions || 'Dry Clean Only, Store wrapped in Muslin cloth' },
      ].filter((s) => Boolean(s.value));
    }
    if (Array.isArray(product.specifications)) {
      return product.specifications;
    }
    if (product.specifications && typeof product.specifications === 'object') {
      return Object.entries(product.specifications).map(([key, val]) => ({
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
        value: String(val),
      }));
    }
    return [
      { label: 'Product Code / SKU', value: product.sku || product.code },
      { label: 'Fabric Composition', value: product.fabric || 'Pure Katan Silk (100% Mulberry)' },
      { label: 'Weave Technique', value: product.highlights?.[0] || 'Handloom Kadwa Brocade Weave' },
      { label: 'Regional Origin', value: product.weaveOrigin || 'Varanasi, Uttar Pradesh' },
      { label: 'Saree Drape Length', value: '5.5 metres' },
      { label: 'Blouse Format', value: '0.8 metres Unstitched Attached Blouse Piece' },
      { label: 'Wash Care Instructions', value: 'Dry Clean Only, Store in Cotton Bag' },
    ];
  }, [product]);

  // ── Actions ──
  const handleAddToBagPress = () => {
    if (onAddToCart) {
      onAddToCart(product, activeColorId, activeSize);
    }
    setAddedToBagNotice(`Added ${product.title.slice(0, 20)}... (${activeSize}) to Bag`);
    setTimeout(() => setAddedToBagNotice(null), 3000);
  };

  const handleWishlistPress = () => {
    if (onToggleWishlist) {
      onToggleWishlist(product.id || product.code);
    } else {
      setInternalWishlisted((prev) => !prev);
    }
  };

  const handleSharePress = async () => {
    if (onShare) {
      onShare();
      return;
    }
    try {
      const shareUrl = `https://store.vayyarifashions.com/product/${product.code}`;
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: product.title,
          text: `Explore ${product.title} on Vayyari`,
          url: shareUrl,
        });
      } else {
        await Share.share({
          title: product.title,
          message: `${product.title} - ${shareUrl}`,
        });
      }
    } catch {
      // User cancelled
    }
  };

  const currentMedia = displayMedia[activeSlideIndex] || displayMedia[0];
  const isCurrentVideo = currentMedia?.mediaType === 'video';

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* ── TOP PREVIEW / CUSTOM BANNER (Optional custom banner slot) ── */}
      {topBanner}

      {/* ── LEAN TOP NAVIGATION BAR (Zero wasted space; preview pill embedded) ── */}
      <XStack
        paddingHorizontal={12}
        paddingTop={mode === 'preview' ? 8 : (insets.top > 0 ? insets.top : 8)}
        paddingBottom={8}
        alignItems="center"
        justifyContent="space-between"
        backgroundColor={tokens.background}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        zIndex={30}
      >
        <XStack alignItems="center" gap={8} flex={1}>
          {onBack && (
            <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}>
              <LuArrowLeft size={18} color={tokens.text} />
              {mode === 'preview' && (
                <Text fontSize={11} fontWeight="800" color={tokens.textSecondary} marginLeft={2}>
                  Back
                </Text>
              )}
            </Pressable>
          )}
          <Text fontSize={14} fontWeight="900" color={tokens.text} letterSpacing={0.5} numberOfLines={1}>
            {product.brand || 'VAYYARI LUXE'}
          </Text>
          <View style={styles.codePill}>
            <Text fontSize={10} fontWeight="800" color="#64748B" fontFamily="$mono">
              {product.code || product.sku}
            </Text>
          </View>
        </XStack>

        <XStack alignItems="center" gap={10}>
          {mode === 'preview' && (
            <XStack
              backgroundColor="#FEF3C7"
              borderColor="#FDE68A"
              borderWidth={1}
              paddingHorizontal={8}
              paddingVertical={3}
              borderRadius={6}
              alignItems="center"
              gap={4}
            >
              <LuEye size={12} color="#B45309" />
              <Text fontSize={10} fontWeight="800" color="#92400E">
                PREVIEW
              </Text>
            </XStack>
          )}

          <Pressable onPress={handleSharePress} hitSlop={8}>
            <LuShare2 size={18} color={tokens.text} />
          </Pressable>
          <Pressable onPress={handleWishlistPress} hitSlop={8}>
            <LuHeart
              size={19}
              color={isWishlisted ? '#EF4444' : tokens.text}
              fill={isWishlisted ? '#EF4444' : 'none'}
            />
          </Pressable>
        </XStack>
      </XStack>

      {/* ── MAIN SCROLLABLE CONTENT ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: isMobile ? 96 : 60,
          paddingTop: 0,
        }}
      >
        <YStack
          maxWidth={1200}
          width="100%"
          alignSelf="center"
          paddingHorizontal={borderless && isMobile ? 0 : 16}
          gap={isMobile ? 12 : 20}
        >
          {/* ── 1. MEDIA GALLERY WITH HERO VIEWER & THUMBNAILS RAIL ── */}
          <YStack
            width="100%"
            backgroundColor="#F8FAFC"
            position="relative"
            overflow="hidden"
          >
            {/* Hero Main Image Stage */}
            <YStack
              width="100%"
              height={isMobile ? 400 : 500}
              position="relative"
              backgroundColor="#0F172A"
            >
              {currentMedia ? (
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => setFullscreenVisible(true)}
                >
                  <Image
                    source={{
                      uri:
                        (currentMedia as any)?.uri ||
                        currentMedia?.url ||
                        getMediaDisplayUri(currentMedia as any),
                    }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                </Pressable>
              ) : (
                <YStack flex={1} alignItems="center" justifyContent="center" gap={8}>
                  <LuEye size={24} color="#94A3B8" />
                  <Text fontSize={13} color="#94A3B8">
                    No photos available in this colorway
                  </Text>
                </YStack>
              )}

              {/* Video Play / Streaming Badge */}
              {isCurrentVideo && (
                <View style={styles.videoBadgeOverlay}>
                  <XStack
                    backgroundColor="rgba(0,0,0,0.7)"
                    paddingHorizontal={10}
                    paddingVertical={4}
                    borderRadius={20}
                    alignItems="center"
                    gap={6}
                  >
                    <View style={styles.liveDot} />
                    <Text fontSize={11} fontWeight="800" color="#FFFFFF">
                      Instagram Reel Video
                    </Text>
                    {currentMedia?.sourcePlatform === 'instagram' && (
                      <LuInstagram size={12} color="#E1306C" />
                    )}
                  </XStack>
                </View>
              )}

              {/* Carousel Navigation Chevrons */}
              {displayMedia.length > 1 && (
                <>
                  <Pressable
                    style={[styles.chevronButton, { left: 10 }]}
                    onPress={() =>
                      setActiveSlideIndex(
                        (prev) => (prev - 1 + displayMedia.length) % displayMedia.length
                      )
                    }
                    hitSlop={8}
                  >
                    <LuChevronLeft size={18} color="#1E293B" />
                  </Pressable>
                  <Pressable
                    style={[styles.chevronButton, { right: 10 }]}
                    onPress={() =>
                      setActiveSlideIndex((prev) => (prev + 1) % displayMedia.length)
                    }
                    hitSlop={8}
                  >
                    <LuChevronRight size={18} color="#1E293B" />
                  </Pressable>

                  {/* Media Counter Pill */}
                  <View style={styles.counterPill}>
                    <Text fontSize={11} fontWeight="800" color="#FFFFFF">
                      {activeSlideIndex + 1} / {displayMedia.length}
                    </Text>
                  </View>
                </>
              )}
            </YStack>

            {/* ── THUMBNAILS RAIL (Horizontal preview strip below main photo) ── */}
            {displayMedia.length > 1 && (
              <XStack
                width="100%"
                backgroundColor="#0F172A"
                paddingVertical={8}
                paddingHorizontal={12}
                borderTopWidth={1}
                borderTopColor="rgba(255,255,255,0.12)"
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, alignItems: 'center' }}
                >
                  {displayMedia.map((media, idx) => {
                    const isSelected = idx === activeSlideIndex;
                    const mediaUri =
                      (media as any)?.uri ||
                      media?.url ||
                      (media as any)?.thumbnailUri ||
                      getMediaDisplayUri(media as any);
                    const isVid = media.mediaType === 'video';

                    return (
                      <Pressable
                        key={media.id || idx}
                        onPress={() => {
                          setActiveSlideIndex(idx);
                          setIsPlayingVideo(false);
                        }}
                        style={[
                          styles.thumbnailTile,
                          isSelected && {
                            borderColor: tokens.accent,
                            borderWidth: 2.5,
                            opacity: 1,
                          },
                        ]}
                      >
                        {mediaUri ? (
                          <Image
                            source={{ uri: mediaUri }}
                            style={styles.thumbnailImg}
                            resizeMode="cover"
                          />
                        ) : (
                          <YStack
                            flex={1}
                            backgroundColor="#334155"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <LuEye size={12} color="#94A3B8" />
                          </YStack>
                        )}
                        {isVid && (
                          <View style={styles.thumbnailVideoIcon}>
                            <LuPlay size={8} color="#FFFFFF" fill="#FFFFFF" />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </XStack>
            )}
          </YStack>

          {/* ── 2. PRODUCT DETAILS & PURCHASE PANEL ── */}
          <YStack
            backgroundColor="#FFFFFF"
            borderColor={tokens.border}
            borderWidth={borderless && isMobile ? 0 : 1}
            borderRadius={borderless && isMobile ? 0 : 16}
            padding={borderless && isMobile ? 12 : 18}
            gap={12}
          >
            {/* Brand Title */}
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

            {/* Custom Sku Badge */}
            {product.customSkuMessage ? (
              <XStack
                alignSelf="flex-start"
                backgroundColor="#FEF3C7"
                borderColor="#F59E0B"
                borderWidth={1}
                paddingHorizontal={10}
                paddingVertical={4}
                borderRadius={8}
                alignItems="center"
                gap={6}
              >
                <Text fontSize={12}>✨</Text>
                <Text fontSize={12} fontWeight="800" color="#92400E">
                  {product.customSkuMessage}
                </Text>
              </XStack>
            ) : null}

            {/* 2-Line Clamped Description with Read More Toggle */}
            <YStack gap={4}>
              <Text
                fontSize={13}
                color={tokens.textSecondary}
                lineHeight={20}
                numberOfLines={descriptionExpanded ? undefined : (effectiveConfig.descriptionTruncateLines || 2)}
              >
                {product.description ||
                  `Artisan handloom woven with pure mulberry silk yarns and tested metallic zari borders. Certified by master handloom weavers with Silk Mark guarantee.`}
              </Text>
              <Pressable
                onPress={() => setDescriptionExpanded((prev) => !prev)}
                style={{ alignSelf: 'flex-start', marginTop: 2 }}
                hitSlop={6}
              >
                <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                  {descriptionExpanded ? 'Show Less ↑' : 'Read More... ↓'}
                </Text>
              </Pressable>
            </YStack>

            {/* Pricing Section */}
            <YStack gap={4} marginTop={2}>
              <XStack alignItems="baseline" gap={10}>
                <Text fontSize={24} fontWeight="900" color={tokens.text}>
                  ₹{price.toLocaleString('en-IN')}
                </Text>
                {originalPrice > price && (
                  <Text
                    fontSize={15}
                    fontWeight="600"
                    color={tokens.textMuted}
                    style={{ textDecorationLine: 'line-through' }}
                  >
                    ₹{originalPrice.toLocaleString('en-IN')}
                  </Text>
                )}
                {discountPercent > 0 && (
                  <XStack backgroundColor="#DCFCE7" paddingHorizontal={8} paddingVertical={3} borderRadius={6}>
                    <Text fontSize={11} fontWeight="800" color="#166534">
                      {discountPercent}% OFF
                    </Text>
                  </XStack>
                )}
              </XStack>
              <Text fontSize={11} color={tokens.textMuted}>
                Inclusive of all taxes. Free express shipping applied at checkout.
              </Text>
            </YStack>

            {/* Color Variations / Swatches Selector (Integrated directly in Purchase Panel) */}
            {colorGroups.length > 1 && (
              <YStack gap={8} marginTop={6}>
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={13} fontWeight="800" color={tokens.text}>
                    Select Colorway
                  </Text>
                  <Text fontSize={12} fontWeight="700" color={tokens.accent}>
                    {activeGroup?.name || 'Selected'} ({colorGroups.length} weaves)
                  </Text>
                </XStack>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
                >
                  {colorGroups.map((cg) => {
                    const isSel = activeColorId === cg.id;
                    return (
                      <Pressable
                        key={cg.id}
                        onPress={() => handleSelectColor(cg.id)}
                        style={[
                          styles.colorSwatchChip,
                          isSel && {
                            borderColor: tokens.accent,
                            backgroundColor: `${tokens.accent}14`,
                          },
                        ]}
                      >
                        <CustomSwatchDot
                          template={cg.template || 'solid'}
                          primaryColor={cg.slotA || '#1B4D3E'}
                          secondaryColor={cg.slotB}
                          tertiaryColor={cg.slotC}
                          quaternaryColor={cg.slotD}
                          size={20}
                        />
                        <Text
                          fontSize={12}
                          fontWeight={isSel ? '800' : '600'}
                          color={isSel ? tokens.accent : tokens.text}
                        >
                          {cg.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </YStack>
            )}

            {/* Size Selector */}
            <YStack gap={8} marginTop={6}>
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={13} fontWeight="800" color={tokens.text}>
                  Select Size
                </Text>
                <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                  Size Guide & Drape Info
                </Text>
              </XStack>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {sizeOptions.map((sz) => {
                  const isSel = activeSize === sz;
                  return (
                    <Pressable
                      key={sz}
                      onPress={() => handleSelectSize(sz)}
                      style={[
                        styles.sizeChip,
                        isSel && {
                          borderColor: tokens.accent,
                          backgroundColor: `${tokens.accent}14`,
                        },
                      ]}
                    >
                      <Text
                        fontSize={12}
                        fontWeight="800"
                        color={isSel ? tokens.accent : tokens.text}
                      >
                        {sz}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </YStack>

            {/* Guaranteed Dispatch Badge */}
            <XStack
              backgroundColor="#F8FAFC"
              borderColor="#E2E8F0"
              borderWidth={1}
              borderRadius={12}
              padding={12}
              alignItems="center"
              gap={10}
              marginTop={6}
            >
              <LuShieldCheck size={20} color="#16A34A" />
              <YStack flex={1}>
                <Text fontSize={12} fontWeight="800" color={tokens.text}>
                  Guaranteed Dispatch within 24 Hours
                </Text>
                <Text fontSize={11} color={tokens.textSecondary}>
                  100% Certified GI Handloom with Easy 7-Day Returns
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* ── 3. COLLAPSIBLE SPECIFICATIONS PANEL (With Count Pill) ── */}
          <YStack
            backgroundColor="#FFFFFF"
            borderColor={tokens.border}
            borderWidth={1}
            borderRadius={16}
            marginHorizontal={borderless && isMobile ? 12 : 0}
            overflow="hidden"
          >
            <Pressable
              onPress={() => setSpecsCollapsed((prev) => !prev)}
              style={styles.accordionHeader}
            >
              <XStack alignItems="center" gap={8}>
                <Text fontSize={14} fontWeight="800" color={tokens.text}>
                  Craft Specifications
                </Text>
                <View style={styles.countPill}>
                  <Text fontSize={10} fontWeight="800" color="#2563EB">
                    ({resolvedSpecs.length})
                  </Text>
                </View>
                {effectiveConfig.specsShowSilkMark && (
                  <XStack
                    backgroundColor="#FEF2F2"
                    borderColor="#FECACA"
                    borderWidth={1}
                    paddingHorizontal={6}
                    paddingVertical={2}
                    borderRadius={4}
                  >
                    <Text fontSize={9} fontWeight="800" color="#991B1B">
                      SILK MARK
                    </Text>
                  </XStack>
                )}
              </XStack>
              <Text fontSize={14} fontWeight="700" color={tokens.accent}>
                {specsCollapsed ? 'View All ↓' : 'Hide ↑'}
              </Text>
            </Pressable>

            {!specsCollapsed && (
              <YStack
                paddingHorizontal={16}
                paddingBottom={16}
                gap={10}
                borderTopWidth={1}
                borderTopColor={tokens.border}
              >
                {resolvedSpecs.map((spec, idx) => (
                  <XStack
                    key={idx}
                    justifyContent="space-between"
                    alignItems="flex-start"
                    paddingTop={8}
                  >
                    <Text fontSize={12} color={tokens.textSecondary} flex={1}>
                      {spec.label}
                    </Text>
                    <Text
                      fontSize={12}
                      fontWeight="700"
                      color={tokens.text}
                      flex={1.2}
                      textAlign="right"
                    >
                      {String(spec.value)}
                    </Text>
                  </XStack>
                ))}
              </YStack>
            )}
          </YStack>
        </YStack>
      </ScrollView>

      {/* ── ADDED TO BAG TEMPORARY NOTICE ── */}
      {addedToBagNotice && (
        <XStack
          position="absolute"
          bottom={80}
          left={16}
          right={16}
          backgroundColor="#1E293B"
          borderRadius={12}
          paddingHorizontal={16}
          paddingVertical={12}
          alignItems="center"
          justifyContent="space-between"
          shadowColor="#000"
          shadowOpacity={0.2}
          shadowRadius={10}
          zIndex={100}
        >
          <XStack alignItems="center" gap={8} flex={1}>
            <LuCheck size={16} color="#22C55E" />
            <Text fontSize={12} fontWeight="700" color="#FFFFFF" numberOfLines={1}>
              {addedToBagNotice}
            </Text>
          </XStack>
        </XStack>
      )}

      {/* ── STICKY BOTTOM ACTION BAR (CTA) ── */}
      <XStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor="#FFFFFF"
        borderTopWidth={1}
        borderTopColor={tokens.border}
        paddingHorizontal={16}
        paddingTop={10}
        paddingBottom={insets.bottom > 0 ? insets.bottom + 6 : 12}
        alignItems="center"
        justifyContent="space-between"
        gap={12}
        zIndex={50}
      >
        <YStack>
          <Text fontSize={11} color={tokens.textMuted}>
            Total Price
          </Text>
          <Text fontSize={18} fontWeight="900" color={tokens.text}>
            ₹{price.toLocaleString('en-IN')}
          </Text>
        </YStack>

        <XStack flex={1} gap={10} justifyContent="flex-end">
          <Pressable
            onPress={handleWishlistPress}
            style={styles.bottomHeartButton}
            hitSlop={6}
          >
            <LuHeart
              size={19}
              color={isWishlisted ? '#EF4444' : tokens.text}
              fill={isWishlisted ? '#EF4444' : 'none'}
            />
          </Pressable>

          <Pressable
            onPress={handleAddToBagPress}
            style={[
              styles.bottomAddBagButton,
              { backgroundColor: tokens.accent },
            ]}
          >
            <LuStore size={16} color="#FFFFFF" />
            <Text fontSize={14} fontWeight="800" color="#FFFFFF">
              {mode === 'preview' ? 'Simulate Add to Bag' : 'Add to Bag'}
            </Text>
          </Pressable>
        </XStack>
      </XStack>

      {/* ── FULLSCREEN MEDIA VIEWER MODAL ── */}
      {fullscreenVisible && (
        <Modal
          visible={fullscreenVisible}
          transparent={false}
          animationType="fade"
          onRequestClose={() => setFullscreenVisible(false)}
        >
          <YStack flex={1} backgroundColor="#000000" position="relative">
            <XStack
              position="absolute"
              top={insets.top > 0 ? insets.top + 10 : 20}
              right={16}
              zIndex={60}
              backgroundColor="rgba(0,0,0,0.6)"
              borderRadius={20}
              padding={8}
            >
              <Pressable onPress={() => setFullscreenVisible(false)} hitSlop={10}>
                <LuX size={22} color="#FFFFFF" />
              </Pressable>
            </XStack>

            <Image
              source={{
                uri:
                  (currentMedia as any)?.uri ||
                  currentMedia?.url ||
                  getMediaDisplayUri(currentMedia as any),
              }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
          </YStack>
        </Modal>
      )}
    </YStack>
  );
};

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  codePill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chevronButton: {
    position: 'absolute',
    top: '46%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  counterPill: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 20,
  },
  videoBadgeOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  thumbnailTile: {
    width: 52,
    height: 64,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    position: 'relative',
    opacity: 0.7,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  thumbnailVideoIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    padding: 2,
  },
  colorSwatchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  sizeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  countPill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  bottomHeartButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomAddBagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 12,
  },
});

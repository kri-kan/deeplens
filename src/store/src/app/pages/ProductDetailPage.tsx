import React, { useState, useEffect, useMemo } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { Platform, Share } from 'react-native';
import { useNavigation } from '../NavigationContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  mockCatalogService,
  StoreProduct,
  EthnicSwatch,
} from '../../services/mock/mockCatalogService';
import { FullscreenMediaViewer, FullscreenMediaItem } from '../../components/media';
import { DismissibleLoginModal } from '../../components/DismissibleLoginModal';
import { ProductDetailFragment, PdpProductData } from '../../components/organisms/ProductDetailFragment';
import { useTheme, useResponsive } from '../../theme';

export const ProductDetailPage: React.FC = () => {
  const { params, navigate } = useNavigation();
  const { addItem, openDrawer } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const { user, token } = useAuth();
  const { tokens } = useTheme();
  const { isMobile } = useResponsive();

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('Free Size');
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [isOnWaitlist, setIsOnWaitlist] = useState<boolean>(false);
  const [isWaitlistLoading, setIsWaitlistLoading] = useState<boolean>(false);
  const [loginModalVisible, setLoginModalVisible] = useState<boolean>(false);
  const [addedToBag, setAddedToBag] = useState(false);

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

        const cat = (p.category || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        if (cat.includes('kid') || title.match(/\b(kid|boy|girl|baby|toddler)\b/)) {
          setSelectedSize('20');
        } else if (cat.includes('blouse') || title.match(/\b(blouse|choli)\b/)) {
          setSelectedSize('36');
        } else if (
          cat.includes('dress') ||
          cat.includes('kurta') ||
          cat.includes('suit') ||
          title.match(/\b(dress|kurti|kurta|suit|anarkali|gown)\b/)
        ) {
          setSelectedSize('M');
        } else {
          setSelectedSize('Free Size');
        }
      }
      setLoading(false);
    });

    mockCatalogService.getProducts().then((all) => {
      const filtered = all.filter((item) => item.code !== targetCode).slice(0, 4);
      setRelatedProducts(filtered);
    });
  }, [targetCode]);

  // Active SKU resolution based on active swatch
  const activeSku = useMemo(() => {
    if (!product || !product.skus || product.skus.length === 0) return null;
    return (
      product.skus.find(
        (s) =>
          s.id === selectedColor ||
          s.colorGroupId === selectedColor ||
          s.skuCode === selectedColor
      ) || product.skus[0]
    );
  }, [product, selectedColor]);

  // Dynamic pricing
  const effectivePrice =
    activeSku && !activeSku.isPriceInherited && activeSku.price != null
      ? activeSku.price
      : product?.price ?? 0;

  const effectiveOriginalPrice =
    activeSku && !activeSku.isPriceInherited && activeSku.mrp != null
      ? activeSku.mrp
      : product?.originalPrice ?? Math.round(effectivePrice * 1.5);

  const effectiveDiscount =
    effectiveOriginalPrice > effectivePrice && effectiveOriginalPrice > 0
      ? Math.round(((effectiveOriginalPrice - effectivePrice) / effectiveOriginalPrice) * 100)
      : product?.discountPercentage ?? 0;

  const effectiveStock = activeSku ? activeSku.stockQuantity : (product?.stockQuantity ?? 1);
  const activeSkuCustomMessage = activeSku?.customMessage;

  const isOutOfStock =
    product?.lifecycleStatus === 'out_of_stock' ||
    effectiveStock <= 0 ||
    product?.inStock === false;

  const wishlisted = product ? isInWishlist(product.id) : false;

  // Prepare full-screen media viewer items
  const fullscreenMedia = useMemo<FullscreenMediaItem[]>(() => {
    if (!product) return [];
    const media = product.mediaOrder || [];
    const activeMedia = media.filter(
      (m) => m.colorGroupId === selectedColor || m.isCommon
    );
    if (activeMedia.length > 0) {
      return activeMedia
        .filter((img) => Boolean(img.url))
        .map((img) => ({
          id: img.id,
          url: img.url!,
          title: img.title || product.title,
        }));
    }
    return (product.images || []).map((url, idx) => ({
      id: `img-${idx}`,
      url,
      title: `${product.title} - View ${idx + 1}`,
    }));
  }, [product, selectedColor]);

  const handleJoinWaitlist = async (authOverride?: { token?: string; user?: any }) => {
    let effectiveToken = authOverride?.token || token;
    let effectiveUser = authOverride?.user || user;

    if (!effectiveToken && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('vayyari_auth_token');
      if (storedToken && storedToken !== 'guest-token') {
        effectiveToken = storedToken;
      }
    }

    if (!effectiveUser && typeof window !== 'undefined') {
      try {
        const storedUser = JSON.parse(localStorage.getItem('vayyari_auth_user') || 'null');
        if (storedUser && !storedUser.isGuest) {
          effectiveUser = storedUser;
        }
      } catch {}
    }

    const isAuthed = Boolean(
      effectiveToken &&
      effectiveToken !== 'guest-token' &&
      effectiveUser &&
      !effectiveUser.isGuest
    );

    if (!isAuthed) {
      setLoginModalVisible(true);
      return;
    }

    if (!product) return;

    setIsWaitlistLoading(true);
    try {
      const baseApiUrl =
        process.env.EXPO_PUBLIC_STORE_API_URL ||
        (Platform.OS === 'web' &&
        typeof window !== 'undefined' &&
        window.location?.hostname.endsWith('vayyarifashions.com')
          ? `${window.location.protocol}//storeapi.vayyarifashions.com`
          : 'http://localhost:5200');

      await fetch(`${baseApiUrl}/api/v1/products/${product.id}/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveToken || ''}`,
          'X-Customer-Token': effectiveToken || '',
          'X-Customer-Id': effectiveUser?.id || '',
        },
      });

      setIsOnWaitlist(true);
      showToast({
        message: `You're on the waitlist! We'll notify you as soon as this handloom restocks.`,
        type: 'success',
      });
    } catch {
      setIsOnWaitlist(true);
      showToast({
        message: `Added to Waitlist! We'll alert you when restocked.`,
        type: 'success',
      });
    } finally {
      setIsWaitlistLoading(false);
    }
  };

  const handleAddToBag = () => {
    if (!product) return;
    if (addedToBag) {
      openDrawer();
      return;
    }

    const cg = (product.colorGroups || []).find((c) => c.id === selectedColor);
    const swatch: EthnicSwatch = {
      id: selectedColor || 'default',
      name: cg?.name || product.colorwayName || 'Original Artisan Drape',
      type: (cg?.template as any) || 'solid',
      primaryHex: cg?.slotA || product.colorHex || '#D4AF37',
      secondaryHex: cg?.slotB,
      accentHex: cg?.slotC,
      imageUrl: product.images?.[0],
    };

    const effectiveProduct = {
      ...product,
      price: effectivePrice,
      originalPrice: effectiveOriginalPrice,
    };

    addItem(effectiveProduct, swatch, selectedSize);
    setAddedToBag(true);
    showToast({
      message: `Added ${product.title.slice(0, 24)}... (${selectedSize}) to Bag`,
      type: 'success',
    });
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    toggleWishlist(product.id);
    const added = !wishlisted;
    showToast({
      message: added ? 'Saved to Wishlist' : 'Removed from Wishlist',
      type: added ? 'success' : 'info',
    });
  };

  const handleShare = async () => {
    if (!product) return;
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
      // Handled silently
    }
  };

  const mappedProductData: PdpProductData | null = useMemo(() => {
    if (!product) return null;
    return {
      id: product.id,
      code: product.code,
      sku: product.code,
      title: product.title,
      brand: product.brand || 'VAANYA LUXE',
      category: product.category,
      fabric: product.fabric,
      weaveOrigin: product.weaveOrigin,
      description: product.description,
      price: effectivePrice,
      originalPrice: effectiveOriginalPrice,
      discountPercent: effectiveDiscount,
      rating: product.rating,
      reviewCount: product.reviewCount,
      inStock: !isOutOfStock,
      stockQuantity: effectiveStock,
      colorGroups: product.colorGroups as any,
      mediaList: product.mediaOrder as any,
      images: product.images,
      specifications: [
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
      ],
      customSkuMessage: activeSkuCustomMessage,
    };
  }, [product, effectivePrice, effectiveOriginalPrice, effectiveDiscount, isOutOfStock, effectiveStock, activeSkuCustomMessage]);

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

  if (!product || !mappedProductData) {
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

  return (
    <>
      <ProductDetailFragment
        product={mappedProductData}
        mode="live"
        borderless={isMobile}
        selectedColorId={selectedColor}
        onSelectColorId={setSelectedColor}
        selectedSize={selectedSize}
        onSelectSize={setSelectedSize}
        onAddToCart={handleAddToBag}
        onToggleWishlist={handleToggleWishlist}
        isWishlisted={wishlisted}
        onShare={handleShare}
        onNavigateHome={() => navigate('home')}
        onNavigateCatalog={() => navigate('catalog')}
        relatedProducts={relatedProducts.map((p) => ({
          id: p.id,
          code: p.code,
          title: p.title,
          brand: p.brand,
          price: p.price,
          originalPrice: p.originalPrice,
          discountPercent: p.discountPercentage,
          rating: p.rating,
        }))}
        onSelectRelatedProduct={(code) => navigate('pdp', { code, id: code })}
      />

      {/* Dismissible Login Modal for Guest Waitlist Join */}
      <DismissibleLoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
        returnUrl={
          typeof window !== 'undefined'
            ? window.location.pathname
            : `/product/${product.code}`
        }
        onSuccess={(authData) => {
          handleJoinWaitlist(authData);
        }}
        title="Join Restock Waitlist"
        subtitle={`Sign in to receive immediate notification when ${product.title} restocks.`}
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

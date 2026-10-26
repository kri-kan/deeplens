import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { StoreProduct, SiblingSwatch } from '../services/mock/mockCatalogService';

export interface ProductCardProps {
  product: StoreProduct;
  onPress?: (product: StoreProduct, activeCode?: string) => void;
  onAddToCart?: (e: any, product: StoreProduct) => void;
  onWishlistToggle?: (e: any, product: StoreProduct) => void;
  onJoinWaitlist?: (e: any, product: StoreProduct, activeCode?: string) => void;
  onSelectSwatch?: (code: string) => void;
  isWishlisted?: boolean;
  style?: any;
  cardWidth?: string | number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
  onWishlistToggle,
  onJoinWaitlist,
  onSelectSwatch,
  isWishlisted = false,
  style,
  cardWidth,
}) => {
  const [activeCode, setActiveCode] = useState<string>(product.code);
  const [activeImage, setActiveImage] = useState<string>(
    product.images && product.images.length > 0 ? product.images[0] : ''
  );
  const [activeColorway, setActiveColorway] = useState<string>(
    product.colorwayName || 'Original Weave'
  );

  const isOutOfStock =
    product.lifecycleStatus === 'out_of_stock' ||
    (product.stockQuantity !== undefined && product.stockQuantity <= 0) ||
    product.inStock === false;

  const siblings: SiblingSwatch[] =
    product.siblingSwatches && product.siblingSwatches.length > 0
      ? product.siblingSwatches
      : [
          {
            productCode: product.code,
            colorHex: product.colorHex || '#D4AF37',
            colorwayName: product.colorwayName || 'Original',
            heroImageUrl: product.images && product.images.length > 0 ? product.images[0] : undefined,
          },
        ];

  const handleSwatchPress = (e: any, swatch: SiblingSwatch) => {
    e.stopPropagation?.();
    setActiveCode(swatch.productCode);
    setActiveColorway(swatch.colorwayName);
    if (swatch.heroImageUrl) {
      setActiveImage(swatch.heroImageUrl);
    }
    onSelectSwatch?.(swatch.productCode);
  };

  const handleCardPress = () => {
    onPress?.(product, activeCode);
  };

  const handleBagPress = (e: any) => {
    e.stopPropagation?.();
    const activeProduct = {
      ...product,
      code: activeCode,
      productCode: activeCode,
      colorwayName: activeColorway,
      heroImageUrl: activeImage,
      images: activeImage
        ? [activeImage, ...product.images.filter((img) => img !== activeImage)]
        : product.images,
    };
    onAddToCart?.(e, activeProduct as any);
  };

  const handleWaitlistPress = (e: any) => {
    e.stopPropagation?.();
    onJoinWaitlist?.(e, product, activeCode);
  };

  const handleHeartPress = (e: any) => {
    e.stopPropagation?.();
    onWishlistToggle?.(e, product);
  };

  const originShort = product.weaveOrigin ? product.weaveOrigin.split(',')[0].trim() : 'Heritage';

  return (
    <TouchableOpacity
      style={[styles.card, cardWidth ? { width: cardWidth } : undefined, style]}
      onPress={handleCardPress}
      activeOpacity={0.92}
    >
      {/* ── Media Header with Overlays ── */}
      <View style={styles.imageContainer}>
        {activeImage ? (
          <Image
            source={{ uri: activeImage }}
            style={[styles.image, isOutOfStock && styles.imageOutOfStock]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>Authentic Weave</Text>
          </View>
        )}

        {/* Out of Stock Pill Badge */}
        {isOutOfStock && (
          <View style={styles.outOfStockPill}>
            <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
          </View>
        )}

        {/* Provenance Pill */}
        <View style={styles.provenancePill}>
          <Text style={styles.provenanceText}>{originShort}</Text>
        </View>

        {/* Wishlist Heart */}
        <TouchableOpacity
          style={[styles.heartButton, isWishlisted && styles.heartButtonActive]}
          onPress={handleHeartPress}
          activeOpacity={0.8}
        >
          <Text style={[styles.heartIcon, isWishlisted && styles.heartIconActive]}>
            {isWishlisted ? '♥' : '♡'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Product Details ── */}
      <View style={styles.details}>
        {/* Brand & Sub-code */}
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>{product.brand || 'VAYYARI HERITAGE'}</Text>
          <View style={styles.subCodeBadge}>
            <Text style={styles.subCodeText}>{activeCode}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>

        {/* Active Colorway Name */}
        <Text style={styles.colorwayName} numberOfLines={1}>
          Color: <Text style={styles.colorwayBold}>{activeColorway}</Text>
        </Text>

        {/* Sibling Swatches Bar (Myntra-style) */}
        {siblings.length > 0 && (
          <View style={styles.swatchSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.swatchRow}
            >
              {siblings.map((sw, idx) => {
                const isSelected = sw.productCode === activeCode;
                return (
                  <TouchableOpacity
                    key={`${sw.productCode}-${idx}`}
                    style={[
                      styles.swatchCircleWrap,
                      isSelected && styles.swatchCircleWrapActive,
                    ]}
                    onPress={(e) => handleSwatchPress(e, sw)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.swatchDot,
                        { backgroundColor: sw.colorHex || '#D4AF37' },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
              {siblings.length > 1 && (
                <Text style={styles.swatchCountText}>
                  {siblings.length} colors
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* Price Row */}
        <View style={styles.priceRow}>
          <Text style={styles.currentPrice}>₹{product.price.toLocaleString('en-IN')}</Text>
          {product.originalPrice > product.price && (
            <Text style={styles.originalPrice}>₹{product.originalPrice.toLocaleString('en-IN')}</Text>
          )}
          {product.discountPercentage > 0 && (
            <Text style={styles.discountText}>{product.discountPercentage}% OFF</Text>
          )}
        </View>

        {/* Action Button: Waitlist vs Add to Bag */}
        {isOutOfStock ? (
          <TouchableOpacity
            style={styles.waitlistBtn}
            onPress={handleWaitlistPress}
            activeOpacity={0.85}
          >
            <Text style={styles.waitlistBtnText}>🔔 Join Waitlist</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.bagBtn}
            onPress={handleBagPress}
            activeOpacity={0.85}
          >
            <Text style={styles.bagBtnText}>Add to Bag</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 4,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
    backgroundColor: '#F7FAFC',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOutOfStock: {
    opacity: 0.85,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF2F7',
  },
  placeholderText: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '600',
  },
  outOfStockPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(197, 48, 48, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 2,
  },
  outOfStockText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  provenancePill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(26, 54, 93, 0.85)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 2,
  },
  provenanceText: {
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: '700',
  },
  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  heartButtonActive: {
    backgroundColor: '#FFF5F5',
  },
  heartIcon: {
    fontSize: 16,
    color: '#718096',
  },
  heartIconActive: {
    color: '#E53E3E',
  },
  details: {
    padding: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  brandText: {
    fontSize: 10,
    color: '#9C7A14',
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  subCodeBadge: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subCodeText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#4A5568',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A365D',
    lineHeight: 18,
    height: 36,
  },
  colorwayName: {
    fontSize: 11,
    color: '#718096',
    marginTop: 2,
    marginBottom: 4,
  },
  colorwayBold: {
    fontWeight: '700',
    color: '#2D3748',
  },
  swatchSection: {
    marginVertical: 4,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  swatchCircleWrap: {
    padding: 2,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  swatchCircleWrapActive: {
    borderColor: '#1A365D',
  },
  swatchDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#CBD5E0',
  },
  swatchCountText: {
    fontSize: 10,
    color: '#718096',
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginVertical: 6,
  },
  currentPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A365D',
  },
  originalPrice: {
    fontSize: 12,
    color: '#A0AEC0',
    textDecorationLine: 'line-through',
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C53030',
  },
  bagBtn: {
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  bagBtnText: {
    color: '#1A365D',
    fontSize: 12,
    fontWeight: '700',
  },
  waitlistBtn: {
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: '#B45309',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  waitlistBtnText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '800',
  },
});

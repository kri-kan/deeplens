import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { useNavigation } from '../NavigationContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { usePWA } from '../../context/PWAContext';
import { mockCatalogService, StoreProduct } from '../../services/mock/mockCatalogService';
import { telemetry } from '../../services/telemetry';

// Icons
import { LuSparkles, LuHeart, LuShoppingBag, LuChevronRight, LuTag, LuWifiOff } from 'react-icons/lu';

const CATEGORIES = [
  { id: 'all', label: 'All Crafts', icon: '✦' },
  { id: 'saree', label: 'Heirloom Sarees', icon: '🥻' },
  { id: 'silk', label: 'Mulberry Silks', icon: '🧵' },
  { id: 'kurta', label: 'Designer Sets', icon: '🌸' },
  { id: 'jewelry', label: 'Temple Jewelry', icon: '💎' },
  { id: 'home', label: 'Royal Living', icon: '👑' },
];

export interface HomePageProps {
  onOpenAuth?: () => void;
  onOpenLocation?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenAuth, onOpenLocation }) => {
  const { navigate } = useNavigation();
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const { isOffline } = usePWA();
  const { width } = useWindowDimensions();

  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState<StoreProduct[]>([]);

  // Responsive Breakpoints
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isLaptop = width >= 1024 && width < 1280;
  const isDesktop = width >= 1280;
  const cardWidth = (isDesktop || isLaptop) ? '23.5%' : isTablet ? '31%' : '48%';

  useEffect(() => {
    mockCatalogService.getProducts(activeCategory).then(setProducts);
  }, [activeCategory]);

  const handleProductPress = (product: StoreProduct) => {
    telemetry.trackEvent('product_viewed', {
      productId: product.id,
      title: product.title,
      price: product.price,
      fabric: product.fabric,
      category: product.category,
    });
    navigate('pdp', { id: product.id });
  };

  const handleAddToCart = (e: any, product: StoreProduct) => {
    e?.stopPropagation?.();
    addItem(product);
    telemetry.trackEvent('add_to_bag', {
      productId: product.id,
      title: product.title,
      price: product.price,
      quantity: 1,
    });
    showToast({ message: `Added to Bag: ${product.title.slice(0, 24)}...`, type: 'success' });
  };

  const handleWishlist = (e: any, product: StoreProduct) => {
    e?.stopPropagation?.();
    toggleWishlist(product.id);
    const added = !isInWishlist(product.id);
    if (added) {
      telemetry.trackEvent('add_to_wishlist', {
        productId: product.id,
        title: product.title,
        price: product.price,
      });
    }
    showToast({
      message: added ? 'Saved to Wishlist' : 'Removed from Wishlist',
      type: added ? 'success' : 'info',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Offline Alert Bar if Network Disconnected */}
      {isOffline && (
        <View style={styles.offlineNotice}>
          <LuWifiOff size={14} color="#B71C1C" />
          <Text style={styles.offlineNoticeText}>
            Offline Mode: Browsing cached artisan catalog.
          </Text>
        </View>
      )}

      {/* Main Responsive Content Container */}
      <View
        style={[
          styles.mainWrapper,
          isTablet && styles.mainWrapperTablet,
          isLaptop && styles.mainWrapperLaptop,
          isDesktop && styles.mainWrapperDesktop,
        ]}
      >
        {/* Guest Welcome Banner with Login Action (Myntra Inspiration) */}
        {!isAuthenticated && (
          <View style={styles.guestOfferCard}>
            <View style={styles.guestOfferLeft}>
              <View style={styles.tagBadge}>
                <LuTag size={13} color="#E53935" />
                <Text style={styles.tagBadgeText}>FLAT ₹500 OFF</Text>
              </View>
              <Text style={styles.guestOfferTitle}>Exclusive First Order Privilege</Text>
              <Text style={styles.guestOfferSubtitle}>
                Sign up today to unlock artisan provenance, faster checkout, and members-only weaves.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.guestLoginBtn}
              onPress={onOpenAuth}
              activeOpacity={0.88}
            >
              <Text style={styles.guestLoginBtnText}>LOGIN / SIGNUP</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hero Banner (Myntra Mobile Landing Inspiration) */}
        <View style={[styles.heroCard, isTablet && styles.heroCardTablet, isLaptop && styles.heroCardLaptop, isDesktop && styles.heroCardDesktop]}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1400&q=80' }}
            style={styles.heroBg}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.heroEyebrowRow}>
              <LuSparkles size={14} color="#D4AF37" />
              <Text style={styles.heroEyebrow}>ROYAL FESTIVE WEAVE EDIT 2026</Text>
            </View>
            <Text style={[styles.heroTitle, isLaptop && styles.heroTitleLaptop, isDesktop && styles.heroTitleDesktop]}>
              The Golden Looms of Varanasi & Kanchipuram
            </Text>
            <Text style={styles.heroSubtitle}>
              Hand-spun 3-ply mulberry silks with certified electroplated gold zari.
            </Text>
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.heroBtnPrimary} onPress={() => navigate('catalog')}>
                <Text style={styles.heroBtnPrimaryText}>Explore Catalog</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroBtnSecondary} onPress={() => navigate('catalog', { category: 'saree' })}>
                <Text style={styles.heroBtnSecondaryText}>View Sarees</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Category Icon Chips Row (Myntra Mobile Landing Inspiration) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Curated Collections</Text>
          <TouchableOpacity onPress={() => navigate('catalog')} style={styles.viewAllRow}>
            <Text style={styles.viewAllText}>View All</Text>
            <LuChevronRight size={14} color="#E53935" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScrollView}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => {
                  telemetry.trackEvent('category_clicked', { categoryId: cat.id, label: cat.label });
                  setActiveCategory(cat.id);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.categoryIconCircle, isActive && styles.categoryIconCircleActive]}>
                  <Text style={styles.categoryIconEmoji}>{cat.icon}</Text>
                </View>
                <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Products Grid Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Artisan Curations</Text>
          <Text style={styles.productCountLabel}>{products.length} Designs</Text>
        </View>

        <View style={styles.grid}>
          {products.map((p) => {
            const wishlisted = isInWishlist(p.id);
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.productCard,
                  { width: cardWidth },
                  isTablet && styles.productCardTablet,
                  isDesktop && styles.productCardDesktop,
                ]}
                onPress={() => handleProductPress(p)}
                activeOpacity={0.92}
              >
                {/* Product Image Container */}
                <View style={styles.imageContainer}>
                  <Image source={{ uri: p.images[0] }} style={styles.productImage} resizeMode="cover" />

                  {/* Wishlist Heart Button */}
                  <TouchableOpacity
                    style={[styles.heartBtn, wishlisted && styles.heartBtnActive]}
                    onPress={(e) => handleWishlist(e, p)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <LuHeart
                      size={16}
                      color={wishlisted ? '#E53935' : '#424242'}
                      fill={wishlisted ? '#E53935' : 'transparent'}
                    />
                  </TouchableOpacity>

                  {/* Provenance Tag */}
                  <View style={styles.provenancePill}>
                    <Text style={styles.provenanceText}>✦ {p.fabric.split(' ')[0]}</Text>
                  </View>

                  {/* Discount Badge */}
                  {p.discountPercentage > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>{p.discountPercentage}% OFF</Text>
                    </View>
                  )}
                </View>

                {/* Product Info */}
                <View style={styles.cardDetails}>
                  <Text style={styles.brandName}>{p.brand}</Text>
                  <Text style={styles.productTitle} numberOfLines={2}>{p.title}</Text>

                  {/* Color Weaves Swatches */}
                  <View style={styles.swatchRow}>
                    {p.swatches.map((sw) => (
                      <View
                        key={sw.id}
                        style={[
                          styles.swatchDot,
                          { backgroundColor: sw.primaryHex },
                          sw.type === 'contrast' && { borderRightColor: sw.secondaryHex, borderRightWidth: 5 },
                        ]}
                      />
                    ))}
                    <Text style={styles.swatchCountText}>{p.swatches.length} weaves</Text>
                  </View>

                  {/* Price & Add to Bag */}
                  <View style={styles.priceRow}>
                    <View>
                      <View style={styles.priceLine}>
                        <Text style={styles.priceText}>₹{p.price.toLocaleString('en-IN')}</Text>
                        {p.originalPrice > p.price && (
                          <Text style={styles.originalPriceText}>₹{p.originalPrice.toLocaleString('en-IN')}</Text>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.addBagBtn}
                      onPress={(e) => handleAddToCart(e, p)}
                      activeOpacity={0.85}
                    >
                      <LuShoppingBag size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: 40,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF0F3',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#FFD0D8',
  },
  offlineNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B71C1C',
  },
  mainWrapper: {
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  mainWrapperTablet: {
    paddingHorizontal: 16,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  mainWrapperLaptop: {
    paddingHorizontal: 20,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  mainWrapperDesktop: {
    maxWidth: 1440,
    marginHorizontal: 'auto',
    paddingHorizontal: 32,
    overflow: 'hidden',
  },
  guestOfferCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFD0D8',
    borderRadius: 12,
    marginTop: 14,
    marginBottom: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  guestOfferLeft: {
    flex: 1,
    minWidth: 160,
    gap: 4,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#E53935',
    letterSpacing: 0.5,
  },
  guestOfferTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A365D',
  },
  guestOfferSubtitle: {
    fontSize: 11,
    color: '#616161',
    lineHeight: 16,
  },
  guestLoginBtn: {
    backgroundColor: '#E53935',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  guestLoginBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  heroCard: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    height: 210,
    position: 'relative',
    justifyContent: 'flex-end',
    width: '100%',
  },
  heroCardTablet: {
    height: 270,
  },
  heroCardLaptop: {
    height: 290,
  },
  heroCardDesktop: {
    height: 330,
  },
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 25, 47, 0.55)',
  },
  heroContent: {
    padding: 20,
    zIndex: 2,
    gap: 6,
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: '#D4AF37',
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FAF7F2',
    lineHeight: 22,
  },
  heroTitleLaptop: {
    fontSize: 20,
    lineHeight: 26,
    maxWidth: 580,
  },
  heroTitleDesktop: {
    fontSize: 24,
    lineHeight: 30,
    maxWidth: 680,
  },
  heroSubtitle: {
    fontSize: 11,
    color: '#E0E6ED',
    lineHeight: 16,
    maxWidth: 500,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  heroBtnPrimary: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  heroBtnPrimaryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A365D',
  },
  heroBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  heroBtnSecondaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A365D',
    letterSpacing: 0.2,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E53935',
  },
  productCountLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#757575',
  },
  categoryScrollView: {
    width: '100%',
    maxWidth: '100%',
  },
  categoryRow: {
    gap: 14,
    paddingVertical: 2,
  },
  categoryPill: {
    alignItems: 'center',
    gap: 6,
    width: 72,
  },
  categoryPillActive: {
    opacity: 1,
  },
  categoryIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  categoryIconCircleActive: {
    borderColor: '#E53935',
    backgroundColor: '#FFF0F3',
  },
  categoryIconEmoji: {
    fontSize: 22,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#424242',
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: '#E53935',
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 4,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    marginBottom: 6,
    maxWidth: '48%',
  },
  productCardTablet: {
    maxWidth: '31.5%',
  },
  productCardDesktop: {
    maxWidth: '24%',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#EFEFEF',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  heartBtnActive: {
    backgroundColor: '#FFF0F3',
  },
  provenancePill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(26, 54, 93, 0.85)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  provenanceText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D4AF37',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#E53935',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardDetails: {
    padding: 10,
    gap: 4,
  },
  brandName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#757575',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  productTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212121',
    lineHeight: 16,
    height: 32,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginVertical: 2,
  },
  swatchDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    overflow: 'hidden',
  },
  swatchCountText: {
    fontSize: 9,
    color: '#757575',
    marginLeft: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A365D',
  },
  originalPriceText: {
    fontSize: 10,
    color: '#9E9E9E',
    textDecorationLine: 'line-through',
  },
  addBagBtn: {
    backgroundColor: '#1A365D',
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

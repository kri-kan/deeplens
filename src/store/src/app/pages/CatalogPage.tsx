import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { useNavigation } from '../NavigationContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';
import { mockCatalogService, StoreProduct } from '../../services/mock/mockCatalogService';

const FILTER_PILLS = [
  { id: 'all', label: 'All Handlooms' },
  { id: 'saree', label: 'Heirloom Sarees' },
  { id: 'silk', label: 'Pure Silks' },
  { id: 'kurta', label: 'Kurta Sets' },
  { id: 'jewelry', label: 'Temple Jewelry' },
];

export const CatalogPage: React.FC = () => {
  const { params, navigate } = useNavigation();
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();

  const [selectedCategory, setSelectedCategory] = useState(params.category || 'all');
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const isDesktop = width >= 1024;

  useEffect(() => {
    mockCatalogService.getProducts(selectedCategory).then(setProducts);
  }, [selectedCategory]);

  const handleProductClick = (product: StoreProduct) => {
    navigate('pdp', { id: product.id });
  };

  const handleAddToCart = (e: any, product: StoreProduct) => {
    e.stopPropagation?.();
    addItem(product);
    showToast({ message: `Added to Bag: ${product.title.slice(0, 24)}...`, type: 'success' });
  };

  const handleWishlistToggle = (e: any, product: StoreProduct) => {
    e.stopPropagation?.();
    toggleWishlist(product.id);
    const added = !isInWishlist(product.id);
    showToast({
      message: added ? 'Saved to Wishlist' : 'Removed from Wishlist',
      type: added ? 'success' : 'info',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CURATED CATALOG</Text>
        <Text style={styles.title}>Master Artisan Weaves</Text>
        <Text style={styles.countText}>{products.length} authentic handlooms ready to dispatch</Text>
      </View>

      {/* Filter Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTER_PILLS.map((pill) => {
          const isActive = selectedCategory === pill.id;
          return (
            <TouchableOpacity
              key={pill.id}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setSelectedCategory(pill.id)}
            >
              <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>{pill.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Product Grid */}
      <View style={styles.grid}>
        {products.map((p) => {
          const wishlisted = isInWishlist(p.id);
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.card, { width: isDesktop ? '31.5%' : '48%' }]}
              onPress={() => handleProductClick(p)}
              activeOpacity={0.9}
            >
              <View style={styles.imageContainer}>
                <Image source={{ uri: p.images[0] }} style={styles.image} resizeMode="cover" />
                <TouchableOpacity
                  style={[styles.heartButton, wishlisted && styles.heartButtonActive]}
                  onPress={(e) => handleWishlistToggle(e, p)}
                >
                  <Text style={[styles.heartIcon, wishlisted && styles.heartIconActive]}>
                    {wishlisted ? '♥' : '♡'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.provenancePill}>
                  <Text style={styles.provenanceText}>{p.weaveOrigin.split(',')[0]}</Text>
                </View>
              </View>

              <View style={styles.details}>
                <Text style={styles.brandText}>{p.brand}</Text>
                <Text style={styles.productName} numberOfLines={2}>{p.title}</Text>

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
                  <Text style={styles.swatchLabel}>+{p.swatches.length} colorways</Text>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.currentPrice}>₹{p.price.toLocaleString('en-IN')}</Text>
                  <Text style={styles.originalPrice}>₹{p.originalPrice.toLocaleString('en-IN')}</Text>
                  <Text style={styles.discountText}>{p.discountPercentage}% OFF</Text>
                </View>

                <TouchableOpacity style={styles.bagBtn} onPress={(e) => handleAddToCart(e, p)}>
                  <Text style={styles.bagBtnText}>Add to Bag</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  eyebrow: {
    color: '#9C7A14',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A365D',
    fontFamily: 'serif',
    marginBottom: 4,
  },
  countText: {
    fontSize: 13,
    color: '#718096',
  },
  filterRow: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 12,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  filterPillActive: {
    backgroundColor: '#1A365D',
    borderColor: '#1A365D',
  },
  filterPillText: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FAF7F2',
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    rowGap: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imageContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
    backgroundColor: '#EDF2F7',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
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
  provenancePill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(26, 54, 93, 0.85)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  provenanceText: {
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: '700',
  },
  details: {
    padding: 12,
  },
  brandText: {
    fontSize: 10,
    color: '#9C7A14',
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A365D',
    lineHeight: 18,
    height: 36,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 6,
  },
  swatchDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#CBD5E0',
  },
  swatchLabel: {
    fontSize: 10,
    color: '#718096',
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
});

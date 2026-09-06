import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useNavigation } from '../NavigationContext';
import { useToast } from '../../context/ToastContext';
import { mockCatalogService, StoreProduct } from '../../services/mock/mockCatalogService';

export const WishlistPage: React.FC = () => {
  const { wishlistIds, toggleWishlist } = useWishlist();
  const { addItem } = useCart();
  const { navigate } = useNavigation();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();

  const [savedProducts, setSavedProducts] = useState<StoreProduct[]>([]);
  const isDesktop = width >= 1024;

  useEffect(() => {
    mockCatalogService.getProducts().then((all) => {
      setSavedProducts(all.filter((p) => wishlistIds.includes(p.id)));
    });
  }, [wishlistIds]);

  const handleMoveToBag = (product: StoreProduct) => {
    addItem(product);
    toggleWishlist(product.id);
    showToast({ message: `Moved to Bag: ${product.title.slice(0, 20)}...`, type: 'success' });
  };

  if (savedProducts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>♥</Text>
        <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
        <Text style={styles.emptySub}>Bookmark heirloom handloom weaves that catch your eye.</Text>
        <TouchableOpacity style={styles.browseBtn} onPress={() => navigate('catalog')}>
          <Text style={styles.browseBtnText}>Explore Weaves</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Saved Handlooms ({savedProducts.length})</Text>

      <View style={styles.grid}>
        {savedProducts.map((p) => (
          <View key={p.id} style={[styles.card, { width: isDesktop ? '31.5%' : '48%' }]}>
            <Image source={{ uri: p.images[0] }} style={styles.image} resizeMode="cover" />
            <TouchableOpacity style={styles.removeIcon} onPress={() => toggleWishlist(p.id)}>
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.details}>
              <Text style={styles.brand}>{p.brand}</Text>
              <Text style={styles.title} numberOfLines={2}>{p.title}</Text>
              <Text style={styles.price}>₹{p.price.toLocaleString('en-IN')}</Text>

              <TouchableOpacity style={styles.moveBtn} onPress={() => handleMoveToBag(p)}>
                <Text style={styles.moveBtnText}>Move to Bag</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
    padding: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 56,
    color: '#D4AF37',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A365D',
    fontFamily: 'serif',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  browseBtn: {
    backgroundColor: '#1A365D',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  browseBtnText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '700',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A365D',
    fontFamily: 'serif',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#EDF2F7',
  },
  removeIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: 'bold',
  },
  details: {
    padding: 12,
  },
  brand: {
    fontSize: 10,
    color: '#9C7A14',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A365D',
    marginVertical: 4,
    height: 36,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A365D',
    marginBottom: 8,
  },
  moveBtn: {
    backgroundColor: '#1A365D',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  moveBtnText: {
    color: '#FAF7F2',
    fontSize: 12,
    fontWeight: '700',
  },
});

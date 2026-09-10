import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '../NavigationContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';
import { mockCatalogService, StoreProduct } from '../../services/mock/mockCatalogService';

export const FILTER_CATEGORIES = [
  { id: 'all', label: 'All Handlooms' },
  { id: 'saree', label: 'Heirloom Sarees' },
  { id: 'silk', label: 'Pure Silks' },
  { id: 'kurta', label: 'Kurta Sets' },
  { id: 'lehenga', label: 'Bridal Lehengas' },
  { id: 'jewelry', label: 'Temple Jewelry' },
];

export const FILTER_FABRICS = [
  'All',
  'Pure Mulberry Silk',
  'Kanjivaram Silk',
  'Banarasi Brocade',
  'Chanderi Cotton-Silk',
  'Tussar Silk',
  'Organza Silk',
];

export const FILTER_PRICES = [
  { id: 'all', label: 'All Prices' },
  { id: 'under_5k', label: '< ₹5,000' },
  { id: '5k_10k', label: '₹5K - ₹10K' },
  { id: '10k_20k', label: '₹10K - ₹20K' },
  { id: 'above_20k', label: '> ₹20,000' },
];

export const FILTER_ORIGINS = [
  'All',
  'Kanchipuram, Tamil Nadu',
  'Varanasi, Uttar Pradesh',
  'Patan, Gujarat',
  'Chanderi, Madhya Pradesh',
  'Bhagalpur, Bihar',
];

export const SORT_OPTIONS = [
  { id: 'featured', label: 'Featured Weaves' },
  { id: 'price_low', label: 'Price: Low to High' },
  { id: 'price_high', label: 'Price: High to Low' },
  { id: 'discount', label: 'Highest Discount' },
];

export const CatalogPage: React.FC = () => {
  const { params, navigate } = useNavigation();
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();

  const [selectedCategory, setSelectedCategory] = useState(params.category || 'all');
  const [selectedFabric, setSelectedFabric] = useState('All');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [selectedOrigin, setSelectedOrigin] = useState('All');
  const [selectedSort, setSelectedSort] = useState('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(12);

  const isDesktop = width >= 1024;

  useEffect(() => {
    setLoading(true);
    mockCatalogService.getProducts(selectedCategory).then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, [selectedCategory]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedFabric !== 'All') count++;
    if (selectedPrice !== 'all') count++;
    if (selectedOrigin !== 'All') count++;
    if (selectedSort !== 'featured') count++;
    return count;
  }, [selectedCategory, selectedFabric, selectedPrice, selectedOrigin, selectedSort]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedFabric('All');
    setSelectedPrice('all');
    setSelectedOrigin('All');
    setSelectedSort('featured');
    setSearchQuery('');
  };

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const matchFabric = selectedFabric === 'All' || p.fabric.toLowerCase().includes(selectedFabric.toLowerCase());
      const matchOrigin = selectedOrigin === 'All' || p.weaveOrigin.toLowerCase().includes(selectedOrigin.toLowerCase());
      
      let matchPrice = true;
      if (selectedPrice === 'under_5k') matchPrice = p.price < 5000;
      else if (selectedPrice === '5k_10k') matchPrice = p.price >= 5000 && p.price <= 10000;
      else if (selectedPrice === '10k_20k') matchPrice = p.price > 10000 && p.price <= 20000;
      else if (selectedPrice === 'above_20k') matchPrice = p.price > 20000;

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.fabric.toLowerCase().includes(q) ||
        p.weaveOrigin.toLowerCase().includes(q);

      return matchFabric && matchOrigin && matchPrice && matchQuery;
    });

    if (selectedSort === 'price_low') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (selectedSort === 'price_high') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (selectedSort === 'discount') {
      list = [...list].sort((a, b) => b.discountPercentage - a.discountPercentage);
    }

    return list;
  }, [products, selectedFabric, selectedOrigin, selectedPrice, selectedSort, searchQuery]);

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

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
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CURATED STOREFRONT</Text>
        <Text style={styles.title}>Master Artisan Weaves</Text>
        <Text style={styles.countText}>
          {filteredProducts.length} authentic handlooms ready for express dispatch
        </Text>
      </View>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <View style={styles.filterControlSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search handloom weaves (Silk, Zari, Kanjivaram)..."
              placeholderTextColor="#A0AEC0"
              style={styles.searchInput}
            />
          </View>

          <TouchableOpacity
            style={[styles.filterToggleBtn, activeFilterCount > 0 && styles.filterToggleBtnActive]}
            onPress={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          >
            <Text style={[styles.filterToggleIcon, activeFilterCount > 0 && styles.filterToggleTextActive]}>
              ⚙ Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''} {isFilterPanelOpen ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
              <Text style={styles.resetBtnText}>↺ Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTER_CATEGORIES.map((pill) => {
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

        {/* Expandable Multi-Filter Drawer */}
        {isFilterPanelOpen && (
          <View style={styles.expandedFilterPanel}>
            {/* Fabric Row */}
            <View style={styles.filterSubGroup}>
              <Text style={styles.filterSubGroupLabel}>FABRIC & SILK TYPE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {FILTER_FABRICS.map((fab) => {
                  const isActive = selectedFabric === fab;
                  return (
                    <TouchableOpacity
                      key={fab}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => setSelectedFabric(fab)}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{fab}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Price Range Row */}
            <View style={styles.filterSubGroup}>
              <Text style={styles.filterSubGroupLabel}>PRICE RANGE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {FILTER_PRICES.map((p) => {
                  const isActive = selectedPrice === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => setSelectedPrice(p.id)}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Origin Row */}
            <View style={styles.filterSubGroup}>
              <Text style={styles.filterSubGroupLabel}>ARTISAN REGION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {FILTER_ORIGINS.map((orig) => {
                  const isActive = selectedOrigin === orig;
                  return (
                    <TouchableOpacity
                      key={orig}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => setSelectedOrigin(orig)}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{orig}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Sort Row */}
            <View style={styles.filterSubGroup}>
              <Text style={styles.filterSubGroupLabel}>SORT BY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {SORT_OPTIONS.map((s) => {
                  const isActive = selectedSort === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.chip, isActive && styles.chipActive]}
                      onPress={() => setSelectedSort(s.id)}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{s.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      {/* ── PRODUCT GRID WITH INFINITE SCROLL ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A365D" />
          <Text style={styles.loadingText}>Fetching artisan weaves...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏛️</Text>
          <Text style={styles.emptyTitle}>No matching handlooms found</Text>
          <Text style={styles.emptySubtitle}>Try adjusting or resetting your active filter combination.</Text>
          <TouchableOpacity style={styles.resetPillButton} onPress={resetFilters}>
            <Text style={styles.resetPillButtonText}>Reset All Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            {displayedProducts.map((p) => {
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

          {/* Infinite Scroll / Load More Action */}
          {visibleCount < filteredProducts.length && (
            <View style={styles.loadMoreContainer}>
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => setVisibleCount((prev) => prev + 12)}
              >
                <Text style={styles.loadMoreText}>
                  Load More Handlooms ({filteredProducts.length - visibleCount} remaining) ▾
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  scrollContent: {
    paddingBottom: 60,
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
  filterControlSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  searchIcon: {
    fontSize: 13,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1A365D',
    paddingVertical: 2,
  },
  filterToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#EDF2F7',
    borderWidth: 1,
    borderColor: '#CBD5E0',
  },
  filterToggleBtnActive: {
    backgroundColor: '#1A365D',
    borderColor: '#1A365D',
  },
  filterToggleIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A365D',
  },
  filterToggleTextActive: {
    color: '#FAF7F2',
  },
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C53030',
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 4,
  },
  filterPill: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  filterPillActive: {
    backgroundColor: '#1A365D',
    borderColor: '#1A365D',
  },
  filterPillText: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FAF7F2',
    fontWeight: '700',
  },
  expandedFilterPanel: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    gap: 10,
  },
  filterSubGroup: {
    gap: 4,
  },
  filterSubGroupLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#718096',
    letterSpacing: 0.8,
  },
  chipRow: {
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#EBF8FF',
    borderColor: '#3182CE',
  },
  chipText: {
    fontSize: 11,
    color: '#4A5568',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#2B6CB0',
    fontWeight: '800',
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
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A365D',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    maxWidth: 280,
  },
  resetPillButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A365D',
  },
  resetPillButtonText: {
    color: '#FAF7F2',
    fontSize: 12,
    fontWeight: '700',
  },
  loadMoreContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E0',
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A365D',
  },
});

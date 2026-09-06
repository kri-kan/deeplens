import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { useNavigation } from '../NavigationContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { usePermissions } from '../../context/PermissionsContext';
import { useToast } from '../../context/ToastContext';
import { mockCatalogService, StoreProduct, EthnicSwatch } from '../../services/mock/mockCatalogService';

export const ProductDetailPage: React.FC = () => {
  const { params, goBack } = useNavigation();
  const { addItem, openDrawer } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { currentLocation } = usePermissions();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();

  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSwatch, setSelectedSwatch] = useState<EthnicSwatch | undefined>(undefined);
  const isDesktop = width >= 1024;

  useEffect(() => {
    const id = params.id || 'prod-kanjivaram-royal';
    mockCatalogService.getProductById(id).then((p) => {
      if (p) {
        setProduct(p);
        setSelectedSwatch(p.swatches[0]);
      }
    });
  }, [params.id]);

  if (!product) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Unveiling Artisan Handloom...</Text>
      </View>
    );
  }

  const wishlisted = isInWishlist(product.id);

  const handleAddToBag = () => {
    addItem(product, selectedSwatch);
    showToast({ message: `Added ${product.title.slice(0, 20)}... to Bag`, type: 'success' });
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Back Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.skuText}>SKU: {product.code}</Text>
      </View>

      <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
        {/* Gallery */}
        <View style={[styles.galleryCol, isDesktop && styles.galleryColDesktop]}>
          <View style={styles.mainImageWrapper}>
            <Image
              source={{ uri: product.images[selectedImage] || product.images[0] }}
              style={styles.mainImage}
              resizeMode="cover"
            />
            <View style={styles.giTagBadge}>
              <Text style={styles.giTagText}>✦ {product.weaveOrigin}</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
            {product.images.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.thumbBox, selectedImage === idx && styles.thumbBoxActive]}
                onPress={() => setSelectedImage(idx)}
              >
                <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Purchase Panel */}
        <View style={[styles.infoCol, isDesktop && styles.infoColDesktop]}>
          <Text style={styles.brandTitle}>{product.brand}</Text>
          <Text style={styles.productTitle}>{product.title}</Text>

          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {product.rating}</Text>
            </View>
            <Text style={styles.reviewCount}>({product.reviewCount} certified patrons)</Text>
          </View>

          {/* Pricing */}
          <View style={styles.priceContainer}>
            <Text style={styles.salePrice}>₹{product.price.toLocaleString('en-IN')}</Text>
            <Text style={styles.origPrice}>₹{product.originalPrice.toLocaleString('en-IN')}</Text>
            <View style={styles.discountPill}>
              <Text style={styles.discountPillText}>{product.discountPercentage}% OFF</Text>
            </View>
          </View>
          <Text style={styles.taxInclusive}>Inclusive of all luxury handloom taxes & Silk Mark stamping</Text>

          {/* Swatches Selection */}
          <View style={styles.swatchSection}>
            <Text style={styles.sectionLabel}>
              Select Weave Colorway: <Text style={styles.selectedSwatchName}>{selectedSwatch?.name || 'Default'}</Text>
            </Text>
            <View style={styles.swatchGrid}>
              {product.swatches.map((sw) => {
                const isSwSelected = selectedSwatch?.id === sw.id;
                return (
                  <TouchableOpacity
                    key={sw.id}
                    style={[styles.swatchChip, isSwSelected && styles.swatchChipActive]}
                    onPress={() => setSelectedSwatch(sw)}
                  >
                    <View
                      style={[
                        styles.swatchCircle,
                        { backgroundColor: sw.primaryHex },
                        sw.type === 'contrast' && { borderRightColor: sw.secondaryHex, borderRightWidth: 10 },
                      ]}
                    />
                    <Text style={styles.swatchChipText}>{sw.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Delivery Region Pill */}
          <View style={styles.deliveryCard}>
            <Text style={styles.deliveryTitle}>📍 Delivery to {currentLocation?.city || 'Hyderabad'} ({currentLocation?.pincode || '500081'})</Text>
            <Text style={styles.deliverySub}>
              Express handloom courier arrives in {currentLocation?.transitDays || 2} business days.
            </Text>
          </View>

          {/* Action CTAs */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.addToBagBtn} onPress={handleAddToBag} activeOpacity={0.88}>
              <Text style={styles.addToBagText}>Add to Bag • ₹{product.price.toLocaleString('en-IN')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.wishlistBtn, wishlisted && styles.wishlistBtnActive]}
              onPress={handleToggleWishlist}
            >
              <Text style={[styles.wishlistIcon, wishlisted && styles.wishlistIconActive]}>
                {wishlisted ? '♥ Saved' : '♡ Wishlist'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Specifications */}
          <View style={styles.specPanel}>
            <Text style={styles.specHeader}>Artisan Weave Specifications</Text>
            <View style={styles.specItem}>
              <Text style={styles.specKey}>Fabric</Text>
              <Text style={styles.specVal}>{product.fabric}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specKey}>Geographical Indication</Text>
              <Text style={styles.specVal}>{product.weaveOrigin}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specKey}>Certifications</Text>
              <Text style={styles.specVal}>{product.features.join(' • ')}</Text>
            </View>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>
        </View>
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
    paddingBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#1A365D',
    fontSize: 16,
    fontFamily: 'serif',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    paddingVertical: 6,
  },
  backBtnText: {
    color: '#1A365D',
    fontSize: 14,
    fontWeight: '700',
  },
  skuText: {
    color: '#9C7A14',
    fontSize: 12,
    fontWeight: '700',
  },
  mainLayout: {
    flexDirection: 'column',
  },
  mainLayoutDesktop: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 32,
  },
  galleryCol: {
    width: '100%',
  },
  galleryColDesktop: {
    width: '50%',
  },
  mainImageWrapper: {
    width: '100%',
    height: 420,
    position: 'relative',
    backgroundColor: '#EDF2F7',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  giTagBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(26, 54, 93, 0.9)',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  giTagText: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '700',
  },
  thumbRow: {
    padding: 16,
    gap: 12,
  },
  thumbBox: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  thumbBoxActive: {
    borderColor: '#D4AF37',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  infoCol: {
    padding: 20,
  },
  infoColDesktop: {
    width: '50%',
    paddingTop: 0,
  },
  brandTitle: {
    color: '#9C7A14',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  productTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A365D',
    fontFamily: 'serif',
    lineHeight: 28,
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  ratingBadge: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewCount: {
    color: '#718096',
    fontSize: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 4,
  },
  salePrice: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A365D',
  },
  origPrice: {
    fontSize: 16,
    color: '#A0AEC0',
    textDecorationLine: 'line-through',
  },
  discountPill: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountPillText: {
    color: '#C53030',
    fontSize: 11,
    fontWeight: '700',
  },
  taxInclusive: {
    fontSize: 11,
    color: '#718096',
    marginBottom: 20,
  },
  swatchSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 10,
  },
  selectedSwatchName: {
    color: '#9C7A14',
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
  },
  swatchChipActive: {
    borderColor: '#D4AF37',
    backgroundColor: '#FAF7F0',
  },
  swatchCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#CBD5E0',
  },
  swatchChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A365D',
  },
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  deliveryTitle: {
    color: '#1A365D',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  deliverySub: {
    color: '#718096',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  addToBagBtn: {
    flex: 2,
    backgroundColor: '#1A365D',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#1A365D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  addToBagText: {
    color: '#FAF7F2',
    fontSize: 14,
    fontWeight: '700',
  },
  wishlistBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E0',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishlistBtnActive: {
    borderColor: '#FEB2B2',
    backgroundColor: '#FFF5F5',
  },
  wishlistIcon: {
    color: '#4A5568',
    fontSize: 13,
    fontWeight: '700',
  },
  wishlistIconActive: {
    color: '#E53E3E',
  },
  specPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A365D',
    marginBottom: 12,
    fontFamily: 'serif',
  },
  specItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  specKey: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
  },
  specVal: {
    fontSize: 12,
    color: '#1A365D',
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  descriptionText: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 18,
    marginTop: 12,
    fontStyle: 'italic',
  },
});

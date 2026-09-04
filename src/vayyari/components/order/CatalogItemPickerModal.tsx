import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image, Modal } from 'react-native';
import { Surface, Text, TextInput, Button, IconButton, useTheme, Chip, ActivityIndicator } from 'react-native-paper';
import { productService } from '@/services/productService';
import { vendorService } from '@/services/vendorService';
import { VendorProduct } from '@/types/products';
import { VendorResponse } from '@/types/vendors';
import { OrderItemDraft } from '@/types/orders';

interface CatalogItemPickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  mappedVendorId?: string;
  onSelectItem: (item: OrderItemDraft) => void;
}

export const CatalogItemPickerModal: React.FC<CatalogItemPickerModalProps> = ({
  visible,
  onDismiss,
  mappedVendorId,
  onSelectItem,
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [vendors, setVendors] = useState<VendorResponse[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<VendorProduct | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (visible) {
      loadInitialCatalog();
    }
  }, [visible]);

  const loadInitialCatalog = async () => {
    try {
      setLoading(true);
      const [catRes, venRes] = await Promise.all([
        productService.getCatalog({ take: 50 }),
        vendorService.listVendors(1, 100).catch(() => ({ vendors: [] })),
      ]);
      setVendors(venRes.vendors || []);
      sortAndSetProducts(catRes.products || []);
    } catch (e) {
      console.warn('[CatalogPicker] Failed to load products:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    try {
      setLoading(true);
      const res = await productService.getCatalog({ query: query.trim() || undefined, take: 50 });
      sortAndSetProducts(res.products || []);
    } catch (e) {
      console.warn('[CatalogPicker] Search error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getProductVendorId = (prod: VendorProduct): string | undefined => {
    return prod.listings && prod.listings.length > 0 ? prod.listings[0].vendorId : undefined;
  };

  const getProductVendorName = (prod: VendorProduct): string | undefined => {
    return prod.listings && prod.listings.length > 0 ? prod.listings[0].vendorName : undefined;
  };

  const getDefaultMediaId = (prod: VendorProduct): string | undefined => {
    if (!prod.media || prod.media.length === 0) return undefined;
    const def = prod.media.find(m => m.isDefault);
    return def ? def.id : prod.media[0].id;
  };

  // 3-Tier Vendor Prioritization Logic:
  // Tier 1: Mapped Vendor's products
  // Tier 2: Starred Vendors / Starred products
  // Tier 3: Remaining Vendors
  const sortAndSetProducts = (items: VendorProduct[]) => {
    const sorted = [...items].sort((a, b) => {
      const aVendorId = getProductVendorId(a);
      const bVendorId = getProductVendorId(b);

      const aIsMapped = mappedVendorId && aVendorId === mappedVendorId ? 1 : 0;
      const bIsMapped = mappedVendorId && bVendorId === mappedVendorId ? 1 : 0;
      if (aIsMapped !== bIsMapped) return bIsMapped - aIsMapped;

      const aStarred = a.isStarred ? 1 : 0;
      const bStarred = b.isStarred ? 1 : 0;
      if (aStarred !== bStarred) return bStarred - aStarred;

      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    setProducts(sorted);
  };

  const handleSelectProduct = (prod: VendorProduct) => {
    setSelectedProduct(prod);
    const mediaId = getDefaultMediaId(prod);
    const defaultThumb = mediaId ? productService.getThumbnailUrl(mediaId, 'medium') : null;
    setSelectedImageUri(defaultThumb);
    setUnitPrice(String(prod.vendorPrice || ''));
    setQuantity('1');
    setComments('');
  };

  const handleConfirmItem = () => {
    if (!selectedProduct) return;
    const priceNum = parseFloat(unitPrice) || selectedProduct.vendorPrice || 0;
    const qtyNum = parseInt(quantity, 10) || 1;
    const vendorId = getProductVendorId(selectedProduct);
    const vendorName = getProductVendorName(selectedProduct);

    const draftItem: OrderItemDraft = {
      id: `catalog-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sourceType: 'catalog',
      productId: selectedProduct.id,
      productTitle: selectedProduct.title,
      productCode: selectedProduct.productCode || selectedProduct.id.slice(0, 8).toUpperCase(),
      unitPrice: priceNum,
      quantity: qtyNum,
      subtotal: priceNum * qtyNum,
      vendorId,
      vendorName,
      photoUrl: selectedImageUri || undefined,
      comments: comments.trim() || undefined,
    };

    onSelectItem(draftItem);
    setSelectedProduct(null);
    onDismiss();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <Surface style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.modalHeader}>
          <Text variant="titleLarge" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
            Select Product from Catalog
          </Text>
          <IconButton icon="close" size={24} onPress={onDismiss} />
        </View>

        {!selectedProduct ? (
          <View style={{ flex: 1, padding: 16 }}>
            <TextInput
              label="Search Product SKU, Title, or Vendor..."
              value={searchQuery}
              onChangeText={handleSearch}
              mode="outlined"
              left={<TextInput.Icon icon="magnify" />}
              right={loading ? <TextInput.Icon icon={() => <ActivityIndicator size={16} />} /> : undefined}
              style={styles.searchInput}
            />

            <View style={styles.priorityGuide}>
              <Chip compact icon="star" style={{ backgroundColor: '#FFF8E1' }} textStyle={{ fontSize: 11 }}>
                1. Mapped / Starred Vendors
              </Chip>
              <Chip compact icon="view-grid" textStyle={{ fontSize: 11 }}>
                2. General Catalog
              </Chip>
            </View>

            <ScrollView contentContainerStyle={styles.productList} keyboardShouldPersistTaps="handled">
              {products.map(prod => {
                const vendorId = getProductVendorId(prod);
                const vendorName = getProductVendorName(prod);
                const isMapped = mappedVendorId && vendorId === mappedVendorId;
                const mediaId = getDefaultMediaId(prod);
                const thumb = mediaId ? productService.getThumbnailUrl(mediaId, 'icon') : null;

                return (
                  <TouchableOpacity
                    key={prod.id}
                    style={[styles.productCard, { borderColor: isMapped ? theme.colors.primary : theme.colors.outlineVariant }]}
                    onPress={() => handleSelectProduct(prod)}
                  >
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.prodThumb} />
                    ) : (
                      <View style={[styles.prodThumb, styles.noThumb]}>
                        <IconButton icon="image-outline" size={20} />
                      </View>
                    )}

                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }} numberOfLines={1}>
                          {prod.title}
                        </Text>
                        {prod.isStarred && <IconButton icon="star" iconColor="#F59E0B" size={14} style={{ margin: 0 }} />}
                      </View>

                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                        Vendor: {vendorName || 'Vayyari Vendor'}
                      </Text>

                      <View style={styles.priceRow}>
                        <Text variant="labelMedium" style={{ color: theme.colors.secondary, fontWeight: 'bold' }}>
                          ₹{prod.vendorPrice || 0}
                        </Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                          {prod.media?.length || 0} photos
                        </Text>
                      </View>
                    </View>
                    <IconButton icon="chevron-right" size={20} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.detailContainer} keyboardShouldPersistTaps="handled">
            <Button
              mode="text"
              icon="arrow-left"
              onPress={() => setSelectedProduct(null)}
              style={{ alignSelf: 'flex-start' }}
            >
              Back to Catalog
            </Button>

            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
              {selectedProduct.title}
            </Text>

            {/* Gallery Photo Selector */}
            <Text variant="labelMedium" style={{ fontWeight: '600', marginTop: 8 }}>
              Select Product Photo for Order:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
              {(selectedProduct.media || []).map((m, idx) => {
                const uri = productService.getThumbnailUrl(m.id, 'medium');
                const isChosen = selectedImageUri === uri;
                return (
                  <TouchableOpacity
                    key={m.id || idx}
                    onPress={() => setSelectedImageUri(uri)}
                    style={[
                      styles.galleryThumbContainer,
                      isChosen && { borderColor: theme.colors.secondary, borderWidth: 3 },
                    ]}
                  >
                    <Image source={{ uri }} style={styles.galleryThumb} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Editable Pricing & Quantity */}
            <Surface style={[styles.pricingCard, { backgroundColor: (theme.colors as any).surfaceContainerLow || theme.colors.surfaceVariant }]}>
              <View style={styles.inputsRow}>
                <TextInput
                  label="Unit Price (₹) *"
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                  keyboardType="numeric"
                  mode="outlined"
                  style={{ flex: 1 }}
                />
                <TextInput
                  label="Quantity *"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  mode="outlined"
                  style={{ width: 90 }}
                />
              </View>

              <TextInput
                label="Item Notes / Customization Details"
                value={comments}
                onChangeText={setComments}
                mode="outlined"
                multiline
                numberOfLines={2}
              />

              <View style={styles.totalPreview}>
                <Text variant="bodyMedium">Item Subtotal:</Text>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                  ₹{(parseFloat(unitPrice) || 0) * (parseInt(quantity, 10) || 1)}
                </Text>
              </View>
            </Surface>

            <Button
              mode="contained"
              onPress={handleConfirmItem}
              buttonColor={theme.colors.secondary}
              textColor={theme.colors.onSecondary}
              style={{ marginTop: 12, paddingVertical: 4 }}
            >
              Add Item to Order
            </Button>
          </ScrollView>
        )}
      </Surface>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  priorityGuide: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  productList: {
    gap: 8,
    paddingBottom: 32,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  prodThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  noThumb: {
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  detailContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  galleryRow: {
    gap: 10,
    paddingVertical: 6,
  },
  galleryThumbContainer: {
    width: 90,
    height: 110,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  galleryThumb: {
    width: '100%',
    height: '100%',
  },
  pricingCard: {
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  totalPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
});

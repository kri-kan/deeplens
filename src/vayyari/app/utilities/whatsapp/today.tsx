import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  ActivityIndicator,
  Divider,
  List,
  Chip,
  IconButton,
  Surface,
  Searchbar,
  Portal,
  Modal,
  Menu,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { productService } from '@/services/productService';
import { vendorService } from '@/services/vendorService';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { format } from 'date-fns';

export default function WhatsAppProductsTodayScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [candidatesCount, setCandidatesCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter master lists
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Dialogs
  const [vendorFilterVisible, setVendorFilterVisible] = useState(false);
  const [categoryFilterVisible, setCategoryFilterVisible] = useState(false);
  const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null);

  const handleManualEnrich = async (groupId: string) => {
    if (!groupId) {
      Alert.alert('Error', 'Cannot enrich: No Source Group ID found for this product.');
      return;
    }
    try {
      await productService.retryEnrichment(groupId);
      Alert.alert('Success', 'Manual enrichment initiated successfully');
      fetchData();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to initiate manual enrichment');
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [todayProds, mergeCandidates, vendorList, failedList] = await Promise.all([
        productService.fetchTodayWhatsAppProducts(),
        productService.fetchMergeCandidates(),
        vendorService.listVendors(1, 100, true),
        productService.fetchFailedEnrichments(),
      ]);

      setProducts(todayProds || []);
      setCandidatesCount(mergeCandidates?.length || 0);
      setVendors(vendorList.vendors || []);
      setFailedCount(failedList?.length || 0);

      // Extract unique categories
      const uniqueCats = Array.from(
        new Set(todayProds.map((p: any) => p.Category || p.category).filter(Boolean))
      ) as string[];
      setCategories(uniqueCats);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Filter computation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const title = p.Title || p.title || '';
      const sku = p.Sku || p.sku || '';
      const category = p.Category || p.category || '';
      const vendorId = p.VendorId || p.vendorId || '';

      const matchesSearch =
        !search ||
        title.toLowerCase().includes(search.toLowerCase()) ||
        sku.toLowerCase().includes(search.toLowerCase());

      const matchesVendor = !selectedVendor || vendorId === selectedVendor;
      const matchesCategory = !selectedCategory || category === selectedCategory;

      return matchesSearch && matchesVendor && matchesCategory;
    });
  }, [products, search, selectedVendor, selectedCategory]);

  if (loading && !refreshing) {
    return (
      <ScreenWrapper title="Products Today">
        <ActivityIndicator style={{ marginTop: 40 }} />
      </ScreenWrapper>
    );
  }

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return 'https://via.placeholder.com/150?text=No+Image';
    return productService.getThumbnailUrlByPath(imagePath, 'medium');
  };

  return (
    <ScreenWrapper title="WhatsApp Pipeline">
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.container}
      >
        {/* Bento Summary Panel */}
        <View style={styles.bentoRow}>
          <Surface style={[styles.bentoCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={1}>
            <IconButton icon="package-variant-closed" iconColor={theme.colors.onPrimaryContainer} size={24} style={{ margin: 0 }} />
            <Text variant="displaySmall" style={[styles.bentoNumber, { color: theme.colors.onPrimaryContainer }]}>
              {products.length}
            </Text>
            <Text variant="labelMedium" style={[styles.bentoLabel, { color: theme.colors.onPrimaryContainer }]}>
              Products Today
            </Text>
          </Surface>

          <Surface style={[styles.bentoCard, { backgroundColor: theme.colors.secondaryContainer }]} elevation={1}>
            <TouchableOpacity onPress={() => router.push('/utilities/product/merge-candidates')}>
              <IconButton icon="call-merge" iconColor={theme.colors.onSecondaryContainer} size={24} style={{ margin: 0 }} />
              <Text variant="displaySmall" style={[styles.bentoNumber, { color: theme.colors.onSecondaryContainer }]}>
                {candidatesCount}
              </Text>
              <Text variant="labelMedium" style={[styles.bentoLabel, { color: theme.colors.onSecondaryContainer }]}>
                Merge Candidates
              </Text>
            </TouchableOpacity>
          </Surface>

          <Surface style={[styles.bentoCard, { backgroundColor: theme.colors.errorContainer }]} elevation={1}>
            <TouchableOpacity onPress={() => router.push('/utilities/whatsapp/failed-enrichments')}>
              <IconButton icon="alert-circle-outline" iconColor={theme.colors.onErrorContainer} size={24} style={{ margin: 0 }} />
              <Text variant="displaySmall" style={[styles.bentoNumber, { color: theme.colors.onErrorContainer }]}>
                {failedCount}
              </Text>
              <Text variant="labelMedium" style={[styles.bentoLabel, { color: theme.colors.onErrorContainer }]}>
                Failed Extractions
              </Text>
            </TouchableOpacity>
          </Surface>
        </View>

        {/* Filter bar */}
        <Surface style={styles.filterSection} elevation={1}>
          <Searchbar
            placeholder="Search SKU or title..."
            onChangeText={setSearch}
            value={search}
            elevation={0}
            style={styles.searchBar}
          />
          <View style={styles.chipRow}>
            <Chip
              selected={!!selectedVendor}
              icon="store"
              onPress={() => setVendorFilterVisible(true)}
              style={styles.filterChip}
            >
              {selectedVendor
                ? vendors.find((v) => v.id === selectedVendor)?.vendorName || 'Vendor'
                : 'All Vendors'}
            </Chip>

            <Chip
              selected={!!selectedCategory}
              icon="tag"
              onPress={() => setCategoryFilterVisible(true)}
              style={styles.filterChip}
            >
              {selectedCategory || 'All Categories'}
            </Chip>

            {(selectedVendor || selectedCategory || search) && (
              <IconButton
                icon="close-circle-outline"
                size={20}
                iconColor={theme.colors.error}
                onPress={() => {
                  setSelectedVendor(null);
                  setSelectedCategory(null);
                  setSearch('');
                }}
                style={{ margin: 0 }}
              />
            )}
          </View>
        </Surface>

        {/* Product Feed */}
        <Text variant="titleMedium" style={styles.sectionHeader}>
          Products List ({filteredProducts.length})
        </Text>

        {filteredProducts.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={1}>
            <Text style={styles.emptyText}>No products match the selected filters.</Text>
          </Surface>
        ) : (
          filteredProducts.map((item) => (
            <Card key={item.ProductId || item.productId} style={styles.productCard}>
              <View style={styles.cardRow}>
                <Image source={{ uri: getImageUrl(item.ImagePath || item.imagePath) }} style={styles.productImage} />
                <View style={styles.productDetails}>
                  <Text variant="titleMedium" style={styles.productTitle} numberOfLines={1}>
                    {item.Title || item.title || 'Untitled Product'}
                  </Text>
                  <Text variant="bodySmall" style={styles.productSku}>
                    SKU: {item.Sku || item.sku || 'N/A'} • {item.ListingCount || item.listingCount || 0} listings
                  </Text>
                  <Text variant="bodySmall" style={styles.productCategory}>
                    {item.Category || item.category || 'Uncategorized'}
                    {item.SubCategory || item.subCategory ? ` > ${item.SubCategory || item.subCategory}` : ''}
                  </Text>
                  <Text variant="bodySmall" style={styles.productVendor}>
                    Vendor: {item.VendorName || item.vendorName || 'Unknown'}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text variant="bodyMedium" style={styles.productPrice}>
                      {item.DetectedPrice || item.detectedPrice ? `₹${item.DetectedPrice || item.detectedPrice}` : 'N/A'}
                    </Text>
                    <Text variant="bodySmall" style={styles.shippingText}>
                      {item.DetectedShipping || item.detectedShipping === 'free' ? 'Free Shipping' : 'Extra Shipping'}
                    </Text>
                  </View>
                </View>
              </View>
              <Card.Actions style={styles.cardActions}>
                <Text variant="labelSmall" style={styles.timestampText}>
                  {format(new Date(item.ProductCreatedAt || item.productCreatedAt), 'HH:mm')}
                </Text>
                <Button
                  mode="contained-tonal"
                  compact
                  onPress={() => router.push(`/product/${item.ProductId || item.productId}`)}
                >
                  View Details
                </Button>
              </Card.Actions>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Vendor Filter Picker Dialog */}
      <Portal>
        <Modal
          visible={vendorFilterVisible}
          onDismiss={() => setVendorFilterVisible(false)}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Filter by Vendor
          </Text>
          <ScrollView style={{ maxHeight: 300 }}>
            <List.Item
              title="All Vendors"
              onPress={() => {
                setSelectedVendor(null);
                setVendorFilterVisible(false);
              }}
              right={(props) => (!selectedVendor ? <List.Icon {...props} icon="check" /> : null)}
            />
            <Divider />
            {vendors.map((v) => (
              <List.Item
                key={v.id}
                title={v.vendorName}
                onPress={() => {
                  setSelectedVendor(v.id);
                  setVendorFilterVisible(false);
                }}
                right={(props) => (selectedVendor === v.id ? <List.Icon {...props} icon="check" /> : null)}
              />
            ))}
          </ScrollView>
        </Modal>

        {/* Category Filter Picker Dialog */}
        <Modal
          visible={categoryFilterVisible}
          onDismiss={() => setCategoryFilterVisible(false)}
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.background }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Filter by Category
          </Text>
          <ScrollView style={{ maxHeight: 300 }}>
            <List.Item
              title="All Categories"
              onPress={() => {
                setSelectedCategory(null);
                setCategoryFilterVisible(false);
              }}
              right={(props) => (!selectedCategory ? <List.Icon {...props} icon="check" /> : null)}
            />
            <Divider />
            {categories.map((cat) => (
              <List.Item
                key={cat}
                title={cat}
                onPress={() => {
                  setSelectedCategory(cat);
                  setCategoryFilterVisible(false);
                }}
                right={(props) => (selectedCategory === cat ? <List.Icon {...props} icon="check" /> : null)}
              />
            ))}
          </ScrollView>
        </Modal>
      </Portal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    justifyContent: 'center',
  },
  bentoNumber: {
    fontWeight: '800',
    marginTop: 4,
  },
  bentoLabel: {
    fontWeight: '600',
    opacity: 0.8,
    marginTop: 2,
  },
  filterSection: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    gap: 8,
  },
  searchBar: {
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    backgroundColor: '#f5f5f5',
  },
  sectionHeader: {
    fontWeight: '700',
    marginTop: 8,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyText: {
    opacity: 0.5,
  },
  productCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 1,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  productImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontWeight: '700',
    fontSize: 15,
  },
  productSku: {
    opacity: 0.5,
    fontSize: 12,
    marginTop: 2,
  },
  productCategory: {
    opacity: 0.6,
    fontSize: 12,
  },
  productVendor: {
    opacity: 0.6,
    fontSize: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  productPrice: {
    fontWeight: '700',
    color: '#075E54',
  },
  shippingText: {
    fontSize: 11,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  cardActions: {
    backgroundColor: '#fafafa',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  timestampText: {
    opacity: 0.4,
  },
  modalContent: {
    margin: 20,
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
});

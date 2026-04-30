import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import {
  Surface,
  Text,
  IconButton,
  useTheme,
  ActivityIndicator,
  Icon,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { productService } from '@/services/productService';
import { CategoryIcon, CATEGORY_REGISTRY } from '@/components/CategoryIcons';
import type { VendorProduct } from '@/types/products';

const { width } = Dimensions.get('window');
const TILE_SIZE = width / 3;

const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'apps' },
  ...CATEGORY_REGISTRY.map(cat => ({
    id: cat.id,
    name: cat.label,
    icon: cat.id // This is used as the category prop for CategoryIcon
  }))
];

export default function ProductCatalogScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const pagerRef = useRef<FlatList>(null);
  
  const handleTabPress = (index: number) => {
    setActiveTab(index);
    pagerRef.current?.scrollToIndex({ index, animated: true });
  };

  const onScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    if (index !== activeTab && index >= 0 && index < CATEGORIES.length) {
      setActiveTab(index);
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} />
        <Text variant="titleLarge" style={styles.headerTitle}>Products</Text>
        <View style={styles.headerActions}>
          <IconButton icon="magnify" onPress={() => {}} />
          <IconButton icon="filter-variant" onPress={() => {}} />
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabContainer}>
        {CATEGORIES.map((cat, index) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.tabItem}
            onPress={() => handleTabPress(index)}
          >
            <View style={[
              styles.iconCircle,
              { backgroundColor: activeTab === index ? theme.colors.primaryContainer : 'transparent' }
            ]}>
              {cat.id === 'all' ? (
                <Icon
                  source="apps"
                  size={24}
                  color={activeTab === index ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
              ) : (
                <CategoryIcon
                  category={cat.id as any}
                  size={24}
                  color={activeTab === index ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === index ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: activeTab === index ? 'bold' : 'normal' }
              ]}
              variant="labelSmall"
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Horizontal Pager for Category Content */}
      <FlatList
        ref={pagerRef}
        data={CATEGORIES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CategoryPage categoryId={item.id} />
        )}
      />
    </Surface>
  );
}

function CategoryPage({ categoryId }: { categoryId: string }) {
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (loading && !isRefresh) return;
    if (!hasMore && !isRefresh) return;
    if (error && !isRefresh) return;
    
    if (isRefresh) {
      setRefreshing(true);
      setError(null);
    }
    else setLoading(true);

    try {
      const currentSkip = isRefresh ? 0 : products.length;
      const take = 30;
      const filter = {
        category: categoryId === 'all' ? undefined : categoryId,
        skip: currentSkip,
        take: take
      };
      
      const { products: newData, totalCount } = await productService.getCatalog(filter);
      
      setProducts(prev => {
        const updated = isRefresh ? newData : [...prev, ...newData];
        setHasMore(updated.length < totalCount && newData.length > 0);
        return updated;
      });
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId, products.length, loading, hasMore, error]);

  useEffect(() => {
    fetchProducts(true);
  }, [categoryId]);

  const renderProductTile = ({ item }: { item: VendorProduct }) => {
    // Determine image URI - use starred or first media
    // Mocking media since DTO might need mapping
    const media = item.media?.find((m: any) => m.isDefault) || item.media?.[0];
    let imageUri = 'https://via.placeholder.com/150';
    
    if (media) {
      if (media.id && media.id !== '00000000-0000-0000-0000-000000000000') {
        imageUri = productService.getThumbnailUrl(media.id, 'medium');
      } else if (media.path) {
        imageUri = productService.getThumbnailUrlByPath(media.path, 'medium');
      }
    }

    return (
      <TouchableOpacity 
        style={styles.tile}
        onPress={() => router.push(`/product/${item.id}`)}
      >
        <Image
          source={{ uri: imageUri }}
          style={styles.tileImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.tileOverlay}>
          <Text style={styles.tileCode}>{item.productCode || '---'}</Text>
          <Text style={styles.tilePrice}>₹{item.vendorPrice}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ width: width }}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProductTile}
        numColumns={3}
        contentContainerStyle={styles.gridContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchProducts(true)} />
        }
        onEndReached={() => hasMore && fetchProducts()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && !refreshing ? <ActivityIndicator style={{ margin: 20 }} /> : null}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={{ opacity: 0.5 }}>
              {error ? error : 'No products found'}
            </Text>
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
    paddingHorizontal: 4,
  },
  headerTitle: {
    flex: 1,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tabItem: {
    alignItems: 'center',
    width: width / 5,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
  },
  gridContent: {
    paddingBottom: 20,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE * 1.3,
    padding: 0.5, // Tiny gap
  },
  tileImage: {
    flex: 1,
  },
  tileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  tileCode: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tilePrice: {
    color: 'white',
    fontSize: 10,
  },
  emptyContainer: {
    flex: 1,
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React, { useState, useRef } from 'react';
import { View, FlatList, Dimensions, RefreshControl } from 'react-native';
import { Surface, Text, IconButton, useTheme, ActivityIndicator, Appbar } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { ProductCategoryPicker } from '@/components/utility/product/ProductCategoryPicker';
import { ProductTile } from '@/components/utility/product/ProductTile';
import { CATEGORY_REGISTRY } from '@/components/CategoryIcons';

import { useProductCatalog } from '@/hooks/useProductCatalog';
import { styles } from '@/styles/screens/product-list.styles';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'apps' },
  ...CATEGORY_REGISTRY.map(cat => ({
    id: cat.id,
    name: cat.label,
    icon: cat.id
  }))
];

export default function ProductCatalogScreen() {
  const theme = useTheme();
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
    <ScreenWrapper 
      title="Product Catalog" 
      actions={
        <View style={styles.headerActions}>
          <IconButton icon="magnify" onPress={() => {}} />
          <IconButton icon="filter-variant" onPress={() => {}} />
        </View>
      }
      withScrollView={false}
    >
      <View style={styles.tabContainer}>
        <ProductCategoryPicker 
          selectedCategory={CATEGORIES[activeTab].id as any}
          onSelect={(catId) => {
            const index = CATEGORIES.findIndex(c => c.id === catId);
            if (index !== -1) handleTabPress(index);
          }}
        />
      </View>

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
    </ScreenWrapper>
  );
}

function CategoryPage({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const { 
    products, 
    loading, 
    refreshing, 
    hasMore, 
    error, 
    fetchProducts 
  } = useProductCatalog(categoryId);

  return (
    <View style={{ width: width }}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductTile item={item} onPress={(p) => router.push(`/product/${p.id}`)} />
        )}
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

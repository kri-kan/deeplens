import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { Surface, Text, Appbar, List, Avatar, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { productService } from '@/services/productService';
import type { VendorProduct } from '@/types/products';

export default function ProductListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await productService.getProducts(0, 50);
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const renderItem = ({ item }: { item: VendorProduct }) => (
    <List.Item
      title={item.title || 'Untitled Product'}
      description={`₹${item.vendorPrice} • ${item.category || 'No Category'}`}
      left={props => {
        const mediaId = item.media && item.media.length > 0 ? item.media[0].id : null;
        if (mediaId) {
          return (
            <Avatar.Image 
              {...props} 
              source={{ uri: productService.getThumbnailUrl(mediaId, 'medium') }} 
              size={48} 
            />
          );
        }
        return (
          <Avatar.Icon 
            {...props} 
            icon="package-variant" 
            size={48} 
            style={{ backgroundColor: theme.colors.surfaceVariant }} 
          />
        );
      }}
      right={props => <List.Icon {...props} icon="chevron-right" />}
      onPress={() => {
        // Implement product detail navigation later
      }}
      style={styles.listItem}
    />
  );

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Master Catalog" titleStyle={{ fontWeight: 'bold' }} />
        <Appbar.Action icon="plus" onPress={() => router.push('/utilities/create-product')} />
      </Appbar.Header>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchProducts(true)} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="bodyLarge" style={{ opacity: 0.5 }}>No products found in catalog.</Text>
            </View>
          }
        />
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  empty: {
    flex: 1,
    marginTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

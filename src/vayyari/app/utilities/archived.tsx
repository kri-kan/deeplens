import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, FlatList, Dimensions, RefreshControl, StyleSheet, PanResponder, BackHandler, GestureResponderEvent } from 'react-native';
import { Text, IconButton, useTheme, ActivityIndicator, Searchbar, Button } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { ProductTile } from '@/components/utility/product/ProductTile';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { productService } from '@/services/productService';
import { styles } from '@/styles/screens/product-list.styles';

const { width } = Dimensions.get('window');
const TILE_SIZE = width / 3;

export default function ArchivedProductsScreen() {
  const theme = useTheme();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedIds.size > 0;

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectedIdsRef = useRef(selectedIds);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
  const clearSelectionRef = useRef(clearSelection);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedIdsRef.current.size > 0) {
          clearSelectionRef.current();
          return true;
        }
        return false;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const handleBack = () => {
    if (selectionMode) {
      clearSelection();
    } else {
      router.back();
    }
  };

  const { products, loading, refreshing, hasMore, error, totalCount, fetchProducts, toggleStar } = useProductCatalog({
    categoryId: 'all',
    query: searchQuery,
    includeArchived: true,
  });

  const handleUnarchive = async () => {
    if (selectedIds.size > 0) {
      await productService.unarchiveProducts(Array.from(selectedIds));
      clearSelection();
      fetchProducts(true);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size > 0) {
      // Stub for delete functionality as requested
      console.log('Delete stub');
    }
  };

  const isDragSelectingRef = useRef(false);
  const swipeActionRef = useRef<'add' | 'remove'>('add');
  const swipedIdsRef = useRef<Set<string>>(new Set());
  const onSelectRef = useRef(toggleSelection);
  const productsRef = useRef(products);
  
  useEffect(() => { onSelectRef.current = toggleSelection; }, [toggleSelection]);
  useEffect(() => { productsRef.current = products; }, [products]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: () => isDragSelectingRef.current,
      onMoveShouldSetPanResponder: () => isDragSelectingRef.current,
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { pageX, pageY } = evt.nativeEvent;
        // Simple calculation for a single FlatList without horizontal paging offset
        const COLS = 3;
        const ROW_H = TILE_SIZE * 1.3;
        const topEdge = 100; // rough estimate header height
        const relX = pageX;
        const relY = pageY - topEdge; // simplified
        const col = Math.floor((relX / width) * COLS);
        const row = Math.floor(relY / ROW_H);
        
        if (col >= 0 && col < COLS && row >= 0) {
          const idx = row * COLS + col;
          const prods = productsRef.current;
          if (idx < prods.length) {
            const id = prods[idx].id;
            if (!swipedIdsRef.current.has(id)) {
              swipedIdsRef.current.add(id);
              onSelectRef.current(id);
            }
          }
        }
      },
      onPanResponderRelease: () => {
        isDragSelectingRef.current = false;
        swipedIdsRef.current = new Set();
      },
      onPanResponderTerminate: () => {
        isDragSelectingRef.current = false;
        swipedIdsRef.current = new Set();
      },
    })
  ).current;

  return (
    <ScreenWrapper
      title={`Archived Products (${totalCount})`}
      onBack={handleBack}
      actions={
        isSearching ? (
          <Searchbar
            placeholder="Search archived..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={{ width: width - 80, height: 40, elevation: 0 }}
            inputStyle={{ minHeight: 0 }}
            icon="arrow-left"
            onIconPress={() => { setIsSearching(false); setSearchQuery(''); }}
            clearIcon="close"
            onClearIconPress={() => setSearchQuery('')}
          />
        ) : (
          <View style={styles.headerActions}>
            <IconButton icon="magnify" onPress={() => setIsSearching(true)} />
          </View>
        )
      }
      withScrollView={false}
    >
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <FlatList
          data={products}
          extraData={selectedIds}
          keyExtractor={(item) => item.id}
          renderItem={useCallback(({ item }: any) => (
            <ProductTile
              item={item}
              selected={selectedIds.has(item.id)}
              selectionMode={selectionMode}
              onPress={(p) => {
                if (selectionMode) toggleSelection(p.id);
                else router.push(`/product/${p.id}`);
              }}
              onLongPress={(p) => {
                toggleSelection(p.id);
              }}
              onDragStart={() => {
                isDragSelectingRef.current = true;
                swipeActionRef.current = selectedIds.has(item.id) ? 'remove' : 'add';
                swipedIdsRef.current = new Set([item.id]);
              }}
              onToggleStar={(p, isStarred) => toggleStar(p.id, isStarred)}
            />
          ), [selectedIds, selectionMode, toggleSelection, toggleStar])}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchProducts(true)} />}
          onEndReached={() => hasMore && fetchProducts()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loading && !refreshing ? <ActivityIndicator style={{ margin: 20 }} /> : null}
          ListEmptyComponent={!loading ? (
            <View style={styles.emptyContainer}>
              <Text variant="bodyMedium" style={{ opacity: 0.5 }}>
                {error ? error : 'No archived products found'}
              </Text>
            </View>
          ) : null}
        />
      </View>

      {selectionMode && (
        <View style={{
          position: 'absolute', bottom: 20, left: 20, right: 20,
          backgroundColor: theme.colors.elevation.level3,
          padding: 16, borderRadius: 12, elevation: 4,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <Text style={{ fontWeight: 'bold' }}>{selectedIds.size} Selected</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button mode="text" onPress={clearSelection}>Cancel</Button>
            <Button mode="outlined" onPress={handleDelete}>Delete</Button>
            <Button mode="contained" onPress={handleUnarchive}>
              Unarchive
            </Button>
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}

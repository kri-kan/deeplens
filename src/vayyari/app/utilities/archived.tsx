import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, FlatList, Dimensions, RefreshControl, StyleSheet, PanResponder, BackHandler, GestureResponderEvent, Alert } from 'react-native';
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

  const handleDelete = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    Alert.alert(
      'Permanent Delete',
      `Are you sure you want to permanently delete ${ids.length} archived product(s)? This will purge all associated WhatsApp media and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await productService.deleteProductsBulk(ids);
              clearSelection();
              fetchProducts(true);
              Alert.alert('Deleted', 'Selected archived products permanently deleted.');
            } catch (e) {
              console.error('Failed to permanently delete archived products:', e);
              Alert.alert('Error', 'Failed to permanently delete selected products.');
            }
          },
        },
      ]
    );
  };

  const isDragSelectingRef = useRef(false);
  const swipeActionRef = useRef<'add' | 'remove'>('add');
  const swipedIdsRef = useRef<Set<string>>(new Set());
  const onSelectRef = useRef(toggleSelection);
  const productsRef = useRef(products);
  
  useEffect(() => { onSelectRef.current = toggleSelection; }, [toggleSelection]);
  const [containerWidth, setContainerWidth] = useState(width);

  const getCatalogLayout = (w: number) => {
    // Mobile (< 750px): keep original 3-column layout unchanged — tile uses its own TILE_SIZE internally
    if (w < 750) {
      return { numColumns: 3, tileWidth: undefined as number | undefined, tileHeight: undefined as number | undefined, gap: 0, padding: 0 };
    }

    // Web / tablet: responsive multi-column with explicit smaller tile sizes
    let numColumns = 4;
    if (w >= 1400) numColumns = 6;
    else if (w >= 1100) numColumns = 5;
    else numColumns = 4; // 750–1099px

    const gap = 8;
    const padding = 10;
    const availableWidth = w - (padding * 2) - (gap * (numColumns - 1));
    const tileWidth = Math.max(100, Math.floor(availableWidth / numColumns));
    const tileHeight = Math.floor(tileWidth * 1.3);

    return { numColumns, tileWidth, tileHeight, gap, padding };
  };

  const layout = getCatalogLayout(containerWidth);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: () => isDragSelectingRef.current,
      onMoveShouldSetPanResponder: () => isDragSelectingRef.current,
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { pageX, pageY } = evt.nativeEvent;
        // On mobile, tileWidth/tileHeight are undefined — fall back to original TILE_SIZE-based calculation
        const effectiveTileW = layout.tileWidth ?? (width / 3);
        const effectiveTileH = layout.tileHeight ?? (width / 3 * 1.3);
        const effectiveGap = layout.gap;
        const effectivePadding = layout.padding;
        const relX = pageX - effectivePadding;
        const relY = pageY - 100 - effectivePadding;
        const col = Math.floor(relX / (effectiveTileW + effectiveGap));
        const row = Math.floor(relY / (effectiveTileH + effectiveGap));
        
        if (col >= 0 && col < layout.numColumns && row >= 0) {
          const idx = row * layout.numColumns + col;
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
      <View
        style={{ flex: 1 }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && Math.abs(w - containerWidth) > 5) setContainerWidth(w);
        }}
        {...panResponder.panHandlers}
      >
        <FlatList
          key={`archived-grid-${layout.numColumns}`}
          data={products}
          extraData={selectedIds}
          keyExtractor={(item) => item.id}
          numColumns={layout.numColumns}
          columnWrapperStyle={layout.gap > 0 ? { gap: layout.gap, marginBottom: layout.gap } : undefined}
          contentContainerStyle={layout.padding > 0 ? [styles.gridContent, { paddingHorizontal: layout.padding, paddingTop: 8 }] : styles.gridContent}
          renderItem={useCallback(({ item }: any) => (
            <ProductTile
              item={item}
              tileWidth={layout.tileWidth}
              tileHeight={layout.tileHeight}
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
          ), [selectedIds, selectionMode, toggleSelection, toggleStar, layout.tileWidth, layout.tileHeight])}
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

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, FlatList, Dimensions, RefreshControl, StyleSheet, Alert,
  PanResponder, GestureResponderEvent, BackHandler, ScrollView, TouchableOpacity
} from 'react-native';
import { Text, IconButton, useTheme, ActivityIndicator, Searchbar, Portal, Dialog, List, Button, Menu, TextInput, Icon } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { ProductCategoryPicker } from '@/components/utility/product/ProductCategoryPicker';
import { ProductTile } from '@/components/utility/product/ProductTile';
import { FilterDrawer, FilterState, DEFAULT_FILTER_STATE } from '@/components/utility/product/FilterDrawer';

import { useProductCatalog, ProductCatalogFilters } from '@/hooks/useProductCatalog';
import { styles } from '@/styles/screens/product-list.styles';
import { productService } from '@/services/productService';
import type { VendorProduct } from '@/types/products';

const { width } = Dimensions.get('window');
const TILE_SIZE = width / 3;

const CATEGORIES = [
  { id: 'all', label: 'All', iconName: 'apps' },
  { id: 'saree', label: 'Saree', iconName: 'saree.svg' },
  { id: 'dress', label: 'Dress', iconName: 'dress.svg' },
  { id: 'lehanga', label: 'Lehanga', iconName: 'lehanga.svg' },
  { id: 'kids', label: 'Kids', iconName: 'kids.svg' },
  { id: 'general', label: 'Others', iconName: 'others.svg' },
];

export default function ProductCatalogScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const pagerRef = useRef<FlatList>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  const currentCategoryCount = categoryCounts[CATEGORIES[activeTab]?.id] ?? null;

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

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Quick edit price & category tag state
  const [quickEditProduct, setQuickEditProduct] = useState<VendorProduct | null>(null);
  const [quickEditPrice, setQuickEditPrice] = useState('');
  const [quickEditCategory, setQuickEditCategory] = useState('');
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);

  const handleOpenQuickEdit = useCallback((product: VendorProduct) => {
    setQuickEditProduct(product);
    setQuickEditPrice(product.vendorPrice?.toString() || '');
    setQuickEditCategory(product.category || '');
  }, []);

  const handleSaveQuickEdit = async () => {
    if (!quickEditProduct) return;
    setIsSavingQuickEdit(true);
    try {
      const priceNum = parseFloat(quickEditPrice);
      await productService.updateProductMetadata(quickEditProduct.id, {
        price: isNaN(priceNum) ? undefined : priceNum,
        categoryName: quickEditCategory || undefined,
        useForTraining: true,
      });
      setQuickEditProduct(null);
      // Trigger list refresh
      setActiveFilters(prev => ({ ...prev }));
    } catch (error) {
      console.error('Failed to save quick edit:', error);
    } finally {
      setIsSavingQuickEdit(false);
    }
  };

  // Filter drawer state
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const activeFilterCount =
    (activeFilters.sortBy !== 'recent' ? 1 : 0) +
    (activeFilters.isStarred !== null && activeFilters.isStarred !== undefined ? 1 : 0) +
    (activeFilters.categories && activeFilters.categories.length > 0 ? 1 : 0) +
    activeFilters.fabrics.length +
    activeFilters.vendorNames.length +
    (activeFilters.minPrice > 0 ? 1 : 0) +
    (activeFilters.includeArchived !== null && activeFilters.includeArchived !== undefined ? 1 : 0);

  const [selectedProductForCategory, setSelectedProductForCategory] = useState<VendorProduct | null>(null);
  const [changingCategory, setChangingCategory] = useState(false);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedIds.size > 0;
  const [selectionMenuVisible, setSelectionMenuVisible] = useState(false);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Keep a ref so the BackHandler never needs to be re-registered on selection changes
  const selectedIdsRef = useRef(selectedIds);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
  const clearSelectionRef = useRef(clearSelection);

  // Register once on focus, read latest state via refs — no re-registration on every toggle
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
    }, []) // stable — never re-registers
  );

  const [isReevaluating, setIsReevaluating] = useState(false);
  const handleBulkReevaluate = async () => {
    if (selectedIds.size === 0) return;
    setIsReevaluating(true);
    try {
      await productService.reevaluateProducts(Array.from(selectedIds));
      clearSelection();
    } catch (e) {
      console.error(e);
    } finally {
      setIsReevaluating(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    Alert.alert(
      'Permanent Delete',
      `Are you sure you want to permanently delete ${ids.length} product(s)? This will purge all associated WhatsApp media and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await productService.deleteProductsBulk(ids);
              clearSelection();
              setActiveFilters(prev => ({ ...prev }));
              Alert.alert('Deleted', 'Selected products and media permanently deleted.');
            } catch (e) {
              console.error('Failed to permanently delete products:', e);
              Alert.alert('Error', 'Failed to permanently delete selected products.');
            }
          },
        },
      ]
    );
  };

  const handleChangeCategory = async (slug: string) => {
    if (!selectedProductForCategory) return;
    setChangingCategory(true);
    try {
      await productService.changeCategory(selectedProductForCategory.id, slug);
    } catch (e) {
      console.error(e);
    } finally {
      setChangingCategory(false);
      setSelectedProductForCategory(null);
    }
  };

  const handleApplyFilters = (filters: FilterState) => {
    setActiveFilters(filters);
    const primaryCat = filters.categories?.[0];
    if (primaryCat && primaryCat !== 'all') {
      const idx = CATEGORIES.findIndex(c => c.id === primaryCat);
      if (idx !== -1 && idx !== activeTab) handleTabPress(idx);
    }
  };

  // Custom onBack for ScreenWrapper: clear selection if active, else go back
  const handleBack = useCallback(() => {
    if (selectionMode) {
      clearSelection();
    } else {
      router.back();
    }
  }, [selectionMode, clearSelection, router]);

  return (
    <ScreenWrapper
      title={`${CATEGORIES[activeTab]?.label || ''}${currentCategoryCount !== null ? ` (${currentCategoryCount})` : ''}`}
      onBack={router.canGoBack() ? handleBack : undefined}
      actions={
        isSearching ? (
          <Searchbar
            placeholder="Search products..."
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
            <IconButton icon="archive-outline" onPress={() => router.push('/utilities/archived')} />
            <View>
              <IconButton
                icon={activeFilterCount > 0 ? 'filter' : 'filter-outline'}
                iconColor={activeFilterCount > 0 ? theme.colors.primary : undefined}
                onPress={() => setFilterDrawerVisible(true)}
              />
              {activeFilterCount > 0 && (
                <View style={{
                  position: 'absolute', top: 6, right: 6,
                  backgroundColor: theme.colors.primary,
                  borderRadius: 8, minWidth: 16, height: 16,
                  alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3
                }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{activeFilterCount}</Text>
                </View>
              )}
            </View>
          </View>
        )
      }
      withScrollView={false}
    >
      <FilterDrawer
        visible={filterDrawerVisible}
        onClose={() => setFilterDrawerVisible(false)}
        current={activeFilters}
        onApply={handleApplyFilters}
      />

      <Portal>
        <Dialog visible={!!selectedProductForCategory} onDismiss={() => setSelectedProductForCategory(null)}>
          <Dialog.Title>Change Category</Dialog.Title>
          <Dialog.Content>
            {changingCategory ? (
              <ActivityIndicator size="large" />
            ) : (
              CATEGORIES.filter(c => c.id !== 'all').map(c => (
                <List.Item
                  key={c.id}
                  title={c.label}
                  onPress={() => handleChangeCategory(c.id)}
                  left={props => <List.Icon {...props} icon={c.iconName} />}
                />
              ))
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelectedProductForCategory(null)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Quick Edit Price & Category Tag Dialog (Triggered on long press) */}
        <Dialog visible={!!quickEditProduct} onDismiss={() => setQuickEditProduct(null)}>
          <Dialog.Title>Quick Edit Price & Category</Dialog.Title>
          <Dialog.Content>
            {isSavingQuickEdit ? (
              <ActivityIndicator size="large" />
            ) : (
              <View style={{ gap: 12 }}>
                <Text variant="labelMedium" style={{ color: theme.colors.outline }}>
                  Product Code: {quickEditProduct?.productCode || '---'}
                </Text>
                <TextInput
                  label="Price (INR)"
                  value={quickEditPrice}
                  onChangeText={setQuickEditPrice}
                  keyboardType="numeric"
                  mode="outlined"
                />
                <TextInput
                  label="Category Tag"
                  value={quickEditCategory}
                  onChangeText={setQuickEditCategory}
                  placeholder="e.g. Saree, Dress, Lehanga..."
                  mode="outlined"
                />
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setQuickEditProduct(null)}>Cancel</Button>
            <Button onPress={handleSaveQuickEdit} loading={isSavingQuickEdit} mode="contained">
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <View style={styles.tabContainer}>
        {selectionMode ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 48, backgroundColor: theme.colors.elevation.level2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton icon="close" size={20} onPress={clearSelection} style={{ margin: 0, marginRight: 8 }} />
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{selectedIds.size} Selected</Text>
            </View>
            <Menu
              visible={selectionMenuVisible}
              onDismiss={() => setSelectionMenuVisible(false)}
              anchor={<IconButton icon="dots-vertical" onPress={() => setSelectionMenuVisible(true)} />}
            >
              <Menu.Item
                leadingIcon="robot-outline"
                onPress={() => {
                  setSelectionMenuVisible(false);
                  handleBulkReevaluate();
                }}
                title="Re-evaluate AI"
              />
              {/* Archive — only shown when NOT browsing archived products */}
              {activeFilters.includeArchived !== true && (
                <Menu.Item
                  leadingIcon="archive-outline"
                  onPress={async () => {
                    setSelectionMenuVisible(false);
                    if (selectedIds.size === 0) return;
                    try {
                      await productService.archiveProducts(Array.from(selectedIds));
                      clearSelection();
                      Alert.alert('Archived', 'Products archived and storage optimized.');
                      // Trigger catalog refresh by producing a new filter reference
                      setActiveFilters(prev => ({ ...prev }));
                    } catch (e) {
                      console.error(e);
                      Alert.alert('Error', 'Failed to archive products.');
                    }
                  }}
                  title="Archive"
                />
              )}
              {/* Unarchive — only shown when browsing archived products */}
              {activeFilters.includeArchived === true && (
                <Menu.Item
                  leadingIcon="archive-off-outline"
                  onPress={async () => {
                    setSelectionMenuVisible(false);
                    if (selectedIds.size === 0) return;
                    try {
                      await productService.unarchiveProducts(Array.from(selectedIds));
                      clearSelection();
                      Alert.alert('Unarchived', 'Products restored to your active catalog.');
                      setActiveFilters(prev => ({ ...prev }));
                    } catch (e) {
                      console.error(e);
                      Alert.alert('Error', 'Failed to unarchive products.');
                    }
                  }}
                  title="Unarchive"
                />
              )}
              {/* Delete — permanent deletion with WhatsApp media purge */}
              <Menu.Item
                leadingIcon="delete-outline"
                onPress={() => {
                  setSelectionMenuVisible(false);
                  handleBulkDelete();
                }}
                title="Delete"
                titleStyle={{ color: theme.colors.error }}
              />
            </Menu>
            <IconButton
              icon="delete-outline"
              iconColor={theme.colors.error}
              onPress={handleBulkDelete}
              style={{ margin: 0 }}
            />
          </View>
        ) : (
          <ProductCategoryPicker
            showAll
            categories={CATEGORIES}
            selectedCategory={CATEGORIES[activeTab].id as any}
            onSelect={(catId) => {
              const index = CATEGORIES.findIndex(c => c.id.toLowerCase() === catId.toLowerCase());
              if (index !== -1) handleTabPress(index);
            }}
          />
        )}
      </View>

      {/* Quick filter chip row */}
      {!selectionMode && (
        <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 16,
                  borderWidth: 1,
                  gap: 5,
                },
                activeFilters.isStarred === true
                  ? {
                      backgroundColor: theme.colors.primaryContainer,
                      borderColor: theme.colors.primary,
                    }
                  : {
                      backgroundColor: theme.dark ? '#1e1e2e' : '#f4f4f5',
                      borderColor: theme.dark ? '#333' : '#e4e4e7',
                    },
              ]}
              onPress={() => {
                setActiveFilters(prev => ({
                  ...prev,
                  isStarred: prev.isStarred === true ? null : true,
                }));
              }}
            >
              <Icon
                source={activeFilters.isStarred === true ? 'star' : 'star-outline'}
                size={15}
                color={activeFilters.isStarred === true ? theme.colors.primary : theme.colors.outline}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: activeFilters.isStarred === true ? '700' : '500',
                  color: activeFilters.isStarred === true ? theme.colors.primary : (theme.dark ? '#e0e0e0' : '#333'),
                }}
              >
                ⭐ Starred
              </Text>
            </TouchableOpacity>

            {/* 📦 Archived quick chip */}
            <TouchableOpacity
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 16,
                  borderWidth: 1,
                  gap: 5,
                },
                activeFilters.includeArchived === true
                  ? {
                      backgroundColor: theme.colors.primaryContainer,
                      borderColor: theme.colors.primary,
                    }
                  : {
                      backgroundColor: theme.dark ? '#1e1e2e' : '#f4f4f5',
                      borderColor: theme.dark ? '#333' : '#e4e4e7',
                    },
              ]}
              onPress={() => {
                setActiveFilters(prev => ({
                  ...prev,
                  includeArchived: prev.includeArchived === true ? null : true,
                }));
              }}
            >
              <Icon
                source={activeFilters.includeArchived === true ? 'archive' : 'archive-outline'}
                size={15}
                color={activeFilters.includeArchived === true ? theme.colors.primary : theme.colors.outline}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: activeFilters.includeArchived === true ? '700' : '500',
                  color: activeFilters.includeArchived === true ? theme.colors.primary : (theme.dark ? '#e0e0e0' : '#333'),
                }}
              >
                📦 Archived
              </Text>
            </TouchableOpacity>

            {activeFilters.isStarred === false && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 16,
                  borderWidth: 1,
                  backgroundColor: theme.colors.primaryContainer,
                  borderColor: theme.colors.primary,
                  gap: 4,
                }}
                onPress={() => setActiveFilters(prev => ({ ...prev, isStarred: null }))}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.primary }}>Unstarred Only</Text>
                <Icon source="close" size={14} color={theme.colors.primary} />
              </TouchableOpacity>
            )}

            {activeFilterCount > 0 && (
              <TouchableOpacity
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 16,
                  backgroundColor: 'transparent',
                }}
                onPress={() => setActiveFilters(DEFAULT_FILTER_STATE)}
              >
                <Text style={{ fontSize: 12, color: theme.colors.outline }}>Clear ({activeFilterCount})</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      <FlatList
        ref={pagerRef}
        data={CATEGORIES}
        horizontal
        pagingEnabled
        scrollEnabled={!selectionMode}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        keyExtractor={(item) => item.id}
        extraData={{ searchQuery, activeFilters, selectedIds, selectionMode, activeTab }}
        renderItem={useCallback(({ item, index }: any) => (
          <CategoryPageMemo
            categoryId={item.id}
            query={searchQuery}
            filters={activeFilters}
            onCountChange={(count) => {
              setCategoryCounts(prev => {
                if (prev[item.id] === count) return prev;
                return { ...prev, [item.id]: count };
              });
            }}
            selectedIds={selectedIds}
            selectionMode={selectionMode}
            onSelect={toggleSelection}
            onLongPressPriceCategory={handleOpenQuickEdit}
            isActive={index === activeTab}
          />
        ), [searchQuery, activeFilters, selectedIds, selectionMode, activeTab, toggleSelection, handleOpenQuickEdit])}
      />

    </ScreenWrapper>
  );
}

// ---------------------------------------------------------------------------
// Swipe-to-select grid page
// ---------------------------------------------------------------------------

/**
 * Given absolute (pageX, pageY) touch coordinates and the container's measured
 * screen-space top/left, returns the item index in a 3-column grid.
 */
function indexFromPosition(
  pageX: number,
  pageY: number,
  containerLeft: number,
  containerTop: number,
  scrollOffset: number
): number | null {
  const COLS = 3;
  const ROW_H = TILE_SIZE * 1.3;
  const relX = pageX - containerLeft;
  const relY = pageY - containerTop + scrollOffset;
  const col = Math.floor((relX / width) * COLS);
  const row = Math.floor(relY / ROW_H);
  if (col < 0 || col >= COLS || row < 0 || relX < 0 || relX > width) return null;
  return row * COLS + col;
}

function CategoryPage({
  categoryId,
  query,
  filters,
  onCountChange,
  selectedIds,
  onSelect,
  onLongPressPriceCategory,
  selectionMode,
}: {
  categoryId: string;
  query?: string;
  filters: FilterState;
  onCountChange?: (count: number) => void;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onLongPressPriceCategory?: (product: VendorProduct) => void;
  selectionMode: boolean;
  isActive: boolean;
}) {
  const router = useRouter();
  const scrollOffsetRef = useRef(0);
  // Container screen-position — measured on layout so pageX/pageY can be made relative
  const containerRef = useRef<View>(null);
  const containerTopRef = useRef(0);
  const containerLeftRef = useRef(0);
  const containerHeightRef = useRef(0);
  const swipedIdsRef = useRef<Set<string>>(new Set());
  const swipeActionRef = useRef<'add' | 'remove'>('add');
  
  const isDragSelectingRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const autoScrollTimerRef = useRef<number | null>(null);

  // Keep live refs so PanResponder closure (created once) can read latest values
  const selectionModeRef = useRef(selectionMode);
  const selectedIdsRef = useRef(selectedIds);
  const productsRef = useRef<typeof products>([]);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { selectionModeRef.current = selectionMode; }, [selectionMode]);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const catalogFilters: ProductCatalogFilters = {
    categoryId,
    query,
    sortBy: filters.sortBy,
    fabrics: filters.fabrics.length > 0 ? filters.fabrics : undefined,
    vendorNames: filters.vendorNames.length > 0 ? filters.vendorNames : undefined,
    minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
    maxPrice: filters.maxPrice > 0 ? filters.maxPrice : undefined,
    categories: filters.categories && filters.categories.length > 0 ? filters.categories : undefined,
    isStarred: filters.isStarred,
    includeArchived: filters.includeArchived ?? undefined,
  };

  const {
    products,
    loading,
    refreshing,
    hasMore,
    error,
    totalCount,
    fetchProducts,
    toggleStar,
  } = useProductCatalog(catalogFilters);

  // Keep productsRef in sync after products are loaded/updated
  useEffect(() => { productsRef.current = products; }, [products]);

  React.useEffect(() => {
    if (onCountChange) {
      onCountChange(totalCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCount]);

  const stopAutoScroll = () => {
    if (autoScrollTimerRef.current !== null) {
      cancelAnimationFrame(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  };

  const startAutoScroll = (delta: number) => {
    if (autoScrollTimerRef.current !== null) return;
    const scrollStep = () => {
      if (flatListRef.current) {
        scrollOffsetRef.current = Math.max(0, scrollOffsetRef.current + delta);
        flatListRef.current.scrollToOffset({ offset: scrollOffsetRef.current, animated: false });
        // After scrolling, we should ideally re-calculate the selection based on the new offset,
        // but since the user's finger will likely still be sending move events, the next move event will handle it.
      }
      autoScrollTimerRef.current = requestAnimationFrame(scrollStep);
    };
    autoScrollTimerRef.current = requestAnimationFrame(scrollStep);
  };

  /**
   * PanResponder attached to the container. It dynamically intercepts touches 
   * ONLY if `isDragSelectingRef.current` is true (triggered by a long press).
   */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => false, // Let Pressables handle touch starts
      onMoveShouldSetPanResponderCapture: () => isDragSelectingRef.current,
      onMoveShouldSetPanResponder: () => isDragSelectingRef.current,
      onPanResponderGrant: () => {
        // Do not clear swipedIdsRef here because onDragStart populates it
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { pageX, pageY } = evt.nativeEvent;
        
        // Edge detection for auto-scroll
        const topEdge = containerTopRef.current;
        const bottomEdge = topEdge + containerHeightRef.current;
        
        if (pageY < topEdge + 80) {
          startAutoScroll(-10); // Scroll up faster
        } else if (pageY > bottomEdge - 80) {
          startAutoScroll(10); // Scroll down faster
        } else {
          stopAutoScroll();
        }

        const idx = indexFromPosition(
          pageX, pageY,
          containerLeftRef.current, containerTopRef.current,
          scrollOffsetRef.current
        );
        
        const prods = productsRef.current;
        if (idx === null || idx >= prods.length) return;
        
        const id = prods[idx].id;
        if (!swipedIdsRef.current.has(id)) {
          const isSelected = selectedIdsRef.current.has(id);
          if (swipeActionRef.current === 'add' && !isSelected) {
            swipedIdsRef.current.add(id);
            onSelectRef.current(id);
          } else if (swipeActionRef.current === 'remove' && isSelected) {
            swipedIdsRef.current.add(id);
            onSelectRef.current(id);
          }
        }
      },
      onPanResponderRelease: () => {
        isDragSelectingRef.current = false;
        swipedIdsRef.current = new Set();
        stopAutoScroll();
      },
      onPanResponderTerminate: () => {
        isDragSelectingRef.current = false;
        swipedIdsRef.current = new Set();
        stopAutoScroll();
      },
    })
  ).current;

  return (
    <View
      ref={containerRef}
      style={{ width, flex: 1 }}
      onLayout={() => {
        containerRef.current?.measure((_x, _y, _w, h, pageX, pageY) => {
          containerLeftRef.current = pageX;
          containerTopRef.current = pageY;
          containerHeightRef.current = h;
        });
      }}
      {...panResponder.panHandlers}
    >
      <FlatList
        ref={flatListRef}
        data={products}
        extraData={selectedIds}
        keyExtractor={(item) => item.id}
        renderItem={useCallback(({ item }: any) => (
          <ProductTile
            item={item}
            selected={selectedIds.has(item.id)}
            selectionMode={selectionMode}
            onPress={(p) => {
              if (selectionMode) onSelect(p.id);
              else router.push(`/product/${p.id}`);
            }}
            onLongPress={(p) => {
              // Toggle selection immediately
              onSelect(p.id);
            }}
            onLongPressPriceCategory={onLongPressPriceCategory}
            onDragStart={() => {
              isDragSelectingRef.current = true;
              // If it WAS selected before the long press (thus unselecting it), action is remove. Else add.
              swipeActionRef.current = selectedIds.has(item.id) ? 'remove' : 'add';
              swipedIdsRef.current = new Set([item.id]);
            }}
            onToggleStar={(p, isStarred) => toggleStar(p.id, isStarred)}
          />
        ), [selectedIds, selectionMode, onSelect, toggleStar])}
        numColumns={3}
        contentContainerStyle={styles.gridContent}
        refreshControl={
          // Disable pull-to-refresh in selection mode so it doesn't conflict
          selectionMode ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchProducts(true)} />
          )
        }
        scrollEnabled={true}
        onEndReached={() => hasMore && fetchProducts()}
        onEndReachedThreshold={0.5}
        onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
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

const CategoryPageMemo = React.memo(CategoryPage, (prev, next) => {
  // If active state changed, we must re-render
  if (prev.isActive !== next.isActive) return false;
  
  // If this tab is NOT active, we aggressively skip re-renders. 
  // It will catch up with the latest state as soon as it becomes active again.
  if (!next.isActive) return true;

  // If this tab IS active, do a standard shallow equality check
  return (
    prev.categoryId === next.categoryId &&
    prev.query === next.query &&
    prev.filters === next.filters &&
    prev.selectionMode === next.selectionMode &&
    prev.selectedIds === next.selectedIds &&
    prev.onLongPressPriceCategory === next.onLongPressPriceCategory
  );
});

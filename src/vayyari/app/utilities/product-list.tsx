import React, { useState, useRef } from 'react';
import { View, FlatList, Dimensions, RefreshControl } from 'react-native';
import { Text, IconButton, useTheme, ActivityIndicator, Searchbar, Menu, Button, Portal, Dialog, List } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { ProductCategoryPicker } from '@/components/utility/product/ProductCategoryPicker';
import { ProductTile } from '@/components/utility/product/ProductTile';
import { CATEGORY_REGISTRY } from '@/components/CategoryIcons';

import { useProductCatalog } from '@/hooks/useProductCatalog';
import { styles } from '@/styles/screens/product-list.styles';
import { productService } from '@/services/productService';
import type { VendorProduct } from '@/types/products';

const { width } = Dimensions.get('window');

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
  
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [selectedProductForCategory, setSelectedProductForCategory] = useState<VendorProduct | null>(null);
  const [changingCategory, setChangingCategory] = useState(false);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedIds.size > 0;

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [isReevaluating, setIsReevaluating] = useState(false);
  const handleBulkReevaluate = async () => {
    if (selectedIds.size === 0) return;
    setIsReevaluating(true);
    try {
      await productService.reevaluateProducts(Array.from(selectedIds));
      setSelectedIds(new Set());
      // optionally refresh
    } catch (e) {
      console.error(e);
    } finally {
      setIsReevaluating(false);
    }
  };

  const handleChangeCategory = async (slug: string) => {
    if (!selectedProductForCategory) return;
    setChangingCategory(true);
    try {
      await productService.changeCategory(selectedProductForCategory.id, slug);
      // We rely on the refresh control to update the lists, or we could optimistically update
    } catch (e) {
      console.error(e);
    } finally {
      setChangingCategory(false);
      setSelectedProductForCategory(null);
    }
  };

  const formatDateDisplay = (dateString: string | null) => {
    if (!dateString) return 'Select Date';
    const d = new Date(dateString);
    return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear().toString().slice(-2)}`;
  };

  return (
    <ScreenWrapper 
      title={`Product Catalog${currentCategoryCount !== null ? ` (${currentCategoryCount})` : ''}`} 
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
            <IconButton icon={showFilters ? "filter-variant-remove" : "filter-variant"} onPress={() => setShowFilters(!showFilters)} />
          </View>
        )
      }
      withScrollView={false}
    >
      {showFilters && (
        <View style={{ padding: 10, backgroundColor: theme.colors.surfaceVariant, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
           <Menu
             visible={sortMenuVisible}
             onDismiss={() => setSortMenuVisible(false)}
             anchor={
               <Button mode="outlined" compact onPress={() => setSortMenuVisible(true)}>
                 Sort: {sortBy.replace('_', ' ')}
               </Button>
             }
           >
             <Menu.Item onPress={() => { setSortBy('recent'); setSortMenuVisible(false); }} title="Recent" />
             <Menu.Item onPress={() => { setSortBy('price_low'); setSortMenuVisible(false); }} title="Price: Low to High" />
             <Menu.Item onPress={() => { setSortBy('price_high'); setSortMenuVisible(false); }} title="Price: High to Low" />
           </Menu>

           <Button mode="outlined" compact onPress={() => setShowFromPicker(true)}>
             From: {formatDateDisplay(fromDate)}
           </Button>
           <Button mode="outlined" compact onPress={() => setShowToPicker(true)}>
             To: {formatDateDisplay(toDate)}
           </Button>

           {(fromDate || toDate) && (
             <IconButton icon="close-circle" size={20} onPress={() => { setFromDate(null); setToDate(null); }} />
           )}

           {showFromPicker && (
             <DateTimePicker
               value={fromDate ? new Date(fromDate) : new Date()}
               mode="date"
               onChange={(event, date) => {
                 setShowFromPicker(false);
                 if (date) setFromDate(date.toISOString().split('T')[0]);
               }}
             />
           )}

           {showToPicker && (
             <DateTimePicker
               value={toDate ? new Date(toDate) : new Date()}
               mode="date"
               onChange={(event, date) => {
                 setShowToPicker(false);
                 if (date) setToDate(date.toISOString().split('T')[0]);
               }}
             />
           )}
        </View>
      )}

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
      </Portal>

      <View style={styles.tabContainer}>
        <ProductCategoryPicker 
          showAll
          categories={CATEGORIES}
          selectedCategory={CATEGORIES[activeTab].id as any}
          onSelect={(catId) => {
            const index = CATEGORIES.findIndex(c => c.id.toLowerCase() === catId.toLowerCase());
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
        renderItem={({ item, index }) => (
          <CategoryPage 
            categoryId={item.id}
            query={searchQuery}
            sortBy={sortBy}
            startDate={fromDate || undefined}
            endDate={toDate || undefined}
            onCountChange={(count) => {
              setCategoryCounts(prev => {
                if (prev[item.id] === count) return prev;
                return { ...prev, [item.id]: count };
              });
            }}
            selectedIds={selectedIds}
            onSelect={toggleSelection}
            selectionMode={selectionMode}
          />
        )}
      />

      {selectionMode && (
        <View style={{
          position: 'absolute', bottom: 20, left: 20, right: 20, 
          backgroundColor: theme.colors.elevation.level3, 
          padding: 16, borderRadius: 12, elevation: 4,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <Text style={{ fontWeight: 'bold' }}>{selectedIds.size} Selected</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button mode="text" onPress={() => setSelectedIds(new Set())}>Cancel</Button>
            <Button mode="contained" loading={isReevaluating} onPress={handleBulkReevaluate}>
              Re-evaluate AI
            </Button>
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}

function CategoryPage({ 
  categoryId,
  query,
  sortBy,
  startDate,
  endDate,
  onCountChange,
  onChangeCategoryRequested,
  selectedIds,
  onSelect,
  selectionMode
}: { 
  categoryId: string;
  query?: string;
  sortBy?: string;
  startDate?: string;
  endDate?: string;
  onCountChange?: (count: number) => void;
  onChangeCategoryRequested?: (productId: string) => void;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  selectionMode: boolean;
}) {
  const router = useRouter();
  const { 
    products, 
    loading, 
    refreshing, 
    hasMore, 
    error, 
    totalCount,
    fetchProducts 
  } = useProductCatalog(categoryId, query, sortBy, startDate, endDate);

  React.useEffect(() => {
    if (onCountChange) {
      onCountChange(totalCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCount]);

  return (
    <View style={{ width: width }}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductTile 
            item={item} 
            selected={selectedIds.has(item.id)}
            onPress={(p) => {
              if (selectionMode) {
                onSelect(p.id);
              } else {
                router.push(`/product/${p.id}`);
              }
            }} 
            onLongPress={(p) => onSelect(p.id)}
          />
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

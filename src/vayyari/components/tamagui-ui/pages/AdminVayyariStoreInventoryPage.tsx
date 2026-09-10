import React, { useState, useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuStore,
  LuSearch,
  LuPlus,
  LuClock,
  LuSlidersHorizontal,
  LuRotateCcw,
  LuChevronDown,
  LuChevronUp,
  LuExternalLink,
  LuPencil,
} from '../icons/lu';
import { useTheme } from '@/theme';
import {
  VayyariStarredProductItem,
  CATEGORIES,
  FABRIC_OPTIONS,
  PRICE_OPTIONS,
  SORT_OPTIONS,
  StoreSortOption,
  PriceRangeOption,
} from './AdminVayyariStorePublishPage';

export type StoreLifecycleFilter = 'all' | 'available' | 'few_left' | 'sold_out' | 'out_of_stock';

export const LIFECYCLE_FILTERS: { id: StoreLifecycleFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All Status', icon: '⚪' },
  { id: 'available', label: 'In Stock', icon: '🟢' },
  { id: 'few_left', label: 'Few Left', icon: '🟡' },
  { id: 'sold_out', label: 'Sold Out', icon: '🔴' },
  { id: 'out_of_stock', label: 'Out of Stock', icon: '⚫' },
];

export interface AdminVayyariStoreInventoryPageProps {
  products?: VayyariStarredProductItem[];
  loading?: boolean;
  refreshing?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onBack?: () => void;
  onNavigateToStorePublish?: () => void;
  onNavigateToStoreCuration?: (productId: string) => void;
  onOpenPdp?: (productId: string) => void;
  onResyncProduct?: (productId: string) => void;
  disableSafeArea?: boolean;
}

export function AdminVayyariStoreInventoryPage({
  products = [],
  loading = false,
  refreshing = false,
  isLoadingMore = false,
  hasMore = false,
  onRefresh,
  onLoadMore,
  onBack,
  onNavigateToStorePublish,
  onNavigateToStoreCuration,
  onOpenPdp,
  onResyncProduct,
  disableSafeArea = false,
}: AdminVayyariStoreInventoryPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFabric, setSelectedFabric] = useState('All');
  const [selectedPriceRange, setSelectedPriceRange] = useState<PriceRangeOption>('all');
  const [selectedLifecycle, setSelectedLifecycle] = useState<StoreLifecycleFilter>('all');
  const [selectedSort, setSelectedSort] = useState<StoreSortOption>('newest');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [resyncToast, setResyncToast] = useState<string | null>(null);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'All') count++;
    if (selectedFabric !== 'All') count++;
    if (selectedPriceRange !== 'all') count++;
    if (selectedLifecycle !== 'all') count++;
    if (selectedSort !== 'newest') count++;
    return count;
  }, [selectedCategory, selectedFabric, selectedPriceRange, selectedLifecycle, selectedSort]);

  const resetFilters = () => {
    setSelectedCategory('All');
    setSelectedFabric('All');
    setSelectedPriceRange('all');
    setSelectedLifecycle('all');
    setSelectedSort('newest');
    setSearchQuery('');
  };

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchFabric = selectedFabric === 'All' || p.fabric.toLowerCase().includes(selectedFabric.toLowerCase());
      
      let matchPrice = true;
      const price = p.price || 8000;
      if (selectedPriceRange === 'under_5k') matchPrice = price < 5000;
      else if (selectedPriceRange === '5k_10k') matchPrice = price >= 5000 && price <= 10000;
      else if (selectedPriceRange === '10k_20k') matchPrice = price > 10000 && price <= 20000;
      else if (selectedPriceRange === 'above_20k') matchPrice = price > 20000;

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.productCode.toLowerCase().includes(q) ||
        p.fabric.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);

      return matchCat && matchFabric && matchPrice && matchQuery;
    });

    if (selectedSort === 'price_low') {
      list = [...list].sort((a, b) => (a.price || 8000) - (b.price || 8000));
    } else if (selectedSort === 'price_high') {
      list = [...list].sort((a, b) => (b.price || 8000) - (a.price || 8000));
    } else if (selectedSort === 'media_count') {
      list = [...list].sort((a, b) => b.mediaCount - a.mediaCount);
    }

    return list;
  }, [products, selectedCategory, selectedFabric, selectedPriceRange, selectedLifecycle, selectedSort, searchQuery]);

  const handleResync = (productId: string, code: string) => {
    onResyncProduct?.(productId);
    setResyncToast(`🔄 Triggered OG media re-sync for ${code}`);
    setTimeout(() => setResyncToast(null), 2500);
  };

  const renderItem = ({ item: product }: { item: VayyariStarredProductItem }) => {
    return (
      <View style={styles.gridTile}>
        <Pressable
          onPress={() => (onNavigateToStoreCuration ? onNavigateToStoreCuration(product.id) : onOpenPdp?.(product.id))}
          style={{ flex: 1 }}
        >
          <Image
            source={{ uri: product.primaryImageUri }}
            style={styles.tileImage}
            contentFit="cover"
            transition={150}
          />

          {/* Active Live Badge (Top-Left) */}
          <View style={styles.liveBadge}>
            <Text fontSize={9} fontWeight="800" color="#fff">
              🟢 In Store
            </Text>
          </View>

          {/* Edit Curation Action Button (Top-Right) */}
          <Pressable
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              onNavigateToStoreCuration?.(product.id);
            }}
            style={styles.curateActionBadge}
          >
            <LuPencil size={11} color="#fff" />
          </Pressable>

          {/* Bottom Overlay Info */}
          <View style={styles.bottomOverlay}>
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={10} fontWeight="900" color="#fff" numberOfLines={1}>
                {product.productCode}
              </Text>
              <Text fontSize={9} fontWeight="700" color="rgba(255,255,255,0.9)">
                ₹{(product.price || 8000).toLocaleString('en-IN')}
              </Text>
            </XStack>
            <Text fontSize={9} color="rgba(255,255,255,0.85)" numberOfLines={1}>
              📸 {product.mediaCount} · {product.category}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <YStack
      flex={1}
      width="100%"
      maxWidth={480}
      alignSelf="center"
      backgroundColor={tokens.background}
      position="relative"
      overflow="hidden"
    >
      {/* ── TOP NAV HEADER ── */}
      <XStack
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        paddingHorizontal={12}
        paddingTop={topInset + 8}
        paddingBottom={10}
        alignItems="center"
        justifyContent="space-between"
      >
        <XStack alignItems="center" gap={8}>
          {onBack && (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent' },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <LuArrowLeft size={20} color={tokens.text} />
            </Pressable>
          )}
          <YStack>
            <XStack alignItems="center" gap={5}>
              <LuStore size={15} color={tokens.accent} />
              <Text fontSize={15} fontWeight="800" color={tokens.text}>
                In-Store Inventory
              </Text>
            </XStack>
            <Text fontSize={11} color={tokens.textMuted}>
              {filteredProducts.length} Synced Products Active
            </Text>
          </YStack>
        </XStack>

        {onNavigateToStorePublish && (
          <Pressable
            onPress={onNavigateToStorePublish}
            style={({ pressed }) => [
              styles.navPublishBtn,
              { backgroundColor: pressed ? tokens.accentSubtle : tokens.surfaceRaised },
            ]}
          >
            <XStack alignItems="center" gap={4}>
              <LuPlus size={12} color={tokens.accent} />
              <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                Publish More
              </Text>
            </XStack>
          </Pressable>
        )}
      </XStack>

      {/* ── TOAST NOTIFICATION ── */}
      {resyncToast && (
        <View style={[styles.toastBanner, { backgroundColor: tokens.accent }]}>
          <Text fontSize={12} fontWeight="800" color={tokens.accentForeground} textAlign="center">
            {resyncToast}
          </Text>
        </View>
      )}

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <YStack backgroundColor={tokens.surface} paddingHorizontal={12} paddingVertical={8} gap={8} borderBottomWidth={1} borderBottomColor={tokens.border}>
        <XStack alignItems="center" gap={8}>
          <XStack
            flex={1}
            alignItems="center"
            gap={6}
            backgroundColor="rgba(0,0,0,0.03)"
            borderRadius={8}
            paddingHorizontal={10}
            paddingVertical={6}
            borderWidth={1}
            borderColor={tokens.border}
          >
            <LuSearch size={14} color={tokens.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search in-store items (Code, Title, Fabric)..."
              placeholderTextColor={tokens.textMuted}
              style={styles.searchInput}
            />
          </XStack>

          {/* Toggle Advanced Filters Button */}
          <Pressable
            onPress={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
            style={[
              styles.filterToggleBtn,
              {
                backgroundColor: activeFilterCount > 0 ? tokens.accent : 'rgba(0,0,0,0.04)',
                borderColor: activeFilterCount > 0 ? tokens.accent : tokens.border,
              },
            ]}
          >
            <XStack alignItems="center" gap={4}>
              <LuSlidersHorizontal size={13} color={activeFilterCount > 0 ? tokens.accentForeground : tokens.text} />
              {activeFilterCount > 0 && (
                <Text fontSize={11} fontWeight="800" color={tokens.accentForeground}>
                  {activeFilterCount}
                </Text>
              )}
              {isFilterDrawerOpen ? (
                <LuChevronUp size={12} color={activeFilterCount > 0 ? tokens.accentForeground : tokens.textSecondary} />
              ) : (
                <LuChevronDown size={12} color={activeFilterCount > 0 ? tokens.accentForeground : tokens.textSecondary} />
              )}
            </XStack>
          </Pressable>

          {activeFilterCount > 0 && (
            <Pressable onPress={resetFilters} hitSlop={6} style={styles.resetBtn}>
              <LuRotateCcw size={12} color={tokens.textMuted} />
            </Pressable>
          )}
        </XStack>

        {/* Category Horizontal Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected ? tokens.accent : 'rgba(0,0,0,0.03)',
                    borderColor: isSelected ? tokens.accent : tokens.border,
                  },
                ]}
              >
                <Text fontSize={11} fontWeight={isSelected ? '800' : '600'} color={isSelected ? tokens.accentForeground : tokens.text}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── EXPANDABLE ADVANCED FILTERS ── */}
        {isFilterDrawerOpen && (
          <YStack gap={8} paddingTop={6} borderTopWidth={1} borderTopColor={tokens.border}>
            {/* Lifecycle Status Row */}
            <YStack gap={4}>
              <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
                Lifecycle Availability
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
                {LIFECYCLE_FILTERS.map((item) => {
                  const isSelected = selectedLifecycle === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedLifecycle(item.id)}
                      style={[
                        styles.chipPill,
                        {
                          backgroundColor: isSelected ? tokens.accentSubtle : 'transparent',
                          borderColor: isSelected ? tokens.accent : tokens.border,
                        },
                      ]}
                    >
                      <Text fontSize={10} fontWeight={isSelected ? '800' : '600'} color={isSelected ? tokens.accent : tokens.textSecondary}>
                        {item.icon} {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </YStack>

            {/* Fabric Row */}
            <YStack gap={4}>
              <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
                Fabric
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
                {FABRIC_OPTIONS.map((fab) => {
                  const isSelected = selectedFabric === fab;
                  return (
                    <Pressable
                      key={fab}
                      onPress={() => setSelectedFabric(fab)}
                      style={[
                        styles.chipPill,
                        {
                          backgroundColor: isSelected ? tokens.accentSubtle : 'transparent',
                          borderColor: isSelected ? tokens.accent : tokens.border,
                        },
                      ]}
                    >
                      <Text fontSize={10} fontWeight={isSelected ? '800' : '600'} color={isSelected ? tokens.accent : tokens.textSecondary}>
                        {fab}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </YStack>

            {/* Price Range Row */}
            <YStack gap={4}>
              <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
                Price Range
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
                {PRICE_OPTIONS.map((p) => {
                  const isSelected = selectedPriceRange === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setSelectedPriceRange(p.id)}
                      style={[
                        styles.chipPill,
                        {
                          backgroundColor: isSelected ? tokens.accentSubtle : 'transparent',
                          borderColor: isSelected ? tokens.accent : tokens.border,
                        },
                      ]}
                    >
                      <Text fontSize={10} fontWeight={isSelected ? '800' : '600'} color={isSelected ? tokens.accent : tokens.textSecondary}>
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </YStack>

            {/* Sort Row */}
            <YStack gap={4}>
              <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase">
                Sort By
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
                {SORT_OPTIONS.map((s) => {
                  const isSelected = selectedSort === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setSelectedSort(s.id)}
                      style={[
                        styles.chipPill,
                        {
                          backgroundColor: isSelected ? tokens.accentSubtle : 'transparent',
                          borderColor: isSelected ? tokens.accent : tokens.border,
                        },
                      ]}
                    >
                      <Text fontSize={10} fontWeight={isSelected ? '800' : '600'} color={isSelected ? tokens.accent : tokens.textSecondary}>
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </YStack>
          </YStack>
        )}
      </YStack>

      {/* ── 3-COLUMN TILE GRID WITH INFINITE SCROLL ── */}
      {loading ? (
        <YStack alignItems="center" justifyContent="center" flex={1} gap={12}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text fontSize={13} color={tokens.textMuted} fontWeight="600">
            Loading In-Store Inventory...
          </Text>
        </YStack>
      ) : filteredProducts.length === 0 ? (
        <YStack alignItems="center" justifyContent="center" flex={1} gap={10} paddingHorizontal={20}>
          <LuStore size={40} color={tokens.textMuted} />
          <Text fontSize={14} fontWeight="800" color={tokens.text}>
            No Products in Store
          </Text>
          <Text fontSize={12} color={tokens.textMuted} textAlign="center" maxWidth={280}>
            {activeFilterCount > 0
              ? 'No in-store products matched your active filters. Try resetting filters.'
              : 'Publish starred products from the catalog to populate your online storefront.'}
          </Text>
          {activeFilterCount > 0 ? (
            <Pressable onPress={resetFilters} style={styles.resetPillBtn}>
              <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                Reset Filters
              </Text>
            </Pressable>
          ) : onNavigateToStorePublish ? (
            <Pressable onPress={onNavigateToStorePublish} style={styles.resetPillBtn}>
              <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                🚀 Publish Products to Store
              </Text>
            </Pressable>
          ) : null}
        </YStack>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderItem}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={{ padding: 6, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={tokens.accent}
                colors={[tokens.accent]}
              />
            ) : undefined
          }
          ListFooterComponent={
            isLoadingMore ? (
              <YStack alignItems="center" paddingVertical={16} gap={6}>
                <ActivityIndicator size="small" color={tokens.accent} />
                <Text fontSize={10} color={tokens.textMuted}>
                  Loading more in-store weaves...
                </Text>
              </YStack>
            ) : hasMore ? (
              <YStack alignItems="center" paddingVertical={12}>
                <Pressable onPress={onLoadMore} style={styles.loadMoreBtn}>
                  <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                    Load More ▾
                  </Text>
                </Pressable>
              </YStack>
            ) : null
          }
        />
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPublishBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toastBanner: {
    marginHorizontal: 12,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 2,
  },
  filterToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtn: {
    padding: 6,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  resetPillBtn: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  columnWrapper: {
    gap: 6,
    marginBottom: 6,
  },
  gridTile: {
    flex: 1 / 3,
    aspectRatio: 3 / 4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#eee',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  liveBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    zIndex: 2,
  },
  curateActionBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    zIndex: 2,
  },
  loadMoreBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
});

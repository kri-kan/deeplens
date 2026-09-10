import React, { useState, useMemo } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
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
  LuCheck,
  LuSparkles,
  LuStar,
  LuExternalLink,
  LuSlidersHorizontal,
  LuRotateCcw,
  LuChevronDown,
  LuChevronUp,
} from '../icons/lu';
import { useTheme } from '@/theme';

export interface VayyariStarredProductItem {
  id: string;
  productCode: string;
  title: string;
  category: string;
  fabric: string;
  price?: number;
  color?: string;
  mediaCount: number;
  primaryImageUri: string;
  allMediaUris?: string[];
  descriptions: string[];
  isStarred: boolean;
  isPublishedToStore?: boolean;
  publishedAt?: string;
}

export type StoreSortOption = 'newest' | 'price_low' | 'price_high' | 'media_count';
export type PriceRangeOption = 'all' | 'under_5k' | '5k_10k' | '10k_20k' | 'above_20k';

export interface AdminVayyariStorePublishPageProps {
  products?: VayyariStarredProductItem[];
  publishedCount?: number;
  loading?: boolean;
  refreshing?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onBack?: () => void;
  onPublishBatch?: (selectedIds: string[]) => void;
  onNavigateToStoreInventory?: () => void;
  onOpenPdp?: (productId: string) => void;
  disableSafeArea?: boolean;
}

export const CATEGORIES = ['All', 'Saree', 'Dress Material', 'Kurti / Set', 'Lehenga', 'Gown', 'Western', 'Kids'];
export const FABRIC_OPTIONS = ['All', 'Pure Silk', 'Kanjivaram', 'Banarasi', 'Georgette', 'Chiffon', 'Cotton', 'Linen', 'Organza', 'Tussar'];
export const PRICE_OPTIONS: { id: PriceRangeOption; label: string }[] = [
  { id: 'all', label: 'All Prices' },
  { id: 'under_5k', label: '< ₹5,000' },
  { id: '5k_10k', label: '₹5K - ₹10K' },
  { id: '10k_20k', label: '₹10K - ₹20K' },
  { id: 'above_20k', label: '> ₹20,000' },
];
export const SORT_OPTIONS: { id: StoreSortOption; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'price_low', label: 'Price: Low ➔ High' },
  { id: 'price_high', label: 'Price: High ➔ Low' },
  { id: 'media_count', label: 'Most Images' },
];

export function AdminVayyariStorePublishPage({
  products = [],
  publishedCount = 0,
  loading = false,
  refreshing = false,
  isLoadingMore = false,
  hasMore = false,
  onRefresh,
  onLoadMore,
  onBack,
  onPublishBatch,
  onNavigateToStoreInventory,
  onOpenPdp,
  disableSafeArea = false,
}: AdminVayyariStorePublishPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFabric, setSelectedFabric] = useState('All');
  const [selectedPriceRange, setSelectedPriceRange] = useState<PriceRangeOption>('all');
  const [selectedSort, setSelectedSort] = useState<StoreSortOption>('newest');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccessToast, setPublishSuccessToast] = useState<string | null>(null);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'All') count++;
    if (selectedFabric !== 'All') count++;
    if (selectedPriceRange !== 'all') count++;
    if (selectedSort !== 'newest') count++;
    return count;
  }, [selectedCategory, selectedFabric, selectedPriceRange, selectedSort]);

  const resetFilters = () => {
    setSelectedCategory('All');
    setSelectedFabric('All');
    setSelectedPriceRange('all');
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
  }, [products, selectedCategory, selectedFabric, selectedPriceRange, selectedSort, searchQuery]);

  const toggleSelectProduct = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  const handleTriggerPublish = () => {
    if (selectedIds.length === 0) return;
    setIsPublishing(true);
    setTimeout(() => {
      onPublishBatch?.(selectedIds);
      setIsPublishing(false);
      setPublishSuccessToast(`🚀 Successfully published ${selectedIds.length} products to Store!`);
      setSelectedIds([]);
      setTimeout(() => setPublishSuccessToast(null), 3000);
    }, 1200);
  };

  const renderItem = ({ item: product }: { item: VayyariStarredProductItem }) => {
    const isSelected = selectedIds.includes(product.id);
    return (
      <Pressable
        key={product.id}
        onPress={() => (onOpenPdp ? onOpenPdp(product.id) : toggleSelectProduct(product.id))}
        onLongPress={() => toggleSelectProduct(product.id)}
        style={[
          styles.gridTile,
          {
            borderColor: isSelected ? tokens.accent : tokens.border,
            borderWidth: isSelected ? 2.5 : 1,
          },
        ]}
      >
        <Image
          source={{ uri: product.primaryImageUri }}
          style={styles.tileImage}
          contentFit="cover"
          transition={150}
        />

        {/* Selection Checkbox (Top-Left) */}
        <Pressable
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            toggleSelectProduct(product.id);
          }}
          style={[
            styles.checkboxBadge,
            {
              backgroundColor: isSelected ? tokens.accent : 'rgba(0,0,0,0.55)',
              borderColor: isSelected ? tokens.accent : '#fff',
            },
          ]}
        >
          {isSelected && <LuCheck size={12} color={tokens.accentForeground} />}
        </Pressable>

        {/* Star Badge (Top-Right) */}
        <View style={styles.starBadge}>
          <LuStar size={11} color="#F59E0B" />
        </View>

        {/* Bottom Overlay Info - Click to Open PDP */}
        <View style={styles.bottomOverlay}>
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={10} fontWeight="900" color="#fff" numberOfLines={1}>
              {product.productCode}
            </Text>
            <LuExternalLink size={10} color="rgba(255,255,255,0.75)" />
          </XStack>
          <Text fontSize={9} color="rgba(255,255,255,0.85)" numberOfLines={1}>
            📸 {product.mediaCount} · {product.category}
          </Text>
        </View>
      </Pressable>
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
                Publish to Store
              </Text>
            </XStack>
            <Text fontSize={11} color={tokens.textMuted}>
              {filteredProducts.length} Starred Products Available
            </Text>
          </YStack>
        </XStack>

        {onNavigateToStoreInventory && (
          <Pressable
            onPress={onNavigateToStoreInventory}
            style={({ pressed }) => [
              styles.navInventoryBtn,
              { backgroundColor: pressed ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)' },
            ]}
          >
            <XStack alignItems="center" gap={4}>
              <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                🏪 In Store ({publishedCount}) ➔
              </Text>
            </XStack>
          </Pressable>
        )}
      </XStack>

      {/* ── SUCCESS TOAST ── */}
      {publishSuccessToast && (
        <View style={[styles.toastBanner, { backgroundColor: '#10B981' }]}>
          <Text fontSize={12} fontWeight="800" color="#fff" textAlign="center">
            {publishSuccessToast}
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
              placeholder="Search starred catalog (Code, Title, Fabric)..."
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

      {/* ── SELECTION TOOLBAR ── */}
      <XStack
        paddingHorizontal={12}
        paddingVertical={6}
        justifyContent="space-between"
        alignItems="center"
        backgroundColor={tokens.background}
      >
        <Pressable onPress={selectAll} hitSlop={6}>
          <Text fontSize={11} fontWeight="800" color={tokens.accent}>
            {selectedIds.length === filteredProducts.length && filteredProducts.length > 0
              ? 'Deselect All'
              : `Select All (${filteredProducts.length})`}
          </Text>
        </Pressable>

        <Text fontSize={11} color={tokens.textMuted}>
          {selectedIds.length} Selected
        </Text>
      </XStack>

      {/* ── 3-COLUMN TILE GRID WITH INFINITE SCROLL ── */}
      {loading ? (
        <YStack alignItems="center" justifyContent="center" flex={1} gap={12}>
          <ActivityIndicator size="large" color={tokens.accent} />
          <Text fontSize={13} color={tokens.textMuted} fontWeight="600">
            Loading Starred Catalog...
          </Text>
        </YStack>
      ) : filteredProducts.length === 0 ? (
        <YStack alignItems="center" justifyContent="center" flex={1} gap={10} paddingHorizontal={20}>
          <LuStore size={40} color={tokens.textMuted} />
          <Text fontSize={14} fontWeight="800" color={tokens.text}>
            No Starred Products Found
          </Text>
          <Text fontSize={12} color={tokens.textMuted} textAlign="center" maxWidth={280}>
            {activeFilterCount > 0
              ? 'No products matched your active filters. Try resetting filters.'
              : 'Star products in the Vayyari Catalog to make them eligible for Store publishing.'}
          </Text>
          {activeFilterCount > 0 && (
            <Pressable onPress={resetFilters} style={styles.resetPillBtn}>
              <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                Reset Filters
              </Text>
            </Pressable>
          )}
        </YStack>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderItem}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={{ padding: 6, paddingBottom: 130 }}
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
                  Loading more starred weaves...
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

      {/* ── STICKY BOTTOM PUBLISH CTA ── */}
      {selectedIds.length > 0 && (
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          backgroundColor={tokens.surface}
          borderTopWidth={1}
          borderTopColor={tokens.border}
          paddingHorizontal={14}
          paddingTop={10}
          paddingBottom={bottomInset + 12}
        >
          <Pressable
            onPress={handleTriggerPublish}
            disabled={isPublishing}
            style={({ pressed }) => [
              styles.publishBtn,
              { backgroundColor: tokens.accent, opacity: pressed || isPublishing ? 0.9 : 1 },
            ]}
          >
            <XStack alignItems="center" justifyContent="center" gap={8}>
              <LuSparkles size={16} color={tokens.accentForeground} />
              <Text fontSize={14} fontWeight="800" color={tokens.accentForeground}>
                {isPublishing ? 'Publishing to Store...' : `Publish ${selectedIds.length} Products to Store`}
              </Text>
            </XStack>
          </Pressable>
        </YStack>
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
  navInventoryBtn: {
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
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  checkboxBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  starBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  publishBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

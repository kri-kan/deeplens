import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  BackHandler,
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
  LuSparkles,
  LuPalette,
  LuLayers,
  LuX,
  LuCheck,
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
import {
  StoreInventoryFilterDrawer,
  StoreInventoryFilterState,
  DEFAULT_STORE_INVENTORY_FILTER_STATE,
  getActiveStoreInventoryFilterCount,
} from '../molecules/StoreInventoryFilterDrawer';
import { isFuzzyMatch } from '@/utils/fuzzySearch';

export type StoreLifecycleFilter = 'all' | 'available' | 'few_left' | 'sold_out' | 'out_of_stock';

export const LIFECYCLE_FILTERS: { id: StoreLifecycleFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All Status', icon: '⚪' },
  { id: 'available', label: 'In Stock', icon: '🟢' },
  { id: 'few_left', label: 'Few Left', icon: '🟡' },
  { id: 'sold_out', label: 'Sold Out', icon: '🔴' },
  { id: 'out_of_stock', label: 'Out of Stock', icon: '⚫' },
];

export interface StoreInventoryProductItem extends VayyariStarredProductItem {
  isReviewPending?: boolean;
  reviewReason?: string;
}

export interface AdminVayyariStoreInventoryPageProps {
  products?: StoreInventoryProductItem[];
  reviewCount?: number;
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
  onDismissReview?: (productId: string) => Promise<void>;
  onNavigateToReviewQueue?: () => void;
  isReviewQueueMode?: boolean;
  disableSafeArea?: boolean;
}

export function AdminVayyariStoreInventoryPage({
  products = [],
  reviewCount = 0,
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
  onDismissReview,
  onNavigateToReviewQueue,
  isReviewQueueMode = false,
  disableSafeArea = false,
}: AdminVayyariStoreInventoryPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<StoreInventoryFilterState>(DEFAULT_STORE_INVENTORY_FILTER_STATE);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [resyncToast, setResyncToast] = useState<string | null>(null);
  const [showNeedsReviewOnly, setShowNeedsReviewOnly] = useState(isReviewQueueMode);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  useEffect(() => {
    if (isReviewQueueMode) {
      setShowNeedsReviewOnly(true);
    }
  }, [isReviewQueueMode]);

  // Hardware BackHandler for in-place review filter dismissal before route popping
  useEffect(() => {
    if (!showNeedsReviewOnly || isReviewQueueMode) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setShowNeedsReviewOnly(false);
      return true;
    });
    return () => subscription.remove();
  }, [showNeedsReviewOnly, isReviewQueueMode]);

  const activeFilterCount = useMemo(() => {
    return getActiveStoreInventoryFilterCount(filters);
  }, [filters]);

  const activeFilterChips = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = [];
    if (filters.lifecycle !== 'all') {
      const match = LIFECYCLE_FILTERS.find((l) => l.id === filters.lifecycle);
      chips.push({
        id: 'lifecycle',
        label: `${match?.icon || ''} ${match?.label || filters.lifecycle}`,
        onRemove: () => setFilters((f) => ({ ...f, lifecycle: 'all' })),
      });
    }
    if (filters.fabric !== 'All') {
      chips.push({
        id: 'fabric',
        label: `Fabric: ${filters.fabric}`,
        onRemove: () => setFilters((f) => ({ ...f, fabric: 'All' })),
      });
    }
    if (filters.priceRange !== 'all') {
      const match = PRICE_OPTIONS.find((p) => p.id === filters.priceRange);
      chips.push({
        id: 'price',
        label: match?.label || filters.priceRange,
        onRemove: () => setFilters((f) => ({ ...f, priceRange: 'all' })),
      });
    }
    if (filters.sortBy !== 'newest') {
      const match = SORT_OPTIONS.find((s) => s.id === filters.sortBy);
      chips.push({
        id: 'sort',
        label: match?.label || filters.sortBy,
        onRemove: () => setFilters((f) => ({ ...f, sortBy: 'newest' })),
      });
    }
    if (filters.skuType && filters.skuType !== 'all') {
      chips.push({
        id: 'skuType',
        label: filters.skuType === 'multi' ? 'Multi-SKU (2+)' : 'Single SKU',
        onRemove: () => setFilters((f) => ({ ...f, skuType: 'all' })),
      });
    }
    return chips;
  }, [filters]);

  const resetFilters = () => {
    setFilters({ ...DEFAULT_STORE_INVENTORY_FILTER_STATE });
    setSearchQuery('');
    setShowNeedsReviewOnly(false);
  };

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      if (showNeedsReviewOnly && !p.isReviewPending) {
        return false;
      }

      const matchCat =
        filters.category === 'All' ||
        p.category.toLowerCase().includes(filters.category.toLowerCase());
      const matchFabric =
        filters.fabric === 'All' ||
        p.fabric.toLowerCase().includes(filters.fabric.toLowerCase());

      let matchPrice = true;
      const price = p.price || 8000;
      if (filters.priceRange === 'under_5k') matchPrice = price < 5000;
      else if (filters.priceRange === '5k_10k') matchPrice = price >= 5000 && price <= 10000;
      else if (filters.priceRange === '10k_20k') matchPrice = price > 10000 && price <= 20000;
      else if (filters.priceRange === 'above_20k') matchPrice = price > 20000;

      let matchSku = true;
      const swatchesCount = p.swatchesCount || p.siblingSwatches?.length || 1;
      if (filters.skuType === 'multi') matchSku = swatchesCount > 1;
      else if (filters.skuType === 'single') matchSku = swatchesCount <= 1;

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        isFuzzyMatch(p.title, q, 0.45) ||
        isFuzzyMatch(p.productCode, q, 0.45) ||
        isFuzzyMatch(p.fabric, q, 0.45) ||
        isFuzzyMatch(p.category, q, 0.45);

      return matchCat && matchFabric && matchPrice && matchSku && matchQuery;
    });

    if (filters.sortBy === 'price_low') {
      list = [...list].sort((a, b) => (a.price || 8000) - (b.price || 8000));
    } else if (filters.sortBy === 'price_high') {
      list = [...list].sort((a, b) => (b.price || 8000) - (a.price || 8000));
    } else if (filters.sortBy === 'media_count') {
      list = [...list].sort((a, b) => b.mediaCount - a.mediaCount);
    }

    return list;
  }, [products, filters, searchQuery, showNeedsReviewOnly]);

  const handleResync = (productId: string, code: string) => {
    onResyncProduct?.(productId);
    setResyncToast(`🔄 Triggered OG media re-sync for ${code}`);
    setTimeout(() => setResyncToast(null), 2500);
  };

  const renderItem = ({ item: product }: { item: StoreInventoryProductItem }) => {
    const swatchesCount = product.swatchesCount || product.siblingSwatches?.length || 1;
    const siblingSwatches = product.siblingSwatches || [];

    return (
      <View style={styles.gridCard}>
        <Pressable
          onPress={() => (onNavigateToStoreCuration ? onNavigateToStoreCuration(product.id) : onOpenPdp?.(product.id))}
          style={{ flex: 1 }}
        >
          {/* Product Image Tile */}
          <View style={styles.cardImageContainer}>
            <Image
              source={{ uri: product.primaryImageUri }}
              style={styles.cardImage}
              contentFit="cover"
              transition={150}
            />

            {/* Active Live Badge (Top-Left) */}
            <View style={[styles.liveBadge, product.isReviewPending && { backgroundColor: '#B45309' }]}>
              <Text fontSize={9} fontWeight="800" color="#fff">
                {product.isReviewPending ? '⚡ Needs Review' : '🟢 In Store'}
              </Text>
            </View>

            {/* Top-Right Badges: Image Count & SKU Count below it */}
            <YStack style={styles.topRightBadgeContainer}>
              <View style={styles.topRightBadge}>
                <Text fontSize={9} fontWeight="700" color="#fff">
                  📸 {product.mediaCount}
                </Text>
              </View>

              <View style={styles.topRightBadge}>
                <XStack alignItems="center" gap={3}>
                  <LuLayers size={10} color="#fff" />
                  <Text fontSize={9} fontWeight="800" color="#fff">
                    {swatchesCount} {swatchesCount === 1 ? 'SKU' : 'SKUs'}
                  </Text>
                </XStack>
              </View>
            </YStack>
          </View>

          {/* Card Details & Action */}
          <YStack padding={8} gap={6} backgroundColor={tokens.surface}>
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={11} fontWeight="900" color={tokens.text} numberOfLines={1}>
                {product.productCode}
              </Text>
              <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                ₹{(product.price || 8000).toLocaleString('en-IN')}
              </Text>
            </XStack>

            {/* Action Buttons: Curate & Group / Mark Reviewed */}
            <XStack alignItems="center" gap={4} marginTop={2}>
              <Pressable
                hitSlop={4}
                onPress={(e) => {
                  e.stopPropagation();
                  onNavigateToStoreCuration?.(product.id);
                }}
                style={({ pressed }) => [
                  styles.curateActionBtn,
                  {
                    flex: 1,
                    backgroundColor: pressed ? tokens.accentSubtle : tokens.surfaceRaised,
                    borderColor: `${tokens.accent}60`,
                    borderWidth: 1,
                  },
                ]}
              >
                <XStack alignItems="center" justifyContent="center" gap={4}>
                  <LuSparkles size={11} color={tokens.accent} />
                  <Text fontSize={10} fontWeight="800" color={tokens.accent} numberOfLines={1}>
                    {product.isReviewPending ? 'Curate' : 'Curate in Store ➔'}
                  </Text>
                </XStack>
              </Pressable>

              {product.isReviewPending && onDismissReview && (
                <Pressable
                  hitSlop={4}
                  onPress={async (e) => {
                    e.stopPropagation();
                    setDismissingId(product.id);
                    try {
                      await onDismissReview(product.id);
                    } finally {
                      setDismissingId(null);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.curateActionBtn,
                    {
                      flex: 1,
                      backgroundColor: pressed ? '#FEF3C7' : '#FFFBEB',
                      borderColor: '#F59E0B',
                      borderWidth: 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Mark Reviewed"
                >
                  <XStack alignItems="center" justifyContent="center" gap={3}>
                    {dismissingId === product.id ? (
                      <ActivityIndicator size="small" color="#B45309" />
                    ) : (
                      <>
                        <LuCheck size={11} color="#B45309" />
                        <Text fontSize={10} fontWeight="800" color="#B45309" numberOfLines={1}>
                          Mark Reviewed
                        </Text>
                      </>
                    )}
                  </XStack>
                </Pressable>
              )}
            </XStack>
          </YStack>
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
              accessibilityLabel={isReviewQueueMode ? 'Back to In-Store Inventory' : 'Go back'}
            >
              <LuArrowLeft size={20} color={tokens.text} />
            </Pressable>
          )}
          <YStack>
            <XStack alignItems="center" gap={5}>
              {isReviewQueueMode ? (
                <>
                  <LuSparkles size={15} color="#D97706" />
                  <Text fontSize={15} fontWeight="800" color={tokens.text}>
                    Review Queue
                  </Text>
                </>
              ) : (
                <>
                  <LuStore size={15} color={tokens.accent} />
                  <Text fontSize={15} fontWeight="800" color={tokens.text}>
                    In-Store Inventory
                  </Text>
                </>
              )}
            </XStack>
            <Text fontSize={11} color={tokens.textMuted}>
              {isReviewQueueMode
                ? `${reviewCount} Product${reviewCount === 1 ? '' : 's'} Need Review`
                : `${filteredProducts.length} Synced Products Active`}
            </Text>
          </YStack>
        </XStack>

        <XStack alignItems="center" gap={8}>
          <Pressable
            onPress={() => {
              if (onNavigateToReviewQueue) {
                onNavigateToReviewQueue();
              } else {
                setShowNeedsReviewOnly((prev) => !prev);
              }
            }}
            style={({ pressed }) => [
              styles.navReviewBtn,
              {
                backgroundColor: (showNeedsReviewOnly || isReviewQueueMode) ? '#FEF3C7' : pressed ? tokens.accentSubtle : tokens.surfaceRaised,
                borderColor: (showNeedsReviewOnly || isReviewQueueMode) ? '#F59E0B' : tokens.border,
                borderWidth: 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Review queue (${reviewCount} products need review)`}
          >
            <XStack alignItems="center" gap={5}>
              <LuSparkles size={13} color={(showNeedsReviewOnly || isReviewQueueMode) ? '#B45309' : tokens.accent} />
              <Text fontSize={11} fontWeight="800" color={(showNeedsReviewOnly || isReviewQueueMode) ? '#B45309' : tokens.accent}>
                Review
              </Text>
              {reviewCount > 0 && (
                <XStack
                  backgroundColor="#D97706"
                  paddingHorizontal={5}
                  paddingVertical={1.5}
                  borderRadius={10}
                  minWidth={18}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={9} fontWeight="900" color="#fff">
                    {reviewCount}
                  </Text>
                </XStack>
              )}
            </XStack>
          </Pressable>

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
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
                <LuX size={12} color={tokens.textMuted} />
              </Pressable>
            )}
          </XStack>

          {/* Dynamic Left Filter Drawer Trigger Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open filter drawer"
            onPress={() => setIsFilterDrawerOpen(true)}
            style={[
              styles.filterToggleBtn,
              {
                backgroundColor: activeFilterCount > 0 ? `${tokens.accent}14` : 'rgba(0,0,0,0.04)',
                borderColor: activeFilterCount > 0 ? tokens.accent : tokens.border,
              },
            ]}
          >
            <XStack alignItems="center" gap={5}>
              <LuSlidersHorizontal size={14} color={activeFilterCount > 0 ? tokens.accent : tokens.text} />
              {activeFilterCount > 0 && (
                <XStack
                  paddingHorizontal={5}
                  paddingVertical={1}
                  borderRadius={10}
                  backgroundColor={tokens.accent}
                >
                  <Text fontSize={10} fontWeight="800" color="#ffffff">
                    {activeFilterCount}
                  </Text>
                </XStack>
              )}
            </XStack>
          </Pressable>

          {activeFilterCount > 0 && (
            <Pressable onPress={resetFilters} hitSlop={6} style={styles.resetBtn}>
              <LuRotateCcw size={13} color={tokens.textMuted} />
            </Pressable>
          )}
        </XStack>

        {/* Active Needs Review Banner */}
        {showNeedsReviewOnly && (
          <XStack
            backgroundColor="#FEF3C7"
            paddingHorizontal={12}
            paddingVertical={6}
            borderRadius={6}
            justifyContent="space-between"
            alignItems="center"
          >
            <Text fontSize={11} fontWeight="700" color="#92400E">
              Showing products with pending updates ({reviewCount})
            </Text>
            <TouchableOpacity onPress={() => setShowNeedsReviewOnly(false)}>
              <Text fontSize={11} fontWeight="800" color="#B45309">
                Clear
              </Text>
            </TouchableOpacity>
          </XStack>
        )}

        {/* Category Horizontal Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {CATEGORIES.map((cat) => {
            const isSelected = filters.category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setFilters((f) => ({ ...f, category: cat }))}
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

        {/* Active Filter Chips Bar */}
        {activeFilterChips.length > 0 && (
          <XStack alignItems="center" gap={6} paddingTop={2}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
              {activeFilterChips.map((chip) => (
                <XStack
                  key={chip.id}
                  alignItems="center"
                  gap={4}
                  paddingHorizontal={8}
                  paddingVertical={3}
                  borderRadius={tokens.radius.full}
                  backgroundColor={`${tokens.accent}14`}
                  borderWidth={1}
                  borderColor={`${tokens.accent}40`}
                >
                  <Text fontSize={10} fontWeight="700" color={tokens.accent}>
                    {chip.label}
                  </Text>
                  <Pressable hitSlop={6} onPress={chip.onRemove}>
                    <LuX size={10} color={tokens.accent} />
                  </Pressable>
                </XStack>
              ))}
              <Pressable hitSlop={6} onPress={resetFilters}>
                <Text fontSize={10} fontWeight="700" color={tokens.textMuted} paddingHorizontal={4}>
                  Clear all
                </Text>
              </Pressable>
            </ScrollView>
          </XStack>
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
            {showNeedsReviewOnly ? 'No Pending Reviews' : 'No Products in Store'}
          </Text>
          <Text fontSize={12} color={tokens.textMuted} textAlign="center" maxWidth={280}>
            {showNeedsReviewOnly
              ? 'All products are currently up to date with catalog updates.'
              : activeFilterCount > 0
              ? 'No in-store products matched your active filters. Try resetting filters.'
              : 'Publish starred products from the catalog to populate your online storefront.'}
          </Text>
          {showNeedsReviewOnly ? (
            <Pressable
              onPress={() => {
                if (isReviewQueueMode && onBack) {
                  onBack();
                } else {
                  setShowNeedsReviewOnly(false);
                }
              }}
              style={styles.resetPillBtn}
            >
              <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                View All In-Store Products
              </Text>
            </Pressable>
          ) : activeFilterCount > 0 ? (
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
          numColumns={2}
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

      {/* Dynamic Left Filter Panel / Drawer */}
      <StoreInventoryFilterDrawer
        visible={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        current={filters}
        onApply={(nextFilters) => setFilters(nextFilters)}
      />
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
  navReviewBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 8,
    marginBottom: 8,
  },
  gridCard: {
    flex: 0.5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  cardImageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  cardImage: {
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
  topRightBadgeContainer: {
    position: 'absolute',
    top: 6,
    right: 6,
    alignItems: 'flex-end',
    gap: 4,
    zIndex: 2,
  },
  topRightBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  mediaCountBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    zIndex: 2,
  },
  swatchCountBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.68)',
    zIndex: 2,
  },
  curateActionBtn: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
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

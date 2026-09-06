import React, { useState, useMemo, useRef } from 'react';
import {
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LuSearch,
  LuX,
  LuSlidersHorizontal,
  LuPackage,
  LuArrowLeft,
  LuArchive,
  LuCheckSquare,
} from '../icons/lu';
import { useTheme } from '@/theme';
import {
  CatalogCategoryPills,
  CatalogCategory,
  DEFAULT_CATALOG_CATEGORIES,
} from '../molecules/CatalogCategoryPills';
import {
  ProductGridTile,
  ProductGridTileData,
} from '../molecules/ProductGridTile';
import {
  CatalogSelectionActionBar,
} from '../molecules/CatalogSelectionActionBar';
import {
  CatalogQuickEditSheet,
} from '../molecules/CatalogQuickEditSheet';
import {
  CatalogFilterDrawer,
  FilterState,
  DEFAULT_FILTER_STATE,
} from '../molecules/CatalogFilterDrawer';

export interface FilterChipItem {
  id: string;
  label: string;
}

export interface AdminProductCatalogPageProps {
  products?: ProductGridTileData[];
  categories?: CatalogCategory[];
  activeCategoryId?: string;
  onSelectCategory?: (id: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  activeFilterCount?: number;
  filterChips?: FilterChipItem[];
  onRemoveFilterChip?: (id: string) => void;
  isFilterDrawerOpen?: boolean;
  onOpenFilterDrawer?: () => void;
  onCloseFilterDrawer?: () => void;
  filters?: FilterState;
  onApplyFilters?: (filters: FilterState) => void;
  onCreateProduct?: () => void;
  onProductPress?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onBulkStar?: (ids: string[]) => void;
  onBulkArchive?: (ids: string[]) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkMoveCategory?: (ids: string[]) => void;
  onBulkReevaluate?: (ids: string[]) => void;
  onSaveQuickEdit?: (id: string, updates: { price?: number; category?: string }) => void;
  onNavArchived?: () => void;
  onBack?: () => void;
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  hasMore?: boolean;
  totalCount?: number;
  disableSafeArea?: boolean;
  columns?: number;
  // Controlled selection support
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectRange?: (id: string) => void;
  onClearSelection?: () => void;
  onToggleSelectAll?: () => void;
  isAllSelected?: boolean;
  selectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  categoryOptions?: { id: string; label: string }[];
  fabricOptions?: string[];
  vendorOptions?: string[];
}

export function AdminProductCatalogPage({
  products = [],
  categories = DEFAULT_CATALOG_CATEGORIES,
  activeCategoryId = 'all',
  onSelectCategory,
  searchQuery = '',
  onSearchChange,
  activeFilterCount = 0,
  filterChips: initialFilterChips = [],
  onRemoveFilterChip,
  isFilterDrawerOpen = false,
  onOpenFilterDrawer,
  onCloseFilterDrawer,
  filters: propFilters,
  onApplyFilters,
  onCreateProduct,
  onProductPress,
  onToggleStar,
  onBulkStar,
  onBulkArchive,
  onBulkDelete,
  onBulkMoveCategory,
  onBulkReevaluate,
  onSaveQuickEdit,
  onNavArchived,
  onBack,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onEndReached,
  hasMore = false,
  totalCount,
  disableSafeArea = false,
  columns = 3,
  selectedIds: propSelectedIds,
  onToggleSelect,
  onSelectRange,
  onClearSelection,
  onToggleSelectAll,
  isAllSelected: propIsAllSelected,
  selectionMode: propSelectionMode,
  onToggleSelectionMode,
  categoryOptions,
  fabricOptions,
  vendorOptions,
}: AdminProductCatalogPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  const [internalQuery, setInternalQuery] = useState(searchQuery);
  const [internalSelectedCat, setInternalSelectedCat] = useState(activeCategoryId);
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const [internalIsSelectionMode, setInternalIsSelectionMode] = useState(false);
  const lastAnchorIdRef = useRef<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductGridTileData | null>(null);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(isFilterDrawerOpen);
  const [activeFilters, setActiveFilters] = useState<FilterState>(propFilters || DEFAULT_FILTER_STATE);

  const selectedIds = propSelectedIds !== undefined ? propSelectedIds : internalSelectedIds;
  const selectionMode = propSelectionMode !== undefined ? propSelectionMode : (internalIsSelectionMode || selectedIds.size > 0);
  const isAll = propIsAllSelected !== undefined ? propIsAllSelected : (products.length > 0 && selectedIds.size >= products.length);

  const handleQueryChange = (val: string) => {
    setInternalQuery(val);
    onSearchChange?.(val);
  };

  const handleCategorySelect = (id: string) => {
    setInternalSelectedCat(id);
    onSelectCategory?.(id);
  };

  const toggleSelectionMode = () => {
    if (onToggleSelectionMode) {
      onToggleSelectionMode();
    } else {
      if (selectionMode) {
        clearSelection();
      } else {
        setInternalIsSelectionMode(true);
      }
    }
  };

  const toggleSelection = (id: string) => {
    lastAnchorIdRef.current = id;
    if (onToggleSelect) {
      onToggleSelect(id);
    } else {
      setInternalSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  const selectRange = (targetId: string) => {
    if (onSelectRange) {
      onSelectRange(targetId);
      return;
    }
    if (!lastAnchorIdRef.current || products.length === 0) {
      toggleSelection(targetId);
      return;
    }
    const anchorIdx = products.findIndex((p) => p.id === lastAnchorIdRef.current);
    const targetIdx = products.findIndex((p) => p.id === targetId);
    if (anchorIdx === -1 || targetIdx === -1) {
      toggleSelection(targetId);
      return;
    }
    const start = Math.min(anchorIdx, targetIdx);
    const end = Math.max(anchorIdx, targetIdx);
    setInternalSelectedIds((prev) => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        next.add(products[i].id);
      }
      return next;
    });
    lastAnchorIdRef.current = targetId;
  };

  const handleToggleSelectAll = () => {
    if (onToggleSelectAll) {
      onToggleSelectAll();
    } else {
      if (isAll) {
        clearSelection();
      } else {
        setInternalSelectedIds(new Set(products.map((p) => p.id)));
      }
    }
  };

  const clearSelection = () => {
    setInternalIsSelectionMode(false);
    lastAnchorIdRef.current = null;
    if (onClearSelection) {
      onClearSelection();
    } else {
      setInternalSelectedIds(new Set());
    }
  };

  const handleOpenFilters = () => {
    setFilterDrawerVisible(true);
    onOpenFilterDrawer?.();
  };

  const handleCloseFilters = () => {
    setFilterDrawerVisible(false);
    onCloseFilterDrawer?.();
  };

  const handleApplyFilters = (filters: FilterState) => {
    setActiveFilters(filters);
    setFilterDrawerVisible(false);
    onApplyFilters?.(filters);
  };

  // Sync external filters if provided
  React.useEffect(() => {
    if (propFilters) {
      setActiveFilters(propFilters);
    }
  }, [propFilters]);

  // Generate dynamic filter chips from state
  const computedFilterChips = useMemo(() => {
    if (initialFilterChips.length > 0) return initialFilterChips;

    const chips: FilterChipItem[] = [];
    if (activeFilters.isStarred === true) {
      chips.push({ id: 'f-star', label: '⭐ Starred Only' });
    } else if (activeFilters.isStarred === false) {
      chips.push({ id: 'f-unstar', label: 'Unstarred Only' });
    }
    if (activeFilters.minPrice > 0 && activeFilters.maxPrice > 0) {
      chips.push({ id: 'f-price', label: `₹${activeFilters.minPrice} - ₹${activeFilters.maxPrice}` });
    } else if (activeFilters.minPrice > 0) {
      chips.push({ id: 'f-minprice', label: `≥ ₹${activeFilters.minPrice}` });
    } else if (activeFilters.maxPrice > 0) {
      chips.push({ id: 'f-maxprice', label: `≤ ₹${activeFilters.maxPrice}` });
    }
    activeFilters.fabrics.forEach((fab) => {
      chips.push({ id: `f-fab-${fab}`, label: fab });
    });
    activeFilters.vendorNames.forEach((v) => {
      chips.push({ id: `f-ven-${v}`, label: v });
    });
    if (activeFilters.status && activeFilters.status !== 'active') {
      chips.push({ id: 'f-status', label: activeFilters.status === 'archived' ? 'Archived' : 'All SKUs' });
    }
    return chips;
  }, [initialFilterChips, activeFilters]);

  const totalFilterCount = activeFilterCount > 0 ? activeFilterCount : computedFilterChips.length;
  const displayedCount = totalCount !== undefined ? totalCount : products.length;
  const cellWidthPercent = columns === 3 ? '33.333333%' : `${100 / columns}%`;

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* Top Header */}
      <XStack
        paddingTop={topInset}
        height={50 + topInset}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={12}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <XStack alignItems="center" gap={8} flex={1}>
          {onBack && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              activeOpacity={0.7}
              onPress={onBack}
            >
              <XStack
                width={32}
                height={32}
                borderRadius={tokens.radius.full}
                alignItems="center"
                justifyContent="center"
              >
                <LuArrowLeft size={18} color={tokens.text} />
              </XStack>
            </TouchableOpacity>
          )}

          <XStack alignItems="center" gap={6} flex={1}>
            <Text fontSize={17} fontWeight="800" color={tokens.text} letterSpacing={0.2} numberOfLines={1}>
              Product Catalog
            </Text>
            <Text fontSize={15} fontWeight="700" color={tokens.textMuted}>
              ({displayedCount})
            </Text>
          </XStack>
        </XStack>

        <XStack alignItems="center" gap={6}>
          {/* Archived Screen Nav */}
          {onNavArchived && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="View archived products"
              activeOpacity={0.7}
              onPress={onNavArchived}
            >
              <XStack
                padding={7}
                borderRadius={tokens.radius.full}
                backgroundColor={tokens.surfaceRaised}
                alignItems="center"
                justifyContent="center"
              >
                <LuArchive size={16} color={tokens.text} />
              </XStack>
            </TouchableOpacity>
          )}

          {/* Filter Drawer Toggle */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open catalog filters"
            activeOpacity={0.7}
            onPress={handleOpenFilters}
          >
            <XStack
              padding={7}
              borderRadius={tokens.radius.full}
              backgroundColor={totalFilterCount > 0 ? `${tokens.accent}14` : tokens.surfaceRaised}
              borderWidth={totalFilterCount > 0 ? 1 : 0}
              borderColor={tokens.accent}
              alignItems="center"
              justifyContent="center"
              position="relative"
            >
              <LuSlidersHorizontal
                size={16}
                color={totalFilterCount > 0 ? tokens.accent : tokens.text}
              />
              {totalFilterCount > 0 && (
                <XStack
                  position="absolute"
                  top={-2}
                  right={-2}
                  backgroundColor={tokens.accent}
                  width={14}
                  height={14}
                  borderRadius={7}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={8} fontWeight="800" color="#ffffff">
                    {totalFilterCount}
                  </Text>
                </XStack>
              )}
            </XStack>
          </TouchableOpacity>

          {/* Multi-Select Toggle */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={selectionMode ? 'Exit selection mode' : 'Enter selection mode'}
            activeOpacity={0.7}
            onPress={toggleSelectionMode}
          >
            <XStack
              paddingHorizontal={9}
              height={30}
              borderRadius={tokens.radius.full}
              backgroundColor={selectionMode ? `${tokens.accent}18` : tokens.surfaceRaised}
              borderWidth={selectionMode ? 1 : 0}
              borderColor={tokens.accent}
              alignItems="center"
              justifyContent="center"
              gap={4}
            >
              <LuCheckSquare
                size={13}
                color={selectionMode ? tokens.accent : tokens.text}
              />
              <Text fontSize={11} fontWeight="700" color={selectionMode ? tokens.accent : tokens.text}>
                {selectionMode ? 'Done' : 'Select'}
              </Text>
            </XStack>
          </TouchableOpacity>
        </XStack>
      </XStack>

      {/* Search Input Bar */}
      <XStack
        paddingHorizontal={12}
        paddingVertical={6}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <XStack
          flex={1}
          backgroundColor={tokens.surfaceRaised}
          borderRadius={tokens.radius.sm}
          paddingHorizontal={10}
          height={36}
          alignItems="center"
          gap={8}
        >
          <LuSearch size={14} color={tokens.textMuted} />
          <TextInput
            accessibilityLabel="Search catalog items input"
            value={internalQuery}
            onChangeText={handleQueryChange}
            placeholder="Search code, title, category..."
            placeholderTextColor={tokens.textMuted}
            style={{
              flex: 1,
              fontSize: 12,
              color: tokens.text,
            }}
          />
          {internalQuery.trim().length > 0 && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Clear search text"
              activeOpacity={0.7}
              onPress={() => handleQueryChange('')}
            >
              <XStack
                padding={2}
                borderRadius={tokens.radius.full}
                backgroundColor={tokens.border}
              >
                <LuX size={10} color={tokens.textMuted} />
              </XStack>
            </TouchableOpacity>
          )}
        </XStack>
      </XStack>

      {/* Active Filter Chips Bar (Compact 34px height row) */}
      {computedFilterChips.length > 0 && (
        <XStack
          height={34}
          alignItems="center"
          paddingHorizontal={10}
          backgroundColor={tokens.surface}
          borderBottomWidth={1}
          borderBottomColor={tokens.border}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              alignItems: 'center',
              gap: 6,
            }}
          >
            {computedFilterChips.map((chip) => (
              <XStack
                key={chip.id}
                alignItems="center"
                height={24}
                gap={4}
                paddingHorizontal={8}
                borderRadius={tokens.radius.full}
                backgroundColor={`${tokens.accent}14`}
                borderWidth={1}
                borderColor={`${tokens.accent}30`}
              >
                <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                  {chip.label}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Remove filter ${chip.label}`}
                  activeOpacity={0.7}
                  onPress={() => onRemoveFilterChip?.(chip.id)}
                >
                  <LuX size={11} color={tokens.accent} />
                </TouchableOpacity>
              </XStack>
            ))}
          </ScrollView>
        </XStack>
      )}

      {/* Horizontal Category Tabs */}
      <CatalogCategoryPills
        categories={categories}
        activeCategoryId={activeCategoryId || internalSelectedCat}
        onSelectCategory={handleCategorySelect}
      />

      {/* Virtualized Product Grid */}
      <FlatList
        key={`catalog-grid-${columns}`}
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 1,
          paddingTop: 2,
          paddingBottom: Math.max(32, bottomInset + 64),
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={tokens.accent}
              colors={[tokens.accent]}
            />
          ) : undefined
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <YStack width={cellWidthPercent as any} padding={1.5}>
            <ProductGridTile
              item={item}
              selected={selectedIds.has(item.id)}
              selectionMode={selectionMode}
              onPress={(id) => {
                if (selectionMode) {
                  toggleSelection(id);
                } else {
                  onProductPress?.(id);
                }
              }}
              onLongPress={(id) => {
                if (selectionMode) {
                  selectRange(id);
                } else {
                  toggleSelection(id);
                }
              }}
              onToggleStar={onToggleStar}
              onQuickEdit={(p) => setEditingProduct(p)}
            />
          </YStack>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <YStack
              backgroundColor={tokens.surface}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={tokens.border}
              paddingVertical={44}
              paddingHorizontal={20}
              alignItems="center"
              justifyContent="center"
              gap={8}
              margin={16}
            >
              <XStack
                width={44}
                height={44}
                borderRadius={tokens.radius.full}
                backgroundColor={tokens.surfaceRaised}
                alignItems="center"
                justifyContent="center"
              >
                <LuPackage size={22} color={tokens.textMuted} />
              </XStack>
              <Text fontSize={14} fontWeight="700" color={tokens.text}>
                No Products Found
              </Text>
              <Text
                fontSize={11}
                color={tokens.textMuted}
                textAlign="center"
                maxWidth={260}
              >
                {internalQuery.trim()
                  ? `No items match "${internalQuery}". Try adjusting your search keyword or filters.`
                  : 'No products in this category yet.'}
              </Text>
            </YStack>
          ) : (
            /* Loading Skeleton Grid */
            <XStack flexWrap="wrap">
              {Array.from({ length: 9 }).map((_, i) => (
                <YStack
                  key={i}
                  width={cellWidthPercent as any}
                  padding={1.5}
                >
                  <YStack
                    width="100%"
                    aspectRatio={4 / 5}
                    borderRadius={tokens.radius.xs}
                    backgroundColor={tokens.surfaceRaised}
                    opacity={0.6}
                  />
                </YStack>
              ))}
            </XStack>
          )
        }
        ListFooterComponent={
          isLoading && !isRefreshing && products.length > 0 ? (
            <XStack justifyContent="center" alignItems="center" paddingVertical={16}>
              <ActivityIndicator size="small" color={tokens.accent} />
            </XStack>
          ) : null
        }
      />

      {/* Floating Multi-Selection Action Bar */}
      <CatalogSelectionActionBar
        selectedCount={selectedIds.size}
        totalCount={products.length}
        isAllSelected={isAll}
        onToggleSelectAll={handleToggleSelectAll}
        onClearSelection={clearSelection}
        onBulkStar={() => onBulkStar?.(Array.from(selectedIds))}
        onBulkMoveCategory={() => onBulkMoveCategory?.(Array.from(selectedIds))}
        onBulkArchive={() => onBulkArchive?.(Array.from(selectedIds))}
        onBulkDelete={() => {
          onBulkDelete?.(Array.from(selectedIds));
          clearSelection();
        }}
      />

      {/* Quick Edit Sheet */}
      <CatalogQuickEditSheet
        visible={editingProduct !== null}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={(id, updates) => {
          onSaveQuickEdit?.(id, updates);
        }}
      />

      {/* Left Filter Pane / Drawer */}
      <CatalogFilterDrawer
        visible={filterDrawerVisible}
        onClose={handleCloseFilters}
        current={activeFilters}
        onApply={handleApplyFilters}
        categoryOptions={categoryOptions}
        fabricOptions={fabricOptions}
        vendorOptions={vendorOptions}
      />
    </YStack>
  );
}

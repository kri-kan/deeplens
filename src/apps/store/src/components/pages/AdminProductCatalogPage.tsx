import React, { useState, useMemo } from 'react';
import { ScrollView, TextInput, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LuSearch,
  LuX,
  LuSlidersHorizontal,
  LuPlus,
  LuPackage,
} from 'react-icons/lu';
import { useTheme } from '../../theme';
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

export interface AdminProductCatalogPageProps {
  products?: ProductGridTileData[];
  categories?: CatalogCategory[];
  activeCategoryId?: string;
  onSelectCategory?: (id: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  activeFilterCount?: number;
  filterChips?: { id: string; label: string }[];
  onRemoveFilterChip?: (id: string) => void;
  isFilterDrawerOpen?: boolean;
  onOpenFilterDrawer?: () => void;
  onCloseFilterDrawer?: () => void;
  onApplyFilters?: (filters: FilterState) => void;
  onCreateProduct?: () => void;
  onProductPress?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onBulkStar?: (ids: string[]) => void;
  onBulkArchive?: (ids: string[]) => void;
  onBulkDelete?: (ids: string[]) => void;
  onSaveQuickEdit?: (id: string, updates: { price?: number; category?: string }) => void;
  isLoading?: boolean;
  disableSafeArea?: boolean;
  columns?: number;
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
  onApplyFilters,
  onCreateProduct,
  onProductPress,
  onToggleStar,
  onBulkStar,
  onBulkArchive,
  onBulkDelete,
  onSaveQuickEdit,
  isLoading = false,
  disableSafeArea = false,
  columns = 3,
}: AdminProductCatalogPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  const [internalQuery, setInternalQuery] = useState(searchQuery);
  const [selectedCat, setSelectedCat] = useState(activeCategoryId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingProduct, setEditingProduct] = useState<ProductGridTileData | null>(null);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(isFilterDrawerOpen);
  const [activeFilters, setActiveFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const selectionMode = selectedIds.size > 0;

  const handleQueryChange = (val: string) => {
    setInternalQuery(val);
    onSearchChange?.(val);
  };

  const handleCategorySelect = (id: string) => {
    setSelectedCat(id);
    onSelectCategory?.(id);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
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

  // Generate dynamic filter chips from state
  const computedFilterChips = useMemo(() => {
    if (initialFilterChips.length > 0) return initialFilterChips;

    const chips: { id: string; label: string }[] = [];
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

  // Filter products by search, category, and filter drawer state
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCat !== 'all' && p.category?.toLowerCase() !== selectedCat.toLowerCase()) {
        return false;
      }
      // Starred filter
      if (activeFilters.isStarred === true && !p.isStarred) return false;
      if (activeFilters.isStarred === false && p.isStarred) return false;

      // Price filter
      if (activeFilters.minPrice > 0 && (p.price || 0) < activeFilters.minPrice) return false;
      if (activeFilters.maxPrice > 0 && (p.price || 0) > activeFilters.maxPrice) return false;

      // Search query
      if (internalQuery.trim()) {
        const q = internalQuery.toLowerCase();
        const codeMatch = p.productCode?.toLowerCase().includes(q);
        const titleMatch = p.title?.toLowerCase().includes(q);
        const catMatch = p.category?.toLowerCase().includes(q);
        if (!codeMatch && !titleMatch && !catMatch) return false;
      }
      return true;
    });
  }, [products, selectedCat, internalQuery, activeFilters]);

  const tileWidthPercent = `${100 / columns - 1.5}%`;

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
        <YStack gap={0}>
          <Text fontSize={17} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
            Product Catalog
          </Text>
          <Text fontSize={11} color={tokens.textMuted}>
            {filteredProducts.length} items • master SKUs
          </Text>
        </YStack>

        <XStack alignItems="center" gap={6}>
          {/* Filter Drawer Toggle */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open catalog filters"
            onPress={handleOpenFilters}
            style={{ cursor: 'pointer' } as any}
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
          </Pressable>

          {/* Create Product Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create new product"
            onPress={onCreateProduct}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              paddingVertical={5}
              paddingHorizontal={10}
              borderRadius={tokens.radius.full}
              backgroundColor={tokens.accent}
              alignItems="center"
              gap={4}
            >
              <LuPlus size={14} color="#ffffff" />
              <Text fontSize={12} fontWeight="700" color="#ffffff">
                Add
              </Text>
            </XStack>
          </Pressable>
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
            style={
              {
                flex: 1,
                fontSize: 12,
                color: tokens.text,
                outlineStyle: 'none',
              } as any
            }
          />
          {internalQuery.trim().length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search text"
              onPress={() => handleQueryChange('')}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                padding={2}
                borderRadius={tokens.radius.full}
                backgroundColor={tokens.border}
              >
                <LuX size={10} color={tokens.textMuted} />
              </XStack>
            </Pressable>
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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove filter ${chip.label}`}
                  onPress={() => onRemoveFilterChip?.(chip.id)}
                  style={{ cursor: 'pointer' } as any}
                >
                  <LuX size={11} color={tokens.accent} />
                </Pressable>
              </XStack>
            ))}
          </ScrollView>
        </XStack>
      )}

      {/* Horizontal Category Tabs */}
      <CatalogCategoryPills
        categories={categories}
        activeCategoryId={selectedCat}
        onSelectCategory={handleCategorySelect}
      />

      {/* Product Grid Area - Sits immediately beneath category pills */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 8,
          paddingTop: 4,
          paddingBottom: Math.max(32, bottomInset + 56),
        }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          /* Loading Skeleton Grid */
          <XStack flexWrap="wrap" gap={6} justifyContent="space-between">
            {Array.from({ length: 9 }).map((_, i) => (
              <YStack
                key={i}
                width={tileWidthPercent}
                aspectRatio={4 / 5}
                borderRadius={tokens.radius.sm}
                backgroundColor={tokens.surfaceRaised}
                opacity={0.6}
              />
            ))}
          </XStack>
        ) : filteredProducts.length === 0 ? (
          /* Empty State */
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
            marginTop={16}
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
                : 'No products in this category yet. Click Add to create one.'}
            </Text>
          </YStack>
        ) : (
          /* Populated 3-Column Grid */
          <XStack flexWrap="wrap" gap={6} justifyContent="flex-start">
            {filteredProducts.map((item) => (
              <YStack key={item.id} width={tileWidthPercent} marginBottom={4}>
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
                  onLongPress={(id) => toggleSelection(id)}
                  onToggleStar={onToggleStar}
                  onQuickEdit={(p) => setEditingProduct(p)}
                />
              </YStack>
            ))}
          </XStack>
        )}
      </ScrollView>

      {/* Floating Multi-Selection Action Bar */}
      <CatalogSelectionActionBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onBulkStar={() => onBulkStar?.(Array.from(selectedIds))}
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
      />
    </YStack>
  );
}

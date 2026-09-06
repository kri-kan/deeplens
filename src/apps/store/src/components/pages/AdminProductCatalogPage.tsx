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
  LuCheck,
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
  onOpenFilterDrawer?: () => void;
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
  filterChips = [],
  onRemoveFilterChip,
  onOpenFilterDrawer,
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

  // Filter products by search & category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCat !== 'all' && p.category?.toLowerCase() !== selectedCat.toLowerCase()) {
        return false;
      }
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
  }, [products, selectedCat, internalQuery]);

  const tileWidthPercent = `${100 / columns - 1.5}%`;

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* Top Header */}
      <XStack
        paddingTop={topInset}
        height={52 + topInset}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={12}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <YStack gap={1}>
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
            onPress={onOpenFilterDrawer}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              padding={7}
              borderRadius={tokens.radius.full}
              backgroundColor={activeFilterCount > 0 ? `${tokens.accent}14` : tokens.surfaceRaised}
              borderWidth={activeFilterCount > 0 ? 1 : 0}
              borderColor={tokens.accent}
              alignItems="center"
              justifyContent="center"
              position="relative"
            >
              <LuSlidersHorizontal
                size={16}
                color={activeFilterCount > 0 ? tokens.accent : tokens.text}
              />
              {activeFilterCount > 0 && (
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
                    {activeFilterCount}
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
        paddingVertical={8}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <XStack
          flex={1}
          backgroundColor={tokens.surfaceRaised}
          borderRadius={tokens.radius.md}
          paddingHorizontal={10}
          height={38}
          alignItems="center"
          gap={8}
        >
          <LuSearch size={15} color={tokens.textMuted} />
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
                padding={3}
                borderRadius={tokens.radius.full}
                backgroundColor={tokens.border}
              >
                <LuX size={11} color={tokens.textMuted} />
              </XStack>
            </Pressable>
          )}
        </XStack>
      </XStack>

      {/* Active Filter Chips Bar (if any) */}
      {filterChips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            gap: 6,
          }}
        >
          {filterChips.map((chip) => (
            <XStack
              key={chip.id}
              alignItems="center"
              gap={4}
              paddingVertical={3}
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
      )}

      {/* Horizontal Category Tabs */}
      <CatalogCategoryPills
        categories={categories}
        activeCategoryId={selectedCat}
        onSelectCategory={handleCategorySelect}
      />

      {/* Product Grid Area */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 10,
          paddingTop: 8,
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
            paddingVertical={48}
            paddingHorizontal={20}
            alignItems="center"
            justifyContent="center"
            gap={10}
            marginTop={20}
          >
            <XStack
              width={48}
              height={48}
              borderRadius={tokens.radius.full}
              backgroundColor={tokens.surfaceRaised}
              alignItems="center"
              justifyContent="center"
            >
              <LuPackage size={24} color={tokens.textMuted} />
            </XStack>
            <Text fontSize={15} fontWeight="700" color={tokens.text}>
              No Products Found
            </Text>
            <Text
              fontSize={12}
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
    </YStack>
  );
}

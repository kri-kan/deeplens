import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { BackHandler, Alert, Modal, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { YStack, XStack, Text } from 'tamagui';
import { useTheme } from '@/theme';
import { LuX, LuCheck } from '@/components/tamagui-ui/icons/lu';
import {
  AdminProductCatalogPage,
  FilterChipItem,
} from '@/components/tamagui-ui/pages/AdminProductCatalogPage';
import {
  ProductGridTileData,
} from '@/components/tamagui-ui/molecules/ProductGridTile';
import {
  CatalogCategory,
} from '@/components/tamagui-ui/molecules/CatalogCategoryPills';
import {
  FilterState,
  DEFAULT_FILTER_STATE,
} from '@/components/tamagui-ui/molecules/CatalogFilterDrawer';
import { useProductCatalog, ProductCatalogFilters } from '@/hooks/useProductCatalog';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import { productService } from '@/services/productService';
import { formatISTTimestamp } from '@/utils/date-format';
import type { VendorProduct, MediaEntry } from '@/types/products';

const CATEGORIES: CatalogCategory[] = [
  { id: 'all', label: 'All' },
  { id: 'saree', label: 'Saree' },
  { id: 'dress', label: 'Dress' },
  { id: 'lehanga', label: 'Lehanga' },
  { id: 'kids', label: 'Kids' },
  { id: 'general', label: 'Others' },
];

const getProp = (obj: any, camel: string, pascal: string) =>
  obj[camel] !== undefined ? obj[camel] : obj[pascal];

function mapVendorProductToTileData(item: VendorProduct): ProductGridTileData {
  let mediaList: MediaEntry[] = [];
  if (Array.isArray(item.media) && item.media.length > 0) {
    mediaList = item.media;
  } else if (item.mediaMap) {
    mediaList = Object.entries(item.mediaMap).map(([_, internalId]) => ({
      id: internalId,
      storagePath: '',
      isDefault: false,
    }));
  }

  let media = mediaList.find(
    (m) => getProp(m, 'isDefault', 'IsDefault') && getProp(m, 'mediaType', 'MediaType') === 1
  );
  if (!media) media = mediaList.find((m) => getProp(m, 'mediaType', 'MediaType') === 1);
  if (!media) media = mediaList.find((m) => getProp(m, 'isDefault', 'IsDefault'));
  if (!media) media = mediaList[0];

  let imageUri = 'https://via.placeholder.com/150?text=No+Image';
  if (media) {
    const mId = getProp(media, 'id', 'Id');
    const mPath = getProp(media, 'storagePath', 'StoragePath');
    if (mId && mId !== '00000000-0000-0000-0000-000000000000') {
      imageUri = productService.getThumbnailUrl(mId, 'medium');
    } else if (mPath) {
      imageUri = productService.getThumbnailUrlByPath(mPath, 'medium');
    }
  }

  const productCode = getProp(item, 'productCode', 'ProductCode') || '---';
  const listingCount = getProp(item, 'listingCount', 'ListingCount') || 0;
  const vendorPrice = getProp(item, 'vendorPrice', 'VendorPrice');
  const createdAt = getProp(item, 'createdAt', 'CreatedAt');
  const sourceGroupId = getProp(item, 'sourceGroupId', 'SourceGroupId');
  const formattedTime = formatISTTimestamp(createdAt, sourceGroupId);
  const isStarred = Boolean(getProp(item, 'isStarred', 'IsStarred'));
  const category = getProp(item, 'category', 'Category');
  const title = getProp(item, 'title', 'Title');

  return {
    id: item.id,
    productCode,
    title: title || productCode,
    price: vendorPrice ? Number(vendorPrice) : undefined,
    category,
    imageUri,
    isStarred,
    listingCount,
    timeAgo: formattedTime,
    rawItem: item,
  };
}

export default function ProductCatalogScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const params = useLocalSearchParams<{
    startDate?: string;
    endDate?: string;
    category?: string;
    categories?: string;
    isStarred?: string;
    minPrice?: string;
    maxPrice?: string;
    status?: string;
    includeArchived?: string;
  }>();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);

  // Dynamic filter options from backend
  const [filterOptions, setFilterOptions] = useState<{
    fabrics: string[];
    vendors: string[];
    minPrice: number;
    maxPrice: number;
  }>({ fabrics: [], vendors: [], minPrice: 0, maxPrice: 0 });

  useEffect(() => {
    productService
      .getFilterOptions()
      .then((opts) => {
        if (opts) setFilterOptions(opts);
      })
      .catch((err) => {
        console.warn('Failed to load filter options:', err);
      });
  }, []);

  // Search input debounce (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Bulk move category modal state
  const [moveCategoryModalVisible, setMoveCategoryModalVisible] = useState(false);
  const [movingCategory, setMovingCategory] = useState(false);

  // Hydrate filters from route params
  useEffect(() => {
    const hasIncomingParams =
      Boolean(params.startDate) ||
      Boolean(params.endDate) ||
      Boolean(params.category) ||
      Boolean(params.categories) ||
      params.isStarred !== undefined ||
      Boolean(params.minPrice) ||
      Boolean(params.maxPrice) ||
      Boolean(params.status) ||
      params.includeArchived !== undefined;

    if (!hasIncomingParams) return;

    const minP = params.minPrice ? parseFloat(params.minPrice) : 0;
    const maxP = params.maxPrice ? parseFloat(params.maxPrice) : 0;
    const starred =
      params.isStarred === 'true' ? true : params.isStarred === 'false' ? false : null;

    let parsedCategories: string[] = [];
    if (params.categories) {
      parsedCategories =
        typeof params.categories === 'string'
          ? params.categories
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean)
          : (params.categories as any);
    }

    setActiveFilters((prev) => ({
      ...prev,
      startDate: params.startDate || prev.startDate,
      endDate: params.endDate || prev.endDate,
      minPrice: !isNaN(minP) && minP > 0 ? minP : prev.minPrice,
      maxPrice: !isNaN(maxP) && maxP > 0 ? maxP : prev.maxPrice,
      isStarred: starred !== null ? starred : prev.isStarred,
      categories: parsedCategories.length > 0 ? parsedCategories : prev.categories,
      status: (params.status as any) || prev.status,
      includeArchived: params.includeArchived === 'true' ? true : prev.includeArchived,
    }));

    if (params.category) {
      const targetCat = params.category.toLowerCase().trim();
      const mappedSlug =
        targetCat === 'others' || targetCat === 'uncategorized' ? 'general' : targetCat;
      const found = CATEGORIES.find((c) => c.id.toLowerCase() === mappedSlug);
      if (found) {
        setActiveCategory(found.id);
      }
    }
  }, [
    params.startDate,
    params.endDate,
    params.category,
    params.categories,
    params.isStarred,
    params.minPrice,
    params.maxPrice,
    params.status,
    params.includeArchived,
  ]);

  // Construct catalog query filters
  const catalogFilters: ProductCatalogFilters = useMemo(() => {
    return {
      categoryId: activeCategory,
      query: debouncedQuery.trim() || undefined,
      sortBy: activeFilters.sortBy,
      startDate: activeFilters.startDate,
      endDate: activeFilters.endDate,
      fabrics: activeFilters.fabrics.length > 0 ? activeFilters.fabrics : undefined,
      vendorNames: activeFilters.vendorNames.length > 0 ? activeFilters.vendorNames : undefined,
      minPrice: activeFilters.minPrice > 0 ? activeFilters.minPrice : undefined,
      maxPrice: activeFilters.maxPrice > 0 ? activeFilters.maxPrice : undefined,
      categories:
        activeFilters.categories && activeFilters.categories.length > 0
          ? activeFilters.categories
          : undefined,
      isStarred: activeFilters.isStarred,
      status:
        activeFilters.status ??
        (activeFilters.includeArchived === true ? 'archived' : 'active'),
      includeArchived:
        activeFilters.status === 'archived'
          ? true
          : activeFilters.status === 'all'
          ? undefined
          : activeFilters.includeArchived ?? undefined,
    };
  }, [activeCategory, debouncedQuery, activeFilters]);

  // Live product catalog hook
  const {
    products,
    loading,
    refreshing,
    hasMore,
    totalCount,
    fetchProducts,
    toggleStar,
  } = useProductCatalog(catalogFilters);

  // Map VendorProduct items to ProductGridTileData
  const gridItems: ProductGridTileData[] = useMemo(() => {
    return products.map(mapVendorProductToTileData);
  }, [products]);

  // Multi-selection management via useMultiSelect
  const {
    selectedIds,
    selectionMode,
    isAllSelected,
    toggleSelect: toggleSelection,
    selectRange,
    clearSelection,
    toggleSelectAll,
    toggleSelectionMode,
  } = useMultiSelect({
    items: gridItems,
  });

  // Active filter count
  const activeFilterCount = useMemo(() => {
    return (
      (activeFilters.sortBy !== 'recent' ? 1 : 0) +
      (activeFilters.isStarred !== null && activeFilters.isStarred !== undefined ? 1 : 0) +
      (activeFilters.categories && activeFilters.categories.length > 0 ? 1 : 0) +
      activeFilters.fabrics.length +
      activeFilters.vendorNames.length +
      (activeFilters.minPrice > 0 || activeFilters.maxPrice > 0 ? 1 : 0) +
      (activeFilters.startDate || activeFilters.endDate ? 1 : 0) +
      ((activeFilters.status && activeFilters.status !== 'active') ||
      activeFilters.includeArchived === true
        ? 1
        : 0)
    );
  }, [activeFilters]);

  // Dynamic filter chips
  const filterChips: FilterChipItem[] = useMemo(() => {
    const chips: FilterChipItem[] = [];
    if (activeFilters.isStarred === true) {
      chips.push({ id: 'f-star', label: '⭐ Starred Only' });
    } else if (activeFilters.isStarred === false) {
      chips.push({ id: 'f-unstar', label: 'Unstarred Only' });
    }
    if (activeFilters.minPrice > 0 && activeFilters.maxPrice > 0) {
      chips.push({
        id: 'f-price',
        label: `₹${activeFilters.minPrice.toLocaleString('en-IN')} - ₹${activeFilters.maxPrice.toLocaleString('en-IN')}`,
      });
    } else if (activeFilters.minPrice > 0) {
      chips.push({ id: 'f-minprice', label: `≥ ₹${activeFilters.minPrice.toLocaleString('en-IN')}` });
    } else if (activeFilters.maxPrice > 0) {
      chips.push({ id: 'f-maxprice', label: `≤ ₹${activeFilters.maxPrice.toLocaleString('en-IN')}` });
    }
    activeFilters.fabrics.forEach((fab) => {
      chips.push({ id: `f-fab-${fab}`, label: `🧵 ${fab}` });
    });
    activeFilters.vendorNames.forEach((v) => {
      chips.push({ id: `f-ven-${v}`, label: `🏪 ${v}` });
    });
    if (activeFilters.status && activeFilters.status !== 'active') {
      chips.push({
        id: 'f-status',
        label: activeFilters.status === 'archived' ? '📦 Archived' : `Status: ${activeFilters.status}`,
      });
    }
    return chips;
  }, [activeFilters]);

  const handleRemoveFilterChip = (chipId: string) => {
    if (chipId === 'f-star' || chipId === 'f-unstar') {
      setActiveFilters((prev) => ({ ...prev, isStarred: null }));
    } else if (chipId === 'f-price' || chipId === 'f-minprice' || chipId === 'f-maxprice') {
      setActiveFilters((prev) => ({ ...prev, minPrice: 0, maxPrice: 0 }));
    } else if (chipId.startsWith('f-fab-')) {
      const fab = chipId.replace('f-fab-', '');
      setActiveFilters((prev) => ({
        ...prev,
        fabrics: prev.fabrics.filter((f) => f !== fab),
      }));
    } else if (chipId.startsWith('f-ven-')) {
      const ven = chipId.replace('f-ven-', '');
      setActiveFilters((prev) => ({
        ...prev,
        vendorNames: prev.vendorNames.filter((v) => v !== ven),
      }));
    } else if (chipId === 'f-status') {
      setActiveFilters((prev) => ({ ...prev, status: 'active', includeArchived: false }));
    }
  };

  const handleApplyFilters = (filters: FilterState) => {
    setActiveFilters(filters);
    const primaryCat = filters.categories?.[0];
    if (primaryCat && primaryCat !== 'all') {
      setActiveCategory(primaryCat);
    }
  };

  // Bulk actions
  const handleBulkStar = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => productService.toggleStar(id, true)));
      clearSelection();
      fetchProducts(true);
    } catch (e) {
      console.error('Failed to bulk star:', e);
    }
  };

  const handleBulkArchive = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await productService.archiveProducts(ids);
      clearSelection();
      fetchProducts(true);
      Alert.alert(
        'Archival Queued',
        `📦 Archival queued for ${ids.length} product(s). Storage pruning is processing in the background.`
      );
    } catch (e) {
      console.error('Failed to archive products:', e);
      Alert.alert('Error', 'Failed to archive products.');
    }
  };

  const handleBulkDelete = (ids: string[]) => {
    if (ids.length === 0) return;
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
              fetchProducts(true);
              Alert.alert(
                'Deletion Queued',
                `🗑️ Deletion queued for ${ids.length} product(s). Processing in the background.`
              );
            } catch (e) {
              console.error('Failed to permanently delete products:', e);
              Alert.alert('Error', 'Failed to permanently delete selected products.');
            }
          },
        },
      ]
    );
  };

  const handleBulkReevaluate = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await productService.reevaluateProducts(ids);
      clearSelection();
      Alert.alert('AI Re-evaluation Queued', `Triggered AI re-evaluation for ${ids.length} product(s).`);
    } catch (e) {
      console.error('Failed to reevaluate:', e);
      Alert.alert('Error', 'Failed to trigger AI re-evaluation.');
    }
  };

  const handleExecuteCategoryMove = async (targetCategory: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setMovingCategory(true);
    try {
      await Promise.all(ids.map((id) => productService.changeCategory(id, targetCategory)));
      setMoveCategoryModalVisible(false);
      clearSelection();
      fetchProducts(true);
      Alert.alert('Category Updated', `Moved ${ids.length} product(s) to ${targetCategory}.`);
    } catch (e) {
      console.error('Failed to change categories:', e);
      Alert.alert('Error', 'Failed to change categories for selected products.');
    } finally {
      setMovingCategory(false);
    }
  };

  const handleSaveQuickEdit = async (
    id: string,
    updates: { price?: number; category?: string }
  ) => {
    try {
      await productService.updateProductMetadata(id, {
        price: updates.price,
        categoryName: updates.category,
        useForTraining: true,
      });
      fetchProducts(true);
    } catch (e) {
      console.error('Failed to save quick edit:', e);
      Alert.alert('Error', 'Failed to update product details.');
    }
  };

  const handleToggleStar = async (id: string) => {
    const current = products.find((p) => p.id === id);
    const currentStarred = Boolean(getProp(current, 'isStarred', 'IsStarred'));
    await toggleStar(id, !currentStarred);
  };

  const handleBack = useCallback(() => {
    if (selectionMode) {
      clearSelection();
    } else if (router.canGoBack()) {
      router.back();
    }
  }, [selectionMode, clearSelection, router]);

  return (
    <>
      <AdminProductCatalogPage
        products={gridItems}
        categories={CATEGORIES}
        activeCategoryId={activeCategory}
        onSelectCategory={(id) => {
          setActiveCategory(id);
          clearSelection();
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilterCount={activeFilterCount}
        filterChips={filterChips}
        onRemoveFilterChip={handleRemoveFilterChip}
        filters={activeFilters}
        onApplyFilters={handleApplyFilters}

        onNavArchived={() => router.push('/utilities/archived')}
        onBack={router.canGoBack() ? handleBack : undefined}
        onProductPress={(id) => router.push(`/product/${id}`)}
        onToggleStar={handleToggleStar}
        onBulkStar={handleBulkStar}
        onBulkArchive={handleBulkArchive}
        onBulkDelete={handleBulkDelete}
        onBulkMoveCategory={() => setMoveCategoryModalVisible(true)}
        onBulkReevaluate={handleBulkReevaluate}
        onSaveQuickEdit={handleSaveQuickEdit}
        isLoading={loading}
        isRefreshing={refreshing}
        onRefresh={() => fetchProducts(true)}
        onEndReached={() => {
          if (hasMore && !loading) {
            fetchProducts(false);
          }
        }}
        hasMore={hasMore}
        totalCount={totalCount}
        columns={3}
        selectedIds={selectedIds}
        selectionMode={selectionMode}
        isAllSelected={isAllSelected}
        onToggleSelect={toggleSelection}
        onSelectRange={selectRange}
        onClearSelection={clearSelection}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelectionMode={toggleSelectionMode}
        fabricOptions={filterOptions.fabrics.length > 0 ? filterOptions.fabrics : undefined}
        vendorOptions={filterOptions.vendors.length > 0 ? filterOptions.vendors : undefined}
      />

      {/* Bulk Move Category Selection Modal */}
      <Modal
        visible={moveCategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMoveCategoryModalVisible(false)}
      >
        <XStack flex={1} backgroundColor="rgba(0,0,0,0.5)" alignItems="center" justifyContent="center" padding={20}>
          <YStack
            width="100%"
            maxWidth={340}
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.lg}
            padding={18}
            gap={14}
            borderWidth={1}
            borderColor={tokens.border}
          >
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={15} fontWeight="800" color={tokens.text}>
                Move {selectedIds.size} Products To
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close modal"
                activeOpacity={0.7}
                onPress={() => setMoveCategoryModalVisible(false)}
              >
                <LuX size={18} color={tokens.textMuted} />
              </TouchableOpacity>
            </XStack>

            <YStack gap={8}>
              {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Move to ${cat.label}`}
                  activeOpacity={0.7}
                  onPress={() => handleExecuteCategoryMove(cat.id)}
                  disabled={movingCategory}
                >
                  <XStack
                    height={40}
                    alignItems="center"
                    justifyContent="space-between"
                    paddingHorizontal={12}
                    borderRadius={tokens.radius.sm}
                    backgroundColor={tokens.surfaceRaised}
                  >
                    <Text fontSize={13} fontWeight="600" color={tokens.text}>
                      {cat.label}
                    </Text>
                    <LuCheck size={14} color={tokens.accent} />
                  </XStack>
                </TouchableOpacity>
              ))}
            </YStack>
          </YStack>
        </XStack>
      </Modal>
    </>
  );
}

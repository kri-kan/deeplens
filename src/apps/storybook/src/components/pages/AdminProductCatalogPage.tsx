import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ScrollView, TextInput, Pressable, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LuSearch,
  LuX,
  LuSlidersHorizontal,
  LuPackage,
  LuCheckCheck,
  LuCheck,
  LuSparkles,
  LuLayoutGrid,
  LuEllipsisVertical,
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
  CatalogMenuSheet,
} from '../molecules/CatalogMenuSheet';
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
  onBulkReevaluate?: (ids: string[]) => void;
  onSaveQuickEdit?: (id: string, updates: { price?: number; category?: string }) => void;
  isLoading?: boolean;
  disableSafeArea?: boolean;
  columns?: number;
  categoryOptions?: { id: string; label: string }[];
  fabricOptions?: string[];
  craftOptions?: string[];
  motifOptions?: string[];
  borderOptions?: string[];
  stitchTypeOptions?: string[];
  occasionOptions?: string[];
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
  onApplyFilters,
  onCreateProduct,
  onProductPress,
  onToggleStar,
  onBulkStar,
  onBulkArchive,
  onBulkDelete,
  onBulkReevaluate,
  onSaveQuickEdit,
  isLoading = false,
  disableSafeArea = false,
  columns = 3,
  categoryOptions,
  fabricOptions,
  craftOptions,
  motifOptions,
  borderOptions,
  stitchTypeOptions,
  occasionOptions,
  vendorOptions,
}: AdminProductCatalogPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  const [internalQuery, setInternalQuery] = useState(searchQuery || '');
  const [selectedCat, setSelectedCat] = useState(activeCategoryId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [internalIsSelectionMode, setInternalIsSelectionMode] = useState(false);
  const lastAnchorIdRef = useRef<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductGridTileData | null>(null);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(isFilterDrawerOpen);
  const [activeFilters, setActiveFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const [catalogViewMode, setCatalogViewMode] = useState<'grid' | 'ai_matrix'>('grid');
  const [menuSheetVisible, setMenuSheetVisible] = useState(false);

  useEffect(() => {
    setInternalQuery(searchQuery || '');
  }, [searchQuery]);

  const selectionMode = internalIsSelectionMode || selectedIds.size > 0;

  const handleQueryChange = (val: string) => {
    setInternalQuery(val);
    onSearchChange?.(val);
  };

  const handleCategorySelect = (id: string) => {
    setSelectedCat(id);
    onSelectCategory?.(id);
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      clearSelection();
    } else {
      setInternalIsSelectionMode(true);
    }
  };

  const toggleSelection = (id: string) => {
    lastAnchorIdRef.current = id;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectRange = (targetId: string, list: ProductGridTileData[]) => {
    if (!lastAnchorIdRef.current || list.length === 0) {
      toggleSelection(targetId);
      return;
    }
    const anchorIdx = list.findIndex((p) => p.id === lastAnchorIdRef.current);
    const targetIdx = list.findIndex((p) => p.id === targetId);
    if (anchorIdx === -1 || targetIdx === -1) {
      toggleSelection(targetId);
      return;
    }
    const start = Math.min(anchorIdx, targetIdx);
    const end = Math.max(anchorIdx, targetIdx);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        next.add(list[i].id);
      }
      return next;
    });
    lastAnchorIdRef.current = targetId;
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setInternalIsSelectionMode(false);
    lastAnchorIdRef.current = null;
  };

  const handleToggleSelectAll = (list: ProductGridTileData[]) => {
    if (list.length > 0 && selectedIds.size >= list.length) {
      clearSelection();
    } else {
      setSelectedIds(new Set(list.map((p) => p.id)));
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
    activeFilters.crafts?.forEach((c) => {
      chips.push({ id: `craft_${c}`, label: `Craft: ${c}` });
    });
    activeFilters.motifs?.forEach((m) => {
      chips.push({ id: `motif_${m}`, label: `Motif: ${m}` });
    });
    activeFilters.borders?.forEach((b) => {
      chips.push({ id: `border_${b}`, label: `Border: ${b}` });
    });
    activeFilters.stitchTypes?.forEach((s) => {
      chips.push({ id: `stitch_${s}`, label: `Stitch: ${s}` });
    });
    activeFilters.occasions?.forEach((o) => {
      chips.push({ id: `occasion_${o}`, label: `Occasion: ${o}` });
    });
    activeFilters.vendorNames.forEach((v) => {
      chips.push({ id: `f-ven-${v}`, label: v });
    });
    if (activeFilters.status && activeFilters.status !== 'active') {
      chips.push({ id: 'f-status', label: activeFilters.status === 'archived' ? 'Archived' : 'All SKUs' });
    }
    return chips;
  }, [initialFilterChips, activeFilters]);

  const handleRemoveFilterChip = (chipId: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (chipId === 'f-star' || chipId === 'f-unstar') {
        next.isStarred = null;
      } else if (chipId === 'f-price' || chipId === 'f-minprice' || chipId === 'f-maxprice') {
        next.minPrice = 0;
        next.maxPrice = 0;
      } else if (chipId.startsWith('f-fab-')) {
        const fab = chipId.replace('f-fab-', '');
        next.fabrics = (next.fabrics || []).filter((f) => f !== fab);
      } else if (chipId.startsWith('craft_')) {
        const c = chipId.replace('craft_', '');
        next.crafts = (next.crafts || []).filter((item) => item !== c);
      } else if (chipId.startsWith('motif_')) {
        const m = chipId.replace('motif_', '');
        next.motifs = (next.motifs || []).filter((item) => item !== m);
      } else if (chipId.startsWith('border_')) {
        const b = chipId.replace('border_', '');
        next.borders = (next.borders || []).filter((item) => item !== b);
      } else if (chipId.startsWith('stitch_')) {
        const s = chipId.replace('stitch_', '');
        next.stitchTypes = (next.stitchTypes || []).filter((item) => item !== s);
      } else if (chipId.startsWith('occasion_')) {
        const o = chipId.replace('occasion_', '');
        next.occasions = (next.occasions || []).filter((item) => item !== o);
      } else if (chipId.startsWith('f-ven-')) {
        const ven = chipId.replace('f-ven-', '');
        next.vendorNames = (next.vendorNames || []).filter((v) => v !== ven);
      } else if (chipId === 'f-status') {
        next.status = 'active';
        next.includeArchived = false;
      }
      onApplyFilters?.(next);
      return next;
    });
    onRemoveFilterChip?.(chipId);
  };

  const totalFilterCount = activeFilterCount > 0 ? activeFilterCount : computedFilterChips.length;

  // Multi-dimensional client-side filtering matching top-level and unifiedAttributes
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

      // 1. Fabrics filter: matches p.fabric or p.unifiedAttributes?.fabric_base or p.unifiedAttributes?.fabric
      if (activeFilters.fabrics && activeFilters.fabrics.length > 0) {
        const pFab = (p.fabric || p.unifiedAttributes?.fabric_base || p.unifiedAttributes?.fabric || '').toLowerCase();
        const matches = activeFilters.fabrics.some((f) => {
          const fLower = f.toLowerCase();
          return pFab.includes(fLower) || fLower.includes(pFab);
        });
        if (!matches) return false;
      }

      // 2. Crafts filter: matches p.craft or p.unifiedAttributes?.craft_technique or p.unifiedAttributes?.craft_techniques
      if (activeFilters.crafts && activeFilters.crafts.length > 0) {
        const pCraft = (p.craft || p.unifiedAttributes?.craft_technique || '').toLowerCase();
        const pCraftsArr = Array.isArray(p.unifiedAttributes?.craft_techniques)
          ? p.unifiedAttributes.craft_techniques.map((c: any) => String(c).toLowerCase())
          : [];
        const matches = activeFilters.crafts.some((c) => {
          const cLower = c.toLowerCase();
          return (
            (pCraft && (pCraft.includes(cLower) || cLower.includes(pCraft))) ||
            pCraftsArr.some((item: string) => item.includes(cLower) || cLower.includes(item))
          );
        });
        if (!matches) return false;
      }

      // 3. Motifs filter: matches p.motif or p.unifiedAttributes?.motif_pattern or p.unifiedAttributes?.motif_patterns
      if (activeFilters.motifs && activeFilters.motifs.length > 0) {
        const pMotif = (p.motif || p.unifiedAttributes?.motif_pattern || '').toLowerCase();
        const pMotifsArr = Array.isArray(p.unifiedAttributes?.motif_patterns)
          ? p.unifiedAttributes.motif_patterns.map((m: any) => String(m).toLowerCase())
          : [];
        const matches = activeFilters.motifs.some((m) => {
          const mLower = m.toLowerCase();
          return (
            (pMotif && (pMotif.includes(mLower) || mLower.includes(pMotif))) ||
            pMotifsArr.some((item: string) => item.includes(mLower) || mLower.includes(item))
          );
        });
        if (!matches) return false;
      }

      // 4. Borders filter: matches p.border or p.unifiedAttributes?.border_pallu or p.unifiedAttributes?.border_pallus
      if (activeFilters.borders && activeFilters.borders.length > 0) {
        const pBorder = (p.border || p.unifiedAttributes?.border_pallu || '').toLowerCase();
        const pBordersArr = Array.isArray(p.unifiedAttributes?.border_pallus)
          ? p.unifiedAttributes.border_pallus.map((b: any) => String(b).toLowerCase())
          : [];
        const matches = activeFilters.borders.some((b) => {
          const bLower = b.toLowerCase();
          return (
            (pBorder && (pBorder.includes(bLower) || bLower.includes(pBorder))) ||
            pBordersArr.some((item: string) => item.includes(bLower) || bLower.includes(item))
          );
        });
        if (!matches) return false;
      }

      // 5. StitchTypes filter: matches p.stitchType or p.unifiedAttributes?.stitch_type
      if (activeFilters.stitchTypes && activeFilters.stitchTypes.length > 0) {
        const pStitch = (p.stitchType || (p as any).stitch_type || p.unifiedAttributes?.stitch_type || '').toLowerCase();
        const matches = activeFilters.stitchTypes.some((s) => {
          const sLower = s.toLowerCase();
          return pStitch && (pStitch.includes(sLower) || sLower.includes(pStitch));
        });
        if (!matches) return false;
      }

      // 6. Occasions filter: matches any in p.occasions or p.unifiedAttributes?.occasions
      if (activeFilters.occasions && activeFilters.occasions.length > 0) {
        const pOcc: string[] = Array.isArray(p.occasions)
          ? p.occasions.map((o) => String(o).toLowerCase())
          : (typeof p.occasions === 'string' ? [(p.occasions as string).toLowerCase()] : []);
        const pUaOcc: string[] = Array.isArray(p.unifiedAttributes?.occasions)
          ? p.unifiedAttributes.occasions.map((o: any) => String(o).toLowerCase())
          : (typeof p.unifiedAttributes?.occasions === 'string' ? [(p.unifiedAttributes.occasions as string).toLowerCase()] : []);
        const allOcc = [...pOcc, ...pUaOcc];
        const matches = activeFilters.occasions.some((o) => {
          const oLower = o.toLowerCase();
          return allOcc.some((item) => item.includes(oLower) || oLower.includes(item));
        });
        if (!matches) return false;
      }

      // Search query
      if (internalQuery.trim()) {
        const q = internalQuery.toLowerCase();
        const codeMatch = p.productCode?.toLowerCase().includes(q);
        const titleMatch = p.title?.toLowerCase().includes(q);
        const catMatch = p.category?.toLowerCase().includes(q);
        const craftMatch = p.craft?.toLowerCase().includes(q) || p.unifiedAttributes?.craft_technique?.toLowerCase().includes(q);
        const fabricMatch = p.fabric?.toLowerCase().includes(q) || p.unifiedAttributes?.fabric_base?.toLowerCase().includes(q);
        const motifMatch = p.motif?.toLowerCase().includes(q) || p.unifiedAttributes?.motif_pattern?.toLowerCase().includes(q);
        if (!codeMatch && !titleMatch && !catMatch && !craftMatch && !fabricMatch && !motifMatch) return false;
      }
      return true;
    });
  }, [products, selectedCat, internalQuery, activeFilters]);

  // AI enrichment count across the catalog
  const aiEnrichedCount = useMemo(() => {
    return products.filter((p) =>
      Boolean(
        p.craft ||
        p.motif ||
        p.border ||
        (p.occasions && p.occasions.length > 0) ||
        p.confidenceScore != null ||
        (p.unifiedAttributes && Object.keys(p.unifiedAttributes).length > 0)
      )
    ).length;
  }, [products]);

  const cellWidthPercent = columns === 3 ? "33.333333%" : `${100 / columns}%`;

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* Top App Header */}
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
        <XStack alignItems="center" gap={6} flexShrink={1}>
          <Text
            fontSize={17}
            fontWeight="800"
            color={tokens.text}
            letterSpacing={0.2}
            numberOfLines={1}
          >
            Product Catalog
          </Text>
          <Text fontSize={15} fontWeight="700" color={tokens.textMuted}>
            ({filteredProducts.length})
          </Text>
        </XStack>

        <XStack alignItems="center" gap={8}>
          {/* Filter Drawer Toggle */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open catalog filters"
            onPress={handleOpenFilters}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              width={34}
              height={34}
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

          {/* Multi-Select Toggle */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={selectionMode ? 'Exit selection mode' : 'Enter selection mode'}
            onPress={toggleSelectionMode}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              width={34}
              height={34}
              borderRadius={tokens.radius.full}
              backgroundColor={selectionMode ? `${tokens.accent}20` : tokens.surfaceRaised}
              borderWidth={selectionMode ? 1.5 : 0}
              borderColor={tokens.accent}
              alignItems="center"
              justifyContent="center"
            >
              {selectionMode ? (
                <LuCheck size={16} color={tokens.accent} />
              ) : (
                <LuCheckCheck size={16} color={tokens.text} />
              )}
            </XStack>
          </Pressable>

          {/* More Options Menu (Sheet) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More catalog options"
            onPress={() => setMenuSheetVisible(true)}
            style={{ cursor: 'pointer' } as any}
          >
            <XStack
              width={34}
              height={34}
              borderRadius={tokens.radius.full}
              backgroundColor={tokens.surfaceRaised}
              alignItems="center"
              justifyContent="center"
            >
              <LuEllipsisVertical size={18} color={tokens.text} />
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
            value={internalQuery ?? ''}
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
                  onPress={() => handleRemoveFilterChip(chip.id)}
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
          paddingHorizontal: 1,
          paddingTop: 2,
          paddingBottom: Math.max(32, bottomInset + 56),
        }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
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
        ) : catalogViewMode === 'ai_matrix' ? (
          /* AI Facet Matrix Detailed View */
          <YStack paddingHorizontal={12} paddingTop={6} paddingBottom={16} gap={10}>
            {/* Quick Inspection Banner */}
            <YStack
              padding={10}
              borderRadius={tokens.radius.sm}
              backgroundColor={`${tokens.accent}10`}
              borderWidth={1}
              borderColor={`${tokens.accent}30`}
              gap={4}
            >
              <XStack alignItems="center" justifyContent="space-between">
                <XStack alignItems="center" gap={6}>
                  <LuSparkles size={14} color={tokens.accent} />
                  <Text fontSize={12} fontWeight="800" color={tokens.text}>
                    AI Facet Inspection Matrix ({filteredProducts.length})
                  </Text>
                </XStack>
                <XStack
                  backgroundColor={tokens.accent}
                  paddingHorizontal={6}
                  paddingVertical={2}
                  borderRadius={10}
                >
                  <Text fontSize={9} fontWeight="800" color={tokens.accentForeground}>
                    Active Taxonomies
                  </Text>
                </XStack>
              </XStack>
              <Text fontSize={10} color={tokens.textMuted}>
                Inspecting multi-dimensional vision facets (Craft, Motif, Border, Stitch, Fabric & Occasion)
              </Text>
            </YStack>

            {/* AI Matrix Cards */}
            {filteredProducts.map((item) => {
              const craftVal = item.craft || item.unifiedAttributes?.craft_technique;
              const fabricVal = item.fabric || item.unifiedAttributes?.fabric_base || item.unifiedAttributes?.fabric;
              const motifVal = item.motif || item.unifiedAttributes?.motif_pattern;
              const borderVal = item.border || item.unifiedAttributes?.border_pallu;
              const stitchVal = item.stitchType || item.unifiedAttributes?.stitch_type;
              const occasionsArr = item.occasions || item.unifiedAttributes?.occasions || [];
              const conf = item.confidenceScore ?? item.unifiedAttributes?.confidence_score;
              const confPct = conf != null ? (conf <= 1 ? Math.round(conf * 100) : Math.round(conf)) : null;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => onProductPress?.(item.id)}
                  style={{ cursor: 'pointer' } as any}
                >
                  <YStack
                    backgroundColor={tokens.surface}
                    borderRadius={tokens.radius.md}
                    borderWidth={1}
                    borderColor={tokens.border}
                    padding={10}
                    gap={8}
                  >
                    <XStack gap={10} alignItems="center">
                      {/* Thumbnail */}
                      <YStack
                        width={60}
                        height={75}
                        borderRadius={tokens.radius.xs}
                        overflow="hidden"
                        backgroundColor={tokens.surfaceRaised}
                        borderWidth={0.5}
                        borderColor={tokens.border}
                      >
                        {item.imageUri ? (
                          <Image
                            source={{ uri: item.imageUri }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <YStack flex={1} alignItems="center" justifyContent="center">
                            <Text fontSize={9} color={tokens.textMuted}>No Media</Text>
                          </YStack>
                        )}
                      </YStack>

                      {/* Header Info */}
                      <YStack flex={1} gap={2}>
                        <XStack alignItems="center" justifyContent="space-between">
                          <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                            {item.productCode || 'SKU'}
                          </Text>
                          {confPct != null && (
                            <XStack
                              backgroundColor="rgba(245, 158, 11, 0.15)"
                              paddingHorizontal={6}
                              paddingVertical={2}
                              borderRadius={8}
                              borderWidth={0.5}
                              borderColor="rgba(245, 158, 11, 0.4)"
                            >
                              <Text fontSize={9} fontWeight="700" color="#D97706">
                                ✨ {confPct}% Conf
                              </Text>
                            </XStack>
                          )}
                        </XStack>
                        <Text fontSize={13} fontWeight="800" color={tokens.text} numberOfLines={1}>
                          {item.title || item.productCode || 'Product'}
                        </Text>
                        <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                          ₹{item.price ? item.price.toLocaleString('en-IN') : '---'}
                        </Text>
                      </YStack>
                    </XStack>

                    {/* AI Facet Tags Row */}
                    <XStack flexWrap="wrap" gap={4} paddingTop={4} borderTopWidth={0.5} borderTopColor={tokens.border}>
                      {craftVal && (
                        <XStack backgroundColor={`${tokens.accent}12`} paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
                          <Text fontSize={9} fontWeight="700" color={tokens.accent}>🎨 Craft: {craftVal}</Text>
                        </XStack>
                      )}
                      {fabricVal && (
                        <XStack backgroundColor={tokens.surfaceRaised} paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
                          <Text fontSize={9} fontWeight="600" color={tokens.text}>🧵 Fabric: {fabricVal}</Text>
                        </XStack>
                      )}
                      {motifVal && (
                        <XStack backgroundColor={tokens.surfaceRaised} paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
                          <Text fontSize={9} fontWeight="600" color={tokens.text}>🌸 Motif: {motifVal}</Text>
                        </XStack>
                      )}
                      {borderVal && (
                        <XStack backgroundColor={tokens.surfaceRaised} paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
                          <Text fontSize={9} fontWeight="600" color={tokens.text}>📐 Border: {borderVal}</Text>
                        </XStack>
                      )}
                      {stitchVal && (
                        <XStack backgroundColor={tokens.surfaceRaised} paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
                          <Text fontSize={9} fontWeight="600" color={tokens.text}>🪡 {stitchVal}</Text>
                        </XStack>
                      )}
                      {Array.isArray(occasionsArr) && occasionsArr.slice(0, 3).map((occ: string, idx: number) => (
                        <XStack key={idx} backgroundColor="rgba(16, 185, 129, 0.12)" paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
                          <Text fontSize={9} fontWeight="600" color="#059669">🌟 {occ}</Text>
                        </XStack>
                      ))}
                    </XStack>
                  </YStack>
                </Pressable>
              );
            })}
          </YStack>
        ) : (
          /* Populated 3-Column Grid - Edge to Edge Fill */
          <XStack flexWrap="wrap">
            {filteredProducts.map((item) => (
              <YStack key={item.id} width={cellWidthPercent as any} padding={1.5}>
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
                      selectRange(id, filteredProducts);
                    } else {
                      toggleSelection(id);
                    }
                  }}
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
        totalCount={filteredProducts.length}
        isAllSelected={filteredProducts.length > 0 && selectedIds.size >= filteredProducts.length}
        onToggleSelectAll={() => handleToggleSelectAll(filteredProducts)}
        onClearSelection={clearSelection}
        onBulkStar={() => onBulkStar?.(Array.from(selectedIds))}
        onBulkArchive={() => onBulkArchive?.(Array.from(selectedIds))}
        onBulkDelete={() => {
          onBulkDelete?.(Array.from(selectedIds));
          clearSelection();
        }}
        onBulkReevaluate={onBulkReevaluate ? () => onBulkReevaluate(Array.from(selectedIds)) : undefined}
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
        craftOptions={craftOptions}
        motifOptions={motifOptions}
        borderOptions={borderOptions}
        stitchTypeOptions={stitchTypeOptions}
        occasionOptions={occasionOptions}
        vendorOptions={vendorOptions}
      />

      {/* More Options Sheet */}
      <CatalogMenuSheet
        visible={menuSheetVisible}
        onClose={() => setMenuSheetVisible(false)}
        catalogViewMode={catalogViewMode}
        onChangeViewMode={setCatalogViewMode}
        aiEnrichedCount={aiEnrichedCount}
        totalProducts={products.length}
      />
    </YStack>
  );
}

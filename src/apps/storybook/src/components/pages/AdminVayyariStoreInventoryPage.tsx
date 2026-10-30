import React, { useState, useMemo } from 'react';
import { View, Pressable, StyleSheet, ScrollView, TextInput, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuStore,
  LuSearch,
  LuCheckCheck,
  LuPlus,
  LuRefreshCw,
  LuClock,
  LuPalette,
  LuLayers,
  LuSlidersHorizontal,
  LuRotateCcw,
  LuX,
} from 'react-icons/lu';
import { useTheme } from '../../theme';
import { VayyariStarredProductItem } from './AdminVayyariStorePublishPage';
import {
  StoreInventoryFilterDrawer,
  StoreInventoryFilterState,
  DEFAULT_STORE_INVENTORY_FILTER_STATE,
  getActiveStoreInventoryFilterCount,
  CATEGORIES,
  FABRIC_OPTIONS,
  PRICE_OPTIONS,
  SORT_OPTIONS,
  LIFECYCLE_FILTERS,
} from '../molecules/StoreInventoryFilterDrawer';

export const MOCK_PUBLISHED_PRODUCTS: VayyariStarredProductItem[] = [
  {
    id: 'prod-vf2b58',
    productCode: 'VF2B58',
    title: 'Banarasi Dupion Silk Zari Saree',
    category: 'Saree',
    fabric: 'Banarasi Dupion Silk',
    color: 'Emerald & Gold',
    mediaCount: 7,
    primaryImageUri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
    descriptions: ['Woven on traditional pit looms in Varanasi with opulent contrast zari pallu.'],
    isStarred: true,
    isPublishedToStore: true,
    publishedAt: 'Just now',
    swatchesCount: 4,
    siblingSwatches: [
      { productCode: 'VF2B5801', colorHex: '#1B4D3E', colorwayName: 'Emerald Green' },
      { productCode: 'VF2B5802', colorHex: '#D4AF37', colorwayName: 'Antique Gold' },
      { productCode: 'VF2B5803', colorHex: '#C0392B', colorwayName: 'Ruby Red' },
      { productCode: 'VF2B5804', colorHex: '#1A2875', colorwayName: 'Royal Navy' },
    ],
  },
  {
    id: 'p-101',
    productCode: 'SAR-PAI-880',
    title: 'Paithani Peacock Motif Saree',
    category: 'Saree',
    fabric: 'Pure Silk',
    color: 'Royal Magenta',
    mediaCount: 6,
    primaryImageUri: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80',
    descriptions: ['Traditional Maharashtra Paithani handwoven pallu with gold zari.'],
    isStarred: true,
    isPublishedToStore: true,
    publishedAt: 'Today, 02:45 AM',
    swatchesCount: 2,
    siblingSwatches: [
      { productCode: 'SAR-PAI-88001', colorHex: '#E91E63', colorwayName: 'Royal Magenta' },
      { productCode: 'SAR-PAI-88002', colorHex: '#38B4B4', colorwayName: 'Turquoise' },
    ],
  },
  {
    id: 'p-102',
    productCode: 'LEH-VEL-702',
    title: 'Bridal Velvet Embroidered Lehenga',
    category: 'Lehenga',
    fabric: 'Micro Velvet',
    color: 'Deep Maroon',
    mediaCount: 9,
    primaryImageUri: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80',
    descriptions: ['Heavy bridal dori and sequin work lehenga choli with double dupatta.'],
    isStarred: true,
    isPublishedToStore: true,
    publishedAt: 'Yesterday, 06:15 PM',
    swatchesCount: 1,
    siblingSwatches: [
      { productCode: 'LEH-VEL-70201', colorHex: '#800000', colorwayName: 'Deep Maroon' },
    ],
  },
];

export interface AdminVayyariStoreInventoryPageProps {
  products?: VayyariStarredProductItem[];
  onBack?: () => void;
  onNavigateToStorePublish?: () => void;
  onNavigateToStoreCuration?: (productId: string) => void;
  onResyncProduct?: (productId: string) => void;
}

export function AdminVayyariStoreInventoryPage({
  products = MOCK_PUBLISHED_PRODUCTS,
  onBack,
  onNavigateToStorePublish,
  onNavigateToStoreCuration,
  onResyncProduct,
}: AdminVayyariStoreInventoryPageProps) {
  const { tokens } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<StoreInventoryFilterState>(DEFAULT_STORE_INVENTORY_FILTER_STATE);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [resyncToast, setResyncToast] = useState<string | null>(null);

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
  };

  // Filtered list
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
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
        p.title.toLowerCase().includes(q) ||
        p.productCode.toLowerCase().includes(q) ||
        p.fabric.toLowerCase().includes(q);
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
  }, [products, filters, searchQuery]);

  const handleResync = (productId: string, code: string) => {
    onResyncProduct?.(productId);
    setResyncToast(`🔄 Triggered OG media re-sync for ${code}`);
    setTimeout(() => setResyncToast(null), 2500);
  };

  return (
    <YStack
      flex={1}
      width="100%"
      maxWidth={460}
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
        paddingVertical={10}
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
                In-Store Products
              </Text>
            </XStack>
            <Text fontSize={11} color={tokens.textMuted}>
              Synced Vayyari Catalog ➔ Store Engine
            </Text>
          </YStack>
        </XStack>

        {/* Publish More Shortcut Action */}
        <Pressable
          onPress={onNavigateToStorePublish}
          hitSlop={6}
          style={({ pressed }) => [
            styles.publishMoreBtn,
            {
              backgroundColor: pressed ? tokens.accentSubtle : tokens.surfaceRaised,
              borderColor: `${tokens.accent}50`,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Publish More Products"
        >
          <XStack alignItems="center" gap={4}>
            <LuPlus size={13} color={tokens.accent} />
            <Text fontSize={11} fontWeight="800" color={tokens.accent}>
              Publish More
            </Text>
          </XStack>
        </Pressable>
      </XStack>

      {/* ── SEARCH & FILTER BAR ── */}
      <YStack paddingHorizontal={12} paddingTop={10} gap={8}>
        <XStack alignItems="center" gap={8}>
          <XStack
            flex={1}
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.md}
            borderWidth={1}
            borderColor={tokens.border}
            paddingHorizontal={10}
            paddingVertical={6}
            alignItems="center"
            gap={8}
          >
            <LuSearch size={14} color={tokens.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search in-store products by code, fabric..."
              placeholderTextColor={tokens.textMuted}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={6} style={{ cursor: 'pointer' } as any}>
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
                cursor: 'pointer',
              } as any,
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
            <Pressable onPress={resetFilters} hitSlop={6} style={{ cursor: 'pointer' } as any}>
              <LuRotateCcw size={13} color={tokens.textMuted} />
            </Pressable>
          )}
        </XStack>

        {/* Category Horizontal Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap={6}>
            {CATEGORIES.map((cat) => {
              const isSelected = filters.category === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setFilters((f) => ({ ...f, category: cat }))}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: isSelected ? tokens.accent : tokens.surface,
                      borderColor: isSelected ? tokens.accent : tokens.border,
                      cursor: 'pointer',
                    } as any,
                  ]}
                >
                  <Text
                    fontSize={11}
                    fontWeight={isSelected ? '800' : '600'}
                    color={isSelected ? tokens.accentForeground : tokens.textSecondary}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </XStack>
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
                  <Pressable hitSlop={6} onPress={chip.onRemove} style={{ cursor: 'pointer' } as any}>
                    <LuX size={10} color={tokens.accent} />
                  </Pressable>
                </XStack>
              ))}
              <Pressable hitSlop={6} onPress={resetFilters} style={{ cursor: 'pointer' } as any}>
                <Text fontSize={10} fontWeight="700" color={tokens.textMuted} paddingHorizontal={4}>
                  Clear all
                </Text>
              </Pressable>
            </ScrollView>
          </XStack>
        )}
      </YStack>

      {/* ── HEADER SUBTITLE ── */}
      {filteredProducts.length > 0 && (
        <XStack paddingHorizontal={14} paddingTop={8} justifyContent="space-between" alignItems="center">
          <Text fontSize={11} fontWeight="700" color={tokens.textSecondary}>
            {filteredProducts.length} Items Live in Store Engine
          </Text>
        </XStack>
      )}

      {/* ── TOAST NOTIFICATION ── */}
      {resyncToast && (
        <View style={[styles.toastBanner, { backgroundColor: tokens.accent }]}>
          <Text fontSize={12} fontWeight="800" color={tokens.accentForeground} textAlign="center">
            {resyncToast}
          </Text>
        </View>
      )}

      {/* ── INVENTORY GRID BODY ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <YStack gap={10} padding={10}>
          {filteredProducts.length === 0 ? (
            <YStack alignItems="center" justifyContent="center" paddingVertical={50} gap={10}>
              <LuStore size={36} color={tokens.textMuted} />
              <Text fontSize={15} fontWeight="800" color={tokens.text}>
                Zero Products in Store
              </Text>
              <Text fontSize={12} color={tokens.textMuted} textAlign="center" maxWidth={260}>
                Publish starred items from the Publish Workbench to populate the Store Engine.
              </Text>
              {onNavigateToStorePublish && (
                <Pressable
                  onPress={onNavigateToStorePublish}
                  style={({ pressed }) => [
                    styles.emptyCtaBtn,
                    { backgroundColor: tokens.accent, opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <XStack alignItems="center" gap={6}>
                    <LuPlus size={14} color={tokens.accentForeground} />
                    <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
                      Publish Starred Products ➔
                    </Text>
                  </XStack>
                </Pressable>
              )}
            </YStack>
          ) : (
            <XStack flexWrap="wrap" marginHorizontal={-2}>
              {filteredProducts.map((item) => {
                const swatchesCount = item.swatchesCount || item.siblingSwatches?.length || 1;
                const siblingSwatches = item.siblingSwatches || [];

                return (
                  <YStack key={item.id} width="50%" padding={3}>
                    <YStack
                      backgroundColor={tokens.surface}
                      borderRadius={tokens.radius.sm}
                      borderWidth={1}
                      borderColor={tokens.border}
                      overflow="hidden"
                    >
                      {/* Product Image Tile */}
                      <YStack width="100%" aspectRatio={4 / 4.5} position="relative" backgroundColor={tokens.surfaceRaised}>
                        <Image
                          source={{ uri: item.primaryImageUri }}
                          style={styles.gridTileImage}
                          resizeMode="cover"
                        />

                        {/* Store Synced Pill */}
                        <XStack
                          position="absolute"
                          top={6}
                          left={6}
                          backgroundColor={tokens.accent}
                          paddingHorizontal={5}
                          paddingVertical={2}
                          borderRadius={4}
                          alignItems="center"
                          gap={3}
                        >
                          <LuCheckCheck size={10} color={tokens.accentForeground} />
                          <Text fontSize={9} fontWeight="800" color={tokens.accentForeground}>
                            Synced
                          </Text>
                        </XStack>

                        {/* Media Count */}
                        <XStack
                          position="absolute"
                          top={6}
                          right={6}
                          backgroundColor="rgba(0,0,0,0.5)"
                          paddingHorizontal={4}
                          paddingVertical={2}
                          borderRadius={3}
                          alignItems="center"
                        >
                          <Text fontSize={8} fontWeight="700" color="#fff">
                            📸 {item.mediaCount}
                          </Text>
                        </XStack>

                        {/* Bottom Overlay Info with Swatches Count */}
                        <YStack
                          position="absolute"
                          bottom={0}
                          left={0}
                          right={0}
                          paddingVertical={3}
                          paddingHorizontal={6}
                          backgroundColor="rgba(0,0,0,0.68)"
                        >
                          <XStack alignItems="center" justifyContent="space-between">
                            <Text fontSize={8.5} fontWeight="800" color="#ffffff" numberOfLines={1}>
                              {item.productCode}
                            </Text>
                            <XStack alignItems="center" gap={3}>
                              <LuLayers size={9} color="#fff" />
                              <Text fontSize={8} fontWeight="700" color="#fff">
                                {swatchesCount} {swatchesCount === 1 ? 'SKU' : 'SKUs'}
                              </Text>
                            </XStack>
                          </XStack>
                          <Text fontSize={7.5} color="rgba(255,255,255,0.85)" numberOfLines={1}>
                            {item.title}
                          </Text>
                        </YStack>
                      </YStack>

                      {/* Action Bar */}
                      <YStack padding={6} gap={4} backgroundColor={tokens.surface}>
                        <XStack alignItems="center" justifyContent="space-between" marginBottom={2}>
                          <XStack alignItems="center" gap={3}>
                            {siblingSwatches.length > 0 ? (
                              <>
                                {siblingSwatches.slice(0, 4).map((s: any, idx: number) => (
                                  <View
                                    key={idx}
                                    style={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: 4,
                                      backgroundColor: s.colorHex || '#1B4D3E',
                                      borderWidth: 1,
                                      borderColor: tokens.border,
                                    }}
                                  />
                                ))}
                                {siblingSwatches.length > 4 && (
                                  <Text fontSize={7.5} fontWeight="700" color={tokens.textMuted}>
                                    +{siblingSwatches.length - 4}
                                  </Text>
                                )}
                              </>
                            ) : (
                              <View
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 4,
                                  backgroundColor: '#1B4D3E',
                                  borderWidth: 1,
                                  borderColor: tokens.border,
                                }}
                              />
                            )}
                            <Text fontSize={8.5} fontWeight="700" color={tokens.textMuted}>
                              {swatchesCount} {swatchesCount === 1 ? 'SKU' : 'SKUs'}
                            </Text>
                          </XStack>
                          <XStack alignItems="center" gap={3}>
                            <LuClock size={9} color={tokens.textMuted} />
                            <Text fontSize={8.5} color={tokens.textMuted} numberOfLines={1}>
                              {item.publishedAt || 'Synced'}
                            </Text>
                          </XStack>
                        </XStack>

                        {/* Curate Button */}
                        <Pressable
                        onPress={() => onNavigateToStoreCuration?.(item.id)}
                        hitSlop={4}
                        style={({ pressed }) => [
                          styles.curateActionBtn,
                          {
                            backgroundColor: pressed ? tokens.accentSubtle : tokens.surfaceRaised,
                            borderColor: `${tokens.accent}60`,
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <XStack alignItems="center" justifyContent="center" gap={3}>
                          <Text fontSize={10} fontWeight="800" color={tokens.accent}>
                            Curate in Store ➔
                          </Text>
                        </XStack>
                      </Pressable>

                      {/* Re-sync Button */}
                      <Pressable
                        onPress={() => handleResync(item.id, item.productCode)}
                        hitSlop={4}
                        style={({ pressed }) => [
                          styles.resyncBtn,
                          { backgroundColor: pressed ? tokens.surfaceRaised : 'transparent' },
                        ]}
                      >
                        <XStack alignItems="center" justifyContent="center" gap={3}>
                          <LuRefreshCw size={9} color={tokens.textMuted} />
                          <Text fontSize={9} fontWeight="700" color={tokens.textMuted}>
                            Re-sync OG Media
                          </Text>
                        </XStack>
                      </Pressable>
                    </YStack>
                  </YStack>
                </YStack>
              );
            })}
          </XStack>
          )}
        </YStack>
      </ScrollView>

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
  publishMoreBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 2,
    outlineStyle: 'none',
  } as any,
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  gridTileImage: {
    width: '100%',
    height: '100%',
  },
  toastBanner: {
    marginHorizontal: 12,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  curateActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resyncBtn: {
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
});

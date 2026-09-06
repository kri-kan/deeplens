import React, { useState, useMemo } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { LuMenu, LuX } from 'react-icons/lu';
import { CatalogTemplate } from '../templates/CatalogTemplate';
import { Header } from '../organisms/Header/Header';
import { ProductGrid } from '../organisms/ProductGrid/ProductGrid';
import { Chip } from '../atoms/Chip/Chip';
import { Breadcrumbs } from '../molecules/Breadcrumbs/Breadcrumbs';
import { FilterSortBottomBar } from '../molecules/FilterSortBottomBar/FilterSortBottomBar';
import { SortBottomSheet, SortOption } from '../molecules/SortBottomSheet/SortBottomSheet';
import { FilterSidebar } from '../organisms/FilterSidebar/FilterSidebar';
import { FilterFacet } from '../organisms/FilterDrawer/FilterDrawer';
import { CartDrawer, CartItem } from '../organisms/CartDrawer/CartDrawer';
import { QuickPreviewModal, QuickPreviewProduct } from '../organisms/QuickPreviewModal/QuickPreviewModal';
import { useTheme, useResponsive } from '../../theme';

export type CatalogPageProps = {
  onOpenProduct?: (productName?: string) => void;
  onNavigateHome?: () => void;
};

const SORT_OPTIONS: SortOption[] = [
  { id: 'whatsNew', label: "What's new" },
  { id: 'priceDesc', label: 'Price - high to low' },
  { id: 'popular', label: 'Popularity' },
  { id: 'discount', label: 'Discount' },
  { id: 'priceAsc', label: 'Price - low to high' },
  { id: 'rating', label: 'Customer Rating' },
];

const FILTER_FACETS: FilterFacet[] = [
  {
    id: 'fabric',
    label: 'Fabric',
    options: [
      { id: 'mulberry', label: 'Mulberry Silk', count: 148 },
      { id: 'banarasi', label: 'Banarasi Brocade', count: 92 },
      { id: 'organza', label: 'Organza', count: 64 },
      { id: 'chanderi', label: 'Chanderi Zari', count: 45 },
      { id: 'linen', label: 'Linen Blend', count: 38 },
    ],
  },
  {
    id: 'price',
    label: 'Price',
    options: [
      { id: 'under2k', label: 'Under ₹2,000', count: 84 },
      { id: '2k_3500', label: '₹2,000 - ₹3,500', count: 215 },
      { id: '3500_5k', label: '₹3,500 - ₹5,000', count: 140 },
      { id: 'above5k', label: 'Above ₹5,000', count: 62 },
    ],
  },
  {
    id: 'color',
    label: 'Color',
    options: [
      { id: 'gold_ivory', label: 'Gold / Ivory', count: 88 },
      { id: 'rose_pink', label: 'Rose Pink', count: 65 },
      { id: 'slate_blue', label: 'Slate Blue', count: 42 },
      { id: 'emerald_green', label: 'Emerald Green', count: 39 },
    ],
  },
  {
    id: 'occasion',
    label: 'Occasion',
    options: [
      { id: 'festive', label: 'Festive Gala', count: 190 },
      { id: 'bridal', label: 'Bridal Trousseau', count: 85 },
      { id: 'evening', label: 'Evening Soiree', count: 112 },
      { id: 'casual', label: 'Casual Luxe', count: 74 },
    ],
  },
];

const INITIAL_PRODUCTS: QuickPreviewProduct[] = [
  {
    id: '1',
    name: 'Ivory Gold Brocade Saree',
    price: 3299,
    originalPrice: 4999,
    fabric: 'mulberry',
    color: 'gold_ivory',
    priceRange: '2k_3500',
    rating: 4.8,
    reviewsCount: 142,
    gradient: ['#edd9c5', '#d2a77a'] as [string, string],
    images: [
      { id: '1', label: 'Front Drape - Mulberry Silk', gradient: ['#edd9c5', '#d2a77a'] as [string, string] },
      { id: '2', label: 'Brocade Pallu & Tested Zari', gradient: ['#fff8e1', '#d4af37'] as [string, string] },
      { id: '3', label: 'Close-up Fabric Weave', gradient: ['#f5ede1', '#c7a36e'] as [string, string] },
      { id: '4', label: 'Cascade Silhouette', gradient: ['#ecdcc7', '#bfa06d'] as [string, string] },
    ],
    swatches: [
      { id: 's1', label: 'Pure Ivory Gold', template: 'solid', primaryColor: 'Cream Beige' },
      { id: 's2', label: 'Gold with Red Border', template: 'contrast-border', primaryColor: 'Cream Beige', secondaryColor: 'Ruby Red' },
      { id: 's3', label: 'Champagne Shimmer', template: 'multi-tone', primaryColor: 'Antique Gold', secondaryColor: 'Pure White', colorCount: 2 },
    ],
  },
  {
    id: '2',
    name: 'Rose Bloom Jacquard Saree',
    price: 2799,
    originalPrice: 4199,
    fabric: 'banarasi',
    color: 'rose_pink',
    priceRange: '2k_3500',
    rating: 4.6,
    reviewsCount: 89,
    gradient: ['#f3d6d8', '#cc8d9a'] as [string, string],
    images: [
      { id: '1', label: 'Rani Rose Front Drape', gradient: ['#f3d6d8', '#cc8d9a'] as [string, string] },
      { id: '2', label: 'Jacquard Weft Motifs', gradient: ['#f8bbd0', '#ad1457'] as [string, string] },
      { id: '3', label: 'Pleat Texture Detail', gradient: ['#fce4ec', '#d81b60'] as [string, string] },
      { id: '4', label: 'Back Fall Silhouette', gradient: ['#f06292', '#880e4f'] as [string, string] },
    ],
    swatches: [
      { id: 's1', label: 'Rose Pink', template: 'solid', primaryColor: 'Rose Pink' },
      { id: 's2', label: 'Rose & Wine Multi-Tone', template: 'multi-tone', primaryColor: 'Rose Pink', secondaryColor: 'Wine Maroon', colorCount: 2 },
      { id: 's3', label: 'Rose & Gold Zari Border', template: 'contrast-border', primaryColor: 'Rose Pink', secondaryColor: 'Antique Gold' },
    ],
  },
  {
    id: '3',
    name: 'Midnight Azure Silk Drape',
    price: 3499,
    originalPrice: 5299,
    fabric: 'organza',
    color: 'slate_blue',
    priceRange: '2k_3500',
    rating: 4.9,
    reviewsCount: 215,
    gradient: ['#dfe4f2', '#8aa0d7'] as [string, string],
    images: [
      { id: '1', label: 'Midnight Blue Regal Drape', gradient: ['#dfe4f2', '#8aa0d7'] as [string, string] },
      { id: '2', label: 'Silver Zari Border Reflection', gradient: ['#1565c0', '#e0e0e0'] as [string, string] },
      { id: '3', label: 'Organza Sheer Weave', gradient: ['#bbdefb', '#0d47a1'] as [string, string] },
      { id: '4', label: 'Pallu Tassel Finish', gradient: ['#0a2558', '#3f51b5'] as [string, string] },
    ],
    swatches: [
      { id: 's1', label: 'Royal Blue', template: 'solid', primaryColor: 'Royal Blue' },
      { id: 's2', label: 'Azure & Teal Multi-Tone', template: 'multi-tone', primaryColor: 'Royal Blue', secondaryColor: 'Teal Peacock', colorCount: 2 },
      { id: 's3', label: 'Navy & Gold Border', template: 'contrast-border', primaryColor: 'Navy Blue', secondaryColor: 'Antique Gold' },
    ],
  },
  {
    id: '4',
    name: 'Emerald Forest Organza Saree',
    price: 2199,
    originalPrice: 3899,
    fabric: 'organza',
    color: 'emerald_green',
    priceRange: '2k_3500',
    rating: 4.4,
    reviewsCount: 67,
    gradient: ['#dfe9d8', '#9ec38f'] as [string, string],
    images: [
      { id: '1', label: 'Forest Green Sheer Drape', gradient: ['#dfe9d8', '#9ec38f'] as [string, string] },
      { id: '2', label: 'Botanical Leaf Zari Weave', gradient: ['#c8e6c9', '#2e7d32'] as [string, string] },
      { id: '3', label: 'Pleat Cascade Detail', gradient: ['#e8f5e9', '#1b5e20'] as [string, string] },
      { id: '4', label: 'Border Trim Close-up', gradient: ['#81c784', '#004d40'] as [string, string] },
    ],
    swatches: [
      { id: 's1', label: 'Emerald Green', template: 'solid', primaryColor: 'Emerald' },
      { id: 's2', label: 'Emerald & Mustard Multi-Shade', template: 'multi-shade', primaryColor: 'Emerald', secondaryColor: 'Mustard', colorCount: 2 },
      { id: 's3', label: 'Peacock Multi-Tone', template: 'multi-tone', primaryColor: 'Emerald', secondaryColor: 'Teal Peacock', colorCount: 2 },
    ],
  },
  {
    id: '5',
    name: 'Warm Amber Chanderi Weave',
    price: 3899,
    originalPrice: 5999,
    fabric: 'chanderi',
    color: 'gold_ivory',
    priceRange: '3500_5k',
    rating: 4.7,
    reviewsCount: 110,
    gradient: ['#f5e6d3', '#c98a58'] as [string, string],
    images: [
      { id: '1', label: 'Golden Amber Classic Drape', gradient: ['#f5e6d3', '#c98a58'] as [string, string] },
      { id: '2', label: 'Chanderi Boota Motifs', gradient: ['#fff3e0', '#e65100'] as [string, string] },
      { id: '3', label: 'Tested Gold Border Piping', gradient: ['#ffe0b2', '#bf360c'] as [string, string] },
      { id: '4', label: 'Rich Pallu Sheen', gradient: ['#ffb74d', '#795548'] as [string, string] },
    ],
    swatches: [
      { id: 's1', label: 'Mustard Amber', template: 'solid', primaryColor: 'Mustard' },
      { id: 's2', label: 'Amber & Rust Multi-Tone', template: 'multi-tone', primaryColor: 'Mustard', secondaryColor: 'Rust Burnt', colorCount: 2 },
      { id: 's3', label: '3-Color Festive Pie', template: 'multi-shade', primaryColor: 'Mustard', secondaryColor: 'Rose Pink', tertiaryColor: 'Teal Peacock', colorCount: 3 },
    ],
  },
  {
    id: '6',
    name: 'Pearl Mist Handloom Saree',
    price: 1899,
    originalPrice: 3499,
    fabric: 'mulberry',
    color: 'slate_blue',
    priceRange: 'under2k',
    rating: 4.5,
    reviewsCount: 76,
    gradient: ['#ebe5df', '#baa694'] as [string, string],
    images: [
      { id: '1', label: 'Subtle Pearl Grey Silk Drape', gradient: ['#ebe5df', '#baa694'] as [string, string] },
      { id: '2', label: 'Silver Zari Pallu Reflection', gradient: ['#f5f5f5', '#9e9e9e'] as [string, string] },
      { id: '3', label: 'Fine Warp Thread Texture', gradient: ['#eeeeee', '#616161'] as [string, string] },
      { id: '4', label: 'Graceful Evening Silhouette', gradient: ['#e0e0e0', '#424242'] as [string, string] },
    ],
    swatches: [
      { id: 's1', label: 'Pure White & Silver', template: 'solid', primaryColor: 'Pure White' },
      { id: 's2', label: '4-Color Cross Sunset', template: 'multi-shade', primaryColor: 'Ruby Red', secondaryColor: 'Tangerine', tertiaryColor: 'Mustard', quaternaryColor: 'Rust Burnt', colorCount: 4 },
      { id: 's3', label: 'Multicolor Kalamkari', template: 'multicolor', primaryColor: 'Multicolor' },
    ],
  },
];

export function CatalogPage({ onOpenProduct, onNavigateHome }: CatalogPageProps) {
  const { tokens } = useTheme();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const isCompact = isMobile || isTablet;

  // Stays expanded by default if the available area is wide (Desktop)
  const [isFilterSidebarExpanded, setIsFilterSidebarExpanded] = useState(true);
  const [leftFilterDrawerOpen, setLeftFilterDrawerOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>('popular');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [quickPreviewProduct, setQuickPreviewProduct] = useState<QuickPreviewProduct | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: '1',
      name: 'Ivory Flow Mulberry Silk Saree',
      color: 'Ivory Gold',
      size: 'Free Size',
      price: '₹3,299',
      gradient: ['#edd9c5', '#d2a77a'],
    },
  ]);

  const handleToggleOption = (facetId: string, optionId: string) => {
    setSelectedFilters((prev) => {
      const cur = prev[facetId] || [];
      const next = cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId];
      return { ...prev, [facetId]: next };
    });
  };

  const handleClearAll = () => {
    setSelectedFilters({});
  };

  // Compute total active filters
  const activeFilterCount = useMemo(() => {
    return Object.values(selectedFilters).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  }, [selectedFilters]);

  // Filter & sort products
  const displayedProducts = useMemo(() => {
    let result = [...INITIAL_PRODUCTS];

    // Filter by fabric
    const selectedFabrics = selectedFilters.fabric || [];
    if (selectedFabrics.length > 0) {
      result = result.filter((p) => p.fabric && selectedFabrics.includes(p.fabric));
    }

    // Filter by price range
    const selectedPrices = selectedFilters.price || [];
    if (selectedPrices.length > 0) {
      result = result.filter((p) => p.priceRange && selectedPrices.includes(p.priceRange));
    }

    // Filter by color
    const selectedColors = selectedFilters.color || [];
    if (selectedColors.length > 0) {
      result = result.filter((p) => p.color && selectedColors.includes(p.color));
    }

    // Sort
    if (sortBy === 'priceAsc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'priceDesc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return result;
  }, [selectedFilters, sortBy]);

  const currentSortLabel = SORT_OPTIONS.find((s) => s.id === sortBy)?.label || 'Popularity';

  return (
    <>
      <CatalogTemplate
      header={
        <Header
          onOpenCart={() => setCartOpen(true)}
        />
      }
      breadcrumbs={
        <Breadcrumbs
          items={[
            { label: 'Home', onPress: onNavigateHome },
            { label: 'Women' },
            { label: 'Festive Handloom Sarees' },
          ]}
        />
      }
      /* Left Filter Sidebar: stays expanded when wide, collapsible via hamburger inside tab */
      isFilterSidebarExpanded={isFilterSidebarExpanded}
      filterSidebar={
        <FilterSidebar
          facets={FILTER_FACETS}
          selectedValues={selectedFilters}
          onToggleOption={handleToggleOption}
          onClearAll={handleClearAll}
          onToggleCollapse={() => setIsFilterSidebarExpanded(false)}
        />
      }
      summaryBar={
        <YStack gap={10}>
          <XStack
            justifyContent="space-between"
            alignItems="center"
            paddingVertical={4}
            flexWrap="wrap"
            gap={10}
          >
            {/* Left: Icon-only hamburger when collapsed (no label); hidden when expanded since icon is inside sidebar */}
            <XStack alignItems="center" gap={12}>
              {!isDesktop || !isFilterSidebarExpanded ? (
                <XStack
                  alignItems="center"
                  justifyContent="center"
                  cursor="pointer"
                  width={38}
                  height={38}
                  borderRadius={10}
                  borderWidth={1}
                  borderColor={tokens.border}
                  backgroundColor={tokens.surface}
                  hoverStyle={{ backgroundColor: tokens.surfaceRaised, borderColor: tokens.borderStrong }}
                  pressStyle={{ scale: 0.94 }}
                  position="relative"
                  role="button"
                  aria-label="Filters"
                  onPress={() => {
                    if (isDesktop) {
                      setIsFilterSidebarExpanded(true);
                    } else {
                      setLeftFilterDrawerOpen(true);
                    }
                  }}
                >
                  <LuMenu size={18} color={tokens.text} />
                  {activeFilterCount > 0 ? (
                    <XStack
                      position="absolute"
                      top={-4}
                      right={-4}
                      width={16}
                      height={16}
                      borderRadius={9999}
                      backgroundColor={tokens.accent}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text fontSize={9} fontWeight="900" color={tokens.accentForeground}>
                        {activeFilterCount}
                      </Text>
                    </XStack>
                  ) : null}
                </XStack>
              ) : null}

              <Text fontSize={13} fontWeight="700" color={tokens.textSecondary}>
                <Text color={tokens.accent} fontWeight="800">{displayedProducts.length}</Text> sarees found
              </Text>
            </XStack>

            {/* Right: Desktop Sort Chips */}
            {!isCompact ? (
              <XStack alignItems="center" gap={8}>
                <Text fontSize={12} color={tokens.textMuted} fontWeight="600">Sort:</Text>
                <Chip
                  label="Popular"
                  active={sortBy === 'popular'}
                  onPress={() => setSortBy('popular')}
                />
                <Chip
                  label="Price: Low to High"
                  active={sortBy === 'priceAsc'}
                  onPress={() => setSortBy('priceAsc')}
                />
                <Chip
                  label="Price: High to Low"
                  active={sortBy === 'priceDesc'}
                  onPress={() => setSortBy('priceDesc')}
                />
              </XStack>
            ) : null}
          </XStack>

          {/* Active Filter Badges with Dismiss Tags */}
          {activeFilterCount > 0 ? (
            <XStack flexWrap="wrap" gap={8} alignItems="center">
              <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                Active:
              </Text>
              {Object.entries(selectedFilters).flatMap(([facetId, optionIds]) =>
                optionIds.map((optId) => {
                  const facet = FILTER_FACETS.find((f) => f.id === facetId);
                  const option = facet?.options.find((o) => o.id === optId);
                  if (!option) return null;

                  return (
                    <XStack
                      key={`${facetId}-${optId}`}
                      alignItems="center"
                      gap={6}
                      paddingHorizontal={10}
                      paddingVertical={4}
                      borderRadius={9999}
                      backgroundColor={tokens.accentSubtle}
                      borderWidth={1}
                      borderColor={tokens.accent}
                      cursor="pointer"
                      onPress={() => handleToggleOption(facetId, optId)}
                      hoverStyle={{ opacity: 0.8 }}
                    >
                      <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                        {option.label}
                      </Text>
                      <LuX size={12} color={tokens.accent} />
                    </XStack>
                  );
                })
              )}
              <XStack cursor="pointer" onPress={handleClearAll}>
                <Text fontSize={11} fontWeight="800" color={tokens.textMuted} hoverStyle={{ color: tokens.error }}>
                  Clear All
                </Text>
              </XStack>
            </XStack>
          ) : null}
        </YStack>
      }
      productGrid={
        <ProductGrid
          products={displayedProducts}
          onPress={(id: string) => onOpenProduct?.(displayedProducts.find((p) => p.id === id)?.name)}
          onLongPress={(id: string) => setQuickPreviewProduct(displayedProducts.find((p) => p.id === id) || null)}
        />
      }
      stickyBottomBar={
        <FilterSortBottomBar
          onPressSort={() => setSortSheetOpen(true)}
          onPressFilter={() => setLeftFilterDrawerOpen(true)}
          activeFilterCount={activeFilterCount}
          currentSortLabel={currentSortLabel}
        />
      }
      /* Left Filter Drawer (Slides out when opened on mobile/tablet or from hamburger) */
      filterDrawerModal={
        leftFilterDrawerOpen ? (
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
            zIndex={300}
            onPress={() => setLeftFilterDrawerOpen(false)}
          >
            <YStack
              width={isMobile ? 320 : 360}
              height="100%"
              backgroundColor={tokens.surface}
              onPress={(e) => e.stopPropagation()}
            >
              <FilterSidebar
                facets={FILTER_FACETS}
                selectedValues={selectedFilters}
                onToggleOption={handleToggleOption}
                onClearAll={handleClearAll}
                isDrawer={true}
                onClose={() => setLeftFilterDrawerOpen(false)}
              />
            </YStack>
          </YStack>
        ) : null
      }
      sortModal={
        sortSheetOpen ? (
          <SortBottomSheet
            options={SORT_OPTIONS}
            selectedId={sortBy}
            onSelect={(id) => setSortBy(id)}
            onClose={() => setSortSheetOpen(false)}
          />
        ) : null
      }
      cartDrawer={
        cartOpen ? (
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.4)"
            justifyContent="flex-end"
            zIndex={300}
          >
            <CartDrawer
              items={cartItems}
              onClose={() => setCartOpen(false)}
              onCheckout={() => {
                alert('Proceeding to Checkout');
                setCartOpen(false);
              }}
            />
          </YStack>
        ) : null
      }
    />

    {/* Long-Press / Click Quick Preview Modal */}
    <QuickPreviewModal
      open={!!quickPreviewProduct}
      product={quickPreviewProduct}
      onClose={() => setQuickPreviewProduct(null)}
      onAddToCart={(p, swatchLabel) => {
        setCartItems((prev) => [
          ...prev,
          {
            id: `${p.id}-${Date.now()}`,
            name: p.name,
            color: swatchLabel || 'Pure Ivory Gold',
            size: 'Free Size',
            price: `₹${p.price.toLocaleString('en-IN')}`,
            gradient: p.gradient || ['#edd9c5', '#d2a77a'],
          },
        ]);
        setCartOpen(true);
      }}
      onViewDetails={(name) => {
        setQuickPreviewProduct(null);
        onOpenProduct?.(name);
      }}
    />
  </>
);
}

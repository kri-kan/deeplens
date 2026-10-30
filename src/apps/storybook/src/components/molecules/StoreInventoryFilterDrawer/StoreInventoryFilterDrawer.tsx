import React, { useState, useEffect } from 'react';
import {
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuX,
  LuCheck,
  LuSlidersHorizontal,
  LuRotateCcw,
  LuSearch,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.88, 380);

export type StoreSortOption = 'newest' | 'price_low' | 'price_high' | 'media_count';
export type PriceRangeOption = 'all' | 'under_5k' | '5k_10k' | '10k_20k' | 'above_20k';
export type StoreLifecycleFilter = 'all' | 'available' | 'few_left' | 'sold_out' | 'out_of_stock';
export type SkuFilterOption = 'all' | 'multi' | 'single';

export const CATEGORIES = ['All', 'Saree', 'Dress Material', 'Kurti / Set', 'Lehenga', 'Gown', 'Western', 'Kids'];
export const FABRIC_OPTIONS = ['All', 'Pure Silk', 'Kanjivaram', 'Banarasi', 'Georgette', 'Chiffon', 'Cotton', 'Linen', 'Organza', 'Tussar'];

export const PRICE_OPTIONS: { id: PriceRangeOption; label: string }[] = [
  { id: 'all', label: 'All Prices' },
  { id: 'under_5k', label: 'Under ₹5,000' },
  { id: '5k_10k', label: '₹5,000 – ₹10,000' },
  { id: '10k_20k', label: '₹10,000 – ₹20,000' },
  { id: 'above_20k', label: 'Above ₹20,000' },
];

export const SORT_OPTIONS: { id: StoreSortOption; label: string }[] = [
  { id: 'newest', label: 'Newest First' },
  { id: 'price_low', label: 'Price: Low to High' },
  { id: 'price_high', label: 'Price: High to Low' },
  { id: 'media_count', label: 'Most Images' },
];

export const LIFECYCLE_FILTERS: { id: StoreLifecycleFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All Status', icon: '⚪' },
  { id: 'available', label: 'In Stock', icon: '🟢' },
  { id: 'few_left', label: 'Few Left', icon: '🟡' },
  { id: 'sold_out', label: 'Sold Out', icon: '🔴' },
  { id: 'out_of_stock', label: 'Out of Stock', icon: '⚫' },
];

export interface StoreInventoryFilterState {
  sortBy: StoreSortOption;
  lifecycle: StoreLifecycleFilter;
  category: string;
  fabric: string;
  priceRange: PriceRangeOption;
  skuType?: SkuFilterOption;
}

export const DEFAULT_STORE_INVENTORY_FILTER_STATE: StoreInventoryFilterState = {
  sortBy: 'newest',
  lifecycle: 'all',
  category: 'All',
  fabric: 'All',
  priceRange: 'all',
  skuType: 'all',
};

export const getActiveStoreInventoryFilterCount = (
  filter: StoreInventoryFilterState
): number => {
  let count = 0;
  if (filter.sortBy && filter.sortBy !== 'newest') count++;
  if (filter.lifecycle && filter.lifecycle !== 'all') count++;
  if (filter.category && filter.category !== 'All') count++;
  if (filter.fabric && filter.fabric !== 'All') count++;
  if (filter.priceRange && filter.priceRange !== 'all') count++;
  if (filter.skuType && filter.skuType !== 'all') count++;
  return count;
};

const SECTIONS = [
  'Sort',
  'Availability',
  'Category',
  'Fabric',
  'Price Range',
  'SKU Swatches',
] as const;
type SectionKey = typeof SECTIONS[number];

const SKU_OPTIONS: { id: SkuFilterOption; label: string; desc: string }[] = [
  { id: 'all', label: 'All SKUs', desc: 'Show all catalog product groupings' },
  { id: 'multi', label: 'Multi-SKU (2+)', desc: 'Products with 2 or more colour variants' },
  { id: 'single', label: 'Single SKU', desc: 'Standalone single colourway only' },
];

export interface StoreInventoryFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  current?: StoreInventoryFilterState;
  onApply: (filters: StoreInventoryFilterState) => void;
  categoryOptions?: string[];
  fabricOptions?: string[];
}

export function StoreInventoryFilterDrawer({
  visible,
  onClose,
  current = DEFAULT_STORE_INVENTORY_FILTER_STATE,
  onApply,
  categoryOptions = CATEGORIES,
  fabricOptions = FABRIC_OPTIONS,
}: StoreInventoryFilterDrawerProps) {
  const { tokens } = useTheme();
  const [activeSection, setActiveSection] = useState<SectionKey>('Sort');
  const [draft, setDraft] = useState<StoreInventoryFilterState>(current);
  const [fabricSearchQuery, setFabricSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setDraft(current);
      setFabricSearchQuery('');
    }
  }, [visible, current]);

  if (!visible) return null;

  const activeCount = getActiveStoreInventoryFilterCount(draft);

  const getSectionBadge = (section: SectionKey): number => {
    switch (section) {
      case 'Sort':
        return draft.sortBy !== 'newest' ? 1 : 0;
      case 'Availability':
        return draft.lifecycle !== 'all' ? 1 : 0;
      case 'Category':
        return draft.category !== 'All' ? 1 : 0;
      case 'Fabric':
        return draft.fabric !== 'All' ? 1 : 0;
      case 'Price Range':
        return draft.priceRange !== 'all' ? 1 : 0;
      case 'SKU Swatches':
        return draft.skuType && draft.skuType !== 'all' ? 1 : 0;
      default:
        return 0;
    }
  };

  const handleClear = () => {
    setDraft({ ...DEFAULT_STORE_INVENTORY_FILTER_STATE });
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const filteredFabrics = fabricOptions.filter((f) =>
    f.toLowerCase().includes(fabricSearchQuery.toLowerCase().trim())
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <XStack flex={1} backgroundColor="rgba(0,0,0,0.5)">
        {/* Left Drawer Surface */}
        <YStack
          width={DRAWER_WIDTH}
          height="100%"
          backgroundColor={tokens.surface}
          borderRightWidth={1}
          borderRightColor={tokens.border}
          shadowColor="#000"
          shadowOffset={{ width: 4, height: 0 }}
          shadowOpacity={0.2}
          shadowRadius={16}
          elevation={12}
        >
          {/* Header */}
          <XStack
            height={52}
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={14}
            borderBottomWidth={1}
            borderBottomColor={tokens.border}
            backgroundColor={tokens.surface}
          >
            <XStack alignItems="center" gap={8}>
              <LuSlidersHorizontal size={17} color={tokens.text} />
              <Text fontSize={14} fontWeight="800" color={tokens.text} letterSpacing={0.6}>
                FILTERS
              </Text>
              {activeCount > 0 && (
                <XStack
                  paddingHorizontal={6}
                  paddingVertical={1}
                  borderRadius={tokens.radius.full}
                  backgroundColor={tokens.accent}
                >
                  <Text fontSize={10} fontWeight="800" color="#ffffff">
                    {activeCount}
                  </Text>
                </XStack>
              )}
            </XStack>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close filter drawer"
              onPress={onClose}
              style={{ cursor: 'pointer' } as any}
            >
              <XStack
                width={28}
                height={28}
                borderRadius={tokens.radius.full}
                backgroundColor={tokens.surfaceRaised}
                alignItems="center"
                justifyContent="center"
              >
                <LuX size={15} color={tokens.text} />
              </XStack>
            </Pressable>
          </XStack>

          {/* Two-Panel Split Body */}
          <XStack flex={1}>
            {/* Left Nav Rail */}
            <YStack
              width={118}
              height="100%"
              backgroundColor={tokens.surfaceRaised}
              borderRightWidth={1}
              borderRightColor={tokens.border}
            >
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {SECTIONS.map((section) => {
                  const isActive = activeSection === section;
                  const badge = getSectionBadge(section);
                  return (
                    <Pressable
                      key={section}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${section} filters`}
                      onPress={() => setActiveSection(section)}
                      style={{ cursor: 'pointer' } as any}
                    >
                      <XStack
                        height={46}
                        alignItems="center"
                        justifyContent="space-between"
                        paddingHorizontal={8}
                        gap={4}
                        backgroundColor={isActive ? tokens.surface : 'transparent'}
                        borderLeftWidth={isActive ? 3.5 : 0}
                        borderLeftColor={tokens.accent}
                      >
                        <Text
                          fontSize={11}
                          fontWeight={isActive ? '800' : '600'}
                          color={isActive ? tokens.accent : tokens.textMuted}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          flex={1}
                        >
                          {section}
                        </Text>

                        {badge > 0 && (
                          <XStack
                            width={16}
                            height={16}
                            borderRadius={8}
                            backgroundColor={tokens.accent}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Text fontSize={9} fontWeight="800" color="#ffffff">
                              {badge}
                            </Text>
                          </XStack>
                        )}
                      </XStack>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </YStack>

            {/* Right Details Panel */}
            <YStack flex={1} height="100%" backgroundColor={tokens.surface}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 14, gap: 10 }}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. SORT SECTION */}
                {activeSection === 'Sort' && (
                  <YStack gap={8}>
                    {SORT_OPTIONS.map((opt) => {
                      const isSelected = draft.sortBy === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => setDraft((d) => ({ ...d, sortBy: opt.id }))}
                          style={{ cursor: 'pointer' } as any}
                        >
                          <XStack
                            alignItems="center"
                            gap={10}
                            paddingVertical={10}
                            paddingHorizontal={10}
                            borderRadius={tokens.radius.sm}
                            backgroundColor={isSelected ? `${tokens.accent}14` : 'transparent'}
                          >
                            <XStack
                              width={18}
                              height={18}
                              borderRadius={9}
                              borderWidth={1.5}
                              borderColor={isSelected ? tokens.accent : tokens.border}
                              alignItems="center"
                              justifyContent="center"
                            >
                              {isSelected && (
                                <XStack
                                  width={8}
                                  height={8}
                                  borderRadius={4}
                                  backgroundColor={tokens.accent}
                                />
                              )}
                            </XStack>
                            <YStack flex={1}>
                              <Text
                                fontSize={12}
                                fontWeight={isSelected ? '700' : '500'}
                                color={isSelected ? tokens.accent : tokens.text}
                              >
                                {opt.label}
                              </Text>
                            </YStack>
                          </XStack>
                        </Pressable>
                      );
                    })}
                  </YStack>
                )}

                {/* 2. AVAILABILITY / LIFECYCLE SECTION */}
                {activeSection === 'Availability' && (
                  <YStack gap={8}>
                    {LIFECYCLE_FILTERS.map((item) => {
                      const isSelected = draft.lifecycle === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => setDraft((d) => ({ ...d, lifecycle: item.id }))}
                          style={{ cursor: 'pointer' } as any}
                        >
                          <XStack
                            alignItems="center"
                            gap={10}
                            paddingVertical={10}
                            paddingHorizontal={10}
                            borderRadius={tokens.radius.sm}
                            backgroundColor={isSelected ? `${tokens.accent}14` : 'transparent'}
                          >
                            <XStack
                              width={18}
                              height={18}
                              borderRadius={9}
                              borderWidth={1.5}
                              borderColor={isSelected ? tokens.accent : tokens.border}
                              alignItems="center"
                              justifyContent="center"
                            >
                              {isSelected && (
                                <XStack
                                  width={8}
                                  height={8}
                                  borderRadius={4}
                                  backgroundColor={tokens.accent}
                                />
                              )}
                            </XStack>
                            <XStack alignItems="center" gap={6} flex={1}>
                              <Text fontSize={13}>{item.icon}</Text>
                              <Text
                                fontSize={12}
                                fontWeight={isSelected ? '700' : '500'}
                                color={isSelected ? tokens.accent : tokens.text}
                              >
                                {item.label}
                              </Text>
                            </XStack>
                          </XStack>
                        </Pressable>
                      );
                    })}
                  </YStack>
                )}

                {/* 3. CATEGORY SECTION */}
                {activeSection === 'Category' && (
                  <YStack gap={8}>
                    {categoryOptions.map((cat) => {
                      const isSelected = draft.category === cat;
                      return (
                        <Pressable
                          key={cat}
                          onPress={() => setDraft((d) => ({ ...d, category: cat }))}
                          style={{ cursor: 'pointer' } as any}
                        >
                          <XStack
                            alignItems="center"
                            gap={10}
                            paddingVertical={10}
                            paddingHorizontal={10}
                            borderRadius={tokens.radius.sm}
                            backgroundColor={isSelected ? `${tokens.accent}14` : 'transparent'}
                          >
                            <XStack
                              width={18}
                              height={18}
                              borderRadius={9}
                              borderWidth={1.5}
                              borderColor={isSelected ? tokens.accent : tokens.border}
                              alignItems="center"
                              justifyContent="center"
                            >
                              {isSelected && (
                                <XStack
                                  width={8}
                                  height={8}
                                  borderRadius={4}
                                  backgroundColor={tokens.accent}
                                />
                              )}
                            </XStack>
                            <Text
                              fontSize={12}
                              fontWeight={isSelected ? '700' : '500'}
                              color={isSelected ? tokens.accent : tokens.text}
                            >
                              {cat}
                            </Text>
                          </XStack>
                        </Pressable>
                      );
                    })}
                  </YStack>
                )}

                {/* 4. FABRIC SECTION */}
                {activeSection === 'Fabric' && (
                  <YStack gap={8}>
                    {/* Search inside Fabric */}
                    <XStack
                      height={34}
                      borderRadius={tokens.radius.sm}
                      borderWidth={1}
                      borderColor={tokens.border}
                      backgroundColor={tokens.surfaceRaised}
                      paddingHorizontal={8}
                      alignItems="center"
                      gap={6}
                      marginBottom={4}
                    >
                      <LuSearch size={13} color={tokens.textMuted} />
                      <TextInput
                        value={fabricSearchQuery}
                        onChangeText={setFabricSearchQuery}
                        placeholder="Search fabrics..."
                        placeholderTextColor={tokens.textMuted}
                        style={{
                          flex: 1,
                          fontSize: 11,
                          color: tokens.text,
                          paddingVertical: 2,
                          outlineStyle: 'none',
                        } as any}
                      />
                      {fabricSearchQuery.length > 0 && (
                        <Pressable
                          onPress={() => setFabricSearchQuery('')}
                          style={{ cursor: 'pointer' } as any}
                        >
                          <LuX size={12} color={tokens.textMuted} />
                        </Pressable>
                      )}
                    </XStack>

                    {filteredFabrics.map((fab) => {
                      const isSelected = draft.fabric === fab;
                      return (
                        <Pressable
                          key={fab}
                          onPress={() => setDraft((d) => ({ ...d, fabric: fab }))}
                          style={{ cursor: 'pointer' } as any}
                        >
                          <XStack
                            alignItems="center"
                            gap={10}
                            paddingVertical={9}
                            paddingHorizontal={10}
                            borderRadius={tokens.radius.sm}
                            backgroundColor={isSelected ? `${tokens.accent}14` : 'transparent'}
                          >
                            <XStack
                              width={18}
                              height={18}
                              borderRadius={9}
                              borderWidth={1.5}
                              borderColor={isSelected ? tokens.accent : tokens.border}
                              alignItems="center"
                              justifyContent="center"
                            >
                              {isSelected && (
                                <XStack
                                  width={8}
                                  height={8}
                                  borderRadius={4}
                                  backgroundColor={tokens.accent}
                                />
                              )}
                            </XStack>
                            <Text
                              fontSize={12}
                              fontWeight={isSelected ? '700' : '500'}
                              color={isSelected ? tokens.accent : tokens.text}
                            >
                              {fab}
                            </Text>
                          </XStack>
                        </Pressable>
                      );
                    })}
                  </YStack>
                )}

                {/* 5. PRICE RANGE SECTION */}
                {activeSection === 'Price Range' && (
                  <YStack gap={8}>
                    {PRICE_OPTIONS.map((p) => {
                      const isSelected = draft.priceRange === p.id;
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => setDraft((d) => ({ ...d, priceRange: p.id }))}
                          style={{ cursor: 'pointer' } as any}
                        >
                          <XStack
                            alignItems="center"
                            gap={10}
                            paddingVertical={10}
                            paddingHorizontal={10}
                            borderRadius={tokens.radius.sm}
                            backgroundColor={isSelected ? `${tokens.accent}14` : 'transparent'}
                          >
                            <XStack
                              width={18}
                              height={18}
                              borderRadius={9}
                              borderWidth={1.5}
                              borderColor={isSelected ? tokens.accent : tokens.border}
                              alignItems="center"
                              justifyContent="center"
                            >
                              {isSelected && (
                                <XStack
                                  width={8}
                                  height={8}
                                  borderRadius={4}
                                  backgroundColor={tokens.accent}
                                />
                              )}
                            </XStack>
                            <Text
                              fontSize={12}
                              fontWeight={isSelected ? '700' : '500'}
                              color={isSelected ? tokens.accent : tokens.text}
                            >
                              {p.label}
                            </Text>
                          </XStack>
                        </Pressable>
                      );
                    })}
                  </YStack>
                )}

                {/* 6. SKU SWATCHES SECTION */}
                {activeSection === 'SKU Swatches' && (
                  <YStack gap={8}>
                    {SKU_OPTIONS.map((opt) => {
                      const isSelected = (draft.skuType || 'all') === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => setDraft((d) => ({ ...d, skuType: opt.id }))}
                          style={{ cursor: 'pointer' } as any}
                        >
                          <XStack
                            alignItems="center"
                            gap={10}
                            paddingVertical={10}
                            paddingHorizontal={10}
                            borderRadius={tokens.radius.sm}
                            backgroundColor={isSelected ? `${tokens.accent}14` : 'transparent'}
                          >
                            <XStack
                              width={18}
                              height={18}
                              borderRadius={9}
                              borderWidth={1.5}
                              borderColor={isSelected ? tokens.accent : tokens.border}
                              alignItems="center"
                              justifyContent="center"
                            >
                              {isSelected && (
                                <XStack
                                  width={8}
                                  height={8}
                                  borderRadius={4}
                                  backgroundColor={tokens.accent}
                                />
                              )}
                            </XStack>
                            <YStack flex={1} gap={2}>
                              <Text
                                fontSize={12}
                                fontWeight={isSelected ? '700' : '500'}
                                color={isSelected ? tokens.accent : tokens.text}
                              >
                                {opt.label}
                              </Text>
                              <Text fontSize={10} color={tokens.textMuted}>
                                {opt.desc}
                              </Text>
                            </YStack>
                          </XStack>
                        </Pressable>
                      );
                    })}
                  </YStack>
                )}
              </ScrollView>
            </YStack>
          </XStack>

          {/* Footer Action Buttons */}
          <XStack
            height={56}
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal={12}
            borderTopWidth={1}
            borderTopColor={tokens.border}
            backgroundColor={tokens.surface}
            gap={10}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
              onPress={handleClear}
              style={{ flex: 1, cursor: 'pointer' } as any}
            >
              <XStack
                height={38}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                alignItems="center"
                justifyContent="center"
                gap={6}
                pressStyle={{ opacity: 0.8 }}
              >
                <LuRotateCcw size={13} color={tokens.textMuted} />
                <Text fontSize={12} fontWeight="700" color={tokens.text}>
                  Clear
                </Text>
              </XStack>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Apply filters"
              onPress={handleApply}
              style={{ flex: 1.5, cursor: 'pointer' } as any}
            >
              <XStack
                height={38}
                borderRadius={tokens.radius.md}
                backgroundColor={tokens.accent}
                alignItems="center"
                justifyContent="center"
                gap={6}
                pressStyle={{ opacity: 0.85 }}
              >
                <LuCheck size={14} color="#ffffff" />
                <Text fontSize={12} fontWeight="800" color="#ffffff">
                  Apply {activeCount > 0 ? `(${activeCount})` : ''}
                </Text>
              </XStack>
            </Pressable>
          </XStack>
        </YStack>

        {/* Dismissable Backdrop click */}
        <TouchableWithoutFeedback onPress={onClose}>
          <XStack flex={1} />
        </TouchableWithoutFeedback>
      </XStack>
    </Modal>
  );
}

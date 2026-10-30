import React, { useState, useEffect } from 'react';
import {
  Modal,
  ScrollView,
  TouchableOpacity,
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
} from '../../icons/lu';
import { useTheme } from '@/theme';
import {
  StoreSortOption,
  PriceRangeOption,
  StoreLifecycleFilter,
  SkuFilterOption,
  CATEGORIES,
  FABRIC_OPTIONS,
  PRICE_OPTIONS,
  SORT_OPTIONS,
  LIFECYCLE_FILTERS,
  StoreInventoryFilterState,
  DEFAULT_STORE_INVENTORY_FILTER_STATE,
  getActiveStoreInventoryFilterCount,
  getStoreInventorySectionBadge,
  StoreInventorySectionKey,
} from '@/utils/storeInventoryFilterRules';

export {
  StoreSortOption,
  PriceRangeOption,
  StoreLifecycleFilter,
  SkuFilterOption,
  CATEGORIES,
  FABRIC_OPTIONS,
  PRICE_OPTIONS,
  SORT_OPTIONS,
  LIFECYCLE_FILTERS,
  StoreInventoryFilterState,
  DEFAULT_STORE_INVENTORY_FILTER_STATE,
  getActiveStoreInventoryFilterCount,
  getStoreInventorySectionBadge,
  StoreInventorySectionKey,
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.88, 380);

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
    return getStoreInventorySectionBadge(section, draft);
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

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close filter drawer"
              activeOpacity={0.7}
              onPress={onClose}
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
            </TouchableOpacity>
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
                    <TouchableOpacity
                      key={section}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${section} filters`}
                      activeOpacity={0.7}
                      onPress={() => setActiveSection(section)}
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
                    </TouchableOpacity>
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
                        <TouchableOpacity
                          key={opt.id}
                          activeOpacity={0.7}
                          onPress={() => setDraft((d) => ({ ...d, sortBy: opt.id }))}
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
                        </TouchableOpacity>
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
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.7}
                          onPress={() => setDraft((d) => ({ ...d, lifecycle: item.id }))}
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
                        </TouchableOpacity>
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
                        <TouchableOpacity
                          key={cat}
                          activeOpacity={0.7}
                          onPress={() => setDraft((d) => ({ ...d, category: cat }))}
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
                        </TouchableOpacity>
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
                        }}
                      />
                      {fabricSearchQuery.length > 0 && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setFabricSearchQuery('')}
                        >
                          <LuX size={12} color={tokens.textMuted} />
                        </TouchableOpacity>
                      )}
                    </XStack>

                    {filteredFabrics.map((fab) => {
                      const isSelected = draft.fabric === fab;
                      return (
                        <TouchableOpacity
                          key={fab}
                          activeOpacity={0.7}
                          onPress={() => setDraft((d) => ({ ...d, fabric: fab }))}
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
                        </TouchableOpacity>
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
                        <TouchableOpacity
                          key={p.id}
                          activeOpacity={0.7}
                          onPress={() => setDraft((d) => ({ ...d, priceRange: p.id }))}
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
                        </TouchableOpacity>
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
                        <TouchableOpacity
                          key={opt.id}
                          activeOpacity={0.7}
                          onPress={() => setDraft((d) => ({ ...d, skuType: opt.id }))}
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
                        </TouchableOpacity>
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
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
              activeOpacity={0.7}
              onPress={handleClear}
              style={{ flex: 1 }}
            >
              <XStack
                height={38}
                borderRadius={tokens.radius.md}
                borderWidth={1}
                borderColor={tokens.border}
                alignItems="center"
                justifyContent="center"
                gap={6}
              >
                <LuRotateCcw size={13} color={tokens.textMuted} />
                <Text fontSize={12} fontWeight="700" color={tokens.text}>
                  Clear
                </Text>
              </XStack>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Apply filters"
              activeOpacity={0.7}
              onPress={handleApply}
              style={{ flex: 1.5 }}
            >
              <XStack
                height={38}
                borderRadius={tokens.radius.md}
                backgroundColor={tokens.accent}
                alignItems="center"
                justifyContent="center"
                gap={6}
              >
                <LuCheck size={14} color="#ffffff" />
                <Text fontSize={12} fontWeight="800" color="#ffffff">
                  Apply {activeCount > 0 ? `(${activeCount})` : ''}
                </Text>
              </XStack>
            </TouchableOpacity>
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

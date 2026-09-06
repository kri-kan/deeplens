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
} from 'react-icons/lu';
import { useTheme } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.88, 380);

export interface FilterState {
  sortBy: string;
  categories: string[];
  minPrice: number;
  maxPrice: number;
  fabrics: string[];
  vendorNames: string[];
  isStarred?: boolean | null;
  status?: 'active' | 'archived' | 'all';
  includeArchived?: boolean | null;
  startDate?: string;
  endDate?: string;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  sortBy: 'recent',
  categories: [],
  minPrice: 0,
  maxPrice: 0,
  fabrics: [],
  vendorNames: [],
  isStarred: null,
  status: 'active',
  includeArchived: false,
};

const SECTIONS = ['Sort', 'Starred', 'Category', 'Price', 'Fabric', 'Vendor', 'Status'] as const;
type SectionKey = typeof SECTIONS[number];

const SORT_OPTIONS = [
  { id: 'recent', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'price_low', label: 'Price: Low to High' },
  { id: 'price_high', label: 'Price: High to Low' },
  { id: 'listings_most', label: 'Most Listings' },
  { id: 'listings_least', label: 'Fewest Listings' },
];

const STARRED_OPTIONS = [
  { id: 'all', label: 'All Items', value: null },
  { id: 'starred', label: '⭐ Starred Only', value: true },
  { id: 'unstarred', label: 'Unstarred Only', value: false },
];

const CATEGORY_OPTIONS = [
  { id: 'saree', label: 'Saree' },
  { id: 'dress', label: 'Dress' },
  { id: 'lehanga', label: 'Lehanga' },
  { id: 'kids', label: 'Kids' },
  { id: 'general', label: 'Others' },
];

const FABRIC_OPTIONS = ['Silk', 'Cotton', 'Georgette', 'Chanderi', 'Velvet', 'Organza', 'Linen'];
const VENDOR_OPTIONS = ['Jaipur Crafts', 'Varanasi Weavers', 'Surat Silks', 'Kanchipuram Co', 'Bengal Handlooms'];

const STATUS_OPTIONS: { id: 'active' | 'archived' | 'all'; label: string }[] = [
  { id: 'active', label: 'Active SKUs' },
  { id: 'archived', label: 'Archived Only' },
  { id: 'all', label: 'All Products' },
];

export interface CatalogFilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  current?: FilterState;
  onApply: (filters: FilterState) => void;
}

export function CatalogFilterDrawer({
  visible,
  onClose,
  current = DEFAULT_FILTER_STATE,
  onApply,
}: CatalogFilterDrawerProps) {
  const { tokens } = useTheme();

  const [activeSection, setActiveSection] = useState<SectionKey>('Sort');
  const [draft, setDraft] = useState<FilterState>(current);
  const [minPriceStr, setMinPriceStr] = useState(String(current.minPrice || ''));
  const [maxPriceStr, setMaxPriceStr] = useState(String(current.maxPrice || ''));

  useEffect(() => {
    if (visible) {
      setDraft(current);
      setMinPriceStr(String(current.minPrice || ''));
      setMaxPriceStr(String(current.maxPrice || ''));
    }
  }, [visible, current]);

  if (!visible) return null;

  const toggleCategory = (catId: string) => {
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(catId)
        ? d.categories.filter((c) => c !== catId)
        : [...d.categories, catId],
    }));
  };

  const toggleFabric = (fabric: string) => {
    setDraft((d) => ({
      ...d,
      fabrics: d.fabrics.includes(fabric)
        ? d.fabrics.filter((f) => f !== fabric)
        : [...d.fabrics, fabric],
    }));
  };

  const toggleVendor = (vendor: string) => {
    setDraft((d) => ({
      ...d,
      vendorNames: d.vendorNames.includes(vendor)
        ? d.vendorNames.filter((v) => v !== vendor)
        : [...d.vendorNames, vendor],
    }));
  };

  const handleClear = () => {
    setDraft(DEFAULT_FILTER_STATE);
    setMinPriceStr('');
    setMaxPriceStr('');
  };

  const handleApply = () => {
    const minP = parseFloat(minPriceStr) || 0;
    const maxP = parseFloat(maxPriceStr) || 0;
    onApply({
      ...draft,
      minPrice: minP,
      maxPrice: maxP,
    });
    onClose();
  };

  const activeCount =
    (draft.sortBy !== 'recent' ? 1 : 0) +
    (draft.isStarred !== null && draft.isStarred !== undefined ? 1 : 0) +
    draft.categories.length +
    draft.fabrics.length +
    draft.vendorNames.length +
    ((parseFloat(minPriceStr) || 0) > 0 || (parseFloat(maxPriceStr) || 0) > 0 ? 1 : 0) +
    (draft.status && draft.status !== 'active' ? 1 : 0);

  const getSectionBadge = (section: SectionKey) => {
    switch (section) {
      case 'Sort':
        return draft.sortBy !== 'recent' ? 1 : 0;
      case 'Starred':
        return draft.isStarred !== null && draft.isStarred !== undefined ? 1 : 0;
      case 'Category':
        return draft.categories.length;
      case 'Price':
        return (parseFloat(minPriceStr) || 0) > 0 || (parseFloat(maxPriceStr) || 0) > 0 ? 1 : 0;
      case 'Fabric':
        return draft.fabrics.length;
      case 'Vendor':
        return draft.vendorNames.length;
      case 'Status':
        return draft.status && draft.status !== 'active' ? 1 : 0;
      default:
        return 0;
    }
  };

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
              width={104}
              height="100%"
              backgroundColor={tokens.surfaceRaised}
              borderRightWidth={1}
              borderRightColor={tokens.border}
            >
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
                      height={44}
                      alignItems="center"
                      justifyContent="space-between"
                      paddingHorizontal={10}
                      backgroundColor={isActive ? tokens.surface : 'transparent'}
                      borderLeftWidth={isActive ? 3.5 : 0}
                      borderLeftColor={tokens.accent}
                    >
                      <Text
                        fontSize={12}
                        fontWeight={isActive ? '800' : '600'}
                        color={isActive ? tokens.accent : tokens.textMuted}
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
            </YStack>

            {/* Right Details Panel */}
            <YStack flex={1} height="100%" backgroundColor={tokens.surface}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 14, gap: 10 }}
                showsVerticalScrollIndicator={false}
              >
                {/* SORT SECTION */}
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
                            paddingVertical={8}
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
                              {opt.label}
                            </Text>
                          </XStack>
                        </Pressable>
                      );
                    })}
                  </YStack>
                )}

                {/* STARRED SECTION */}
                {activeSection === 'Starred' && (
                  <YStack gap={8}>
                    {STARRED_OPTIONS.map((opt) => {
                      const isSelected = draft.isStarred === opt.value;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => setDraft((d) => ({ ...d, isStarred: opt.value }))}
                          style={{ cursor: 'pointer' } as any}
                        >
                          <XStack
                            alignItems="center"
                            gap={10}
                            paddingVertical={8}
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
                              {opt.label}
                            </Text>
                          </XStack>
                        </Pressable>
                      );
                    })}
                  </YStack>
                )}

                {/* CATEGORY SECTION */}
                {activeSection === 'Category' && (
                  <YStack gap={8}>
                    {CATEGORY_OPTIONS.map((cat) => {
                      const isChecked = draft.categories.includes(cat.id);
                      return (
                        <Pressable
                          key={cat.id}
                          onPress={() => toggleCategory(cat.id)}
                          style={{ cursor: 'pointer' } as any}
                        >
                          <XStack
                            alignItems="center"
                            gap={10}
                            paddingVertical={8}
                            paddingHorizontal={10}
                            borderRadius={tokens.radius.sm}
                            backgroundColor={isChecked ? `${tokens.accent}14` : 'transparent'}
                          >
                            <XStack
                              width={18}
                              height={18}
                              borderRadius={tokens.radius.xs}
                              borderWidth={1.5}
                              borderColor={isChecked ? tokens.accent : tokens.border}
                              backgroundColor={isChecked ? tokens.accent : 'transparent'}
                              alignItems="center"
                              justifyContent="center"
                            >
                              {isChecked && <LuCheck size={12} color="#ffffff" />}
                            </XStack>
                            <Text
                              fontSize={12}
                              fontWeight={isChecked ? '700' : '500'}
                              color={isChecked ? tokens.accent : tokens.text}
                            >
                              {cat.label}
                            </Text>
                          </XStack>
                        </Pressable>
                      );
                    })}
                  </YStack>
                )}

                {/* PRICE SECTION */}
                {activeSection === 'Price' && (
                  <YStack gap={14}>
                    <YStack gap={4}>
                      <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                        Min Price (₹)
                      </Text>
                      <XStack
                        height={38}
                        borderRadius={tokens.radius.sm}
                        borderWidth={1}
                        borderColor={tokens.border}
                        backgroundColor={tokens.surfaceRaised}
                        paddingHorizontal={10}
                        alignItems="center"
                      >
                        <TextInput
                          keyboardType="numeric"
                          value={minPriceStr}
                          onChangeText={setMinPriceStr}
                          placeholder="e.g. 1000"
                          placeholderTextColor={tokens.textMuted}
                          style={
                            {
                              flex: 1,
                              fontSize: 12,
                              fontWeight: '700',
                              color: tokens.text,
                              outlineStyle: 'none',
                            } as any
                          }
                        />
                      </XStack>
                    </YStack>

                    <YStack gap={4}>
                      <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                        Max Price (₹)
                      </Text>
                      <XStack
                        height={38}
                        borderRadius={tokens.radius.sm}
                        borderWidth={1}
                        borderColor={tokens.border}
                        backgroundColor={tokens.surfaceRaised}
                        paddingHorizontal={10}
                        alignItems="center"
                      >
                        <TextInput
                          keyboardType="numeric"
                          value={maxPriceStr}
                          onChangeText={setMaxPriceStr}
                          placeholder="e.g. 15000"
                          placeholderTextColor={tokens.textMuted}
                          style={
                            {
                              flex: 1,
                              fontSize: 12,
                              fontWeight: '700',
                              color: tokens.text,
                              outlineStyle: 'none',
                            } as any
                          }
                        />
                      </XStack>
                    </YStack>
                  </YStack>
                )}

                {/* FABRIC SECTION */}
                {activeSection === 'Fabric' && (
                  <YStack gap={8}>
                    {FABRIC_OPTIONS.map((fabric) => {
                      const isChecked = draft.fabrics.includes(fabric);
                      return (
                        <Pressable
                          key={fabric}
                          onPress={() => toggleFabric(fabric)}
                          style={{ cursor: 'pointer' } as any}
                        >
                          <XStack
                            alignItems="center"
                            gap={10}
                            paddingVertical={8}
                            paddingHorizontal={10}
                            borderRadius={tokens.radius.sm}
                            backgroundColor={isChecked ? `${tokens.accent}14` : 'transparent'}
                          >
                            <XStack
                              width={18}
                              height={18}
                              borderRadius={tokens.radius.xs}
                              borderWidth={1.5}
                              borderColor={isChecked ? tokens.accent : tokens.border}
                              backgroundColor={isChecked ? tokens.accent : 'transparent'}
                              alignItems="center"
                              justifyContent="center"
                            >
                              {isChecked && <LuCheck size={12} color="#ffffff" />}
                            </XStack>
                            <Text
                              fontSize={12}
                              fontWeight={isChecked ? '700' : '500'}
                              color={isChecked ? tokens.accent : tokens.text}
                            >
                              {fabric}
                            </Text>
                          </XStack>
                        </Pressable>
                      );
                    })}
                  </YStack>
                )}

                {/* VENDOR SECTION */}
                {activeSection === 'Vendor' && (
                  <YStack gap={8}>
                    {VENDOR_OPTIONS.map((vendor) => {
                      const isChecked = draft.vendorNames.includes(vendor);
                      return (
                        <Pressable
                          key={vendor}
                          onPress={() => toggleVendor(vendor)}
                          style={{ cursor: 'pointer' } as any}
                        >
                          <XStack
                            alignItems="center"
                            gap={10}
                            paddingVertical={8}
                            paddingHorizontal={10}
                            borderRadius={tokens.radius.sm}
                            backgroundColor={isChecked ? `${tokens.accent}14` : 'transparent'}
                          >
                            <XStack
                              width={18}
                              height={18}
                              borderRadius={tokens.radius.xs}
                              borderWidth={1.5}
                              borderColor={isChecked ? tokens.accent : tokens.border}
                              backgroundColor={isChecked ? tokens.accent : 'transparent'}
                              alignItems="center"
                              justifyContent="center"
                            >
                              {isChecked && <LuCheck size={12} color="#ffffff" />}
                            </XStack>
                            <Text
                              fontSize={12}
                              fontWeight={isChecked ? '700' : '500'}
                              color={isChecked ? tokens.accent : tokens.text}
                            >
                              {vendor}
                            </Text>
                          </XStack>
                        </Pressable>
                      );
                    })}
                  </YStack>
                )}

                {/* STATUS SECTION */}
                {activeSection === 'Status' && (
                  <YStack gap={8}>
                    {STATUS_OPTIONS.map((opt) => {
                      const isSelected = draft.status === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => setDraft((d) => ({ ...d, status: opt.id }))}
                          style={{ cursor: 'pointer' } as any}
                        >
                          <XStack
                            alignItems="center"
                            gap={10}
                            paddingVertical={8}
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
                              {opt.label}
                            </Text>
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

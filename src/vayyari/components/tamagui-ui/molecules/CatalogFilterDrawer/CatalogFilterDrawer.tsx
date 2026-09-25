import React, { useState, useEffect, useMemo } from 'react';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.88, 380);

export interface FilterState {
  sortBy: string;
  categories: string[];
  minPrice: number;
  maxPrice: number;
  fabrics: string[];
  crafts: string[];
  motifs: string[];
  borders: string[];
  stitchTypes: string[];
  occasions: string[];
  blouseTypes: string[];
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
  crafts: [],
  motifs: [],
  borders: [],
  stitchTypes: [],
  occasions: [],
  blouseTypes: [],
  vendorNames: [],
  isStarred: null,
  status: 'active',
  includeArchived: false,
};

const SECTIONS = [
  'Sort',
  'Starred',
  'Category',
  'Price',
  'Fabric',
  'Craft & Weave',
  'Motif & Pattern',
  'Border & Pallu',
  'Stitch Profile',
  'Occasion',
  'Vendor',
  'Status',
] as const;
type SectionKey = typeof SECTIONS[number];

const SORT_OPTIONS = [
  { id: 'recent', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'price_low', label: 'Price: Low to High' },
  { id: 'price_high', label: 'Price: High to Low' },
  { id: 'media_high', label: 'Media: High to Low' },
  { id: 'media_low', label: 'Media: Low to High' },
  { id: 'listings_most', label: 'Most Listings' },
  { id: 'listings_least', label: 'Fewest Listings' },
];

const STARRED_OPTIONS = [
  { id: 'all', label: 'All Items', value: null },
  { id: 'starred', label: '⭐ Starred Only', value: true },
  { id: 'unstarred', label: 'Unstarred Only', value: false },
];

const DEFAULT_CATEGORY_OPTIONS = [
  { id: 'saree', label: 'Saree' },
  { id: 'dress', label: 'Dress' },
  { id: 'lehanga', label: 'Lehanga' },
  { id: 'kids', label: 'Kids' },
  { id: 'general', label: 'Others' },
];

const DEFAULT_FABRIC_OPTIONS = ['Silk', 'Cotton', 'Georgette', 'Chanderi', 'Velvet', 'Organza', 'Linen'];
const DEFAULT_CRAFT_OPTIONS = [
  'Handloom',
  'Banarasi Weave',
  'Zari Work',
  'Bandhani',
  'Chikankari',
  'Kalamkari',
  'Patola',
  'Block Print',
  'Embroidery',
  'Paithani',
  'Jamdani',
  'Ikat',
  'Chanderi Weave',
  'Kantha',
];
const DEFAULT_MOTIF_OPTIONS = [
  'Floral',
  'Paisley',
  'Peacock',
  'Geometric',
  'Temple Border',
  'Buta / Buti',
  'Animal Motif',
  'Traditional',
  'Checks',
  'Stripes',
  'Lotus',
  'Elephant',
];
const DEFAULT_BORDER_OPTIONS = [
  'Zari Border',
  'Contrast Border',
  'Temple Border',
  'Broad Border',
  'Small Border',
  'Gota Patti',
  'Cutwork',
  'Scallop Border',
  'Kaddi Border',
  'Tissue Border',
];
const DEFAULT_STITCH_TYPE_OPTIONS = [
  'Unstitched',
  'Semi-Stitched',
  'Ready to Wear',
  'Custom Tailored',
  'Stitched Blouse',
];
const DEFAULT_OCCASION_OPTIONS = [
  'Bridal / Wedding',
  'Festive',
  'Party Wear',
  'Casual Wear',
  'Office / Formal',
  'Daily Wear',
  'Puja / Religious',
  'Reception',
];
const DEFAULT_VENDOR_OPTIONS = ['Jaipur Crafts', 'Varanasi Weavers', 'Surat Silks', 'Kanchipuram Co', 'Bengal Handlooms'];

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
  categoryOptions?: { id: string; label: string }[];
  fabricOptions?: string[];
  craftOptions?: string[];
  motifOptions?: string[];
  borderOptions?: string[];
  stitchTypeOptions?: string[];
  occasionOptions?: string[];
  vendorOptions?: string[];
}

interface FacetSectionViewProps {
  title: string;
  searchPlaceholder?: string;
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
  onClear: () => void;
  tokens: any;
}

function FacetSectionView({
  title,
  searchPlaceholder,
  options,
  selected,
  onToggle,
  onClear,
  tokens,
}: FacetSectionViewProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase().trim();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <YStack gap={10}>
      {/* Search Bar within Section */}
      <XStack
        height={36}
        borderRadius={tokens.radius.sm}
        borderWidth={1}
        borderColor={tokens.border}
        backgroundColor={tokens.surfaceRaised}
        paddingHorizontal={10}
        alignItems="center"
        gap={6}
      >
        <LuSearch size={14} color={tokens.textMuted} />
        <TextInput
          accessibilityLabel={`Search ${title}`}
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder || `Search ${title.toLowerCase()}...`}
          placeholderTextColor={tokens.textMuted}
          style={{
            flex: 1,
            fontSize: 12,
            color: tokens.text,
          }}
        />
        {query.length > 0 && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Clear search query`}
            activeOpacity={0.7}
            onPress={() => setQuery('')}
          >
            <LuX size={12} color={tokens.textMuted} />
          </TouchableOpacity>
        )}
      </XStack>

      {/* Selected count and Clear Section button */}
      {selected.length > 0 && (
        <XStack justifyContent="space-between" alignItems="center" paddingHorizontal={2}>
          <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
            {selected.length} selected
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Clear all selected ${title}`}
            activeOpacity={0.7}
            onPress={onClear}
          >
            <Text fontSize={11} fontWeight="700" color={tokens.accent}>
              Clear section
            </Text>
          </TouchableOpacity>
        </XStack>
      )}

      {/* Options List */}
      {filtered.length === 0 ? (
        <YStack alignItems="center" justifyContent="center" paddingVertical={24}>
          <Text fontSize={12} color={tokens.textMuted}>
            No matching options
          </Text>
        </YStack>
      ) : (
        <YStack gap={6}>
          {filtered.map((opt) => {
            const isChecked = selected.includes(opt);
            return (
              <TouchableOpacity
                key={opt}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked }}
                activeOpacity={0.7}
                onPress={() => onToggle(opt)}
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
                    flex={1}
                  >
                    {opt}
                  </Text>
                </XStack>
              </TouchableOpacity>
            );
          })}
        </YStack>
      )}
    </YStack>
  );
}

const normalizeFilterState = (filters: FilterState): FilterState => ({
  ...DEFAULT_FILTER_STATE,
  ...filters,
  categories: filters.categories || [],
  fabrics: filters.fabrics || [],
  crafts: filters.crafts || [],
  motifs: filters.motifs || [],
  borders: filters.borders || [],
  stitchTypes: filters.stitchTypes || [],
  occasions: filters.occasions || [],
  blouseTypes: filters.blouseTypes || [],
  vendorNames: filters.vendorNames || [],
});

export function CatalogFilterDrawer({
  visible,
  onClose,
  current = DEFAULT_FILTER_STATE,
  onApply,
  categoryOptions = DEFAULT_CATEGORY_OPTIONS,
  fabricOptions = DEFAULT_FABRIC_OPTIONS,
  craftOptions = DEFAULT_CRAFT_OPTIONS,
  motifOptions = DEFAULT_MOTIF_OPTIONS,
  borderOptions = DEFAULT_BORDER_OPTIONS,
  stitchTypeOptions = DEFAULT_STITCH_TYPE_OPTIONS,
  occasionOptions = DEFAULT_OCCASION_OPTIONS,
  vendorOptions = DEFAULT_VENDOR_OPTIONS,
}: CatalogFilterDrawerProps) {
  const { tokens } = useTheme();

  const [activeSection, setActiveSection] = useState<SectionKey>('Sort');
  const [draft, setDraft] = useState<FilterState>(normalizeFilterState(current));
  const [minPriceStr, setMinPriceStr] = useState(String(current.minPrice || ''));
  const [maxPriceStr, setMaxPriceStr] = useState(String(current.maxPrice || ''));

  useEffect(() => {
    if (visible) {
      setDraft(normalizeFilterState(current));
      setMinPriceStr(String(current.minPrice || ''));
      setMaxPriceStr(String(current.maxPrice || ''));
    }
  }, [visible, current]);

  if (!visible) return null;

  const toggleCategory = (catId: string) => {
    setDraft((d) => {
      const list = d.categories || [];
      return {
        ...d,
        categories: list.includes(catId)
          ? list.filter((c) => c !== catId)
          : [...list, catId],
      };
    });
  };

  const toggleFabric = (fabric: string) => {
    setDraft((d) => {
      const list = d.fabrics || [];
      return {
        ...d,
        fabrics: list.includes(fabric)
          ? list.filter((f) => f !== fabric)
          : [...list, fabric],
      };
    });
  };

  const toggleCraft = (craft: string) => {
    setDraft((d) => {
      const list = d.crafts || [];
      return {
        ...d,
        crafts: list.includes(craft) ? list.filter((c) => c !== craft) : [...list, craft],
      };
    });
  };

  const clearCrafts = () => {
    setDraft((d) => ({ ...d, crafts: [] }));
  };

  const toggleMotif = (motif: string) => {
    setDraft((d) => {
      const list = d.motifs || [];
      return {
        ...d,
        motifs: list.includes(motif) ? list.filter((m) => m !== motif) : [...list, motif],
      };
    });
  };

  const clearMotifs = () => {
    setDraft((d) => ({ ...d, motifs: [] }));
  };

  const toggleBorder = (border: string) => {
    setDraft((d) => {
      const list = d.borders || [];
      return {
        ...d,
        borders: list.includes(border) ? list.filter((b) => b !== border) : [...list, border],
      };
    });
  };

  const clearBorders = () => {
    setDraft((d) => ({ ...d, borders: [] }));
  };

  const toggleStitchType = (stitch: string) => {
    setDraft((d) => {
      const list = d.stitchTypes || [];
      return {
        ...d,
        stitchTypes: list.includes(stitch) ? list.filter((s) => s !== stitch) : [...list, stitch],
      };
    });
  };

  const clearStitchTypes = () => {
    setDraft((d) => ({ ...d, stitchTypes: [] }));
  };

  const toggleOccasion = (occasion: string) => {
    setDraft((d) => {
      const list = d.occasions || [];
      return {
        ...d,
        occasions: list.includes(occasion) ? list.filter((o) => o !== occasion) : [...list, occasion],
      };
    });
  };

  const clearOccasions = () => {
    setDraft((d) => ({ ...d, occasions: [] }));
  };

  const toggleVendor = (vendor: string) => {
    setDraft((d) => {
      const list = d.vendorNames || [];
      return {
        ...d,
        vendorNames: list.includes(vendor)
          ? list.filter((v) => v !== vendor)
          : [...list, vendor],
      };
    });
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
    (draft.categories?.length || 0) +
    (draft.fabrics?.length || 0) +
    (draft.crafts?.length || 0) +
    (draft.motifs?.length || 0) +
    (draft.borders?.length || 0) +
    (draft.stitchTypes?.length || 0) +
    (draft.occasions?.length || 0) +
    (draft.blouseTypes?.length || 0) +
    (draft.vendorNames?.length || 0) +
    ((parseFloat(minPriceStr) || 0) > 0 || (parseFloat(maxPriceStr) || 0) > 0 ? 1 : 0) +
    (draft.status && draft.status !== 'active' ? 1 : 0);

  const getSectionBadge = (section: SectionKey) => {
    switch (section) {
      case 'Sort':
        return draft.sortBy !== 'recent' ? 1 : 0;
      case 'Starred':
        return draft.isStarred !== null && draft.isStarred !== undefined ? 1 : 0;
      case 'Category':
        return draft.categories?.length || 0;
      case 'Price':
        return (parseFloat(minPriceStr) || 0) > 0 || (parseFloat(maxPriceStr) || 0) > 0 ? 1 : 0;
      case 'Fabric':
        return draft.fabrics?.length || 0;
      case 'Craft & Weave':
        return draft.crafts?.length || 0;
      case 'Motif & Pattern':
        return draft.motifs?.length || 0;
      case 'Border & Pallu':
        return draft.borders?.length || 0;
      case 'Stitch Profile':
        return draft.stitchTypes?.length || 0;
      case 'Occasion':
        return draft.occasions?.length || 0;
      case 'Vendor':
        return draft.vendorNames?.length || 0;
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
              width={114}
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
                        height={44}
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
                {/* SORT SECTION */}
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
                        </TouchableOpacity>
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
                        <TouchableOpacity
                          key={opt.id}
                          activeOpacity={0.7}
                          onPress={() => setDraft((d) => ({ ...d, isStarred: opt.value }))}
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
                        </TouchableOpacity>
                      );
                    })}
                  </YStack>
                )}

                {/* CATEGORY SECTION */}
                {activeSection === 'Category' && (
                  <YStack gap={8}>
                    {categoryOptions.map((cat) => {
                      const isChecked = draft.categories.includes(cat.id);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          activeOpacity={0.7}
                          onPress={() => toggleCategory(cat.id)}
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
                        </TouchableOpacity>
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
                          style={{
                            flex: 1,
                            fontSize: 12,
                            fontWeight: '700',
                            color: tokens.text,
                          }}
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
                          style={{
                            flex: 1,
                            fontSize: 12,
                            fontWeight: '700',
                            color: tokens.text,
                          }}
                        />
                      </XStack>
                    </YStack>
                  </YStack>
                )}

                {/* FABRIC SECTION */}
                {activeSection === 'Fabric' && (
                  <YStack gap={8}>
                    {fabricOptions.map((fabric) => {
                      const isChecked = draft.fabrics.includes(fabric);
                      return (
                        <TouchableOpacity
                          key={fabric}
                          activeOpacity={0.7}
                          onPress={() => toggleFabric(fabric)}
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
                        </TouchableOpacity>
                      );
                    })}
                  </YStack>
                )}

                {/* CRAFT & WEAVE SECTION */}
                {activeSection === 'Craft & Weave' && (
                  <FacetSectionView
                    title="Craft & Weave"
                    searchPlaceholder="Search crafts, weaves..."
                    options={craftOptions}
                    selected={draft.crafts || []}
                    onToggle={toggleCraft}
                    onClear={clearCrafts}
                    tokens={tokens}
                  />
                )}

                {/* MOTIF & PATTERN SECTION */}
                {activeSection === 'Motif & Pattern' && (
                  <FacetSectionView
                    title="Motif & Pattern"
                    searchPlaceholder="Search motifs, patterns..."
                    options={motifOptions}
                    selected={draft.motifs || []}
                    onToggle={toggleMotif}
                    onClear={clearMotifs}
                    tokens={tokens}
                  />
                )}

                {/* BORDER & PALLU SECTION */}
                {activeSection === 'Border & Pallu' && (
                  <FacetSectionView
                    title="Border & Pallu"
                    searchPlaceholder="Search borders, pallu..."
                    options={borderOptions}
                    selected={draft.borders || []}
                    onToggle={toggleBorder}
                    onClear={clearBorders}
                    tokens={tokens}
                  />
                )}

                {/* STITCH PROFILE SECTION */}
                {activeSection === 'Stitch Profile' && (
                  <FacetSectionView
                    title="Stitch Profile"
                    searchPlaceholder="Search stitch types..."
                    options={stitchTypeOptions}
                    selected={draft.stitchTypes || []}
                    onToggle={toggleStitchType}
                    onClear={clearStitchTypes}
                    tokens={tokens}
                  />
                )}

                {/* OCCASION SECTION */}
                {activeSection === 'Occasion' && (
                  <FacetSectionView
                    title="Occasion"
                    searchPlaceholder="Search occasions..."
                    options={occasionOptions}
                    selected={draft.occasions || []}
                    onToggle={toggleOccasion}
                    onClear={clearOccasions}
                    tokens={tokens}
                  />
                )}

                {/* VENDOR SECTION */}
                {activeSection === 'Vendor' && (
                  <YStack gap={8}>
                    {vendorOptions.map((vendor) => {
                      const isChecked = draft.vendorNames.includes(vendor);
                      return (
                        <TouchableOpacity
                          key={vendor}
                          activeOpacity={0.7}
                          onPress={() => toggleVendor(vendor)}
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
                        </TouchableOpacity>
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
                        <TouchableOpacity
                          key={opt.id}
                          activeOpacity={0.7}
                          onPress={() => setDraft((d) => ({ ...d, status: opt.id }))}
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

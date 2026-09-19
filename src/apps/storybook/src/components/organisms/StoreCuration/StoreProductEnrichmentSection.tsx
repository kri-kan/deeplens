import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Pressable, StyleSheet, TextInput, ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuSparkles,
  LuDollarSign,
  LuFileText,
  LuLayers,
  LuCheck,
  LuRuler,
  LuTag,
  LuPlus,
  LuX,
  LuScissors,
  LuInfo,
} from 'react-icons/lu';
import { useTheme, useResponsive } from '../../../theme';
import { SizeSelector } from '../SizeSelector/SizeSelector';
import { SegmentedControl } from '../../atoms/SegmentedControl/SegmentedControl';
import { CustomCheckbox } from '../../atoms/CustomCheckbox/CustomCheckbox';
import {
  LETTER_SIZE_PRESET,
  DEFAULT_SELECTED_LETTER_SIZES,
  BLOUSE_NUMERIC_PRESET,
  KIDS_SIZE_PRESET,
  FREE_SIZE_PRESET,
  ONE_SIZE_PRESET,
  SizeCategoryType,
  SizeOption,
} from '../../../data/catalog';
import {
  ProductCurationSpecs,
  DEFAULT_SAREE_SPECS,
  ETHNIC_FABRIC_OPTIONS,
  WEAVE_TECHNIQUE_OPTIONS,
  CRAFT_ORIGIN_OPTIONS,
  MOTIF_PATTERN_OPTIONS,
  BORDER_PALLU_OPTIONS,
  BLOUSE_TYPE_OPTIONS,
  ZARI_MATERIAL_OPTIONS,
  WORK_HEAVINESS_OPTIONS,
  OCCASION_OPTIONS,
  STITCH_TYPE_OPTIONS,
  TaxonomyOption,
  buildSpecsFromUnifiedAttributes,
} from './taxonomy';

export type MetadataActiveTab = 'commercials' | 'craft_specs' | 'sizing' | 'occasions_tags';

export interface StoreProductEnrichmentSectionProps {
  title: string;
  fabric: string;
  description: string;
  baseCostPrice: number;
  mrp: string;
  salePrice: string;
  specs?: ProductCurationSpecs;
  product?: {
    id?: string;
    title?: string;
    fabric?: string;
    stitch_type?: string;
    description?: string;
    unified_attributes?: any;
    [key: string]: any;
  };
  unified_attributes?: any;
  onChangeDescription: (desc: string) => void;
  onChangeMrp: (mrp: string) => void;
  onChangeSalePrice: (price: string) => void;
  onChangeSpecs?: (specs: ProductCurationSpecs) => void;
}

// ── UNIVERSAL REUSABLE HOOK FOR SMOOTH HORIZONTAL SWIPE, DRAG & WHEEL ───────
export function useSwipeableHorizontalScroll() {
  const scrollRef = useRef<any>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    const rawEl = scrollRef.current;
    const el = rawEl?.getScrollableNode?.() || rawEl;
    if (!el || typeof el.addEventListener !== 'function') return;

    // Smooth horizontal wheel translation
    const onWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) > 1) {
        el.scrollLeft += delta;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      startXRef.current = e.clientX || e.pageX;
      scrollLeftRef.current = el.scrollLeft;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const currentX = e.clientX || e.pageX;
      const walk = currentX - startXRef.current;
      if (Math.abs(walk) > 4) {
        hasDraggedRef.current = true;
      }
      el.scrollLeft = scrollLeftRef.current - walk;
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 60);
    };

    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  return { scrollRef, hasDraggedRef };
}

// ── REUSABLE TAXONOMY CHIP & FREE-TEXT COMBOBOX SELECTOR ──────────────────────
interface TaxonomyFacetChipSelectorProps {
  label: string;
  options: TaxonomyOption[];
  selectedId: string;
  selectedName?: string;
  onSelect: (id: string, name: string) => void;
  customPlaceholder?: string;
  tokens: any;
}

function TaxonomyFacetChipSelector({
  label,
  options,
  selectedId,
  selectedName,
  onSelect,
  customPlaceholder,
  tokens,
}: TaxonomyFacetChipSelectorProps) {
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customList, setCustomList] = useState<TaxonomyOption[]>([]);
  const { scrollRef, hasDraggedRef } = useSwipeableHorizontalScroll();

  // Sync custom items if selectedId is not in preset options
  useEffect(() => {
    if (selectedId && !options.some((o) => o.id === selectedId)) {
      if (!customList.some((o) => o.id === selectedId)) {
        setCustomList((prev) => [
          ...prev,
          {
            id: selectedId,
            label: selectedName || selectedId.replace('custom_', '').replace(/_/g, ' '),
            badge: 'Custom',
            isCustom: true,
          },
        ]);
      }
    }
  }, [selectedId, selectedName, options, customList]);

  const handleCommitCustom = () => {
    if (!customText.trim()) {
      setIsAddingCustom(false);
      return;
    }
    const cleanText = customText.trim();
    const slug = cleanText
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '_');
    const newId = `custom_${slug}`;
    const newOption: TaxonomyOption = {
      id: newId,
      label: cleanText,
      badge: 'Custom',
      isCustom: true,
    };
    setCustomList((prev) => (prev.some((p) => p.id === newId) ? prev : [...prev, newOption]));
    onSelect(newId, cleanText);
    setCustomText('');
    setIsAddingCustom(false);
  };

  const combinedOptions = [...customList, ...options];

  return (
    <YStack gap={3}>
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
          {label}
        </Text>
        <Pressable
          onPress={() => setIsAddingCustom(!isAddingCustom)}
          style={styles.customToggleBtn}
        >
          {isAddingCustom ? (
            <LuX size={13} color={tokens.accent} />
          ) : (
            <LuPlus size={13} color={tokens.accent} />
          )}
          <Text fontSize={12} fontWeight="700" color={tokens.accent}>
            {isAddingCustom ? 'Cancel' : 'Custom Tag'}
          </Text>
        </Pressable>
      </XStack>

      {isAddingCustom && (
        <XStack gap={8} alignItems="center" marginBottom={6} width="100%">
          <TextInput
            value={customText}
            onChangeText={setCustomText}
            placeholder={customPlaceholder || `Type custom ${label.toLowerCase().replace(':', '')}...`}
            placeholderTextColor={tokens.textMuted}
            onSubmitEditing={handleCommitCustom}
            autoFocus
            style={styles.customTextInput}
          />
          <Pressable
            onPress={handleCommitCustom}
            style={[styles.customConfirmBtn, { backgroundColor: tokens.accent }]}
          >
            <LuCheck size={14} color="#FFFFFF" strokeWidth={2.5} />
            <Text fontSize={12} fontWeight="800" color="#FFFFFF">
              Add
            </Text>
          </Pressable>
        </XStack>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.horizontalScrollWrapper}
        contentContainerStyle={styles.chipRow}
      >
        {combinedOptions.map((opt) => {
          const isSelected = selectedId === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => {
                if (!hasDraggedRef.current) {
                  onSelect(opt.id, opt.label);
                }
              }}
              style={[
                styles.specChip,
                {
                  backgroundColor: isSelected ? `${tokens.accent}16` : tokens.surfaceRaised,
                  borderColor: isSelected ? tokens.accent : tokens.border,
                },
              ]}
            >
              <Text
                fontSize={12}
                fontWeight={isSelected ? '800' : '600'}
                color={isSelected ? tokens.accent : tokens.text}
              >
                {opt.label}
              </Text>
              {opt.badge && (
                <View
                  style={[
                    styles.chipPill,
                    opt.badge === 'Custom'
                      ? { backgroundColor: '#FEE2E2' }
                      : opt.badge === 'GI Tagged' || opt.badge === 'Census #1'
                      ? { backgroundColor: '#FEF3C7' }
                      : { backgroundColor: '#EDE9FE' },
                  ]}
                >
                  <Text
                    fontSize={9.5}
                    fontWeight="800"
                    color={
                      opt.badge === 'Custom'
                        ? '#DC2626'
                        : opt.badge === 'GI Tagged' || opt.badge === 'Census #1'
                        ? '#B45309'
                        : '#7C3AED'
                    }
                  >
                    {opt.badge}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </YStack>
  );
}

// ── MAIN ENRICHMENT SECTION COMPONENT ─────────────────────────────────────────
export function StoreProductEnrichmentSection({
  title,
  fabric,
  description,
  baseCostPrice,
  mrp,
  salePrice,
  specs: controlledSpecs,
  product,
  unified_attributes,
  onChangeDescription,
  onChangeMrp,
  onChangeSalePrice,
  onChangeSpecs,
}: StoreProductEnrichmentSectionProps) {
  const { tokens } = useTheme();
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState<MetadataActiveTab>('craft_specs');
  const [isAiDeriving, setIsAiDeriving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [customOccasionInput, setCustomOccasionInput] = useState('');
  const [isAddingOccasion, setIsAddingOccasion] = useState(false);

  // ── UNIFIED ATTRIBUTES SPEC RESOLUTION & PREFILL ────────────────────────────
  const effectiveUa = unified_attributes || product?.unified_attributes;
  const initialSpecs = useMemo(() => {
    if (controlledSpecs && controlledSpecs !== DEFAULT_SAREE_SPECS) {
      return controlledSpecs;
    }
    if (effectiveUa || fabric || title) {
      return buildSpecsFromUnifiedAttributes(
        effectiveUa,
        { title, fabric, ...product },
        controlledSpecs || DEFAULT_SAREE_SPECS
      );
    }
    return controlledSpecs || DEFAULT_SAREE_SPECS;
  }, [controlledSpecs, effectiveUa, product, title, fabric]);

  const [internalSpecs, setInternalSpecs] = useState<ProductCurationSpecs>(initialSpecs);
  const specs = controlledSpecs || internalSpecs;

  // Reactively prefill when dynamic product or unified_attributes arrive
  useEffect(() => {
    if (effectiveUa) {
      const derived = buildSpecsFromUnifiedAttributes(
        effectiveUa,
        { title, fabric, ...product },
        specs
      );
      if (onChangeSpecs) {
        onChangeSpecs(derived);
      } else {
        setInternalSpecs(derived);
      }
    }
  }, [effectiveUa, product]);

  const parsedMrp = parseFloat(mrp) || 0;
  const parsedSalePrice = parseFloat(salePrice) || 0;
  const discountPercent =
    parsedMrp > 0 && parsedSalePrice > 0 && parsedMrp > parsedSalePrice
      ? Math.round(((parsedMrp - parsedSalePrice) / parsedMrp) * 100)
      : 0;
  const estimatedMargin = parsedSalePrice - baseCostPrice;
  const marginPercent =
    parsedSalePrice > 0 ? Math.round((estimatedMargin / parsedSalePrice) * 100) : 0;

  // ── TAB BAR DRAG & WHEEL SCROLL LOGIC ──────────────────────────────────────
  const { scrollRef: tabScrollRef, hasDraggedRef: hasTabDraggedRef } = useSwipeableHorizontalScroll();

  // Auto-scroll active tab into center view to eliminate edge clipping on mobile
  useEffect(() => {
    if (tabScrollRef.current) {
      const activeEl = (tabScrollRef.current as any).querySelector?.(
        `#tab-${activeTab}`
      ) as HTMLElement | null;
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTab]);

  // ── ONE-CLICK AI AUTO-DERIVE ALL ENGINE ─────────────────────────────────────
  const handleAiAutoDeriveAll = () => {
    setIsAiDeriving(true);
    setTimeout(() => {
      // 1. Synthesize craft story
      onChangeDescription(
        `Woven on heirloom pit looms in ${specs.craftOriginName || 'Varanasi'}, this authentic ${specs.fabricName} saree showcases exquisite ${specs.weaveTechniqueName} with ${specs.motifPatternName} and a rich ${specs.borderPalluName}. Paired with an attached ${specs.blousePieceLengthMetres}m ${specs.blouseTypeName || 'blouse piece'}, the fluid drape offers royal festive presence and luminous heritage elegance.`
      );

      // 2. Intelligent retail pricing rules (if unset or zero)
      if (baseCostPrice > 0) {
        const calculatedSale = Math.round((baseCostPrice * 1.38) / 50) * 50 - 1; // 38% markup ending in 99
        const calculatedMrp = Math.round((calculatedSale * 1.55) / 100) * 100 - 1;
        onChangeSalePrice(calculatedSale.toString());
        onChangeMrp(calculatedMrp.toString());
      }

      // 3. Update specifications
      const updatedSpecs: ProductCurationSpecs = {
        ...specs,
        isAiDerived: true,
        derivedAt: new Date().toISOString(),
        confidenceScore: 98,
      };
      if (onChangeSpecs) {
        onChangeSpecs(updatedSpecs);
      } else {
        setInternalSpecs(updatedSpecs);
      }

      setIsAiDeriving(false);
    }, 600);
  };

  const updateSpecField = <K extends keyof ProductCurationSpecs>(
    field: K,
    value: ProductCurationSpecs[K]
  ) => {
    const updated = {
      ...specs,
      [field]: value,
    };
    if (onChangeSpecs) {
      onChangeSpecs(updated);
    } else {
      setInternalSpecs(updated);
    }
  };

  const toggleOccasion = (id: string) => {
    const current = specs.occasions || [];
    const exists = current.includes(id);
    const updated = exists ? current.filter((item) => item !== id) : [...current, id];
    updateSpecField('occasions', updated);
  };

  const handleAddCustomOccasion = () => {
    if (!customOccasionInput.trim()) {
      setIsAddingOccasion(false);
      return;
    }
    const cleanOccasion = customOccasionInput.trim();
    const slug = cleanOccasion.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '_');
    const occId = `custom_${slug}`;
    const current = specs.occasions || [];
    if (!current.includes(occId)) {
      updateSpecField('occasions', [...current, occId]);
    }
    setCustomOccasionInput('');
    setIsAddingOccasion(false);
  };

  const handleAddSearchTag = () => {
    if (!tagInput.trim()) return;
    const newTag = tagInput.trim().toLowerCase();
    const current = specs.searchTags || [];
    if (!current.includes(newTag)) {
      updateSpecField('searchTags', [...current, newTag]);
    }
    setTagInput('');
  };

  const handleRemoveSearchTag = (tagToRemove: string) => {
    const current = specs.searchTags || [];
    updateSpecField(
      'searchTags',
      current.filter((t) => t !== tagToRemove)
    );
  };

  // ── SIZING VARIANT & FIT LOGIC ──────────────────────────────────────────────
  const activeSizeCategory: SizeCategoryType = (specs.sizeCategory || specs.sizeProfile || 'no-size') as SizeCategoryType;
  const isNoSize = activeSizeCategory === 'no-size' || activeSizeCategory === 'free-size';
  const noSizeVariant = specs.noSizeVariant || (specs.category === 'blouse' ? 'free-size' : 'one-size');
  const sizeDrapeText =
    specs.sizeDrapeText ||
    (noSizeVariant === 'free-size'
      ? 'Stitched Blouse with Free Size / Alterable Seams'
      : `${specs.sareeLengthMetres || 5.5}m Saree + ${specs.blousePieceLengthMetres || 0.8}m Unstitched Blouse Piece`);

  const handleSizeCategoryChange = (newCat: SizeCategoryType) => {
    let matchingStitchId = specs.stitchTypeId;
    let matchingStitchName = specs.stitchTypeName;

    if (newCat === 'no-size') {
      if (noSizeVariant === 'free-size') {
        matchingStitchId = 'unstitched_stitched_blouse';
        matchingStitchName = 'Unstitched Saree with Stitched Blouse';
      } else {
        matchingStitchId = 'unstitched_saree_blouse';
        matchingStitchName = 'Unstitched (Saree + Blouse Piece)';
      }
    } else if (newCat === 'letter') {
      matchingStitchId = 'fully_stitched_letter';
      matchingStitchName = 'Fully Stitched XS–5XL';
    } else if (newCat === 'numeric') {
      matchingStitchId = 'fully_stitched_numeric';
      matchingStitchName = 'Fully Stitched (Numeric 32–44)';
    }

    let newAvailableSizes = { ...specs.availableSizes };
    if (newCat === 'letter' && (!specs.availableSizes || Object.keys(specs.availableSizes).length <= 1)) {
      newAvailableSizes = {};
      LETTER_SIZE_PRESET.forEach((opt) => {
        newAvailableSizes[opt.id] = DEFAULT_SELECTED_LETTER_SIZES.includes(opt.id);
      });
    } else if (newCat === 'numeric' && (!specs.availableSizes || Object.keys(specs.availableSizes).length <= 1)) {
      newAvailableSizes = {};
      BLOUSE_NUMERIC_PRESET.forEach((opt) => (newAvailableSizes[opt.id] = true));
    } else if (newCat === 'kids' && (!specs.availableSizes || Object.keys(specs.availableSizes).length <= 1)) {
      newAvailableSizes = {};
      KIDS_SIZE_PRESET.forEach((opt) => (newAvailableSizes[opt.id] = true));
    }

    const updated: ProductCurationSpecs = {
      ...specs,
      sizeCategory: newCat,
      sizeProfile: newCat,
      stitchTypeId: matchingStitchId,
      stitchTypeName: matchingStitchName,
      availableSizes: newAvailableSizes,
    };
    if (onChangeSpecs) {
      onChangeSpecs(updated);
    } else {
      setInternalSpecs(updated);
    }
  };

  const handleNoSizeVariantChange = (variant: 'one-size' | 'free-size') => {
    const defaultText =
      variant === 'free-size'
        ? 'Stitched Blouse with Free Size / Alterable Seams'
        : `${specs.sareeLengthMetres || 5.5}m Saree + ${specs.blousePieceLengthMetres || 0.8}m Unstitched Blouse Piece`;

    const stitchId = variant === 'free-size' ? 'unstitched_stitched_blouse' : 'unstitched_saree_blouse';
    const stitchName = variant === 'free-size' ? 'Unstitched Saree with Stitched Blouse' : 'Unstitched (Saree + Blouse Piece)';

    const updated: ProductCurationSpecs = {
      ...specs,
      noSizeVariant: variant,
      sizeProfile: 'no-size',
      sizeCategory: 'no-size',
      sizeDrapeText: defaultText,
      stitchTypeId: stitchId,
      stitchTypeName: stitchName,
      availableSizes: { [variant === 'free-size' ? 'free_size' : 'one_size']: true },
    };
    if (onChangeSpecs) {
      onChangeSpecs(updated);
    } else {
      setInternalSpecs(updated);
    }
  };

  const isSizeAvailable = (optId: string): boolean => {
    if (specs.availableSizes && optId in specs.availableSizes) {
      return Boolean(specs.availableSizes[optId]);
    }
    if (activeSizeCategory === 'letter') {
      return DEFAULT_SELECTED_LETTER_SIZES.includes(optId);
    }
    return true;
  };

  const toggleSizeAvailability = (sizeId: string) => {
    const currentStatus = isSizeAvailable(sizeId);
    const updatedMap = {
      ...(specs.availableSizes || {}),
      [sizeId]: !currentStatus,
    };
    updateSpecField('availableSizes', updatedMap);
  };

  const handleSelectAllSizes = (enable: boolean) => {
    const next: Record<string, boolean> = {};
    getPoolForCategory(activeSizeCategory).forEach((opt) => {
      next[opt.id] = enable;
    });
    updateSpecField('availableSizes', next);
  };

  const handleSelectDefaultLetterSizes = () => {
    const next: Record<string, boolean> = {};
    LETTER_SIZE_PRESET.forEach((opt) => {
      next[opt.id] = DEFAULT_SELECTED_LETTER_SIZES.includes(opt.id);
    });
    updateSpecField('availableSizes', next);
  };

  const handleStitchTypeSelect = (opt: typeof STITCH_TYPE_OPTIONS[number]) => {
    let cat: SizeCategoryType = activeSizeCategory;
    let nsv: 'one-size' | 'free-size' = noSizeVariant;

    if (opt.id === 'fully_stitched_letter') {
      cat = 'letter';
    } else if (opt.id === 'fully_stitched_numeric') {
      cat = 'numeric';
    } else if (opt.id === 'unstitched_stitched_blouse') {
      cat = 'no-size';
      nsv = 'free-size';
    } else if (opt.id === 'unstitched_saree_blouse' || opt.id === 'ready_to_drape_pre_pleated' || opt.id === 'free_size_adjustable') {
      cat = 'no-size';
      nsv = 'one-size';
    }

    const updated: ProductCurationSpecs = {
      ...specs,
      stitchTypeId: opt.id,
      stitchTypeName: opt.label,
      sizeCategory: cat,
      sizeProfile: cat,
      noSizeVariant: nsv,
    };
    if (onChangeSpecs) {
      onChangeSpecs(updated);
    } else {
      setInternalSpecs(updated);
    }
  };

  const getPoolForCategory = (cat: SizeCategoryType): SizeOption[] => {
    switch (cat) {
      case 'kids':
        return KIDS_SIZE_PRESET;
      case 'numeric':
        return BLOUSE_NUMERIC_PRESET;
      case 'letter':
        return LETTER_SIZE_PRESET;
      case 'no-size':
      case 'free-size':
      default:
        return noSizeVariant === 'free-size' ? FREE_SIZE_PRESET : ONE_SIZE_PRESET;
    }
  };

  const handleSareeLengthChange = (val: string) => {
    const len = parseFloat(val) || 5.5;
    const isDefaultDrape = !specs.sizeDrapeText || specs.sizeDrapeText.includes('Saree +');
    const updated: ProductCurationSpecs = {
      ...specs,
      sareeLengthMetres: len,
      sizeDrapeText:
        isDefaultDrape && noSizeVariant === 'one-size'
          ? `${len}m Saree + ${specs.blousePieceLengthMetres || 0.8}m Unstitched Blouse Piece`
          : specs.sizeDrapeText,
    };
    if (onChangeSpecs) onChangeSpecs(updated);
    else setInternalSpecs(updated);
  };

  const handleBlouseLengthChange = (val: string) => {
    const len = parseFloat(val) || 0.8;
    const isDefaultDrape = !specs.sizeDrapeText || specs.sizeDrapeText.includes('Saree +');
    const updated: ProductCurationSpecs = {
      ...specs,
      blousePieceLengthMetres: len,
      sizeDrapeText:
        isDefaultDrape && noSizeVariant === 'one-size'
          ? `${specs.sareeLengthMetres || 5.5}m Saree + ${len}m Unstitched Blouse Piece`
          : specs.sizeDrapeText,
    };
    if (onChangeSpecs) onChangeSpecs(updated);
    else setInternalSpecs(updated);
  };

  return (
    <YStack gap={8} width="100%">
      {/* ── TOP HEADER WITH AI AUTO-DERIVE BANNER ── */}
      <YStack
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        paddingVertical={10}
        paddingHorizontal={isMobile ? 4 : 8}
        gap={8}
      >
        <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={8}>
          <YStack gap={2}>
            <XStack alignItems="center" gap={6}>
              <LuFileText size={16} color={tokens.accent} />
              <Text fontSize={13} fontWeight="900" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
                Product Specifications &amp; Taxonomy
              </Text>
            </XStack>
            <Text fontSize={11} color={tokens.textMuted}>
              Curate fabric dimensions, weave origin, retail pricing and size specifications.
            </Text>
          </YStack>

          {/* AI Auto-Derive Button */}
          <Pressable
            onPress={handleAiAutoDeriveAll}
            disabled={isAiDeriving}
            style={[
              styles.aiDeriveBtn,
              {
                backgroundColor: isAiDeriving ? tokens.surfaceRaised : `${tokens.accent}14`,
                borderColor: tokens.accent,
              },
            ]}
          >
            <LuSparkles size={14} color={tokens.accent} />
            <Text fontSize={12} fontWeight="800" color={tokens.accent}>
              {isAiDeriving ? 'Deriving Specs & Pricing...' : '✨ AI Auto-Derive All'}
            </Text>
          </Pressable>
        </XStack>

        {specs.isAiDerived && (
          <XStack
            alignItems="center"
            gap={6}
            backgroundColor="#F0FDF4"
            paddingVertical={4}
            paddingHorizontal={8}
            borderRadius={6}
            borderWidth={1}
            borderColor="#DCFCE7"
          >
            <LuCheck size={12} color="#16A34A" />
            <Text fontSize={11} fontWeight="700" color="#15803D">
              Census AI Taxonomy Active ({specs.confidenceScore || 96}% confidence) • Click any facet to override
            </Text>
          </XStack>
        )}
      </YStack>

      {/* ── 4-SECTION TAB SELECTOR BAR (HORIZONTAL SCROLL/SWIPE & MOUSE DRAG) ── */}
      <ScrollView
        ref={tabScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollWrapper}
        contentContainerStyle={styles.tabScrollContainer}
      >
        <Pressable
          nativeID="tab-craft_specs"
          onPress={() => {
            if (!hasTabDraggedRef.current) setActiveTab('craft_specs');
          }}
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'craft_specs' ? tokens.accent : tokens.surface,
              borderColor: activeTab === 'craft_specs' ? tokens.accent : tokens.border,
            },
          ]}
        >
          <LuLayers size={15} color={activeTab === 'craft_specs' ? '#FFFFFF' : tokens.text} />
          <Text
            fontSize={12}
            fontWeight="800"
            color={activeTab === 'craft_specs' ? '#FFFFFF' : tokens.text}
            numberOfLines={1}
          >
            {isMobile ? 'Craft & Fabric' : 'Craft & Fabric Specs'}
          </Text>
        </Pressable>

        <Pressable
          nativeID="tab-commercials"
          onPress={() => {
            if (!hasTabDraggedRef.current) setActiveTab('commercials');
          }}
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'commercials' ? tokens.accent : tokens.surface,
              borderColor: activeTab === 'commercials' ? tokens.accent : tokens.border,
            },
          ]}
        >
          <LuDollarSign size={15} color={activeTab === 'commercials' ? '#FFFFFF' : tokens.text} />
          <Text
            fontSize={12}
            fontWeight="800"
            color={activeTab === 'commercials' ? '#FFFFFF' : tokens.text}
            numberOfLines={1}
          >
            {isMobile ? 'Pricing' : 'Pricing & Margins'}
          </Text>
        </Pressable>

        <Pressable
          nativeID="tab-sizing"
          onPress={() => {
            if (!hasTabDraggedRef.current) setActiveTab('sizing');
          }}
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'sizing' ? tokens.accent : tokens.surface,
              borderColor: activeTab === 'sizing' ? tokens.accent : tokens.border,
            },
          ]}
        >
          <LuRuler size={15} color={activeTab === 'sizing' ? '#FFFFFF' : tokens.text} />
          <Text
            fontSize={12}
            fontWeight="800"
            color={activeTab === 'sizing' ? '#FFFFFF' : tokens.text}
            numberOfLines={1}
          >
            Sizing &amp; Drape
          </Text>
        </Pressable>

        <Pressable
          nativeID="tab-occasions_tags"
          onPress={() => {
            if (!hasTabDraggedRef.current) setActiveTab('occasions_tags');
          }}
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'occasions_tags' ? tokens.accent : tokens.surface,
              borderColor: activeTab === 'occasions_tags' ? tokens.accent : tokens.border,
            },
          ]}
        >
          <LuTag size={15} color={activeTab === 'occasions_tags' ? '#FFFFFF' : tokens.text} />
          <Text
            fontSize={12}
            fontWeight="800"
            color={activeTab === 'occasions_tags' ? '#FFFFFF' : tokens.text}
            numberOfLines={1}
          >
            {isMobile ? 'Occasions' : 'Occasions & Facets'}
          </Text>
        </Pressable>
      </ScrollView>

      {/* ── TAB 1: CRAFT & FABRIC SPECIFICATIONS ── */}
      {activeTab === 'craft_specs' && (
        <YStack
          backgroundColor={tokens.surface}
          borderTopWidth={1}
          borderBottomWidth={1}
          borderColor={tokens.border}
          paddingVertical={12}
          paddingHorizontal={isMobile ? 4 : 8}
          gap={12}
          width="100%"
        >
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={12} fontWeight="900" color={tokens.text} textTransform="uppercase">
              1. Fabric &amp; Weaving Dimensions (PDP Specs Table)
            </Text>
            <View style={[styles.microBadge, { backgroundColor: `${tokens.accent}14` }]}>
              <Text fontSize={9} fontWeight="800" color={tokens.accent}>
                Powers PDP Specs
              </Text>
            </View>
          </XStack>

          {/* Fabric Base Selection */}
          <TaxonomyFacetChipSelector
            label="Fabric Base:"
            options={ETHNIC_FABRIC_OPTIONS}
            selectedId={specs.fabricId}
            selectedName={specs.fabricName}
            onSelect={(id, name) => {
              updateSpecField('fabricId', id);
              updateSpecField('fabricName', name);
            }}
            tokens={tokens}
          />

          {/* Weave Technique Selection */}
          <TaxonomyFacetChipSelector
            label="Weave Technique &amp; Craft:"
            options={WEAVE_TECHNIQUE_OPTIONS}
            selectedId={specs.weaveTechniqueId}
            selectedName={specs.weaveTechniqueName}
            onSelect={(id, name) => {
              updateSpecField('weaveTechniqueId', id);
              updateSpecField('weaveTechniqueName', name);
            }}
            tokens={tokens}
          />

          {/* Craft Heritage & Regional Origin */}
          <TaxonomyFacetChipSelector
            label="Regional Origin &amp; Heritage:"
            options={CRAFT_ORIGIN_OPTIONS}
            selectedId={specs.craftOriginId}
            selectedName={specs.craftOriginName}
            onSelect={(id, name) => {
              updateSpecField('craftOriginId', id);
              updateSpecField('craftOriginName', name);
            }}
            tokens={tokens}
          />

          {/* Motif & Pattern Selection */}
          <TaxonomyFacetChipSelector
            label="Motif &amp; Pattern:"
            options={MOTIF_PATTERN_OPTIONS}
            selectedId={specs.motifPatternId}
            selectedName={specs.motifPatternName}
            onSelect={(id, name) => {
              updateSpecField('motifPatternId', id);
              updateSpecField('motifPatternName', name);
            }}
            tokens={tokens}
          />

          {/* Border & Pallu Type */}
          <TaxonomyFacetChipSelector
            label="Border &amp; Pallu:"
            options={BORDER_PALLU_OPTIONS}
            selectedId={specs.borderPalluId}
            selectedName={specs.borderPalluName}
            onSelect={(id, name) => {
              updateSpecField('borderPalluId', id);
              updateSpecField('borderPalluName', name);
            }}
            tokens={tokens}
          />

          {/* Zari & Thread Material */}
          <TaxonomyFacetChipSelector
            label="Zari / Thread Inlay:"
            options={ZARI_MATERIAL_OPTIONS}
            selectedId={specs.zariMaterialId}
            selectedName={specs.zariMaterialName}
            onSelect={(id, name) => {
              updateSpecField('zariMaterialId', id);
              updateSpecField('zariMaterialName', name);
            }}
            tokens={tokens}
          />

          {/* Work Heaviness */}
          <YStack gap={4}>
            <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
              Work Heaviness:
            </Text>
            <XStack gap={6} flexWrap="wrap">
              {WORK_HEAVINESS_OPTIONS.map((opt) => {
                const isSelected = specs.workHeavinessId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      updateSpecField('workHeavinessId', opt.id);
                      updateSpecField('workHeavinessName', opt.label);
                    }}
                    style={[
                      styles.specChip,
                      {
                        flex: 1,
                        minWidth: 140,
                        backgroundColor: isSelected ? `${tokens.accent}14` : tokens.surfaceRaised,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                      },
                    ]}
                  >
                    <Text fontSize={12} fontWeight={isSelected ? '800' : '600'} color={isSelected ? tokens.accent : tokens.text}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </XStack>
          </YStack>
        </YStack>
      )}

      {/* ── TAB 2: PRICING & COMMERCIAL MARGINS ── */}
      {activeTab === 'commercials' && (
        <YStack
          backgroundColor={tokens.surface}
          borderTopWidth={1}
          borderBottomWidth={1}
          borderColor={tokens.border}
          paddingVertical={12}
          paddingHorizontal={isMobile ? 4 : 8}
          gap={12}
          width="100%"
        >
          <Text fontSize={13} fontWeight="900" color={tokens.text} textTransform="uppercase">
            2. Commercial Pricing &amp; Landed Margins
          </Text>

          <XStack gap={10} flexWrap="wrap">
            {/* MRP Input */}
            <YStack flex={1} gap={4}>
              <Text fontSize={12} color={tokens.textMuted} fontWeight="600">
                MRP (Strikethrough Price):
              </Text>
              <XStack alignItems="center" style={styles.currencyInputContainer}>
                <Text fontSize={14} fontWeight="700" color={tokens.textMuted}>
                  ₹
                </Text>
                <TextInput
                  value={mrp}
                  onChangeText={onChangeMrp}
                  keyboardType="numeric"
                  style={styles.currencyInput}
                />
              </XStack>
            </YStack>

            {/* Sale Price Input */}
            <YStack flex={1} gap={4}>
              <Text fontSize={12} color={tokens.textMuted} fontWeight="600">
                Sale Price (Selling Rate):
              </Text>
              <XStack alignItems="center" style={styles.currencyInputContainer}>
                <Text fontSize={14} fontWeight="800" color={tokens.accent}>
                  ₹
                </Text>
                <TextInput
                  value={salePrice}
                  onChangeText={onChangeSalePrice}
                  keyboardType="numeric"
                  style={[styles.currencyInput, { fontWeight: '800', color: tokens.text }]}
                />
              </XStack>
            </YStack>
          </XStack>

          {/* Commercial KPIs Summary Bar */}
          <XStack
            backgroundColor={tokens.surfaceRaised}
            borderRadius={8}
            padding={10}
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={8}
          >
            <YStack>
              <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                Base Landed Cost:
              </Text>
              <Text fontSize={13} fontWeight="800" color={tokens.text}>
                ₹{baseCostPrice.toLocaleString('en-IN')}
              </Text>
            </YStack>

            <YStack alignItems="center">
              <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                Storefront Discount:
              </Text>
              <Text fontSize={13} fontWeight="800" color="#10B981">
                {discountPercent}% OFF
              </Text>
            </YStack>

            <YStack alignItems="flex-end">
              <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                Gross Margin:
              </Text>
              <Text fontSize={13} fontWeight="800" color={tokens.accent}>
                ₹{estimatedMargin.toLocaleString('en-IN')} ({marginPercent}%)
              </Text>
            </YStack>
          </XStack>

          {/* Story Description Input */}
          <YStack gap={6} borderTopWidth={1} borderTopColor={tokens.border} paddingTop={8}>
            <Text fontSize={12} fontWeight="700" color={tokens.text}>
              About the Weave (PDP Narrative):
            </Text>
            <TextInput
              value={description}
              onChangeText={onChangeDescription}
              multiline
              numberOfLines={4}
              style={styles.textArea}
              placeholder="Enter authentic weaver story, zari details, and drape feel..."
            />
            <Text fontSize={11} color={tokens.textMuted}>
              {description.length} characters • Appears in the live PDP 'About the Weave' narrative.
            </Text>
          </YStack>
        </YStack>
      )}

      {/* ── TAB 3: SIZING, DRAPE & TAILORING ── */}
      {activeTab === 'sizing' && (
        <YStack
          backgroundColor={tokens.surface}
          borderTopWidth={1}
          borderBottomWidth={1}
          borderColor={tokens.border}
          paddingVertical={12}
          paddingHorizontal={isMobile ? 4 : 8}
          gap={12}
          width="100%"
        >
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={13} fontWeight="900" color={tokens.text} textTransform="uppercase">
              3. Sizing, Drape &amp; Tailoring Profile
            </Text>
            <View style={[styles.microBadge, { backgroundColor: '#F0FDF4' }]}>
              <Text fontSize={10} fontWeight="800" color="#16A34A">
                Powers SizeSelector
              </Text>
            </View>
          </XStack>

          {/* 1. Sizing System Variant Selector */}
          <YStack gap={6}>
            <Text fontSize={12} fontWeight="800" letterSpacing={0.8} color={tokens.accent} textTransform="uppercase">
              Sizing System Variant
            </Text>
            <SegmentedControl
              activeId={isNoSize ? 'no-size' : activeSizeCategory}
              onChange={(id) => handleSizeCategoryChange(id as SizeCategoryType)}
              options={[
                { id: 'no-size', label: 'No Size' },
                { id: 'letter', label: 'XS–5XL' },
                { id: 'numeric', label: 'Bust 32–44' },
                { id: 'kids', label: 'Kids 0–16Y' },
              ]}
            />
          </YStack>

          <View style={[styles.sectionSeparator, { backgroundColor: tokens.border }]} />

          {/* 2. Sizing Configuration: No-Size Informational vs Multi-Size Availability */}
          {isNoSize ? (
            /* ── NO SIZE: ONE SIZE VS FREE SIZE SUB-VARIANTS & INFORMATIONAL BADGE ── */
            <YStack gap={10} width="100%">
              <Text fontSize={12} color={tokens.textSecondary} lineHeight={16}>
                Apparel with universal drape does not require multi-size shopper selection. Choose whether this is unstitched (One Size) or a stitched blouse (Free Size). These render as non-selectable informational badges on the PDP.
              </Text>

              {/* Sub-variant Informational Selection Cards */}
              <XStack gap={8} flexWrap="wrap">
                <Pressable
                  onPress={() => handleNoSizeVariantChange('one-size')}
                  style={{
                    flex: 1,
                    minWidth: 160,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: noSizeVariant === 'one-size' ? tokens.accent : tokens.border,
                    backgroundColor: noSizeVariant === 'one-size' ? `${tokens.accent}12` : tokens.surface,
                  }}
                >
                  <YStack gap={2} flex={1}>
                    <XStack alignItems="center" gap={6}>
                      <Text fontSize={13} fontWeight="800" color={noSizeVariant === 'one-size' ? tokens.accent : tokens.text}>
                        One Size
                      </Text>
                      <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                        <Text fontSize={9} fontWeight="800" color="#0369A1">
                          Unstitched
                        </Text>
                      </View>
                    </XStack>
                    <Text fontSize={11} color={tokens.textMuted} lineHeight={14}>
                      Applicable for unstitched sarees &amp; dress materials
                    </Text>
                  </YStack>
                  <CustomCheckbox
                    checked={noSizeVariant === 'one-size'}
                    onToggle={() => handleNoSizeVariantChange('one-size')}
                    size={18}
                    accessibilityLabel="Select One Size"
                  />
                </Pressable>

                <Pressable
                  onPress={() => handleNoSizeVariantChange('free-size')}
                  style={{
                    flex: 1,
                    minWidth: 160,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: noSizeVariant === 'free-size' ? tokens.accent : tokens.border,
                    backgroundColor: noSizeVariant === 'free-size' ? `${tokens.accent}12` : tokens.surface,
                  }}
                >
                  <YStack gap={2} flex={1}>
                    <XStack alignItems="center" gap={6}>
                      <Text fontSize={13} fontWeight="800" color={noSizeVariant === 'free-size' ? tokens.accent : tokens.text}>
                        Free Size
                      </Text>
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                        <Text fontSize={9} fontWeight="800" color="#B45309">
                          Stitched Blouse
                        </Text>
                      </View>
                    </XStack>
                    <Text fontSize={11} color={tokens.textMuted} lineHeight={14}>
                      Applicable for stitched blouse sarees with free size
                    </Text>
                  </YStack>
                  <CustomCheckbox
                    checked={noSizeVariant === 'free-size'}
                    onToggle={() => handleNoSizeVariantChange('free-size')}
                    size={18}
                    accessibilityLabel="Select Free Size"
                  />
                </Pressable>
              </XStack>

              {/* Live Informational Badge Preview (Reusing SizeSelector Organism) */}
              <YStack gap={4} paddingTop={2} width="100%">
                <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                  Informational Button (Non-Selectable for Shopper on PDP):
                </Text>
                <SizeSelector
                  variant="no-size"
                  showHeader={false}
                  showSizeChart={false}
                  sizes={[
                    {
                      id: noSizeVariant === 'free-size' ? 'free_size' : 'one_size',
                      label: noSizeVariant === 'free-size' ? 'Free Size' : 'One Size',
                      subtitle: sizeDrapeText,
                      badge: noSizeVariant === 'free-size' ? 'Stitched Blouse' : 'Unstitched Drape',
                    },
                  ]}
                />
              </YStack>

              {/* Optional Editable Drape / Specification Text */}
              <YStack gap={4} paddingTop={2}>
                <Text fontSize={12} fontWeight="800" color={tokens.text}>
                  Garment Drape &amp; Specification Subtitle (Editable):
                </Text>
                <TextInput
                  value={sizeDrapeText}
                  onChangeText={(val) => updateSpecField('sizeDrapeText', val)}
                  placeholder="e.g. 5.5m Saree + 0.8m Unstitched Blouse Piece"
                  placeholderTextColor={tokens.textMuted}
                  style={styles.singleLineInput}
                />
              </YStack>
            </YStack>
          ) : (
            /* ── MULTI-SIZE: SIZE AVAILABILITY MATRIX (XS-5XL, NUMERIC, KIDS) ── */
            <YStack gap={8} width="100%">
              <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={6}>
                <XStack alignItems="center" gap={6}>
                  <Text fontSize={12} fontWeight="800" letterSpacing={0.8} color={tokens.accent} textTransform="uppercase">
                    Size Availability &amp; Stock
                  </Text>
                </XStack>
                <XStack alignItems="center" gap={8}>
                  {activeSizeCategory === 'letter' && (
                    <>
                      <Pressable onPress={handleSelectDefaultLetterSizes}>
                        <Text fontSize={11} color={tokens.accent} fontWeight="700">
                          M–3XL (Default)
                        </Text>
                      </Pressable>
                      <Text fontSize={11} color={tokens.textMuted}>•</Text>
                    </>
                  )}
                  <Pressable onPress={() => handleSelectAllSizes(true)}>
                    <Text fontSize={11} color={tokens.accent} fontWeight="700">
                      All
                    </Text>
                  </Pressable>
                  <Text fontSize={11} color={tokens.textMuted}>•</Text>
                  <Pressable onPress={() => handleSelectAllSizes(false)}>
                    <Text fontSize={11} color={tokens.textMuted} fontWeight="700">
                      Clear
                    </Text>
                  </Pressable>
                </XStack>
              </XStack>

              <XStack flexWrap="wrap" gap={8}>
                {getPoolForCategory(activeSizeCategory).map((opt) => {
                  const isAvailable = isSizeAvailable(opt.id);
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => toggleSizeAvailability(opt.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        borderColor: isAvailable ? tokens.accent : tokens.border,
                        backgroundColor: isAvailable ? `${tokens.accent}12` : tokens.surface,
                        cursor: 'pointer',
                      }}
                    >
                      <CustomCheckbox
                        checked={isAvailable}
                        onToggle={() => toggleSizeAvailability(opt.id)}
                        size={16}
                        accessibilityLabel={`Toggle ${opt.label}`}
                      />
                      <YStack gap={1}>
                        <Text fontSize={12.5} fontWeight={isAvailable ? '800' : '600'} color={isAvailable ? tokens.text : tokens.textMuted}>
                          {opt.label}
                        </Text>
                        {opt.subtitle && (
                          <Text fontSize={10} color={tokens.textMuted} fontWeight="600">
                            {opt.subtitle}
                          </Text>
                        )}
                      </YStack>
                    </Pressable>
                  );
                })}
              </XStack>

              {/* Custom Notes */}
              <YStack gap={4} paddingTop={4}>
                <Text fontSize={12} fontWeight="800" color={tokens.text}>
                  Custom Alteration Margin &amp; Fit Notes:
                </Text>
                <TextInput
                  value={specs.customNotes || ''}
                  onChangeText={(val) => updateSpecField('customNotes', val)}
                  placeholder="e.g. Includes 2-inch alteration allowance in side seams."
                  placeholderTextColor={tokens.textMuted}
                  style={styles.singleLineInput}
                />
              </YStack>

              {/* Shopper Size Selector Live Preview */}
              <YStack gap={4} paddingTop={4} width="100%">
                <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                  Shopper Size Selector Live Preview:
                </Text>
                <SizeSelector
                  variant={activeSizeCategory}
                  showHeader={false}
                  showSizeChart={false}
                  selected={
                    activeSizeCategory === 'letter'
                      ? 'M'
                      : getPoolForCategory(activeSizeCategory).find((opt) => isSizeAvailable(opt.id))?.id
                  }
                  sizes={getPoolForCategory(activeSizeCategory).map((opt) => ({
                    ...opt,
                    disabled: !isSizeAvailable(opt.id),
                  }))}
                  customNotes={specs.customNotes}
                />
              </YStack>
            </YStack>
          )}

          <View style={[styles.sectionSeparator, { backgroundColor: tokens.border }]} />

          {/* 3. Stitch Type Presets */}
          <YStack gap={4}>
            <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
              Stitch &amp; Construction State:
            </Text>
            <YStack gap={5}>
              {STITCH_TYPE_OPTIONS.map((opt) => {
                const isSelected = specs.stitchTypeId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => handleStitchTypeSelect(opt)}
                    style={[
                      styles.specListCard,
                      {
                        backgroundColor: isSelected ? `${tokens.accent}12` : tokens.surfaceRaised,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                        borderWidth: isSelected ? 1.5 : 1,
                      },
                    ]}
                  >
                    <XStack alignItems="center" justifyContent="space-between" width="100%">
                      <XStack alignItems="center" gap={6} flexWrap="wrap">
                        <Text fontSize={13.5} fontWeight={isSelected ? '800' : '700'} color={tokens.text}>
                          {opt.label}
                        </Text>
                        {opt.badge && (
                          <View style={[styles.chipPill, { backgroundColor: '#FEF3C7' }]}>
                            <Text fontSize={10} fontWeight="800" color="#B45309">
                              {opt.badge}
                            </Text>
                          </View>
                        )}
                      </XStack>
                      <CustomCheckbox
                        checked={isSelected}
                        onToggle={() => handleStitchTypeSelect(opt)}
                        size={18}
                        accessibilityLabel={opt.label}
                      />
                    </XStack>
                    {opt.description && (
                      <Text fontSize={11.5} color={tokens.textMuted} lineHeight={15}>
                        {opt.description}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </YStack>
          </YStack>

          <View style={[styles.sectionSeparator, { backgroundColor: tokens.border }]} />

          {/* 4. Blouse Format & Construction Selection */}
          <TaxonomyFacetChipSelector
            label="Blouse Format &amp; Construction:"
            options={BLOUSE_TYPE_OPTIONS}
            selectedId={specs.blouseTypeId || specs.blouseType}
            selectedName={specs.blouseTypeName}
            onSelect={(id, name) => {
              updateSpecField('blouseTypeId', id);
              updateSpecField('blouseTypeName', name);
              updateSpecField('blouseType', id as any);
            }}
            tokens={tokens}
          />

          <View style={[styles.sectionSeparator, { backgroundColor: tokens.border }]} />

          {/* 5. Saree & Blouse Dimensions */}
          <XStack gap={10}>
            <YStack flex={1} gap={4}>
              <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                Saree Drape Length (m):
              </Text>
              <TextInput
                value={specs.sareeLengthMetres.toString()}
                onChangeText={handleSareeLengthChange}
                keyboardType="numeric"
                style={styles.dimensionInput}
              />
            </YStack>

            <YStack flex={1} gap={4}>
              <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                Blouse Piece Length (m):
              </Text>
              <TextInput
                value={specs.blousePieceLengthMetres.toString()}
                onChangeText={handleBlouseLengthChange}
                keyboardType="numeric"
                style={styles.dimensionInput}
              />
            </YStack>
          </XStack>

          {/* 6. Package Contents */}
          <YStack gap={4}>
            <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
              Package Contents Description:
            </Text>
            <TextInput
              value={specs.packageContents}
              onChangeText={(val) => updateSpecField('packageContents', val)}
              style={styles.singleLineInput}
            />
          </YStack>
        </YStack>
      )}

      {/* ── TAB 4: OCCASIONS, SEARCH & CARE ── */}
      {activeTab === 'occasions_tags' && (
        <YStack
          backgroundColor={tokens.surface}
          borderTopWidth={1}
          borderBottomWidth={1}
          borderColor={tokens.border}
          paddingVertical={12}
          paddingHorizontal={isMobile ? 4 : 8}
          gap={12}
          width="100%"
        >
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={13} fontWeight="900" color={tokens.text} textTransform="uppercase">
              4. Occasion Facets &amp; Search Relevance
            </Text>
          </XStack>

          {/* Occasion Chips (Multi-Select with Custom Occasion Entry) */}
          <YStack gap={6}>
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
                Occasion Tags (Select all that apply):
              </Text>
              <Pressable
                onPress={() => setIsAddingOccasion(!isAddingOccasion)}
                style={styles.customToggleBtn}
              >
                {isAddingOccasion ? (
                  <LuX size={13} color={tokens.accent} />
                ) : (
                  <LuPlus size={13} color={tokens.accent} />
                )}
                <Text fontSize={12} fontWeight="700" color={tokens.accent}>
                  {isAddingOccasion ? 'Cancel' : 'Custom Occasion'}
                </Text>
              </Pressable>
            </XStack>

            {isAddingOccasion && (
              <XStack gap={8} alignItems="center" marginBottom={6} width="100%">
                <TextInput
                  value={customOccasionInput}
                  onChangeText={setCustomOccasionInput}
                  placeholder="e.g. Sangeet Night, Housewarming Puja..."
                  placeholderTextColor={tokens.textMuted}
                  onSubmitEditing={handleAddCustomOccasion}
                  autoFocus
                  style={styles.customTextInput}
                />
                <Pressable
                  onPress={handleAddCustomOccasion}
                  style={[styles.customConfirmBtn, { backgroundColor: tokens.accent }]}
                >
                  <LuCheck size={14} color="#FFFFFF" strokeWidth={2.5} />
                  <Text fontSize={12} fontWeight="800" color="#FFFFFF">
                    Add
                  </Text>
                </Pressable>
              </XStack>
            )}

            <XStack flexWrap="wrap" gap={6}>
              {OCCASION_OPTIONS.map((opt) => {
                const isSelected = specs.occasions?.includes(opt.id);
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => toggleOccasion(opt.id)}
                    style={[
                      styles.specChip,
                      {
                        backgroundColor: isSelected ? `${tokens.accent}16` : tokens.surfaceRaised,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                      },
                    ]}
                  >
                    <Text fontSize={12} fontWeight={isSelected ? '800' : '600'} color={isSelected ? tokens.accent : tokens.text}>
                      {opt.label}
                    </Text>
                    {opt.badge && (
                      <View style={[styles.chipPill, { backgroundColor: '#EDE9FE' }]}>
                        <Text fontSize={9.5} fontWeight="800" color="#7C3AED">
                          {opt.badge}
                        </Text>
                      </View>
                    )}
                    {isSelected && <LuCheck size={12} color={tokens.accent} />}
                  </Pressable>
                );
              })}

              {/* Any custom occasions */}
              {specs.occasions?.filter((id) => id.startsWith('custom_')).map((customId) => (
                <Pressable
                  key={customId}
                  onPress={() => toggleOccasion(customId)}
                  style={[
                    styles.specChip,
                    {
                      backgroundColor: `${tokens.accent}16`,
                      borderColor: tokens.accent,
                    },
                  ]}
                >
                  <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                    {customId.replace('custom_', '').replace(/_/g, ' ')}
                  </Text>
                  <View style={[styles.chipPill, { backgroundColor: '#FEE2E2' }]}>
                    <Text fontSize={9.5} fontWeight="800" color="#DC2626">
                      Custom
                    </Text>
                  </View>
                  <LuCheck size={12} color={tokens.accent} />
                </Pressable>
              ))}
            </XStack>
          </YStack>

          <View style={[styles.sectionSeparator, { backgroundColor: tokens.border }]} />

          {/* Search Relevance Tags */}
          <YStack gap={6}>
            <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
              Search Relevance Keywords &amp; Synonyms:
            </Text>
            <XStack gap={6}>
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={handleAddSearchTag}
                placeholder="e.g. pattu saree, wedding wear..."
                placeholderTextColor={tokens.textMuted}
                style={[styles.singleLineInput, { flex: 1, height: 34, fontSize: 13 }]}
              />
              <Pressable
                onPress={handleAddSearchTag}
                style={[styles.addTagBtn, { backgroundColor: tokens.accent, height: 34, paddingHorizontal: 14, justifyContent: 'center' }]}
              >
                <Text fontSize={12} fontWeight="800" color="#FFFFFF">
                  Add Tag
                </Text>
              </Pressable>
            </XStack>

            <XStack flexWrap="wrap" gap={4}>
              {specs.searchTags?.map((tag) => (
                <View key={tag} style={styles.relevanceTag}>
                  <Text fontSize={11} fontWeight="700" color="#334155">
                    #{tag}
                  </Text>
                  <Pressable onPress={() => handleRemoveSearchTag(tag)} hitSlop={6}>
                    <Text fontSize={11} fontWeight="800" color="#94A3B8">
                      ×
                    </Text>
                  </Pressable>
                </View>
              ))}
            </XStack>
          </YStack>

          <View style={[styles.sectionSeparator, { backgroundColor: tokens.border }]} />

          {/* Care Instructions */}
          <YStack gap={4}>
            <Text fontSize={12} color={tokens.textMuted} fontWeight="600">
              Care &amp; Wash Instructions:
            </Text>
            <TextInput
              value={specs.careInstructions}
              onChangeText={(val) => updateSpecField('careInstructions', val)}
              style={styles.singleLineInput}
            />
          </YStack>
        </YStack>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  aiDeriveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    cursor: 'pointer',
  },
  tabScrollWrapper: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    maxWidth: '100%',
    display: 'flex',
    touchAction: 'pan-x pan-y',
    scrollbarWidth: 'none',
  } as any,
  tabScrollContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 3,
    flexShrink: 0,
  } as any,
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  } as any,
  microBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  horizontalScrollWrapper: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    maxWidth: '100%',
    touchAction: 'pan-x pan-y',
    scrollbarWidth: 'none',
  } as any,
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
    flexShrink: 0,
  } as any,
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  } as any,
  chipPill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
    width: '100%',
  },
  customToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    cursor: 'pointer',
  },
  customTextInput: {
    flex: 1,
    height: 34,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#1E293B',
  },
  customConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 6,
    cursor: 'pointer',
  },
  specListCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
    gap: 2,
    cursor: 'pointer',
  },
  currencyInputContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  currencyInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    padding: 0,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 18,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  dimensionInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    color: '#1E293B',
  },
  singleLineInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 12,
    color: '#1E293B',
  },
  addTagBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  relevanceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
});

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { Pressable, StyleSheet, ScrollView, View } from 'react-native';
import { YStack, XStack, Text, Input } from 'tamagui';
import {
  LuSmartphone,
  LuTablet,
  LuMonitor,
  LuSparkles,
  LuCheck,
  LuEye,
  LuSlidersHorizontal,
  LuInfo,
  LuShoppingBag,
  LuChevronRight,
  LuPencil,
  LuLayers,
  LuTag,
  LuWifi,
  LuBattery,
  LuRotateCcw,
  LuCheckCheck,
} from 'react-icons/lu';
import { SizeSelector } from '../../components/organisms/SizeSelector/SizeSelector';
import { SegmentedControl } from '../../components/atoms/SegmentedControl/SegmentedControl';
import { CustomCheckbox } from '../../components/atoms/CustomCheckbox/CustomCheckbox';
import {
  getAllCatalogProducts,
  CatalogTestProduct,
  SizeCategoryType,
  SizeOption,
  LETTER_SIZE_PRESET,
  BLOUSE_NUMERIC_PRESET,
  KIDS_SIZE_PRESET,
  FREE_SIZE_PRESET,
  ONE_SIZE_PRESET,
} from '../../data/catalog';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { useTheme, useResponsive, FormFactorContext, FormFactor } from '../../theme';

const meta: Meta<any> = {
  title: 'Curation/SizeSettingWorkflow',
  args: {
    ...THEME_ARGS,
  },
  argTypes: {
    ...THEME_ARG_TYPES,
  },
};
export default meta;

export interface CurationWorkflowProps {
  overrideFactor?: FormFactor;
  hideToolbar?: boolean;
}

export function SizeSettingWorkflowComponent({
  overrideFactor,
  hideToolbar = false,
}: CurationWorkflowProps) {
  const { tokens } = useTheme();
  const responsive = useResponsive();

  // Active form factor state (Auto or manual override)
  const [selectedFactor, setSelectedFactor] = useState<FormFactor | 'auto'>(
    overrideFactor || 'auto'
  );

  const effectiveFactor: FormFactor =
    overrideFactor ||
    (selectedFactor === 'auto' ? responsive.factor : selectedFactor);

  const isMobile = effectiveFactor === 'mobile';
  const isTablet = effectiveFactor === 'tablet';
  const isDesktop = effectiveFactor === 'desktop';

  // Mobile navigation tab: 'settings' | 'preview' | 'split'
  const [mobileTab, setMobileTab] = useState<'settings' | 'preview' | 'split'>('settings');

  // Preview device frame selector for desktop/tablet view: 'phone' (390px) | 'tablet' (540px) | 'full'
  const [previewDeviceMode, setPreviewDeviceMode] = useState<'phone' | 'tablet' | 'full'>('phone');

  const allProducts = getAllCatalogProducts();

  // Curator Selected State
  const [selectedProductSku, setSelectedProductSku] = useState<string>('VF46D'); // Default to Kids wear
  const activeProduct = allProducts.find((p) => p.sku === selectedProductSku) || allProducts[0];

  const [activeSizeCategory, setActiveSizeCategory] = useState<SizeCategoryType>(
    activeProduct.sizeConfig.type === 'free-size' ? 'no-size' : activeProduct.sizeConfig.type
  );

  // No-Size informational options: 'one-size' (unstitched) vs 'free-size' (stitched blouse with free size)
  const [noSizeOptionType, setNoSizeOptionType] = useState<'one-size' | 'free-size'>(
    activeProduct.category.toLowerCase().includes('blouse') ? 'free-size' : 'one-size'
  );
  const [noSizeCustomSubtitle, setNoSizeCustomSubtitle] = useState<string>(
    activeProduct.sizeConfig.options[0]?.subtitle || '5.5m Saree + 0.8m Unstitched Blouse Piece'
  );

  const [availableSizes, setAvailableSizes] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    activeProduct.sizeConfig.options.forEach((opt, idx) => {
      // simulate first few in stock, last out of stock
      init[opt.id] = idx < activeProduct.sizeConfig.options.length - 2;
    });
    return init;
  });

  const [customNote, setCustomNote] = useState<string>(
    activeProduct.sizeConfig.customNotes || 'Includes 2-inch alteration allowance in side seams.'
  );

  // Shopper's PDP selection in live preview
  const [shopperSelectedSize, setShopperSelectedSize] = useState<string>(
    activeProduct.sizeConfig.defaultSelected || '20'
  );

  // When product changes, sync curator controls
  const handleProductChange = (sku: string) => {
    setSelectedProductSku(sku);
    const prod = allProducts.find((p) => p.sku === sku);
    if (prod) {
      const isProdNoSize = prod.sizeConfig.type === 'free-size' || prod.sizeConfig.type === 'no-size';
      setActiveSizeCategory(isProdNoSize ? 'no-size' : prod.sizeConfig.type);
      if (isProdNoSize) {
        const isBlouse = prod.category.toLowerCase().includes('blouse');
        setNoSizeOptionType(isBlouse ? 'free-size' : 'one-size');
        setNoSizeCustomSubtitle(
          prod.sizeConfig.options[0]?.subtitle ||
            (isBlouse ? 'Stitched Blouse with Free Size / Alterable Seams' : '5.5m Saree + 0.8m Unstitched Blouse Piece')
        );
      }
      const init: Record<string, boolean> = {};
      prod.sizeConfig.options.forEach((opt, idx) => {
        init[opt.id] = idx < prod.sizeConfig.options.length - 1;
      });
      setAvailableSizes(init);
      setCustomNote(prod.sizeConfig.customNotes || '');
      setShopperSelectedSize(prod.sizeConfig.defaultSelected || prod.sizeConfig.options[0]?.id || '');
    }
  };

  // Get raw pool of options based on active category
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
        return noSizeOptionType === 'free-size' ? FREE_SIZE_PRESET : ONE_SIZE_PRESET;
    }
  };

  const isNoSizeCategory = activeSizeCategory === 'no-size' || activeSizeCategory === 'free-size';
  const currentPool = getPoolForCategory(activeSizeCategory);

  // Quick actions: select all / deselect all
  const handleSelectAllSizes = (enable: boolean) => {
    const next: Record<string, boolean> = {};
    currentPool.forEach((opt) => {
      next[opt.id] = enable;
    });
    setAvailableSizes(next);
  };

  // Build options for live PDP preview based on curator's availability checkboxes
  const livePdpSizes: SizeOption[] = isNoSizeCategory
    ? [
        {
          id: noSizeOptionType === 'one-size' ? 'one_size' : 'free_size',
          label: noSizeOptionType === 'one-size' ? 'One Size' : 'Free Size',
          subtitle: noSizeCustomSubtitle,
          badge: noSizeOptionType === 'one-size' ? 'Universal Drape' : 'Free Size Stitched',
        },
      ]
    : currentPool.map((opt) => ({
        ...opt,
        disabled: availableSizes[opt.id] === false,
      }));

  // Container width calculation
  const workspaceWidth = isMobile ? 390 : isTablet ? 768 : 1100;

  // Render Curator Configuration Controls (Container 1)
  const renderCuratorControls = () => (
    <YStack
      flex={isMobile ? undefined : 1}
      width={isMobile ? '100%' : undefined}
      backgroundColor={tokens.surface}
      borderColor={tokens.border}
      borderWidth={1}
      borderRadius={16}
      padding={isMobile ? 12 : 16}
      gap={14}
      style={styles.containerShadow}
    >
      {/* Step 1 Header */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" gap={6}>
          <XStack
            width={22}
            height={22}
            borderRadius={11}
            backgroundColor={tokens.accent}
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={11} fontWeight="900" color="#FFFFFF">
              1
            </Text>
          </XStack>
          <Text fontSize={12.5} fontWeight="800" letterSpacing={0.8} color={tokens.accent} textTransform="uppercase">
            Catalog Product Sample
          </Text>
        </XStack>

        <XStack backgroundColor={tokens.surfaceRaised} paddingHorizontal={8} paddingVertical={2} borderRadius={8}>
          <Text fontSize={10.5} fontWeight="700" color={tokens.textMuted}>
            {allProducts.length} presets
          </Text>
        </XStack>
      </XStack>

      {/* Product Picker: Swipeable Horizontal Strip for Mobile, Wrap for Desktop */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productScrollContent}
      >
        <XStack gap={6} alignItems="center">
          {allProducts.map((p) => {
            const isSelected = p.sku === selectedProductSku;
            return (
              <Pressable
                key={p.sku}
                onPress={() => handleProductChange(p.sku)}
                style={[
                  styles.productChip,
                  {
                    borderColor: isSelected ? tokens.accent : tokens.border,
                    backgroundColor: isSelected ? tokens.accent : tokens.surfaceRaised,
                  },
                ]}
              >
                <XStack alignItems="center" gap={5}>
                  <Text
                    fontSize={11.5}
                    fontWeight="800"
                    color={isSelected ? tokens.accentForeground : tokens.text}
                  >
                    {p.sku}
                  </Text>
                  <XStack
                    backgroundColor={isSelected ? 'rgba(255,255,255,0.2)' : tokens.border}
                    paddingHorizontal={4}
                    paddingVertical={1}
                    borderRadius={4}
                  >
                    <Text
                      fontSize={9}
                      fontWeight="700"
                      color={isSelected ? tokens.accentForeground : tokens.textMuted}
                    >
                      {p.category.toUpperCase()}
                    </Text>
                  </XStack>
                </XStack>
              </Pressable>
            );
          })}
        </XStack>
      </ScrollView>

      {/* Step 2: Sizing System Variant */}
      <YStack gap={6} paddingTop={4}>
        <XStack alignItems="center" gap={6}>
          <XStack
            width={22}
            height={22}
            borderRadius={11}
            backgroundColor={tokens.accent}
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={11} fontWeight="900" color="#FFFFFF">
              2
            </Text>
          </XStack>
          <Text fontSize={12.5} fontWeight="800" letterSpacing={0.8} color={tokens.accent} textTransform="uppercase">
            Sizing System Variant
          </Text>
        </XStack>

        <SegmentedControl
          activeId={isNoSizeCategory ? 'no-size' : activeSizeCategory}
          onChange={(id) => {
            const newCat = id as SizeCategoryType;
            setActiveSizeCategory(newCat);
            const pool = getPoolForCategory(newCat);
            const init: Record<string, boolean> = {};
            pool.forEach((opt, idx) => (init[opt.id] = idx < pool.length - 1));
            setAvailableSizes(init);
            setShopperSelectedSize(pool[0]?.id || '');
          }}
          options={[
            { id: 'no-size', label: isMobile ? 'No Size' : 'No Size' },
            { id: 'letter', label: isMobile ? 'Letter' : 'Letter (XS-3XL)' },
            { id: 'numeric', label: isMobile ? 'Bust' : 'Bust 32-44' },
            { id: 'kids', label: isMobile ? 'Kids' : 'Kids (0-16Y)' },
          ]}
        />
      </YStack>

      {/* Step 3: Size Availability Matrix OR No Size Informational Options */}
      <YStack gap={8} paddingTop={4}>
        <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={4}>
          <XStack alignItems="center" gap={6}>
            <XStack
              width={22}
              height={22}
              borderRadius={11}
              backgroundColor={tokens.accent}
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={11} fontWeight="900" color="#FFFFFF">
                3
              </Text>
            </XStack>
            <Text fontSize={12.5} fontWeight="800" letterSpacing={0.8} color={tokens.accent} textTransform="uppercase">
              {isNoSizeCategory ? 'Garment Fit & Badge' : 'Stock Availability'}
            </Text>
          </XStack>

          {!isNoSizeCategory && (
            <XStack gap={8} alignItems="center">
              <Pressable onPress={() => handleSelectAllSizes(true)}>
                <Text fontSize={11} color={tokens.accent} fontWeight="700">
                  Select All
                </Text>
              </Pressable>
              <Text fontSize={11} color={tokens.textMuted}>
                •
              </Text>
              <Pressable onPress={() => handleSelectAllSizes(false)}>
                <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                  Clear
                </Text>
              </Pressable>
            </XStack>
          )}
        </XStack>

        {isNoSizeCategory ? (
          <YStack gap={10}>
            <Text fontSize={11.5} color={tokens.textSecondary} lineHeight={16}>
              Apparel with universal drape does not require multi-size shopper selection. Non-selectable informational badges are presented on the PDP.
            </Text>

            {/* Sub-variant Informational Option Cards: Full width on mobile to avoid awkward wrapping */}
            <XStack flexDirection={isMobile ? 'column' : 'row'} gap={8} width="100%">
              {/* Option 1: One Size */}
              <Pressable
                onPress={() => {
                  setNoSizeOptionType('one-size');
                  setNoSizeCustomSubtitle('5.5m Saree + 0.8m Unstitched Blouse Piece');
                }}
                style={[
                  styles.noSizeOptionCard,
                  {
                    flex: isMobile ? undefined : 1,
                    width: isMobile ? '100%' : undefined,
                    borderColor: noSizeOptionType === 'one-size' ? tokens.accent : tokens.border,
                    backgroundColor: noSizeOptionType === 'one-size' ? `${tokens.accent}12` : tokens.surfaceRaised,
                  },
                ]}
              >
                <XStack alignItems="center" justifyContent="space-between" width="100%">
                  <YStack gap={2} flex={1}>
                    <XStack alignItems="center" gap={6}>
                      <Text
                        fontSize={13}
                        fontWeight="800"
                        color={noSizeOptionType === 'one-size' ? tokens.accent : tokens.text}
                      >
                        One Size
                      </Text>
                      <XStack backgroundColor="#E0F2FE" paddingHorizontal={5} paddingVertical={1} borderRadius={4}>
                        <Text fontSize={9} fontWeight="800" color="#0369A1">
                          Unstitched
                        </Text>
                      </XStack>
                    </XStack>
                    <Text fontSize={10.5} color={tokens.textMuted} lineHeight={14}>
                      Unstitched sarees & dress materials
                    </Text>
                  </YStack>

                  <XStack
                    width={18}
                    height={18}
                    borderRadius={9}
                    borderWidth={1.5}
                    borderColor={noSizeOptionType === 'one-size' ? tokens.accent : tokens.border}
                    backgroundColor={noSizeOptionType === 'one-size' ? tokens.accent : 'transparent'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {noSizeOptionType === 'one-size' && <LuCheck size={11} color="#FFFFFF" />}
                  </XStack>
                </XStack>
              </Pressable>

              {/* Option 2: Free Size */}
              <Pressable
                onPress={() => {
                  setNoSizeOptionType('free-size');
                  setNoSizeCustomSubtitle('Stitched Blouse with Free Size / Alterable Seams');
                }}
                style={[
                  styles.noSizeOptionCard,
                  {
                    flex: isMobile ? undefined : 1,
                    width: isMobile ? '100%' : undefined,
                    borderColor: noSizeOptionType === 'free-size' ? tokens.accent : tokens.border,
                    backgroundColor: noSizeOptionType === 'free-size' ? `${tokens.accent}12` : tokens.surfaceRaised,
                  },
                ]}
              >
                <XStack alignItems="center" justifyContent="space-between" width="100%">
                  <YStack gap={2} flex={1}>
                    <XStack alignItems="center" gap={6}>
                      <Text
                        fontSize={13}
                        fontWeight="800"
                        color={noSizeOptionType === 'free-size' ? tokens.accent : tokens.text}
                      >
                        Free Size
                      </Text>
                      <XStack backgroundColor="#FEF3C7" paddingHorizontal={5} paddingVertical={1} borderRadius={4}>
                        <Text fontSize={9} fontWeight="800" color="#B45309">
                          Stitched Blouse
                        </Text>
                      </XStack>
                    </XStack>
                    <Text fontSize={10.5} color={tokens.textMuted} lineHeight={14}>
                      Stitched blouse sarees with alterable seams
                    </Text>
                  </YStack>

                  <XStack
                    width={18}
                    height={18}
                    borderRadius={9}
                    borderWidth={1.5}
                    borderColor={noSizeOptionType === 'free-size' ? tokens.accent : tokens.border}
                    backgroundColor={noSizeOptionType === 'free-size' ? tokens.accent : 'transparent'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {noSizeOptionType === 'free-size' && <LuCheck size={11} color="#FFFFFF" />}
                  </XStack>
                </XStack>
              </Pressable>
            </XStack>

            {/* Informational Badge Live Pill */}
            <YStack gap={4} paddingTop={2}>
              <Text fontSize={10.5} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                Storefront Shopper Pill:
              </Text>
              <XStack
                alignItems="center"
                gap={8}
                paddingHorizontal={12}
                paddingVertical={7}
                borderRadius={8}
                borderWidth={1}
                borderColor={tokens.accent}
                backgroundColor={`${tokens.accent}10`}
                alignSelf="flex-start"
              >
                <LuInfo size={13} color={tokens.accent} />
                <Text fontSize={12} fontWeight="800" color={tokens.accent}>
                  {noSizeOptionType === 'one-size' ? 'One Size' : 'Free Size'}
                </Text>
                <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                  • {noSizeCustomSubtitle}
                </Text>
              </XStack>
            </YStack>

            {/* Optional Editable Drape Text */}
            <YStack gap={4} paddingTop={2}>
              <Text fontSize={11.5} fontWeight="800" color={tokens.text}>
                Optional Drape Specification Text (Editable):
              </Text>
              <Input
                value={noSizeCustomSubtitle}
                onChangeText={setNoSizeCustomSubtitle}
                placeholder="e.g. 5.5m Saree + 0.8m Unstitched Blouse Piece"
                fontSize={12}
                backgroundColor={tokens.surfaceRaised}
                borderColor={tokens.border}
                borderRadius={8}
                paddingHorizontal={10}
                paddingVertical={7}
              />

              {/* Quick Suggestion Chips */}
              <XStack gap={6} flexWrap="wrap" paddingTop={2}>
                {[
                  '5.5m Saree + 0.8m Unstitched Blouse Piece',
                  'Semi-Stitched Free Waist (28"-42")',
                  'Universal Free Drape',
                ].map((txt) => (
                  <Pressable
                    key={txt}
                    onPress={() => setNoSizeCustomSubtitle(txt)}
                    style={[
                      styles.suggestionChip,
                      {
                        backgroundColor: tokens.surfaceRaised,
                        borderColor: tokens.border,
                      },
                    ]}
                  >
                    <Text fontSize={10} color={tokens.textSecondary} fontWeight="600">
                      + {txt}
                    </Text>
                  </Pressable>
                ))}
              </XStack>
            </YStack>
          </YStack>
        ) : (
          // Multi-Size Availability Matrix: 2-column grid on mobile, 3-column on desktop
          <XStack flexWrap="wrap" gap={8}>
            {currentPool.map((opt) => {
              const isAvailable = availableSizes[opt.id] !== false;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    setAvailableSizes((prev) => ({
                      ...prev,
                      [opt.id]: !isAvailable,
                    }));
                  }}
                  style={[
                    styles.sizeStockTile,
                    {
                      width: isMobile ? '48%' : '31%',
                      backgroundColor: isAvailable ? tokens.surface : tokens.surfaceRaised,
                      borderColor: isAvailable ? tokens.border : `${tokens.border}88`,
                    },
                  ]}
                >
                  <XStack alignItems="center" gap={7}>
                    <CustomCheckbox
                      checked={isAvailable}
                      onToggle={() => {
                        setAvailableSizes((prev) => ({
                          ...prev,
                          [opt.id]: !isAvailable,
                        }));
                      }}
                    />
                    <YStack flex={1}>
                      <Text
                        fontSize={12}
                        fontWeight="800"
                        color={isAvailable ? tokens.text : tokens.textMuted}
                        numberOfLines={1}
                      >
                        {opt.label}
                      </Text>
                      {opt.subtitle && (
                        <Text fontSize={10} color={tokens.textMuted} numberOfLines={1}>
                          {opt.subtitle}
                        </Text>
                      )}
                    </YStack>
                  </XStack>

                  <XStack
                    backgroundColor={isAvailable ? '#DCFCE7' : '#F1F5F9'}
                    paddingHorizontal={4}
                    paddingVertical={1}
                    borderRadius={4}
                    alignSelf="flex-start"
                  >
                    <Text
                      fontSize={8.5}
                      fontWeight="800"
                      color={isAvailable ? '#15803D' : '#64748B'}
                    >
                      {isAvailable ? 'IN STOCK' : 'OUT'}
                    </Text>
                  </XStack>
                </Pressable>
              );
            })}
          </XStack>
        )}
      </YStack>

      {/* Step 4: Custom Tailoring & Alteration Notes */}
      <YStack gap={6} paddingTop={4}>
        <XStack alignItems="center" gap={6}>
          <XStack
            width={22}
            height={22}
            borderRadius={11}
            backgroundColor={tokens.accent}
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={11} fontWeight="900" color="#FFFFFF">
              4
            </Text>
          </XStack>
          <Text fontSize={12.5} fontWeight="800" letterSpacing={0.8} color={tokens.accent} textTransform="uppercase">
            Tailoring & Alteration Notes
          </Text>
        </XStack>

        <Input
          value={customNote}
          onChangeText={setCustomNote}
          placeholder="e.g. Includes 2-inch alteration allowance in side seams."
          fontSize={12}
          backgroundColor={tokens.surfaceRaised}
          borderColor={tokens.border}
          borderRadius={8}
          paddingHorizontal={10}
          paddingVertical={7}
        />

        {/* Suggestion Chips */}
        <XStack gap={6} flexWrap="wrap">
          {[
            'Includes 2-inch alteration allowance in side seams.',
            'Pre-stitched padded cups with back dori.',
            'Hypoallergenic cotton lining inside.',
          ].map((tag) => (
            <Pressable
              key={tag}
              onPress={() => setCustomNote(tag)}
              style={[
                styles.suggestionChip,
                {
                  backgroundColor: tokens.surfaceRaised,
                  borderColor: tokens.border,
                },
              ]}
            >
              <Text fontSize={10} color={tokens.textSecondary} fontWeight="600">
                + {tag}
              </Text>
            </Pressable>
          ))}
        </XStack>
      </YStack>
    </YStack>
  );

  // Render Storefront PDP Preview (Container 2)
  const renderStorePdpPreview = () => (
    <YStack
      flex={isMobile ? undefined : 1}
      width={isMobile ? '100%' : undefined}
      alignItems={isMobile ? 'stretch' : 'center'}
    >
      {/* Device Frame Simulation */}
      <YStack
        width={
          isMobile
            ? '100%'
            : previewDeviceMode === 'phone'
            ? 390
            : previewDeviceMode === 'tablet'
            ? 520
            : '100%'
        }
        maxWidth="100%"
        backgroundColor={tokens.surface}
        borderColor={tokens.border}
        borderWidth={1}
        borderRadius={isMobile ? 16 : 24}
        overflow="hidden"
        style={styles.deviceFrameShadow}
      >
        {/* Device Top Chassis Header */}
        <YStack backgroundColor="#0F172A" paddingHorizontal={14} paddingVertical={8} gap={6}>
          {/* Status Bar */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={11} fontWeight="800" color="#F8FAFC">
              9:41
            </Text>
            {/* Dynamic Island / Speaker Pill */}
            <XStack
              width={70}
              height={12}
              borderRadius={6}
              backgroundColor="#020617"
              alignItems="center"
              justifyContent="center"
            >
              <XStack width={6} height={6} borderRadius={3} backgroundColor="#1E293B" />
            </XStack>
            <XStack alignItems="center" gap={5}>
              <LuWifi size={11} color="#F8FAFC" />
              <LuBattery size={13} color="#F8FAFC" />
            </XStack>
          </XStack>

          {/* Shopper Mode Banner with Device Frame Controls */}
          <XStack justifyContent="space-between" alignItems="center" paddingTop={2}>
            <XStack alignItems="center" gap={5}>
              <XStack width={6} height={6} borderRadius={3} backgroundColor="#10B981" />
              <Text fontSize={10} fontWeight="800" color="#E2E8F0" letterSpacing={0.8}>
                LIVE PDP PREVIEW • {activeProduct.sku}
              </Text>
            </XStack>

            {/* If on desktop/tablet, allow toggling the preview frame size */}
            {!isMobile && (
              <XStack backgroundColor="#1E293B" borderRadius={6} padding={2} gap={2}>
                <Pressable
                  onPress={() => setPreviewDeviceMode('phone')}
                  style={[
                    styles.deviceModePill,
                    previewDeviceMode === 'phone' && styles.deviceModePillActive,
                  ]}
                >
                  <LuSmartphone size={10} color={previewDeviceMode === 'phone' ? '#FFF' : '#94A3B8'} />
                </Pressable>
                <Pressable
                  onPress={() => setPreviewDeviceMode('tablet')}
                  style={[
                    styles.deviceModePill,
                    previewDeviceMode === 'tablet' && styles.deviceModePillActive,
                  ]}
                >
                  <LuTablet size={10} color={previewDeviceMode === 'tablet' ? '#FFF' : '#94A3B8'} />
                </Pressable>
                <Pressable
                  onPress={() => setPreviewDeviceMode('full')}
                  style={[
                    styles.deviceModePill,
                    previewDeviceMode === 'full' && styles.deviceModePillActive,
                  ]}
                >
                  <LuMonitor size={10} color={previewDeviceMode === 'full' ? '#FFF' : '#94A3B8'} />
                </Pressable>
              </XStack>
            )}
          </XStack>
        </YStack>

        {/* Inner Phone Screen Content */}
        <YStack padding={isMobile ? 14 : 16} gap={14}>
          {/* Header */}
          <YStack gap={3}>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={11} fontWeight="800" color={tokens.accent} letterSpacing={1.2} textTransform="uppercase">
                {activeProduct.brand}
              </Text>
              <XStack backgroundColor="#FEF3C7" paddingHorizontal={5} paddingVertical={1} borderRadius={4}>
                <Text fontSize={9} fontWeight="800" color="#B45309">
                  ★ 4.8 (248)
                </Text>
              </XStack>
            </XStack>

            <Text fontSize={16} fontWeight="900" color={tokens.text}>
              {activeProduct.title}
            </Text>

            <XStack alignItems="baseline" gap={8} paddingTop={2}>
              <Text fontSize={18} fontWeight="900" color={tokens.text}>
                ₹{activeProduct.price.toLocaleString('en-IN')}
              </Text>
              <Text fontSize={13} color={tokens.textMuted} textDecorationLine="line-through">
                ₹{activeProduct.originalPrice.toLocaleString('en-IN')}
              </Text>
              <Text fontSize={12} fontWeight="800" color="#15803D">
                {activeProduct.discountPercent}% OFF
              </Text>
            </XStack>
          </YStack>

          {/* Divider */}
          <YStack height={1} backgroundColor={tokens.border} width="100%" />

          {/* Reactive Size Selector Component */}
          <SizeSelector
            variant={isNoSizeCategory ? 'no-size' : activeSizeCategory}
            category={activeProduct.category}
            sizes={livePdpSizes}
            selected={shopperSelectedSize}
            onSelect={setShopperSelectedSize}
            customNotes={customNote}
            showSizeChart={true}
          />

          {/* Simulated Add to Bag */}
          <YStack
            marginTop={8}
            backgroundColor={tokens.accent}
            paddingVertical={12}
            borderRadius={10}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            hoverStyle={{ opacity: 0.92 }}
            pressStyle={{ scale: 0.98 }}
          >
            <XStack alignItems="center" gap={6}>
              <LuShoppingBag size={14} color={tokens.accentForeground} />
              <Text fontSize={13} fontWeight="900" color={tokens.accentForeground} letterSpacing={0.8}>
                ADD TO BAG • ₹{activeProduct.price.toLocaleString('en-IN')}
              </Text>
            </XStack>
          </YStack>
        </YStack>
      </YStack>
    </YStack>
  );

  return (
    <YStack padding={isMobile ? 8 : 16} gap={14} width="100%" maxWidth={workspaceWidth} alignSelf="center">
      {/* Top Header & Instructions */}
      <YStack gap={4}>
        <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={8}>
          <XStack alignItems="center" gap={8}>
            <LuSlidersHorizontal size={18} color={tokens.accent} />
            <Text fontSize={isMobile ? 16 : 18} fontWeight="900" color={tokens.text}>
              Product Size Curation & Live PDP Sync
            </Text>
          </XStack>

          {/* Active SKU Indicator */}
          <XStack
            backgroundColor={tokens.surfaceRaised}
            paddingHorizontal={8}
            paddingVertical={3}
            borderRadius={8}
            borderWidth={1}
            borderColor={tokens.border}
          >
            <Text fontSize={11} fontWeight="700" color={tokens.accent}>
              SKU: {activeProduct.sku} ({activeSizeCategory.toUpperCase()})
            </Text>
          </XStack>
        </XStack>

        <Text fontSize={12} color={tokens.textSecondary} lineHeight={16}>
          Curators configure apparel sizing systems, stock availability, and drape notes. Changes synchronize in real time to the live customer PDP preview.
        </Text>
      </YStack>

      {/* Global In-Story Device Viewport Simulator Toolbar (Optional, hidden if locked to a story preset) */}
      {!hideToolbar && (
        <XStack
          backgroundColor="#0F172A"
          paddingHorizontal={12}
          paddingVertical={8}
          borderRadius={10}
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={8}
        >
          <XStack alignItems="center" gap={6}>
            <LuMonitor size={14} color="#E2E8F0" />
            <Text fontSize={11.5} fontWeight="800" color="#F8FAFC" letterSpacing={0.5}>
              WORKSPACE VIEWPORT:
            </Text>
          </XStack>

          <XStack backgroundColor="#1E293B" borderRadius={8} padding={3} gap={4}>
            <Pressable
              onPress={() => setSelectedFactor('mobile')}
              style={[
                styles.toolbarButton,
                effectiveFactor === 'mobile' && styles.toolbarButtonActive,
              ]}
            >
              <XStack alignItems="center" gap={4}>
                <LuSmartphone size={12} color={effectiveFactor === 'mobile' ? '#FFF' : '#94A3B8'} />
                <Text
                  fontSize={10.5}
                  fontWeight={effectiveFactor === 'mobile' ? '800' : '600'}
                  color={effectiveFactor === 'mobile' ? '#FFF' : '#94A3B8'}
                >
                  Mobile (390px)
                </Text>
              </XStack>
            </Pressable>

            <Pressable
              onPress={() => setSelectedFactor('tablet')}
              style={[
                styles.toolbarButton,
                effectiveFactor === 'tablet' && styles.toolbarButtonActive,
              ]}
            >
              <XStack alignItems="center" gap={4}>
                <LuTablet size={12} color={effectiveFactor === 'tablet' ? '#FFF' : '#94A3B8'} />
                <Text
                  fontSize={10.5}
                  fontWeight={effectiveFactor === 'tablet' ? '800' : '600'}
                  color={effectiveFactor === 'tablet' ? '#FFF' : '#94A3B8'}
                >
                  Tablet (768px)
                </Text>
              </XStack>
            </Pressable>

            <Pressable
              onPress={() => setSelectedFactor('desktop')}
              style={[
                styles.toolbarButton,
                effectiveFactor === 'desktop' && styles.toolbarButtonActive,
              ]}
            >
              <XStack alignItems="center" gap={4}>
                <LuMonitor size={12} color={effectiveFactor === 'desktop' ? '#FFF' : '#94A3B8'} />
                <Text
                  fontSize={10.5}
                  fontWeight={effectiveFactor === 'desktop' ? '800' : '600'}
                  color={effectiveFactor === 'desktop' ? '#FFF' : '#94A3B8'}
                >
                  Desktop (1100px)
                </Text>
              </XStack>
            </Pressable>
          </XStack>
        </XStack>
      )}

      {/* MOBILE-SPECIFIC PRESENTATION TOGGLE (Curation Settings vs Live PDP Preview vs Split) */}
      {isMobile ? (
        <YStack gap={12}>
          {/* Top Segmented Navigation Tabs */}
          <XStack
            backgroundColor={tokens.surfaceRaised}
            borderRadius={10}
            padding={3}
            borderWidth={1}
            borderColor={tokens.border}
          >
            <Pressable
              onPress={() => setMobileTab('settings')}
              style={[
                styles.mobileNavTab,
                mobileTab === 'settings' && {
                  backgroundColor: tokens.surface,
                  shadowColor: '#000',
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                },
              ]}
            >
              <XStack alignItems="center" justifyContent="center" gap={5}>
                <LuSlidersHorizontal size={13} color={mobileTab === 'settings' ? tokens.accent : tokens.textSecondary} />
                <Text
                  fontSize={11.5}
                  fontWeight={mobileTab === 'settings' ? '800' : '600'}
                  color={mobileTab === 'settings' ? tokens.text : tokens.textSecondary}
                >
                  Curator Settings
                </Text>
              </XStack>
            </Pressable>

            <Pressable
              onPress={() => setMobileTab('preview')}
              style={[
                styles.mobileNavTab,
                mobileTab === 'preview' && {
                  backgroundColor: tokens.surface,
                  shadowColor: '#000',
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                },
              ]}
            >
              <XStack alignItems="center" justifyContent="center" gap={5}>
                <LuEye size={13} color={mobileTab === 'preview' ? tokens.accent : tokens.textSecondary} />
                <Text
                  fontSize={11.5}
                  fontWeight={mobileTab === 'preview' ? '800' : '600'}
                  color={mobileTab === 'preview' ? tokens.text : tokens.textSecondary}
                >
                  Live Preview
                </Text>
                <XStack width={6} height={6} borderRadius={3} backgroundColor="#10B981" />
              </XStack>
            </Pressable>

            <Pressable
              onPress={() => setMobileTab('split')}
              style={[
                styles.mobileNavTab,
                mobileTab === 'split' && {
                  backgroundColor: tokens.surface,
                  shadowColor: '#000',
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                },
              ]}
            >
              <XStack alignItems="center" justifyContent="center" gap={5}>
                <LuLayers size={13} color={mobileTab === 'split' ? tokens.accent : tokens.textSecondary} />
                <Text
                  fontSize={11.5}
                  fontWeight={mobileTab === 'split' ? '800' : '600'}
                  color={mobileTab === 'split' ? tokens.text : tokens.textSecondary}
                >
                  Split View
                </Text>
              </XStack>
            </Pressable>
          </XStack>

          {/* Tab 1: Curator Settings Only */}
          {mobileTab === 'settings' && (
            <YStack gap={14}>
              {renderCuratorControls()}

              {/* Floating Quick Jump Bar to Live Preview */}
              <Pressable
                onPress={() => setMobileTab('preview')}
                style={[
                  styles.mobilePreviewFab,
                  {
                    backgroundColor: tokens.accent,
                    shadowColor: '#000',
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                  },
                ]}
              >
                <XStack alignItems="center" justifyContent="space-between" width="100%">
                  <XStack alignItems="center" gap={8}>
                    <LuEye size={16} color={tokens.accentForeground} />
                    <YStack>
                      <Text fontSize={12} fontWeight="900" color={tokens.accentForeground}>
                        View Live Store PDP Preview
                      </Text>
                      <Text fontSize={10} color={tokens.accentForeground} opacity={0.85}>
                        {activeProduct.sku} • {activeSizeCategory.toUpperCase()} ({livePdpSizes.filter((s) => !s.disabled).length} in stock)
                      </Text>
                    </YStack>
                  </XStack>

                  <XStack
                    backgroundColor="rgba(255,255,255,0.2)"
                    paddingHorizontal={8}
                    paddingVertical={4}
                    borderRadius={6}
                    alignItems="center"
                    gap={4}
                  >
                    <Text fontSize={10.5} fontWeight="800" color={tokens.accentForeground}>
                      Preview
                    </Text>
                    <LuChevronRight size={12} color={tokens.accentForeground} />
                  </XStack>
                </XStack>
              </Pressable>
            </YStack>
          )}

          {/* Tab 2: Live PDP Preview Only */}
          {mobileTab === 'preview' && (
            <YStack gap={10}>
              <Pressable
                onPress={() => setMobileTab('settings')}
                style={[
                  styles.backToSettingsButton,
                  {
                    backgroundColor: tokens.surfaceRaised,
                    borderColor: tokens.border,
                  },
                ]}
              >
                <XStack alignItems="center" gap={6}>
                  <LuPencil size={12} color={tokens.accent} />
                  <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                    ← Back to Size Settings Console
                  </Text>
                </XStack>
              </Pressable>

              {renderStorePdpPreview()}
            </YStack>
          )}

          {/* Tab 3: Split Stacked View */}
          {mobileTab === 'split' && (
            <YStack gap={16}>
              {renderCuratorControls()}
              {renderStorePdpPreview()}
            </YStack>
          )}
        </YStack>
      ) : (
        /* DESKTOP & TABLET: DUAL-COLUMN SIDE-BY-SIDE PRESENTATION */
        <XStack
          gap={18}
          alignItems="flex-start"
          width="100%"
        >
          {renderCuratorControls()}
          {renderStorePdpPreview()}
        </XStack>
      )}
    </YStack>
  );
}

// --- STORYBOOK STORIES ---

/**
 * 1. Default Interactive Curation Workflow
 * Master adaptive workspace with in-story form factor switcher (Mobile 390px, Tablet 768px, Desktop 1100px).
 */
export const InteractiveCurationWorkflow: StoryObj<any> = {
  render: () => <SizeSettingWorkflowComponent />,
};

/**
 * 2. Mobile Curation Viewport (390px iPhone Size)
 * Demonstrates the dedicated mobile presentation with the top tab switcher,
 * full-width sub-variant cards, and sticky bottom preview action bar.
 */
export const MobileCurationView_390px: StoryObj<any> = {
  render: () => (
    <FormFactorContext.Provider
      value={{
        factor: 'mobile',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        containerWidth: 390,
      }}
    >
      <View style={{ width: 390, maxWidth: '100%', alignSelf: 'center' }}>
        <SizeSettingWorkflowComponent overrideFactor="mobile" hideToolbar={true} />
      </View>
    </FormFactorContext.Provider>
  ),
};

/**
 * 3. Tablet Curation Viewport (768px iPad Size)
 * Demonstrates balanced 2-column workspace layout for tablet screens.
 */
export const TabletCurationView_768px: StoryObj<any> = {
  render: () => (
    <FormFactorContext.Provider
      value={{
        factor: 'tablet',
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        containerWidth: 768,
      }}
    >
      <View style={{ width: 768, maxWidth: '100%', alignSelf: 'center' }}>
        <SizeSettingWorkflowComponent overrideFactor="tablet" hideToolbar={true} />
      </View>
    </FormFactorContext.Provider>
  ),
};

/**
 * 4. Desktop Curation Workspace (1100px Full Side-by-Side Dual Container)
 * Demonstrates the full workstation layout with phone device mockup frame.
 */
export const DesktopCurationWorkspace_1100px: StoryObj<any> = {
  render: () => (
    <FormFactorContext.Provider
      value={{
        factor: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        containerWidth: 1100,
      }}
    >
      <View style={{ width: 1100, maxWidth: '100%', alignSelf: 'center' }}>
        <SizeSettingWorkflowComponent overrideFactor="desktop" hideToolbar={true} />
      </View>
    </FormFactorContext.Provider>
  ),
};

const styles = StyleSheet.create({
  containerShadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  deviceFrameShadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  productScrollContent: {
    paddingRight: 8,
    alignItems: 'center',
  },
  productChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  noSizeOptionCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  suggestionChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  sizeStockTile: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'space-between',
    gap: 4,
  },
  toolbarButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toolbarButtonActive: {
    backgroundColor: '#0F766E',
  },
  deviceModePill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  deviceModePillActive: {
    backgroundColor: '#334155',
  },
  mobileNavTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobilePreviewFab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  backToSettingsButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});

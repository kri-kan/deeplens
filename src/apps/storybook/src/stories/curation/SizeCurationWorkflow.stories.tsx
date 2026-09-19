import React, { useState } from 'react';
import type { Meta } from '@storybook/react-native';
import { YStack, XStack, Text, ScrollView, Input, Switch } from 'tamagui';
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
} from '../../data/catalog';
import { THEME_ARG_TYPES, THEME_ARGS } from '../../utils/storyTheme';
import { useTheme, useResponsive } from '../../theme';

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

export const InteractiveCurationWorkflow = () => {
  const { tokens } = useTheme();
  const { isMobile } = useResponsive();
  const allProducts = getAllCatalogProducts();

  // Curator Selected State
  const [selectedProductSku, setSelectedProductSku] = useState<string>('VF46D'); // Default to Kids wear
  const activeProduct = allProducts.find((p) => p.sku === selectedProductSku) || allProducts[0];

  const [activeSizeCategory, setActiveSizeCategory] = useState<SizeCategoryType>(activeProduct.sizeConfig.type);
  const [availableSizes, setAvailableSizes] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    activeProduct.sizeConfig.options.forEach((opt, idx) => {
      // simulate first few in stock, last out of stock
      init[opt.id] = idx < activeProduct.sizeConfig.options.length - 2;
    });
    return init;
  });

  const [customNote, setCustomNote] = useState<string>(
    activeProduct.sizeConfig.customNotes || 'Includes 2-inch alteration allowance.'
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
      setActiveSizeCategory(prod.sizeConfig.type);
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
      case 'free-size':
      default:
        return FREE_SIZE_PRESET;
    }
  };

  const currentPool = getPoolForCategory(activeSizeCategory);

  // Build options for live PDP preview based on curator's availability checkboxes
  const livePdpSizes: SizeOption[] = currentPool.map((opt) => ({
    ...opt,
    disabled: availableSizes[opt.id] === false,
  }));

  return (
    <YStack padding={20} gap={24} width="100%" maxWidth={1100}>
      {/* Curation Title & Instructions */}
      <YStack gap={6}>
        <XStack alignItems="center" gap={8}>
          <Text fontSize={20} fontWeight="900" color={tokens.text}>
            Curation Step: Product Size Settings & Live PDP Preview
          </Text>
        </XStack>
        <Text fontSize={13} color={tokens.textSecondary}>
          Curators configure apparel size categories, toggle available stock per size, and add tailoring notes. The live PDP preview updates instantly on the right.
        </Text>
      </YStack>

      {/* Main 2-Column Workspace: Curator Controls (Left) vs Store PDP Live Preview (Right) */}
      <XStack
        flexDirection={isMobile ? 'column' : 'row'}
        gap={24}
        alignItems="flex-start"
        width="100%"
      >
        {/* ========================================================= */}
        {/* LEFT COLUMN: CURATOR CONTROLS                             */}
        {/* ========================================================= */}
        <YStack
          flex={1.1}
          minWidth={isMobile ? '100%' : 380}
          backgroundColor={tokens.surface}
          borderColor={tokens.border}
          borderWidth={1}
          borderRadius={18}
          padding={20}
          gap={18}
        >
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={13} fontWeight="800" letterSpacing={1} color={tokens.accent} textTransform="uppercase">
              1. Select Catalog Product
            </Text>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
              {allProducts.length} Diverse Samples
            </Text>
          </XStack>

          {/* Product Picker Pills */}
          <XStack flexWrap="wrap" gap={8}>
            {allProducts.map((p) => {
              const isSelected = p.sku === selectedProductSku;
              return (
                <XStack
                  key={p.sku}
                  paddingHorizontal={12}
                  paddingVertical={8}
                  borderRadius={10}
                  borderWidth={1}
                  borderColor={isSelected ? tokens.accent : tokens.border}
                  backgroundColor={isSelected ? tokens.accent : tokens.surfaceRaised}
                  cursor="pointer"
                  onPress={() => handleProductChange(p.sku)}
                  hoverStyle={{ opacity: 0.9 }}
                >
                  <Text
                    fontSize={12}
                    fontWeight="800"
                    color={isSelected ? tokens.accentForeground : tokens.text}
                  >
                    {p.sku} ({p.category.toUpperCase()})
                  </Text>
                </XStack>
              );
            })}
          </XStack>

          {/* Size Category Selector */}
          <YStack gap={8} paddingTop={6}>
            <Text fontSize={13} fontWeight="800" letterSpacing={1} color={tokens.accent} textTransform="uppercase">
              2. Sizing System Variant
            </Text>
            <SegmentedControl
              activeId={activeSizeCategory}
              onChange={(id) => {
                const newCat = id as SizeCategoryType;
                setActiveSizeCategory(newCat);
                // default first available
                const pool = getPoolForCategory(newCat);
                const init: Record<string, boolean> = {};
                pool.forEach((opt, idx) => (init[opt.id] = idx < pool.length - 1));
                setAvailableSizes(init);
                setShopperSelectedSize(pool[0]?.id || '');
              }}
              options={[
                { id: 'free-size', label: 'Free Size' },
                { id: 'letter', label: 'Letter (XS-3XL)' },
                { id: 'numeric', label: 'Bust 32-44' },
                { id: 'kids', label: 'Kids (0-16Y)' },
              ]}
            />
          </YStack>

          {/* Size Availability Matrix */}
          <YStack gap={10} paddingTop={6}>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={13} fontWeight="800" letterSpacing={1} color={tokens.accent} textTransform="uppercase">
                3. Size Availability & Stock
              </Text>
              <Text fontSize={11} color={tokens.textMuted}>
                Uncheck to mark Out of Stock
              </Text>
            </XStack>

            <XStack flexWrap="wrap" gap={10}>
              {currentPool.map((opt) => {
                const isAvailable = availableSizes[opt.id] !== false;
                return (
                  <XStack
                    key={opt.id}
                    alignItems="center"
                    gap={8}
                    paddingHorizontal={10}
                    paddingVertical={6}
                    borderRadius={8}
                    borderWidth={1}
                    borderColor={tokens.border}
                    backgroundColor={isAvailable ? tokens.surface : tokens.surfaceRaised}
                    cursor="pointer"
                    onPress={() => {
                      setAvailableSizes((prev) => ({
                        ...prev,
                        [opt.id]: !isAvailable,
                      }));
                    }}
                  >
                    <CustomCheckbox
                      checked={isAvailable}
                      onToggle={() => {
                        setAvailableSizes((prev) => ({
                          ...prev,
                          [opt.id]: !isAvailable,
                        }));
                      }}
                    />
                    <YStack>
                      <Text fontSize={12} fontWeight="800" color={isAvailable ? tokens.text : tokens.textMuted}>
                        {opt.label}
                      </Text>
                      {opt.subtitle ? (
                        <Text fontSize={10} color={tokens.textMuted}>
                          {opt.subtitle}
                        </Text>
                      ) : null}
                    </YStack>
                  </XStack>
                );
              })}
            </XStack>
          </YStack>

          {/* Custom Tailoring & Alteration Notes */}
          <YStack gap={8} paddingTop={6}>
            <Text fontSize={13} fontWeight="800" letterSpacing={1} color={tokens.accent} textTransform="uppercase">
              4. Custom Alteration Notes
            </Text>
            <Input
              value={customNote}
              onChangeText={setCustomNote}
              placeholder="e.g. Includes 2-inch alteration allowance in side seams."
              fontSize={12}
              backgroundColor={tokens.surfaceRaised}
              borderColor={tokens.border}
              borderRadius={8}
              paddingHorizontal={12}
              paddingVertical={8}
            />
          </YStack>
        </YStack>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: LIVE STOREFRONT PDP PREVIEW                 */}
        {/* ========================================================= */}
        <YStack
          flex={1.2}
          minWidth={isMobile ? '100%' : 420}
          backgroundColor={tokens.surface}
          borderColor={tokens.border}
          borderWidth={1}
          borderRadius={18}
          padding={24}
          gap={20}
        >
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap={6}>
              <Text fontSize={11} fontWeight="900" color={tokens.accent} letterSpacing={1.2} textTransform="uppercase">
                LIVE STORE PDP PREVIEW
              </Text>
              <XStack backgroundColor="#E8F5E9" paddingHorizontal={6} paddingVertical={2} borderRadius={4}>
                <Text fontSize={10} fontWeight="800" color="#2E7D32">
                  SHOPEE READY
                </Text>
              </XStack>
            </XStack>

            <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
              SKU: {activeProduct.sku}
            </Text>
          </XStack>

          {/* Product Header in PDP */}
          <YStack gap={4}>
            <Text fontSize={12} fontWeight="800" color={tokens.accent} letterSpacing={1.2} textTransform="uppercase">
              {activeProduct.brand}
            </Text>
            <Text fontSize={18} fontWeight="900" color={tokens.text}>
              {activeProduct.title}
            </Text>
            <XStack alignItems="baseline" gap={8} paddingTop={4}>
              <Text fontSize={20} fontWeight="900" color={tokens.text}>
                ₹{activeProduct.price.toLocaleString('en-IN')}
              </Text>
              <Text fontSize={14} color={tokens.textMuted} textDecorationLine="line-through">
                ₹{activeProduct.originalPrice.toLocaleString('en-IN')}
              </Text>
              <Text fontSize={13} fontWeight="800" color="#2E7D32">
                {activeProduct.discountPercent}% OFF
              </Text>
            </XStack>
          </YStack>

          {/* Divider */}
          <YStack height={1} backgroundColor={tokens.border} width="100%" />

          {/* Live Reactive Size Selector Component */}
          <SizeSelector
            variant={activeSizeCategory}
            category={activeProduct.category}
            sizes={livePdpSizes}
            selected={shopperSelectedSize}
            onSelect={setShopperSelectedSize}
            customNotes={customNote}
            showSizeChart={true}
          />

          {/* Add to Bag Simulation */}
          <YStack
            marginTop={12}
            backgroundColor={tokens.accent}
            paddingVertical={14}
            borderRadius={12}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            hoverStyle={{ opacity: 0.92 }}
            pressStyle={{ scale: 0.98 }}
          >
            <Text fontSize={14} fontWeight="900" color={tokens.accentForeground} letterSpacing={1}>
              ADD TO BAG • ₹{activeProduct.price.toLocaleString('en-IN')}
            </Text>
          </YStack>
        </YStack>
      </XStack>
    </YStack>
  );
};

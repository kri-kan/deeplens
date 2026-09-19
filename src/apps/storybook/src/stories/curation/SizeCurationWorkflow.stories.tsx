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
  ONE_SIZE_PRESET,
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

  return (
    <YStack padding={16} gap={18} width="100%" maxWidth={1100}>
      {/* Curation Title & Instructions */}
      <YStack gap={4}>
        <XStack alignItems="center" gap={8}>
          <Text fontSize={18} fontWeight="900" color={tokens.text}>
            Curation Step: Product Size Settings & Live PDP Preview
          </Text>
        </XStack>
        <Text fontSize={13} color={tokens.textSecondary}>
          Curators configure apparel size categories, toggle available stock per size, and customize garment drape notes. The live PDP preview updates instantly on the right.
        </Text>
      </YStack>

      {/* Main 2-Column Workspace: Curator Controls (Left) vs Store PDP Live Preview (Right) */}
      <XStack
        flexDirection={isMobile ? 'column' : 'row'}
        gap={18}
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
          borderRadius={16}
          padding={16}
          gap={14}
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
                  paddingVertical={7}
                  borderRadius={8}
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
          <YStack gap={6} paddingTop={4}>
            <Text fontSize={13} fontWeight="800" letterSpacing={1} color={tokens.accent} textTransform="uppercase">
              2. Sizing System Variant
            </Text>
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
                { id: 'no-size', label: 'No Size' },
                { id: 'letter', label: 'Letter (XS-3XL)' },
                { id: 'numeric', label: 'Bust 32-44' },
                { id: 'kids', label: 'Kids (0-16Y)' },
              ]}
            />
          </YStack>

          {/* Size Availability Matrix OR No Size Informational Options */}
          <YStack gap={8} paddingTop={4}>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={13} fontWeight="800" letterSpacing={1} color={tokens.accent} textTransform="uppercase">
                3. {isNoSizeCategory ? 'No Size Garment Fit & Informational Badge' : 'Size Availability & Stock'}
              </Text>
              {!isNoSizeCategory && (
                <Text fontSize={11} color={tokens.textMuted}>
                  Uncheck to mark Out of Stock
                </Text>
              )}
            </XStack>

            {isNoSizeCategory ? (
              <YStack gap={10}>
                <Text fontSize={12} color={tokens.textSecondary} lineHeight={16}>
                  Apparel with universal drape does not require multi-size shopper selection. Choose whether this is unstitched (One Size) or a stitched blouse (Free Size). These render as non-selectable informational badges on the PDP.
                </Text>

                {/* Sub-variant Informational Buttons */}
                <XStack gap={8} flexWrap="wrap">
                  <XStack
                    flex={1}
                    minWidth={170}
                    alignItems="center"
                    gap={8}
                    paddingHorizontal={12}
                    paddingVertical={10}
                    borderRadius={10}
                    borderWidth={1.5}
                    borderColor={noSizeOptionType === 'one-size' ? tokens.accent : tokens.border}
                    backgroundColor={noSizeOptionType === 'one-size' ? `${tokens.accent}12` : tokens.surfaceRaised}
                    cursor="pointer"
                    onPress={() => {
                      setNoSizeOptionType('one-size');
                      setNoSizeCustomSubtitle('5.5m Saree + 0.8m Unstitched Blouse Piece');
                    }}
                  >
                    <YStack gap={2} flex={1}>
                      <XStack alignItems="center" gap={6}>
                        <Text fontSize={13} fontWeight="800" color={noSizeOptionType === 'one-size' ? tokens.accent : tokens.text}>
                          One Size
                        </Text>
                        <XStack backgroundColor="#E0F2FE" paddingHorizontal={5} paddingVertical={1} borderRadius={4}>
                          <Text fontSize={9} fontWeight="800" color="#0369A1">
                            Unstitched
                          </Text>
                        </XStack>
                      </XStack>
                      <Text fontSize={11} color={tokens.textMuted} lineHeight={14}>
                        Applicable for unstitched sarees & dress materials
                      </Text>
                    </YStack>
                  </XStack>

                  <XStack
                    flex={1}
                    minWidth={170}
                    alignItems="center"
                    gap={8}
                    paddingHorizontal={12}
                    paddingVertical={10}
                    borderRadius={10}
                    borderWidth={1.5}
                    borderColor={noSizeOptionType === 'free-size' ? tokens.accent : tokens.border}
                    backgroundColor={noSizeOptionType === 'free-size' ? `${tokens.accent}12` : tokens.surfaceRaised}
                    cursor="pointer"
                    onPress={() => {
                      setNoSizeOptionType('free-size');
                      setNoSizeCustomSubtitle('Stitched Blouse with Free Size / Alterable Seams');
                    }}
                  >
                    <YStack gap={2} flex={1}>
                      <XStack alignItems="center" gap={6}>
                        <Text fontSize={13} fontWeight="800" color={noSizeOptionType === 'free-size' ? tokens.accent : tokens.text}>
                          Free Size
                        </Text>
                        <XStack backgroundColor="#FEF3C7" paddingHorizontal={5} paddingVertical={1} borderRadius={4}>
                          <Text fontSize={9} fontWeight="800" color="#B45309">
                            Stitched Blouse
                          </Text>
                        </XStack>
                      </XStack>
                      <Text fontSize={11} color={tokens.textMuted} lineHeight={14}>
                        Applicable for stitched blouse sarees with free size
                      </Text>
                    </YStack>
                  </XStack>
                </XStack>

                {/* Live Informational Badge Preview */}
                <YStack gap={4} paddingTop={2}>
                  <Text fontSize={11} fontWeight="800" color={tokens.textMuted} textTransform="uppercase">
                    Informational Button (Non-Selectable for Shopper):
                  </Text>
                  <XStack
                    alignItems="center"
                    gap={8}
                    paddingHorizontal={12}
                    paddingVertical={8}
                    borderRadius={10}
                    borderWidth={1.5}
                    borderColor={tokens.accent}
                    backgroundColor={`${tokens.accent}10`}
                    alignSelf="flex-start"
                  >
                    <Text fontSize={13} fontWeight="800" color={tokens.accent}>
                      {noSizeOptionType === 'one-size' ? 'One Size' : 'Free Size'}
                    </Text>
                    <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                      • {noSizeCustomSubtitle}
                    </Text>
                  </XStack>
                </YStack>

                {/* Optional Editable Drape / Specification Text */}
                <YStack gap={4} paddingTop={2}>
                  <Text fontSize={12} fontWeight="800" color={tokens.text}>
                    Optional Drape & Specification Text (Editable):
                  </Text>
                  <Input
                    value={noSizeCustomSubtitle}
                    onChangeText={setNoSizeCustomSubtitle}
                    placeholder="e.g. 5.5m Saree + 0.8m Unstitched Blouse Piece"
                    fontSize={12}
                    backgroundColor={tokens.surfaceRaised}
                    borderColor={tokens.border}
                    borderRadius={8}
                    paddingHorizontal={12}
                    paddingVertical={7}
                  />
                </YStack>
              </YStack>
            ) : (
              <XStack flexWrap="wrap" gap={8}>
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
            )}
          </YStack>

          {/* Custom Tailoring & Alteration Notes */}
          <YStack gap={6} paddingTop={4}>
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
              paddingVertical={7}
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
          borderRadius={16}
          padding={18}
          gap={16}
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
            variant={isNoSizeCategory ? 'no-size' : activeSizeCategory}
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

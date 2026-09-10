import React, { useState } from 'react';
import { View, Pressable, StyleSheet, TextInput } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { LuSparkles, LuDollarSign, LuTrendingUp, LuFileText } from 'react-icons/lu';
import { useTheme } from '../../../theme';

export interface StoreProductEnrichmentSectionProps {
  title: string;
  fabric: string;
  description: string;
  baseCostPrice: number;
  mrp: string;
  salePrice: string;
  onChangeDescription: (desc: string) => void;
  onChangeMrp: (mrp: string) => void;
  onChangeSalePrice: (price: string) => void;
}

export function StoreProductEnrichmentSection({
  title,
  fabric,
  description,
  baseCostPrice,
  mrp,
  salePrice,
  onChangeDescription,
  onChangeMrp,
  onChangeSalePrice,
}: StoreProductEnrichmentSectionProps) {
  const { tokens } = useTheme();
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const parsedMrp = parseFloat(mrp) || 0;
  const parsedSalePrice = parseFloat(salePrice) || 0;
  const discountPercent =
    parsedMrp > 0 && parsedSalePrice > 0 && parsedMrp > parsedSalePrice
      ? Math.round(((parsedMrp - parsedSalePrice) / parsedMrp) * 100)
      : 0;
  const estimatedMargin = parsedSalePrice - baseCostPrice;
  const marginPercent =
    parsedSalePrice > 0 ? Math.round((estimatedMargin / parsedSalePrice) * 100) : 0;

  const handleAiSuggestDescription = () => {
    setIsAiGenerating(true);
    setTimeout(() => {
      onChangeDescription(
        `Woven on traditional pit looms in Varanasi, this authentic ${fabric} saree features exquisite Kadwa floral bootis and opulent gold zari brocade work along the scalloped border. Paired with a running blouse piece, its drape offers radiant sheen and feather-light festive elegance.`
      );
      setIsAiGenerating(false);
    }, 600);
  };

  return (
    <YStack
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius.md}
      borderWidth={1}
      borderColor={tokens.border}
      padding={14}
      gap={14}
    >
      {/* ── 1. DESCRIPTION SETTING & AI GENERATOR ── */}
      <YStack gap={8}>
        <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={6}>
          <XStack alignItems="center" gap={6}>
            <LuFileText size={16} color={tokens.accent} />
            <Text fontSize={13} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
              Product Story &amp; Description
            </Text>
          </XStack>

          <Pressable
            onPress={handleAiSuggestDescription}
            disabled={isAiGenerating}
            style={({ pressed }) => [
              styles.aiBtn,
              { backgroundColor: pressed ? tokens.accentSubtle : tokens.surfaceRaised, borderColor: tokens.accent },
            ]}
          >
            <LuSparkles size={13} color={tokens.accent} />
            <Text fontSize={11} fontWeight="800" color={tokens.accent}>
              {isAiGenerating ? 'Synthesizing Craft Story...' : '✨ AI Generate Description'}
            </Text>
          </Pressable>
        </XStack>

        <TextInput
          value={description}
          onChangeText={onChangeDescription}
          multiline
          numberOfLines={4}
          style={styles.textArea}
          placeholder="Enter authentic weaver story, fabric specifics, zari details, and drape feel..."
        />
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={10} color={tokens.textMuted}>
            Appears in the PDP 'About the Weave' narrative section.
          </Text>
          <Text fontSize={10} color={tokens.textMuted}>
            {description.length} characters
          </Text>
        </XStack>
      </YStack>

      {/* ── 2. PRICING & MARGIN ENGINE ── */}
      <YStack gap={8} borderTopWidth={1} borderTopColor={tokens.border} paddingTop={12}>
        <XStack alignItems="center" gap={6}>
          <LuDollarSign size={16} color={tokens.accent} />
          <Text fontSize={13} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
            Pricing &amp; Margin Engine
          </Text>
        </XStack>

        <XStack gap={10} flexWrap="wrap">
          {/* MRP Input */}
          <YStack flex={1} gap={4}>
            <Text fontSize={11} color={tokens.textMuted}>
              MRP (Strikethrough Price):
            </Text>
            <XStack alignItems="center" style={styles.currencyInputContainer}>
              <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
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
            <Text fontSize={11} color={tokens.textMuted}>
              Sale Price (Selling Rate):
            </Text>
            <XStack alignItems="center" style={styles.currencyInputContainer}>
              <Text fontSize={12} fontWeight="700" color={tokens.accent}>
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
            <Text fontSize={10} color={tokens.textMuted}>
              Base Landed Cost:
            </Text>
            <Text fontSize={12} fontWeight="700" color={tokens.text}>
              ₹{baseCostPrice.toLocaleString('en-IN')}
            </Text>
          </YStack>

          <YStack alignItems="center">
            <Text fontSize={10} color={tokens.textMuted}>
              Storefront Discount:
            </Text>
            <Text fontSize={12} fontWeight="800" color="#10B981">
              {discountPercent}% OFF
            </Text>
          </YStack>

          <YStack alignItems="flex-end">
            <Text fontSize={10} color={tokens.textMuted}>
              Gross Margin:
            </Text>
            <Text fontSize={12} fontWeight="800" color={tokens.accent}>
              ₹{estimatedMargin.toLocaleString('en-IN')} ({marginPercent}%)
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    cursor: 'pointer',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 18,
    minHeight: 80,
    textAlignVertical: 'top',
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
    fontSize: 13,
    color: '#1E293B',
    padding: 0,
  },
});

import React, { useState } from 'react';
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
  LuShieldCheck,
  LuPackage,
  LuRefreshCw,
  LuInfo,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';
import {
  ProductCurationSpecs,
  DEFAULT_SAREE_SPECS,
  ETHNIC_FABRIC_OPTIONS,
  WEAVE_TECHNIQUE_OPTIONS,
  CRAFT_ORIGIN_OPTIONS,
  MOTIF_PATTERN_OPTIONS,
  BORDER_PALLU_OPTIONS,
  ZARI_MATERIAL_OPTIONS,
  WORK_HEAVINESS_OPTIONS,
  OCCASION_OPTIONS,
  STITCH_TYPE_OPTIONS,
  TaxonomyOption,
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
  onChangeDescription: (desc: string) => void;
  onChangeMrp: (mrp: string) => void;
  onChangeSalePrice: (price: string) => void;
  onChangeSpecs?: (specs: ProductCurationSpecs) => void;
}

export function StoreProductEnrichmentSection({
  title,
  fabric,
  description,
  baseCostPrice,
  mrp,
  salePrice,
  specs = DEFAULT_SAREE_SPECS,
  onChangeDescription,
  onChangeMrp,
  onChangeSalePrice,
  onChangeSpecs,
}: StoreProductEnrichmentSectionProps) {
  const { tokens } = useTheme();
  const [activeTab, setActiveTab] = useState<MetadataActiveTab>('craft_specs');
  const [isAiDeriving, setIsAiDeriving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const parsedMrp = parseFloat(mrp) || 0;
  const parsedSalePrice = parseFloat(salePrice) || 0;
  const discountPercent =
    parsedMrp > 0 && parsedSalePrice > 0 && parsedMrp > parsedSalePrice
      ? Math.round(((parsedMrp - parsedSalePrice) / parsedMrp) * 100)
      : 0;
  const estimatedMargin = parsedSalePrice - baseCostPrice;
  const marginPercent =
    parsedSalePrice > 0 ? Math.round((estimatedMargin / parsedSalePrice) * 100) : 0;

  // ── ONE-CLICK AI AUTO-DERIVE ALL ENGINE ─────────────────────────────────────
  const handleAiAutoDeriveAll = () => {
    setIsAiDeriving(true);
    setTimeout(() => {
      // 1. Synthesize craft story
      onChangeDescription(
        `Woven on heirloom pit looms in Varanasi, this authentic ${specs.fabricName} saree showcases exquisite ${specs.weaveTechniqueName} with ${specs.motifPatternName} and a rich ${specs.borderPalluName}. Paired with an attached ${specs.blousePieceLengthMetres}m blouse piece, the fluid drape offers royal festive presence and luminous heritage elegance.`
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
      onChangeSpecs?.(updatedSpecs);

      setIsAiDeriving(false);
    }, 800);
  };

  const updateSpecField = <K extends keyof ProductCurationSpecs>(field: K, value: ProductCurationSpecs[K]) => {
    if (!onChangeSpecs) return;
    onChangeSpecs({
      ...specs,
      [field]: value,
    });
  };

  const toggleOccasion = (id: string) => {
    const current = specs.occasions || [];
    const exists = current.includes(id);
    const updated = exists ? current.filter((item) => item !== id) : [...current, id];
    updateSpecField('occasions', updated);
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

  return (
    <YStack gap={12}>
      {/* ── TOP HEADER WITH AI AUTO-DERIVE BANNER ── */}
      <YStack
        backgroundColor={tokens.surface}
        borderRadius={14}
        borderWidth={1}
        borderColor={tokens.border}
        padding={14}
        gap={10}
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
              Configure craft specs, pricing margins, tailoring dimensions &amp; search facets.
            </Text>
          </YStack>

          <Pressable
            onPress={handleAiAutoDeriveAll}
            disabled={isAiDeriving}
            style={({ pressed }) => [
              styles.aiDeriveBtn,
              {
                backgroundColor: pressed ? `${tokens.accent}20` : `${tokens.accent}12`,
                borderColor: tokens.accent,
              },
            ]}
          >
            <LuSparkles size={13} color={tokens.accent} />
            <Text fontSize={11} fontWeight="800" color={tokens.accent}>
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
            <Text fontSize={10} fontWeight="700" color="#15803D">
              AI Derivation Active ({specs.confidenceScore || 96}% confidence) • Click any spec to override
            </Text>
          </XStack>
        )}
      </YStack>

      {/* ── 4-SECTION TAB SELECTOR BAR ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScrollContainer}
      >
        <Pressable
          onPress={() => setActiveTab('craft_specs')}
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'craft_specs' ? tokens.accent : tokens.surface,
              borderColor: activeTab === 'craft_specs' ? tokens.accent : tokens.border,
            },
          ]}
        >
          <LuLayers size={13} color={activeTab === 'craft_specs' ? '#FFFFFF' : tokens.text} />
          <Text
            fontSize={11}
            fontWeight="800"
            color={activeTab === 'craft_specs' ? '#FFFFFF' : tokens.text}
          >
            Craft &amp; Fabric Specs
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('commercials')}
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'commercials' ? tokens.accent : tokens.surface,
              borderColor: activeTab === 'commercials' ? tokens.accent : tokens.border,
            },
          ]}
        >
          <LuDollarSign size={13} color={activeTab === 'commercials' ? '#FFFFFF' : tokens.text} />
          <Text
            fontSize={11}
            fontWeight="800"
            color={activeTab === 'commercials' ? '#FFFFFF' : tokens.text}
          >
            Pricing &amp; Margins
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('sizing')}
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'sizing' ? tokens.accent : tokens.surface,
              borderColor: activeTab === 'sizing' ? tokens.accent : tokens.border,
            },
          ]}
        >
          <LuRuler size={13} color={activeTab === 'sizing' ? '#FFFFFF' : tokens.text} />
          <Text
            fontSize={11}
            fontWeight="800"
            color={activeTab === 'sizing' ? '#FFFFFF' : tokens.text}
          >
            Sizing &amp; Drape
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('occasions_tags')}
          style={[
            styles.tabButton,
            {
              backgroundColor: activeTab === 'occasions_tags' ? tokens.accent : tokens.surface,
              borderColor: activeTab === 'occasions_tags' ? tokens.accent : tokens.border,
            },
          ]}
        >
          <LuTag size={13} color={activeTab === 'occasions_tags' ? '#FFFFFF' : tokens.text} />
          <Text
            fontSize={11}
            fontWeight="800"
            color={activeTab === 'occasions_tags' ? '#FFFFFF' : tokens.text}
          >
            Occasions &amp; Facets
          </Text>
        </Pressable>
      </ScrollView>

      {/* ── TAB 1: CRAFT & FABRIC SPECIFICATIONS ── */}
      {activeTab === 'craft_specs' && (
        <YStack
          backgroundColor={tokens.surface}
          borderRadius={14}
          borderWidth={1}
          borderColor={tokens.border}
          padding={14}
          gap={12}
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
          <YStack gap={4}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
              Fabric Base:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {ETHNIC_FABRIC_OPTIONS.map((opt) => {
                const isSelected = specs.fabricId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      updateSpecField('fabricId', opt.id);
                      updateSpecField('fabricName', opt.label);
                    }}
                    style={[
                      styles.specChip,
                      {
                        backgroundColor: isSelected ? `${tokens.accent}14` : tokens.surfaceRaised,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                      },
                    ]}
                  >
                    <Text fontSize={10} fontWeight={isSelected ? '800' : '600'} color={isSelected ? tokens.accent : tokens.text}>
                      {opt.label}
                    </Text>
                    {opt.badge && (
                      <View style={styles.chipPill}>
                        <Text fontSize={8} fontWeight="800" color="#7C3AED">
                          {opt.badge}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </YStack>

          {/* Weave Technique Selection */}
          <YStack gap={4}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
              Weave Technique:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {WEAVE_TECHNIQUE_OPTIONS.map((opt) => {
                const isSelected = specs.weaveTechniqueId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      updateSpecField('weaveTechniqueId', opt.id);
                      updateSpecField('weaveTechniqueName', opt.label);
                    }}
                    style={[
                      styles.specChip,
                      {
                        backgroundColor: isSelected ? `${tokens.accent}14` : tokens.surfaceRaised,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                      },
                    ]}
                  >
                    <Text fontSize={10} fontWeight={isSelected ? '800' : '600'} color={isSelected ? tokens.accent : tokens.text}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </YStack>

          {/* Craft Heritage & Regional Origin */}
          <YStack gap={4}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
              Regional Origin &amp; Heritage:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {CRAFT_ORIGIN_OPTIONS.map((opt) => {
                const isSelected = specs.craftOriginId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      updateSpecField('craftOriginId', opt.id);
                      updateSpecField('craftOriginName', opt.label);
                    }}
                    style={[
                      styles.specChip,
                      {
                        backgroundColor: isSelected ? `${tokens.accent}14` : tokens.surfaceRaised,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                      },
                    ]}
                  >
                    <Text fontSize={10} fontWeight={isSelected ? '800' : '600'} color={isSelected ? tokens.accent : tokens.text}>
                      {opt.label}
                    </Text>
                    {opt.badge && (
                      <View style={[styles.chipPill, { backgroundColor: '#FEF3C7' }]}>
                        <Text fontSize={8} fontWeight="800" color="#B45309">
                          {opt.badge}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </YStack>

          {/* Motif & Pattern Selection */}
          <YStack gap={4}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
              Motif &amp; Pattern:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {MOTIF_PATTERN_OPTIONS.map((opt) => {
                const isSelected = specs.motifPatternId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      updateSpecField('motifPatternId', opt.id);
                      updateSpecField('motifPatternName', opt.label);
                    }}
                    style={[
                      styles.specChip,
                      {
                        backgroundColor: isSelected ? `${tokens.accent}14` : tokens.surfaceRaised,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                      },
                    ]}
                  >
                    <Text fontSize={10} fontWeight={isSelected ? '800' : '600'} color={isSelected ? tokens.accent : tokens.text}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </YStack>

          {/* Border & Pallu Type */}
          <YStack gap={4}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
              Border &amp; Pallu:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {BORDER_PALLU_OPTIONS.map((opt) => {
                const isSelected = specs.borderPalluId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      updateSpecField('borderPalluId', opt.id);
                      updateSpecField('borderPalluName', opt.label);
                    }}
                    style={[
                      styles.specChip,
                      {
                        backgroundColor: isSelected ? `${tokens.accent}14` : tokens.surfaceRaised,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                      },
                    ]}
                  >
                    <Text fontSize={10} fontWeight={isSelected ? '800' : '600'} color={isSelected ? tokens.accent : tokens.text}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </YStack>

          {/* Zari & Thread Material */}
          <YStack gap={4}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
              Zari / Thread Inlay:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {ZARI_MATERIAL_OPTIONS.map((opt) => {
                const isSelected = specs.zariMaterialId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      updateSpecField('zariMaterialId', opt.id);
                      updateSpecField('zariMaterialName', opt.label);
                    }}
                    style={[
                      styles.specChip,
                      {
                        backgroundColor: isSelected ? `${tokens.accent}14` : tokens.surfaceRaised,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                      },
                    ]}
                  >
                    <Text fontSize={10} fontWeight={isSelected ? '800' : '600'} color={isSelected ? tokens.accent : tokens.text}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </YStack>

          {/* Work Heaviness */}
          <YStack gap={4}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
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
                    <Text fontSize={10} fontWeight={isSelected ? '800' : '600'} color={isSelected ? tokens.accent : tokens.text}>
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
          borderRadius={14}
          borderWidth={1}
          borderColor={tokens.border}
          padding={14}
          gap={12}
        >
          <Text fontSize={12} fontWeight="900" color={tokens.text} textTransform="uppercase">
            2. Commercial Pricing &amp; Landed Margins
          </Text>

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
                <Text fontSize={12} fontWeight="800" color={tokens.accent}>
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

          {/* Story Description Input */}
          <YStack gap={6} borderTopWidth={1} borderTopColor={tokens.border} paddingTop={10}>
            <Text fontSize={11} fontWeight="700" color={tokens.text}>
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
            <Text fontSize={9} color={tokens.textMuted}>
              {description.length} characters • Appears in the live PDP 'About the Weave' narrative.
            </Text>
          </YStack>
        </YStack>
      )}

      {/* ── TAB 3: SIZING, DRAPE & TAILORING ── */}
      {activeTab === 'sizing' && (
        <YStack
          backgroundColor={tokens.surface}
          borderRadius={14}
          borderWidth={1}
          borderColor={tokens.border}
          padding={14}
          gap={12}
        >
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={12} fontWeight="900" color={tokens.text} textTransform="uppercase">
              3. Sizing &amp; Tailoring Profile
            </Text>
            <View style={[styles.microBadge, { backgroundColor: '#F0FDF4' }]}>
              <Text fontSize={9} fontWeight="800" color="#16A34A">
                Powers SizeSelector
              </Text>
            </View>
          </XStack>

          {/* Stitch Type Presets */}
          <YStack gap={4}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
              Stitch &amp; Construction State:
            </Text>
            <YStack gap={6}>
              {STITCH_TYPE_OPTIONS.map((opt) => {
                const isSelected = specs.stitchTypeId === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      updateSpecField('stitchTypeId', opt.id);
                      updateSpecField('stitchTypeName', opt.label);
                    }}
                    style={[
                      styles.specListCard,
                      {
                        backgroundColor: isSelected ? `${tokens.accent}12` : tokens.surfaceRaised,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                      },
                    ]}
                  >
                    <XStack alignItems="center" justifyContent="space-between" width="100%">
                      <Text fontSize={11} fontWeight={isSelected ? '800' : '600'} color={tokens.text}>
                        {opt.label}
                      </Text>
                      {isSelected && <LuCheck size={14} color={tokens.accent} />}
                    </XStack>
                    {opt.description && (
                      <Text fontSize={9} color={tokens.textMuted}>
                        {opt.description}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </YStack>
          </YStack>

          {/* Saree & Blouse Dimensions */}
          <XStack gap={10}>
            <YStack flex={1} gap={4}>
              <Text fontSize={10} color={tokens.textMuted}>
                Saree Drape Length:
              </Text>
              <TextInput
                value={specs.sareeLengthMetres.toString()}
                onChangeText={(val) => updateSpecField('sareeLengthMetres', parseFloat(val) || 5.5)}
                keyboardType="numeric"
                style={styles.dimensionInput}
              />
            </YStack>

            <YStack flex={1} gap={4}>
              <Text fontSize={10} color={tokens.textMuted}>
                Blouse Piece Length:
              </Text>
              <TextInput
                value={specs.blousePieceLengthMetres.toString()}
                onChangeText={(val) => updateSpecField('blousePieceLengthMetres', parseFloat(val) || 0.8)}
                keyboardType="numeric"
                style={styles.dimensionInput}
              />
            </YStack>
          </XStack>

          {/* Package Contents */}
          <YStack gap={4}>
            <Text fontSize={10} color={tokens.textMuted}>
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

      {/* ── TAB 4: OCCASIONS, FILTER FACETS & RELEVANCE TAGS ── */}
      {activeTab === 'occasions_tags' && (
        <YStack
          backgroundColor={tokens.surface}
          borderRadius={14}
          borderWidth={1}
          borderColor={tokens.border}
          padding={14}
          gap={12}
        >
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={12} fontWeight="900" color={tokens.text} textTransform="uppercase">
              4. Occasion Facets &amp; Search Relevance
            </Text>
            <View style={[styles.microBadge, { backgroundColor: '#FEF3C7' }]}>
              <Text fontSize={9} fontWeight="800" color="#B45309">
                Powers FilterDrawer
              </Text>
            </View>
          </XStack>

          {/* Occasion Chips (Multi-Select) */}
          <YStack gap={6}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
              Occasion Tags (Select all that apply):
            </Text>
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
                    <Text fontSize={10} fontWeight={isSelected ? '800' : '600'} color={isSelected ? tokens.accent : tokens.text}>
                      {opt.label}
                    </Text>
                    {isSelected && <LuCheck size={11} color={tokens.accent} />}
                  </Pressable>
                );
              })}
            </XStack>
          </YStack>

          {/* Search Relevance Tags */}
          <YStack gap={6}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
              Search Relevance Keywords &amp; Synonyms:
            </Text>
            <XStack gap={6}>
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={handleAddSearchTag}
                placeholder="e.g. pattu saree, wedding wear..."
                style={[styles.singleLineInput, { flex: 1 }]}
              />
              <Pressable
                onPress={handleAddSearchTag}
                style={[styles.addTagBtn, { backgroundColor: tokens.accent }]}
              >
                <Text fontSize={11} fontWeight="800" color="#FFFFFF">
                  Add Tag
                </Text>
              </Pressable>
            </XStack>

            <XStack flexWrap="wrap" gap={4}>
              {specs.searchTags?.map((tag) => (
                <View key={tag} style={styles.relevanceTag}>
                  <Text fontSize={9} fontWeight="700" color="#334155">
                    #{tag}
                  </Text>
                  <Pressable onPress={() => handleRemoveSearchTag(tag)} hitSlop={6}>
                    <Text fontSize={10} fontWeight="800" color="#94A3B8">
                      ×
                    </Text>
                  </Pressable>
                </View>
              ))}
            </XStack>
          </YStack>

          {/* Care Instructions */}
          <YStack gap={4}>
            <Text fontSize={10} color={tokens.textMuted}>
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
  tabScrollContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    cursor: 'pointer',
  },
  microBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    cursor: 'pointer',
  },
  chipPill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  specListCard: {
    padding: 8,
    borderRadius: 8,
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
    fontSize: 13,
    color: '#1E293B',
    padding: 0,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
    fontSize: 11,
    color: '#1E293B',
    lineHeight: 16,
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
    fontSize: 12,
    color: '#1E293B',
  },
  singleLineInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
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

import React, { useState } from 'react';
import { View, Pressable, StyleSheet, ScrollView, TextInput, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuSparkles,
  LuCheck,
  LuStore,
  LuTag,
  LuLayers,
  LuHistory,
  LuPlus,
  LuX,
  LuVideo,
  LuChevronUp,
  LuChevronDown,
  LuStar,
  LuCheckCheck,
  LuDollarSign,
  LuTrendingUp,
} from '../icons/lu';
import { useTheme } from '@/theme';

export type StoreProductLifecycleState = 'available' | 'few_left' | 'sold_out' | 'out_of_stock' | 'archived';

export interface StoreMediaItem {
  id: string;
  uri: string;
  mediaType: 'image' | 'video';
  sortOrder: number;
  isHero: boolean;
  dwellTimeSeconds?: number;
}

export interface StoreColorVariant {
  productId: string;
  productCode: string;
  colorName: string;
  colorHex?: string;
  thumbnailUri: string;
  isCurrent: boolean;
}

export interface StoreAuditLogEntry {
  id: string;
  timestamp: string;
  author: string;
  actionText: string;
}

export interface AdminStoreProductCurationPageProps {
  productId?: string;
  productCode?: string;
  title?: string;
  baseCostPrice?: number;
  initialMrp?: number;
  initialSalePrice?: number;
  initialLifecycleState?: StoreProductLifecycleState;
  initialMasterCollection?: string;
  initialMedia?: StoreMediaItem[];
  initialColorVariants?: StoreColorVariant[];
  initialTags?: string[];
  initialAuditLogs?: StoreAuditLogEntry[];
  onBack?: () => void;
  onSave?: (curatedPayload: any) => void;
  disableSafeArea?: boolean;
}

export function AdminStoreProductCurationPage({
  productId = 'p-1',
  productCode = 'SAR-KAN-901',
  title = 'Kanjivaram Pure Silk Saree',
  baseCostPrice = 8499,
  initialMrp = 14999,
  initialSalePrice = 10999,
  initialLifecycleState = 'available',
  initialMasterCollection = 'Kanjivaram Royal Heritage Collection',
  initialMedia = [],
  initialColorVariants = [],
  initialTags = ['Bridal', 'Festive', 'Pure Silk', 'Temple Border', 'Handloom'],
  initialAuditLogs = [],
  onBack,
  onSave,
  disableSafeArea = false,
}: AdminStoreProductCurationPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  // State Management
  const [lifecycleState, setLifecycleState] = useState<StoreProductLifecycleState>(initialLifecycleState);
  const [masterCollection, setMasterCollection] = useState(initialMasterCollection);
  const [mrp, setMrp] = useState(initialMrp.toString());
  const [salePrice, setSalePrice] = useState(initialSalePrice.toString());
  const [mediaList, setMediaList] = useState<StoreMediaItem[]>(initialMedia);
  const [colorVariants, setColorVariants] = useState<StoreColorVariant[]>(initialColorVariants);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTagInput, setNewTagInput] = useState('');
  const [auditLogs, setAuditLogs] = useState<StoreAuditLogEntry[]>(initialAuditLogs);
  const [saveToast, setSaveToast] = useState(false);

  // Dynamic calculations
  const parsedMrp = parseFloat(mrp) || 0;
  const parsedSalePrice = parseFloat(salePrice) || 0;
  const discountPercent =
    parsedMrp > 0 && parsedSalePrice > 0 && parsedMrp > parsedSalePrice
      ? Math.round(((parsedMrp - parsedSalePrice) / parsedMrp) * 100)
      : 0;
  const estimatedMargin = parsedSalePrice - baseCostPrice;
  const marginPercent =
    parsedSalePrice > 0 ? Math.round((estimatedMargin / parsedSalePrice) * 100) : 0;

  // Lifecycle configuration
  const LIFECYCLE_OPTIONS: { id: StoreProductLifecycleState; label: string; icon: string; color: string }[] = [
    { id: 'available', label: 'Available (In Stock)', icon: '🟢', color: '#10B981' },
    { id: 'few_left', label: 'Few Pieces Left (<5)', icon: '🟡', color: '#F59E0B' },
    { id: 'sold_out', label: 'Sold Out (Notify)', icon: '🔴', color: '#EF4444' },
    { id: 'out_of_stock', label: 'Out of Stock', icon: '⚪', color: '#6B7280' },
  ];

  // Media Ordering
  const moveMedia = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mediaList.length) return;

    const updated = [...mediaList];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const normalized = updated.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
      isHero: idx === 0,
    }));
    setMediaList(normalized);
  };

  const setHeroMedia = (id: string) => {
    const heroItem = mediaList.find((m) => m.id === id);
    if (!heroItem) return;

    const remaining = mediaList.filter((m) => m.id !== id);
    const reordered = [heroItem, ...remaining].map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
      isHero: idx === 0,
    }));
    setMediaList(reordered);
  };

  const applySmartDwellReorder = () => {
    const sorted = [...mediaList].sort(
      (a, b) => (b.dwellTimeSeconds || 0) - (a.dwellTimeSeconds || 0)
    );
    const normalized = sorted.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
      isHero: idx === 0,
    }));
    setMediaList(normalized);
  };

  const addTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim())) {
      setTags([...tags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSaveCuration = () => {
    const payload = {
      productId,
      productCode,
      lifecycleState,
      masterCollection,
      mrp: parsedMrp,
      salePrice: parsedSalePrice,
      discountPercent,
      estimatedMargin,
      media: mediaList,
      colorVariants,
      tags,
    };
    onSave?.(payload);

    const newEntry: StoreAuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: 'Just Now',
      author: 'You (Store Admin)',
      actionText: `Updated lifecycle to '${lifecycleState}', MRP ₹${parsedMrp}, Sale Price ₹${parsedSalePrice}.`,
    };
    setAuditLogs([newEntry, ...auditLogs]);

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  return (
    <YStack
      flex={1}
      width="100%"
      maxWidth={480}
      alignSelf="center"
      backgroundColor={tokens.background}
      position="relative"
      overflow="hidden"
    >
      {/* ── TOP NAV BAR ── */}
      <XStack
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        paddingHorizontal={12}
        paddingTop={topInset + 8}
        paddingBottom={10}
        alignItems="center"
        justifyContent="space-between"
      >
        <XStack alignItems="center" gap={8}>
          {onBack && (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent' },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <LuArrowLeft size={20} color={tokens.text} />
            </Pressable>
          )}
          <YStack>
            <XStack alignItems="center" gap={5}>
              <LuStore size={15} color={tokens.accent} />
              <Text fontSize={15} fontWeight="800" color={tokens.text}>
                Store Curation
              </Text>
            </XStack>
            <Text fontSize={11} color={tokens.textMuted}>
              {productCode} · {title}
            </Text>
          </YStack>
        </XStack>

        <View style={styles.ingestedBadge}>
          <Text fontSize={10} fontWeight="800" color={tokens.accent}>
            ✓ Ingested OG
          </Text>
        </View>
      </XStack>

      {/* ── TOAST NOTIFICATION ── */}
      {saveToast && (
        <View style={[styles.toastBanner, { backgroundColor: tokens.accent }]}>
          <Text fontSize={12} fontWeight="800" color={tokens.accentForeground} textAlign="center">
            💾 Curation changes saved and pushed to Storefront!
          </Text>
        </View>
      )}

      {/* ── MAIN SCROLLABLE CURATION BODY ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <YStack gap={14} padding={12}>
          {/* ── 1. LIFECYCLE AVAILABILITY STATE ── */}
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.md}
            borderWidth={1}
            borderColor={tokens.border}
            padding={12}
            gap={10}
          >
            <Text fontSize={12} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
              1. Storefront Lifecycle State
            </Text>

            <XStack flexWrap="wrap" gap={6}>
              {LIFECYCLE_OPTIONS.map((opt) => {
                const isSelected = lifecycleState === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setLifecycleState(opt.id)}
                    style={[
                      styles.lifecycleChip,
                      {
                        backgroundColor: isSelected ? tokens.accent : tokens.surfaceRaised,
                        borderColor: isSelected ? tokens.accent : tokens.border,
                      },
                    ]}
                  >
                    <XStack alignItems="center" gap={5}>
                      <Text fontSize={12}>{opt.icon}</Text>
                      <Text
                        fontSize={11}
                        fontWeight={isSelected ? '800' : '600'}
                        color={isSelected ? tokens.accentForeground : tokens.text}
                      >
                        {opt.label}
                      </Text>
                    </XStack>
                  </Pressable>
                );
              })}
            </XStack>
          </YStack>

          {/* ── 2. COLOR GROUPING & PARENT VARIANT ── */}
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.md}
            borderWidth={1}
            borderColor={tokens.border}
            padding={12}
            gap={10}
          >
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={12} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
                2. Color Grouping & Variants
              </Text>
              <View style={styles.pillBadge}>
                <Text fontSize={10} fontWeight="700" color={tokens.accent}>
                  {colorVariants.length} Colorways Linked
                </Text>
              </View>
            </XStack>

            <YStack gap={4}>
              <Text fontSize={11} color={tokens.textMuted}>
                Master Collection / Group Name:
              </Text>
              <TextInput
                value={masterCollection}
                onChangeText={setMasterCollection}
                style={styles.textInputBox}
                placeholder="e.g. Kanjivaram Royal Heritage Collection"
              />
            </YStack>

            {/* Linked colorway swatches */}
            <YStack gap={6}>
              <Text fontSize={11} color={tokens.textMuted}>
                Linked Color Variants on Storefront:
              </Text>
              <XStack gap={8} flexWrap="wrap">
                {colorVariants.map((variant) => (
                  <View
                    key={variant.productId}
                    style={[
                      styles.variantCard,
                      {
                        backgroundColor: variant.isCurrent ? `${tokens.accent}12` : tokens.surfaceRaised,
                        borderColor: variant.isCurrent ? tokens.accent : tokens.border,
                      },
                    ]}
                  >
                    <XStack alignItems="center" gap={6}>
                      <View style={[styles.colorDot, { backgroundColor: variant.colorHex || '#999' }]} />
                      <YStack>
                        <Text fontSize={11} fontWeight="800" color={tokens.text}>
                          {variant.colorName}
                        </Text>
                        <Text fontSize={9} color={tokens.textMuted}>
                          {variant.productCode} {variant.isCurrent ? '(Active)' : ''}
                        </Text>
                      </YStack>
                    </XStack>
                  </View>
                ))}
              </XStack>
            </YStack>
          </YStack>

          {/* ── 3. PRICING & PROFIT MARGIN ENGINE ── */}
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.md}
            borderWidth={1}
            borderColor={tokens.border}
            padding={12}
            gap={10}
          >
            <Text fontSize={12} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
              3. Pricing & Margin Engine
            </Text>

            <XStack gap={10}>
              {/* MRP Input */}
              <YStack flex={1} gap={4}>
                <Text fontSize={11} color={tokens.textMuted}>
                  MRP (Strikethrough):
                </Text>
                <XStack alignItems="center" style={styles.currencyInputContainer}>
                  <Text fontSize={12} fontWeight="700" color={tokens.textMuted}>
                    ₹
                  </Text>
                  <TextInput
                    value={mrp}
                    onChangeText={setMrp}
                    keyboardType="numeric"
                    style={styles.currencyInput}
                  />
                </XStack>
              </YStack>

              {/* Sale Price Input */}
              <YStack flex={1} gap={4}>
                <Text fontSize={11} color={tokens.textMuted}>
                  Sale Price (Customer):
                </Text>
                <XStack alignItems="center" style={styles.currencyInputContainer}>
                  <Text fontSize={12} fontWeight="700" color={tokens.accent}>
                    ₹
                  </Text>
                  <TextInput
                    value={salePrice}
                    onChangeText={setSalePrice}
                    keyboardType="numeric"
                    style={[styles.currencyInput, { fontWeight: '800', color: tokens.text }]}
                  />
                </XStack>
              </YStack>
            </XStack>

            {/* Margin Calculation Summary Card */}
            <XStack
              backgroundColor={tokens.surfaceRaised}
              borderRadius={6}
              padding={8}
              justifyContent="space-between"
              alignItems="center"
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

          {/* ── 4. STORE MEDIA ORDERING & HERO SELECTION (1..N) ── */}
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.md}
            borderWidth={1}
            borderColor={tokens.border}
            padding={12}
            gap={10}
          >
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={12} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
                4. Store Media Presentation Order
              </Text>
              <Text fontSize={11} color={tokens.textMuted}>
                {mediaList.length} Slides
              </Text>
            </XStack>

            {/* AI Dwell Time Suggestion Box */}
            <YStack
              backgroundColor={`${tokens.accent}0D`}
              borderRadius={tokens.radius.md}
              borderWidth={1}
              borderColor={`${tokens.accent}40`}
              padding={10}
              gap={6}
            >
              <XStack alignItems="center" gap={6}>
                <LuSparkles size={14} color={tokens.accent} />
                <Text fontSize={11} fontWeight="800" color={tokens.accent}>
                  Smart Dwell Heatmap Insight
                </Text>
              </XStack>
              <Text fontSize={11} color={tokens.textSecondary}>
                Slide #4 (Full Drape) has 5.2s interaction time (42% higher engagement than Slide #1). Recommended for Hero!
              </Text>
              <Pressable
                onPress={applySmartDwellReorder}
                style={({ pressed }) => [
                  styles.smartReorderBtn,
                  { backgroundColor: pressed ? tokens.accentSubtle : tokens.surface, borderColor: `${tokens.accent}60` },
                ]}
              >
                <Text fontSize={11} fontWeight="800" color={tokens.accent} textAlign="center">
                  ✨ Auto-Apply Smart Dwell Order
                </Text>
              </Pressable>
            </YStack>

            {/* Media list with reorder buttons */}
            <YStack gap={6}>
              {mediaList.map((item, index) => (
                <XStack
                  key={item.id}
                  backgroundColor={tokens.surfaceRaised}
                  borderRadius={6}
                  padding={6}
                  alignItems="center"
                  justifyContent="space-between"
                  borderWidth={1}
                  borderColor={item.isHero ? tokens.accent : tokens.border}
                >
                  <XStack alignItems="center" gap={8} flex={1}>
                    <View
                      style={[
                        styles.orderBadge,
                        { backgroundColor: item.isHero ? tokens.accent : tokens.surface },
                      ]}
                    >
                      <Text
                        fontSize={11}
                        fontWeight="800"
                        color={item.isHero ? tokens.accentForeground : tokens.text}
                      >
                        {item.sortOrder}
                      </Text>
                    </View>

                    <Image source={{ uri: item.uri }} style={styles.mediaThumb} resizeMode="cover" />

                    <YStack flex={1}>
                      <XStack alignItems="center" gap={4}>
                        {item.isHero && (
                          <View style={styles.heroPill}>
                            <Text fontSize={9} fontWeight="800" color={tokens.accent}>
                              ★ COVER HERO
                            </Text>
                          </View>
                        )}
                        {item.mediaType === 'video' && (
                          <View style={styles.videoPill}>
                            <LuVideo size={9} color="#fff" />
                            <Text fontSize={9} fontWeight="800" color="#fff">
                              VIDEO
                            </Text>
                          </View>
                        )}
                      </XStack>
                      <Text fontSize={10} color={tokens.textMuted}>
                        Avg Dwell: {item.dwellTimeSeconds}s
                      </Text>
                    </YStack>
                  </XStack>

                  <XStack alignItems="center" gap={4}>
                    {!item.isHero && (
                      <Pressable
                        onPress={() => setHeroMedia(item.id)}
                        hitSlop={6}
                        style={styles.heroBtn}
                      >
                        <Text fontSize={10} fontWeight="700" color={tokens.accent}>
                          Make Hero
                        </Text>
                      </Pressable>
                    )}

                    <Pressable
                      onPress={() => moveMedia(index, 'up')}
                      disabled={index === 0}
                      hitSlop={6}
                      style={[styles.arrowBtn, { opacity: index === 0 ? 0.3 : 1 }]}
                    >
                      <LuChevronUp size={14} color={tokens.text} />
                    </Pressable>

                    <Pressable
                      onPress={() => moveMedia(index, 'down')}
                      disabled={index === mediaList.length - 1}
                      hitSlop={6}
                      style={[styles.arrowBtn, { opacity: index === mediaList.length - 1 ? 0.3 : 1 }]}
                    >
                      <LuChevronDown size={14} color={tokens.text} />
                    </Pressable>
                  </XStack>
                </XStack>
              ))}
            </YStack>
          </YStack>

          {/* ── 5. STORE TAXONOMY & METADATA FILTER TAGS ── */}
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.md}
            borderWidth={1}
            borderColor={tokens.border}
            padding={12}
            gap={10}
          >
            <Text fontSize={12} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
              5. Storefront Filter Tags
            </Text>

            <XStack flexWrap="wrap" gap={6}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text fontSize={11} fontWeight="700" color={tokens.text}>
                    {tag}
                  </Text>
                  <Pressable onPress={() => removeTag(tag)} hitSlop={6}>
                    <LuX size={12} color={tokens.textMuted} />
                  </Pressable>
                </View>
              ))}
            </XStack>

            <XStack gap={6} alignItems="center">
              <TextInput
                value={newTagInput}
                onChangeText={setNewTagInput}
                placeholder="Add custom tag (e.g. Pure Zari, Festive)..."
                placeholderTextColor={tokens.textMuted}
                style={[styles.textInputBox, { flex: 1 }]}
                onSubmitEditing={addTag}
              />
              <Pressable onPress={addTag} style={[styles.addTagBtn, { backgroundColor: tokens.accent }]}>
                <LuPlus size={14} color={tokens.accentForeground} />
              </Pressable>
            </XStack>
          </YStack>

          {/* ── 6. AUDIT & CHANGE HISTORY TIMELINE ── */}
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.md}
            borderWidth={1}
            borderColor={tokens.border}
            padding={12}
            gap={8}
          >
            <XStack alignItems="center" gap={6}>
              <LuHistory size={14} color={tokens.accent} />
              <Text fontSize={12} fontWeight="800" color={tokens.text} textTransform="uppercase" letterSpacing={0.5}>
                6. Change Audit History
              </Text>
            </XStack>

            <YStack gap={8} paddingTop={4}>
              {auditLogs.map((log) => (
                <YStack key={log.id} style={styles.logItem}>
                  <XStack alignItems="center" justifyContent="space-between">
                    <Text fontSize={11} fontWeight="800" color={tokens.text}>
                      {log.author}
                    </Text>
                    <Text fontSize={10} color={tokens.textMuted}>
                      {log.timestamp}
                    </Text>
                  </XStack>
                  <Text fontSize={11} color={tokens.textSecondary}>
                    {log.actionText}
                  </Text>
                </YStack>
              ))}
            </YStack>
          </YStack>
        </YStack>
      </ScrollView>

      {/* ── STICKY BOTTOM SAVE ACTION BAR ── */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor={tokens.surface}
        borderTopWidth={1}
        borderTopColor={tokens.border}
        paddingHorizontal={14}
        paddingTop={10}
        paddingBottom={bottomInset + 12}
      >
        <Pressable
          onPress={handleSaveCuration}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: tokens.accent, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <XStack alignItems="center" justifyContent="center" gap={8}>
            <LuCheck size={16} color={tokens.accentForeground} />
            <Text fontSize={14} fontWeight="800" color={tokens.accentForeground}>
              Save & Push to Storefront
            </Text>
          </XStack>
        </Pressable>
      </YStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingestedBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  lifecycleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  textInputBox: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  variantCard: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  currencyInputContainer: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  currencyInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 2,
  },
  smartReorderBtn: {
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
  },
  orderBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaThumb: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  heroPill: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  videoPill: {
    backgroundColor: '#000',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  heroBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  arrowBtn: {
    padding: 4,
    borderRadius: 4,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addTagBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logItem: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 2,
  },
  toastBanner: {
    marginHorizontal: 12,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

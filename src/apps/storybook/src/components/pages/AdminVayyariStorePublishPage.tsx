import React, { useState, useMemo } from 'react';
import { View, Pressable, StyleSheet, ScrollView, TextInput, Platform, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuStore,
  LuSearch,
  LuCheck,
  LuSparkles,
  LuSend,
  LuStar,
} from 'react-icons/lu';
import { useTheme } from '../../theme';

export interface VayyariStarredProductItem {
  id: string;
  productCode: string;
  title: string;
  category: string;
  fabric: string;
  color?: string;
  mediaCount: number;
  primaryImageUri: string;
  allMediaUris?: string[];
  descriptions: string[];
  isStarred: boolean;
  isPublishedToStore?: boolean;
  publishedAt?: string;
}

export interface AdminVayyariStorePublishPageProps {
  products?: VayyariStarredProductItem[];
  publishedCount?: number;
  onBack?: () => void;
  onPublishBatch?: (selectedIds: string[]) => void;
  onNavigateToStoreInventory?: () => void;
}

export const MOCK_STARRED_PRODUCTS: VayyariStarredProductItem[] = [
  {
    id: 'p-1',
    productCode: 'SAR-KAN-901',
    title: 'Kanjivaram Pure Silk Saree',
    category: 'Saree',
    fabric: 'Mulberry Silk',
    color: 'Emerald Green',
    mediaCount: 8,
    primaryImageUri: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80',
    descriptions: [
      'Exclusive Mulberry Silk Handloom Saree with floral threadwork and contrast pallu.',
      '✨ Kanjivaram Silk Saree (SAR-KAN-901) - Pure zari weaving bridal heritage.',
    ],
    isStarred: true,
    isPublishedToStore: false,
  },
  {
    id: 'p-2',
    productCode: 'SAR-BAN-402',
    title: 'Banarasi Royal Brocade Saree',
    category: 'Saree',
    fabric: 'Pure Katan Silk',
    color: 'Crimson Red',
    mediaCount: 6,
    primaryImageUri: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80',
    descriptions: [
      'Pure Zari border tissue saree with designer blouse piece. Ready to ship.',
    ],
    isStarred: true,
    isPublishedToStore: false,
  },
  {
    id: 'p-3',
    productCode: 'DRE-GEO-110',
    title: 'Georgette Anarkali Gown Set',
    category: 'Dress Material',
    fabric: 'Pure Georgette',
    color: 'Pastel Lilac',
    mediaCount: 5,
    primaryImageUri: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80',
    descriptions: [
      'Floor length Anarkali with intricate sequin embroidery and matching dupatta.',
    ],
    isStarred: true,
    isPublishedToStore: false,
  },
  {
    id: 'p-4',
    productCode: 'SAR-ORG-505',
    title: 'Floral Handpainted Organza Saree',
    category: 'Saree',
    fabric: 'Organza Silk',
    color: 'Powder Blue',
    mediaCount: 7,
    primaryImageUri: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=600&q=80',
    descriptions: [
      'Lightweight breezy organza saree with hand-painted botanical motifs.',
    ],
    isStarred: true,
    isPublishedToStore: false,
  },
  {
    id: 'p-5',
    productCode: 'KUR-CHI-303',
    title: 'Chanderi Zari Work Kurta Set',
    category: 'Kurti / Set',
    fabric: 'Chanderi Silk',
    color: 'Mustard Yellow',
    mediaCount: 4,
    primaryImageUri: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600&q=80',
    descriptions: [
      'Festive Chanderi kurta with gotta patti detailing and straight pants.',
    ],
    isStarred: true,
    isPublishedToStore: false,
  },
];

export function AdminVayyariStorePublishPage({
  products = MOCK_STARRED_PRODUCTS,
  publishedCount = 2,
  onBack,
  onPublishBatch,
  onNavigateToStoreInventory,
}: AdminVayyariStorePublishPageProps) {
  const { tokens } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccessToast, setPublishSuccessToast] = useState<string | null>(null);

  // Local list state for instant UI update
  const [readyList, setReadyList] = useState<VayyariStarredProductItem[]>(products);

  // Categories list
  const categories = ['All', 'Saree', 'Dress Material', 'Kurti / Set', 'Lehenga'];

  // Filtered list
  const filteredReadyProducts = useMemo(() => {
    return readyList.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchQuery =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.fabric.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [readyList, selectedCategory, searchQuery]);

  // Toggle selection
  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredReadyProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReadyProducts.map((p) => p.id));
    }
  };

  // Publish action
  const handleTriggerPublish = () => {
    if (selectedIds.length === 0) return;
    setIsPublishing(true);

    setTimeout(() => {
      onPublishBatch?.(selectedIds);
      setReadyList((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
      setPublishSuccessToast(`🚀 Successfully published ${selectedIds.length} products to Store!`);
      setSelectedIds([]);
      setIsPublishing(false);

      setTimeout(() => {
        setPublishSuccessToast(null);
      }, 2500);
    }, 700);
  };

  return (
    <YStack
      flex={1}
      width="100%"
      maxWidth={460}
      alignSelf="center"
      backgroundColor={tokens.background}
      position="relative"
      overflow="hidden"
    >
      {/* ── TOP NAV HEADER ── */}
      <XStack
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
        paddingHorizontal={12}
        paddingVertical={10}
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
                Publish to Store
              </Text>
            </XStack>
            <Text fontSize={11} color={tokens.textMuted}>
              Vayyari Catalog ➔ Store Ingestion
            </Text>
          </YStack>
        </XStack>

        {/* In-Store Inventory Shortcut Action */}
        <Pressable
          onPress={onNavigateToStoreInventory}
          hitSlop={6}
          style={({ pressed }) => [
            styles.inStoreHeaderBtn,
            {
              backgroundColor: pressed ? tokens.accentSubtle : tokens.surfaceRaised,
              borderColor: `${tokens.accent}40`,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="View In-Store Inventory"
        >
          <XStack alignItems="center" gap={4}>
            <LuStore size={13} color={tokens.accent} />
            <Text fontSize={11} fontWeight="800" color={tokens.accent}>
              In Store ({publishedCount})
            </Text>
          </XStack>
        </Pressable>
      </XStack>

      {/* ── SEARCH & CATEGORY BAR ── */}
      <YStack paddingHorizontal={12} paddingTop={10} gap={8}>
        <XStack
          backgroundColor={tokens.surface}
          borderRadius={tokens.radius.md}
          borderWidth={1}
          borderColor={tokens.border}
          paddingHorizontal={10}
          paddingVertical={6}
          alignItems="center"
          gap={8}
        >
          <LuSearch size={14} color={tokens.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search starred products by code, fabric..."
            placeholderTextColor={tokens.textMuted}
            style={styles.searchInput}
          />
        </XStack>

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <XStack gap={6}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: isSelected ? tokens.accent : tokens.surface,
                      borderColor: isSelected ? tokens.accent : tokens.border,
                    },
                  ]}
                >
                  <Text
                    fontSize={11}
                    fontWeight={isSelected ? '800' : '600'}
                    color={isSelected ? tokens.accentForeground : tokens.textSecondary}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </XStack>
        </ScrollView>
      </YStack>

      {/* ── BATCH SELECT HEADER ── */}
      {filteredReadyProducts.length > 0 && (
        <XStack
          justifyContent="space-between"
          alignItems="center"
          paddingHorizontal={14}
          paddingTop={8}
        >
          <Text fontSize={11} fontWeight="700" color={tokens.textSecondary}>
            {filteredReadyProducts.length} Starred Items Available
          </Text>
          <Pressable onPress={handleSelectAll} hitSlop={6}>
            <Text fontSize={11} fontWeight="800" color={tokens.accent}>
              {selectedIds.length === filteredReadyProducts.length && filteredReadyProducts.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </Text>
          </Pressable>
        </XStack>
      )}

      {/* ── TOAST NOTIFICATION ── */}
      {publishSuccessToast && (
        <View style={[styles.toastBanner, { backgroundColor: tokens.accent }]}>
          <Text fontSize={12} fontWeight="800" color={tokens.accentForeground} textAlign="center">
            {publishSuccessToast}
          </Text>
        </View>
      )}

      {/* ── 3-COLUMN CATALOG GRID TILE BODY ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: selectedIds.length > 0 ? 90 : 20 }}
      >
        <YStack gap={10} padding={10}>
          {filteredReadyProducts.length === 0 ? (
            <YStack alignItems="center" justifyContent="center" paddingVertical={40} gap={8}>
              <LuSparkles size={32} color={tokens.textMuted} />
              <Text fontSize={14} fontWeight="800" color={tokens.text}>
                No Starred Products Found
              </Text>
              <Text fontSize={12} color={tokens.textMuted} textAlign="center">
                Star items in the Catalog Workbench to make them eligible for Store Publishing.
              </Text>
            </YStack>
          ) : (
            <XStack flexWrap="wrap" marginHorizontal={-2}>
              {filteredReadyProducts.map((item) => {
                const isSelected = selectedIds.includes(item.id);

                return (
                  <YStack key={item.id} width="33.333%" padding={2}>
                    <Pressable
                      onPress={() => toggleSelectProduct(item.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`${item.productCode} - ${item.title}`}
                      style={({ pressed }) => [
                        styles.gridTileWrapper,
                        { opacity: pressed ? 0.9 : 1 },
                      ]}
                    >
                      <YStack
                        width="100%"
                        aspectRatio={4 / 5}
                        borderRadius={tokens.radius.xs}
                        overflow="hidden"
                        backgroundColor={tokens.surfaceRaised}
                        borderWidth={isSelected ? 2.5 : 0.5}
                        borderColor={isSelected ? tokens.accent : tokens.border}
                        position="relative"
                      >
                        {/* Product Image */}
                        <Image
                          source={{ uri: item.primaryImageUri }}
                          style={styles.gridTileImage}
                          resizeMode="cover"
                        />

                        {/* Multi-Selection Checkbox & Overlay Tint */}
                        {isSelected && (
                          <YStack
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            bottom={0}
                            backgroundColor="rgba(0,0,0,0.22)"
                            zIndex={4}
                          />
                        )}

                        {/* Top-Left Circular Selection Indicator */}
                        <XStack
                          position="absolute"
                          top={6}
                          left={6}
                          width={22}
                          height={22}
                          borderRadius={11}
                          backgroundColor={isSelected ? tokens.accent : 'rgba(0,0,0,0.45)'}
                          borderWidth={1.5}
                          borderColor="#ffffff"
                          alignItems="center"
                          justifyContent="center"
                          zIndex={10}
                        >
                          {isSelected && <LuCheck size={13} color="#ffffff" />}
                        </XStack>

                        {/* Top-Right Star Badge (Indicates Starred Item from Catalog) */}
                        <XStack
                          position="absolute"
                          top={6}
                          right={6}
                          width={22}
                          height={22}
                          borderRadius={11}
                          backgroundColor="rgba(0,0,0,0.45)"
                          alignItems="center"
                          justifyContent="center"
                          zIndex={10}
                        >
                          <LuStar
                            size={12}
                            color="#FBBF24"
                            style={{ fill: '#FBBF24' } as any}
                          />
                        </XStack>

                        {/* Bottom Metadata Gradient Overlay */}
                        <YStack
                          position="absolute"
                          bottom={0}
                          left={0}
                          right={0}
                          paddingVertical={4}
                          paddingHorizontal={5}
                          backgroundColor="rgba(0,0,0,0.72)"
                          gap={1}
                          zIndex={10}
                        >
                          <XStack alignItems="center" justifyContent="space-between">
                            <Text fontSize={9.5} fontWeight="800" color="#ffffff" numberOfLines={1} flex={1}>
                              {item.productCode}
                            </Text>
                            <XStack
                              backgroundColor="rgba(255,255,255,0.22)"
                              paddingHorizontal={4}
                              paddingVertical={1}
                              borderRadius={3}
                              alignItems="center"
                            >
                              <Text fontSize={7.5} fontWeight="800" color="#ffffff">
                                📸 {item.mediaCount}
                              </Text>
                            </XStack>
                          </XStack>

                          <Text fontSize={8} color="rgba(255,255,255,0.85)" numberOfLines={1}>
                            {item.fabric || item.category}
                          </Text>
                        </YStack>
                      </YStack>
                    </Pressable>
                  </YStack>
                );
              })}
            </XStack>
          )}
        </YStack>
      </ScrollView>

      {/* ── STICKY BATCH PUBLISH BOTTOM BAR ── */}
      {selectedIds.length > 0 && (
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
          paddingBottom={Platform.OS === 'ios' ? 24 : 12}
          shadowColor="#000"
          shadowOffset={{ width: 0, height: -2 }}
          shadowOpacity={0.1}
          shadowRadius={6}
          elevation={4}
        >
          <Pressable
            onPress={handleTriggerPublish}
            disabled={isPublishing}
            style={({ pressed }) => [
              styles.publishBtn,
              {
                backgroundColor: tokens.accent,
                opacity: isPublishing ? 0.7 : pressed ? 0.9 : 1,
              },
            ]}
          >
            <XStack alignItems="center" justifyContent="center" gap={8}>
              <LuSend size={15} color={tokens.accentForeground} />
              <Text fontSize={14} fontWeight="800" color={tokens.accentForeground}>
                {isPublishing
                  ? 'Streaming to Store Engine...'
                  : `Publish ${selectedIds.length} Products to Store`}
              </Text>
            </XStack>
          </Pressable>
        </YStack>
      )}
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
  inStoreHeaderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 2,
    outlineStyle: 'none',
  } as any,
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  gridTileWrapper: {
    width: '100%',
    cursor: 'pointer',
  } as any,
  gridTileImage: {
    width: '100%',
    height: '100%',
  },
  toastBanner: {
    marginHorizontal: 12,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  publishBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

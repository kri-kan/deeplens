import React, { useState, useMemo } from 'react';
import { View, Pressable, StyleSheet, ScrollView, TextInput, Image } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuArrowLeft,
  LuStore,
  LuSearch,
  LuCheckCheck,
  LuPlus,
  LuRefreshCw,
  LuClock,
} from 'react-icons/lu';
import { useTheme } from '../../theme';
import { VayyariStarredProductItem } from './AdminVayyariStorePublishPage';

export const MOCK_PUBLISHED_PRODUCTS: VayyariStarredProductItem[] = [
  {
    id: 'p-101',
    productCode: 'SAR-PAI-880',
    title: 'Paithani Peacock Motif Saree',
    category: 'Saree',
    fabric: 'Pure Silk',
    color: 'Royal Magenta',
    mediaCount: 6,
    primaryImageUri: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80',
    descriptions: ['Traditional Maharashtra Paithani handwoven pallu with gold zari.'],
    isStarred: true,
    isPublishedToStore: true,
    publishedAt: 'Today, 02:45 AM',
  },
  {
    id: 'p-102',
    productCode: 'LEH-VEL-702',
    title: 'Bridal Velvet Embroidered Lehenga',
    category: 'Lehenga',
    fabric: 'Micro Velvet',
    color: 'Deep Maroon',
    mediaCount: 9,
    primaryImageUri: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80',
    descriptions: ['Heavy bridal dori and sequin work lehenga choli with double dupatta.'],
    isStarred: true,
    isPublishedToStore: true,
    publishedAt: 'Yesterday, 06:15 PM',
  },
];

export interface AdminVayyariStoreInventoryPageProps {
  products?: VayyariStarredProductItem[];
  onBack?: () => void;
  onNavigateToStorePublish?: () => void;
  onNavigateToStoreCuration?: (productId: string) => void;
  onResyncProduct?: (productId: string) => void;
}

export function AdminVayyariStoreInventoryPage({
  products = MOCK_PUBLISHED_PRODUCTS,
  onBack,
  onNavigateToStorePublish,
  onNavigateToStoreCuration,
  onResyncProduct,
}: AdminVayyariStoreInventoryPageProps) {
  const { tokens } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [resyncToast, setResyncToast] = useState<string | null>(null);

  // Categories list
  const categories = ['All', 'Saree', 'Dress Material', 'Kurti / Set', 'Lehenga'];

  // Filtered list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchQuery =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.fabric.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleResync = (productId: string, code: string) => {
    onResyncProduct?.(productId);
    setResyncToast(`🔄 Triggered OG media re-sync for ${code}`);
    setTimeout(() => setResyncToast(null), 2500);
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
                In-Store Products
              </Text>
            </XStack>
            <Text fontSize={11} color={tokens.textMuted}>
              Synced Vayyari Catalog ➔ Store Engine
            </Text>
          </YStack>
        </XStack>

        {/* Publish More Shortcut Action */}
        <Pressable
          onPress={onNavigateToStorePublish}
          hitSlop={6}
          style={({ pressed }) => [
            styles.publishMoreBtn,
            {
              backgroundColor: pressed ? tokens.accentSubtle : tokens.surfaceRaised,
              borderColor: `${tokens.accent}50`,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Publish More Products"
        >
          <XStack alignItems="center" gap={4}>
            <LuPlus size={13} color={tokens.accent} />
            <Text fontSize={11} fontWeight="800" color={tokens.accent}>
              Publish More
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
            placeholder="Search in-store products by code, fabric..."
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

      {/* ── HEADER SUBTITLE ── */}
      {filteredProducts.length > 0 && (
        <XStack paddingHorizontal={14} paddingTop={8} justifyContent="space-between" alignItems="center">
          <Text fontSize={11} fontWeight="700" color={tokens.textSecondary}>
            {filteredProducts.length} Items Live in Store Engine
          </Text>
        </XStack>
      )}

      {/* ── TOAST NOTIFICATION ── */}
      {resyncToast && (
        <View style={[styles.toastBanner, { backgroundColor: tokens.accent }]}>
          <Text fontSize={12} fontWeight="800" color={tokens.accentForeground} textAlign="center">
            {resyncToast}
          </Text>
        </View>
      )}

      {/* ── INVENTORY GRID BODY ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <YStack gap={10} padding={10}>
          {filteredProducts.length === 0 ? (
            <YStack alignItems="center" justifyContent="center" paddingVertical={50} gap={10}>
              <LuStore size={36} color={tokens.textMuted} />
              <Text fontSize={15} fontWeight="800" color={tokens.text}>
                Zero Products in Store
              </Text>
              <Text fontSize={12} color={tokens.textMuted} textAlign="center" maxWidth={260}>
                Publish starred items from the Publish Workbench to populate the Store Engine.
              </Text>
              {onNavigateToStorePublish && (
                <Pressable
                  onPress={onNavigateToStorePublish}
                  style={({ pressed }) => [
                    styles.emptyCtaBtn,
                    { backgroundColor: tokens.accent, opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <XStack alignItems="center" gap={6}>
                    <LuPlus size={14} color={tokens.accentForeground} />
                    <Text fontSize={12} fontWeight="800" color={tokens.accentForeground}>
                      Publish Starred Products ➔
                    </Text>
                  </XStack>
                </Pressable>
              )}
            </YStack>
          ) : (
            <XStack flexWrap="wrap" marginHorizontal={-2}>
              {filteredProducts.map((item) => (
                <YStack key={item.id} width="50%" padding={3}>
                  <YStack
                    backgroundColor={tokens.surface}
                    borderRadius={tokens.radius.sm}
                    borderWidth={1}
                    borderColor={tokens.border}
                    overflow="hidden"
                  >
                    {/* Product Image Tile */}
                    <YStack width="100%" aspectRatio={4 / 4.5} position="relative" backgroundColor={tokens.surfaceRaised}>
                      <Image
                        source={{ uri: item.primaryImageUri }}
                        style={styles.gridTileImage}
                        resizeMode="cover"
                      />

                      {/* Store Synced Pill */}
                      <XStack
                        position="absolute"
                        top={6}
                        left={6}
                        backgroundColor={tokens.accent}
                        paddingHorizontal={5}
                        paddingVertical={2}
                        borderRadius={4}
                        alignItems="center"
                        gap={3}
                      >
                        <LuCheckCheck size={10} color={tokens.accentForeground} />
                        <Text fontSize={9} fontWeight="800" color={tokens.accentForeground}>
                          Synced
                        </Text>
                      </XStack>

                      {/* Media Count */}
                      <XStack
                        position="absolute"
                        top={6}
                        right={6}
                        backgroundColor="rgba(0,0,0,0.5)"
                        paddingHorizontal={4}
                        paddingVertical={2}
                        borderRadius={3}
                        alignItems="center"
                      >
                        <Text fontSize={8} fontWeight="700" color="#fff">
                          📸 {item.mediaCount}
                        </Text>
                      </XStack>

                      {/* Bottom Overlay Info */}
                      <YStack
                        position="absolute"
                        bottom={0}
                        left={0}
                        right={0}
                        paddingVertical={3}
                        paddingHorizontal={6}
                        backgroundColor="rgba(0,0,0,0.68)"
                      >
                        <Text fontSize={8.5} fontWeight="800" color="#ffffff" numberOfLines={1}>
                          {item.productCode}
                        </Text>
                        <Text fontSize={7.5} color="rgba(255,255,255,0.85)" numberOfLines={1}>
                          {item.title}
                        </Text>
                      </YStack>
                    </YStack>

                    {/* Action Bar */}
                    <YStack padding={6} gap={4} backgroundColor={tokens.surface}>
                      <XStack alignItems="center" gap={4} marginBottom={2}>
                        <LuClock size={10} color={tokens.textMuted} />
                        <Text fontSize={9} color={tokens.textMuted} numberOfLines={1}>
                          {item.publishedAt || 'Recently synced'}
                        </Text>
                      </XStack>

                      {/* Curate Button */}
                      <Pressable
                        onPress={() => onNavigateToStoreCuration?.(item.id)}
                        hitSlop={4}
                        style={({ pressed }) => [
                          styles.curateActionBtn,
                          {
                            backgroundColor: pressed ? tokens.accentSubtle : tokens.surfaceRaised,
                            borderColor: `${tokens.accent}60`,
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <XStack alignItems="center" justifyContent="center" gap={3}>
                          <Text fontSize={10} fontWeight="800" color={tokens.accent}>
                            Curate in Store ➔
                          </Text>
                        </XStack>
                      </Pressable>

                      {/* Re-sync Button */}
                      <Pressable
                        onPress={() => handleResync(item.id, item.productCode)}
                        hitSlop={4}
                        style={({ pressed }) => [
                          styles.resyncBtn,
                          { backgroundColor: pressed ? tokens.surfaceRaised : 'transparent' },
                        ]}
                      >
                        <XStack alignItems="center" justifyContent="center" gap={3}>
                          <LuRefreshCw size={9} color={tokens.textMuted} />
                          <Text fontSize={9} fontWeight="700" color={tokens.textMuted}>
                            Re-sync OG Media
                          </Text>
                        </XStack>
                      </Pressable>
                    </YStack>
                  </YStack>
                </YStack>
              ))}
            </XStack>
          )}
        </YStack>
      </ScrollView>
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
  publishMoreBtn: {
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
  curateActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resyncBtn: {
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
});

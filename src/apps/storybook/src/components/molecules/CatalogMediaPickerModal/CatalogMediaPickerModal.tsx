import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Pressable,
  TextInput,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuSearch,
  LuX,
  LuImage,
  LuArrowLeft,
  LuCheck,
  LuChevronRight,
  LuPackage,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { BottomSheet } from '../../atoms/BottomSheet';

export interface MediaEntry {
  id: string;
  storagePath: string;
  color?: string;
  isDefault: boolean;
  mediaType?: number;
}

export interface VendorProduct {
  id: string;
  masterProductId?: string;
  title: string;
  productCode: string;
  vendorPrice?: number;
  category?: string;
  description?: string;
  fabric?: string;
  stitchType?: string;
  isStarred?: boolean;
  media?: MediaEntry[];
  mediaCount?: number;
}

export interface CatalogMediaSelection {
  product: VendorProduct;
  mediaItem: MediaEntry;
  imageUrl: string;
}

export interface CatalogMediaPickerModalProps {
  visible: boolean;
  initialSku?: string;
  onSelect: (selection: CatalogMediaSelection) => void;
  onClose: () => void;
}

export const MOCK_CATALOG_PRODUCTS: VendorProduct[] = [
  {
    id: 'prod-001',
    masterProductId: 'prod-001',
    title: 'Handloom Kanjivaram Silk Saree with Zari Border',
    productCode: 'PRD-10291',
    vendorPrice: 2499,
    category: 'Saree',
    description: 'Pure silk Kanjivaram saree with rich gold zari pallu and contrast temple border.',
    fabric: 'Pure Silk',
    stitchType: 'Unstitched',
    isStarred: true,
    media: [
      {
        id: 'media-001-1',
        storagePath: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
        isDefault: true,
        mediaType: 1,
      },
      {
        id: 'media-001-2',
        storagePath: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80',
        isDefault: false,
        mediaType: 1,
      },
      {
        id: 'media-001-3',
        storagePath: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80',
        isDefault: false,
        mediaType: 1,
      },
    ],
  },
  {
    id: 'prod-002',
    masterProductId: 'prod-002',
    title: 'Surat Royal Georgette Embroidered Anarkali Suit',
    productCode: 'PRD-84920',
    vendorPrice: 1899,
    category: 'Dress',
    description: 'Heavy embroidery work with stone embellishments, churidar and matching dupatta.',
    fabric: 'Georgette',
    stitchType: 'Semi-Stitched',
    isStarred: false,
    media: [
      {
        id: 'media-002-1',
        storagePath: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80',
        isDefault: true,
        mediaType: 1,
      },
      {
        id: 'media-002-2',
        storagePath: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=600&q=80',
        isDefault: false,
        mediaType: 1,
      },
    ],
  },
  {
    id: 'prod-003',
    masterProductId: 'prod-003',
    title: 'Banarasi Brocade Silk Bridal Lehenga Choli',
    productCode: 'PRD-39104',
    vendorPrice: 3499,
    category: 'Lehanga',
    description: 'Traditional Banarasi brocade weave with double cancan flare and designer blouse.',
    fabric: 'Brocade Silk',
    stitchType: 'Semi-Stitched',
    isStarred: true,
    media: [
      {
        id: 'media-003-1',
        storagePath: 'https://images.unsplash.com/photo-1610030469668-932d0c24203e?auto=format&fit=crop&w=600&q=80',
        isDefault: true,
        mediaType: 1,
      },
      {
        id: 'media-003-2',
        storagePath: 'https://images.unsplash.com/photo-1583391733975-00e1281adcf1?auto=format&fit=crop&w=600&q=80',
        isDefault: false,
        mediaType: 1,
      },
      {
        id: 'media-003-3',
        storagePath: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=600&q=80',
        isDefault: false,
        mediaType: 1,
      },
    ],
  },
  {
    id: 'prod-004',
    masterProductId: 'prod-004',
    title: 'Traditional Pochampally Ikat Handloom Silk Saree',
    productCode: 'PRD-55102',
    vendorPrice: 1599,
    category: 'Saree',
    description: 'Handwoven Ikat geometric pattern saree with contrast tissue border.',
    fabric: 'Ikat Silk',
    stitchType: 'Unstitched',
    isStarred: false,
    media: [
      {
        id: 'media-004-1',
        storagePath: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80',
        isDefault: true,
        mediaType: 1,
      },
      {
        id: 'media-004-2',
        storagePath: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
        isDefault: false,
        mediaType: 1,
      },
    ],
  },
];

export function getProductDisplayImageUri(mediaItem?: MediaEntry): string {
  if (!mediaItem) return 'https://via.placeholder.com/300?text=No+Image';
  const mPath = mediaItem.storagePath;
  if (mPath && (mPath.startsWith('http://') || mPath.startsWith('https://'))) {
    return mPath;
  }
  return 'https://via.placeholder.com/300?text=Product+Photo';
}

/**
 * Animated Shimmer Skeleton for Catalog Product Items
 * Provides smooth opacity pulsing during search debouncing, API querying,
 * and component tree rendering.
 */
export function CatalogItemShimmer({ tokens }: { tokens: any }) {
  const shimmerOpacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerOpacity, {
          toValue: 0.9,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerOpacity, {
          toValue: 0.35,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerOpacity]);

  return (
    <Animated.View style={{ opacity: shimmerOpacity, width: '100%' }}>
      <XStack
        backgroundColor={tokens.surface}
        borderRadius={tokens.radius.sm}
        borderWidth={1}
        borderColor={tokens.border}
        padding={8}
        alignItems="center"
        gap={10}
      >
        {/* Shimmer Thumbnail (52x52) */}
        <YStack
          width={52}
          height={52}
          borderRadius={tokens.radius.xs}
          backgroundColor={tokens.surfaceRaised}
        />

        {/* Shimmer Metadata & Content */}
        <YStack flex={1} gap={6}>
          {/* Top row: SKU code & badge placeholder */}
          <XStack alignItems="center" gap={6}>
            <YStack width={65} height={12} borderRadius={3} backgroundColor={tokens.surfaceRaised} />
            <YStack width={45} height={12} borderRadius={3} backgroundColor={tokens.surfaceRaised} />
          </XStack>

          {/* Title line placeholder */}
          <YStack width="82%" height={12} borderRadius={3} backgroundColor={tokens.surfaceRaised} />

          {/* Bottom row: Attributes and Price placeholder */}
          <XStack alignItems="center" justifyContent="space-between">
            <XStack gap={6} alignItems="center">
              <YStack width={40} height={10} borderRadius={2} backgroundColor={tokens.surfaceRaised} />
              <YStack width={45} height={10} borderRadius={2} backgroundColor={tokens.surfaceRaised} />
            </XStack>
            <YStack width={48} height={12} borderRadius={3} backgroundColor={tokens.surfaceRaised} />
          </XStack>
        </YStack>

        {/* Shimmer Action Chevron */}
        <YStack width={8} height={14} borderRadius={2} backgroundColor={tokens.surfaceRaised} opacity={0.6} />
      </XStack>
    </Animated.View>
  );
}

export function CatalogMediaPickerModal({
  visible,
  initialSku = '',
  onSelect,
  onClose,
}: CatalogMediaPickerModalProps) {
  const { tokens } = useTheme();

  const [searchQuery, setSearchQuery] = useState(initialSku);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<VendorProduct | null>(null);
  const [selectedMediaItem, setSelectedMediaItem] = useState<MediaEntry | null>(null);

  useEffect(() => {
    if (visible) {
      setSearchQuery(initialSku || '');
      setSelectedProduct(null);
      setSelectedMediaItem(null);
      setLoading(true);
    }
  }, [visible, initialSku]);

  const loadCatalog = useCallback(async (query: string) => {
    setLoading(true);
    try {
      // Simulate brief network latency for realistic loading state in storybook
      await new Promise((resolve) => setTimeout(resolve, 150));
      const trimmed = query.trim().toLowerCase();
      const filtered = MOCK_CATALOG_PRODUCTS.filter((p) => {
        if (!trimmed) return true;
        return (
          p.title.toLowerCase().includes(trimmed) ||
          p.productCode.toLowerCase().includes(trimmed) ||
          (p.category && p.category.toLowerCase().includes(trimmed))
        );
      });
      setProducts(filtered);
    } finally {
      // Allow render pass to commit before dismissing shimmer
      requestAnimationFrame(() => {
        setTimeout(() => {
          setLoading(false);
        }, 50);
      });
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      const timer = setTimeout(() => {
        loadCatalog(searchQuery);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [visible, searchQuery, loadCatalog]);

  const handleSelectProduct = (product: VendorProduct) => {
    setSelectedProduct(product);
    const primary = product.media?.find((m) => m.isDefault) || product.media?.[0] || null;
    setSelectedMediaItem(primary);
  };

  const handleBackToProductList = () => {
    setSelectedProduct(null);
    setSelectedMediaItem(null);
  };

  const handleConfirmMediaSelection = () => {
    if (!selectedProduct || !selectedMediaItem) return;
    const uri = getProductDisplayImageUri(selectedMediaItem);
    onSelect({
      product: selectedProduct,
      mediaItem: selectedMediaItem,
      imageUrl: uri,
    });
    onClose();
  };

  if (!visible) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={selectedProduct ? 'Select PDP Photo' : 'Catalog PDP Media'}
      zIndex={260}
      maxHeight="88%"
      paddingHorizontal={16}
      paddingBottom={Platform.OS === 'ios' ? 32 : 16}
      headerRight={
        selectedProduct ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to products list"
            onPress={handleBackToProductList}
            style={{ paddingHorizontal: 6, paddingVertical: 2 }}
          >
            <XStack alignItems="center" gap={4}>
              <LuArrowLeft size={14} color={tokens.accent} />
              <Text fontSize={12} fontWeight="700" color={tokens.accent}>
                Products
              </Text>
            </XStack>
          </Pressable>
        ) : undefined
      }
      footer={
        selectedProduct ? (
          <XStack gap={10} paddingTop={6}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel selection"
              onPress={handleBackToProductList}
              style={({ pressed }) => ({
                flex: 1,
                height: 42,
                borderRadius: tokens.radius.sm,
                borderWidth: 1,
                borderColor: tokens.border,
                backgroundColor: tokens.surfaceRaised,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Text fontSize={13} fontWeight="700" color={tokens.text}>
                Back
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Link selected PDP photo"
              disabled={!selectedMediaItem}
              onPress={handleConfirmMediaSelection}
              style={({ pressed }) => ({
                flex: 1.5,
                height: 42,
                borderRadius: tokens.radius.sm,
                backgroundColor: selectedMediaItem ? tokens.accent : tokens.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <XStack alignItems="center" gap={6}>
                <LuCheck size={16} color={tokens.accentForeground} />
                <Text fontSize={13} fontWeight="800" color={tokens.accentForeground}>
                  LINK THIS IMAGE
                </Text>
              </XStack>
            </Pressable>
          </XStack>
        ) : null
      }
    >
      {selectedProduct ? (
        <YStack gap={12} paddingVertical={4}>
          <XStack
            backgroundColor={tokens.surfaceRaised}
            borderRadius={tokens.radius.sm}
            padding={10}
            alignItems="center"
            gap={10}
            borderWidth={1}
            borderColor={tokens.border}
          >
            <YStack
              width={48}
              height={48}
              borderRadius={tokens.radius.xs}
              overflow="hidden"
              backgroundColor="#eee"
            >
              <Image
                source={{ uri: getProductDisplayImageUri(selectedProduct.media?.[0]) }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </YStack>

            <YStack flex={1} gap={2}>
              <XStack alignItems="center" gap={6}>
                <YStack
                  backgroundColor={tokens.accentSubtle || 'rgba(168, 85, 247, 0.12)'}
                  paddingHorizontal={6}
                  paddingVertical={2}
                  borderRadius={tokens.radius.xs}
                >
                  <Text fontSize={10} fontWeight="800" color={tokens.accent}>
                    {selectedProduct.productCode}
                  </Text>
                </YStack>
                {selectedProduct.vendorPrice ? (
                  <Text fontSize={12} fontWeight="800" color={tokens.text}>
                    ₹{selectedProduct.vendorPrice}
                  </Text>
                ) : null}
              </XStack>

              <Text fontSize={12} fontWeight="700" color={tokens.text} numberOfLines={1}>
                {selectedProduct.title}
              </Text>
            </YStack>
          </XStack>

          <Text fontSize={11} fontWeight="700" color={tokens.textMuted} letterSpacing={0.3}>
            CHOOSE PDP IMAGE ({selectedProduct.media?.length || 0} AVAILABLE):
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
            style={{ maxHeight: 340 }}
          >
            <XStack flexWrap="wrap" gap={10}>
              {(selectedProduct.media || []).map((m, idx) => {
                const isSelected = selectedMediaItem?.id === m.id;
                const uri = getProductDisplayImageUri(m);

                return (
                  <Pressable
                    key={m.id || `media-${idx}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose image ${idx + 1}`}
                    onPress={() => setSelectedMediaItem(m)}
                    style={{ width: '31%', aspectRatio: 0.9 }}
                  >
                    <YStack
                      width="100%"
                      height="100%"
                      borderRadius={tokens.radius.sm}
                      overflow="hidden"
                      borderWidth={2}
                      borderColor={isSelected ? tokens.accent : tokens.border}
                      backgroundColor={tokens.surfaceRaised}
                      position="relative"
                    >
                      <Image
                        source={{ uri }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />

                      {m.isDefault ? (
                        <YStack
                          position="absolute"
                          top={4}
                          left={4}
                          backgroundColor="rgba(0,0,0,0.65)"
                          paddingHorizontal={4}
                          paddingVertical={2}
                          borderRadius={4}
                        >
                          <Text fontSize={8} fontWeight="800" color="#fff">
                            COVER
                          </Text>
                        </YStack>
                      ) : null}

                      {isSelected ? (
                        <YStack
                          position="absolute"
                          top={4}
                          right={4}
                          width={20}
                          height={20}
                          borderRadius={10}
                          backgroundColor={tokens.accent}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <LuCheck size={12} color={tokens.accentForeground} />
                        </YStack>
                      ) : null}
                    </YStack>
                  </Pressable>
                );
              })}
            </XStack>
          </ScrollView>
        </YStack>
      ) : (
        <YStack gap={10} paddingVertical={4}>
          <XStack
            alignItems="center"
            backgroundColor={tokens.surfaceRaised}
            borderRadius={tokens.radius.sm}
            borderWidth={1}
            borderColor={tokens.border}
            paddingHorizontal={10}
            height={40}
            gap={8}
          >
            <LuSearch size={16} color={tokens.textMuted} />
            <TextInput
              accessibilityLabel="Search catalog products"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by SKU, product name, fabric..."
              placeholderTextColor={tokens.textMuted}
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: '600',
                color: tokens.text,
                height: '100%',
                paddingVertical: 0,
                outlineStyle: 'none',
              } as any}
            />
            {searchQuery.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search text"
                onPress={() => setSearchQuery('')}
              >
                <LuX size={15} color={tokens.textMuted} />
              </Pressable>
            ) : null}
          </XStack>

          <XStack justifyContent="space-between" alignItems="center" paddingHorizontal={2}>
            <Text fontSize={11} fontWeight="700" color={tokens.textMuted} letterSpacing={0.3}>
              CATALOG PRODUCTS {loading ? '' : `(${products.length})`}
            </Text>
            {loading ? (
              <XStack alignItems="center" gap={6}>
                <Text fontSize={11} fontWeight="600" color={tokens.accent}>
                  Searching catalog...
                </Text>
              </XStack>
            ) : null}
          </XStack>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
            style={{ maxHeight: 360 }}
          >
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <CatalogItemShimmer key={`catalog-shimmer-${i}`} tokens={tokens} />
              ))
            ) : products.length === 0 ? (
              <YStack alignItems="center" justifyContent="center" paddingVertical={40} gap={8}>
                <LuPackage size={32} color={tokens.textMuted} />
                <Text fontSize={13} fontWeight="700" color={tokens.textMuted}>
                  No catalog products found
                </Text>
                <Text fontSize={11} color={tokens.textMuted} textAlign="center">
                  Try searching with SKU (e.g. PRD-10291) or title.
                </Text>
              </YStack>
            ) : (
              products.map((p) => {
                const coverMedia = p.media?.find((m) => m.isDefault) || p.media?.[0];
                const uri = getProductDisplayImageUri(coverMedia);
                const mediaCount = p.media?.length || p.mediaCount || 0;

                return (
                  <Pressable
                    key={p.id || p.productCode}
                    accessibilityRole="button"
                    accessibilityLabel={`Select product ${p.productCode} - ${p.title}`}
                    onPress={() => handleSelectProduct(p)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <XStack
                      backgroundColor={tokens.surface}
                      borderRadius={tokens.radius.sm}
                      borderWidth={1}
                      borderColor={tokens.border}
                      padding={8}
                      alignItems="center"
                      gap={10}
                    >
                      <YStack
                        width={52}
                        height={52}
                        borderRadius={tokens.radius.xs}
                        overflow="hidden"
                        backgroundColor={tokens.surfaceRaised}
                        borderWidth={1}
                        borderColor={tokens.border}
                      >
                        <Image
                          source={{ uri }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
                        />
                      </YStack>

                      <YStack flex={1} gap={2}>
                        <XStack alignItems="center" gap={6}>
                          <YStack
                            backgroundColor={tokens.accentSubtle || 'rgba(168, 85, 247, 0.12)'}
                            paddingHorizontal={5}
                            paddingVertical={2}
                            borderRadius={tokens.radius.xs}
                          >
                            <Text fontSize={10} fontWeight="800" color={tokens.accent}>
                              {p.productCode}
                            </Text>
                          </YStack>
                          {p.vendorPrice ? (
                            <Text fontSize={12} fontWeight="800" color={tokens.text}>
                              ₹{p.vendorPrice}
                            </Text>
                          ) : null}
                          {p.category ? (
                            <Text fontSize={10} color={tokens.textMuted}>
                              • {p.category}
                            </Text>
                          ) : null}
                        </XStack>

                        <Text fontSize={12} fontWeight="700" color={tokens.text} numberOfLines={1}>
                          {p.title}
                        </Text>

                        <XStack alignItems="center" gap={4}>
                          <LuImage size={11} color={tokens.textMuted} />
                          <Text fontSize={10} color={tokens.textMuted}>
                            {mediaCount} PDP {mediaCount === 1 ? 'image' : 'images'}
                          </Text>
                        </XStack>
                      </YStack>

                      <LuChevronRight size={16} color={tokens.textMuted} />
                    </XStack>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </YStack>
      )}
    </BottomSheet>
  );
}

export async function resolveProductTitleFromSku(sku: string): Promise<string | null> {
  const trimmed = sku.trim();
  if (!trimmed) return null;
  const q = trimmed.toLowerCase();
  const match = MOCK_CATALOG_PRODUCTS.find(
    (p) =>
      p.productCode?.toLowerCase() === q ||
      p.productCode?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q)
  );
  return match?.title || null;
}


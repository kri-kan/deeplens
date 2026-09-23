import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ActivityIndicator, Pressable } from 'react-native';
import { YStack, Text } from 'tamagui';
import {
  AdminStoreProductCurationPage,
} from '@/components/tamagui-ui/pages/AdminStoreProductCurationPage';
import {
  StoreCurationMediaItem,
  StoreColorGroup,
} from '@/components/tamagui-ui/organisms/StoreCuration/types';
import { storeAdminService, StoreProductCuration, StoreMediaItem } from '@/services/storeAdminService';
import { useTheme } from '@/theme';

export default function StoreCurationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tokens } = useTheme();

  const [curationData, setCurationData] = useState<StoreProductCuration | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCuration = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await storeAdminService.getProductCuration(id);
      setCurationData(data);
    } catch (err) {
      console.warn('Failed to load curation data from Store.Api:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCuration();
  }, [fetchCuration]);

  const handleSave = async (payload: any) => {
    if (!id) return;
    try {
      const mediaOrderPayload: StoreMediaItem[] = (payload.mediaList || []).map(
        (m: StoreCurationMediaItem, idx: number) => ({
          id: m.id,
          url: m.uri,
          mediaType: m.mediaType === 'video' ? 2 : 1,
          order: m.sortOrder || idx + 1,
          dwellSeconds: m.dwellTimeSeconds || 0,
          isCover: !!m.isHero,
          colorGroupId: m.colorGroupId || null,
          isQualified: m.isQualified !== false,
          isCommon: !!m.isCommon,
          title: m.title,
          originalUrl: m.originalUri || m.uri,
          modifiedUrl: m.modifiedUri || null,
          activeDisplaySource: m.activeDisplaySource || 'original',
          hasModified: !!m.hasModified,
          transformRecipe: m.transformRecipe ? (typeof m.transformRecipe === 'string' ? m.transformRecipe : JSON.stringify(m.transformRecipe)) : null,
        })
      );

      const colorGroupsPayload = payload.colorGroups || [];
      const primaryGroup = colorGroupsPayload[0];

      await storeAdminService.updateProductCuration(id, {
        lifecycleStatus: payload.lifecycleState,
        mrp: payload.mrp,
        salePrice: payload.salePrice,
        description: payload.description,
        swatchTemplate: primaryGroup?.template || 'contrast-border',
        colorwayName: primaryGroup?.name || product?.colorwayName || 'Standard',
        colorHex: primaryGroup?.slotA || product?.colorHex || '#1B4D3E',
        colorGroups: colorGroupsPayload,
        mediaOrder: mediaOrderPayload,
        tags: payload.tags,
      });

      await fetchCuration();
      Alert.alert('Saved', 'Curated swatches and groups saved successfully.');
    } catch (err) {
      console.error('Failed to save curation to Store.Api:', err);
      Alert.alert('Error', 'Failed to save changes to Store.Api.');
    }
  };

  const product = curationData?.product;

  const defaultGroupId = useMemo(() => `cg-${product?.id || id || 'primary'}`, [product?.id, id]);

  const dynamicColorGroups: StoreColorGroup[] = useMemo(() => {
    if (!product) return [];

    // If product has saved colorGroups, restore them!
    if (product.colorGroups && product.colorGroups.length > 0) {
      return product.colorGroups.map((g: any, idx: number) => ({
        id: g.id || `cg-${idx + 1}`,
        name: g.name || `Colorway ${idx + 1}`,
        colorwayCode: g.colorwayCode || `${product.productCode}-COL${idx + 1}`,
        template: g.template || product.swatchTemplate || 'contrast-border',
        slotA: g.slotA || g.colors?.[0] || product.colorHex || '#1B4D3E',
        slotB: g.slotB || g.colors?.[1] || '#D4AF37',
        slotC: g.slotC || g.colors?.[2],
        slotD: g.slotD || g.colors?.[3],
        colors: g.colors || [g.slotA || product.colorHex || '#1B4D3E', g.slotB || '#D4AF37'].filter(Boolean),
        colorCount: g.colorCount || (g.colors?.length) || 2,
        isAvailable: g.isAvailable !== false,
      }));
    }

    const colorHex = product.colorHex || '#1B4D3E';
    const colorName =
      product.colorwayName && product.colorwayName !== 'Standard'
        ? product.colorwayName
        : (product.categoryName ? `${product.categoryName} Colorway` : 'Standard');

    return [
      {
        id: defaultGroupId,
        name: colorName,
        colorwayCode: product.productCode,
        template: (product.swatchTemplate as any) || 'contrast-border',
        slotA: colorHex,
        slotB: '#D4AF37',
        colors: [colorHex, '#D4AF37'],
        colorCount: 2,
        isAvailable: product.lifecycleStatus === 'available' || product.lifecycleStatus === 'few_left',
      },
    ];
  }, [product, defaultGroupId]);

  const mediaList: StoreCurationMediaItem[] = useMemo(() => {
    if (!product?.mediaOrder || product.mediaOrder.length === 0) {
      return [];
    }
    return product.mediaOrder.map((m, idx) => ({
      id: m.id || `m-${idx}`,
      uri: m.url,
      thumbnailUri: m.url,
      mediaType: m.mediaType === 2 ? 'video' : 'image',
      durationSeconds: m.mediaType === 2 ? 15 : undefined,
      sortOrder: m.order || idx + 1,
      isHero: m.isCover || idx === 0,
      isQualified: m.isQualified !== false,
      isCommon: !!m.isCommon,
      originalUri: m.originalUrl || m.url,
      modifiedUri: m.modifiedUrl || null,
      activeDisplaySource: m.activeDisplaySource || (m.hasModified ? 'modified' : 'original'),
      hasModified: !!m.hasModified,
      transformRecipe: m.transformRecipe ? (typeof m.transformRecipe === 'string' ? JSON.parse(m.transformRecipe) : m.transformRecipe) : null,
      // If colorGroupId is assigned, preserve it!
      colorGroupId: m.colorGroupId || (m.isCommon ? undefined : (product.colorGroups && product.colorGroups.length > 0 ? product.colorGroups[0].id : defaultGroupId)),
      dwellTimeSeconds: m.dwellSeconds || 0,
      title: m.title || `${product.title} - View ${idx + 1}`,
    }));
  }, [product, defaultGroupId]);

  if (loading) {
    return (
      <YStack flex={1} backgroundColor={tokens.background} justifyContent="center" alignItems="center" gap={12}>
        <ActivityIndicator size="large" color={tokens.accent} />
        <Text fontSize={13} fontWeight="600" color={tokens.textMuted}>
          Loading product curation...
        </Text>
      </YStack>
    );
  }

  if (!product) {
    return (
      <YStack flex={1} backgroundColor={tokens.background} justifyContent="center" alignItems="center" gap={16} padding={24}>
        <Text fontSize={17} fontWeight="800" color={tokens.text}>
          Product Not Found
        </Text>
        <Text fontSize={13} color={tokens.textMuted} textAlign="center">
          Could not load curation details for product ID: {id}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            paddingHorizontal: 20,
            paddingVertical: 10,
            backgroundColor: tokens.accent,
            borderRadius: tokens.radius.md,
          }}
        >
          <Text fontSize={13} fontWeight="700" color={tokens.accentForeground}>
            Go Back
          </Text>
        </Pressable>
      </YStack>
    );
  }

  const defaultDescription = product.description
    ? product.description
    : `${product.title}${product.fabric ? ` woven in ${product.fabric}` : ''}. Curated with authentic handloom craftsmanship for the Vayyari collection.`;

  return (
    <AdminStoreProductCurationPage
      key={product.id}
      productId={product.id}
      productCode={product.productCode}
      title={product.title}
      fabric={product.fabric || product.categoryName || 'Handloom'}
      baseCostPrice={product.baseCost || 0}
      initialMrp={product.mrp || (product.baseCost ? Math.round(product.baseCost * 1.6) : 9999)}
      initialSalePrice={product.salePrice || (product.baseCost ? Math.round(product.baseCost * 1.3) : 7999)}
      initialLifecycleState={(product.lifecycleStatus as any) || 'available'}
      initialDescription={defaultDescription}
      initialScreen="hub"
      initialMedia={mediaList}
      initialColorGroups={dynamicColorGroups}
      onBack={() => router.back()}
      onSave={handleSave}
    />
  );
}

import React, { useState } from 'react';
import { View, Pressable, StyleSheet, TextInput } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuChevronDown,
  LuChevronUp,
  LuLayers,
  LuClock,
  LuBan,
  LuCheck,
  LuArchive,
  LuTriangleAlert,
  LuRefreshCw,
  LuExternalLink,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { StoreVariantRowDrawer } from './StoreVariantRowDrawer';
import { storeAdminService } from '../../../../../../vayyari/services/storeAdminService';

export interface StoreProductVariant {
  id: string;
  vayyariProductId?: string;
  productCode: string; // e.g. "VF69F501"
  title: string;
  categoryName?: string;
  category?: string;
  fabric?: string;
  baseCost?: number;
  mrp?: number;
  salePrice?: number;
  lifecycleStatus: 'available' | 'few_left' | 'sold_out' | 'out_of_stock' | 'paused' | 'deleted';
  stockQuantity: number;
  colorGroupId?: string | null;
  catalogColorGroupId?: string | null;
  colorwayName: string;
  colorHex: string;
  parentCatalogId?: string | null;
  parentProductCode?: string | null;
  previousLifecycleStatus?: string | null;
  takeDownExpiresAt?: string | null;
  isReEvaluationPending?: boolean;
  waitlistCount?: number;
  heroImageUrl?: string;
  mediaOrder?: any[];
}

export interface StoreUmbrellaProduct {
  parentCatalogId: string;
  parentProductCode: string; // e.g. "VF69F5"
  title: string;
  categoryName: string;
  fabric?: string;
  variants: StoreProductVariant[];
}

export type UmbrellaLifecycleStatus = 'Available' | 'Partially Out of Stock' | 'Out of Stock' | 'Paused' | 'Deleted';

export interface UmbrellaRollup {
  totalCombinedStock: number;
  activeColorwaysCount: number;
  status: UmbrellaLifecycleStatus;
}

/**
 * Computes rollups for total inventory, active colorways count, and catalog lifecycle status.
 */
export function computeUmbrellaRollup(variants: StoreProductVariant[]): UmbrellaRollup {
  if (!variants || variants.length === 0) {
    return {
      totalCombinedStock: 0,
      activeColorwaysCount: 0,
      status: 'Out of Stock',
    };
  }

  const totalCombinedStock = variants.reduce(
    (sum, v) => sum + Math.max(0, v.stockQuantity || 0),
    0
  );

  // Check if all variants are deleted
  const allDeleted = variants.every((v) => v.lifecycleStatus === 'deleted');
  if (allDeleted) {
    return {
      totalCombinedStock,
      activeColorwaysCount: 0,
      status: 'Deleted',
    };
  }

  const nonDeleted = variants.filter((v) => v.lifecycleStatus !== 'deleted');

  // Check if all non-deleted variants are paused
  const allPaused = nonDeleted.length > 0 && nonDeleted.every((v) => v.lifecycleStatus === 'paused');
  if (allPaused) {
    return {
      totalCombinedStock,
      activeColorwaysCount: 0,
      status: 'Paused',
    };
  }

  // Active variants (not deleted and not paused)
  const activeVariants = nonDeleted.filter((v) => v.lifecycleStatus !== 'paused');
  const activeColorwaysCount = activeVariants.length;

  if (activeVariants.length === 0) {
    const anyPaused = variants.some((v) => v.lifecycleStatus === 'paused');
    return {
      totalCombinedStock,
      activeColorwaysCount: 0,
      status: anyPaused ? 'Paused' : 'Out of Stock',
    };
  }

  const inStockActive = activeVariants.filter(
    (v) =>
      (v.lifecycleStatus === 'available' || v.lifecycleStatus === 'few_left') &&
      (v.stockQuantity ?? 0) > 0
  );

  let status: UmbrellaLifecycleStatus;
  if (inStockActive.length === activeVariants.length) {
    status = 'Available';
  } else if (inStockActive.length > 0) {
    status = 'Partially Out of Stock';
  } else {
    status = 'Out of Stock';
  }

  return {
    totalCombinedStock,
    activeColorwaysCount,
    status,
  };
}

export interface StoreUmbrellaProductCardProps {
  product: StoreUmbrellaProduct;
  initiallyExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  onUpdateVariantStock?: (variantId: string, quantity: number) => Promise<void> | void;
  onUpdateVariantStatus?: (variantId: string, status: string) => Promise<void> | void;
  onCascadeLifecycle?: (parentCatalogId: string, status: string, timeoutDays?: number) => Promise<void> | void;
  onViewCatalogSource?: (parentCatalogId: string, colorGroupId?: string) => void;
}

export function StoreUmbrellaProductCard({
  product,
  initiallyExpanded = false,
  onExpandChange,
  onUpdateVariantStock,
  onUpdateVariantStatus,
  onCascadeLifecycle,
  onViewCatalogSource,
}: StoreUmbrellaProductCardProps) {
  let tokens: any;
  try {
    const themeContext = useTheme();
    tokens = themeContext.tokens;
  } catch {
    tokens = {
      primary: '#1B4D3E',
      accent: '#B45309',
      accentForeground: '#FFFFFF',
      accentSubtle: '#FEF3C7',
      text: '#111827',
      textMuted: '#6B7280',
      surface: '#FFFFFF',
      surfaceRaised: '#F9FAFB',
      border: '#E5E7EB',
      radius: { sm: 4, md: 8, full: 9999 },
    };
  }

  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [showTakeDownPicker, setShowTakeDownPicker] = useState(false);
  const [selectedTimeoutDays, setSelectedTimeoutDays] = useState<number>(14);
  const [customDaysInput, setCustomDaysInput] = useState<string>('30');
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const rollup = computeUmbrellaRollup(product.variants);

  const toggleExpand = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    onExpandChange?.(next);
  };

  const handleCascade = async (status: string, timeoutDays?: number) => {
    setShowTakeDownPicker(false);
    try {
      if (onCascadeLifecycle) {
        await onCascadeLifecycle(product.parentCatalogId, status, timeoutDays);
      } else {
        await storeAdminService.updateLifecycleStatus({
          parentCatalogId: product.parentCatalogId,
          status,
          timeoutDays,
        });
      }
      const label = status === 'paused' ? `Paused all variants (${timeoutDays}d)` : `Updated all variants to ${status}`;
      setToastMessage(`✓ ${label}`);
      setTimeout(() => setToastMessage(null), 2500);
    } catch {
      setToastMessage(`Failed to cascade ${status}`);
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  const getStatusBadgeStyle = (status: UmbrellaLifecycleStatus) => {
    switch (status) {
      case 'Available':
        return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' };
      case 'Partially Out of Stock':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      case 'Out of Stock':
        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' };
      case 'Paused':
        return { bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE' };
      case 'Deleted':
        return { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
    }
  };

  const statusStyle = getStatusBadgeStyle(rollup.status);

  return (
    <YStack
      backgroundColor={tokens.surface}
      borderRadius={tokens.radius?.md || 8}
      borderWidth={1}
      borderColor={tokens.border}
      shadowColor="#000"
      shadowOpacity={0.04}
      shadowRadius={4}
      shadowOffset={{ width: 0, height: 2 }}
      marginVertical={6}
    >
      {/* ── CARD HEADER (Clickable to Expand / Collapse) ── */}
      <Pressable onPress={toggleExpand} style={styles.headerPressable}>
        <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={12} padding={14}>
          {/* Left: Parent Code, Title, Category */}
          <XStack alignItems="center" gap={12} flex={1} minWidth={240}>
            {/* Parent Code Pill */}
            <View style={[styles.parentCodeBadge, { backgroundColor: tokens.accentSubtle, borderColor: tokens.accent }]}>
              <Text fontSize={12} fontWeight="900" color={tokens.accent} fontFamily="monospace" letterSpacing={0.5}>
                {product.parentProductCode}
              </Text>
            </View>

            <YStack gap={2} flex={1}>
              <XStack alignItems="center" gap={6} flexWrap="wrap">
                <Text fontSize={14} fontWeight="800" color={tokens.text}>
                  {product.title}
                </Text>
                <View style={[styles.catBadge, { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border }]}>
                  <Text fontSize={10} fontWeight="700" color={tokens.textMuted}>
                    {product.categoryName}
                  </Text>
                </View>
                {product.fabric && (
                  <Text fontSize={11} color={tokens.textMuted}>
                    • {product.fabric}
                  </Text>
                )}
              </XStack>

              {/* Inventory & Active Colorways Metrics */}
              <XStack alignItems="center" gap={12} marginTop={2}>
                <XStack alignItems="center" gap={4}>
                  <LuLayers size={12} color={tokens.accent} />
                  <Text fontSize={11} fontWeight="700" color={tokens.text}>
                    {product.variants.length} Colors ({rollup.activeColorwaysCount} Active)
                  </Text>
                </XStack>

                <XStack alignItems="center" gap={4}>
                  <Text fontSize={11} fontWeight="700" color={tokens.text}>
                    Total Combined Stock:
                  </Text>
                  <Text
                    fontSize={11}
                    fontWeight="800"
                    color={rollup.totalCombinedStock > 0 ? tokens.accent : '#B91C1C'}
                  >
                    {rollup.totalCombinedStock} in stock
                  </Text>
                </XStack>
              </XStack>
            </YStack>
          </XStack>

          {/* Right: Status Pill & Expand Caret */}
          <XStack alignItems="center" gap={10}>
            {/* Status Pill */}
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: statusStyle.bg,
                  borderColor: statusStyle.border,
                },
              ]}
            >
              <Text fontSize={11} fontWeight="800" color={statusStyle.text}>
                {rollup.status}
              </Text>
            </View>

            {/* Chevron toggle */}
            <View style={[styles.caretWrapper, { backgroundColor: tokens.surfaceRaised }]}>
              {isExpanded ? (
                <LuChevronUp size={16} color={tokens.text} />
              ) : (
                <LuChevronDown size={16} color={tokens.text} />
              )}
            </View>
          </XStack>
        </XStack>
      </Pressable>

      {/* ── QUICK CASCADE ACTIONS BAR ── */}
      <XStack
        backgroundColor={tokens.surfaceRaised}
        borderTopWidth={1}
        borderTopColor={tokens.border}
        paddingHorizontal={14}
        paddingVertical={8}
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={8}
      >
        <Text fontSize={10} fontWeight="700" color={tokens.textMuted} textTransform="uppercase" letterSpacing={0.5}>
          Quick Cascade Actions:
        </Text>

        <XStack alignItems="center" gap={8} flexWrap="wrap">
          {/* Take Down All (with timeout picker) */}
          <View style={styles.actionPopoverWrapper}>
            <Pressable
              onPress={() => setShowTakeDownPicker(!showTakeDownPicker)}
              style={({ pressed }) => [
                styles.quickActionBtn,
                {
                  backgroundColor: showTakeDownPicker ? '#FEE2E2' : pressed ? tokens.accentSubtle : tokens.surface,
                  borderColor: showTakeDownPicker ? '#FCA5A5' : tokens.border,
                },
              ]}
            >
              <XStack alignItems="center" gap={4}>
                <LuClock size={12} color="#B45309" />
                <Text fontSize={11} fontWeight="700" color={tokens.text}>
                  Take Down All ▾
                </Text>
              </XStack>
            </Pressable>

            {/* Take Down Timeout Picker Dropdown */}
            {showTakeDownPicker && (
              <View
                style={[
                  styles.takeDownPickerPanel,
                  {
                    backgroundColor: tokens.surface,
                    borderColor: tokens.border,
                  },
                ]}
              >
                <Text fontSize={11} fontWeight="800" color={tokens.text} marginBottom={4}>
                  Temporary Take-Down Timeout:
                </Text>
                <XStack gap={6} flexWrap="wrap" marginBottom={8}>
                  {[7, 14, 30].map((days) => (
                    <Pressable
                      key={days}
                      onPress={() => {
                        setSelectedTimeoutDays(days);
                        setIsCustomDays(false);
                      }}
                      style={[
                        styles.timeoutOptionBtn,
                        {
                          backgroundColor:
                            !isCustomDays && selectedTimeoutDays === days ? tokens.accent : tokens.surfaceRaised,
                          borderColor:
                            !isCustomDays && selectedTimeoutDays === days ? tokens.accent : tokens.border,
                        },
                      ]}
                    >
                      <Text
                        fontSize={10}
                        fontWeight="700"
                        color={!isCustomDays && selectedTimeoutDays === days ? tokens.accentForeground : tokens.text}
                      >
                        {days} Days
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => setIsCustomDays(true)}
                    style={[
                      styles.timeoutOptionBtn,
                      {
                        backgroundColor: isCustomDays ? tokens.accent : tokens.surfaceRaised,
                        borderColor: isCustomDays ? tokens.accent : tokens.border,
                      },
                    ]}
                  >
                    <Text
                      fontSize={10}
                      fontWeight="700"
                      color={isCustomDays ? tokens.accentForeground : tokens.text}
                    >
                      Custom
                    </Text>
                  </Pressable>
                </XStack>

                {isCustomDays && (
                  <XStack alignItems="center" gap={6} marginBottom={8}>
                    <Text fontSize={11} color={tokens.textMuted}>
                      Days:
                    </Text>
                    <TextInput
                      value={customDaysInput}
                      onChangeText={setCustomDaysInput}
                      keyboardType="numeric"
                      style={[styles.customDaysInput, { color: tokens.text, borderColor: tokens.border }]}
                    />
                  </XStack>
                )}

                <Pressable
                  onPress={() => {
                    const days = isCustomDays ? parseInt(customDaysInput, 10) || 7 : selectedTimeoutDays;
                    handleCascade('paused', days);
                  }}
                  style={[styles.confirmTakeDownBtn, { backgroundColor: '#B91C1C' }]}
                >
                  <Text fontSize={11} fontWeight="800" color="#FFFFFF" textAlign="center">
                    Confirm Pause ({isCustomDays ? `${customDaysInput}d` : `${selectedTimeoutDays}d`})
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Mark All Out of Stock */}
          <Pressable
            onPress={() => handleCascade('out_of_stock')}
            style={({ pressed }) => [
              styles.quickActionBtn,
              {
                backgroundColor: pressed ? tokens.accentSubtle : tokens.surface,
                borderColor: tokens.border,
              },
            ]}
          >
            <XStack alignItems="center" gap={4}>
              <LuBan size={12} color="#DC2626" />
              <Text fontSize={11} fontWeight="700" color={tokens.text}>
                Mark All Out of Stock
              </Text>
            </XStack>
          </Pressable>

          {/* Reactivate All */}
          <Pressable
            onPress={() => handleCascade('available')}
            style={({ pressed }) => [
              styles.quickActionBtn,
              {
                backgroundColor: pressed ? tokens.accentSubtle : tokens.surface,
                borderColor: tokens.border,
              },
            ]}
          >
            <XStack alignItems="center" gap={4}>
              <LuCheck size={12} color="#16A34A" />
              <Text fontSize={11} fontWeight="700" color={tokens.text}>
                Reactivate All
              </Text>
            </XStack>
          </Pressable>
        </XStack>
      </XStack>

      {/* Toast Feedback */}
      {toastMessage && (
        <YStack backgroundColor="#DCFCE7" paddingVertical={4} paddingHorizontal={12}>
          <Text fontSize={11} fontWeight="700" color="#15803D">
            {toastMessage}
          </Text>
        </YStack>
      )}

      {/* ── EXPANDABLE VARIANT ROW DRAWER ── */}
      {isExpanded && (
        <StoreVariantRowDrawer
          variants={product.variants}
          parentCatalogId={product.parentCatalogId}
          onUpdateStock={onUpdateVariantStock}
          onUpdateStatus={onUpdateVariantStatus}
          onViewCatalogSource={onViewCatalogSource}
        />
      )}
    </YStack>
  );
}

/**
 * Re-Evaluation Queue Tab: Displays expired paused items awaiting store manager review.
 */
export function StoreReEvaluationQueueTab({
  items = [],
  onReactivate,
  onExtendPause,
  onMarkOutOfStock,
  onRefresh,
}: {
  items: StoreProductVariant[];
  onReactivate?: (productId: string) => Promise<void> | void;
  onExtendPause?: (productId: string, days: number) => Promise<void> | void;
  onMarkOutOfStock?: (productId: string) => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
}) {
  let tokens: any;
  try {
    const themeContext = useTheme();
    tokens = themeContext.tokens;
  } catch {
    tokens = {
      primary: '#1B4D3E',
      accent: '#B45309',
      accentForeground: '#FFFFFF',
      accentSubtle: '#FEF3C7',
      text: '#111827',
      textMuted: '#6B7280',
      surface: '#FFFFFF',
      surfaceRaised: '#F9FAFB',
      border: '#E5E7EB',
      radius: { sm: 4, md: 8, full: 9999 },
    };
  }

  return (
    <YStack backgroundColor={tokens.surface} borderRadius={8} borderWidth={1} borderColor={tokens.border} padding={16} gap={12}>
      <XStack alignItems="center" justifyContent="space-between">
        <YStack gap={2}>
          <XStack alignItems="center" gap={6}>
            <LuTriangleAlert size={16} color="#B91C1C" />
            <Text fontSize={14} fontWeight="800" color={tokens.text}>
              Re-evaluation Queue: Expired Paused Items ({items.length})
            </Text>
          </XStack>
          <Text fontSize={11} color={tokens.textMuted}>
            Products whose temporary take-down timers expired. Review customer restock demand and restore or archive.
          </Text>
        </YStack>

        {onRefresh && (
          <Pressable onPress={onRefresh} style={styles.refreshBtn}>
            <LuRefreshCw size={13} color={tokens.textMuted} />
          </Pressable>
        )}
      </XStack>

      {items.length === 0 ? (
        <YStack padding={24} alignItems="center" gap={6}>
          <LuCheck size={28} color="#16A34A" />
          <Text fontSize={13} fontWeight="700" color={tokens.text}>
            Queue Clear: No Expired Paused Items
          </Text>
          <Text fontSize={11} color={tokens.textMuted}>
            All paused products are within their active timeout windows.
          </Text>
        </YStack>
      ) : (
        items.map((item) => (
          <XStack
            key={item.id}
            backgroundColor={tokens.surfaceRaised}
            borderRadius={8}
            borderWidth={1}
            borderColor={tokens.border}
            padding={12}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={10}
          >
            {/* Left: Swatch + Subcode + Title + Demand */}
            <XStack alignItems="center" gap={10} flex={1} minWidth={240}>
              <View
                accessibilityLabel={item.colorHex}
                aria-label={item.colorHex}
                testID={`swatch-${item.colorHex}`}
                style={[
                  styles.swatchCircle,
                  { backgroundColor: item.colorHex || '#CBD5E1', borderColor: tokens.border },
                ]}
              />

              <YStack gap={2}>
                <XStack alignItems="center" gap={6}>
                  <Text fontSize={12} fontWeight="800" color={tokens.text}>
                    {item.title}
                  </Text>
                  <View style={[styles.subCodeBadge, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
                    <Text fontSize={10} fontWeight="900" color={tokens.accent} fontFamily="monospace">
                      {item.productCode}
                    </Text>
                  </View>
                </XStack>

                <XStack alignItems="center" gap={8}>
                  <Text fontSize={11} color={tokens.textMuted}>
                    Color: {item.colorwayName}
                  </Text>

                  {/* Restock Demand */}
                  {typeof item.waitlistCount === 'number' && item.waitlistCount > 0 && (
                    <View style={[styles.waitlistBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                      <Text fontSize={10} fontWeight="800" color="#B45309">
                        🔥 {item.waitlistCount} Shoppers Waiting
                      </Text>
                    </View>
                  )}

                  <View style={[styles.reEvalBadge, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                    <Text fontSize={10} fontWeight="800" color="#B91C1C">
                      ⚠️ Re-evaluation Expired
                    </Text>
                  </View>
                </XStack>
              </YStack>
            </XStack>

            {/* Right: Actions */}
            <XStack alignItems="center" gap={6}>
              <Pressable
                onPress={() => onReactivate?.(item.id) || storeAdminService.updateLifecycleStatus({ productId: item.id, status: 'available' })}
                style={[styles.queueActionBtn, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}
              >
                <Text fontSize={11} fontWeight="800" color="#15803D">
                  Reactivate
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onExtendPause?.(item.id, 14) || storeAdminService.updateLifecycleStatus({ productId: item.id, status: 'paused', timeoutDays: 14 })}
                style={[styles.queueActionBtn, { backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' }]}
              >
                <Text fontSize={11} fontWeight="700" color="#6D28D9">
                  +14d Extend
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onMarkOutOfStock?.(item.id) || storeAdminService.updateLifecycleStatus({ productId: item.id, status: 'out_of_stock' })}
                style={[styles.queueActionBtn, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
              >
                <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                  Out of Stock
                </Text>
              </Pressable>
            </XStack>
          </XStack>
        ))
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  headerPressable: {
    borderRadius: 8,
  },
  parentCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  caretWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionPopoverWrapper: {
    position: 'relative',
    zIndex: 20,
  },
  takeDownPickerPanel: {
    position: 'absolute',
    top: 30,
    left: 0,
    width: 230,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 100,
    elevation: 6,
  },
  timeoutOptionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  customDaysInput: {
    width: 48,
    paddingVertical: 1,
    paddingHorizontal: 4,
    fontSize: 11,
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  confirmTakeDownBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 4,
  },
  swatchCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
  },
  subCodeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  waitlistBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  reEvalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 6,
  },
  queueActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
});

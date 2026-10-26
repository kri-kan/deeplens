import React, { useState } from 'react';
import { View, Pressable, StyleSheet, TextInput } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import {
  LuExternalLink,
  LuClock,
  LuTriangleAlert,
  LuCheck,
  LuArchive,
  LuBan,
} from 'react-icons/lu';
import { useTheme } from '../../../theme';
import { StoreProductVariant } from './StoreUmbrellaProductCard';
import { storeAdminService } from '../../../../../../vayyari/services/storeAdminService';

export interface StoreVariantRowDrawerProps {
  variants: StoreProductVariant[];
  parentCatalogId: string;
  onUpdateStock?: (variantId: string, quantity: number) => Promise<void> | void;
  onUpdateStatus?: (variantId: string, status: string) => Promise<void> | void;
  onViewCatalogSource?: (parentCatalogId: string, colorGroupId?: string) => void;
}

const LIFECYCLE_OPTIONS: { id: StoreProductVariant['lifecycleStatus']; label: string; icon: string }[] = [
  { id: 'available', label: 'Available', icon: '🟢' },
  { id: 'out_of_stock', label: 'Out of Stock', icon: '⚫' },
  { id: 'paused', label: 'Paused', icon: '⏳' },
  { id: 'deleted', label: 'Deleted', icon: '🗑️' },
];

export function StoreVariantRowDrawer({
  variants = [],
  parentCatalogId,
  onUpdateStock,
  onUpdateStatus,
  onViewCatalogSource,
}: StoreVariantRowDrawerProps) {
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

  // Local state for stock inputs
  const [stockInputs, setStockInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const v of variants) {
      initial[v.id] = String(v.stockQuantity ?? 0);
    }
    return initial;
  });

  const [openStatusPickerVariantId, setOpenStatusPickerVariantId] = useState<string | null>(null);
  const [savingStockVariantId, setSavingStockVariantId] = useState<string | null>(null);

  const handleStockBlur = async (variantId: string) => {
    const rawVal = stockInputs[variantId];
    const qty = Math.max(0, parseInt(rawVal, 10) || 0);
    setStockInputs((prev) => ({ ...prev, [variantId]: String(qty) }));
    setSavingStockVariantId(variantId);
    try {
      if (onUpdateStock) {
        await onUpdateStock(variantId, qty);
      } else {
        await storeAdminService.updateVariantStock(variantId, qty);
      }
    } finally {
      setTimeout(() => setSavingStockVariantId(null), 1000);
    }
  };

  const handleStatusChange = async (variantId: string, newStatus: string) => {
    setOpenStatusPickerVariantId(null);
    if (onUpdateStatus) {
      await onUpdateStatus(variantId, newStatus);
    } else {
      await storeAdminService.updateLifecycleStatus({
        productId: variantId,
        status: newStatus,
      });
    }
  };

  const calculateDaysRemaining = (expiresAtStr?: string | null): number | null => {
    if (!expiresAtStr) return null;
    const diff = new Date(expiresAtStr).getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (variants.length === 0) {
    return (
      <YStack padding={16} alignItems="center" backgroundColor={tokens.surfaceRaised}>
        <Text fontSize={12} color={tokens.textMuted}>
          No color variants registered under this umbrella.
        </Text>
      </YStack>
    );
  }

  return (
    <YStack
      backgroundColor={tokens.surfaceRaised}
      borderBottomLeftRadius={tokens.radius?.md || 8}
      borderBottomRightRadius={tokens.radius?.md || 8}
      borderTopWidth={1}
      borderTopColor={tokens.border}
      paddingVertical={8}
      paddingHorizontal={14}
      gap={10}
    >
      <XStack alignItems="center" justifyContent="space-between" paddingBottom={4}>
        <Text fontSize={11} fontWeight="700" color={tokens.textMuted} letterSpacing={0.8} textTransform="uppercase">
          Color Variants &amp; Inventory Breakdown ({variants.length})
        </Text>
        <Text fontSize={10} color={tokens.textMuted}>
          Individual Swatch Controls &amp; Restock Signals
        </Text>
      </XStack>

      {variants.map((v) => {
        const remainingDays = calculateDaysRemaining(v.takeDownExpiresAt);
        const isPaused = v.lifecycleStatus === 'paused';
        const isExpiredOrPending = v.isReEvaluationPending || (isPaused && remainingDays === 0);
        const isPickerOpen = openStatusPickerVariantId === v.id;
        const currentInputValue = stockInputs[v.id] ?? String(v.stockQuantity ?? 0);

        return (
          <YStack
            key={v.id}
            backgroundColor={tokens.surface}
            borderRadius={8}
            borderWidth={1}
            borderColor={tokens.border}
            padding={10}
            gap={8}
          >
            <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={8}>
              {/* Left: Swatch circle + Colorway + Subcode */}
              <XStack alignItems="center" gap={10} flex={1} minWidth={220}>
                {/* Swatch circle */}
                <View
                  accessibilityLabel={v.colorHex}
                  aria-label={v.colorHex}
                  testID={`swatch-${v.colorHex}`}
                  style={[
                    styles.swatchCircle,
                    {
                      backgroundColor: v.colorHex || '#CBD5E1',
                      borderColor: tokens.border,
                    },
                  ]}
                />

                <YStack gap={2}>
                  <XStack alignItems="center" gap={6} flexWrap="wrap">
                    <Text fontSize={13} fontWeight="700" color={tokens.text}>
                      {v.colorwayName || 'Unnamed Colorway'}
                    </Text>
                    <View style={[styles.subCodeBadge, { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border }]}>
                      <Text fontSize={10} fontWeight="800" color={tokens.accent} fontFamily="monospace">
                        {v.productCode}
                      </Text>
                    </View>
                  </XStack>

                  {/* Badges: Waitlist demand + Pause/Re-evaluation status */}
                  <XStack alignItems="center" gap={6} flexWrap="wrap">
                    {/* Waitlist Demand Badge */}
                    {typeof v.waitlistCount === 'number' && v.waitlistCount > 0 ? (
                      <View style={[styles.waitlistBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                        <Text fontSize={10} fontWeight="800" color="#B45309">
                          🔥 {v.waitlistCount} waiting
                        </Text>
                      </View>
                    ) : null}

                    {/* Paused / Re-eval timer badge */}
                    {isPaused ? (
                      isExpiredOrPending ? (
                        <View style={[styles.reEvalBadge, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                          <XStack alignItems="center" gap={3}>
                            <LuTriangleAlert size={10} color="#B91C1C" />
                            <Text fontSize={10} fontWeight="800" color="#B91C1C">
                              ⚠️ Re-eval Pending
                            </Text>
                          </XStack>
                        </View>
                      ) : (
                        <View style={[styles.pauseBadge, { backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' }]}>
                          <XStack alignItems="center" gap={3}>
                            <LuClock size={10} color="#6D28D9" />
                            <Text fontSize={10} fontWeight="700" color="#6D28D9">
                              ⏳ Paused {remainingDays !== null ? `(${remainingDays}d left)` : ''}
                            </Text>
                          </XStack>
                        </View>
                      )
                    ) : null}

                    {v.lifecycleStatus === 'deleted' && (
                      <View style={[styles.deletedBadge, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
                        <Text fontSize={10} fontWeight="700" color="#64748B">
                          🗑️ Deleted
                        </Text>
                      </View>
                    )}
                  </XStack>
                </YStack>
              </XStack>

              {/* Right: Inline Stock Input + Lifecycle Status Dropdown + Catalog Link */}
              <XStack alignItems="center" gap={10} flexWrap="wrap">
                {/* Inline Stock Quantity Editor */}
                <XStack alignItems="center" gap={4} backgroundColor={tokens.surfaceRaised} paddingHorizontal={8} paddingVertical={4} borderRadius={6} borderWidth={1} borderColor={tokens.border}>
                  <Text fontSize={11} fontWeight="700" color={tokens.textMuted}>
                    Stock:
                  </Text>
                  <TextInput
                    value={currentInputValue}
                    onChangeText={(txt) => setStockInputs((prev) => ({ ...prev, [v.id]: txt }))}
                    onBlur={() => handleStockBlur(v.id)}
                    keyboardType="numeric"
                    style={[
                      styles.stockInput,
                      {
                        color: tokens.text,
                        borderColor: tokens.border,
                      },
                    ]}
                  />
                  {savingStockVariantId === v.id && (
                    <LuCheck size={12} color="#16A34A" />
                  )}
                </XStack>

                {/* Lifecycle Status Selector */}
                <View style={styles.selectorWrapper}>
                  <Pressable
                    onPress={() => setOpenStatusPickerVariantId(isPickerOpen ? null : v.id)}
                    style={[
                      styles.statusSelectButton,
                      {
                        backgroundColor: tokens.surfaceRaised,
                        borderColor: tokens.border,
                      },
                    ]}
                  >
                    <Text fontSize={11} fontWeight="700" color={tokens.text}>
                      {LIFECYCLE_OPTIONS.find((o) => o.id === v.lifecycleStatus)?.icon || '⚪'}{' '}
                      {LIFECYCLE_OPTIONS.find((o) => o.id === v.lifecycleStatus)?.label || v.lifecycleStatus}
                    </Text>
                  </Pressable>

                  {/* Popover options list */}
                  {isPickerOpen && (
                    <View
                      style={[
                        styles.statusPickerDropdown,
                        {
                          backgroundColor: tokens.surface,
                          borderColor: tokens.border,
                          shadowColor: '#000',
                        },
                      ]}
                    >
                      {LIFECYCLE_OPTIONS.map((opt) => (
                        <Pressable
                          key={opt.id}
                          onPress={() => handleStatusChange(v.id, opt.id)}
                          style={({ pressed }) => [
                            styles.statusPickerItem,
                            {
                              backgroundColor: pressed
                                ? tokens.accentSubtle
                                : v.lifecycleStatus === opt.id
                                ? tokens.surfaceRaised
                                : 'transparent',
                            },
                          ]}
                        >
                          <Text fontSize={11} fontWeight={v.lifecycleStatus === opt.id ? '800' : '500'} color={tokens.text}>
                            {opt.icon} {opt.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                {/* View Source in Catalog Link */}
                <Pressable
                  onPress={() => onViewCatalogSource?.(v.parentCatalogId || parentCatalogId, v.catalogColorGroupId || v.colorGroupId || undefined)}
                  hitSlop={4}
                  style={({ pressed }) => [
                    styles.catalogSourceBtn,
                    {
                      backgroundColor: pressed ? tokens.accentSubtle : 'transparent',
                      borderColor: tokens.border,
                    },
                  ]}
                >
                  <XStack alignItems="center" gap={4}>
                    <LuExternalLink size={12} color={tokens.accent} />
                    <Text fontSize={11} fontWeight="700" color={tokens.accent}>
                      View Source in Catalog
                    </Text>
                  </XStack>
                </Pressable>
              </XStack>
            </XStack>
          </YStack>
        );
      })}
    </YStack>
  );
}

const styles = StyleSheet.create({
  swatchCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
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
  pauseBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  deletedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  stockInput: {
    width: 44,
    paddingVertical: 1,
    paddingHorizontal: 4,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  selectorWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  statusSelectButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPickerDropdown: {
    position: 'absolute',
    top: 28,
    right: 0,
    minWidth: 130,
    borderRadius: 6,
    borderWidth: 1,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 100,
    elevation: 5,
    overflow: 'hidden',
  },
  statusPickerItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  catalogSourceBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
});

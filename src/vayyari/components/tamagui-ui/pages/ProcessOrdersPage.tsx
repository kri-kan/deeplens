import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { searchApiClient } from '@/api/client';
import { useTheme } from '@/theme';
import { OrderGroup } from '@/types/orders';
import {
  LuArrowLeft,
  LuSearch,
  LuX,
  LuRefreshCw,
  LuInbox,
  LuChevronRight,
  LuPackage,
} from '../icons/lu';
import { StatusBadge, StatusIntent } from '../atoms/StatusBadge';
import { CapsuleSegmentControl } from '../atoms/CapsuleSegmentControl';

import {
  ProcessStage,
  STAGES,
  getStatusIntent,
  stageRank,
  leastStage,
  statusToTab,
} from '@/utils/processOrderRules';

export {
  ProcessStage,
  STAGES,
  stageRank,
  leastStage,
  statusToTab,
};

export type ViewMode = 'groups' | 'orders';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────
export interface ProcessOrdersPageProps {
  disableSafeArea?: boolean;
  onBack?: () => void;
}

interface OrderContainer {
  orderId: string;
  groups: OrderGroup[];
  leastStage: string;
  leastTab: ProcessStage;
  customerName?: string;
  customerPhone?: string;
  paymentMode?: string;
  createdAt?: string;
}

// No mock data in production — live data only
const MOCK_GROUPS: OrderGroup[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function ProcessOrdersPage({ disableSafeArea = false, onBack }: ProcessOrdersPageProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeStage, setActiveStage] = useState<ProcessStage>('unconfirmed');
  const [viewMode, setViewMode] = useState<ViewMode>('groups');
  const [allGroups, setAllGroups] = useState<OrderGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ─── Data fetching ───────────────────────────────────────────────────────
  const fetchAllGroups = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      // Fetch across all relevant stages in parallel
      const stages = ['unconfirmed', 'confirmed', 'processed', 'placed', 'delivered'];
      const results = await Promise.allSettled(
        stages.map((stage) =>
          searchApiClient.get<OrderGroup[]>(`/api/v1/orderid/groups/processing`, {
            params: { stage },
          })
        )
      );

      const merged: OrderGroup[] = [];
      results.forEach((res) => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          merged.push(...res.value);
        }
      });

      // Deduplicate by orderGrpId
      const seen = new Set<string>();
      setAllGroups(merged.filter((g) => {
        if (seen.has(g.orderGrpId)) return false;
        seen.add(g.orderGrpId);
        return true;
      }));
    } catch {
      setAllGroups([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllGroups();
  }, [fetchAllGroups]);

  // ─── Navigation ──────────────────────────────────────────────────────────
  const openEditOrder = (orderId: string) => {
    router.push(`/utilities/order-details/${orderId}` as any);
  };

  const openEditGroup = (orderId: string, groupKey: string) => {
    router.push(`/utilities/order-group?orderId=${orderId}&groupKey=${encodeURIComponent(groupKey)}` as any);
  };

  // ─── Derived: groups for current tab ─────────────────────────────────────
  const filteredGroups = useMemo(() => {
    const tabGroups = allGroups.filter(
      (g) => statusToTab(g.status, g.updatedAt, g.createdAt) === activeStage
    );
    if (!searchQuery.trim()) return tabGroups;
    const q = searchQuery.toLowerCase().trim();
    return tabGroups.filter(
      (g) =>
        g.orderGrpId.toLowerCase().includes(q) ||
        g.orderId.toLowerCase().includes(q) ||
        (g.vendorName && g.vendorName.toLowerCase().includes(q)) ||
        (g.customerName && g.customerName.toLowerCase().includes(q)) ||
        (g.awbNumber && g.awbNumber.toLowerCase().includes(q))
    );
  }, [allGroups, activeStage, searchQuery]);

  // ─── Derived: orders view (group by orderId, categorise by least stage) ──
  const orderContainers = useMemo<OrderContainer[]>(() => {
    const map = new Map<string, OrderGroup[]>();
    allGroups.forEach((g) => {
      if (!map.has(g.orderId)) map.set(g.orderId, []);
      map.get(g.orderId)!.push(g);
    });

    return Array.from(map.entries())
      .map(([orderId, groups]) => {
        const first = groups[0];
        const ls = leastStage(groups);
        const lt = statusToTab(ls, first.updatedAt, first.createdAt);
        return {
          orderId,
          groups,
          leastStage: ls,
          leastTab: lt,
          customerName: first.customerName,
          customerPhone: first.customerPhone,
          paymentMode: first.paymentMode,
          createdAt: first.createdAt,
        } as OrderContainer;
      })
      .filter((oc) => {
        if (oc.leastTab !== activeStage) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          oc.orderId.toLowerCase().includes(q) ||
          (oc.customerName && oc.customerName.toLowerCase().includes(q)) ||
          oc.groups.some(
            (g) =>
              g.vendorName?.toLowerCase().includes(q) ||
              g.orderGrpId.toLowerCase().includes(q) ||
              g.awbNumber?.toLowerCase().includes(q)
          )
        );
      })
      .sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return tb - ta;
      });
  }, [allGroups, activeStage, searchQuery]);

  // ─── Count badges per tab ─────────────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const counts: Record<ProcessStage, number> = {
      unconfirmed: 0,
      confirmed: 0,
      placed: 0,
      delivered: 0,
      archived: 0,
    };
    if (viewMode === 'groups') {
      allGroups.forEach((g) => {
        const t = statusToTab(g.status, g.updatedAt, g.createdAt);
        counts[t]++;
      });
    } else {
      const map = new Map<string, OrderGroup>();
      allGroups.forEach((g) => {
        const existing = map.get(g.orderId);
        if (!existing || stageRank(g.status) < stageRank(existing.status)) {
          map.set(g.orderId, g);
        }
      });
      map.forEach((g) => {
        counts[statusToTab(g.status, g.updatedAt, g.createdAt)]++;
      });
    }
    return counts;
  }, [allGroups, viewMode]);

  // ─────────────────────────────────────────────────────────────────────────
  // Sub-components
  // ─────────────────────────────────────────────────────────────────────────

  /** A lean vendor group card that matches the Edit Order ProductListSection style */
  /** A lean vendor group card that matches the Edit Order ProductListSection style */
  const ItemGroupCard = ({ group }: { group: OrderGroup }) => {
    const itemCount = (group.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
    const total = (group.items || []).reduce((s, i) => s + (i.subtotal || i.unitPrice || 0), 0);
    const isUnassigned = !group.vendorName || group.vendorName.toLowerCase() === 'unassigned';

    return (
      <YStack
        backgroundColor={tokens.surface}
        borderWidth={1}
        borderColor={tokens.border}
        borderRadius={0}
        overflow="hidden"
        marginBottom={8}
      >
        {/* Group Header — mirrors ProductListSection vendor header */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open package group for ${isUnassigned ? 'Unassigned' : group.vendorName}`}
          onPress={() => openEditGroup(group.orderId, group.orderGrpId || group.vendorName || '')}
          style={({ pressed }) => ({
            backgroundColor: pressed ? `${tokens.surfaceRaised}D0` : tokens.surfaceRaised,
            flexDirection: 'row',
            alignItems: 'stretch',
            borderBottomWidth: 1,
            borderBottomColor: tokens.border,
          })}
        >
          {/* Left: Vendor Icon + Name + Subtitle + Status Badge */}
          <XStack
            flex={1}
            paddingLeft={12}
            paddingRight={10}
            paddingVertical={10}
            alignItems="center"
            justifyContent="space-between"
            gap={8}
          >
            <XStack alignItems="center" gap={8} flex={1}>
              <YStack gap={2} flex={1}>
                <XStack alignItems="center" gap={6} flexWrap="wrap">
                  <Text fontSize={13} fontWeight="800" color={tokens.text} numberOfLines={1}>
                    {isUnassigned ? 'Unassigned' : group.vendorName}
                  </Text>
                  {/* Status Badge beside Vendor Name */}
                  <StatusBadge
                    label={group.status ? group.status.toUpperCase() : 'UNCONFIRMED'}
                    intent={getStatusIntent(group.status)}
                    size="sm"
                  />
                  {/* Order ID badge */}
                  <YStack
                    paddingHorizontal={5}
                    paddingVertical={2}
                    borderRadius={4}
                    backgroundColor={`${tokens.accent}15`}
                  >
                    <Text fontSize={9} fontWeight="800" color={tokens.accent}>
                      {group.orderId}
                    </Text>
                  </YStack>
                </XStack>
                <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} :{' '}
                  <Text fontWeight="800" color={tokens.text}>
                    ₹{total.toLocaleString('en-IN')}
                  </Text>
                </Text>
              </YStack>
            </XStack>

            {/* Payment mode badge */}
            {group.paymentMode && (
              <XStack alignItems="center">
                <YStack
                  paddingHorizontal={5}
                  paddingVertical={2}
                  borderRadius={4}
                  backgroundColor={
                    group.paymentMode.toUpperCase() === 'COD'
                      ? `${tokens.warning}1F`
                      : `${tokens.success}1F`
                  }
                >
                  <Text
                    fontSize={9}
                    fontWeight="800"
                    color={
                      group.paymentMode.toUpperCase() === 'COD' ? tokens.warning : tokens.success
                    }
                  >
                    {group.paymentMode.toUpperCase()}
                  </Text>
                </YStack>
              </XStack>
            )}
          </XStack>

          {/* Full-bleed blue chevron button — opens edit group */}
          <YStack
            width={44}
            alignSelf="stretch"
            backgroundColor="#2563EB"
            borderLeftWidth={1}
            borderLeftColor={tokens.border}
            alignItems="center"
            justifyContent="center"
          >
            <LuChevronRight size={18} color="#FFFFFF" />
          </YStack>
        </Pressable>

        {/* Items list — mirrors Edit Order item rows */}
        <YStack padding={10} gap={8}>
          {(group.items || []).map((item, idx) => {
            const photo = (item as any).photoUri || (item as any).catalogImageUrl || (item as any).imageUrl;
            return (
              <XStack
                key={item.itemId || idx}
                gap={10}
                alignItems="center"
              >
                {/* Thumbnail */}
                <YStack
                  width={52}
                  height={60}
                  borderRadius={tokens.radius.sm}
                  backgroundColor={`${tokens.accent}18`}
                  overflow="hidden"
                  borderWidth={1}
                  borderColor={tokens.border}
                  alignItems="center"
                  justifyContent="center"
                >
                  {photo ? (
                    <Image
                      source={{ uri: photo }}
                      style={{ width: '100%', height: '100%', position: 'absolute' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <LuPackage size={22} color={tokens.accent} />
                  )}
                </YStack>

                {/* Details */}
                <YStack flex={1} gap={2}>
                  <Text fontSize={12} fontWeight="700" color={tokens.text} numberOfLines={1}>
                    {item.productTitle || 'Product Item'}
                  </Text>
                  <Text fontSize={10} color={tokens.accent} fontWeight="600">
                    {item.itemId || `${group.orderGrpId}-I${idx + 1}`}
                  </Text>
                  <XStack alignItems="center" gap={6} marginTop={2}>
                    <YStack
                      height={20}
                      paddingHorizontal={6}
                      borderRadius={4}
                      borderWidth={1}
                      borderColor={tokens.border}
                      backgroundColor={tokens.surfaceRaised}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text fontSize={10} fontWeight="700" color={tokens.text}>
                        Qty: {item.quantity || 1}
                      </Text>
                    </YStack>
                    {(item as any).size && (
                      <YStack
                        height={20}
                        paddingHorizontal={6}
                        borderRadius={4}
                        borderWidth={1}
                        borderColor={tokens.border}
                        backgroundColor={tokens.surfaceRaised}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text fontSize={10} fontWeight="700" color={tokens.text}>
                          {(item as any).size}
                        </Text>
                      </YStack>
                    )}
                  </XStack>
                </YStack>

                {/* Price */}
                <YStack alignItems="flex-end">
                  <Text fontSize={13} fontWeight="800" color={tokens.text}>
                    ₹{(item.subtotal || item.unitPrice || 0).toLocaleString('en-IN')}
                  </Text>
                </YStack>
              </XStack>
            );
          })}
        </YStack>
      </YStack>
    );
  };

  /** Lean group card inside an order container for Orders view */
  const LeanGroupCard = ({ group }: { group: OrderGroup }) => {
    const itemCount = (group.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
    const total = (group.items || []).reduce((s, i) => s + (i.subtotal || i.unitPrice || 0), 0);
    const isUnassigned = !group.vendorName || group.vendorName.toLowerCase() === 'unassigned';

    return (
      <Pressable
        onPress={() => openEditGroup(group.orderId, group.orderGrpId || group.vendorName || '')}
        accessibilityRole="button"
        accessibilityLabel={`Open group ${group.orderGrpId} for ${isUnassigned ? 'Unassigned' : group.vendorName}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'stretch',
          backgroundColor: pressed ? `${tokens.surfaceRaised}D0` : tokens.surfaceRaised,
          borderTopWidth: 1,
          borderTopColor: tokens.border,
        })}
      >
        <XStack
          flex={1}
          paddingLeft={12}
          paddingRight={12}
          paddingVertical={10}
          alignItems="center"
          justifyContent="space-between"
          gap={8}
        >
          <XStack alignItems="center" gap={8} flex={1}>
            <YStack flex={1} gap={2}>
              <XStack alignItems="center" gap={6} flexWrap="wrap">
                <Text fontSize={12.5} fontWeight="800" color={tokens.text} numberOfLines={1}>
                  {isUnassigned ? 'Unassigned' : group.vendorName}
                </Text>
                <StatusBadge
                  label={group.status ? group.status.toUpperCase() : 'UNCONFIRMED'}
                  intent={getStatusIntent(group.status)}
                  size="sm"
                />
              </XStack>
              <Text fontSize={10} color={tokens.textMuted} fontWeight="600">
                {group.orderGrpId} · {itemCount} {itemCount === 1 ? 'item' : 'items'} ·{' '}
                <Text fontWeight="800" color={tokens.textSecondary}>
                  ₹{total.toLocaleString('en-IN')}
                </Text>
              </Text>
              {group.awbNumber && (
                <Text fontSize={9} color={tokens.success} fontWeight="700" marginTop={1}>
                  AWB: {group.awbNumber}
                </Text>
              )}
            </YStack>
          </XStack>

          {/* Larger Group Chevron */}
          <XStack alignItems="center" paddingRight={4}>
            <LuChevronRight size={20} color={tokens.text} />
          </XStack>
        </XStack>
      </Pressable>
    );
  };

  /** Order container with lean group cards inside */
  const OrderCard = ({ oc }: { oc: OrderContainer }) => (
    <YStack
      backgroundColor={tokens.surface}
      borderWidth={1}
      borderColor={tokens.border}
      borderRadius={0}
      overflow="hidden"
      marginBottom={8}
    >
      {/* Order header with full-bleed blue action button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit order ${oc.orderId}`}
        onPress={() => openEditOrder(oc.orderId)}
        style={({ pressed }) => ({
          backgroundColor: pressed ? `${tokens.surfaceRaised}D0` : tokens.surfaceRaised,
          flexDirection: 'row',
          alignItems: 'stretch',
        })}
      >
        <XStack
          flex={1}
          paddingHorizontal={12}
          paddingVertical={10}
          alignItems="center"
          justifyContent="space-between"
        >
          <YStack gap={2}>
            <XStack alignItems="center" gap={6}>
              <Text fontSize={14} fontWeight="800" color={tokens.text}>
                {oc.orderId}
              </Text>
              {oc.paymentMode && (
                <YStack
                  paddingHorizontal={5}
                  paddingVertical={2}
                  borderRadius={4}
                  backgroundColor={
                    oc.paymentMode.toUpperCase() === 'COD'
                      ? `${tokens.warning}1F`
                      : `${tokens.success}1F`
                  }
                >
                  <Text
                    fontSize={9}
                    fontWeight="800"
                    color={
                      oc.paymentMode.toUpperCase() === 'COD' ? tokens.warning : tokens.success
                    }
                  >
                    {oc.paymentMode.toUpperCase()}
                  </Text>
                </YStack>
              )}
            </XStack>
            {oc.customerName && (
              <Text fontSize={11} color={tokens.textMuted} fontWeight="600">
                {oc.customerName}{oc.customerPhone ? ` · ${oc.customerPhone}` : ''}
              </Text>
            )}
          </YStack>
        </XStack>

        {/* Order-level full-bleed blue action button */}
        <YStack
          width={44}
          alignSelf="stretch"
          backgroundColor="#2563EB"
          borderLeftWidth={1}
          borderLeftColor={tokens.border}
          alignItems="center"
          justifyContent="center"
        >
          <LuChevronRight size={18} color="#FFFFFF" />
        </YStack>
      </Pressable>

      {/* Lean cards per group */}
      {oc.groups.map((g) => (
        <LeanGroupCard key={g.orderGrpId} group={g} />
      ))}
    </YStack>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  const isEmpty = viewMode === 'groups'
    ? filteredGroups.length === 0
    : orderContainers.length === 0;

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* ── Top Header ── */}
      {!disableSafeArea && (
        <YStack
          paddingTop={insets.top + 8}
          paddingHorizontal={8}
          paddingBottom={10}
          backgroundColor={tokens.surface}
          borderBottomWidth={1}
          borderBottomColor={tokens.border}
        >
          {/* Title Row */}
          <XStack alignItems="center" justifyContent="space-between" marginBottom={10}>
            <XStack alignItems="center" gap={12}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => (onBack ? onBack() : router.back())}
                hitSlop={12}
              >
                <LuArrowLeft size={24} color={tokens.text} />
              </Pressable>
              <Text fontSize={20} fontWeight="800" color={tokens.text}>
                Process Orders
              </Text>
            </XStack>
            <XStack alignItems="center" gap={10}>
              {/* View Mode Toggle */}
              <CapsuleSegmentControl<ViewMode>
                options={[
                  { value: 'groups', label: 'Groups' },
                  { value: 'orders', label: 'Orders' },
                ]}
                value={viewMode}
                onChange={(val) => val && setViewMode(val)}
                accessibilityLabel="Select view mode"
              />

              {/* Refresh */}
              <Pressable onPress={() => fetchAllGroups(true)} hitSlop={8}>
                <LuRefreshCw
                  size={18}
                  color={isRefreshing ? tokens.accent : tokens.textMuted}
                />
              </Pressable>
            </XStack>
          </XStack>

          {/* Scrollable Stage Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
          >
            {STAGES.map(({ key, label }) => {
              const isActive = activeStage === key;
              const count = tabCounts[key];
              return (
                <Pressable key={key} onPress={() => setActiveStage(key)}>
                  <XStack
                    alignItems="center"
                    gap={6}
                    paddingHorizontal={12}
                    paddingVertical={6}
                    borderRadius={tokens.radius.full}
                    backgroundColor={isActive ? tokens.accent : tokens.surfaceRaised}
                    borderWidth={1}
                    borderColor={isActive ? tokens.accent : tokens.border}
                  >
                    <Text
                      fontSize={12}
                      fontWeight={isActive ? '800' : '600'}
                      color={isActive ? '#FFFFFF' : tokens.text}
                    >
                      {label}
                    </Text>
                    <YStack
                      paddingHorizontal={6}
                      paddingVertical={1}
                      borderRadius={tokens.radius.full}
                      backgroundColor={
                        isActive ? 'rgba(255, 255, 255, 0.25)' : `${tokens.textMuted}20`
                      }
                    >
                      <Text
                        fontSize={10}
                        fontWeight="800"
                        color={isActive ? '#FFFFFF' : tokens.textMuted}
                      >
                        {count}
                      </Text>
                    </YStack>
                  </XStack>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Search Bar */}
          <XStack
            marginTop={10}
            alignItems="center"
            backgroundColor={tokens.surfaceRaised}
            borderRadius={tokens.radius.md}
            paddingHorizontal={10}
            height={40}
          >
            <LuSearch size={16} color={tokens.textMuted} />
            <TextInput
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 13,
                color: tokens.text,
                paddingVertical: 0,
              }}
              placeholder="Search order ID, vendor, customer, AWB…"
              placeholderTextColor={tokens.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <LuX size={14} color={tokens.textMuted} />
              </Pressable>
            )}
          </XStack>
        </YStack>
      )}

      {/* ── Main List ── */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 8,
          paddingTop: 8,
          paddingBottom: insets.bottom + 40,
        }}
      >
        {isLoading ? (
          <YStack alignItems="center" justifyContent="center" paddingVertical={60}>
            <ActivityIndicator size="large" color={tokens.accent} />
            <Text marginTop={12} fontSize={14} color={tokens.textMuted}>
              Loading order groups…
            </Text>
          </YStack>
        ) : isEmpty ? (
          <YStack
            alignItems="center"
            justifyContent="center"
            paddingVertical={60}
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.lg}
            padding={24}
          >
            <LuInbox size={48} color={tokens.textMuted} />
            <Text fontSize={16} fontWeight="700" color={tokens.text} marginTop={12}>
              No {viewMode === 'groups' ? 'Groups' : 'Orders'} Found
            </Text>
            <Text
              fontSize={13}
              color={tokens.textMuted}
              textAlign="center"
              marginTop={4}
            >
              No {viewMode === 'groups' ? 'order groups' : 'orders'} in the{' '}
              {STAGES.find((s) => s.key === activeStage)?.label} stage.
            </Text>
          </YStack>
        ) : viewMode === 'groups' ? (
          filteredGroups.map((group) => (
            <ItemGroupCard key={group.orderGrpId} group={group} />
          ))
        ) : (
          orderContainers.map((oc) => (
            <OrderCard key={oc.orderId} oc={oc} />
          ))
        )}
      </ScrollView>
    </YStack>
  );
}

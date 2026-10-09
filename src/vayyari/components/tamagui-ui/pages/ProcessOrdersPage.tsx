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
  LuBuilding2,
  LuChevronRight,
  LuPackage,
} from '../icons/lu';
import { StatusBadge, StatusIntent } from '../atoms/StatusBadge';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type ProcessStage = 'confirmed' | 'processed' | 'placed' | 'delivered' | 'archived';
export type ViewMode = 'groups' | 'orders';

const STAGE_RANK: Record<string, number> = {
  unconfirmed: 0,
  confirmed: 1,
  processed: 2,
  processing: 2,
  placed: 3,
  dispatched: 3,
  delivered: 4,
  archived: 5,
};

/** Delivered groups older than this are treated as archived (client-side). */
const ARCHIVE_THRESHOLD_MS = 10 * 24 * 60 * 60 * 1000; // 10 days

const STAGES: { key: ProcessStage; label: string }[] = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processed', label: 'Processed' },
  { key: 'placed', label: 'Placed' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'archived', label: 'Archived' },
];

function getStatusIntent(stage: string): StatusIntent {
  const s = (stage || '').toLowerCase();
  if (s === 'archived') return 'attention';
  if (s === 'delivered') return 'positive';
  if (s === 'placed' || s === 'dispatched') return 'info';
  if (s === 'processed' || s === 'processing') return 'info';
  if (s === 'confirmed') return 'info';
  return 'attention';
}

function stageRank(stage?: string): number {
  return STAGE_RANK[(stage || 'unconfirmed').toLowerCase()] ?? 0;
}

/** Derive the least stage from an array of groups belonging to one order. */
function leastStage(groups: OrderGroup[]): string {
  if (!groups.length) return 'confirmed';
  return groups.reduce((least, g) => {
    return stageRank(g.status) < stageRank(least) ? g.status : least;
  }, groups[0].status);
}

/**
 * Map a raw DB status (+ optional updatedAt) to one of the 5 tab keys.
 * Delivered groups older than ARCHIVE_THRESHOLD_MS are treated as 'archived'.
 */
function statusToTab(status: string, updatedAt?: string, createdAt?: string): ProcessStage {
  const s = (status || '').toLowerCase();
  if (s === 'delivered' || s === 'archived') {
    const deliveredAt = updatedAt || createdAt;
    if (deliveredAt) {
      const age = Date.now() - new Date(deliveredAt).getTime();
      if (age >= ARCHIVE_THRESHOLD_MS) return 'archived';
    }
    return 'delivered';
  }
  if (s === 'placed' || s === 'dispatched') return 'placed';
  if (s === 'processed' || s === 'processing') return 'processed';
  return 'confirmed';
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data (covers all 4 stages with multi-group orders)
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_GROUPS: OrderGroup[] = [
  {
    orderGrpId: 'ORD-84920-G1',
    orderId: 'ORD-84920',
    vendorName: 'Vayyari In-House Workshop',
    needLabel: false,
    status: 'confirmed',
    paymentMode: 'Prepaid',
    customerName: 'Ananya Sharma',
    customerPhone: '+919876543210',
    customerAddress: 'Plot 42, Jubilee Hills, Hyderabad',
    createdAt: new Date().toISOString(),
    items: [
      {
        id: 1,
        itemId: 'ORD-84920-G1-I1',
        orderGrpId: 'ORD-84920-G1',
        productTitle: 'Emerald Silk Anarkali Set',
        quantity: 1,
        unitPrice: 4999,
        subtotal: 4999,
      },
    ],
  },
  {
    orderGrpId: 'ORD-84920-G2',
    orderId: 'ORD-84920',
    vendorName: 'Rajputana Handloom Suppliers',
    needLabel: true,
    status: 'processed',
    paymentMode: 'COD',
    customerName: 'Ananya Sharma',
    customerPhone: '+919876543210',
    customerAddress: 'Plot 42, Jubilee Hills, Hyderabad',
    createdAt: new Date().toISOString(),
    items: [
      {
        id: 2,
        itemId: 'ORD-84920-G2-I1',
        orderGrpId: 'ORD-84920-G2',
        productTitle: 'Zari Border Dupatta',
        quantity: 2,
        unitPrice: 1299,
        subtotal: 2598,
      },
    ],
  },
  {
    orderGrpId: 'ORD-84915-G1',
    orderId: 'ORD-84915',
    vendorName: 'Vayyari In-House Workshop',
    needLabel: true,
    awbNumber: 'DELHIVERY987654321',
    labelUrl: 'https://minio.deeplens.internal/labels/DELHIVERY987654321.pdf',
    status: 'processed',
    trackingSubStatus: 'In Transit',
    paymentMode: 'COD',
    customerName: 'Rohan Mehta',
    customerPhone: '+919988776655',
    customerAddress: '12B Palm Meadows, Whitefield, Bengaluru',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    items: [
      {
        id: 3,
        itemId: 'ORD-84915-G1-I1',
        orderGrpId: 'ORD-84915-G1',
        productTitle: 'Royal Velvet Kurta Set',
        quantity: 1,
        unitPrice: 6499,
        subtotal: 6499,
      },
    ],
  },
  {
    orderGrpId: 'ORD-84910-G1',
    orderId: 'ORD-84910',
    vendorName: 'Rajputana Handloom Suppliers',
    needLabel: true,
    awbNumber: 'DELHIVERY123456789',
    status: 'placed',
    paymentMode: 'COD',
    customerName: 'Priya Nair',
    customerPhone: '+919844556677',
    customerAddress: 'Flat 5B, Indiranagar, Bengaluru',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    items: [
      {
        id: 4,
        itemId: 'ORD-84910-G1-I1',
        orderGrpId: 'ORD-84910-G1',
        productTitle: 'Banarasi Silk Saree',
        quantity: 1,
        unitPrice: 8999,
        subtotal: 8999,
      },
    ],
  },
  {
    orderGrpId: 'ORD-84905-G1',
    orderId: 'ORD-84905',
    vendorName: 'Vayyari In-House Workshop',
    needLabel: false,
    status: 'delivered',
    paymentMode: 'Prepaid',
    customerName: 'Sunita Rao',
    customerPhone: '+919866778899',
    customerAddress: '22 MG Road, Chennai',
    // 7 days ago → still in Delivered tab
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    items: [
      {
        id: 5,
        itemId: 'ORD-84905-G1-I1',
        orderGrpId: 'ORD-84905-G1',
        productTitle: 'Embroidered Cotton Kurti',
        quantity: 2,
        unitPrice: 1999,
        subtotal: 3998,
      },
    ],
  },
  {
    orderGrpId: 'ORD-84890-G1',
    orderId: 'ORD-84890',
    vendorName: 'Rajputana Handloom Suppliers',
    needLabel: true,
    awbNumber: 'DELHIVERY111222333',
    status: 'delivered',
    paymentMode: 'COD',
    customerName: 'Meera Krishnan',
    customerPhone: '+919811223344',
    customerAddress: 'House 9, Adyar, Chennai',
    // 14 days ago → goes into Archived tab
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    items: [
      {
        id: 6,
        itemId: 'ORD-84890-G1-I1',
        orderGrpId: 'ORD-84890-G1',
        productTitle: 'Kanchipuram Silk Saree',
        quantity: 1,
        unitPrice: 12999,
        subtotal: 12999,
      },
    ],
  },
  {
    orderGrpId: 'ORD-84880-G1',
    orderId: 'ORD-84880',
    vendorName: 'Vayyari In-House Workshop',
    needLabel: false,
    status: 'delivered',
    paymentMode: 'Prepaid',
    customerName: 'Divya Menon',
    customerPhone: '+919855667788',
    customerAddress: 'Flat 3A, Koramangala, Bengaluru',
    // 21 days ago → goes into Archived tab
    createdAt: new Date(Date.now() - 21 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 21 * 86400000).toISOString(),
    items: [
      {
        id: 7,
        itemId: 'ORD-84880-G1-I1',
        orderGrpId: 'ORD-84880-G1',
        productTitle: 'Chanderi Cotton Suit Set',
        quantity: 1,
        unitPrice: 3499,
        subtotal: 3499,
      },
      {
        id: 8,
        itemId: 'ORD-84880-G1-I2',
        orderGrpId: 'ORD-84880-G1',
        productTitle: 'Dupatta – Chanderi',
        quantity: 1,
        unitPrice: 799,
        subtotal: 799,
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function ProcessOrdersPage({ disableSafeArea = false, onBack }: ProcessOrdersPageProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeStage, setActiveStage] = useState<ProcessStage>('confirmed');
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
      const stages = ['confirmed', 'processed', 'placed', 'delivered'];
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

      if (merged.length > 0) {
        // Deduplicate by orderGrpId
        const seen = new Set<string>();
        setAllGroups(merged.filter((g) => {
          if (seen.has(g.orderGrpId)) return false;
          seen.add(g.orderGrpId);
          return true;
        }));
      } else {
        setAllGroups(MOCK_GROUPS);
      }
    } catch {
      setAllGroups(MOCK_GROUPS);
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
      confirmed: 0,
      processed: 0,
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
  const ItemGroupCard = ({ group }: { group: OrderGroup }) => {
    const itemCount = (group.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
    const total = (group.items || []).reduce((s, i) => s + (i.subtotal || i.unitPrice || 0), 0);
    const isUnassigned = !group.vendorName || group.vendorName.toLowerCase() === 'unassigned';

    return (
      <YStack
        backgroundColor={tokens.surface}
        borderWidth={1}
        borderColor={tokens.border}
        borderRadius={tokens.radius.lg}
        overflow="hidden"
        marginBottom={12}
      >
        {/* Group Header — mirrors ProductListSection vendor header */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open order for ${isUnassigned ? 'Unassigned' : group.vendorName}`}
          onPress={() => openEditOrder(group.orderId)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? `${tokens.surfaceRaised}D0` : tokens.surfaceRaised,
            flexDirection: 'row',
            alignItems: 'stretch',
            borderBottomWidth: 1,
            borderBottomColor: tokens.border,
          })}
        >
          {/* Left: Vendor Icon + Name + Subtitle */}
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
              <XStack
                width={28}
                height={28}
                borderRadius={tokens.radius.full}
                backgroundColor={isUnassigned ? `${tokens.textMuted}14` : `${tokens.accent}18`}
                alignItems="center"
                justifyContent="center"
              >
                <LuBuilding2 size={15} color={isUnassigned ? tokens.textMuted : tokens.accent} />
              </XStack>
              <YStack gap={2} flex={1}>
                <XStack alignItems="center" gap={6}>
                  <Text fontSize={13} fontWeight="800" color={tokens.text} numberOfLines={1}>
                    {isUnassigned ? 'Unassigned' : group.vendorName}
                  </Text>
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

            {/* Status Badge & Payment mode */}
            <XStack alignItems="center" gap={6}>
              {group.paymentMode && (
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
              )}
              <StatusBadge
                label={group.status ? group.status.toUpperCase() : 'UNCONFIRMED'}
                intent={getStatusIntent(group.status)}
                size="sm"
              />
            </XStack>
          </XStack>

          {/* Full-bleed blue chevron — identical to Edit Order */}
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
  const LeanGroupCard = ({ group, onPress }: { group: OrderGroup; onPress: () => void }) => {
    const itemCount = (group.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
    const total = (group.items || []).reduce((s, i) => s + (i.subtotal || i.unitPrice || 0), 0);
    const isUnassigned = !group.vendorName || group.vendorName.toLowerCase() === 'unassigned';

    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open ${group.orderGrpId}`}
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
          paddingRight={10}
          paddingVertical={10}
          alignItems="center"
          justifyContent="space-between"
          gap={8}
        >
          <XStack alignItems="center" gap={8} flex={1}>
            <XStack
              width={24}
              height={24}
              borderRadius={tokens.radius.full}
              backgroundColor={isUnassigned ? `${tokens.textMuted}14` : `${tokens.accent}18`}
              alignItems="center"
              justifyContent="center"
            >
              <LuBuilding2 size={13} color={isUnassigned ? tokens.textMuted : tokens.accent} />
            </XStack>
            <YStack flex={1} gap={1}>
              <Text fontSize={12} fontWeight="800" color={tokens.text} numberOfLines={1}>
                {isUnassigned ? 'Unassigned' : group.vendorName}
              </Text>
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

          <XStack alignItems="center" gap={6}>
            <StatusBadge
              label={group.status ? group.status.toUpperCase() : 'UNCONFIRMED'}
              intent={getStatusIntent(group.status)}
              size="sm"
            />
            <LuChevronRight size={14} color={tokens.textMuted} />
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
      borderRadius={tokens.radius.lg}
      overflow="hidden"
      marginBottom={12}
    >
      {/* Order header */}
      <XStack
        paddingHorizontal={12}
        paddingVertical={10}
        alignItems="center"
        justifyContent="space-between"
        backgroundColor={tokens.surfaceRaised}
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
        <XStack alignItems="center" gap={6}>
          <StatusBadge
            label={oc.leastStage.toUpperCase()}
            intent={getStatusIntent(oc.leastStage)}
            size="sm"
          />
        </XStack>
      </XStack>

      {/* Lean cards per group */}
      {oc.groups.map((g) => (
        <LeanGroupCard key={g.orderGrpId} group={g} onPress={() => openEditOrder(oc.orderId)} />
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
          paddingHorizontal={16}
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
              <XStack
                backgroundColor={tokens.surfaceRaised}
                borderRadius={tokens.radius.md}
                padding={3}
                gap={3}
                borderWidth={1}
                borderColor={tokens.border}
              >
                {(['groups', 'orders'] as ViewMode[]).map((mode) => {
                  const isActive = viewMode === mode;
                  return (
                    <Pressable key={mode} onPress={() => setViewMode(mode)}>
                      <YStack
                        paddingHorizontal={10}
                        paddingVertical={5}
                        borderRadius={tokens.radius.sm}
                        backgroundColor={isActive ? tokens.accent : 'transparent'}
                      >
                        <Text
                          fontSize={11}
                          fontWeight="800"
                          color={isActive ? '#FFFFFF' : tokens.textMuted}
                          textTransform="capitalize"
                        >
                          {mode === 'groups' ? 'Groups' : 'Orders'}
                        </Text>
                      </YStack>
                    </Pressable>
                  );
                })}
              </XStack>

              {/* Refresh */}
              <Pressable onPress={() => fetchAllGroups(true)} hitSlop={8}>
                <LuRefreshCw
                  size={18}
                  color={isRefreshing ? tokens.accent : tokens.textMuted}
                />
              </Pressable>
            </XStack>
          </XStack>

          {/* Stage Tabs */}
          <XStack
            backgroundColor={tokens.surfaceRaised}
            borderRadius={tokens.radius.md}
            padding={4}
            gap={4}
          >
            {STAGES.map(({ key, label }) => {
              const isActive = activeStage === key;
              const count = tabCounts[key];
              return (
                <Pressable key={key} style={{ flex: 1 }} onPress={() => setActiveStage(key)}>
                  <YStack
                    alignItems="center"
                    justifyContent="center"
                    paddingVertical={7}
                    borderRadius={tokens.radius.sm}
                    backgroundColor={isActive ? tokens.surface : 'transparent'}
                    shadowColor={isActive ? '#000' : 'transparent'}
                    shadowOpacity={isActive ? 0.08 : 0}
                    shadowRadius={isActive ? 4 : 0}
                    gap={1}
                  >
                    <Text
                      fontSize={12}
                      fontWeight={isActive ? '800' : '600'}
                      color={isActive ? tokens.accent : tokens.textMuted}
                    >
                      {label}
                    </Text>
                    {count > 0 && (
                      <Text
                        fontSize={10}
                        fontWeight="800"
                        color={isActive ? tokens.accent : tokens.textMuted}
                      >
                        {count}
                      </Text>
                    )}
                  </YStack>
                </Pressable>
              );
            })}
          </XStack>

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
          padding: 16,
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

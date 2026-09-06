import React, { useState, useMemo } from 'react';
import { ScrollView, RefreshControl, Pressable } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LuSettings,
  LuRefreshCw,
  LuPackage,
} from '../icons/lu';
import { useTheme } from '@/theme';
import {
  LogisticsMetricBanner,
  LogisticsMetrics,
} from '../molecules/LogisticsMetricBanner';
import {
  LogisticsFilterBar,
  DEFAULT_LOGISTICS_FILTERS,
} from '../molecules/LogisticsFilterBar';
import {
  LogisticsOrderCard,
  LogisticsOrderCardData,
} from '../molecules/LogisticsOrderCard';

export interface OrderLedgerPageProps {
  orders?: LogisticsOrderCardData[];
  selectedFilter?: string;
  onFilterChange?: (filter: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  disableSafeArea?: boolean;
  isLoading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onOpenSettings?: () => void;
  onOrderDetails?: (orderId: string) => void;
  onOrderFulfillment?: (orderId: string) => void;
  onResolveNdr?: (orderId: string) => void;
}

export function OrderLedgerPage({
  orders = [],
  selectedFilter = 'All',
  onFilterChange,
  searchQuery = '',
  onSearchChange,
  disableSafeArea = false,
  isLoading = false,
  refreshing = false,
  onRefresh,
  onOpenSettings,
  onOrderDetails,
  onOrderFulfillment,
  onResolveNdr,
}: OrderLedgerPageProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = disableSafeArea ? 0 : insets.top;
  const bottomInset = disableSafeArea ? 0 : insets.bottom;

  const [internalFilter, setInternalFilter] = useState(selectedFilter);
  const [internalSearch, setInternalSearch] = useState(searchQuery);

  const activeFilter = onFilterChange ? selectedFilter : internalFilter;
  const handleFilterChange = (f: string) => {
    if (onFilterChange) onFilterChange(f);
    else setInternalFilter(f);
  };

  const activeSearch = onSearchChange ? searchQuery : internalSearch;
  const handleSearchChange = (s: string) => {
    if (onSearchChange) onSearchChange(s);
    else setInternalSearch(s);
  };

  // Compute metrics from orders
  const metrics: LogisticsMetrics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(
      (o) =>
        o.status === 'PendingFulfillment' ||
        o.status === 'InProcurement'
    ).length;
    const inTransit = orders.filter((o) => o.status === 'InTransit').length;
    const ndrAlerts = orders.filter(
      (o) => o.hasNdr || o.status === 'NdrActionNeeded'
    ).length;

    return { total, pending, inTransit, ndrAlerts };
  }, [orders]);

  // Compute filter options with counts
  const filtersWithCounts = useMemo(() => {
    return DEFAULT_LOGISTICS_FILTERS.map((f) => {
      let count = 0;
      if (f.value === 'All') {
        count = orders.length;
      } else if (f.value === 'NdrActionNeeded') {
        count = orders.filter(
          (o) => o.hasNdr || o.status === 'NdrActionNeeded'
        ).length;
      } else {
        count = orders.filter((o) => o.status === f.value).length;
      }
      return { ...f, count };
    });
  }, [orders]);

  // Filtered orders (for local filtering if caller passes unfiltered array)
  const displayedOrders = useMemo(() => {
    if (onFilterChange && onSearchChange) {
      // Parent manages server-side filter
      return orders;
    }

    return orders.filter((order) => {
      if (activeFilter !== 'All') {
        if (activeFilter === 'NdrActionNeeded') {
          if (!order.hasNdr && order.status !== 'NdrActionNeeded') return false;
        } else if (order.status !== activeFilter) {
          return false;
        }
      }

      if (activeSearch.trim().length > 0) {
        const q = activeSearch.toLowerCase().trim();
        const matchesId = order.orderNumber.toLowerCase().includes(q);
        const matchesName = order.customerName.toLowerCase().includes(q);
        const matchesPhone = order.customerPhone.toLowerCase().includes(q);
        const matchesCity = order.shippingCity.toLowerCase().includes(q);
        const matchesAwb = order.packages?.some((p) =>
          p.awbNumber?.toLowerCase().includes(q)
        );
        const matchesVendor = order.packages?.some((p) =>
          p.vendorName?.toLowerCase().includes(q)
        );

        if (
          !matchesId &&
          !matchesName &&
          !matchesPhone &&
          !matchesCity &&
          !matchesAwb &&
          !matchesVendor
        ) {
          return false;
        }
      }

      return true;
    });
  }, [orders, activeFilter, activeSearch, onFilterChange, onSearchChange]);

  return (
    <YStack flex={1} backgroundColor={tokens.background}>
      {/* Top Header with Safe Area Inset Handling */}
      <XStack
        paddingTop={topInset}
        height={56 + topInset}
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={16}
        backgroundColor={tokens.surface}
        borderBottomWidth={1}
        borderBottomColor={tokens.border}
      >
        <YStack gap={1}>
          <Text fontSize={16} fontWeight="800" color={tokens.text} letterSpacing={0.2}>
            Order Ledger
          </Text>
          <Text fontSize={11} color={tokens.textMuted}>
            Logistics & dispatch pipeline
          </Text>
        </YStack>

        <XStack alignItems="center" gap={8}>
          {/* Refresh Action */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh order ledger"
            onPress={onRefresh}
          >
            <XStack
              padding={8}
              borderRadius={tokens.radius.full}
              backgroundColor={tokens.surfaceRaised}
              alignItems="center"
              justifyContent="center"
            >
              <LuRefreshCw size={17} color={tokens.text} />
            </XStack>
          </Pressable>

          {/* Settings Action */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings modal"
            onPress={onOpenSettings}
          >
            <XStack
              padding={8}
              borderRadius={tokens.radius.full}
              backgroundColor={tokens.surfaceRaised}
              alignItems="center"
              justifyContent="center"
            >
              <LuSettings size={18} color={tokens.text} />
            </XStack>
          </Pressable>
        </XStack>
      </XStack>

      {/* Main Scrollable View */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: Math.max(32, bottomInset + 24),
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {/* KPI Metrics Summary Banner */}
        <LogisticsMetricBanner
          metrics={metrics}
          activeFilter={activeFilter}
          onSelectFilter={handleFilterChange}
        />

        {/* Filter Bar with Search Input and Status Pills */}
        <LogisticsFilterBar
          searchQuery={activeSearch}
          onSearchChange={handleSearchChange}
          selectedFilter={activeFilter}
          onFilterChange={handleFilterChange}
          filters={filtersWithCounts}
        />

        {/* Orders List / Empty State */}
        {displayedOrders.length === 0 ? (
          <YStack
            backgroundColor={tokens.surface}
            borderRadius={tokens.radius.lg}
            borderWidth={1}
            borderColor={tokens.border}
            paddingVertical={44}
            paddingHorizontal={20}
            alignItems="center"
            justifyContent="center"
            gap={10}
          >
            <XStack
              width={52}
              height={52}
              borderRadius={tokens.radius.full}
              backgroundColor={tokens.surfaceRaised}
              alignItems="center"
              justifyContent="center"
            >
              <LuPackage size={26} color={tokens.textMuted} />
            </XStack>
            <Text fontSize={15} fontWeight="700" color={tokens.text}>
              No Orders Found
            </Text>
            <Text
              fontSize={12}
              color={tokens.textMuted}
              textAlign="center"
              maxWidth={260}
            >
              Try adjusting your filter chips or search query to find orders in this dispatch ledger.
            </Text>
          </YStack>
        ) : (
          <YStack gap={12}>
            {displayedOrders.map((order) => (
              <LogisticsOrderCard
                key={order.id}
                order={order}
                onPressDetails={onOrderDetails}
                onPressFulfillment={onOrderFulfillment}
                onPressResolveNdr={onResolveNdr}
              />
            ))}
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}

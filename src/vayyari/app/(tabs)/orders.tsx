import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { LogisticsOrder, OrderFulfillmentStatus } from '@/types/logistics';
import { logisticsService } from '@/services/logistics.service';
import { NdrActionCenter } from '@/components/logistics/NdrActionCenter';
import { EscalationTracker } from '@/components/logistics/EscalationTracker';
import {
  OrderLedgerPage,
} from '@/components/tamagui-ui/pages/OrderLedgerPage';
import {
  LogisticsOrderCardData,
} from '@/components/tamagui-ui/molecules/LogisticsOrderCard';

export default function OrdersScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<LogisticsOrder[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<OrderFulfillmentStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [activeNdrOrder, setActiveNdrOrder] = useState<LogisticsOrder | null>(null);
  const [activeEscalationOrder, setActiveEscalationOrder] = useState<LogisticsOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await logisticsService.listOrders(selectedFilter, searchQuery);
      setOrders(data);
    } catch (e) {
      console.warn('[OrdersScreen] Failed to fetch orders from logistics service', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Map LogisticsOrder to UI card data
  const mappedOrders: LogisticsOrderCardData[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    shippingCity: o.shippingCity,
    shippingState: o.shippingState,
    source: o.source,
    paymentMode: o.paymentMode,
    totalOrderValue: o.totalOrderValue,
    totalCodBalance: o.totalCodBalance,
    orderDate: o.orderDate,
    status: o.status,
    totalItemsCount: o.items ? o.items.length : 0,
    packages: o.packages
      ? o.packages.map((p) => ({
          id: p.id,
          packageNumber: p.packageNumber,
          vendorName: p.vendorName,
          awbNumber: p.delhiveryAwbNumber || p.vendorAwbNumber,
          isNdr: p.isNdr,
          fulfillmentPath: p.fulfillmentPath,
          procurementStage: p.procurementStage,
        }))
      : [],
    hasNdr: o.hasNdr || o.status === 'NdrActionNeeded',
  }));

  const handleResolveNdr = (orderId: string) => {
    const target = orders.find((x) => x.id === orderId);
    if (target) {
      setActiveNdrOrder(target);
    }
  };

  return (
    <>
      <OrderLedgerPage
        orders={mappedOrders}
        selectedFilter={selectedFilter}
        onFilterChange={(f) => setSelectedFilter(f as any)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isLoading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onOpenSettings={() => router.push('/modal')}
        onOrderDetails={(id) => router.push(`/utilities/order-details/${id}` as any)}
        onOrderFulfillment={(id) => router.push(`/orders/${id}/fulfillment` as any)}
        onResolveNdr={handleResolveNdr}
      />

      {/* NDR Modal */}
      {activeNdrOrder && (
        <NdrActionCenter
          visible={!!activeNdrOrder}
          onDismiss={() => setActiveNdrOrder(null)}
          order={activeNdrOrder}
          onActionComplete={fetchOrders}
        />
      )}

      {/* Escalation Modal */}
      {activeEscalationOrder && (
        <EscalationTracker
          visible={!!activeEscalationOrder}
          onDismiss={() => setActiveEscalationOrder(null)}
          order={activeEscalationOrder}
          onActionComplete={fetchOrders}
        />
      )}
    </>
  );
}

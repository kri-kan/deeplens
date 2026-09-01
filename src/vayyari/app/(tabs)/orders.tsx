import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Surface, Text, Appbar, Searchbar, Chip, Button, IconButton, useTheme, Divider, Card, Badge } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { LogisticsOrder, OrderFulfillmentStatus } from '@/types/logistics';
import { logisticsService } from '@/services/logistics.service';
import { NdrActionCenter } from '@/components/logistics/NdrActionCenter';
import { EscalationTracker } from '@/components/logistics/EscalationTracker';

const STATUS_FILTERS: { label: string; value: OrderFulfillmentStatus | 'All'; icon: string }[] = [
  { label: 'All', value: 'All', icon: 'view-list' },
  { label: 'Pending Fulfillment', value: 'PendingFulfillment', icon: 'clock-outline' },
  { label: 'In Procurement', value: 'InProcurement', icon: 'warehouse' },
  { label: 'In Transit', value: 'InTransit', icon: 'truck-delivery' },
  { label: 'NDR Action Needed', value: 'NdrActionNeeded', icon: 'alert-octagon' },
  { label: 'Delivered', value: 'Delivered', icon: 'check-circle' },
];

export default function OrdersScreen() {
  const theme = useTheme();
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
    } catch {
      // Error
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

  // Metrics summary
  const totalCount = orders.length;
  const pendingCount = orders.filter(o => o.status === 'PendingFulfillment' || o.status === 'InProcurement').length;
  const inTransitCount = orders.filter(o => o.status === 'InTransit').length;
  const ndrCount = orders.filter(o => o.hasNdr || o.status === 'NdrActionNeeded').length;

  const renderOrderItem = ({ item }: { item: LogisticsOrder }) => {
    const isCod = item.paymentMode === 'COD';
    const totalItems = item.items.length;
    const packagesCount = item.packages.length;
    const hasNdr = item.hasNdr || item.status === 'NdrActionNeeded';

    return (
      <Surface
        style={[
          styles.orderCard,
          {
            backgroundColor: (theme.colors as any).surfaceContainerLowest || theme.colors.surface,
            borderColor: hasNdr
              ? '#ef5350'
              : (theme.colors as any).outlineVariant || '#e0e0e0',
          },
        ]}
        elevation={2}
      >
        {/* Top Order Row */}
        <View style={styles.cardHeader}>
          <View style={styles.orderIdCol}>
            <View style={styles.idBadgeRow}>
              <Text variant="titleMedium" style={styles.orderNumberText}>
                {item.orderNumber}
              </Text>
              <Chip
                icon={item.source === 'Instagram' ? 'instagram' : 'whatsapp'}
                style={{ backgroundColor: '#f0f0f0', height: 24 }}
                textStyle={{ fontSize: 9, fontWeight: 'bold' }}
              >
                {item.source}
              </Chip>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {new Date(item.orderDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {/* Payment Pill */}
          <View style={styles.paymentCol}>
            <Chip
              icon={isCod ? 'cash' : 'check-circle-outline'}
              style={{ backgroundColor: isCod ? '#ffebee' : '#e8f5e9' }}
              textStyle={{ color: isCod ? '#c62828' : '#1b5e20', fontWeight: 'bold', fontSize: 11 }}
            >
              {isCod ? `COD: ₹${item.totalCodBalance}` : 'Prepaid'}
            </Chip>
            <Text style={styles.totalAmountText}>Total: ₹{item.totalOrderValue}</Text>
          </View>
        </View>

        <Divider style={styles.cardDivider} />

        {/* Customer & Address Details */}
        <View style={styles.customerRow}>
          <View style={styles.customerAvatar}>
            <IconButton icon="account-outline" size={20} iconColor={theme.colors.primary} style={{ margin: 0 }} />
          </View>
          <View style={styles.customerDetails}>
            <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
              {item.customerName}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.customerPhone} • {item.shippingCity}, {item.shippingState}
            </Text>
          </View>
        </View>

        {/* Packages & Routing Status Chips */}
        <View style={styles.packagesRow}>
          <Text variant="labelSmall" style={styles.packagesLabel}>
            PACKAGES ({packagesCount}):
          </Text>
          <View style={styles.packagesChipsWrap}>
            {item.packages.map((pkg) => (
              <Chip
                key={pkg.id}
                icon={pkg.delhiveryAwbNumber ? 'truck-delivery' : pkg.fulfillmentPath === 'DirectVendor' ? 'truck-fast' : 'warehouse'}
                style={[
                  styles.packageChip,
                  {
                    backgroundColor: pkg.isNdr
                      ? '#ffebee'
                      : pkg.delhiveryAwbNumber
                      ? '#e8f5e9'
                      : '#f5f5f5',
                  },
                ]}
                textStyle={{ fontSize: 10, fontWeight: '600' }}
              >
                Pkg #{pkg.packageNumber}: {pkg.vendorName} ({pkg.delhiveryAwbNumber || pkg.vendorAwbNumber || pkg.procurementStage})
              </Chip>
            ))}
          </View>
        </View>

        {/* NDR Alert Banner if applicable */}
        {hasNdr && (
          <Surface style={styles.ndrAlertBanner} elevation={0}>
            <IconButton icon="alert-octagon" size={20} iconColor="#c62828" style={{ margin: 0 }} />
            <View style={{ flex: 1 }}>
              <Text variant="labelMedium" style={{ color: '#c62828', fontWeight: 'bold' }}>
                NDR Exception Raised!
              </Text>
              <Text variant="bodySmall" style={{ color: '#555' }} numberOfLines={1}>
                Buyer unreachable or requested delivery reschedule
              </Text>
            </View>
            <Button
              mode="contained"
              buttonColor="#c62828"
              textColor="#fff"
              compact
              onPress={() => setActiveNdrOrder(item)}
              style={styles.ndrResolveBtn}
            >
              Resolve
            </Button>
          </Surface>
        )}

        {/* Bottom Actions Row */}
        <View style={styles.cardActionsRow}>
          <View style={styles.itemCountBadge}>
            <Text style={styles.itemCountText}>
              {totalItems} item{totalItems === 1 ? '' : 's'}
            </Text>
          </View>

          <View style={styles.actionButtonsCol}>
            <Button
              mode="contained"
              icon="truck-fast-outline"
              buttonColor="#006e36"
              textColor="#ffffff"
              onPress={() => router.push(`/orders/${item.id}/fulfillment` as any)}
              style={styles.fulfillmentBtn}
            >
              Open Fulfillment Hub
            </Button>
          </View>
        </View>
      </Surface>
    );
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      {/* Top Appbar */}
      <Appbar.Header style={{ backgroundColor: theme.colors.background }} elevated>
        <Appbar.Content title="Order Ledger" titleStyle={{ fontWeight: 'bold' }} />
        <Appbar.Action icon="refresh" onPress={onRefresh} />
        <Appbar.Action icon="cog-outline" onPress={() => router.push('/modal')} />
      </Appbar.Header>

      {/* Metrics Banner */}
      <View style={styles.metricsContainer}>
        <Surface
          style={[
            styles.metricsCard,
            {
              backgroundColor: (theme.colors as any).surfaceContainerHigh || theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          <View style={styles.metricCol}>
            <Text style={styles.metricHeader}>TOTAL</Text>
            <Text style={styles.metricNumber}>{totalCount}</Text>
          </View>
          <View style={styles.metricSep} />
          <View style={styles.metricCol}>
            <Text style={styles.metricHeader}>PENDING</Text>
            <Text style={[styles.metricNumber, { color: '#e65100' }]}>{pendingCount}</Text>
          </View>
          <View style={styles.metricSep} />
          <View style={styles.metricCol}>
            <Text style={styles.metricHeader}>IN TRANSIT</Text>
            <Text style={[styles.metricNumber, { color: '#006e36' }]}>{inTransitCount}</Text>
          </View>
          <View style={styles.metricSep} />
          <View style={styles.metricCol}>
            <Text style={styles.metricHeader}>NDR ALERTS</Text>
            <Text style={[styles.metricNumber, { color: '#c62828' }]}>{ndrCount}</Text>
          </View>
        </Surface>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search order ID, buyer, phone, AWB, vendor..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: (theme.colors as any).surfaceContainerLowest || '#fff' }]}
          inputStyle={styles.searchInput}
        />
      </View>

      {/* Filter Tabs / Chips (Horizontal Scroll) */}
      <View style={styles.filterScrollContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.filterListContent}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item.value;
            return (
              <Chip
                icon={item.icon}
                selected={isSelected}
                onPress={() => setSelectedFilter(item.value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected
                      ? (theme.colors as any).secondaryContainer || '#83fba5'
                      : (theme.colors as any).surfaceContainerLowest || '#fff',
                    borderColor: isSelected ? theme.colors.secondary : theme.colors.outlineVariant,
                  },
                ]}
                textStyle={{
                  color: isSelected ? (theme.colors as any).onSecondaryContainer || '#005f2e' : theme.colors.onSurface,
                  fontWeight: isSelected ? 'bold' : 'normal',
                  fontSize: 11,
                }}
              >
                {item.label}
              </Chip>
            );
          }}
        />
      </View>

      {/* Orders List */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.ordersListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Surface style={styles.emptyState} elevation={0}>
            <IconButton icon="package-variant-closed-remove" size={48} iconColor={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
              No Orders Found
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
              Try adjusting your filter or search query to find orders.
            </Text>
          </Surface>
        }
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
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  metricsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  metricsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  metricCol: {
    alignItems: 'center',
    flex: 1,
  },
  metricHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#666',
    letterSpacing: 0.5,
  },
  metricNumber: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  metricSep: {
    width: 1,
    height: 22,
    backgroundColor: '#ddd',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  searchBar: {
    borderRadius: 12,
    elevation: 1,
    height: 44,
  },
  searchInput: {
    fontSize: 13,
    alignSelf: 'center',
  },
  filterScrollContainer: {
    paddingVertical: 4,
  },
  filterListContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    borderRadius: 20,
    borderWidth: 1,
    height: 32,
  },
  ordersListContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  orderCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderIdCol: {
    flex: 1,
  },
  idBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  orderNumberText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  paymentCol: {
    alignItems: 'flex-end',
  },
  totalAmountText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    marginTop: 3,
  },
  cardDivider: {
    marginVertical: 10,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  customerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerDetails: {
    flex: 1,
  },
  packagesRow: {
    marginTop: 4,
    marginBottom: 8,
  },
  packagesLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  packagesChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  packageChip: {
    height: 26,
    borderRadius: 8,
  },
  ndrAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
    gap: 6,
  },
  ndrResolveBtn: {
    borderRadius: 6,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemCountBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemCountText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  actionButtonsCol: {
    flexDirection: 'row',
    gap: 8,
  },
  fulfillmentBtn: {
    borderRadius: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 30,
    backgroundColor: 'transparent',
  },
});

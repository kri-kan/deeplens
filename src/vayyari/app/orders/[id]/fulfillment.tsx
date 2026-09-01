import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Surface, Text, Appbar, Button, IconButton, useTheme, Chip, Divider, FAB } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LogisticsOrder, FulfillmentPackage, FulfillmentItem } from '@/types/logistics';
import { logisticsService } from '@/services/logistics.service';
import { PackageCard } from '@/components/logistics/PackageCard';
import { ThermalLabelModal } from '@/components/logistics/ThermalLabelModal';
import { VendorWhatsAppShareModal } from '@/components/logistics/VendorWhatsAppShareModal';
import { ItemReassignModal } from '@/components/logistics/ItemReassignModal';
import { NdrActionCenter } from '@/components/logistics/NdrActionCenter';
import { EscalationTracker } from '@/components/logistics/EscalationTracker';

export default function OrderFulfillmentScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const orderId = params.id as string;

  const [order, setOrder] = useState<LogisticsOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [activePackageForLabel, setActivePackageForLabel] = useState<FulfillmentPackage | null>(null);
  const [activePackageForVendorShare, setActivePackageForVendorShare] = useState<FulfillmentPackage | null>(null);
  const [activeItemForReassign, setActiveItemForReassign] = useState<FulfillmentItem | null>(null);
  const [showNdrModal, setShowNdrModal] = useState(false);
  const [showEscalationModal, setShowEscalationModal] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      if (!orderId) return;
      const data = await logisticsService.getOrder(orderId);
      setOrder(data);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrder();
  };

  const handleAddNewPackage = async () => {
    if (!order) return;
    try {
      setLoading(true);
      const updated = await logisticsService.createNewPackage(
        order.id,
        'VND-NEW',
        'Direct Supplier / Vendor',
        'ProcureToShip'
      );
      setOrder(updated);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  };

  const handleReassignItem = async (itemId: string, targetPackageId: string) => {
    if (!order) return;
    const updated = await logisticsService.reassignItem(order.id, itemId, targetPackageId);
    setOrder(updated);
  };

  const handleCreateNewPackageAndReassign = async (itemId: string, vendorName: string) => {
    if (!order) return;
    const newPkgOrder = await logisticsService.createNewPackage(
      order.id,
      `VND-${Date.now().toString().slice(-4)}`,
      vendorName,
      'ProcureToShip'
    );
    const newPkg = newPkgOrder.packages[newPkgOrder.packages.length - 1];
    if (newPkg) {
      const finalOrder = await logisticsService.reassignItem(order.id, itemId, newPkg.id);
      setOrder(finalOrder);
    }
  };

  if (loading && !order) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
        <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Fulfillment Hub" />
        </Appbar.Header>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
            Loading Order Packages...
          </Text>
        </View>
      </Surface>
    );
  }

  if (!order) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
        <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Fulfillment Hub" />
        </Appbar.Header>
        <View style={styles.loadingCenter}>
          <Text variant="titleMedium">Order Not Found</Text>
          <Button mode="outlined" onPress={() => router.back()} style={{ marginTop: 12 }}>
            Go Back
          </Button>
        </View>
      </Surface>
    );
  }

  const isCod = order.paymentMode === 'COD';
  const totalItemsCount = order.items.length;
  const packagesCount = order.packages.length;
  const hasNdr = order.hasNdr || order.packages.some(p => p.isNdr);
  const hasEscalations = order.hasEscalation || order.packages.some(p => p.escalations?.length > 0);

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      {/* App Bar */}
      <Appbar.Header style={{ backgroundColor: theme.colors.background }} elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title={order.orderNumber}
          titleStyle={{ fontWeight: 'bold' }}
          subtitle={`Fulfillment Hub • ${order.customerName}`}
        />
        {hasNdr && (
          <Appbar.Action
            icon="alert-octagon"
            iconColor="#c62828"
            onPress={() => setShowNdrModal(true)}
          />
        )}
        <Appbar.Action
          icon="shield-alert-outline"
          iconColor={hasEscalations ? '#e65100' : theme.colors.onSurfaceVariant}
          onPress={() => setShowEscalationModal(true)}
        />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Customer & Shipping Summary Bento Card */}
        <Surface
          style={[
            styles.summaryCard,
            {
              backgroundColor: (theme.colors as any).surfaceContainerLowest || theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          <View style={styles.summaryTopRow}>
            <View style={styles.customerInfoCol}>
              <View style={styles.nameRow}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  {order.customerName}
                </Text>
                <Chip
                  icon={order.source === 'Instagram' ? 'instagram' : 'whatsapp'}
                  style={{ backgroundColor: '#f0f0f0', height: 26 }}
                  textStyle={{ fontSize: 10, fontWeight: 'bold' }}
                >
                  {order.source}
                </Chip>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Phone: {order.customerPhone}
              </Text>
            </View>

            {/* Payment & COD Badge */}
            <View style={styles.paymentBadgeCol}>
              <Chip
                icon={isCod ? 'cash' : 'credit-card-check'}
                style={{ backgroundColor: isCod ? '#ffebee' : '#e8f5e9' }}
                textStyle={{ color: isCod ? '#c62828' : '#1b5e20', fontWeight: 'bold' }}
              >
                {isCod ? `COD: ₹${order.totalCodBalance}` : 'Prepaid'}
              </Chip>
              <Text style={styles.totalValueText}>Total: ₹{order.totalOrderValue}</Text>
            </View>
          </View>

          <Divider style={styles.cardDivider} />

          <View style={styles.addressRow}>
            <IconButton icon="map-marker-outline" size={18} iconColor={theme.colors.primary} style={{ margin: 0 }} />
            <Text variant="bodySmall" style={styles.addressText}>
              {order.shippingAddress}, {order.shippingCity}, {order.shippingState} - <Text style={{ fontWeight: 'bold' }}>{order.shippingPincode}</Text>
            </Text>
          </View>
        </Surface>

        {/* Floating Metrics Bar */}
        <Surface
          style={[
            styles.metricsBar,
            {
              backgroundColor: (theme.colors as any).surfaceContainerHigh || theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>PACKAGES</Text>
            <Text style={styles.metricVal}>{packagesCount}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>TOTAL ITEMS</Text>
            <Text style={styles.metricVal}>{totalItemsCount}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>COD BALANCE</Text>
            <Text style={[styles.metricVal, { color: isCod ? '#c62828' : '#2e7d32' }]}>
              ₹{order.totalCodBalance}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>STATUS</Text>
            <Text style={styles.metricValStatus}>{order.status}</Text>
          </View>
        </Surface>

        {/* Section Header: Package Consignments */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
              Package Consignments & Routing
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Split vendors, allocate COD & dispatch via Delhivery
            </Text>
          </View>

          <Button
            mode="contained"
            icon="plus"
            onPress={handleAddNewPackage}
            style={styles.addPkgBtn}
          >
            Add Package
          </Button>
        </View>

        {/* Package Cards List */}
        {order.packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            order={order}
            packageItem={pkg}
            onRefreshOrder={fetchOrder}
            onOpenVendorShare={(p) => setActivePackageForVendorShare(p)}
            onOpenThermalLabel={(p) => setActivePackageForLabel(p)}
            onOpenItemReassign={(item) => setActiveItemForReassign(item)}
            onOpenNdrCenter={() => setShowNdrModal(true)}
            onOpenEscalation={() => setShowEscalationModal(true)}
          />
        ))}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Thermal Shipping Label Modal */}
      {activePackageForLabel && (
        <ThermalLabelModal
          visible={!!activePackageForLabel}
          onDismiss={() => setActivePackageForLabel(null)}
          order={order}
          packageItem={activePackageForLabel}
        />
      )}

      {/* Vendor WhatsApp Share Manifest Modal */}
      {activePackageForVendorShare && (
        <VendorWhatsAppShareModal
          visible={!!activePackageForVendorShare}
          onDismiss={() => setActivePackageForVendorShare(null)}
          order={order}
          packageItem={activePackageForVendorShare}
        />
      )}

      {/* Item Reassign Modal */}
      {activeItemForReassign && (
        <ItemReassignModal
          visible={!!activeItemForReassign}
          onDismiss={() => setActiveItemForReassign(null)}
          order={order}
          item={activeItemForReassign}
          onReassign={handleReassignItem}
          onCreateNewPackageAndReassign={handleCreateNewPackageAndReassign}
        />
      )}

      {/* NDR Action Center Modal */}
      {showNdrModal && (
        <NdrActionCenter
          visible={showNdrModal}
          onDismiss={() => setShowNdrModal(false)}
          order={order}
          onActionComplete={fetchOrder}
        />
      )}

      {/* Escalation & Dispute Tracker Modal */}
      {showEscalationModal && (
        <EscalationTracker
          visible={showEscalationModal}
          onDismiss={() => setShowEscalationModal(false)}
          order={order}
          onEscalationCreated={fetchOrder}
        />
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  paymentBadgeCol: {
    alignItems: 'flex-end',
  },
  totalValueText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginTop: 4,
  },
  cardDivider: {
    marginVertical: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    flex: 1,
    lineHeight: 16,
  },
  metricsBar: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#666',
    letterSpacing: 0.5,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  metricValStatus: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#006e36',
    marginTop: 3,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#ddd',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addPkgBtn: {
    borderRadius: 10,
  },
});

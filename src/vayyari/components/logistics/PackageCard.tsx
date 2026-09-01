import React, { useState } from 'react';
import { StyleSheet, View, Image, Linking, Platform } from 'react-native';
import { Surface, Text, Button, IconButton, useTheme, Chip, Divider, TextInput, Menu } from 'react-native-paper';
import { FulfillmentPackage, FulfillmentItem, LogisticsOrder, FulfillmentPath, ProcurementStage, CourierName } from '@/types/logistics';
import { logisticsService } from '@/services/logistics.service';

interface PackageCardProps {
  order: LogisticsOrder;
  packageItem: FulfillmentPackage;
  onRefreshOrder: () => void;
  onOpenVendorShare: (pkg: FulfillmentPackage) => void;
  onOpenThermalLabel: (pkg: FulfillmentPackage) => void;
  onOpenItemReassign: (item: FulfillmentItem) => void;
  onOpenNdrCenter: (pkg: FulfillmentPackage) => void;
  onOpenEscalation: (pkg: FulfillmentPackage) => void;
}

export const PackageCard: React.FC<PackageCardProps> = ({
  order,
  packageItem,
  onRefreshOrder,
  onOpenVendorShare,
  onOpenThermalLabel,
  onOpenItemReassign,
  onOpenNdrCenter,
  onOpenEscalation,
}) => {
  const theme = useTheme();

  // State for Path A: Attach Vendor AWB
  const [showAttachAwb, setShowAttachAwb] = useState(false);
  const [vendorCourier, setVendorCourier] = useState(packageItem.vendorCourierName || 'DTDC');
  const [vendorAwb, setVendorAwb] = useState(packageItem.vendorAwbNumber || '');

  // State for Path B: Inbound dispatch
  const [showInboundForm, setShowInboundForm] = useState(false);
  const [inboundCourier, setInboundCourier] = useState(packageItem.procurementInboundCourier || 'DTDC');
  const [inboundAwb, setInboundAwb] = useState(packageItem.procurementInboundAwb || '');

  // State for Delhivery AWB generation & Pickup
  const [isGeneratingAwb, setIsGeneratingAwb] = useState(false);
  const [showPickupScheduler, setShowPickupScheduler] = useState(false);
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [pickupSlot, setPickupSlot] = useState('14:00 - 18:00');
  const [weightKg, setWeightKg] = useState(packageItem.weightKg?.toString() || '0.8');

  const [loading, setLoading] = useState(false);

  const isDirectVendor = packageItem.fulfillmentPath === 'DirectVendor';
  const isProcureToShip = packageItem.fulfillmentPath === 'ProcureToShip';
  const isReceivedAtHub = packageItem.procurementStage === 'ReceivedAtHub';
  const hasDelhiveryAwb = !!packageItem.delhiveryAwbNumber;
  const isCod = order.paymentMode === 'COD';

  // Toggle path between Direct Vendor & Procure-to-Ship
  const handleTogglePath = async (path: FulfillmentPath) => {
    try {
      setLoading(true);
      await logisticsService.updatePackagePath(order.id, packageItem.id, path);
      onRefreshOrder();
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  // Path A: Save Vendor AWB
  const handleSaveVendorAwb = async () => {
    if (!vendorAwb.trim()) return;
    try {
      setLoading(true);
      await logisticsService.attachVendorAwb(order.id, packageItem.id, vendorAwb.trim(), vendorCourier);
      setShowAttachAwb(false);
      onRefreshOrder();
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  };

  // Path A: Forward Tracking to Customer via WhatsApp
  const handleForwardTrackingCustomer = () => {
    const courier = packageItem.vendorCourierName || packageItem.delhiveryAwbNumber ? 'Delhivery' : 'Courier';
    const awb = packageItem.vendorAwbNumber || packageItem.delhiveryAwbNumber || '';
    const text = `Hi ${order.customerName},\nGreat news! Your package #${packageItem.packageNumber} from *Vayyari* (Order #${order.orderNumber}) has been dispatched via *${courier}*.\n\n*Tracking / AWB:* ${awb}\n*Items:* ${packageItem.items.map(i => i.productName).join(', ')}\n${isCod ? `*COD Amount to Pay:* ₹${packageItem.codAmount}` : '*Prepaid*'}\n\nTrack here: https://track.vayyari.com/${awb}\n\nThank you for shopping with us!`;

    const cleanPhone = order.customerPhone.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`);
  };

  // Path B: Mark Inbound
  const handleMarkInbound = async () => {
    try {
      setLoading(true);
      await logisticsService.updateProcurementStage(
        order.id,
        packageItem.id,
        'Inbound',
        inboundAwb.trim() || undefined,
        inboundCourier
      );
      setShowInboundForm(false);
      onRefreshOrder();
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  };

  // Path B: Mark Received at Hub
  const handleMarkReceivedAtHub = async () => {
    try {
      setLoading(true);
      await logisticsService.updateProcurementStage(order.id, packageItem.id, 'ReceivedAtHub');
      onRefreshOrder();
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  };

  // Delhivery: Generate AWB
  const handleGenerateDelhiveryAwb = async () => {
    try {
      setIsGeneratingAwb(true);
      const parsedWeight = parseFloat(weightKg) || 0.8;
      await logisticsService.generateDelhiveryAwb({
        orderId: order.id,
        packageId: packageItem.id,
        weightKg: parsedWeight,
        dimensionsCm: packageItem.dimensionsCm,
        codAmount: packageItem.codAmount,
      });
      onRefreshOrder();
    } catch {
      // Error
    } finally {
      setIsGeneratingAwb(false);
    }
  };

  // Delhivery: Schedule Pickup
  const handleSchedulePickup = async () => {
    try {
      setLoading(true);
      await logisticsService.schedulePickup({
        orderId: order.id,
        packageId: packageItem.id,
        pickupDate,
        timeSlot: pickupSlot,
        pickupLocation: 'Vayyari Central Hub - Bengaluru',
        expectedPackageCount: 1,
      });
      setShowPickupScheduler(false);
      onRefreshOrder();
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Surface
      style={[
        styles.card,
        {
          backgroundColor: (theme.colors as any).surfaceContainerLowest || theme.colors.surface,
          borderColor: packageItem.isNdr
            ? '#ef5350'
            : hasDelhiveryAwb
            ? theme.colors.secondary
            : theme.colors.outlineVariant,
        },
      ]}
      elevation={2}
    >
      {/* Top Banner with Package # & Vendor */}
      <View style={styles.cardHeader}>
        <View style={styles.titleCol}>
          <View style={styles.badgeRow}>
            <Chip
              icon="package-variant-closed"
              style={{ backgroundColor: (theme.colors as any).primaryContainer || '#e5e2e1' }}
              textStyle={{ fontWeight: 'bold', fontSize: 12 }}
            >
              Package #{packageItem.packageNumber}
            </Chip>
            {packageItem.isNdr && (
              <Chip
                icon="alert-octagon"
                style={{ backgroundColor: '#ffebee' }}
                textStyle={{ color: '#c62828', fontWeight: 'bold', fontSize: 11 }}
                onPress={() => onOpenNdrCenter(packageItem)}
              >
                NDR Exception
              </Chip>
            )}
            {packageItem.escalations && packageItem.escalations.length > 0 && (
              <Chip
                icon="shield-alert-outline"
                style={{ backgroundColor: '#fff3e0' }}
                textStyle={{ color: '#e65100', fontWeight: 'bold', fontSize: 11 }}
                onPress={() => onOpenEscalation(packageItem)}
              >
                Dispute Active
              </Chip>
            )}
          </View>

          <Text variant="titleMedium" style={styles.vendorName} numberOfLines={1}>
            {packageItem.vendorName}
          </Text>
          {packageItem.vendorPhone && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Vendor Contact: {packageItem.vendorPhone}
            </Text>
          )}
        </View>

        {/* Proportional COD Allocation Badge */}
        <View style={styles.codBadgeContainer}>
          <Text style={styles.codBadgeTitle}>
            {isCod ? 'PROPORTIONAL COD' : 'PACKAGE VALUE'}
          </Text>
          <Text style={[styles.codBadgeAmount, { color: isCod ? '#b71c1c' : '#2e7d32' }]}>
            ₹{isCod ? packageItem.codAmount : packageItem.packageValue}
          </Text>
          <Text style={styles.codSubText}>
            {packageItem.items.length} item{packageItem.items.length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Fulfillment Path Selector (Path A vs Path B) */}
      <View style={styles.pathSelectorSection}>
        <Text variant="labelSmall" style={styles.pathLabel}>
          FULFILLMENT STRATEGY:
        </Text>
        <View style={styles.pathButtonRow}>
          <Button
            mode={isDirectVendor ? 'contained' : 'outlined'}
            icon="truck-fast-outline"
            onPress={() => handleTogglePath('DirectVendor')}
            style={styles.pathBtn}
            buttonColor={isDirectVendor ? '#006e36' : undefined}
            textColor={isDirectVendor ? '#ffffff' : undefined}
          >
            Path A: Direct Vendor
          </Button>
          <Button
            mode={isProcureToShip ? 'contained' : 'outlined'}
            icon="warehouse"
            onPress={() => handleTogglePath('ProcureToShip')}
            style={styles.pathBtn}
            buttonColor={isProcureToShip ? '#006e36' : undefined}
            textColor={isProcureToShip ? '#ffffff' : undefined}
          >
            Path B: Procure-to-Ship
          </Button>
        </View>
      </View>

      {/* Items in this Package */}
      <View style={styles.itemsSection}>
        <Text variant="labelSmall" style={styles.sectionHeader}>
          PACKAGE ITEMS ({packageItem.items.length}):
        </Text>

        {packageItem.items.length === 0 ? (
          <Text style={styles.emptyItemsText}>No items currently assigned to this package.</Text>
        ) : (
          packageItem.items.map((it) => (
            <Surface key={it.id} style={styles.itemRow} elevation={0}>
              {it.photoUrl ? (
                <Image source={{ uri: it.photoUrl }} style={styles.itemImage} />
              ) : (
                <View style={styles.itemImagePlaceholder}>
                  <IconButton icon="tshirt-crew" size={18} />
                </View>
              )}

              <View style={styles.itemInfo}>
                <Text variant="bodyMedium" numberOfLines={1} style={{ fontWeight: '600' }}>
                  {it.productName}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  SKU: {it.sku || 'N/A'} • Qty: {it.quantity} • ₹{it.totalPrice}
                </Text>
                {isCod && (
                  <Text style={styles.itemCodAlloc}>COD Portioned: ₹{it.totalPrice}</Text>
                )}
              </View>

              {/* 1-Tap Reassign Item Button */}
              <IconButton
                icon="swap-horizontal"
                size={20}
                iconColor={theme.colors.primary}
                onPress={() => onOpenItemReassign(it)}
              />
            </Surface>
          ))
        )}
      </View>

      <Divider style={styles.divider} />

      {/* Path A: Direct Vendor Fulfillment Flow */}
      {isDirectVendor && (
        <View style={styles.workflowSection}>
          <Text variant="labelSmall" style={styles.workflowTitle}>
            PATH A: DIRECT VENDOR DROP-SHIP WORKFLOW
          </Text>

          {/* Quick Actions Row */}
          <View style={styles.workflowActions}>
            {/* 1-Tap Share with Vendor on WhatsApp */}
            <Button
              mode="outlined"
              icon="whatsapp"
              textColor="#1b5e20"
              onPress={() => onOpenVendorShare(packageItem)}
              style={styles.workflowBtn}
            >
              Share with Vendor
            </Button>

            {/* Attach Vendor AWB */}
            <Button
              mode="outlined"
              icon="barcode-scan"
              onPress={() => setShowAttachAwb(!showAttachAwb)}
              style={styles.workflowBtn}
            >
              {packageItem.vendorAwbNumber ? 'Update Vendor AWB' : 'Attach Vendor AWB'}
            </Button>
          </View>

          {/* Attach Vendor AWB Sub-form */}
          {showAttachAwb && (
            <Surface style={styles.inlineForm} elevation={1}>
              <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                Record Vendor Courier & AWB
              </Text>
              <TextInput
                mode="outlined"
                label="Courier Name (e.g. DTDC, BlueDart, Delhivery, Tirupati)"
                value={vendorCourier}
                onChangeText={setVendorCourier}
                style={styles.formInput}
              />
              <TextInput
                mode="outlined"
                label="Tracking / AWB Number"
                value={vendorAwb}
                onChangeText={setVendorAwb}
                style={styles.formInput}
              />
              <View style={styles.formButtonRow}>
                <Button mode="text" onPress={() => setShowAttachAwb(false)}>
                  Cancel
                </Button>
                <Button mode="contained" loading={loading} onPress={handleSaveVendorAwb}>
                  Save AWB
                </Button>
              </View>
            </Surface>
          )}

          {/* Vendor Tracking Status & Forward to Customer */}
          {packageItem.vendorAwbNumber && (
            <Surface style={styles.statusBox} elevation={0}>
              <View style={styles.statusBoxHeader}>
                <IconButton icon="check-circle" size={20} iconColor="#2e7d32" style={{ margin: 0 }} />
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ fontWeight: 'bold', color: '#2e7d32' }}>
                    Dispatched by Vendor ({packageItem.vendorCourierName})
                  </Text>
                  <Text variant="bodySmall">AWB: {packageItem.vendorAwbNumber}</Text>
                </View>
              </View>
              {/* 1-Tap Forward Tracking to Customer */}
              <Button
                mode="contained"
                icon="whatsapp"
                buttonColor="#25D366"
                textColor="#fff"
                onPress={handleForwardTrackingCustomer}
                style={styles.forwardCustomerBtn}
              >
                Forward Tracking to Customer via WhatsApp
              </Button>
            </Surface>
          )}
        </View>
      )}

      {/* Path B: Procure-to-Ship Flow */}
      {isProcureToShip && (
        <View style={styles.workflowSection}>
          <Text variant="labelSmall" style={styles.workflowTitle}>
            PATH B: PROCURE-TO-SHIP (3-STAGE TRACKER)
          </Text>

          {/* 3-Stage Progress Indicator */}
          <View style={styles.progressTracker}>
            <View style={styles.stageStep}>
              <View
                style={[
                  styles.stepCircle,
                  { backgroundColor: '#006e36' },
                ]}
              >
                <IconButton icon="check" size={14} iconColor="#fff" style={{ margin: 0 }} />
              </View>
              <Text style={styles.stepLabel}>1. Ordered</Text>
            </View>

            <View style={[styles.stepLine, { backgroundColor: packageItem.procurementStage !== 'Pending' ? '#006e36' : '#ccc' }]} />

            <View style={styles.stageStep}>
              <View
                style={[
                  styles.stepCircle,
                  {
                    backgroundColor:
                      packageItem.procurementStage === 'Inbound' || packageItem.procurementStage === 'ReceivedAtHub'
                        ? '#006e36'
                        : '#ccc',
                  },
                ]}
              >
                <IconButton
                  icon={packageItem.procurementStage === 'Inbound' || packageItem.procurementStage === 'ReceivedAtHub' ? 'truck-delivery' : 'truck-outline'}
                  size={14}
                  iconColor="#fff"
                  style={{ margin: 0 }}
                />
              </View>
              <Text style={styles.stepLabel}>2. Inbound</Text>
            </View>

            <View style={[styles.stepLine, { backgroundColor: isReceivedAtHub ? '#006e36' : '#ccc' }]} />

            <View style={styles.stageStep}>
              <View
                style={[
                  styles.stepCircle,
                  { backgroundColor: isReceivedAtHub ? '#006e36' : '#ccc' },
                ]}
              >
                <IconButton icon="warehouse" size={14} iconColor="#fff" style={{ margin: 0 }} />
              </View>
              <Text style={styles.stepLabel}>3. At Hub</Text>
            </View>
          </View>

          {/* Procurement Actions */}
          <View style={styles.procurementActionRow}>
            {/* Share PO with vendor */}
            <Button
              mode="outlined"
              icon="whatsapp"
              onPress={() => onOpenVendorShare(packageItem)}
              style={styles.workflowBtn}
            >
              WhatsApp PO
            </Button>

            {packageItem.procurementStage === 'Pending' && (
              <Button
                mode="contained"
                icon="truck-fast"
                onPress={() => setShowInboundForm(!showInboundForm)}
                style={styles.workflowBtn}
              >
                Mark Inbound
              </Button>
            )}

            {packageItem.procurementStage === 'Inbound' && (
              <Button
                mode="contained"
                icon="package-down"
                buttonColor="#006e36"
                loading={loading}
                onPress={handleMarkReceivedAtHub}
                style={styles.workflowBtn}
              >
                Mark Received at Hub
              </Button>
            )}
          </View>

          {/* Inbound Form */}
          {showInboundForm && (
            <Surface style={styles.inlineForm} elevation={1}>
              <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                Vendor Dispatched to Central Hub
              </Text>
              <TextInput
                mode="outlined"
                label="Courier (DTDC, BlueDart, Maruti)"
                value={inboundCourier}
                onChangeText={setInboundCourier}
                style={styles.formInput}
              />
              <TextInput
                mode="outlined"
                label="Inbound AWB Number"
                value={inboundAwb}
                onChangeText={setInboundAwb}
                style={styles.formInput}
              />
              <View style={styles.formButtonRow}>
                <Button mode="text" onPress={() => setShowInboundForm(false)}>
                  Cancel
                </Button>
                <Button mode="contained" loading={loading} onPress={handleMarkInbound}>
                  Confirm Inbound
                </Button>
              </View>
            </Surface>
          )}

          {/* Delhivery COD Dispatch Unlock Status */}
          {isReceivedAtHub && (
            <Surface style={styles.hubReceivedBox} elevation={0}>
              <View style={styles.hubReceivedHeader}>
                <IconButton icon="check-decagram" size={24} iconColor="#006e36" style={{ margin: 0 }} />
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ fontWeight: 'bold', color: '#006e36' }}>
                    QC Verified & Received at Central Hub!
                  </Text>
                  <Text variant="bodySmall" style={{ color: '#333' }}>
                    Unlocked: Delhivery COD Direct Dispatch & Label Generation
                  </Text>
                </View>
              </View>
            </Surface>
          )}
        </View>
      )}

      {/* Central Hub Delhivery Dispatch Module (Unlocked on Hub Arrival or Direct Stock) */}
      {(isReceivedAtHub || packageItem.fulfillmentPath === 'CentralHubStock') && (
        <View style={styles.delhiverySection}>
          <Divider style={styles.divider} />
          <Text variant="labelSmall" style={styles.workflowTitle}>
            CENTRAL HUB DELHIVERY COD DISPATCH
          </Text>

          {!hasDelhiveryAwb ? (
            <View style={styles.delhiveryGenerateCard}>
              <View style={styles.weightRow}>
                <TextInput
                  mode="outlined"
                  label="Weight (Kg)"
                  value={weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="numeric"
                  style={styles.weightInput}
                />
                <View style={styles.dimsBadge}>
                  <Text style={styles.dimsText}>
                    Dims: {packageItem.dimensionsCm.length}x{packageItem.dimensionsCm.width}x{packageItem.dimensionsCm.height} cm
                  </Text>
                </View>
              </View>

              <Button
                mode="contained"
                icon="barcode-scan"
                buttonColor="#000000"
                textColor="#ffffff"
                loading={isGeneratingAwb}
                onPress={handleGenerateDelhiveryAwb}
                style={styles.generateAwbBtn}
              >
                1-Click Generate Delhivery AWB & Thermal Label
              </Button>
            </View>
          ) : (
            /* Delhivery AWB Generated State */
            <Surface style={styles.delhiveryActiveCard} elevation={1}>
              <View style={styles.awbHeaderRow}>
                <View>
                  <Text style={styles.awbTitle}>DELHIVERY AWB</Text>
                  <Text style={styles.awbNumber}>{packageItem.delhiveryAwbNumber}</Text>
                  <Text style={styles.routingText}>Route: {packageItem.delhiveryRoutingCode || 'BLR/HUB/01'}</Text>
                </View>

                {/* Thermal Label Action */}
                <Button
                  mode="contained"
                  icon="printer-pos"
                  buttonColor="#006e36"
                  textColor="#fff"
                  onPress={() => onOpenThermalLabel(packageItem)}
                  style={styles.labelBtn}
                >
                  Thermal Label
                </Button>
              </View>

              {/* Pickup Scheduler */}
              <View style={styles.pickupSection}>
                {packageItem.delhiveryPickupScheduled ? (
                  <View style={styles.pickupScheduledRow}>
                    <IconButton icon="calendar-check" size={18} iconColor="#006e36" style={{ margin: 0 }} />
                    <Text style={styles.pickupScheduledText}>
                      Pickup Scheduled: {packageItem.delhiveryPickupDate} ({packageItem.delhiveryPickupTimeSlot})
                    </Text>
                  </View>
                ) : showPickupScheduler ? (
                  <Surface style={styles.inlineForm} elevation={1}>
                    <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                      Schedule Delhivery Hub Pickup
                    </Text>
                    <TextInput
                      mode="outlined"
                      label="Pickup Date (YYYY-MM-DD)"
                      value={pickupDate}
                      onChangeText={setPickupDate}
                      style={styles.formInput}
                    />
                    <TextInput
                      mode="outlined"
                      label="Slot (e.g. 14:00 - 18:00)"
                      value={pickupSlot}
                      onChangeText={setPickupSlot}
                      style={styles.formInput}
                    />
                    <View style={styles.formButtonRow}>
                      <Button mode="text" onPress={() => setShowPickupScheduler(false)}>
                        Cancel
                      </Button>
                      <Button mode="contained" loading={loading} onPress={handleSchedulePickup}>
                        Confirm Pickup
                      </Button>
                    </View>
                  </Surface>
                ) : (
                  <Button
                    mode="outlined"
                    icon="calendar-clock"
                    onPress={() => setShowPickupScheduler(true)}
                    style={styles.schedulePickupBtn}
                  >
                    Schedule Delhivery Hub Pickup
                  </Button>
                )}
              </View>

              {/* Tracking Status & Share to Customer */}
              <Button
                mode="outlined"
                icon="whatsapp"
                textColor="#1b5e20"
                onPress={handleForwardTrackingCustomer}
                style={styles.shareDelhiveryBtn}
              >
                Forward Delhivery Tracking to Customer
              </Button>
            </Surface>
          )}
        </View>
      )}

      {/* Footer info: Tracking status */}
      <View style={styles.footerStatusRow}>
        <Text style={styles.footerStatusText} numberOfLines={1}>
          Status: {packageItem.currentTrackingStatus}
        </Text>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleCol: {
    flex: 1,
    marginRight: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  vendorName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  codBadgeContainer: {
    alignItems: 'flex-end',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  codBadgeTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#666',
  },
  codBadgeAmount: {
    fontSize: 16,
    fontWeight: '900',
  },
  codSubText: {
    fontSize: 9,
    color: '#888',
  },
  divider: {
    marginVertical: 12,
  },
  pathSelectorSection: {
    marginBottom: 10,
  },
  pathLabel: {
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 6,
  },
  pathButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pathBtn: {
    flex: 1,
    borderRadius: 10,
  },
  itemsSection: {
    marginTop: 6,
  },
  sectionHeader: {
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 6,
  },
  emptyItemsText: {
    fontStyle: 'italic',
    color: '#888',
    fontSize: 12,
    marginVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 10,
  },
  itemImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemCodAlloc: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#b71c1c',
  },
  workflowSection: {
    marginTop: 4,
  },
  workflowTitle: {
    fontWeight: '900',
    color: '#006e36',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  workflowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  workflowBtn: {
    flex: 1,
    borderRadius: 10,
  },
  inlineForm: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 10,
    gap: 8,
  },
  formInput: {
    fontSize: 12,
  },
  formButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  statusBox: {
    backgroundColor: '#e8f5e9',
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  statusBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  forwardCustomerBtn: {
    marginTop: 8,
    borderRadius: 8,
  },
  progressTracker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginVertical: 10,
  },
  stageStep: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    flex: 1,
    height: 3,
    marginHorizontal: 6,
    marginBottom: 14,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#444',
  },
  procurementActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  hubReceivedBox: {
    backgroundColor: '#e8f5e9',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  hubReceivedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  delhiverySection: {
    marginTop: 6,
  },
  delhiveryGenerateCard: {
    gap: 8,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weightInput: {
    flex: 1,
    fontSize: 12,
  },
  dimsBadge: {
    backgroundColor: '#eee',
    padding: 8,
    borderRadius: 8,
  },
  dimsText: {
    fontSize: 11,
    color: '#444',
  },
  generateAwbBtn: {
    borderRadius: 12,
    marginTop: 4,
  },
  delhiveryActiveCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  awbHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  awbTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#666',
  },
  awbNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  routingText: {
    fontSize: 11,
    color: '#006e36',
    fontWeight: 'bold',
  },
  labelBtn: {
    borderRadius: 8,
  },
  pickupSection: {
    marginTop: 4,
  },
  pickupScheduledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 6,
    borderRadius: 8,
  },
  pickupScheduledText: {
    fontSize: 11,
    color: '#1b5e20',
    fontWeight: '600',
  },
  schedulePickupBtn: {
    borderRadius: 8,
  },
  shareDelhiveryBtn: {
    borderRadius: 8,
  },
  footerStatusRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
  },
  footerStatusText: {
    fontSize: 11,
    color: '#777',
    fontStyle: 'italic',
  },
});

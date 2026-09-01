import React from 'react';
import { StyleSheet, View, Modal, ScrollView, Share, Platform } from 'react-native';
import { Surface, Text, Button, IconButton, useTheme, Divider, Chip } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { FulfillmentPackage, LogisticsOrder } from '@/types/logistics';

interface ThermalLabelModalProps {
  visible: boolean;
  onDismiss: () => void;
  order: LogisticsOrder;
  packageItem: FulfillmentPackage;
}

export const ThermalLabelModal: React.FC<ThermalLabelModalProps> = ({
  visible,
  onDismiss,
  order,
  packageItem,
}) => {
  const theme = useTheme();

  if (!visible) return null;

  const awb = packageItem.delhiveryAwbNumber || '14829103859201';
  const routing = packageItem.delhiveryRoutingCode || 'BLR/HSR/02';
  const isCod = order.paymentMode === 'COD' && packageItem.codAmount > 0;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Delhivery Shipping Label\nAWB: ${awb}\nOrder: ${order.orderNumber}\nCustomer: ${order.customerName}\nRouting: ${routing}\n${packageItem.delhiveryLabelPdfUrl ? `Download: ${packageItem.delhiveryLabelPdfUrl}` : ''}`,
        title: `Delhivery Label - ${awb}`,
      });
    } catch {
      // Ignore
    }
  };

  const handleCopyAwb = async () => {
    await Clipboard.setStringAsync(awb);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Surface
          style={[
            styles.sheet,
            {
              backgroundColor: (theme.colors as any).surfaceContainerHigh || theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={5}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <IconButton icon="printer-pos" size={24} iconColor={theme.colors.primary} style={styles.headerIcon} />
              <View>
                <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                  Thermal Shipping Label (4x6")
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Package #{packageItem.packageNumber} • {awb}
                </Text>
              </View>
            </View>
            <IconButton icon="close" size={22} onPress={onDismiss} />
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {/* 4x6 Thermal Label Paper Preview */}
            <View style={styles.labelWrapper}>
              <Surface style={styles.labelPaper} elevation={3}>
                {/* Delhivery Brand Row */}
                <View style={styles.labelTopRow}>
                  <View>
                    <Text style={styles.brandTitle}>DELHIVERY</Text>
                    <Text style={styles.brandSubtitle}>EXPRESS SURFACE</Text>
                  </View>
                  <View style={styles.routingBadge}>
                    <Text style={styles.routingCodeText}>{routing}</Text>
                    <Text style={styles.hubSubText}>CENTRAL HUB</Text>
                  </View>
                </View>

                <Divider style={styles.heavyDivider} />

                {/* Barcode Mockup */}
                <View style={styles.barcodeSection}>
                  <View style={styles.barcodeLines}>
                    {Array.from({ length: 42 }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.barcodeLine,
                          {
                            width: (i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1),
                            height: 48,
                            marginRight: (i % 4 === 0 ? 3 : 2),
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.awbText}>AWB: {awb}</Text>
                </View>

                <Divider style={styles.heavyDivider} />

                {/* Payment & COD Badge */}
                <View style={styles.codRow}>
                  <View style={styles.codBox}>
                    <Text style={styles.codLabel}>PAYMENT MODE</Text>
                    <Text style={[styles.codValue, { color: isCod ? '#b71c1c' : '#1b5e20' }]}>
                      {isCod ? 'CASH ON DELIVERY (COD)' : 'PREPAID'}
                    </Text>
                  </View>
                  {isCod && (
                    <View style={styles.collectBox}>
                      <Text style={styles.collectLabel}>COLLECT CASH</Text>
                      <Text style={styles.collectAmount}>₹{packageItem.codAmount.toLocaleString('en-IN')}</Text>
                    </View>
                  )}
                </View>

                <Divider style={styles.lightDivider} />

                {/* Consignee Shipping Address */}
                <View style={styles.addressSection}>
                  <Text style={styles.shipToHeader}>DELIVER TO (CONSIGNEE):</Text>
                  <Text style={styles.customerName}>{order.customerName}</Text>
                  <Text style={styles.customerPhone}>Phone: {order.customerPhone}</Text>
                  <Text style={styles.addressText}>{order.shippingAddress}</Text>
                  <Text style={styles.cityPincode}>
                    {order.shippingCity}, {order.shippingState} - <Text style={styles.boldPincode}>{order.shippingPincode}</Text>
                  </Text>
                </View>

                <Divider style={styles.lightDivider} />

                {/* Package Items & Vendor Breakdown */}
                <View style={styles.packageSummary}>
                  <Text style={styles.itemsHeader}>PACKAGE CONTENT ({packageItem.itemCount} item(s)):</Text>
                  {packageItem.items.map((it, idx) => (
                    <Text key={it.id || idx} style={styles.itemLine} numberOfLines={1}>
                      • {it.productName} ({it.sku || 'SKU-N/A'}) x{it.quantity} - ₹{it.totalPrice}
                    </Text>
                  ))}
                  <View style={styles.weightDimsRow}>
                    <Text style={styles.dimText}>Wt: {packageItem.weightKg} kg</Text>
                    <Text style={styles.dimText}>
                      Dims: {packageItem.dimensionsCm.length}x{packageItem.dimensionsCm.width}x{packageItem.dimensionsCm.height} cm
                    </Text>
                    <Text style={styles.dimText}>Order: {order.orderNumber}</Text>
                  </View>
                </View>

                <Divider style={styles.heavyDivider} />

                {/* Return To (Central Hub / Origin) */}
                <View style={styles.returnSection}>
                  <Text style={styles.returnHeader}>RETURN TO (ORIGIN):</Text>
                  <Text style={styles.returnText}>VAYYARI CENTRAL LOGISTICS HUB</Text>
                  <Text style={styles.returnAddress}>Plot 88, Electronic City Phase 1, Hosur Road, Bengaluru, KA - 560100</Text>
                  <Text style={styles.returnHelp}>Support: support@vayyari.com • +91 80 4912 0000</Text>
                </View>
              </Surface>
            </View>
          </ScrollView>

          {/* Action Bar */}
          <View style={styles.footerActions}>
            <Button
              mode="outlined"
              icon="content-copy"
              onPress={handleCopyAwb}
              style={styles.actionBtn}
            >
              Copy AWB
            </Button>
            <Button
              mode="outlined"
              icon="share-variant"
              onPress={handleShare}
              style={styles.actionBtn}
            >
              Share / Print
            </Button>
            <Button
              mode="contained"
              icon="check"
              onPress={onDismiss}
              style={styles.doneBtn}
            >
              Done
            </Button>
          </View>
        </Surface>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    padding: 18,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    margin: 0,
  },
  title: {
    fontWeight: 'bold',
  },
  scrollArea: {
    marginVertical: 6,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  labelWrapper: {
    width: '100%',
    maxWidth: 380,
  },
  labelPaper: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1e1e1e',
    padding: 14,
  },
  labelTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555',
  },
  routingBadge: {
    backgroundColor: '#000',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  routingCodeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  hubSubText: {
    color: '#bbb',
    fontSize: 8,
    fontWeight: '600',
  },
  heavyDivider: {
    height: 2,
    backgroundColor: '#000',
    marginVertical: 8,
  },
  lightDivider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 8,
  },
  barcodeSection: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  barcodeLines: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  barcodeLine: {
    backgroundColor: '#000',
  },
  awbText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
    fontSize: 13,
    color: '#000',
    marginTop: 4,
    letterSpacing: 1.2,
  },
  codRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  codBox: {
    flex: 1,
  },
  codLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#666',
  },
  codValue: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  collectBox: {
    alignItems: 'flex-end',
  },
  collectLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#666',
  },
  collectAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#b71c1c',
  },
  addressSection: {
    paddingVertical: 4,
  },
  shipToHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  customerPhone: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222',
    marginVertical: 1,
  },
  addressText: {
    fontSize: 11,
    color: '#333',
    lineHeight: 15,
  },
  cityPincode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    marginTop: 2,
  },
  boldPincode: {
    fontSize: 14,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  packageSummary: {
    paddingVertical: 2,
  },
  itemsHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 2,
  },
  itemLine: {
    fontSize: 10,
    color: '#222',
  },
  weightDimsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  dimText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
  },
  returnSection: {
    paddingTop: 2,
  },
  returnHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#444',
  },
  returnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  returnAddress: {
    fontSize: 9,
    color: '#444',
  },
  returnHelp: {
    fontSize: 8,
    color: '#777',
    marginTop: 2,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
  },
  doneBtn: {
    borderRadius: 12,
    paddingHorizontal: 8,
  },
});

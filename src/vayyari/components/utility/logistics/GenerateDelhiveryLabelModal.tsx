import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, IconButton, Surface, TextInput, Portal, Modal, Chip, ActivityIndicator, useTheme } from 'react-native-paper';
import { logisticsService } from '@/services/logistics.service';
import { vendorService } from '@/services/vendorService';
import { searchApiClient } from '@/api/client';
import { Warehouse } from '@/types/logistics';

export interface GenerateDelhiveryLabelModalProps {
  visible: boolean;
  onDismiss: () => void;
  orderGrpId: string;
  vendorName: string;
  itemsCount: number;
  isCod: boolean;
  groupTotal: number;
  customerAddress?: string;
  onSuccess: (data: { awbNumber: string; labelUrl: string }) => void;
}

export function GenerateDelhiveryLabelModal({
  visible,
  onDismiss,
  orderGrpId,
  vendorName,
  itemsCount,
  isCod,
  groupTotal,
  customerAddress,
  onSuccess,
}: GenerateDelhiveryLabelModalProps) {
  const theme = useTheme();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  // Form states initialized with business rules
  const [shippingMode, setShippingMode] = useState<'Surface' | 'Express'>('Surface');
  const [weightGrams, setWeightGrams] = useState<string>((Math.max(1, itemsCount) * 400).toString());
  const [generating, setGenerating] = useState(false);
  const [warehousePickerVisible, setWarehousePickerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      loadInitialData();
      setWeightGrams((Math.max(1, itemsCount) * 400).toString());
    }
  }, [visible, vendorName, itemsCount]);

  const loadInitialData = async () => {
    try {
      setLoadingWarehouses(true);
      const [whList, vendorsData] = await Promise.all([
        logisticsService.getWarehouses(),
        vendorService.listVendors(1, 100).catch(() => ({ vendors: [] })),
      ]);

      setWarehouses(whList || []);

      // Check if vendor has mapped warehouse
      const matchedVendor = vendorsData.vendors?.find(
        (v) => v.vendorName?.trim().toLowerCase() === vendorName.trim().toLowerCase()
      );

      let initialWh: Warehouse | undefined;

      if (matchedVendor?.defaultWarehouseId) {
        initialWh = whList?.find((w) => w.id === matchedVendor.defaultWarehouseId);
      }

      if (!initialWh && whList?.length) {
        // Fallback to Central Hub or first warehouse
        initialWh = whList.find((w) => w.isCentral) || whList[0];
      }

      setSelectedWarehouse(initialWh || null);
    } catch (err) {
      console.error('Failed to load logistics data for label generation', err);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedWarehouse) {
      Alert.alert('Validation Error', 'Please select a pickup facility.');
      return;
    }

    const parsedWeight = parseInt(weightGrams, 10);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid weight in grams.');
      return;
    }

    try {
      setGenerating(true);

      const requestPayload = {
        pickupLocation: selectedWarehouse.code || selectedWarehouse.name,
        shippingMode,
        weightGrams: parsedWeight,
        lengthCm: 40.0,
        widthCm: 25.0,
        heightCm: 3.0,
      };

      const res: any = await searchApiClient.post(
        `/api/v1/orderid/groups/${orderGrpId}/label`,
        requestPayload
      );

      if (res?.awbNumber) {
        Alert.alert(
          'Label Generated',
          `Delhivery shipping label generated successfully!\nAWB: ${res.awbNumber}\nPickup Facility: ${selectedWarehouse.name}`
        );
        onSuccess({
          awbNumber: res.awbNumber,
          labelUrl: res.labelUrl,
        });
        onDismiss();
      } else {
        throw new Error(res?.message || 'Failed to generate AWB');
      }
    } catch (err: any) {
      console.error('Failed to generate Delhivery label', err);
      Alert.alert('Delhivery Generation Error', err?.message || 'Could not manifest shipment with Delhivery.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContent}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Generate Delhivery Label
              </Text>
              <Text variant="bodySmall" style={styles.modalSubtitle}>
                Package: {orderGrpId} ({itemsCount} items)
              </Text>
            </View>
            <IconButton icon="close" size={20} onPress={onDismiss} />
          </View>

          {/* Pickup Facility Selector */}
          <Text variant="labelLarge" style={styles.sectionLabel}>
            Pickup Facility (Delhivery Warehouse)
          </Text>
          {loadingWarehouses ? (
            <ActivityIndicator size="small" style={{ marginVertical: 12 }} />
          ) : selectedWarehouse ? (
            <Surface style={styles.facilityCard} elevation={0}>
              <View style={styles.facilityCardContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Surface style={styles.codeBadge} elevation={0}>
                    <Text style={styles.codeText}>{selectedWarehouse.code}</Text>
                  </Surface>
                  <Text variant="titleSmall" style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>
                    {selectedWarehouse.name}
                  </Text>
                </View>
                <Button
                  mode="text"
                  compact
                  onPress={() => setWarehousePickerVisible(true)}
                  labelStyle={{ fontSize: 12 }}
                >
                  Change
                </Button>
              </View>
              <Text variant="bodySmall" style={styles.facilityAddress}>
                {selectedWarehouse.city}, {selectedWarehouse.state} ({selectedWarehouse.pincode})
              </Text>
            </Surface>
          ) : (
            <Button
              mode="outlined"
              icon="warehouse"
              onPress={() => setWarehousePickerVisible(true)}
              style={styles.selectFacilityBtn}
            >
              Select Pickup Facility
            </Button>
          )}

          {/* Shipping Mode */}
          <Text variant="labelLarge" style={styles.sectionLabel}>
            Shipping Mode
          </Text>
          <View style={styles.modeRow}>
            <Chip
              selected={shippingMode === 'Surface'}
              onPress={() => setShippingMode('Surface')}
              style={[styles.modeChip, shippingMode === 'Surface' && styles.modeChipActive]}
              textStyle={shippingMode === 'Surface' ? styles.modeTextActive : undefined}
              icon="truck"
            >
              Surface (Standard)
            </Chip>
            <Chip
              selected={shippingMode === 'Express'}
              onPress={() => setShippingMode('Express')}
              style={[styles.modeChip, shippingMode === 'Express' && styles.modeChipActive]}
              textStyle={shippingMode === 'Express' ? styles.modeTextActive : undefined}
              icon="airplane"
            >
              Express (Air)
            </Chip>
          </View>

          {/* Package Weight & Dimensions */}
          <View style={styles.twoColRow}>
            <View style={[styles.flex1, { marginRight: 8 }]}>
              <Text variant="labelLarge" style={styles.sectionLabel}>
                Weight (Grams)
              </Text>
              <TextInput
                value={weightGrams}
                onChangeText={setWeightGrams}
                mode="outlined"
                keyboardType="numeric"
                right={<TextInput.Affix text="g" />}
                style={styles.input}
              />
              <Text variant="bodySmall" style={styles.hintText}>
                400g/item default ({itemsCount} items)
              </Text>
            </View>

            <View style={[styles.flex1, { marginLeft: 8 }]}>
              <Text variant="labelLarge" style={styles.sectionLabel}>
                Package Box / Cover
              </Text>
              <Surface style={styles.presetBox} elevation={0}>
                <Text style={styles.presetTitle}>Plastic Cover</Text>
                <Text style={styles.presetSub}>40 × 25 × 3 cm</Text>
              </Surface>
              <Text variant="bodySmall" style={styles.hintText}>
                Standard apparel envelope
              </Text>
            </View>
          </View>

          {/* Payment & Collectible */}
          <Surface style={styles.paymentInfoCard} elevation={0}>
            <View style={styles.paymentRow}>
              <Text variant="bodySmall" style={{ color: '#475569' }}>Payment Mode:</Text>
              <Chip
                compact
                style={{ backgroundColor: isCod ? '#FEF3C7' : '#DCFCE7', height: 22 }}
                textStyle={{ fontSize: 10, fontWeight: '700', color: isCod ? '#B45309' : '#15803D' }}
              >
                {isCod ? 'CASH ON DELIVERY (COD)' : 'PREPAID'}
              </Chip>
            </View>
            <View style={styles.paymentRow}>
              <Text variant="bodySmall" style={{ color: '#475569' }}>Collectible Amount:</Text>
              <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                ₹{isCod ? groupTotal.toLocaleString('en-IN') : '0'}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text variant="bodySmall" style={{ color: '#475569' }}>Pickup Window:</Text>
              <Text style={{ fontSize: 11, color: '#0369A1', fontWeight: '600' }}>
                Next Evening Slot (14:00 - 18:00)
              </Text>
            </View>
          </Surface>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={onDismiss} style={{ marginRight: 8 }} disabled={generating}>
              Cancel
            </Button>
            <Button
              mode="contained"
              icon="barcode-scan"
              onPress={handleGenerate}
              loading={generating}
              disabled={generating || !selectedWarehouse}
            >
              Generate Label & AWB
            </Button>
          </View>
        </ScrollView>

        {/* Warehouse Selection Sub-Modal */}
        {warehousePickerVisible && (
          <Portal>
            <Modal
              visible={warehousePickerVisible}
              onDismiss={() => setWarehousePickerVisible(false)}
              contentContainerStyle={styles.pickerModalContent}
            >
              <View style={styles.pickerHeader}>
                <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                  Select Pickup Warehouse
                </Text>
                <IconButton icon="close" size={20} onPress={() => setWarehousePickerVisible(false)} />
              </View>

              <ScrollView style={{ maxHeight: 300 }}>
                {warehouses.map((wh) => {
                  const isSelected = selectedWarehouse?.id === wh.id;
                  return (
                    <TouchableOpacity
                      key={wh.id}
                      onPress={() => {
                        setSelectedWarehouse(wh);
                        setWarehousePickerVisible(false);
                      }}
                      style={[
                        styles.whOptionItem,
                        isSelected && styles.whOptionItemSelected,
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Surface style={styles.codeBadge} elevation={0}>
                          <Text style={styles.codeText}>{wh.code}</Text>
                        </Surface>
                        <Text style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>
                          {wh.name}
                        </Text>
                        {wh.isCentral && (
                          <Chip compact style={{ backgroundColor: '#FEF3C7', height: 20 }} textStyle={{ fontSize: 9, color: '#B45309', fontWeight: '700' }}>
                            CENTRAL
                          </Chip>
                        )}
                      </View>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                        {wh.city}, {wh.state} ({wh.pincode})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Modal>
          </Portal>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    color: '#64748B',
    marginTop: 2,
  },
  sectionLabel: {
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
    marginBottom: 6,
  },
  facilityCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  facilityCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  facilityAddress: {
    color: '#475569',
    marginTop: 2,
  },
  selectFacilityBtn: {
    borderRadius: 8,
  },
  codeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  codeText: {
    color: '#1D4ED8',
    fontFamily: 'monospace',
    fontWeight: '700',
    fontSize: 11,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  modeChipActive: {
    backgroundColor: '#0284C7',
  },
  modeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  twoColRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flex1: {
    flex: 1,
  },
  input: {
    backgroundColor: '#FFFFFF',
    height: 44,
  },
  hintText: {
    color: '#94A3B8',
    marginTop: 2,
    fontSize: 10,
  },
  presetBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    padding: 8,
    height: 48,
    justifyContent: 'center',
  },
  presetTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  presetSub: {
    fontSize: 11,
    color: '#64748B',
  },
  paymentInfoCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 14,
    gap: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    margin: 24,
    padding: 16,
    borderRadius: 12,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  whOptionItem: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  whOptionItemSelected: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
  },
});

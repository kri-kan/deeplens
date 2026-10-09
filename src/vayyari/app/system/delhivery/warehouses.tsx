import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Button, TextInput, Portal, Modal, Switch } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { logisticsService } from '@/services/logistics.service';
import { Warehouse, CreateWarehouseRequest, UpdateWarehouseRequest } from '@/types/logistics';
import {
  DelhiveryWarehousesView,
  DelhiveryWarehouseItem,
} from '@/components/logistics';

export default function DelhiveryWarehousesScreen() {
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<DelhiveryWarehouseItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [isCentral, setIsCentral] = useState(false);
  const [syncWithDelhivery, setSyncWithDelhivery] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await logisticsService.getWarehouses();
      setWarehouses(data || []);
    } catch (error) {
      console.error('Failed to load warehouses', error);
      Alert.alert('Error', 'Failed to load Delhivery warehouses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await logisticsService.syncWarehouses();
      setWarehouses(res.warehouses || []);
      const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncedAt(formattedTime);
      Alert.alert(
        'Warehouse Registry Synced',
        `Loaded ${res.warehouses?.length || 0} facilities.\n\nNote: Delhivery's external API does not allow bulk GET listing of portal warehouses. Add or register your facilities here with their exact Delhivery pickup name to auto-map them to vendors.`
      );
    } catch (error: any) {
      console.error('Failed to sync warehouses', error);
      Alert.alert('Sync Failed', error?.message || 'Failed to sync warehouses from Delhivery');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = (id: string, facilityName: string) => {
    Alert.alert(
      'Delete Facility',
      `Are you sure you want to remove "${facilityName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await logisticsService.deleteWarehouse(id);
              await fetchData();
              Alert.alert('Deleted', 'Warehouse facility removed successfully.');
            } catch (err: any) {
              Alert.alert('Delete Failed', err?.message || 'Could not delete warehouse.');
            }
          },
        },
      ]
    );
  };

  const handleOpenCreate = () => {
    setEditingWarehouse(null);
    setName('');
    setCode('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('');
    setPincode('');
    setPhone('');
    setContactPerson('');
    setIsCentral(false);
    setSyncWithDelhivery(true);
    setModalVisible(true);
  };

  const handleOpenEdit = (w: DelhiveryWarehouseItem) => {
    setEditingWarehouse(w);
    setName(w.name || '');
    setCode(w.code || '');
    setAddressLine1(w.addressLine1 || w.address_line1 || '');
    setAddressLine2(w.addressLine2 || w.address_line2 || '');
    setCity(w.city || '');
    setState(w.state || '');
    setPincode(w.pincode || '');
    setPhone(w.phone || '');
    setContactPerson(w.contactPerson || w.contact_person || '');
    setIsCentral(!!(w.isCentral ?? w.is_central));
    setSyncWithDelhivery(true);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Facility name is required');
      return;
    }
    if (!code.trim()) {
      Alert.alert('Validation Error', 'Facility code is required');
      return;
    }
    if (!addressLine1.trim() || !city.trim() || !state.trim() || !pincode.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Address Line 1, City, State, Pincode, and Phone are required.');
      return;
    }

    try {
      setSaving(true);
      if (editingWarehouse) {
        const updateReq: UpdateWarehouseRequest = {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          phone: phone.trim(),
          contactPerson: contactPerson.trim() || undefined,
          isCentral,
          updateDelhivery: syncWithDelhivery,
        };
        await logisticsService.updateWarehouse(editingWarehouse.id, updateReq);
      } else {
        const createReq: CreateWarehouseRequest = {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          phone: phone.trim(),
          contactPerson: contactPerson.trim() || undefined,
          isCentral,
          registerWithDelhivery: syncWithDelhivery,
        };
        await logisticsService.createWarehouse(createReq);
      }

      setModalVisible(false);
      await fetchData();
      Alert.alert('Success', `Warehouse ${editingWarehouse ? 'updated' : 'registered'} successfully.`);
    } catch (error: any) {
      console.error('Failed to save warehouse', error);
      Alert.alert('Error', error?.message || 'Failed to save warehouse details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper 
      title="Delhivery Warehouses" 
      subtitle="Pickup facilities & fulfillment locations"
      onBack={() => router.back()}
      withScrollView={false}
    >
      <View style={styles.container}>
        {/* Tamagui DelhiveryWarehousesView Organism */}
        <DelhiveryWarehousesView
          warehouses={warehouses}
          loading={loading}
          syncing={syncing}
          lastSyncedAt={lastSyncedAt}
          onSync={handleSync}
          onAddFacility={handleOpenCreate}
          onEditFacility={handleOpenEdit}
          onDeleteFacility={(w) => handleDelete(w.id, w.name)}
          onRefresh={fetchData}
          showHeaderTitle={false}
        />

        {/* Create / Edit Facility Modal */}
        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={() => setModalVisible(false)}
            contentContainerStyle={styles.modalContent}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text variant="titleLarge" style={styles.modalTitle}>
                {editingWarehouse ? 'Edit Warehouse Facility' : 'Register New Warehouse'}
              </Text>
              <Text variant="bodySmall" style={styles.modalSubtitle}>
                Registered facilities will be available for pickup scheduling and vendor mapping.
              </Text>

              <TextInput
                label="Facility Code (e.g. SURAT_HUB, HYD_CENTRAL) *"
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                mode="outlined"
                style={styles.input}
                autoCapitalize="characters"
              />

              <TextInput
                label="Facility Name *"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                placeholder="e.g. Surat Heritage Silks Dispatch Hub"
              />

              <TextInput
                label="Address Line 1 *"
                value={addressLine1}
                onChangeText={setAddressLine1}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Address Line 2 (Optional)"
                value={addressLine2}
                onChangeText={setAddressLine2}
                mode="outlined"
                style={styles.input}
              />

              <View style={styles.twoColRow}>
                <TextInput
                  label="City *"
                  value={city}
                  onChangeText={setCity}
                  mode="outlined"
                  style={[styles.input, styles.flex1, { marginRight: 8 }]}
                />
                <TextInput
                  label="State *"
                  value={state}
                  onChangeText={setState}
                  mode="outlined"
                  style={[styles.input, styles.flex1]}
                />
              </View>

              <View style={styles.twoColRow}>
                <TextInput
                  label="Pincode (6 digits) *"
                  value={pincode}
                  onChangeText={setPincode}
                  mode="outlined"
                  keyboardType="numeric"
                  maxLength={6}
                  style={[styles.input, styles.flex1, { marginRight: 8 }]}
                />
                <TextInput
                  label="Phone Number *"
                  value={phone}
                  onChangeText={setPhone}
                  mode="outlined"
                  keyboardType="phone-pad"
                  style={[styles.input, styles.flex1]}
                />
              </View>

              <TextInput
                label="Contact Person Name"
                value={contactPerson}
                onChangeText={setContactPerson}
                mode="outlined"
                style={styles.input}
                placeholder="e.g. Rajesh Patel"
              />

              {/* Switches */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall">Central Hub</Text>
                  <Text variant="bodySmall" style={{ color: '#64748B' }}>
                    Mark as primary warehouse for stock & hub-and-spoke routing
                  </Text>
                </View>
                <Switch value={isCentral} onValueChange={setIsCentral} color="#0284C7" />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall">Sync with Delhivery API</Text>
                  <Text variant="bodySmall" style={{ color: '#64748B' }}>
                    Automatically register/update facility at Delhivery gateway
                  </Text>
                </View>
                <Switch value={syncWithDelhivery} onValueChange={setSyncWithDelhivery} color="#0284C7" />
              </View>

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <Button 
                  mode="outlined" 
                  onPress={() => setModalVisible(false)} 
                  style={{ marginRight: 8 }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handleSave} 
                  loading={saving}
                  disabled={saving}
                >
                  {editingWarehouse ? 'Update Facility' : 'Register Facility'}
                </Button>
              </View>
            </ScrollView>
          </Modal>
        </Portal>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    maxHeight: '85%',
  },
  modalTitle: {
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#64748B',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  twoColRow: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
});

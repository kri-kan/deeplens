import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView, RefreshControl } from 'react-native';
import { Text, Button, IconButton, Surface, TextInput, Portal, Modal, Chip, Switch, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { logisticsService } from '@/services/logistics.service';
import { Warehouse, CreateWarehouseRequest, UpdateWarehouseRequest } from '@/types/logistics';

export default function DelhiveryWarehousesScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
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

  const handleOpenEdit = (w: Warehouse) => {
    setEditingWarehouse(w);
    setName(w.name || '');
    setCode(w.code || '');
    setAddressLine1(w.addressLine1 || '');
    setAddressLine2(w.addressLine2 || '');
    setCity(w.city || '');
    setState(w.state || '');
    setPincode(w.pincode || '');
    setPhone(w.phone || '');
    setContactPerson(w.contactPerson || '');
    setIsCentral(w.isCentral || false);
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
          updateDelhivery: syncWithDelhivery
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
          registerWithDelhivery: syncWithDelhivery
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
        {/* Top Control Bar */}
        <Surface style={styles.controlBar} elevation={1}>
          <View style={styles.controlBarLeft}>
            <Text variant="titleSmall" style={styles.controlBarTitle}>
              {warehouses.length} {warehouses.length === 1 ? 'Facility' : 'Facilities'}
            </Text>
            {lastSyncedAt && (
              <Text variant="bodySmall" style={styles.lastSyncedText}>
                Last synced at {lastSyncedAt}
              </Text>
            )}
          </View>
          <View style={styles.controlBarActions}>
            <Button
              mode="contained-tonal"
              icon={syncing ? undefined : "cloud-sync"}
              onPress={handleSync}
              loading={syncing}
              disabled={syncing}
              style={styles.syncBtn}
              compact
            >
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
            <Button
              mode="contained"
              icon="plus"
              onPress={handleOpenCreate}
              style={styles.addBtn}
              compact
            >
              Add Facility
            </Button>
          </View>
        </Surface>

        {/* Notice Card */}
        <Surface style={styles.noticeCard} elevation={0}>
          <IconButton icon="information-outline" size={20} iconColor="#0284C7" style={{ margin: 0 }} />
          <View style={{ flex: 1, paddingRight: 4 }}>
            <Text variant="labelSmall" style={{ color: '#0369A1', fontWeight: '700' }}>
              DELHIVERY PICKUP FACILITIES DIRECTORY
            </Text>
            <Text variant="bodySmall" style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
              Delhivery does not allow public GET export of portal warehouses via API. Register new facilities here or add existing pickup locations by code/name to auto-map with vendors.
            </Text>
          </View>
        </Surface>

        {/* Warehouses List */}
        <FlatList
          data={warehouses}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Surface style={styles.card} elevation={2}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.codeRow}>
                    <Surface style={styles.codeBadge} elevation={0}>
                      <Text style={styles.codeText}>{item.code}</Text>
                    </Surface>
                    {item.isCentral && (
                      <Chip 
                        style={styles.centralChip} 
                        textStyle={styles.centralChipText} 
                        compact 
                        icon="star"
                      >
                        CENTRAL HUB
                      </Chip>
                    )}
                  </View>
                  <Text variant="titleMedium" style={styles.warehouseName}>
                    {item.name}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <IconButton
                    icon="pencil-outline"
                    size={20}
                    onPress={() => handleOpenEdit(item)}
                  />
                  <IconButton
                    icon="delete-outline"
                    size={20}
                    iconColor="#EF4444"
                    onPress={() => handleDelete(item.id, item.name)}
                  />
                </View>
              </View>

              <View style={styles.addressBox}>
                <Text variant="bodyMedium" style={styles.addressLine}>
                  {item.addressLine1}
                  {item.addressLine2 ? `, ${item.addressLine2}` : ''}
                </Text>
                <Text variant="bodyMedium" style={styles.cityLine}>
                  {item.city}, {item.state} - <Text style={styles.pincode}>{item.pincode}</Text>
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.metaCol}>
                  <View style={styles.metaRow}>
                    <IconButton icon="account-outline" size={16} style={styles.tinyIcon} />
                    <Text variant="bodySmall" style={styles.metaText}>
                      {item.contactPerson || 'Ops Incharge'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <IconButton icon="phone-outline" size={16} style={styles.tinyIcon} />
                    <Text variant="bodySmall" style={styles.metaText}>
                      {item.phone || 'No phone'}
                    </Text>
                  </View>
                </View>

                <Chip 
                  style={styles.delhiveryBadge} 
                  textStyle={styles.delhiveryBadgeText} 
                  compact 
                  icon="truck-fast-outline"
                >
                  Delhivery Registered
                </Chip>
              </View>
            </Surface>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <IconButton icon="warehouse" size={48} iconColor="#94A3B8" />
                <Text variant="titleMedium" style={styles.emptyTitle}>No Warehouses Found</Text>
                <Text variant="bodySmall" style={styles.emptySubtitle}>
                  Add your first fulfillment facility or sync existing hubs from Delhivery.
                </Text>
                <Button 
                  mode="contained" 
                  icon="plus" 
                  onPress={handleOpenCreate} 
                  style={{ marginTop: 16 }}
                >
                  Add Warehouse
                </Button>
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 12, color: '#64748B' }}>Loading warehouses...</Text>
              </View>
            )
          }
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
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  controlBarLeft: {
    flex: 1,
  },
  controlBarTitle: {
    fontWeight: '700',
    color: '#0F172A',
  },
  lastSyncedText: {
    color: '#64748B',
    marginTop: 2,
  },
  controlBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncBtn: {
    borderRadius: 8,
  },
  addBtn: {
    borderRadius: 8,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 10,
    gap: 8,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  codeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  codeText: {
    color: '#1D4ED8',
    fontFamily: 'monospace',
    fontWeight: '700',
    fontSize: 12,
  },
  centralChip: {
    backgroundColor: '#FEF3C7',
    height: 24,
  },
  centralChipText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '700',
  },
  warehouseName: {
    fontWeight: '600',
    color: '#0F172A',
  },
  addressBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  addressLine: {
    color: '#334155',
  },
  cityLine: {
    color: '#475569',
    marginTop: 2,
  },
  pincode: {
    fontWeight: '700',
    color: '#0F172A',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metaCol: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tinyIcon: {
    margin: 0,
    width: 20,
    height: 20,
  },
  metaText: {
    color: '#64748B',
  },
  delhiveryBadge: {
    backgroundColor: '#F0FDF4',
    height: 24,
  },
  delhiveryBadgeText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  emptySubtitle: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
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

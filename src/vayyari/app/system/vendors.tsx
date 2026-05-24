import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, IconButton, Surface, TextInput, Portal, Modal, Switch } from 'react-native-paper';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { vendorService } from '@/services/vendorService';
import { VendorResponse } from '@/types/vendors';

export default function VendorManagement() {
  const [vendors, setVendors] = useState<VendorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Partial<VendorResponse>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await vendorService.listVendors(1, 100);
      setVendors(res.vendors || []);
    } catch (error) {
      console.error('Failed to fetch vendors', error);
      Alert.alert('Error', 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!editingVendor.vendorName) return;
    try {
      if (editingVendor.id) {
        await vendorService.updateVendor(editingVendor.id, editingVendor);
      } else {
        await vendorService.createVendor(editingVendor);
      }
      setEditModal(false);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save vendor');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Are you sure you want to deactivate this vendor?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await vendorService.deleteVendor(id);
          fetchData();
        } catch (error) {
          Alert.alert('Error', 'Failed to delete');
        }
      }}
    ]);
  };

  return (
    <ScreenWrapper title="Vendor Management" withScrollView={false}>
      <View style={styles.container}>
        <Button 
          mode="contained" 
          icon="plus" 
          onPress={() => { setEditingVendor({ isActive: true }); setEditModal(true); }}
          style={styles.addBtn}
        >
          Add New Vendor
        </Button>

        <FlatList
          data={vendors}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={fetchData}
          renderItem={({ item }) => (
            <Surface style={[styles.card, !item.isActive && styles.inactiveCard]} elevation={1}>
              <View style={styles.details}>
                <Text variant="titleMedium">{item.vendorName} {item.vendorCode ? `(${item.vendorCode})` : ''}</Text>
                <Text variant="bodySmall" style={styles.subtitle}>
                  {item.email || 'No email provided'} {item.isActive ? '' : '(Inactive)'}
                </Text>
              </View>
              <View style={styles.actions}>
                <IconButton icon="pencil" onPress={() => { setEditingVendor(item); setEditModal(true); }} />
                {item.isActive && (
                  <IconButton icon="delete" onPress={() => handleDelete(item.id)} iconColor="red" />
                )}
              </View>
            </Surface>
          )}
          ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No vendors found</Text> : null}
        />

        <Portal>
          <Modal visible={editModal} onDismiss={() => setEditModal(false)} contentContainerStyle={styles.modal}>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {editingVendor.id ? 'Edit Vendor' : 'New Vendor'}
            </Text>
            
            <TextInput
              label="Vendor Name *"
              value={editingVendor.vendorName || ''}
              onChangeText={(t) => setEditingVendor({ ...editingVendor, vendorName: t })}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Vendor Code"
              value={editingVendor.vendorCode || ''}
              onChangeText={(t) => setEditingVendor({ ...editingVendor, vendorCode: t })}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Email"
              value={editingVendor.email || ''}
              onChangeText={(t) => setEditingVendor({ ...editingVendor, email: t })}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {editingVendor.id && (
              <View style={styles.switchContainer}>
                <Text variant="bodyLarge">Is Active</Text>
                <Switch
                  value={editingVendor.isActive}
                  onValueChange={(val) => setEditingVendor({ ...editingVendor, isActive: val })}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <Button onPress={() => setEditModal(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleSave} disabled={!editingVendor.vendorName}>Save Changes</Button>
            </View>
          </Modal>
        </Portal>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  addBtn: {
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  inactiveCard: {
    opacity: 0.6,
  },
  details: {
    flex: 1,
  },
  subtitle: {
    opacity: 0.6,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
  },
  modal: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 16,
  },
  modalTitle: {
    marginBottom: 20,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.5,
  }
});

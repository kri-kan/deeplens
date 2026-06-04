import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Modal, Portal, Card, Chip, IconButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { vendorService } from '@/services/vendorService';
import { VendorResponse, VendorAddressResponse } from '@/types/vendors';
import { ManageAddressModal } from '../customer/ManageAddressModal';

interface VendorAddressesModalProps {
  visible: boolean;
  onDismiss: () => void;
  vendor: VendorResponse | null;
}

export const VendorAddressesModal: React.FC<VendorAddressesModalProps> = ({
  visible,
  onDismiss,
  vendor,
}) => {
  const theme = useTheme();
  const [addresses, setAddresses] = useState<VendorAddressResponse[]>([]);
  const [loading, setLoading] = useState(false);

  // Address edit modal state
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState<VendorAddressResponse | null>(null);

  const fetchAddresses = async () => {
    if (!vendor) return;
    setLoading(true);
    try {
      const data = await vendorService.getVendorAddresses(vendor.id);
      setAddresses(data);
    } catch (error) {
      console.error('Failed to fetch vendor addresses:', error);
      Alert.alert('Error', 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && vendor) {
      fetchAddresses();
    }
  }, [visible, vendor]);

  const handleAddAddress = () => {
    setAddressToEdit(null);
    setManageModalVisible(true);
  };

  const handleEditAddress = (address: VendorAddressResponse) => {
    setAddressToEdit(address);
    setManageModalVisible(true);
  };

  const handleDeleteAddress = (addressId: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await vendorService.deleteVendorAddress(addressId);
            fetchAddresses();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete address');
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (addressId: string) => {
    if (!vendor) return;
    try {
      await vendorService.setDefaultAddress(vendor.id, addressId);
      fetchAddresses();
    } catch (error) {
      Alert.alert('Error', 'Failed to set default address');
    }
  };

  if (!vendor) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.elevation.level3 }]}
      >
        <View style={[styles.handle, { backgroundColor: theme.colors.onSurfaceVariant }]} />
        
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="headlineSmall" style={styles.title}>Vendor Addresses</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {vendor.vendorName}
            </Text>
          </View>
          <Button icon="plus" mode="contained" onPress={handleAddAddress} style={styles.addBtn}>
            Add New
          </Button>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {loading ? (
            <ActivityIndicator size="small" style={{ marginVertical: 32 }} />
          ) : addresses.length > 0 ? (
            addresses.map((addr) => (
              <Card key={addr.id} style={styles.addressCard} mode="outlined">
                <Card.Content>
                  <View style={styles.addressTitleRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Text variant="titleSmall" style={styles.bold} numberOfLines={1}>
                        {addr.name}
                      </Text>
                      {addr.isDefault && (
                        <Chip style={[styles.defaultChip, { marginLeft: 8 }]} textStyle={styles.defaultChipText} compact>
                          DEFAULT
                        </Chip>
                      )}
                    </View>
                    <View style={styles.actionButtons}>
                      {!addr.isDefault && (
                        <IconButton
                          icon="star-outline"
                          size={18}
                          onPress={() => handleSetDefault(addr.id)}
                          style={styles.actionBtn}
                        />
                      )}
                      <IconButton
                        icon="pencil-outline"
                        size={18}
                        onPress={() => handleEditAddress(addr)}
                        style={styles.actionBtn}
                      />
                      <IconButton
                        icon="delete-outline"
                        size={18}
                        iconColor={theme.colors.error}
                        onPress={() => handleDeleteAddress(addr.id)}
                        style={styles.actionBtn}
                      />
                    </View>
                  </View>
                  <Text variant="bodySmall" style={styles.addressText}>{addr.phone}</Text>
                  <Text variant="bodySmall" style={styles.addressText}>{addr.line1}</Text>
                  {addr.line2 && <Text variant="bodySmall" style={styles.addressText}>{addr.line2}</Text>}
                  <Text variant="bodySmall" style={styles.addressText}>
                    PIN: {addr.pincode}
                  </Text>
                </Card.Content>
              </Card>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text variant="bodySmall" style={{ opacity: 0.5 }}>No addresses added yet.</Text>
            </View>
          )}
        </ScrollView>
        
        <Button mode="outlined" onPress={onDismiss} style={styles.closeBtn}>
          Close
        </Button>
      </Modal>

      {/* Address creation/edit modal */}
      <ManageAddressModal
        visible={manageModalVisible}
        onDismiss={() => {
          setManageModalVisible(false);
          setAddressToEdit(null);
        }}
        entityId={vendor.id}
        entityType="vendor"
        addressToEdit={addressToEdit}
        onSuccess={() => {
          fetchAddresses();
        }}
      />
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    padding: 24,
    paddingBottom: 24,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontWeight: 'bold',
  },
  addBtn: {
    borderRadius: 8,
  },
  scroll: {
    paddingBottom: 24,
  },
  addressCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  addressTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bold: {
    fontWeight: 'bold',
  },
  defaultChip: {
    backgroundColor: '#E3F2FD',
    height: 20,
    justifyContent: 'center',
    borderRadius: 4,
  },
  defaultChipText: {
    color: '#1565C0',
    fontSize: 9,
    fontWeight: 'bold',
  },
  addressText: {
    opacity: 0.7,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    margin: 0,
    padding: 0,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  closeBtn: {
    marginTop: 8,
    borderRadius: 8,
  },
});

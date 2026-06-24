import React, { useState, useEffect } from 'react';
import { Text, TextInput, Button, useTheme, Switch, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { View, KeyboardAvoidingView, Platform, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { vendorService } from '@/services/vendorService';
import { waProcessorService } from '@/services/wa-processor.service';
import { AddressFormComponent, AddressFormState } from '@/components/utility/customer/AddressFormComponent';
import type { VendorResponse, VendorAddressResponse } from '@/types/vendors';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';

export default function VendorFormScreen() {
  const { id, prefillWhatsapp, fromJid } = useLocalSearchParams<{ id: string, prefillWhatsapp?: string, fromJid?: string }>();
  const router = useRouter();
  const theme = useTheme();

  const isNew = id === 'new';

  const [editingVendor, setEditingVendor] = useState<Partial<VendorResponse>>({ isActive: true });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [addresses, setAddresses] = useState<VendorAddressResponse[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [linkedChats, setLinkedChats] = useState<any[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);

  const [isEditingAddressInline, setIsEditingAddressInline] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState<VendorAddressResponse | null>(null);
  
  const [addressFormState, setAddressFormState] = useState<AddressFormState>({
    firstName: '',
    lastName: '',
    phone: '',
    pincode: '',
    fullAddress: '',
  });
  const [isAddressDefault, setIsAddressDefault] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      fetchVendor(id);
      fetchAddresses(id);
      fetchLinkedChats(id);
    } else {
      const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      setEditingVendor({ isActive: true, vendorCode: `V${randomCode}`, whatsappPrimary: prefillWhatsapp });
    }
  }, [id, isNew, prefillWhatsapp]);

  const fetchAddresses = async (vendorId: string) => {
    setAddressesLoading(true);
    try {
      const data = await vendorService.getVendorAddresses(vendorId);
      setAddresses(data);
    } catch (error) {
      console.error('Failed to fetch addresses', error);
    } finally {
      setAddressesLoading(false);
    }
  };

  const fetchLinkedChats = async (vendorId: string) => {
    setChatsLoading(true);
    try {
      const chats = await waProcessorService.getChatsByVendor(vendorId);
      setLinkedChats(chats || []);
    } catch (error) {
      console.error('Failed to fetch linked chats', error);
    } finally {
      setChatsLoading(false);
    }
  };

  const handleOpenAddressForm = (addr?: VendorAddressResponse) => {
    if (addr) {
      const names = addr.name.split(' ');
      setAddressFormState({
        firstName: names[0] || '',
        lastName: names.slice(1).join(' '),
        phone: addr.phone || '',
        pincode: addr.pincode || '',
        fullAddress: addr.line1 || '',
      });
      setIsAddressDefault(addr.isDefault);
      setAddressToEdit(addr);
    } else {
      setAddressFormState({
        firstName: '',
        lastName: '',
        phone: '',
        pincode: '',
        fullAddress: '',
      });
      setIsAddressDefault(false);
      setAddressToEdit(null);
    }
    setIsEditingAddressInline(true);
  };

  const handleSaveAddress = async () => {
    const name = [addressFormState.firstName, addressFormState.lastName].filter(Boolean).join(' ');
    if (!name.trim() || !addressFormState.phone.trim() || !addressFormState.fullAddress.trim() || !addressFormState.pincode.trim()) {
      Alert.alert('Validation', 'Please fill in all required address fields.');
      return;
    }

    try {
      setSavingAddress(true);
      const requestData = {
        name,
        phone: addressFormState.phone,
        line1: addressFormState.fullAddress,
        pincode: addressFormState.pincode,
        isDefault: isAddressDefault,
      };

      if (addressToEdit && addressToEdit.id) {
        await vendorService.updateVendorAddress(addressToEdit.id, requestData);
      } else {
        await vendorService.addVendorAddress(editingVendor.id!, requestData);
      }
      setIsEditingAddressInline(false);
      fetchAddresses(editingVendor.id!);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save address');
    } finally {
      setSavingAddress(false);
    }
  };

  const fetchVendor = async (vendorId: string) => {
    setLoading(true);
    try {
      const data = await vendorService.getVendor(vendorId);
      setEditingVendor(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch vendor details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingVendor.vendorName) {
      Alert.alert('Validation Error', 'Vendor Name is required');
      return;
    }
    if (editingVendor.vendorCode && (editingVendor.vendorCode.length < 3 || editingVendor.vendorCode.length > 8)) {
      Alert.alert('Validation Error', 'Vendor Code must be between 3 and 8 characters');
      return;
    }

    setSaving(true);
    try {
      let savedVendor: VendorResponse;
      if (!isNew && editingVendor.id) {
        savedVendor = await vendorService.updateVendor(editingVendor.id, editingVendor);
      } else {
        savedVendor = await vendorService.createVendor(editingVendor);
        if (fromJid) {
          await waProcessorService.assignChatVendor(fromJid, savedVendor.id);
        }
      }
      
      Alert.alert('Success', 'Vendor saved successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScreenWrapper 
        title={isNew ? 'Create Vendor' : 'Edit Vendor'} 
        onBack={() => router.back()}
        withScrollView={true}
        contentContainerStyle={styles.scroll}
      >
        <Text variant="titleSmall" style={styles.sectionTitle}>Basic Info</Text>
        <TextInput
          label="Vendor Name *"
          value={editingVendor.vendorName || ''}
          onChangeText={(t) => setEditingVendor({ ...editingVendor, vendorName: t })}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="store" />}
        />
        <TextInput
          label="Vendor Code"
          value={editingVendor.vendorCode || ''}
          onChangeText={(t) => setEditingVendor({ ...editingVendor, vendorCode: t })}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="barcode" />}
        />

        <Text variant="titleSmall" style={styles.sectionTitle}>Contact Person</Text>
        <View style={styles.row}>
          <TextInput
            label="First Name"
            value={editingVendor.firstName || ''}
            onChangeText={(t) => setEditingVendor({ ...editingVendor, firstName: t })}
            mode="outlined"
            style={[styles.input, styles.flex1, { marginRight: 8 }]}
          />
          <TextInput
            label="Last Name"
            value={editingVendor.lastName || ''}
            onChangeText={(t) => setEditingVendor({ ...editingVendor, lastName: t })}
            mode="outlined"
            style={[styles.input, styles.flex1]}
          />
        </View>

        <Text variant="titleSmall" style={styles.sectionTitle}>Communication</Text>
        <TextInput
          label="Primary WhatsApp"
          value={editingVendor.whatsappPrimary || ''}
          onChangeText={(t) => setEditingVendor({ ...editingVendor, whatsappPrimary: t })}
          mode="outlined"
          style={styles.input}
          keyboardType="phone-pad"
          left={<TextInput.Icon icon="whatsapp" color="#25D366" />}
        />
        <TextInput
          label="Secondary WhatsApp"
          value={editingVendor.whatsappSecondary || ''}
          onChangeText={(t) => setEditingVendor({ ...editingVendor, whatsappSecondary: t })}
          mode="outlined"
          style={styles.input}
          keyboardType="phone-pad"
          left={<TextInput.Icon icon="whatsapp" />}
        />
        <TextInput
          label="Order Group Link"
          value={editingVendor.orderGroupLink || ''}
          onChangeText={(t) => setEditingVendor({ ...editingVendor, orderGroupLink: t })}
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="link" />}
        />
        <TextInput
          label="Email Address"
          value={editingVendor.email || ''}
          onChangeText={(t) => setEditingVendor({ ...editingVendor, email: t })}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          left={<TextInput.Icon icon="email-outline" />}
        />

        {!isNew && (
          <View style={styles.switchContainer}>
            <Text variant="bodyLarge">Vendor is Active</Text>
            <Switch
              value={editingVendor.isActive}
              onValueChange={(val) => setEditingVendor({ ...editingVendor, isActive: val })}
            />
          </View>
        )}

        <Text variant="titleSmall" style={styles.sectionTitle}>Addresses</Text>
        {!isNew ? (
          <Card style={styles.sectionCard} elevation={1}>
            <Card.Content>
              {isEditingAddressInline ? (
                <View>
                  <View style={styles.sectionHeader}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                      {addressToEdit ? 'Edit Address' : 'New Address'}
                    </Text>
                    <Button 
                      mode="text" 
                      compact 
                      onPress={() => setIsEditingAddressInline(false)}
                    >
                      Cancel
                    </Button>
                  </View>
                  <AddressFormComponent
                    value={addressFormState}
                    onChange={setAddressFormState}
                    onSetDefault={setIsAddressDefault}
                    disabled={savingAddress}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                    <Text style={{ flex: 1 }}>Set as Default Address</Text>
                    <Switch value={isAddressDefault} onValueChange={setIsAddressDefault} />
                  </View>
                  <Button
                    mode="contained"
                    onPress={handleSaveAddress}
                    loading={savingAddress}
                    disabled={savingAddress}
                    style={{ marginTop: 16 }}
                  >
                    Save Address
                  </Button>
                </View>
              ) : (
                <View>
                  <View style={styles.sectionHeader}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Saved Addresses</Text>
                    <Button 
                      icon="plus" 
                      mode="outlined" 
                      compact 
                      onPress={() => handleOpenAddressForm()}
                    >
                      Add
                    </Button>
                  </View>

                  {addressesLoading ? (
                    <ActivityIndicator size="small" style={{ marginVertical: 16 }} />
                  ) : addresses.length > 0 ? (
                    addresses.map((addr) => (
                      <Card key={addr.id} style={styles.addressCard} mode="outlined">
                        <Card.Content>
                          <View style={styles.addressTitleRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>{addr.name}</Text>
                              {addr.isDefault && (
                                <Chip style={[styles.defaultChip, { marginLeft: 8 }]} textStyle={styles.defaultChipText} compact>
                                  DEFAULT
                                </Chip>
                              )}
                            </View>
                            <Button
                              mode="text"
                              compact
                              onPress={() => handleOpenAddressForm(addr)}
                              labelStyle={{ fontSize: 12 }}
                            >
                              Edit
                            </Button>
                          </View>
                          <Text variant="bodySmall" style={styles.addressText}>{addr.phone}</Text>
                          <Text variant="bodySmall" style={styles.addressText}>{addr.line1}</Text>
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
                </View>
              )}
            </Card.Content>
          </Card>
        ) : (
          <Text variant="bodySmall" style={{ marginBottom: 16, fontStyle: 'italic', opacity: 0.7 }}>
            You can add addresses after saving the vendor for the first time.
          </Text>
        )}

        {!isNew && (
          <Card style={styles.sectionCard} mode="elevated">
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={styles.sectionTitle}>Linked WhatsApp Chats</Text>
              </View>

              {chatsLoading ? (
                <ActivityIndicator size="small" style={{ marginVertical: 16 }} />
              ) : linkedChats.length > 0 ? (
                linkedChats.map((chat: any) => (
                  <Card key={chat.jid} style={styles.addressCard} mode="outlined" onPress={() => router.push(`/utilities/whatsapp/messages/${chat.jid}`)}>
                    <Card.Content>
                      <View style={styles.addressTitleRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Text variant="titleSmall" style={{ fontWeight: 'bold' }} numberOfLines={1}>{chat.name || chat.jid}</Text>
                          {chat.isGroup && (
                            <Chip style={[styles.defaultChip, { marginLeft: 8 }]} textStyle={styles.defaultChipText} compact>
                              GROUP
                            </Chip>
                          )}
                        </View>
                        <Button
                          icon="arrow-right"
                          mode="text"
                          compact
                          onPress={() => router.push(`/utilities/whatsapp/messages/${chat.jid}`)}
                          labelStyle={{ fontSize: 12 }}
                        >
                          View
                        </Button>
                      </View>
                      {chat.assignedAt && (
                        <Text variant="bodySmall" style={styles.addressText}>
                          Linked on: {new Date(chat.assignedAt).toLocaleDateString()}
                        </Text>
                      )}
                    </Card.Content>
                  </Card>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text variant="bodySmall" style={{ opacity: 0.5 }}>No WhatsApp chats linked.</Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveBtn}
        >
          Save Changes
        </Button>

        <View style={{ height: 40 }} />
      </ScreenWrapper>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  saveBtn: {
    marginTop: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sectionCard: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addressCard: {
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  addressTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressText: {
    opacity: 0.7,
    marginTop: 2,
  },
  defaultChip: {
    backgroundColor: '#e3f2fd',
    height: 20,
  },
  defaultChipText: {
    fontSize: 10,
    color: '#1976d2',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
});

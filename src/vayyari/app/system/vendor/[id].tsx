import React, { useState, useEffect, useCallback } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { vendorService } from '@/services/vendorService';
import { logisticsService } from '@/services/logistics.service';
import { waProcessorService } from '@/services/wa-processor.service';
import {
  EditVendorView,
  EditVendorFormData,
  VendorAddressItem,
  DelhiveryWarehouseOption,
  LinkedWhatsAppChat,
} from '@/components/tamagui-ui/organisms/EditVendorView';
import type { VendorResponse, VendorAddressResponse } from '@/types/vendors';
import type { Warehouse } from '@/types/logistics';

export default function VendorFormScreen() {
  const { id, prefillWhatsapp, fromJid } = useLocalSearchParams<{
    id: string;
    prefillWhatsapp?: string;
    fromJid?: string;
  }>();
  const router = useRouter();

  const isNew = id === 'new';

  const [vendor, setVendor] = useState<Partial<VendorResponse>>({
    isActive: true,
    whatsappPrimary: prefillWhatsapp,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);

  const [addresses, setAddresses] = useState<VendorAddressResponse[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);

  const [linkedChats, setLinkedChats] = useState<any[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);

  // Load Delhivery warehouses
  const fetchWarehouses = useCallback(async () => {
    try {
      setWarehousesLoading(true);
      const data = await logisticsService.getWarehouses();
      setWarehouses(data || []);
    } catch (err) {
      console.error('Failed to load warehouses', err);
    } finally {
      setWarehousesLoading(false);
    }
  }, []);

  // Load Vendor Profile Details
  const fetchVendor = useCallback(async (vendorId: string) => {
    setLoading(true);
    try {
      const data = await vendorService.getVendor(vendorId);
      setVendor(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch vendor details');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Load Vendor Addresses
  const fetchAddresses = useCallback(async (vendorId: string) => {
    setAddressesLoading(true);
    try {
      const data = await vendorService.getVendorAddresses(vendorId);
      setAddresses(data || []);
    } catch (error) {
      console.error('Failed to fetch addresses', error);
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  // Load Linked WhatsApp Chats
  const fetchLinkedChats = useCallback(async (vendorId: string) => {
    setChatsLoading(true);
    try {
      const chats = await waProcessorService.getChatsByVendor(vendorId);
      setLinkedChats(chats || []);
    } catch (error) {
      console.error('Failed to fetch linked chats', error);
    } finally {
      setChatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  useEffect(() => {
    if (!isNew && id) {
      fetchVendor(id);
      fetchAddresses(id);
      fetchLinkedChats(id);
    } else {
      const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      setVendor({
        isActive: true,
        vendorCode: `V${randomCode}`,
        whatsappPrimary: prefillWhatsapp,
      });
    }
  }, [id, isNew, prefillWhatsapp, fetchVendor, fetchAddresses, fetchLinkedChats]);

  // Save / Update Vendor
  const handleSaveVendor = async (formData: EditVendorFormData) => {
    if (!formData.vendorName.trim()) {
      Alert.alert('Validation Error', 'Vendor Name is required');
      return;
    }
    if (formData.vendorCode && (formData.vendorCode.length < 3 || formData.vendorCode.length > 8)) {
      Alert.alert('Validation Error', 'Vendor Code must be between 3 and 8 characters');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<VendorResponse> = {
        ...formData,
        defaultWarehouseId: formData.defaultWarehouseId || undefined,
      };

      let savedVendor: VendorResponse;
      if (!isNew && (formData.id || id)) {
        const vendorId = formData.id || id;
        savedVendor = await vendorService.updateVendor(vendorId, payload);
      } else {
        savedVendor = await vendorService.createVendor(payload);
        if (fromJid) {
          await waProcessorService.assignChatVendor(fromJid, savedVendor.id);
        }
      }

      Alert.alert('Success', 'Vendor saved successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
  };

  // Add or Update Address
  const handleSaveAddress = async (
    addressData: Omit<VendorAddressItem, 'id' | 'createdAt' | 'updatedAt'>,
    addressId?: string
  ) => {
    const currentVendorId = vendor.id || id;
    if (!currentVendorId) return;

    try {
      const requestData = {
        name: addressData.name,
        phone: addressData.phone,
        line1: addressData.line1,
        line2: addressData.line2,
        pincode: addressData.pincode,
        city: addressData.city,
        state: addressData.state,
        isDefault: !!addressData.isDefault,
      };

      if (addressId) {
        await vendorService.updateVendorAddress(addressId, requestData);
      } else {
        await vendorService.addVendorAddress(currentVendorId, requestData);
      }
      fetchAddresses(currentVendorId);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save address');
    }
  };

  // Delete Address
  const handleDeleteAddress = (addressId: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await vendorService.deleteVendorAddress(addressId);
            const currentVendorId = vendor.id || id;
            if (currentVendorId) fetchAddresses(currentVendorId);
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to delete address');
          }
        },
      },
    ]);
  };

  // Deep Link WhatsApp Chat
  const handleNavigateChat = (chatJid: string) => {
    router.push(`/utilities/whatsapp/messages/${chatJid}` as any);
  };

  // Map warehouses to option format
  const mappedWarehouses: DelhiveryWarehouseOption[] = warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    code: w.code,
    alias: w.alias,
    city: w.city,
    state: w.state,
    pincode: w.pincode,
    isCentral: w.isCentral,
  }));

  // Map addresses
  const mappedAddresses: VendorAddressItem[] = addresses.map((a) => ({
    id: a.id,
    vendorId: a.vendorId,
    name: a.name,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2,
    pincode: a.pincode,
    city: a.city,
    state: a.state,
    isDefault: a.isDefault,
  }));

  // Map linked chats
  const mappedChats: LinkedWhatsAppChat[] = linkedChats.map((c) => ({
    jid: c.jid,
    name: c.name,
    isGroup: c.isGroup,
    assignedAt: c.assignedAt,
  }));

  return (
    <ScreenWrapper
      title={isNew ? 'Create Vendor' : (vendor.vendorName || 'Edit Vendor')}
      subtitle={isNew ? 'Partner Onboarding' : `Vendor Code: ${vendor.vendorCode || 'N/A'}`}
      onBack={() => router.back()}
      withScrollView={false}
    >
      <View style={styles.container}>
        <EditVendorView
          initialVendor={vendor as EditVendorFormData}
          isNew={isNew}
          warehouses={mappedWarehouses}
          warehousesLoading={warehousesLoading}
          addresses={mappedAddresses}
          addressesLoading={addressesLoading}
          linkedChats={mappedChats}
          chatsLoading={chatsLoading}
          loading={loading}
          saving={saving}
          onSave={handleSaveVendor}
          onBack={() => router.back()}
          onSaveAddress={handleSaveAddress}
          onDeleteAddress={handleDeleteAddress}
          onNavigateChat={handleNavigateChat}
          showHeaderTitle={false}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { logisticsService } from '@/services/logistics.service';
import {
  EditWarehouseView,
  EditWarehouseFormData,
} from '@/components/tamagui-ui/organisms/EditWarehouseView';
import type { CreateWarehouseRequest, UpdateWarehouseRequest, Warehouse } from '@/types/logistics';

export default function WarehouseFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const isNew = id === 'new' || !id;

  const [warehouse, setWarehouse] = useState<Partial<EditWarehouseFormData>>({
    isActive: true,
    isCentral: false,
    syncWithDelhivery: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load Warehouse Profile Details
  const fetchWarehouse = useCallback(async (warehouseId: string) => {
    setLoading(true);
    try {
      const allWarehouses = await logisticsService.getWarehouses();
      const target = allWarehouses.find((w) => w.id === warehouseId);
      if (!target) {
        Alert.alert('Not Found', 'Warehouse facility was not found.');
        router.back();
        return;
      }

      setWarehouse({
        id: target.id,
        name: target.name || '',
        alias: target.alias || '',
        code: target.code || '',
        addressLine1: target.addressLine1 || (target as any).address_line1 || '',
        addressLine2: target.addressLine2 || (target as any).address_line2 || '',
        city: target.city || '',
        state: target.state || '',
        pincode: target.pincode || '',
        phone: target.phone || '',
        contactPerson: target.contactPerson || (target as any).contact_person || '',
        isCentral: !!(target.isCentral ?? (target as any).is_central),
        isStarred: Boolean(target.isStarred ?? (target as any).is_starred),
        isActive: target.isActive !== undefined ? target.isActive : true,
        syncWithDelhivery: true,
      });
    } catch (error) {
      console.error('Failed to fetch warehouse details:', error);
      Alert.alert('Error', 'Failed to fetch warehouse facility details');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isNew && id) {
      fetchWarehouse(id);
    }
  }, [id, isNew, fetchWarehouse]);

  // Save / Update Warehouse
  const handleSaveWarehouse = async (formData: EditWarehouseFormData) => {
    setSaving(true);
    try {
      if (isNew) {
        const createReq: CreateWarehouseRequest = {
          name: formData.name.trim(),
          alias: formData.alias?.trim() || undefined,
          code: formData.code.trim().toUpperCase(),
          addressLine1: formData.addressLine1.trim(),
          addressLine2: formData.addressLine2?.trim() || undefined,
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
          phone: formData.phone.trim(),
          contactPerson: formData.contactPerson?.trim() || undefined,
          isCentral: formData.isCentral,
          registerWithDelhivery: formData.syncWithDelhivery,
        };
        await logisticsService.createWarehouse(createReq);
        Alert.alert('Success', 'Warehouse facility registered successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const targetId = formData.id || id;
        const updateReq: UpdateWarehouseRequest = {
          name: formData.name.trim(),
          alias: formData.alias?.trim() || undefined,
          code: formData.code.trim().toUpperCase(),
          addressLine1: formData.addressLine1.trim(),
          addressLine2: formData.addressLine2?.trim() || undefined,
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
          phone: formData.phone.trim(),
          contactPerson: formData.contactPerson?.trim() || undefined,
          isCentral: formData.isCentral,
          isActive: formData.isActive,
          updateDelhivery: formData.syncWithDelhivery,
        };
        await logisticsService.updateWarehouse(targetId, updateReq);
        Alert.alert('Success', 'Warehouse facility updated successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      console.error('Failed to save warehouse:', error);
      Alert.alert('Error', error?.message || 'Failed to save warehouse facility');
    } finally {
      setSaving(false);
    }
  };

  // Delete Warehouse
  const handleDeleteWarehouse = async (targetId: string) => {
    setDeleting(true);
    try {
      await logisticsService.deleteWarehouse(targetId);
      Alert.alert('Deleted', 'Warehouse facility removed successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Failed to delete warehouse:', error);
      Alert.alert('Delete Failed', error?.message || 'Could not delete warehouse.');
    } finally {
      setDeleting(false);
    }
  };

  // Toggle Star Status
  const handleToggleStar = async () => {
    if (!id || isNew) return;
    try {
      const newStarred = await logisticsService.toggleWarehouseStar(id);
      setWarehouse((prev) => ({ ...prev, isStarred: newStarred }));
    } catch (error) {
      console.warn('Failed to toggle star:', error);
    }
  };

  return (
    <ScreenWrapper
      title={isNew ? 'New Facility' : (warehouse.name || 'Edit Warehouse')}
      subtitle={isNew ? 'Register Pickup Location' : `Code: ${warehouse.code || 'N/A'}`}
      onBack={() => router.back()}
      withScrollView={false}
    >
      <View style={styles.container}>
        <EditWarehouseView
          initialWarehouse={warehouse}
          isNew={isNew}
          loading={loading}
          saving={saving}
          deleting={deleting}
          onSave={handleSaveWarehouse}
          onDelete={handleDeleteWarehouse}
          onToggleStar={handleToggleStar}
          onBack={() => router.back()}
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

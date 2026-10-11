import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { logisticsService } from '@/services/logistics.service';
import { Warehouse } from '@/types/logistics';
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

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

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

  const handleToggleStar = async (warehouse: DelhiveryWarehouseItem) => {
    try {
      const newStarred = await logisticsService.toggleWarehouseStar(warehouse.id);
      setWarehouses((prev) =>
        prev
          .map((w) => (w.id === warehouse.id ? { ...w, isStarred: newStarred } : w))
          .sort((a, b) => {
            if (Boolean(b.isStarred) !== Boolean(a.isStarred)) {
              return Boolean(b.isStarred) ? 1 : -1;
            }
            if (Boolean(b.isCentral) !== Boolean(a.isCentral)) {
              return Boolean(b.isCentral) ? 1 : -1;
            }
            return (a.name || '').localeCompare(b.name || '');
          })
      );
    } catch (err: any) {
      console.warn('Failed to toggle star for warehouse:', err);
    }
  };

  const handleOpenCreate = () => {
    router.push('/system/delhivery/warehouse/new');
  };

  const handleOpenEdit = (w: DelhiveryWarehouseItem) => {
    router.push({
      pathname: '/system/delhivery/warehouse/[id]',
      params: { id: w.id },
    });
  };

  return (
    <ScreenWrapper 
      title="Delhivery Warehouses" 
      subtitle="Pickup facilities & fulfillment locations"
      onBack={() => router.back()}
      withScrollView={false}
    >
      <View style={styles.container}>
        <DelhiveryWarehousesView
          warehouses={warehouses}
          loading={loading}
          syncing={syncing}
          lastSyncedAt={lastSyncedAt}
          onSync={handleSync}
          onAddFacility={handleOpenCreate}
          onEditFacility={handleOpenEdit}
          onDeleteFacility={(w) => handleDelete(w.id, w.name)}
          onToggleStar={handleToggleStar}
          onRefresh={fetchData}
          showHeaderTitle={false}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});

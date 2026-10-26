import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { AdminDeviceFleetDashboardPage } from '@/components/tamagui-ui/pages/AdminDeviceFleetDashboardPage';
import {
  storeAdminService,
  DeviceFleetStats,
  StoreDeviceItem,
} from '@/services/storeAdminService';

export default function StoreDevicesScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DeviceFleetStats | null>(null);
  const [devices, setDevices] = useState<StoreDeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [statsData, devicesData] = await Promise.all([
        storeAdminService.getFleetStats(),
        storeAdminService.getRegisteredDevices(),
      ]);

      setStats(statsData);
      setDevices(devicesData);
    } catch (err) {
      console.warn('Failed to load fleet telemetry in Admin App:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <AdminDeviceFleetDashboardPage
      stats={stats}
      devices={devices}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchData(true)}
      onBack={() => router.back()}
    />
  );
}

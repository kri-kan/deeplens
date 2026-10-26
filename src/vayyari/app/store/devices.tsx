import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { AdminDeviceFleetDashboardPage } from '@/components/tamagui-ui/pages/AdminDeviceFleetDashboardPage';
import {
  storeAdminService,
  DeviceFleetStats,
  StoreDeviceItem,
  HourlyActivitySummary,
} from '@/services/storeAdminService';

export default function StoreDevicesScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DeviceFleetStats | null>(null);
  const [devices, setDevices] = useState<StoreDeviceItem[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<HourlyActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [statsData, devicesData, hourlyData] = await Promise.all([
        storeAdminService.getFleetStats(),
        storeAdminService.getRegisteredDevices(),
        storeAdminService.getHourlyActivity(30).catch(() => null),
      ]);

      setStats(statsData);
      setDevices(devicesData);
      setHourlyActivity(hourlyData);
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
      hourlyActivity={hourlyActivity}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => fetchData(true)}
      onBack={() => router.back()}
    />
  );
}

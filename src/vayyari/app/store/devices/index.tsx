import React, { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  useGetFleetStatsQuery,
  useGetHourlyActivityQuery,
  useGetDailyGrowthQuery,
} from '@/store/api/telemetryApi';
import {
  setSelectedDeviceId,
} from '@/store/slices/telemetryUiSlice';
import { AdminDeviceFleetDashboardPage } from '@/components/tamagui-ui/pages/AdminDeviceFleetDashboardPage';
import { StoreDeviceItem, GrowthGranularity } from '@/services/storeAdminService';

export default function StoreDevicesDashboardScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Redux UI State
  const { activeActivityDays, selectedDeviceId } = useAppSelector(
    (state) => state.telemetryUi
  );

  const [growthGranularity, setGrowthGranularity] = useState<GrowthGranularity>('day');
  const [growthRange, setGrowthRange] = useState<number>(10);

  // RTK Query hooks
  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsFetching,
    refetch: refetchStats,
  } = useGetFleetStatsQuery();

  const {
    data: hourlyActivity = null,
    isLoading: hourlyLoading,
    isFetching: hourlyFetching,
    refetch: refetchHourly,
  } = useGetHourlyActivityQuery({ days: activeActivityDays });

  const {
    data: dailyGrowth = null,
    isLoading: growthLoading,
    isFetching: growthFetching,
    refetch: refetchGrowth,
  } = useGetDailyGrowthQuery({ range: growthRange, granularity: growthGranularity });

  const loading = statsLoading || hourlyLoading || growthLoading;
  const refreshing = statsFetching || hourlyFetching || growthFetching;

  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchHourly();
    refetchGrowth();
  }, [refetchStats, refetchHourly, refetchGrowth]);

  const handleSelectDevice = useCallback(
    (device: StoreDeviceItem) => {
      dispatch(setSelectedDeviceId(device.deviceId));
    },
    [dispatch]
  );

  const selectedDevice =
    stats?.recentDevices?.find((d) => d.deviceId === selectedDeviceId) ?? null;

  const handleNavigateToDevicesList = useCallback(
    (params?: {
      filter?: string;
      platform?: string;
      signal?: string;
      hour?: number | string;
    }) => {
      router.push({
        pathname: '/store/devices/list',
        params: params as any,
      });
    },
    [router]
  );

  return (
    <AdminDeviceFleetDashboardPage
      stats={stats ?? null}
      recentDevices={stats?.recentDevices || []}
      hourlyActivity={hourlyActivity}
      dailyGrowth={dailyGrowth}
      growthGranularity={growthGranularity}
      growthRange={growthRange}
      onGrowthGranularityChange={setGrowthGranularity}
      onGrowthRangeChange={setGrowthRange}
      loading={loading}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      onBack={() => router.back()}
      onNavigateToDevicesList={handleNavigateToDevicesList}
      onSelectDevice={handleSelectDevice}
      selectedDeviceId={selectedDeviceId}
      selectedDevice={selectedDevice}
      onCloseDeviceDrawer={() => dispatch(setSelectedDeviceId(null))}
    />
  );
}

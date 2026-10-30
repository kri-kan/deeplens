import React, { useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store';
import { useGetRegisteredDevicesQuery } from '@/store/api/telemetryApi';
import { setSelectedDeviceId } from '@/store/slices/telemetryUiSlice';
import { AdminDeviceFleetListPage } from '@/components/tamagui-ui/pages/AdminDeviceFleetListPage';
import { StoreDeviceItem } from '@/services/storeAdminService';

export default function StoreDevicesListScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{
    platform?: string;
    filter?: string;
    signal?: string;
    hour?: string;
  }>();

  const { selectedDeviceId } = useAppSelector((state) => state.telemetryUi);

  const {
    data: devices = [],
    isLoading: devicesLoading,
    isFetching: devicesFetching,
    refetch: refetchDevices,
  } = useGetRegisteredDevicesQuery();

  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId) ?? null;

  const handleSelectDevice = useCallback(
    (device: StoreDeviceItem) => {
      dispatch(setSelectedDeviceId(device.deviceId));
    },
    [dispatch]
  );

  return (
    <AdminDeviceFleetListPage
      devices={devices}
      loading={devicesLoading}
      refreshing={devicesFetching}
      onRefresh={refetchDevices}
      onBack={() => router.back()}
      initialPlatform={params.platform}
      initialFilter={params.filter}
      initialSignal={params.signal}
      initialHour={params.hour}
      onSelectDevice={handleSelectDevice}
      selectedDeviceId={selectedDeviceId}
      selectedDevice={selectedDevice}
      onCloseDeviceDrawer={() => dispatch(setSelectedDeviceId(null))}
    />
  );
}

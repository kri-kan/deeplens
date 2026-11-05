import React, { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
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

  // Android hardware back & system swipe-back gesture handling
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedDeviceId) {
          dispatch(setSelectedDeviceId(null));
          return true;
        }
        if (router.canGoBack()) {
          router.back();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [selectedDeviceId, dispatch, router])
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      />
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
    </>
  );
}

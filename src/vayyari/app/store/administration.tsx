import React, { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { useGetFleetStatsQuery } from '@/store/api/telemetryApi';
import { AdminStoreAdministrationPage } from '@/components/tamagui-ui/pages/AdminStoreAdministrationPage';

export default function StoreAdministrationScreen() {
  const router = useRouter();

  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsFetching,
    refetch: refetchStats,
  } = useGetFleetStatsQuery();

  const handleRefresh = useCallback(() => {
    refetchStats();
  }, [refetchStats]);

  // Android hardware back & system swipe-back gesture handling
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (router.canGoBack()) {
          router.back();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [router])
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
      <AdminStoreAdministrationPage
        stats={stats ?? null}
        loading={statsLoading}
        refreshing={statsFetching}
        onRefresh={handleRefresh}
        onBack={() => router.back()}
        onNavigateToDevices={() => router.push('/store/devices' as any)}
        onNavigateToDevicesList={() => router.push('/store/devices/list' as any)}
        onNavigateToInventory={() => router.push('/store/inventory' as any)}
        onNavigateToPublish={() => router.push('/store/publish' as any)}
        onNavigateToConfiguration={() => router.push('/store/configuration' as any)}
      />
    </>
  );
}

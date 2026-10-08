import React, { useEffect } from 'react';
import { YStack } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BackHandler } from 'react-native';
import { AdminOrderDetailView } from '@/components/order/AdminOrderDetailView';

export default function OrderDetailsScreen() {
  const { id, fromCreate, orderCreated } = useLocalSearchParams<{
    id: string;
    fromCreate?: string;
    orderCreated?: string;
  }>();
  const router = useRouter();

  useEffect(() => {
    if (fromCreate === 'true') {
      const onBackPress = () => {
        router.replace('/utilities/order-create');
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [fromCreate, router]);

  if (!id) {
    return null;
  }

  const handleBack = () => {
    if (fromCreate === 'true') {
      router.replace('/utilities/order-create');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/orders');
    }
  };

  return (
    <YStack flex={1}>
      <AdminOrderDetailView
        orderId={id}
        onBack={handleBack}
        showCreatedSnackbar={orderCreated === 'true'}
      />
    </YStack>
  );
}

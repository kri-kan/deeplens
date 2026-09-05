import React from 'react';
import { YStack } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AdminOrderDetailView } from '@/components/order/AdminOrderDetailView';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  if (!id) {
    return null;
  }

  return (
    <YStack flex={1}>
      <AdminOrderDetailView orderId={id} onBack={() => router.back()} />
    </YStack>
  );
}

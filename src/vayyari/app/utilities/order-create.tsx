import React from 'react';
import { useRouter } from 'expo-router';
import { YStack } from 'tamagui';
import { AdminOrderCreateForm } from '@/components/order/AdminOrderCreateForm';

export default function OrderCreateScreen() {
  const router = useRouter();

  return (
    <YStack flex={1}>
      <AdminOrderCreateForm onBack={() => router.back()} />
    </YStack>
  );
}

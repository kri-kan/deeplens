import React from 'react';
import { YStack } from 'tamagui';
import { AdminOrderCreateForm } from '@/components/order/AdminOrderCreateForm';

export default function NewOrderScreen() {
  return (
    <YStack flex={1}>
      <AdminOrderCreateForm />
    </YStack>
  );
}

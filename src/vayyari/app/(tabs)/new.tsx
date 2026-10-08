import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { YStack, Spinner } from 'tamagui';

export default function NewOrderScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/utilities/order-create');
  }, [router]);

  return (
    <YStack flex={1} alignItems="center" justifyContent="center">
      <Spinner size="large" />
    </YStack>
  );
}

import React from 'react';
import { StyleSheet } from 'react-native';
import { Surface, Appbar, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { AdminOrderCreateForm } from '@/components/order/AdminOrderCreateForm';

export default function NewOrderScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header elevated style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.replace('/(tabs)' as any)} />
        <Appbar.Content title="Create Order" titleStyle={{ fontWeight: '800' }} />
      </Appbar.Header>
      <AdminOrderCreateForm />
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

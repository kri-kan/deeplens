import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Appbar, Card, useTheme, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { wrapInSpan } from '@/utils/telemetry';

export default function ProductScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      await wrapInSpan('checkout-process', async () => {
        // Simulate network/processing delay for checkout
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(`Checkout completed for product ${id}`);
        // Optionally simulating an error based on ID:
        // if (id === 'error') throw new Error('Simulated checkout failure');
      });
      router.navigate('/');
    } catch (e) {
      console.error('Checkout failed', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={`Product Details`} />
      </Appbar.Header>
      
      <View style={styles.content}>
        <Card>
          <Card.Title title={`Product ID: ${id}`} subtitle="Sample deep link target" />
          <Card.Content>
            <Text variant="bodyMedium">
              You navigated to this deeply linked screen. In a real app, this screen would fetch data for product ID {id}.
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button mode="outlined" onPress={() => router.navigate('/')}>Go Home</Button>
            <Button mode="contained" onPress={handleCheckout} loading={isProcessing} disabled={isProcessing}>Checkout</Button>
          </Card.Actions>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  }
});

import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { Surface, Text, Appbar, TextInput, Button, SegmentedButtons, useTheme, Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useShareIntentContext } from '@/context/ShareIntentContext';
import { SharedMediaPreview } from '@/components/order/SharedMediaPreview';

export default function NewOrderScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { sharedMedia, commitCurrentSession, discardCurrentSession } = useShareIntentContext();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [source, setSource] = useState('WhatsApp');
  const [paymentMode, setPaymentMode] = useState<'COD' | 'Prepaid'>('COD');
  const [orderAmount, setOrderAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Source selector menu
  const [sourceMenuVisible, setSourceMenuVisible] = useState(false);
  const sourceOptions = ['WhatsApp', 'Instagram', 'Direct Sale', 'Website', 'Phone Call'];

  const handleCreateOrder = async () => {
    if (!phone.trim() || !orderAmount.trim()) {
      Alert.alert('Required Fields Missing', 'Please enter Customer Phone Number and Total Order Amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate order creation logic / API payload
      const orderPayload = {
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        source,
        paymentMode,
        totalAmount: parseFloat(orderAmount) || 0,
        notes: notes.trim(),
        mediaCount: sharedMedia.length,
        mediaUris: sharedMedia.map(m => m.uri),
        createdAt: new Date().toISOString(),
      };

      console.log('Order created successfully:', orderPayload);

      // Clean up staged local session since order creation committed
      await commitCurrentSession();

      Alert.alert(
        'Order Created Successfully 🎉',
        `Order registered via ${source} (${paymentMode}) for ₹${orderAmount}.`,
        [
          {
            text: 'View Orders',
            onPress: () => {
              router.push('/(tabs)/orders');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to create order:', error);
      Alert.alert('Error', 'Failed to save order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
        <Appbar.Content title="Create New Order" titleStyle={{ fontWeight: 'bold' }} />
        <Appbar.Action icon="cog" onPress={() => router.push('/modal')} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Shared Media Gallery Bento Card */}
        <SharedMediaPreview mediaItems={sharedMedia} />

        {/* Customer Details Bento Card */}
        <Surface
          style={[
            styles.card,
            {
              backgroundColor: (theme.colors as any).surfaceContainerLow || theme.colors.surfaceVariant,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            Customer Information
          </Text>

          <TextInput
            label="Customer Name"
            value={customerName}
            onChangeText={setCustomerName}
            mode="outlined"
            style={styles.input}
            outlineColor={theme.colors.outlineVariant}
            activeOutlineColor={theme.colors.secondary}
          />

          <TextInput
            label="Phone Number *"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.input}
            outlineColor={theme.colors.outlineVariant}
            activeOutlineColor={theme.colors.secondary}
          />

          <TextInput
            label="Delivery Address"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
            mode="outlined"
            style={styles.input}
            outlineColor={theme.colors.outlineVariant}
            activeOutlineColor={theme.colors.secondary}
          />
        </Surface>

        {/* Order Source & Financials Bento Card */}
        <Surface
          style={[
            styles.card,
            {
              backgroundColor: (theme.colors as any).surfaceContainerLow || theme.colors.surfaceVariant,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            Order & Payment Details
          </Text>

          {/* Source Dropdown Menu */}
          <Text variant="bodyMedium" style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>
            Order Source
          </Text>
          <Menu
            visible={sourceMenuVisible}
            onDismiss={() => setSourceMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setSourceMenuVisible(true)}
                icon="tray-arrow-down"
                contentStyle={{ justifyContent: 'space-between' }}
                style={[styles.dropdownBtn, { borderColor: theme.colors.outlineVariant }]}
                labelStyle={{ color: theme.colors.onSurface }}
              >
                {source}
              </Button>
            }
          >
            {sourceOptions.map(opt => (
              <Menu.Item
                key={opt}
                title={opt}
                onPress={() => {
                  setSource(opt);
                  setSourceMenuVisible(false);
                }}
              />
            ))}
          </Menu>

          {/* Payment Mode Selector */}
          <Text variant="bodyMedium" style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>
            Payment Method
          </Text>
          <SegmentedButtons
            value={paymentMode}
            onValueChange={val => setPaymentMode(val as 'COD' | 'Prepaid')}
            buttons={[
              {
                value: 'COD',
                label: 'COD (Cash on Delivery)',
                icon: 'cash-sync',
              },
              {
                value: 'Prepaid',
                label: 'Prepaid',
                icon: 'credit-card-check',
              },
            ]}
            style={styles.segmented}
          />

          <TextInput
            label="Total Order Amount (₹) *"
            value={orderAmount}
            onChangeText={setOrderAmount}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            outlineColor={theme.colors.outlineVariant}
            activeOutlineColor={theme.colors.secondary}
          />

          <TextInput
            label="Order Notes / Product Summary"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
            mode="outlined"
            style={styles.input}
            outlineColor={theme.colors.outlineVariant}
            activeOutlineColor={theme.colors.secondary}
          />
        </Surface>

        {/* Submit Order Action */}
        <Button
          mode="contained"
          onPress={handleCreateOrder}
          loading={isSubmitting}
          disabled={isSubmitting}
          buttonColor={theme.colors.secondary}
          textColor={theme.colors.onSecondary}
          style={styles.submitBtn}
          labelStyle={styles.submitBtnLabel}
        >
          Create & Save Order
        </Button>
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  fieldLabel: {
    fontWeight: '600',
    marginBottom: -4,
  },
  input: {
    backgroundColor: 'transparent',
  },
  dropdownBtn: {
    borderRadius: 12,
    marginTop: 4,
  },
  segmented: {
    marginTop: 4,
    marginBottom: 4,
  },
  submitBtn: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 14,
  },
  submitBtnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

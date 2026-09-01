import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { Surface, Text, Appbar, TextInput, Button, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useShareIntentContext } from '@/context/ShareIntentContext';
import { searchApiClient } from '@/api/client';
import { customersApi } from '@/api/customers';
import { API_ROUTES } from '@/constants/api-routes';
import {
  OrderSource,
  PaymentMode,
  OrderIdEntry,
  OrderItemDraft,
  ShippingAddressDraft,
  OrderUpdateRequest,
} from '@/types/orders';

import { ExistingOrderAutocomplete } from '@/components/order/ExistingOrderAutocomplete';
import { SharedMediaItemTagger } from '@/components/order/SharedMediaItemTagger';
import { CatalogOrderItemsList } from '@/components/order/CatalogOrderItemsList';
import { StructuredAddressForm } from '@/components/order/StructuredAddressForm';
import { FinancialsSummaryCard } from '@/components/order/FinancialsSummaryCard';

export default function NewOrderScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { sharedMedia, commitCurrentSession, discardCurrentSession, removeSharedMedia } = useShareIntentContext();

  // Mode state
  const [mode, setMode] = useState<'create_new' | 'attach_existing'>('create_new');
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(undefined);

  // Customer state
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);

  // Order Source & Financials
  const [source, setSource] = useState<OrderSource>('WhatsApp');
  const [sourceHandle, setSourceHandle] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('COD');
  const [shippingCharges, setShippingCharges] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [notes, setNotes] = useState('');

  // Structured Address
  const [shippingAddress, setShippingAddress] = useState<ShippingAddressDraft>({
    line1: '',
    city: '',
    state: '',
    pincode: '',
    isDelhiveryServiceable: null,
  });

  // Dual Items (Media drafts + Catalog drafts)
  const [mediaDrafts, setMediaDrafts] = useState<OrderItemDraft[]>([]);
  const [catalogDrafts, setCatalogDrafts] = useState<OrderItemDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync staged shared media items to mediaDrafts
  useEffect(() => {
    setMediaDrafts(prev => {
      const existingByUri = new Map(prev.map(d => [d.mediaUri, d]));
      return sharedMedia.map((m, idx) => {
        const existing = existingByUri.get(m.uri);
        if (existing) return existing;
        return {
          id: `media-${idx}-${Date.now()}`,
          sourceType: 'media',
          mediaUri: m.uri,
          productCode: '',
          quantity: 1,
          unitPrice: 0,
          subtotal: 0,
        };
      });
    });
  }, [sharedMedia]);

  // Handle selected existing order population
  const handleSelectExistingOrder = (order: OrderIdEntry | null) => {
    if (!order) {
      setSelectedOrderId(undefined);
      return;
    }
    setSelectedOrderId(order.id);
    if (order.customerPhone) setPhone(order.customerPhone);
    if (order.customerName) setCustomerName(order.customerName);
    if (order.source) setSource(order.source);
    if (order.sourceHandle) setSourceHandle(order.sourceHandle);
    if (order.paymentMode) setPaymentMode(order.paymentMode);
    if (order.customerId) setCustomerId(order.customerId);
    if (order.shippingStreet || order.customerAddress) {
      setShippingAddress(prev => ({
        ...prev,
        line1: order.shippingStreet || order.customerAddress || '',
        city: order.shippingCity || prev.city,
        state: order.shippingState || prev.state,
        pincode: order.shippingPincode || prev.pincode,
        isDelhiveryServiceable: order.isServiceable,
      }));
    }
    if (order.advancePaid) setAdvancePaid(order.advancePaid);
    if (order.shippingCharges) setShippingCharges(order.shippingCharges);
  };

  // Item Draft Handlers
  const handleUpdateMediaDraft = (id: string, updates: Partial<OrderItemDraft>) => {
    setMediaDrafts(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleRemoveMediaDraft = (id: string, mediaIndex?: number) => {
    setMediaDrafts(prev => prev.filter(item => item.id !== id));
    if (mediaIndex !== undefined) {
      removeSharedMedia(mediaIndex);
    }
  };

  const handleAddCatalogItem = (item: OrderItemDraft) => {
    setCatalogDrafts(prev => [item, ...prev]);
  };

  const handleRemoveCatalogItem = (id: string) => {
    setCatalogDrafts(prev => prev.filter(item => item.id !== id));
  };

  // Financial Calculations
  const allItems = [...mediaDrafts, ...catalogDrafts];
  const itemsTotal = allItems.reduce((sum, item) => sum + (item.subtotal || item.unitPrice * item.quantity || 0), 0);
  const totalAmount = itemsTotal + shippingCharges;
  const codBalance = paymentMode === 'COD' ? Math.max(0, totalAmount - advancePaid) : 0;

  // Order Submission
  const handleSaveOrder = async () => {
    const activeHandle = sourceHandle.trim() || phone.trim();
    if (!activeHandle) {
      Alert.alert('Required Info Missing', `Please enter the Customer ${source === 'WhatsApp' ? 'Phone Number' : 'Instagram Handle'}.`);
      return;
    }

    if (mode === 'attach_existing' && !selectedOrderId) {
      Alert.alert('Reference Required', 'Please select an existing Order ID from the list to attach.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Resolve or create customer profile
      let resolvedCustomerId = customerId;
      if (!resolvedCustomerId && (phone || sourceHandle)) {
        try {
          const cust = await customersApi.getOrCreateCustomer(
            source === 'WhatsApp' ? (phone || sourceHandle) : undefined,
            source === 'Instagram' ? sourceHandle : undefined
          );
          if (cust && cust.id) {
            resolvedCustomerId = cust.id;
          }
        } catch (e) {
          console.warn('[NewOrder] Customer resolve skipped:', e);
        }
      }

      // 2. Generate new order ID if creating new order
      let targetOrderId = selectedOrderId;
      if (mode === 'create_new') {
        const genRes = await searchApiClient.post<{ orderId: string }>(API_ROUTES.ORDERS.GENERATE, null, {
          params: {
            source,
            paymentMode,
            sourceHandle: activeHandle,
            customerId: resolvedCustomerId,
          },
        });
        targetOrderId = genRes.orderId;
      }

      if (!targetOrderId) {
        throw new Error('Failed to obtain target Order ID');
      }

      // 3. Map line items
      const orderItemsPayload = allItems.map(item => ({
        productId: item.productId || item.productCode || undefined,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        subtotal: item.subtotal || (item.unitPrice * (item.quantity || 1)),
        vendorId: item.vendorId,
        sourceType: item.sourceType,
        comments: item.comments || (item.productCode ? `Code: ${item.productCode}` : undefined),
      }));

      // 4. Update order details on backend
      const fullAddress = [shippingAddress.line1, shippingAddress.city, shippingAddress.state, shippingAddress.pincode]
        .filter(Boolean)
        .join(', ');

      const updatePayload: OrderUpdateRequest = {
        customerName: customerName.trim() || undefined,
        customerPhone: source === 'WhatsApp' ? (phone || sourceHandle) : phone || undefined,
        customerAddress: fullAddress || undefined,
        shippingStreet: shippingAddress.line1 || undefined,
        shippingCity: shippingAddress.city || undefined,
        shippingState: shippingAddress.state || undefined,
        shippingPincode: shippingAddress.pincode || undefined,
        isServiceable: shippingAddress.isDelhiveryServiceable ?? true,
        source,
        sourceHandle: activeHandle,
        paymentMode,
        totalAmount,
        advancePaid: paymentMode === 'Prepaid' ? totalAmount : advancePaid,
        codBalance,
        shippingCharges,
        customerId: resolvedCustomerId,
        items: orderItemsPayload,
      };

      await searchApiClient.put(API_ROUTES.ORDERS.UPDATE(targetOrderId), updatePayload);

      // 5. Commit staged media session
      await commitCurrentSession();

      Alert.alert(
        'Order Saved Successfully 🎉',
        `Order ${targetOrderId} (${paymentMode}) saved for ₹${totalAmount}.`,
        [
          {
            text: 'View Orders',
            onPress: () => router.push('/(tabs)/orders'),
          },
          {
            text: 'Create Another',
            style: 'cancel',
            onPress: () => {
              setCustomerName('');
              setPhone('');
              setSourceHandle('');
              setAdvancePaid(0);
              setCatalogDrafts([]);
              setSelectedOrderId(undefined);
            },
          },
        ]
      );
    } catch (error) {
      console.error('[NewOrder] Save failed:', error);
      Alert.alert('Error', 'Failed to save order. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
        <Appbar.Content title="Order Capture Studio" titleStyle={{ fontWeight: 'bold' }} />
        <Appbar.Action icon="cog" onPress={() => router.push('/modal')} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* 1. Mode Switcher (New vs Attach) */}
        <ExistingOrderAutocomplete
          mode={mode}
          onModeChange={setMode}
          selectedOrderId={selectedOrderId}
          onSelectOrder={handleSelectExistingOrder}
        />

        {/* 2. Customer Information */}
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
            Customer Profile
          </Text>

          <TextInput
            label="Customer Full Name"
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
        </Surface>

        {/* 3. Dual Item Ingestion: Shared Media */}
        <SharedMediaItemTagger
          mediaItems={sharedMedia}
          itemDrafts={mediaDrafts}
          onUpdateDraft={handleUpdateMediaDraft}
          onRemoveItem={handleRemoveMediaDraft}
        />

        {/* 4. Dual Item Ingestion: Catalog Products */}
        <CatalogOrderItemsList
          items={catalogDrafts}
          onAddItem={handleAddCatalogItem}
          onRemoveItem={handleRemoveCatalogItem}
        />

        {/* 5. Structured Shipping Address & Delhivery Verification */}
        <StructuredAddressForm
          address={shippingAddress}
          onChangeAddress={updates => setShippingAddress(prev => ({ ...prev, ...updates }))}
        />

        {/* 6. Order Origin & Financials Summary */}
        <FinancialsSummaryCard
          source={source}
          onSourceChange={setSource}
          sourceHandle={sourceHandle}
          onSourceHandleChange={setSourceHandle}
          paymentMode={paymentMode}
          onPaymentModeChange={setPaymentMode}
          itemsTotal={itemsTotal}
          shippingCharges={shippingCharges}
          onShippingChargesChange={setShippingCharges}
          advancePaid={advancePaid}
          onAdvancePaidChange={setAdvancePaid}
          totalAmount={totalAmount}
          codBalance={codBalance}
        />

        {/* Order Notes */}
        <TextInput
          label="Order Remarks / Internal Notes"
          value={notes}
          onChangeText={setNotes}
          mode="outlined"
          multiline
          numberOfLines={2}
          style={styles.input}
          outlineColor={theme.colors.outlineVariant}
          activeOutlineColor={theme.colors.secondary}
        />

        {/* Submit Order Action */}
        <Button
          mode="contained"
          onPress={handleSaveOrder}
          loading={isSubmitting}
          disabled={isSubmitting}
          buttonColor={theme.colors.secondary}
          textColor={theme.colors.onSecondary}
          style={styles.submitBtn}
          labelStyle={styles.submitBtnLabel}
        >
          {mode === 'create_new' ? 'Create & Register Order' : `Save & Attach to ${selectedOrderId || 'Order'}`}
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
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: {
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: 'transparent',
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

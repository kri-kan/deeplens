import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchApiClient } from '@/api/client';
import { customersApi } from '@/api/customers';
import { API_ROUTES } from '@/constants/api-routes';
import { OrderIdEntry, PaymentMode, OrderSource } from '@/types/orders';
import {
  OrderIdGeneratorPage,
} from '@/components/tamagui-ui/pages/OrderIdGeneratorPage';
import {
  OrderIdHistoryEntry,
} from '@/components/tamagui-ui/molecules/OrderIdHistoryItem';
import {
  GeneratorSource,
  GeneratorPaymentMode,
  GeneratedOrderResult,
} from '@/components/tamagui-ui/molecules/OrderIdGeneratorCard';

const STORAGE_KEY = 'last_generated_order_ids';

export const OrderIdGenerator = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [recentIds, setRecentIds] = useState<OrderIdEntry[]>([]);
  const [displayId, setDisplayId] = useState<OrderIdEntry | null>(null);
  const [isNewId, setIsNewId] = useState(false);

  useEffect(() => {
    loadRecentIds();
  }, []);

  const loadRecentIds = async () => {
    try {
      // 1. Try to fetch latest from database
      const response = await searchApiClient.get<OrderIdEntry[]>(API_ROUTES.ORDERS.HISTORY, {
        params: { limit: 20 }
      });
      
      if (response && response.length > 0) {
        setRecentIds(response);
        setDisplayId(response[0]);
        setIsNewId(false);
        // Sync local storage with DB
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(response));
        return;
      }
    } catch (e) {
      console.warn('[OrderIdGenerator] Failed to fetch history from API, falling back to local storage', e);
    }

    // 2. Fallback to local storage if API fails or returns empty
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentIds(parsed);
        if (parsed.length > 0) {
          setDisplayId(parsed[0]);
          setIsNewId(false);
        }
      }
    } catch (e) {
      console.error('Failed to load recent IDs from local storage', e);
    }
  };

  const saveRecentIds = async (updated: OrderIdEntry[]) => {
    try {
      setRecentIds(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save IDs', e);
    }
  };

  const handleGenerate = async (
    source: GeneratorSource,
    paymentMode: GeneratorPaymentMode,
    sourceHandle: string
  ) => {
    if (!source) return;

    try {
      setLoading(true);

      const apiSource: OrderSource = source === 'whatsapp' ? 'WhatsApp' : 'Instagram';
      const apiPaymentMode: PaymentMode | null =
        paymentMode === 'cod' ? 'COD' : paymentMode === 'prepaid' ? 'Prepaid' : null;

      let customerId: string | undefined = undefined;

      // Get or create customer if phone or instagram handle provided
      if (sourceHandle) {
        try {
          const customer = await customersApi.getOrCreateCustomer(
            source === 'whatsapp' ? sourceHandle : undefined,
            source === 'instagram' ? sourceHandle : undefined
          );
          customerId = customer.id;
        } catch (e) {
          console.warn('[OrderIdGenerator] Failed to get/create customer:', e);
        }
      }

      const response = await searchApiClient.post<{ orderId: string }>(API_ROUTES.ORDERS.GENERATE, null, {
        params: { 
          source: apiSource, 
          paymentMode: apiPaymentMode || '',
          sourceHandle: sourceHandle || '',
          customerId
        }
      });

      const newEntry: OrderIdEntry = {
        id: response.orderId,
        source: apiSource,
        paymentMode: apiPaymentMode,
        timestamp: new Date().toISOString(),
        customerPhone: source === 'whatsapp' ? sourceHandle : undefined,
        instagramHandle: source === 'instagram' ? sourceHandle : undefined,
        sourceHandle: sourceHandle,
        customerId
      };
      
      const updated = [newEntry, ...recentIds].slice(0, 20);
      await saveRecentIds(updated);
      
      setDisplayId(newEntry);
      setIsNewId(true);
    } catch (error) {
      console.error('Failed to generate Order ID:', error);
      Alert.alert('Error', 'Failed to generate Order ID. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (
    id: string,
    updated: { paymentMode: 'cod' | 'prepaid' | null; sourceHandle: string }
  ) => {
    const existing = recentIds.find((x) => x.id === id);
    if (!existing) return;

    try {
      setLoading(true);
      const apiPaymentMode: PaymentMode | null =
        updated.paymentMode === 'cod' ? 'COD' : updated.paymentMode === 'prepaid' ? 'Prepaid' : null;

      const isWhatsApp = existing.source?.toLowerCase() === 'whatsapp';
      const phone = isWhatsApp ? updated.sourceHandle : existing.customerPhone;
      const igHandle = !isWhatsApp ? updated.sourceHandle : existing.instagramHandle;

      await searchApiClient.put(API_ROUTES.ORDERS.UPDATE(id), {
        customerPhone: phone,
        customerAddress: existing.customerAddress,
        source: existing.source,
        sourceHandle: updated.sourceHandle,
        paymentMode: apiPaymentMode
      });

      const updatedEntry: OrderIdEntry = {
        ...existing,
        paymentMode: apiPaymentMode,
        customerPhone: phone,
        instagramHandle: igHandle,
        sourceHandle: updated.sourceHandle,
      };

      const updatedList = recentIds.map(item => item.id === id ? updatedEntry : item);
      await saveRecentIds(updatedList);
      
      if (displayId?.id === id) {
        setDisplayId(updatedEntry);
      }
    } catch (error) {
      console.error('Failed to update order:', error);
      Alert.alert('Error', 'Failed to update order in database.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (id: string, includePrefix: boolean = false) => {
    const textToCopy = includePrefix ? `order id # ${id}` : id;
    await Clipboard.setStringAsync(textToCopy);
  };

  // Map to Tamagui history items
  const historyMapped: OrderIdHistoryEntry[] = recentIds.map((item) => ({
    id: item.id,
    source: item.source?.toLowerCase() === 'whatsapp' ? 'whatsapp' : 'instagram',
    paymentMode: item.paymentMode ? (item.paymentMode.toLowerCase() as 'cod' | 'prepaid') : null,
    timestamp: item.timestamp,
    customerPhone: item.customerPhone,
    instagramHandle: item.instagramHandle,
    sourceHandle: item.sourceHandle || item.customerPhone || item.instagramHandle,
    isDeleted: item.isDeleted,
  }));

  const generatedMapped: GeneratedOrderResult | null = displayId
    ? {
        id: displayId.id,
        source: displayId.source?.toLowerCase() === 'whatsapp' ? 'whatsapp' : 'instagram',
        paymentMode: displayId.paymentMode
          ? (displayId.paymentMode.toLowerCase() as 'cod' | 'prepaid')
          : null,
        timestamp: displayId.timestamp,
        sourceHandle: displayId.sourceHandle || displayId.customerPhone || displayId.instagramHandle,
        isNew: isNewId,
      }
    : null;

  return (
    <OrderIdGeneratorPage
      initialRecentIds={historyMapped}
      initialGeneratedEntry={generatedMapped}
      isLoading={loading}
      onGenerateOrder={handleGenerate}
      onUpdateOrder={handleUpdate}
      onCopy={copyToClipboard}
      onNavigateToDetails={(id) => router.push(`/utilities/order-details/${id}`)}
      onOpenSettings={() => router.push('/modal')}
    />
  );
};

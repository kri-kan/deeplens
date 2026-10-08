import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchApiClient } from '@/api/client';
import { customersApi } from '@/api/customers';
import { API_ROUTES } from '@/constants/api-routes';
import { logisticsService } from '@/services/logistics.service';
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
  const [recentLimit, setRecentLimit] = useState<number>(50);

  const loadRecentIds = useCallback(async (limitToFetch: number = 50) => {
    try {
      // 1. Try to fetch latest from database
      const response = await searchApiClient.get<OrderIdEntry[]>(API_ROUTES.ORDERS.HISTORY, {
        params: { limit: limitToFetch, showDeleted: false }
      });
      
      if (response && Array.isArray(response)) {
        const validOrders = response.filter(
          (item) => !item.isDeleted && !logisticsService.isOrderDeleted(item.id)
        );
        setRecentIds(validOrders);
        if (validOrders.length > 0) {
          setDisplayId(validOrders[0]);
        } else {
          setDisplayId(null);
        }
        setIsNewId(false);
        // Sync local storage with DB
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validOrders));
        return;
      }
    } catch (e) {
      console.warn('[OrderIdGenerator] Failed to fetch history from API, falling back to local storage', e);
    }

    // 2. Fallback to local storage if API fails or returns empty
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: OrderIdEntry[] = JSON.parse(stored);
        const filtered = parsed.filter(
          (item) => !item.isDeleted && !logisticsService.isOrderDeleted(item.id)
        );
        setRecentIds(filtered.slice(0, limitToFetch));
        if (filtered.length > 0) {
          setDisplayId(filtered[0]);
          setIsNewId(false);
        } else {
          setDisplayId(null);
        }
      }
    } catch (e) {
      console.error('Failed to load recent IDs from local storage', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecentIds(recentLimit);
    }, [loadRecentIds, recentLimit])
  );

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
    try {
      setLoading(true);

      const apiSource: OrderSource =
        source === 'whatsapp' ? 'WhatsApp' : source === 'instagram' ? 'Instagram' : 'None';
      const apiPaymentMode: PaymentMode =
        paymentMode === 'cod' ? 'COD' : paymentMode === 'prepaid' ? 'Prepaid' : 'None';

      let customerId: string | undefined = undefined;

      // Get or create customer only if sourceHandle is provided and non-empty
      const trimmedHandle = sourceHandle?.trim();
      if (trimmedHandle && source) {
        try {
          const customer = await customersApi.getOrCreateCustomer(
            source === 'whatsapp' ? trimmedHandle : undefined,
            source === 'instagram' ? trimmedHandle : undefined
          );
          customerId = customer.id;
        } catch (e) {
          console.warn('[OrderIdGenerator] Failed to get/create customer:', e);
        }
      }

      const params: Record<string, any> = {};
      if (apiSource && apiSource !== 'None') params.source = apiSource;
      if (apiPaymentMode && apiPaymentMode !== 'None') params.paymentMode = apiPaymentMode;
      if (trimmedHandle) params.sourceHandle = trimmedHandle;
      if (customerId) params.customerId = customerId;

      const response = await searchApiClient.post<{ orderId: string }>(API_ROUTES.ORDERS.GENERATE, null, {
        params
      });

      const newEntry: OrderIdEntry = {
        id: response.orderId,
        source: apiSource || 'None',
        paymentMode: apiPaymentMode !== 'None' ? apiPaymentMode : null,
        timestamp: new Date().toISOString(),
        customerPhone: source === 'whatsapp' ? trimmedHandle : undefined,
        instagramHandle: source === 'instagram' ? trimmedHandle : undefined,
        sourceHandle: trimmedHandle || undefined,
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
    source:
      item.source?.toLowerCase() === 'whatsapp'
        ? 'whatsapp'
        : item.source?.toLowerCase() === 'instagram'
        ? 'instagram'
        : (item.source || 'None'),
    paymentMode:
      item.paymentMode && item.paymentMode !== 'None'
        ? (item.paymentMode.toLowerCase() as 'cod' | 'prepaid')
        : null,
    timestamp: item.timestamp,
    customerPhone: item.customerPhone,
    instagramHandle: item.instagramHandle,
    sourceHandle: item.sourceHandle || item.customerPhone || item.instagramHandle,
    isDeleted: item.isDeleted,
  }));

  const generatedMapped: GeneratedOrderResult | null = displayId
    ? {
        id: displayId.id,
        source:
          displayId.source?.toLowerCase() === 'whatsapp'
            ? 'whatsapp'
            : displayId.source?.toLowerCase() === 'instagram'
            ? 'instagram'
            : null,
        paymentMode:
          displayId.paymentMode && displayId.paymentMode !== 'None'
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
      recentLimit={recentLimit}
      isLoading={loading}
      onGenerateOrder={handleGenerate}
      onUpdateOrder={handleUpdate}
      onRecentLimitChange={setRecentLimit}
      onNavigateToAllOrders={() => router.push('/utilities/all-orders')}
      onCopy={copyToClipboard}
      onNavigateToDetails={(id) => router.push(`/utilities/order-details/${id}`)}
      onOpenSettings={() => router.push('/modal')}
      onBack={() => router.back()}
    />
  );
};

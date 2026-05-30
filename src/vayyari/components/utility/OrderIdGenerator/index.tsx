import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Surface, Text, Appbar, Button, Icon, ActivityIndicator, IconButton, useTheme, Snackbar, TextInput, Switch } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { searchApiClient } from '@/api/client';
import { customersApi } from '@/api/customers';
import { API_ROUTES } from '@/constants/api-routes';
import { HistoryItem } from './HistoryItem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStyles } from './styles';
import * as Clipboard from 'expo-clipboard';
import { ProfileCopyIcon } from '../../icons/ProfileCopyIcon';
import { GeneratedIdCard } from './GeneratedIdCard';

import { OrderIdEntry, PaymentMode } from '@/types/orders';

const STORAGE_KEY = 'last_generated_order_ids';

export const OrderIdGenerator = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState<'WhatsApp' | 'Instagram' | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentIds, setRecentIds] = useState<OrderIdEntry[]>([]);
  const [displayId, setDisplayId] = useState<OrderIdEntry | null>(null);
  const [isNewId, setIsNewId] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sourceHandle, setSourceHandle] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

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

  const isGenerateDisabled = () => {
    if (!selectedSource) return true;
    if (loading) return true;
    if (!sourceHandle || sourceHandle.trim().length === 0) return true;
    
    if (selectedSource === 'WhatsApp') {
      const digits = sourceHandle.replace(/\D/g, '');
      if (digits.length < 10) return true;
    }
    return false;
  };

  const handleGenerate = async () => {
    if (!selectedSource) return;

    try {
      setLoading(true);

      let customerId: string | undefined = undefined;

      // Get or create customer if phone or instagram handle provided
      if (sourceHandle) {
        try {
          const customer = await customersApi.getOrCreateCustomer(
            selectedSource === 'WhatsApp' ? sourceHandle : undefined,
            selectedSource === 'Instagram' ? sourceHandle : undefined
          );
          customerId = customer.id;
        } catch (e) {
          console.warn('[OrderIdGenerator] Failed to get/create customer:', e);
          // Proceed without customer ID if it fails
        }
      }

      const response = await searchApiClient.post<{ orderId: string }>(API_ROUTES.ORDERS.GENERATE, null, {
        params: { 
          source: selectedSource, 
          paymentMode: paymentMode || '' ,
          sourceHandle: sourceHandle || '',
          customerId
        }
      });
      const newEntry: OrderIdEntry = {
        id: response.orderId,
        source: selectedSource,
        paymentMode: paymentMode,
        timestamp: new Date().toISOString(),
        customerPhone: selectedSource === 'WhatsApp' ? sourceHandle : undefined,
        instagramHandle: selectedSource === 'Instagram' ? sourceHandle : undefined,
        customerId
      };
      
      const updated = [newEntry, ...recentIds].slice(0, 10);
      await saveRecentIds(updated);
      
      setDisplayId(newEntry);
      setIsNewId(true);
      
      setSelectedSource(null);
      setPaymentMode(null);
      setSourceHandle('');
    } catch (error) {
      console.error('Failed to generate Order ID:', error);
      Alert.alert('Error', 'Failed to generate Order ID. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, updatedEntry: OrderIdEntry) => {
    try {
      setLoading(true);
      await searchApiClient.put(API_ROUTES.ORDERS.UPDATE(id), {
        customerPhone: updatedEntry.customerPhone,
        customerAddress: updatedEntry.customerAddress,
        source: updatedEntry.source,
        sourceHandle: updatedEntry.instagramHandle || updatedEntry.customerPhone,
        paymentMode: updatedEntry.paymentMode
      });

      const updated = recentIds.map(item => item.id === id ? updatedEntry : item);
      await saveRecentIds(updated);
      
      if (displayId?.id === id) {
        setDisplayId(updatedEntry);
      }
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update order:', error);
      Alert.alert('Error', 'Failed to update order in database.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (id: string, includePrefix: boolean = false) => {
    const textToCopy = includePrefix ? `order id # ${id}` : id;
    console.log('Copied to clipboard:', textToCopy);
    await Clipboard.setStringAsync(textToCopy);
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours < 24) {
      if (diffHours < 1) {
        return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} mins ago`;
      }
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }

    return date.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderHistoryItem = ({ item }: { item: OrderIdEntry }) => (
    <HistoryItem 
      item={item}
      isEditing={editingId === item.id}
      onEdit={setEditingId}
      onUpdate={handleUpdate}
      onCopy={copyToClipboard}
      formatTimeAgo={formatTimeAgo}
      styles={styles}
    />
  );

  return (
    <Surface style={styles.container} elevation={0}>
      <Appbar.Header style={styles.appbarHeader}>
        <Appbar.Content title="Order ID Generator" titleStyle={styles.headerTitle} />
        <Appbar.Action icon="cog" onPress={() => router.push('/modal')} size={20} />
      </Appbar.Header>

      <View style={styles.content}>
        <View style={styles.selectionRow}>
          <TouchableOpacity 
            style={styles.pureIconContainer}
            onPress={() => {
              setSelectedSource('WhatsApp');
              setIsNewId(false);
            }}
          >
            <Icon 
              source="whatsapp" 
              size={55} 
              color={selectedSource === 'WhatsApp' ? '#25D366' : theme.colors.outline} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.pureIconContainer}
            onPress={() => {
              setSelectedSource('Instagram');
              setIsNewId(false);
            }}
          >
            <Icon 
              source="instagram" 
              size={55} 
              color={selectedSource === 'Instagram' ? '#E4405F' : theme.colors.outline} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.paymentButton, paymentMode === 'COD' && styles.paymentButtonSelected]}
            onPress={() => setPaymentMode('COD')}
          >
            <Text style={[styles.paymentText, paymentMode === 'COD' && styles.paymentTextSelected]}>
              COD
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.paymentButton, paymentMode === 'Prepaid' && styles.paymentButtonSelected]}
            onPress={() => setPaymentMode('Prepaid')}
          >
            <Text style={[styles.paymentText, paymentMode === 'Prepaid' && styles.paymentTextSelected]}>
              Prepaid
            </Text>
          </TouchableOpacity>
        </View>
        
        {selectedSource && (
          <View>
            <TextInput
              label={selectedSource === 'WhatsApp' ? 'Phone Number *' : 'Instagram URL / Handle *'}
              value={sourceHandle}
              onChangeText={setSourceHandle}
              mode="outlined"
              style={styles.sourceHandleInput}
              keyboardType={selectedSource === 'WhatsApp' ? 'phone-pad' : 'default'}
              left={<TextInput.Icon icon={selectedSource === 'WhatsApp' ? 'phone' : 'instagram'} />}
              placeholder={selectedSource === 'WhatsApp' ? '+91 99999 00000' : 'instagram.com/username'}
            />
          </View>
        )}

        <Button 
          mode="contained" 
          onPress={handleGenerate} 
          disabled={isGenerateDisabled()}
          loading={loading}
          style={[
            styles.generateButton,
            selectedSource && !loading ? styles.generateButtonEnabled : styles.generateButtonDisabled
          ]}
          labelStyle={[
            styles.generateButtonLabel,
            selectedSource && !loading ? styles.generateButtonLabelEnabled : styles.generateButtonLabelDisabled
          ]}
          contentStyle={styles.generateButtonContent}
        >
          {loading ? 'Generating...' : selectedSource ? 'Generate Order ID' : 'Select Platform'}
        </Button>

        <GeneratedIdCard 
          entry={displayId}
          isNew={isNewId}
          onCopy={copyToClipboard}
          formatTimeAgo={formatTimeAgo}
          styles={styles}
        />
      </View>

      <View style={styles.listSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.listTitle}>Recent IDs</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 16 }}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Show Deleted</Text>
            <Switch value={showDeleted} onValueChange={setShowDeleted} />
          </View>
        </View>
        <FlatList
          data={showDeleted ? recentIds : recentIds.filter(item => !item.isDeleted)}
          keyExtractor={(item) => item.id + item.timestamp}
          renderItem={renderHistoryItem}
          ListEmptyComponent={<Text style={styles.emptyText}>No recent activity</Text>}
        />
      </View>

    </Surface>
  );
};

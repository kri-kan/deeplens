import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Surface, Text, Appbar, Button, Icon, ActivityIndicator, IconButton, useTheme, Snackbar, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { searchApiClient } from '@/api/client';
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
  const [detectedInstaId, setDetectedInstaId] = useState<string | null>(null);
  const [isLookupLoading, setIsLookupLoading] = useState(false);

  useEffect(() => {
    loadRecentIds();
  }, []);

  useEffect(() => {
    if (selectedSource === 'Instagram' && sourceHandle.trim().length > 3) {
      const handler = setTimeout(() => {
        fetchInstagramId(sourceHandle.trim());
      }, 400); // Faster trigger after paste
      return () => clearTimeout(handler);
    } else {
      setDetectedInstaId(null);
    }
  }, [sourceHandle, selectedSource]);

  const fetchInstagramId = async (handle: string) => {
    let username = handle;
    if (handle.includes('instagram.com/')) {
       const parts = handle.split('instagram.com/')[1].split('/')[0].split('?')[0];
       if (parts) username = parts;
    }
    
    // Remote any @ if present
    username = username.replace('@', '');

    try {
      setIsLookupLoading(true);
      const response = await searchApiClient.get<{ profile: { userId: string } }>(`/api/v1/insta/profile/${username}`);
      setDetectedInstaId(response.profile.userId);
    } catch (e) {
      console.warn('[OrderIdGenerator] Failed to fetch insta id', e);
      setDetectedInstaId(null);
    } finally {
      setIsLookupLoading(false);
    }
  };

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

  const handleGenerate = async () => {
    if (!selectedSource) return;

    try {
      setLoading(true);
      const response = await searchApiClient.post<{ orderId: string }>(API_ROUTES.ORDERS.GENERATE, null, {
        params: { 
          source: selectedSource, 
          paymentMode: paymentMode || '' ,
          sourceHandle: sourceHandle || '',
          instagramUserId: detectedInstaId || ''
        }
      });
      const newEntry: OrderIdEntry = {
        id: response.orderId,
        source: selectedSource,
        paymentMode: paymentMode,
        timestamp: new Date().toISOString(),
        customerPhone: selectedSource === 'WhatsApp' ? sourceHandle : undefined,
        instagramHandle: selectedSource === 'Instagram' ? sourceHandle : undefined,
        instagramUserId: selectedSource === 'Instagram' ? (detectedInstaId || undefined) : undefined,
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
              label={selectedSource === 'WhatsApp' ? 'Phone Number (Optional)' : 'Instagram URL (Optional)'}
              value={sourceHandle}
              onChangeText={setSourceHandle}
              mode="outlined"
              style={styles.sourceHandleInput}
              keyboardType={selectedSource === 'WhatsApp' ? 'phone-pad' : 'default'}
              left={<TextInput.Icon icon={selectedSource === 'WhatsApp' ? 'phone' : 'instagram'} />}
              right={isLookupLoading ? <TextInput.Icon icon={() => <ActivityIndicator size="small" color={theme.colors.primary} />} /> : null}
              placeholder={selectedSource === 'WhatsApp' ? '+91 99999 00000' : 'instagram.com/username'}
            />
            {selectedSource === 'Instagram' && detectedInstaId && (
              <Text style={{ fontSize: 11, color: theme.colors.outline, marginTop: 4, marginLeft: 12 }}>
                Permanent ID: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{detectedInstaId}</Text>
              </Text>
            )}
          </View>
        )}

        <Button 
          mode="contained" 
          onPress={handleGenerate} 
          disabled={!selectedSource || loading || isLookupLoading}
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
        <Text style={styles.listTitle}>Recent IDs</Text>
        <FlatList
          data={recentIds}
          keyExtractor={(item) => item.id + item.timestamp}
          renderItem={renderHistoryItem}
          ListEmptyComponent={<Text style={styles.emptyText}>No recent activity</Text>}
        />
      </View>

    </Surface>
  );
};

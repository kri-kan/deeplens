import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Surface, Text, Appbar, Button, Icon, ActivityIndicator, IconButton, useTheme, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { searchApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { HistoryItem } from './HistoryItem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStyles } from './styles';
import * as Clipboard from 'expo-clipboard';
import { ProfileCopyIcon } from '../../icons/ProfileCopyIcon';
import { GeneratedIdCard } from './GeneratedIdCard';

import { OrderIdEntry } from '@/types/orders';

const STORAGE_KEY = 'last_generated_order_ids';

export const OrderIdGenerator = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const [selectedSource, setSelectedSource] = useState<'whatsapp' | 'instagram' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'Prepaid' | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentIds, setRecentIds] = useState<OrderIdEntry[]>([]);
  const [displayId, setDisplayId] = useState<OrderIdEntry | null>(null);
  const [isNewId, setIsNewId] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const handleGenerate = async () => {
    if (!selectedSource) return;

    try {
      setLoading(true);
      const response = await searchApiClient.post<{ orderId: string }>(API_ROUTES.ORDERS.GENERATE, null, {
        params: { 
          source: selectedSource, 
          paymentMode: paymentMethod || '' 
        }
      });
      const newEntry: OrderIdEntry = {
        id: response.orderId,
        source: selectedSource,
        paymentMethod: paymentMethod,
        timestamp: new Date().toISOString(),
      };
      
      const updated = [newEntry, ...recentIds].slice(0, 10);
      await saveRecentIds(updated);
      
      setDisplayId(newEntry);
      setIsNewId(true);
      
      setSelectedSource(null);
      setPaymentMethod(null);
    } catch (error) {
      console.error('Failed to generate Order ID:', error);
      Alert.alert('Error', 'Failed to generate Order ID. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, updatedEntry: OrderIdEntry) => {
    const updated = recentIds.map(item => item.id === id ? updatedEntry : item);
    await saveRecentIds(updated);
    if (displayId?.id === id) {
      setDisplayId(updatedEntry);
    }
    setEditingId(null);
  };

  const copyToClipboard = async (id: string, includePrefix: boolean = false) => {
    const textToCopy = includePrefix ? `order id # ${id}` : id;
    console.log('Copied to clipboard:', textToCopy);
    await Clipboard.setStringAsync(textToCopy);
    setSnackbarVisible(true);
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
        <Appbar.BackAction onPress={() => router.back()} size={20} />
        <Appbar.Content title="Order ID Generator" titleStyle={styles.headerTitle} />
        <Appbar.Action icon="cog" onPress={() => router.push('/modal')} size={20} />
      </Appbar.Header>

      <View style={styles.content}>
        <View style={styles.selectionRow}>
          <TouchableOpacity 
            style={styles.pureIconContainer}
            onPress={() => {
              setSelectedSource('whatsapp');
              setIsNewId(false);
            }}
          >
            <Icon 
              source="whatsapp" 
              size={55} 
              color={selectedSource === 'whatsapp' ? '#25D366' : theme.colors.outline} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.pureIconContainer}
            onPress={() => {
              setSelectedSource('instagram');
              setIsNewId(false);
            }}
          >
            <Icon 
              source="instagram" 
              size={55} 
              color={selectedSource === 'instagram' ? '#E4405F' : theme.colors.outline} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.paymentButton, paymentMethod === 'COD' && styles.paymentButtonSelected]}
            onPress={() => setPaymentMethod('COD')}
          >
            <Text style={[styles.paymentText, paymentMethod === 'COD' && styles.paymentTextSelected]}>
              COD
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.paymentButton, paymentMethod === 'Prepaid' && styles.paymentButtonSelected]}
            onPress={() => setPaymentMethod('Prepaid')}
          >
            <Text style={[styles.paymentText, paymentMethod === 'Prepaid' && styles.paymentTextSelected]}>
              Prepaid
            </Text>
          </TouchableOpacity>
        </View>

        <Button 
          mode="contained" 
          onPress={handleGenerate} 
          disabled={!selectedSource || loading}
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

      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={2000}>
        ID copied to clipboard
      </Snackbar>
    </Surface>
  );
};

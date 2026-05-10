import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Surface, Text, Icon, IconButton, useTheme, Portal, Dialog, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import { searchApiClient } from '@/api/client';
import { useRouter } from 'expo-router';
import { OrderIdEntry, PaymentMode } from '@/types/orders';
import { ProfileCopyIcon } from '../../icons/ProfileCopyIcon';
import { PlatformHandle } from '../../ui/PlatformHandle';

interface HistoryItemProps {
  item: OrderIdEntry;
  isEditing: boolean;
  onEdit: (id: string | null) => void;
  onUpdate: (id: string, updated: OrderIdEntry) => void;
  onCopy: (id: string, includePrefix?: boolean) => void;
  formatTimeAgo: (timestamp: string) => string;
  styles: any;
}

export const HistoryItem = ({ 
  item, 
  isEditing, 
  onEdit, 
  onUpdate, 
  onCopy, 
  formatTimeAgo, 
  styles 
}: HistoryItemProps) => {
  const theme = useTheme();
  const router = useRouter();
  const [editSource, setEditSource] = useState(item.source);
  const [editPaymentMode, setEditPaymentMode] = useState<PaymentMode | null>(item.paymentMode);
  const [editHandle, setEditHandle] = useState(item.source === 'WhatsApp' ? item.customerPhone || '' : item.instagramHandle || '');
  const [detectedInstaId, setDetectedInstaId] = useState<string | null>(item.instagramUserId || null);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  
  const hasChanged = editSource !== item.source || 
                    editPaymentMode !== item.paymentMode || 
                    editHandle !== (item.source === 'WhatsApp' ? (item.customerPhone || '') : (item.instagramHandle || ''));

  // Sync handle when platform is switched in the edit form
  React.useEffect(() => {
    setEditHandle(editSource === 'WhatsApp' ? (item.customerPhone || '') : (item.instagramHandle || ''));
  }, [editSource, item.customerPhone, item.instagramHandle]);

  const handleReset = () => {
    setEditSource(item.source);
    setEditPaymentMode(item.paymentMode);
    setEditHandle(item.source === 'WhatsApp' ? item.customerPhone || '' : item.instagramHandle || '');
    setDetectedInstaId(item.instagramUserId || null);
  };

  // Debounced Instagram ID Lookup
  React.useEffect(() => {
    if (isEditing && editSource === 'Instagram' && editHandle.trim().length > 3) {
      const handler = setTimeout(() => {
        fetchInstagramId(editHandle.trim());
      }, 400); 
      return () => clearTimeout(handler);
    }
  }, [editHandle, editSource, isEditing]);

  const fetchInstagramId = async (handle: string) => {
    let username = handle;
    if (handle.includes('instagram.com/')) {
        const parts = handle.split('instagram.com/')[1].split('/')[0].split('?')[0];
        if (parts) username = parts;
    }
    username = username.replace('@', '');

    try {
      setIsLookupLoading(true);
      const response = await searchApiClient.get<{ profile: { userId: string } }>(`/api/v1/insta/profile/${username}`);
      setDetectedInstaId(response.profile.userId);
    } catch (e) {
      console.warn('[HistoryItem] Failed to fetch insta id', e);
      // Keep existing ID if lookup fails
    } finally {
      setIsLookupLoading(false);
    }
  };

  const handleSave = () => {
    performUpdate();
  };

  const performUpdate = (finalHandle?: string) => {
    const handleValue = finalHandle !== undefined ? finalHandle : editHandle;
    
    onUpdate(item.id, { 
      ...item, 
      source: editSource, 
      paymentMode: editPaymentMode,
      customerPhone: editSource === 'WhatsApp' ? handleValue : '',
      instagramHandle: editSource === 'Instagram' ? handleValue : '',
      instagramUserId: editSource === 'Instagram' ? (detectedInstaId || item.instagramUserId) : undefined,
    });
    onEdit(null);
  };


  return (
    <>
    <Surface style={styles.historyItem} elevation={0}>
      <View style={styles.historyLeft}>
        <PlatformHandle 
          source={item.source} 
          handle={item.source === 'WhatsApp' ? (item.customerPhone || '') : (item.instagramHandle || item.sourceHandle || '')}
          size={32}
          showText={false}
        />
        <View style={{ flex: 1, marginLeft: 2 }}>
          <TouchableOpacity onPress={() => router.push(`/utilities/order-details/${item.id}`)}>
            <Text style={[styles.historySubtitle, { marginBottom: -2 }]}>
              ID: <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{item.id}</Text>
            </Text>
          </TouchableOpacity>
          <Text style={styles.historySubtitle}>
            {item.paymentMode && item.paymentMode !== 'None' ? `${item.paymentMode} • ` : ''}{formatTimeAgo(item.timestamp)}
          </Text>
        </View>
      </View>
      <View style={styles.historyActions}>
        <IconButton 
          icon="content-copy" 
          size={24} 
          onPress={() => onCopy(item.id)} 
          iconColor={theme.colors.outline}
          style={styles.iconButton}
        />
        <IconButton 
          icon={props => <ProfileCopyIcon {...props} />} 
          size={24} 
          onPress={() => onCopy(item.id, true)} 
          iconColor={theme.colors.outline}
          style={styles.iconButton}
        />    
        <IconButton 
          icon="pencil" 
          size={24} 
          onPress={() => {
            handleReset();
            onEdit(item.id);
          }} 
          iconColor={theme.colors.outline}
          style={styles.iconButtonPencil}
        />
      </View>
    </Surface>

    <Portal>
      {/* Main Edit Dialog */}
      <Dialog visible={isEditing} onDismiss={() => onEdit(null)} style={{ borderRadius: 16 }}>
        <Dialog.Title style={{ fontWeight: 'bold' }}>Edit Order: {item.id}</Dialog.Title>
        <Dialog.Content style={{ gap: 16 }}>
          <View style={[styles.selectionRow, { justifyContent: 'center' }]}>
            <TouchableOpacity 
              style={styles.pureIconContainer}
              onPress={() => setEditSource('WhatsApp')}
            >
              <Icon 
                source="whatsapp" 
                size={48} 
                color={editSource === 'WhatsApp' ? '#25D366' : theme.colors.outline} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.pureIconContainer}
              onPress={() => setEditSource('Instagram')}
            >
              <Icon 
                source="instagram" 
                size={48} 
                color={editSource === 'Instagram' ? '#E4405F' : theme.colors.outline} 
              />
            </TouchableOpacity>
          </View>

          <View>
            <TextInput
              label={editSource === 'WhatsApp' ? 'Phone Number' : 'Instagram URL'}
              value={editHandle}
              onChangeText={setEditHandle}
              mode="outlined"
              dense
              keyboardType={editSource === 'WhatsApp' ? 'phone-pad' : 'default'}
              left={<TextInput.Icon icon={editSource === 'WhatsApp' ? 'phone' : 'instagram'} />}
              right={isLookupLoading ? <TextInput.Icon icon={() => <ActivityIndicator size="small" color={theme.colors.primary} />} /> : null}
            />
            {editSource === 'Instagram' && detectedInstaId && (
              <Text style={{ fontSize: 11, color: theme.colors.outline, marginTop: 4, marginLeft: 12 }}>
                Permanent ID: <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{detectedInstaId}</Text>
              </Text>
            )}
          </View>

          <View style={styles.selectionRow}>
            <TouchableOpacity 
              style={[styles.paymentButton, editPaymentMode === 'COD' && styles.paymentButtonSelected]}
              onPress={() => setEditPaymentMode('COD')}
            >
              <Text style={[styles.paymentText, editPaymentMode === 'COD' && styles.paymentTextSelected]}>COD</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.paymentButton, editPaymentMode === 'Prepaid' && styles.paymentButtonSelected]}
              onPress={() => setEditPaymentMode('Prepaid')}
            >
              <Text style={[styles.paymentText, editPaymentMode === 'Prepaid' && styles.paymentTextSelected]}>Prepaid</Text>
            </TouchableOpacity>
          </View>
        </Dialog.Content>
        <Dialog.Actions style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <IconButton 
              icon="refresh" 
              size={28} 
              onPress={handleReset}
              disabled={!hasChanged}
              iconColor={theme.colors.outline}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <IconButton 
                icon="close" 
                size={28} 
                onPress={() => onEdit(null)} 
                iconColor={theme.colors.error}
              />
              <IconButton 
                icon="check" 
                size={28} 
                onPress={handleSave}
                disabled={!hasChanged || isLookupLoading}
                iconColor={theme.colors.primary}
                mode="contained"
                style={{ backgroundColor: theme.colors.primaryContainer }}
              />
            </View>
          </View>
        </Dialog.Actions>
      </Dialog>
    </Portal>
    </>
  );
};

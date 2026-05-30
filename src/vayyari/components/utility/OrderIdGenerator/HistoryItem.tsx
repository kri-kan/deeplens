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
  const [editPaymentMode, setEditPaymentMode] = useState<PaymentMode | null>(item.paymentMode);
  const [editHandle, setEditHandle] = useState(item.source === 'WhatsApp' ? item.customerPhone || '' : item.instagramHandle || '');
  
  const hasChanged = editPaymentMode !== item.paymentMode || 
                     editHandle !== (item.source === 'WhatsApp' ? (item.customerPhone || '') : (item.instagramHandle || ''));

  const handleReset = () => {
    setEditPaymentMode(item.paymentMode);
    setEditHandle(item.source === 'WhatsApp' ? item.customerPhone || '' : item.instagramHandle || '');
  };

  const handleSave = () => {
    performUpdate();
  };

  const performUpdate = () => {
    onUpdate(item.id, { 
      ...item, 
      paymentMode: editPaymentMode,
      customerPhone: item.source === 'WhatsApp' ? editHandle : '',
      instagramHandle: item.source === 'Instagram' ? editHandle : '',
    });
    onEdit(null);
  };


  return (
    <>
    <Surface style={[styles.historyItem, item.isDeleted && { opacity: 0.5, backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
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
              {item.isDeleted && <Text style={{ color: theme.colors.error, fontSize: 10, fontWeight: 'bold' }}> [DELETED]</Text>}
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
          disabled={item.isDeleted}
        />
      </View>
    </Surface>

    <Portal>
      {/* Main Edit Dialog */}
      <Dialog visible={isEditing} onDismiss={() => onEdit(null)} style={{ borderRadius: 16 }}>
        <Dialog.Title style={{ fontWeight: 'bold' }}>Edit Order: {item.id}</Dialog.Title>
        <Dialog.Content style={{ gap: 16 }}>
          <View>
            <TextInput
              label={item.source === 'WhatsApp' ? 'Phone Number' : 'Instagram URL'}
              value={editHandle}
              onChangeText={setEditHandle}
              mode="outlined"
              dense
              keyboardType={item.source === 'WhatsApp' ? 'phone-pad' : 'default'}
              left={<TextInput.Icon icon={item.source === 'WhatsApp' ? 'phone' : 'instagram'} />}
            />
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
                disabled={!hasChanged}
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

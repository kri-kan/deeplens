import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Surface, Text, Icon, IconButton, useTheme, Portal, Dialog, Button, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { OrderIdEntry } from '@/types/orders';
import { ProfileCopyIcon } from '../../icons/ProfileCopyIcon';

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
  const [editPayment, setEditPayment] = useState(item.paymentMethod);
  const [editHandle, setEditHandle] = useState(item.source === 'whatsapp' ? item.customerPhone || '' : item.instagramHandle || '');
  
  const hasChanged = editSource !== item.source || 
                    editPayment !== item.paymentMethod || 
                    editHandle !== (item.source === 'whatsapp' ? (item.customerPhone || '') : (item.instagramHandle || ''));

  // Sync handle when platform is switched in the edit form
  React.useEffect(() => {
    setEditHandle(editSource === 'whatsapp' ? (item.customerPhone || '') : (item.instagramHandle || ''));
  }, [editSource, item.customerPhone, item.instagramHandle]);

  const handleReset = () => {
    setEditSource(item.source);
    setEditPayment(item.paymentMethod);
    setEditHandle(item.source === 'whatsapp' ? item.customerPhone || '' : item.instagramHandle || '');
  };

  const handleSave = () => {
    performUpdate();
  };

  const performUpdate = (finalHandle?: string) => {
    const handleValue = finalHandle !== undefined ? finalHandle : editHandle;
    
    onUpdate(item.id, { 
      ...item, 
      source: editSource, 
      paymentMethod: editPayment,
      customerPhone: editSource === 'whatsapp' ? handleValue : '',
      instagramHandle: editSource === 'instagram' ? handleValue : '',
    });
    onEdit(null);
  };

  const confirmSourceChange = () => {
    performUpdate(newSourceHandle);
    setIsConfirmVisible(false);
  };

  return (
    <>
    <Surface style={styles.historyItem} elevation={0}>
      <View style={styles.historyLeft}>
        <Icon 
          source={item.source === 'whatsapp' ? 'whatsapp' : 'instagram'} 
          size={28} 
          color={item.source === 'whatsapp' ? '#25D366' : '#E4405F'} 
        />
        <View>
          <TouchableOpacity onPress={() => router.push(`/utilities/order-details/${item.id}`)}>
            <Text style={styles.historyId}>{item.id}</Text>
          </TouchableOpacity>
          <Text style={styles.historySubtitle}>
            {item.paymentMethod ? `${item.paymentMethod} • ` : ''}{formatTimeAgo(item.timestamp)}
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
              onPress={() => setEditSource('whatsapp')}
            >
              <Icon 
                source="whatsapp" 
                size={48} 
                color={editSource === 'whatsapp' ? '#25D366' : theme.colors.outline} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.pureIconContainer}
              onPress={() => setEditSource('instagram')}
            >
              <Icon 
                source="instagram" 
                size={48} 
                color={editSource === 'instagram' ? '#E4405F' : theme.colors.outline} 
              />
            </TouchableOpacity>
          </View>

          <TextInput
            label={editSource === 'whatsapp' ? 'Phone Number' : 'Instagram URL'}
            value={editHandle}
            onChangeText={setEditHandle}
            mode="outlined"
            dense
            keyboardType={editSource === 'whatsapp' ? 'phone-pad' : 'default'}
            left={<TextInput.Icon icon={editSource === 'whatsapp' ? 'phone' : 'instagram'} />}
          />

          <View style={styles.selectionRow}>
            <TouchableOpacity 
              style={[styles.paymentButton, editPayment === 'COD' && styles.paymentButtonSelected]}
              onPress={() => setEditPayment('COD')}
            >
              <Text style={[styles.paymentText, editPayment === 'COD' && styles.paymentTextSelected]}>COD</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.paymentButton, editPayment === 'Prepaid' && styles.paymentButtonSelected]}
              onPress={() => setEditPayment('Prepaid')}
            >
              <Text style={[styles.paymentText, editPayment === 'Prepaid' && styles.paymentTextSelected]}>Prepaid</Text>
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

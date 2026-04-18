import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Surface, Text, Icon, IconButton, useTheme } from 'react-native-paper';
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
  const [editSource, setEditSource] = useState(item.source);
  const [editPayment, setEditPayment] = useState(item.paymentMethod);

  const hasChanged = editSource !== item.source || editPayment !== item.paymentMethod;

  if (isEditing) {
    return (
      <Surface style={styles.historyItem} elevation={0}>
        <View style={styles.editContainer}>
          <View style={styles.editLeftPartition}>
            <View style={styles.editIdSection}>
              <Text style={styles.editIdText}>{item.id}</Text>
            </View>
            
            <View style={styles.editControlsSection}>
              <View style={styles.editIconGroup}>
                <TouchableOpacity onPress={() => setEditSource('whatsapp')}>
                  <Icon 
                    source="whatsapp" 
                    size={32} 
                    color={editSource === 'whatsapp' ? '#25D366' : theme.colors.outline} 
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditSource('instagram')}>
                  <Icon 
                    source="instagram" 
                    size={32} 
                    color={editSource === 'instagram' ? '#E4405F' : theme.colors.outline} 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.editPaymentGroup}>
                <TouchableOpacity 
                  style={[styles.editMiniPaymentBtn, editPayment === 'COD' && styles.editMiniPaymentBtnSelected]} 
                  onPress={() => setEditPayment('COD')}
                >
                  <Text style={[styles.editMiniPaymentText, editPayment === 'COD' && styles.editMiniPaymentTextSelected]}>COD</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editMiniPaymentBtn, editPayment === 'Prepaid' && styles.editMiniPaymentBtnSelected]} 
                  onPress={() => setEditPayment('Prepaid')}
                >
                  <Text style={[styles.editMiniPaymentText, editPayment === 'Prepaid' && styles.editMiniPaymentTextSelected]}>Prepaid</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.editActionsSection}>
              <IconButton 
                icon="check" 
                size={30} 
                disabled={!hasChanged}
                iconColor={theme.colors.primary}
                onPress={() => onUpdate(item.id, { ...item, source: editSource, paymentMethod: editPayment })} 
                style={styles.iconButton}
              />
              <IconButton 
                icon="refresh" 
                size={30} 
                disabled={!hasChanged}
                onPress={() => {
                  setEditSource(item.source);
                  setEditPayment(item.paymentMethod);
                }} 
                style={styles.iconButton}
              />
              <IconButton 
                icon="close" 
                size={30} 
                onPress={() => onEdit(null)} 
                iconColor={theme.colors.error}
                style={styles.iconButton}
              />
          </View>
        </View>
      </Surface>
    );
  }

  return (
    <Surface style={styles.historyItem} elevation={0}>
      <View style={styles.historyLeft}>
        <Icon 
          source={item.source === 'whatsapp' ? 'whatsapp' : 'instagram'} 
          size={28} 
          color={item.source === 'whatsapp' ? '#25D366' : '#E4405F'} 
        />
        <View>
          <Text style={styles.historyId}>{item.id}</Text>
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
          onPress={() => onEdit(item.id)} 
          iconColor={theme.colors.outline}
          style={styles.iconButtonPencil}
        />
      </View>
    </Surface>
  );
};

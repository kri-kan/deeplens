import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  Searchbar,
  List,
  ActivityIndicator,
  useTheme,
  Divider,
  IconButton,
  Surface,
} from 'react-native-paper';
import { vendorService } from '@/services/vendorService';
import { waProcessorService } from '@/services/wa-processor.service';
import { VendorResponse } from '@/types/vendors';
import { useRouter } from 'expo-router';

interface VendorAssignmentModalProps {
  visible: boolean;
  onDismiss: () => void;
  jid: string;
  chatName: string;
  onSuccess: () => void;
}

export function VendorAssignmentModal({ visible, onDismiss, jid, chatName, onSuccess }: VendorAssignmentModalProps) {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<VendorResponse[]>([]);
  const [search, setSearch] = useState('');
  const [currentVendor, setCurrentVendor] = useState<{ vendorId: string; vendorName: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorService.listVendors(1, 100, true);
      setVendors(res.vendors);
    } catch (err: any) {
      console.error('Failed to fetch vendors:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCurrentVendor = useCallback(async () => {
    try {
      const res = await waProcessorService.fetchVendor(jid);
      if (res.hasVendor && res.vendor) {
        setCurrentVendor({ vendorId: res.vendor.vendorId, vendorName: res.vendor.vendorName });
      } else {
        setCurrentVendor(null);
      }
    } catch (err) {
      console.error('Failed to fetch current vendor:', err);
    }
  }, [jid]);

  useEffect(() => {
    if (visible) {
      fetchVendors();
      fetchCurrentVendor();
    }
  }, [visible, fetchVendors, fetchCurrentVendor]);

  const handleAssign = async (vendor: VendorResponse) => {
    setSaving(true);
    try {
      await waProcessorService.assignChatVendor(jid, vendor.id);
      Alert.alert('Success', `Vendor "${vendor.vendorName}" assigned to ${chatName}`);
      onSuccess();
      onDismiss();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to assign vendor');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    Alert.alert(
      'Remove Vendor',
      'Are you sure you want to remove the vendor assignment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await waProcessorService.assignChatVendor(jid, null);
              Alert.alert('Success', 'Vendor assignment removed');
              onSuccess();
              onDismiss();
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to remove vendor');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const filteredVendors = vendors.filter(v => 
    v.vendorName.toLowerCase().includes(search.toLowerCase()) ||
    v.vendorCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.title}>Assign Vendor</Text>
          <IconButton icon="close" onPress={onDismiss} size={20} />
        </View>

        <Text variant="bodySmall" style={styles.subtitle}>
          Assigning <Text style={{ fontWeight: '700' }}>{chatName}</Text> to a vendor.
        </Text>

        {currentVendor && (
          <Surface style={styles.currentVendor} elevation={1}>
            <View style={{ flex: 1 }}>
              <Text variant="labelSmall" style={{ opacity: 0.5 }}>Currently Assigned</Text>
              <Text variant="bodyMedium" style={{ fontWeight: '700' }}>{currentVendor.vendorName}</Text>
            </View>
            <Button 
              mode="text" 
              compact 
              textColor={theme.colors.error} 
              onPress={handleRemove}
              disabled={saving}
            >
              Remove
            </Button>
          </Surface>
        )}

        <Button
          mode="outlined"
          icon="plus"
          style={{ marginBottom: 12, borderRadius: 12 }}
          onPress={() => {
            onDismiss();
            const extractedNumber = jid.split('@')[0].split('-')[0];
            router.push({
              pathname: '/system/vendor/[id]',
              params: { 
                id: 'new', 
                prefillWhatsapp: extractedNumber,
                fromJid: jid
              }
            });
          }}
        >
          Create New Vendor
        </Button>

        <Searchbar
          placeholder="Search vendors..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBar}
          icon="store-search"
        />

        <ScrollView style={styles.list}>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
          ) : filteredVendors.length === 0 ? (
            <Text style={styles.emptyText}>No vendors found</Text>
          ) : (
            filteredVendors.map((v, i) => (
              <View key={v.id}>
                <List.Item
                  title={v.vendorName}
                  description={v.vendorCode || 'No code'}
                  left={props => <List.Icon {...props} icon="store" />}
                  right={props => (
                    currentVendor?.vendorId === v.id ? 
                    <List.Icon {...props} icon="check-circle" color={theme.colors.primary} /> :
                    <IconButton icon="chevron-right" onPress={() => handleAssign(v)} disabled={saving} />
                  )}
                  onPress={() => handleAssign(v)}
                />
                {i < filteredVendors.length - 1 && <Divider />}
              </View>
            ))
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    opacity: 0.6,
    marginBottom: 16,
  },
  currentVendor: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 211, 102, 0.05)',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.1)',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    marginBottom: 12,
  },
  list: {
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.4,
  }
});

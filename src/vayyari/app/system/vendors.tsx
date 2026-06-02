import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, IconButton, Surface, useTheme, Avatar } from 'react-native-paper';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { vendorService } from '@/services/vendorService';
import { VendorResponse } from '@/types/vendors';
import { VendorAddressesModal } from '@/components/utility/vendor/VendorAddressesModal';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function VendorManagement() {
  const [vendors, setVendors] = useState<VendorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [selectedVendorForAddresses, setSelectedVendorForAddresses] = useState<VendorResponse | null>(null);

  const theme = useTheme();

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await vendorService.listVendors(1, 100);
      setVendors(data.vendors || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Are you sure you want to deactivate this vendor?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await vendorService.deleteVendor(id);
          fetchData();
        } catch (error) {
          Alert.alert('Error', 'Failed to delete');
        }
      }}
    ]);
  };

  return (
    <ScreenWrapper title="Vendor Directory" withScrollView={false}>
      <View style={styles.container}>
        
        {/* Header Action */}
        <View style={styles.headerSection}>
          <Text variant="bodyLarge" style={styles.summaryText}>
            {vendors.length} Vendors Found
          </Text>
          <Button 
            mode="contained" 
            icon="plus" 
            onPress={() => { 
              router.push('/system/vendor/new');
            }}
            style={styles.addBtn}
            contentStyle={{ paddingHorizontal: 8 }}
          >
            Add New
          </Button>
        </View>

        <FlatList
          data={vendors}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={fetchData}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Surface style={[styles.card, !item.isActive && styles.inactiveCard]} elevation={2}>
              <View style={styles.cardHeader}>
                <Avatar.Text 
                  size={40} 
                  label={item.vendorName.substring(0, 2).toUpperCase()} 
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                  color={theme.colors.onPrimaryContainer}
                />
                <View style={styles.details}>
                  <Text variant="titleMedium" style={styles.vendorName}>
                    {item.vendorName}
                  </Text>
                  <View style={styles.tagsContainer}>
                    {item.vendorCode && (
                      <Surface style={styles.tag} elevation={0}>
                        <Text style={styles.tagText}>{item.vendorCode}</Text>
                      </Surface>
                    )}
                    {!item.isActive && (
                      <Surface style={[styles.tag, { backgroundColor: '#ffebee' }]} elevation={0}>
                        <Text style={[styles.tagText, { color: '#c62828' }]}>Inactive</Text>
                      </Surface>
                    )}
                  </View>
                </View>
                <View style={styles.actions}>
                  <IconButton 
                    icon="map-marker-outline" 
                    size={20} 
                    onPress={() => {
                      setSelectedVendorForAddresses(item);
                      setAddressModalVisible(true);
                    }} 
                  />
                  <IconButton 
                    icon="pencil-outline" 
                    size={20} 
                    onPress={() => {
                      router.push(`/system/vendor/${item.id}`);
                    }} 
                  />
                  {item.isActive && (
                    <IconButton icon="delete-outline" size={20} onPress={() => handleDelete(item.id)} iconColor={theme.colors.error} />
                  )}
                </View>
              </View>
              
              {/* Contact Info Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.contactRow}>
                  <IconButton icon="account-outline" size={16} style={styles.tinyIcon} />
                  <Text variant="bodySmall" style={styles.contactText}>
                    {item.firstName || item.lastName ? `${item.firstName || ''} ${item.lastName || ''}` : 'No Name provided'}
                  </Text>
                </View>
                <View style={styles.contactRow}>
                  <IconButton icon="whatsapp" size={16} style={styles.tinyIcon} iconColor="#25D366" />
                  <Text variant="bodySmall" style={styles.contactText}>
                    {item.whatsappPrimary || 'No WhatsApp'}
                  </Text>
                </View>
              </View>
            </Surface>
          )}
          ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No vendors found. Start by adding one!</Text> : null}
        />
        
        <VendorAddressesModal 
          visible={addressModalVisible}
          onDismiss={() => {
            setAddressModalVisible(false);
            setSelectedVendorForAddresses(null);
          }}
          vendor={selectedVendorForAddresses}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryText: {
    color: '#6c757d',
    fontWeight: '500',
  },
  addBtn: {
    borderRadius: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
  card: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  vendorName: {
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    paddingTop: 12,
    gap: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tinyIcon: {
    margin: 0,
    padding: 0,
    width: 20,
    height: 20,
  },
  contactText: {
    color: '#495057',
    marginLeft: 4,
  },
  modal: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  modalTitle: {
    fontWeight: '800',
    color: '#212529',
  },
  modalScroll: {
    paddingHorizontal: 24,
    maxHeight: 500,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 12,
    color: '#495057',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
  },
  saveBtn: {
    marginLeft: 12,
    borderRadius: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 60,
    color: '#adb5bd',
    fontSize: 16,
  }
});

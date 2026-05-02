import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity, Dimensions, Linking, ActivityIndicator } from 'react-native';
import { Surface, Text, Appbar, TextInput, Button, Avatar, IconButton, useTheme, Card, Portal, Modal, Searchbar, Divider, List, Checkbox } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { BentoCard } from '@/components/ui/BentoCard';
import { customerService } from '@/services/customerService';
import { productMgmtApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { PlatformHandle } from '@/components/ui/PlatformHandle';
import { whatsappService, WhatsAppChannel, CustomerChannelMembership } from '@/services/whatsappService';
import { Customer, CustomerAddress, CreateCustomerRequest, CreateAddressRequest } from '@/types/customers';

interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
}

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GAP = 12;
const TILE_SIZE = (width - (GAP * (COLUMN_COUNT + 1))) / COLUMN_COUNT;

export default function CustomerManagementScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null);
  const [showCountrySelector, setShowCountrySelector] = useState(false);

  const [allChannels, setAllChannels] = useState<WhatsAppChannel[]>([]);
  const [memberships, setMemberships] = useState<CustomerChannelMembership[]>([]);
  const [channelLoading, setChannelLoading] = useState(false);

  // New Customer Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagramId, setInstagramId] = useState('');
  const [email, setEmail] = useState('');

  // New Address Form State
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [isDefault, setIsDefault] = useState(true);

  useEffect(() => {
    loadCustomers();
    loadCountryCodes();
    loadChannels();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerMemberships(selectedCustomer.id);
    } else {
      setMemberships([]);
    }
  }, [selectedCustomer]);

  const loadChannels = async () => {
    try {
      const channels = await whatsappService.getChannels();
      setAllChannels(channels);
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const loadCustomerMemberships = async (customerId: string) => {
    try {
      setChannelLoading(true);
      const data = await whatsappService.getCustomerMemberships(customerId);
      setMemberships(data);
    } catch (error) {
      console.error('Failed to load memberships:', error);
    } finally {
      setChannelLoading(false);
    }
  };

  const toggleSubscription = async (channelId: string) => {
    if (!selectedCustomer) return;
    
    const isSubscribed = memberships.some(m => m.channelId === channelId && m.status === 'OPTED_IN');
    
    try {
      if (isSubscribed) {
        await whatsappService.unsubscribe(selectedCustomer.id, channelId);
      } else {
        await whatsappService.subscribe(selectedCustomer.id, channelId);
      }
      await loadCustomerMemberships(selectedCustomer.id);
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
    }
  };

  const loadCountryCodes = async () => {
    try {
      const data = await productMgmtApiClient.get<CountryCode[]>(API_ROUTES.COMMON.COUNTRY_CODES);
      const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
      setCountryCodes(sortedData);
      const defaultCountry = sortedData.find(c => c.code === 'IN') || sortedData[0];
      setSelectedCountry(defaultCountry);
    } catch (error) {
      console.error('Failed to load country codes:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  const handleAddCustomer = async () => {
    if (!phone && !instagramId) return;
    
    try {
      const request: CreateCustomerRequest = {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phoneNumber: phone ? `${selectedCountry?.dialCode}${phone}` : undefined,
        instagramId: instagramId || undefined,
        email: email || undefined,
      };
      
      const newCust = await customerService.createCustomer(request);
      setCustomers([newCust, ...customers]);
      
      // Reset form
      setFirstName('');
      setLastName('');
      setPhone('');
      setInstagramId('');
      setEmail('');
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  const handleAddAddress = async () => {
    if (!selectedCustomer || !addrLine1 || !addrPincode || !addrPhone || !addrName) return;

    try {
      const request: CreateAddressRequest = {
        name: addrName,
        phone: `${selectedCountry?.dialCode}${addrPhone}`,
        line1: addrLine1,
        line2: addrLine2 || undefined,
        pincode: addrPincode,
        city: addrCity || undefined,
        state: addrState || undefined,
        isDefault: isDefault
      };

      await customerService.addAddress(selectedCustomer.id, request);
      
      // Refresh selected customer data
      const updatedCust = await customerService.getCustomerById(selectedCustomer.id);
      setSelectedCustomer(updatedCust);
      
      // Refresh list
      loadCustomers();

      // Reset form
      setAddrName('');
      setAddrPhone('');
      setAddrLine1('');
      setAddrLine2('');
      setAddrPincode('');
      setAddrCity('');
      setAddrState('');
      setShowAddressModal(false);
    } catch (error) {
      console.error('Failed to add address:', error);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      (c.firstName?.toLowerCase().includes(query)) ||
      (c.lastName?.toLowerCase().includes(query)) ||
      (c.phoneNumber?.includes(query)) ||
      (c.instagramId?.toLowerCase().includes(query))
    );
  });

  const getAvatarLabel = (customer: Customer) => {
    if (!customer) return '?';
    const first = customer.firstName?.trim() || '';
    const last = customer.lastName?.trim() || '';
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first[0].toUpperCase();
    if (last) return last[0].toUpperCase();
    return '?';
  };

  const renderCustomerTile = ({ item }: { item: Customer }) => {
    if (!item || !item.id) return null;
    const colors = ['#E91E63', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#00BCD4'];
    const avatarColor = colors[item.id.length % colors.length] || colors[0];
    const displayName = (item.firstName || item.lastName) 
      ? `${item.firstName || ''} ${item.lastName || ''}`.trim() 
      : 'Unknown Customer';

    return (
      <TouchableOpacity 
        activeOpacity={0.8} 
        style={{ width: TILE_SIZE, marginBottom: GAP }}
        onPress={() => setSelectedCustomer(item)}
      >
        <BentoCard surfaceLevel="surfaceContainerLow" style={styles.customerCard}>
          <View style={styles.cardHeader}>
            <Avatar.Text 
              size={44} 
              label={getAvatarLabel(item)} 
              style={{ backgroundColor: avatarColor }} 
            />
            <View style={styles.headerTextInfo}>
              <Text variant="titleMedium" style={styles.customerName} numberOfLines={2}>{displayName}</Text>
            </View>
          </View>
          
          <View style={styles.cardInfo}>
            {item.phoneNumber && (
               <PlatformHandle 
                  source="whatsapp" 
                  handle={item.phoneNumber} 
                  fontSize={14} 
                  size={24}
                  color={theme.colors.onSurfaceVariant}
               />
            )}
            {item.instagramId && (
               <PlatformHandle 
                  source="instagram" 
                  handle={item.instagramId} 
                  fontSize={14} 
                  size={24}
                  color={theme.colors.onSurfaceVariant}
               />
            )}
          </View>
  
          <View style={styles.cardFooter}>
             <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
               {item.addresses?.length || 0} Addresses
             </Text>
             <View style={styles.idBadgeSmall}>
                <Text style={styles.idTextSmall}>#{item.customerId}</Text>
             </View>
          </View>
        </BentoCard>
      </TouchableOpacity>
    );
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <Appbar.Header elevated style={{ backgroundColor: theme.colors.background }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Customers" titleStyle={styles.headerTitle} />
        <Appbar.Action icon="account-plus" onPress={() => setShowAddModal(true)} />
      </Appbar.Header>

      <View style={styles.content}>
        {/* Search and Header Section */}
        <View style={styles.searchSection}>
           <Searchbar
            placeholder="Search by name, phone or IG..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={{ fontSize: 14 }}
          />
        </View>


        <View style={styles.listHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Customer Directory</Text>
            <Text variant="labelSmall" style={{ opacity: 0.5 }}>{filteredCustomers.length} TOTAL</Text>
        </View>

        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredCustomers}
            renderItem={renderCustomerTile}
            keyExtractor={item => item.id}
            numColumns={COLUMN_COUNT}
            columnWrapperStyle={{ gap: GAP }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                  <IconButton icon="account-search-outline" size={64} style={{ opacity: 0.2 }} />
                  <Text variant="bodyLarge" style={{ opacity: 0.5 }}>No customers found</Text>
              </View>
            }
          />
        )}
      </View>

      <Portal>
        <Modal 
            visible={showAddModal} 
            onDismiss={() => setShowAddModal(false)}
            contentContainerStyle={styles.bottomSheetContent}
        >
          <View style={styles.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text variant="headlineSmall" style={styles.modalTitle}>New Customer</Text>
            <Text variant="bodyMedium" style={styles.modalSubtitle}>Phone or Instagram ID is required to create a profile.</Text>
            
            <View style={styles.row}>
              <TextInput
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                mode="outlined"
                style={[styles.input, { flex: 1, marginRight: 8 }]}
              />
              <TextInput
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
            </View>
            
            <View style={styles.phoneInputRow}>
               <TouchableOpacity 
                style={styles.countryPicker} 
                onPress={() => setShowCountrySelector(true)}
              >
                <Text variant="bodyLarge">{selectedCountry?.dialCode || '+91'}</Text>
                <IconButton icon="chevron-down" size={16} style={{ margin: 0 }} />
              </TouchableOpacity>
              
              <TextInput
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                mode="outlined"
                keyboardType="phone-pad"
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                left={<TextInput.Icon icon="phone" />}
              />
            </View>

            <TextInput
              label="Instagram ID"
              value={instagramId}
              onChangeText={setInstagramId}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="instagram" />}
              autoCapitalize="none"
            />

            <TextInput
              label="Email (Optional)"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="email" />}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.modalActions}>
              <Button mode="text" onPress={() => setShowAddModal(false)}>Cancel</Button>
              <Button 
                  mode="contained" 
                  onPress={handleAddCustomer} 
                  disabled={!phone && !instagramId}
                  style={styles.submitButton}
              >
                  Create Profile
              </Button>
            </View>
          </ScrollView>
        </Modal>

        {/* Customer Detail / Address Modal */}
        <Modal
          visible={!!selectedCustomer}
          onDismiss={() => setSelectedCustomer(null)}
          contentContainerStyle={styles.detailModalContent}
        >
          {selectedCustomer && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailHeader}>
                 <Avatar.Text 
                    size={64} 
                    label={getAvatarLabel(selectedCustomer)} 
                    style={{ backgroundColor: theme.colors.primaryContainer }} 
                 />
                 <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                      {selectedCustomer.firstName || selectedCustomer.lastName ? `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim() : 'Unknown'}
                    </Text>
                    {selectedCustomer.phoneNumber && <Text variant="bodyMedium">{selectedCustomer.phoneNumber}</Text>}
                    {selectedCustomer.instagramId && <Text variant="bodySmall" style={{ opacity: 0.6 }}>@{selectedCustomer.instagramId}</Text>}
                 </View>
              </View>

              <Divider style={{ marginVertical: 16 }} />

              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Addresses</Text>
                <Button icon="plus" mode="text" onPress={() => setShowAddressModal(true)}>Add</Button>
              </View>

              {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 ? (
                selectedCustomer.addresses.map((addr) => (
                  <Card key={addr.id} style={styles.addressCard} mode="outlined">
                    <Card.Content>
                      <View style={styles.addressHeader}>
                        <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>{addr.name}</Text>
                        {addr.isDefault && <Text variant="labelSmall" style={{ color: theme.colors.primary }}>DEFAULT</Text>}
                      </View>
                      <Text variant="bodySmall">{addr.phone}</Text>
                      <Text variant="bodySmall">{addr.line1}</Text>
                      {addr.line2 && <Text variant="bodySmall">{addr.line2}</Text>}
                      <Text variant="bodySmall">{addr.city}, {addr.state} - {addr.pincode}</Text>
                    </Card.Content>
                  </Card>
                ))
              ) : (
                <View style={styles.emptyAddress}>
                   <Text variant="bodySmall" style={{ opacity: 0.5 }}>No addresses added yet.</Text>
                </View>
              )}

              <Divider style={{ marginVertical: 16 }} />

              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>WhatsApp Broadcasts</Text>
              </View>

              {channelLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                allChannels.map(channel => {
                  const membership = memberships.find(m => m.channelId === channel.id);
                  const isSubscribed = membership?.status === 'OPTED_IN';
                  
                  return (
                    <List.Item
                      key={channel.id}
                      title={channel.name}
                      description={channel.description}
                      left={props => <List.Icon {...props} icon="whatsapp" color={isSubscribed ? '#25D366' : theme.colors.outline} />}
                      right={props => (
                        <Switch 
                          value={isSubscribed} 
                          onValueChange={() => toggleSubscription(channel.id)} 
                          color="#25D366"
                        />
                      )}
                      style={{ paddingLeft: 0 }}
                    />
                  );
                })
              )}

              <View style={[styles.modalActions, { marginTop: 24 }]}>
                <Button mode="outlined" onPress={() => setSelectedCustomer(null)}>Close</Button>
              </View>
            </ScrollView>
          )}
        </Modal>

        {/* Add Address Modal */}
        <Modal
          visible={showAddressModal}
          onDismiss={() => setShowAddressModal(false)}
          contentContainerStyle={styles.bottomSheetContent}
        >
          <View style={styles.sheetHandle} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text variant="headlineSmall" style={styles.modalTitle}>New Address</Text>
            
            <TextInput
              label="Recipient Name"
              value={addrName}
              onChangeText={setAddrName}
              mode="outlined"
              style={styles.input}
            />

            <View style={styles.phoneInputRow}>
               <TouchableOpacity 
                style={styles.countryPicker} 
                onPress={() => setShowCountrySelector(true)}
              >
                <Text variant="bodyLarge">{selectedCountry?.dialCode || '+91'}</Text>
                <IconButton icon="chevron-down" size={16} style={{ margin: 0 }} />
              </TouchableOpacity>
              
              <TextInput
                label="Recipient Phone"
                value={addrPhone}
                onChangeText={setAddrPhone}
                mode="outlined"
                keyboardType="phone-pad"
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
              />
            </View>

            <TextInput
              label="Address Line 1"
              value={addrLine1}
              onChangeText={setAddrLine1}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Address Line 2 (Optional)"
              value={addrLine2}
              onChangeText={setAddrLine2}
              mode="outlined"
              style={styles.input}
            />

            <View style={styles.row}>
               <TextInput
                label="City"
                value={addrCity}
                onChangeText={setAddrCity}
                mode="outlined"
                style={[styles.input, { flex: 1, marginRight: 8 }]}
              />
              <TextInput
                label="Pincode"
                value={addrPincode}
                onChangeText={setAddrPincode}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <TextInput
              label="State"
              value={addrState}
              onChangeText={setAddrState}
              mode="outlined"
              style={styles.input}
            />

            <View style={styles.checkboxRow}>
              <Checkbox
                status={isDefault ? 'checked' : 'unchecked'}
                onPress={() => setIsDefault(!isDefault)}
              />
              <Text variant="bodyMedium">Set as default address</Text>
            </View>

            <View style={styles.modalActions}>
              <Button mode="text" onPress={() => setShowAddressModal(false)}>Cancel</Button>
              <Button 
                  mode="contained" 
                  onPress={handleAddAddress} 
                  disabled={!addrName || !addrPhone || !addrLine1 || !addrPincode}
                  style={styles.submitButton}
              >
                  Save Address
              </Button>
            </View>
          </ScrollView>
        </Modal>

        {/* Country Selector Modal */}
        <Modal
          visible={showCountrySelector}
          onDismiss={() => setShowCountrySelector(false)}
          contentContainerStyle={styles.bottomSheetContent}
        >
          <View style={styles.sheetHandle} />
          <Text variant="titleLarge" style={[styles.modalTitle, { paddingHorizontal: 8 }]}>Select Country</Text>
          <FlatList
            data={countryCodes}
            keyExtractor={item => item.code}
            style={{ maxHeight: 400 }}
            renderItem={({ item }) => (
              <List.Item
                title={`${item.dialCode} ${item.name}`}
                onPress={() => {
                  setSelectedCountry(item);
                  setShowCountrySelector(false);
                }}
                right={props => selectedCountry?.code === item.code ? <List.Icon {...props} icon="check" color={theme.colors.primary} /> : null}
              />
            )}
          />
          <Button mode="text" onPress={() => setShowCountrySelector(false)} style={{ marginTop: 16 }}>Cancel</Button>
        </Modal>
      </Portal>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchBar: {
    borderRadius: 12,
    elevation: 0,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  addBanner: {
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  addBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  addIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 24,
  },
  customerCard: {
    padding: 12,
    borderRadius: 20,
    height: 160,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  headerTextInfo: {
    flex: 1,
  },
  actionButton: {
    margin: 0,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  cardInfo: {
    flex: 1,
    marginTop: 4,
    gap: 4,
  },
  customerName: {
    fontWeight: 'bold',
    fontSize: 18,
    lineHeight: 22,
  },
  customerPhone: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  instaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: -4,
  },
  instaText: {
    fontSize: 12,
    color: '#888',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idBadgeSmall: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  idTextSmall: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 24,
    maxHeight: '80%',
  },
  bottomSheetContent: {
    backgroundColor: 'white',
    padding: 24,
    paddingBottom: 40, // Extra padding for safe area/gestures
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    elevation: 20,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  detailModalContent: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    opacity: 0.6,
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  submitButton: {
    borderRadius: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyAddress: {
    padding: 20,
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    height: 50,
    paddingHorizontal: 10,
    backgroundColor: 'white',
    marginTop: 6, // Offset to align with TextInput which has a label
  },
  idBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  idText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  }
});

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform } from 'react-native';
import { Text, Avatar, Button, Divider, List, Card, Switch, ActivityIndicator, useTheme, Chip, Portal, IconButton, Snackbar, Appbar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { ManageAddressModal } from '@/components/utility/customer/ManageAddressModal';
import { CustomerAddress } from '@/api/customers';
import { CountrySelectorModal } from '@/components/utility/customer/CountrySelectorModal';
import { EditCustomerModal } from '@/components/utility/customer/EditCustomerModal';

import { customerService } from '@/services/customerService';
import { whatsappService, WhatsAppChannel, CustomerChannelMembership } from '@/services/whatsappService';
import { productMgmtApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { Customer, CreateAddressRequest, CreateCustomerRequest, Language } from '@/types/customers';
import { CountryCode } from '@/hooks/useCustomerManagement';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [allChannels, setAllChannels] = useState<WhatsAppChannel[]>([]);
  const [memberships, setMemberships] = useState<CustomerChannelMembership[]>([]);
  const [channelLoading, setChannelLoading] = useState(false);

  // Address Modals & Forms State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null);

  // Edit Customer Modals & Forms State
  const [showEditModal, setShowEditModal] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [editSelectedCountry, setEditSelectedCountry] = useState<CountryCode | null>(null);
  const [showEditCountrySelector, setShowEditCountrySelector] = useState(false);

  // Clipboard / Snackbar State
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const [addressToEdit, setAddressToEdit] = useState<CustomerAddress | null>(null);

  const loadData = useCallback(async (showIndicator = true) => {
    if (!id) return;
    try {
      if (showIndicator) setLoading(true);
      
      const [customerData, channelsData, membershipsData] = await Promise.all([
        customerService.getCustomerById(id),
        whatsappService.getChannels(),
        whatsappService.getCustomerMemberships(id)
      ]);

      setCustomer(customerData);
      setAllChannels(channelsData);
      setMemberships(membershipsData);
    } catch (error) {
      console.error('Failed to load customer details:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadCountryCodes = useCallback(async () => {
    try {
      const data = await productMgmtApiClient.get<CountryCode[]>(API_ROUTES.COMMON.COUNTRY_CODES);
      const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
      setCountryCodes(sortedData);
      const defaultCountry = sortedData.find(c => c.code === 'IN') || sortedData[0];
      setSelectedCountry(defaultCountry);
    } catch (error) {
      console.error('Failed to load country codes:', error);
    }
  }, []);

  const loadLanguages = useCallback(async () => {
    try {
      const data = await customerService.getLanguages();
      setAvailableLanguages(data);
    } catch (error) {
      console.error('Failed to load languages:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadCountryCodes();
    loadLanguages();
  }, [loadData, loadCountryCodes, loadLanguages]);

  // Set default editSelectedCountry based on customer's phone prefix
  useEffect(() => {
    if (customer && countryCodes.length > 0) {
      if (customer.phoneNumber) {
        const sortedCountries = [...countryCodes].sort((a, b) => b.dialCode.length - a.dialCode.length);
        const country = sortedCountries.find(c => customer.phoneNumber?.startsWith(c.dialCode));
        if (country) {
          setEditSelectedCountry(country);
        } else {
          setEditSelectedCountry(countryCodes.find(c => c.code === 'IN') || countryCodes[0] || null);
        }
      } else {
        setEditSelectedCountry(countryCodes.find(c => c.code === 'IN') || countryCodes[0] || null);
      }
    }
  }, [customer, countryCodes]);

  const handleUpdateCustomer = async (request: CreateCustomerRequest) => {
    if (!customer) return;
    try {
      await customerService.updateCustomer(customer.id, request);
      setSnackbarMessage('Customer profile updated successfully!');
      setSnackbarVisible(true);
      await loadData(false);
    } catch (error) {
      console.error('Failed to update customer:', error);
      setSnackbarMessage('Failed to update customer profile.');
      setSnackbarVisible(true);
    }
  };

  const handleCopyReferralCode = async () => {
    if (!customer?.referralCode) return;
    const textToCopy = `Your referral code is : ${customer.referralCode}`;
    await Clipboard.setStringAsync(textToCopy);
    if (Platform.OS !== 'android') {
      setSnackbarMessage('Referral code copied to clipboard!');
      setSnackbarVisible(true);
    }
  };

  const handleCopyInstagramHandle = async (username: string) => {
    await Clipboard.setStringAsync(username);
    if (Platform.OS !== 'android') {
      setSnackbarMessage(`Instagram account @${username} copied!`);
      setSnackbarVisible(true);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  };



  const toggleSubscription = async (channelId: string) => {
    if (!customer) return;
    
    const isSubscribed = memberships.some(m => m.channelId === channelId && m.status === 'OPTED_IN');
    
    try {
      setChannelLoading(true);
      if (isSubscribed) {
        await whatsappService.unsubscribe(customer.id, channelId);
      } else {
        await whatsappService.subscribe(customer.id, channelId);
      }
      const updatedMemberships = await whatsappService.getCustomerMemberships(customer.id);
      setMemberships(updatedMemberships);
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
    } finally {
      setChannelLoading(false);
    }
  };

  const getAvatarLabel = (cust: Customer) => {
    const first = cust.firstName?.trim() || '';
    const last = cust.lastName?.trim() || '';
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first[0].toUpperCase();
    if (last) return last[0].toUpperCase();
    return '?';
  };

  if (loading) {
    return (
      <ScreenWrapper title="Customer Details" withScrollView={false}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!customer) {
    return (
      <ScreenWrapper title="Customer Details" withScrollView={false}>
        <View style={styles.centerContainer}>
          <Text variant="headlineSmall" style={{ opacity: 0.5 }}>Customer not found</Text>
          <Button mode="contained" onPress={() => router.back()} style={{ marginTop: 16 }}>
            Go Back
          </Button>
        </View>
      </ScreenWrapper>
    );
  }

  const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown';

  return (
    <ScreenWrapper 
      title={fullName} 
      withScrollView={false}
      actions={
        <Appbar.Action icon="pencil" onPress={() => setShowEditModal(true)} />
      }
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* Profile Card */}
        <Card style={styles.profileCard} elevation={1}>
          <Card.Content style={styles.profileHeader}>
            <Avatar.Text 
              size={72} 
              label={getAvatarLabel(customer)} 
              style={{ backgroundColor: theme.colors.primaryContainer }} 
            />
            <View style={styles.profileMeta}>
              <Text variant="headlineSmall" style={styles.name}>{fullName}</Text>
              {customer.phoneNumber && (
                <Text variant="bodyMedium" style={styles.phone}>{customer.phoneNumber}</Text>
              )}
              {customer.email && (
                <Text variant="bodySmall" style={styles.email}>{customer.email}</Text>
              )}
              {customer.referralCode && (
                <View style={styles.referralRow}>
                  <Chip
                    icon={
                      customer.gender === 'Male' ? 'face-man' :
                      customer.gender === 'Female' ? 'face-woman' :
                      'account-question-outline'
                    }
                    style={[styles.referralChip, { marginRight: 8, backgroundColor: '#f0f0f0' }]}
                    textStyle={{ color: customer.gender ? (customer.gender === 'Male' ? '#1976D2' : '#C2185B') : 'grey' }}
                  >
                    {customer.gender || 'Not Set'}
                  </Chip>
                  <Chip 
                    icon="ticket-percent" 
                    style={styles.referralChip}
                    textStyle={styles.referralText}
                    onPress={handleCopyReferralCode}
                  >
                    REF: {customer.referralCode}
                  </Chip>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Instagram Handles */}
        {customer.instagramAccounts && customer.instagramAccounts.length > 0 && (
          <Card style={styles.sectionCard} elevation={1}>
            <Card.Content>
              <View style={styles.handlesRowContainer}>
                <IconButton 
                  icon="instagram" 
                  iconColor="#E1306C" 
                  size={26} 
                  style={{ margin: 0, marginRight: -4, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}
                />
                {customer.instagramAccounts.map((acc) => (
                  <Chip 
                    key={acc.id}
                    icon={acc.isPrimary ? 'star' : undefined}
                    onPress={() => handleCopyInstagramHandle(acc.username)}
                    style={styles.instagramSelectableChip}
                    textStyle={styles.chipText}
                    selectedColor={acc.isPrimary ? '#FFD700' : undefined}
                  >
                    @{acc.username}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Preferred Languages */}
        {customer.preferredLanguages && customer.preferredLanguages.length > 0 && (
          <Card style={styles.sectionCard} elevation={1}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Preferred Languages</Text>
              <View style={styles.languagesContainer}>
                {customer.preferredLanguages.map((code) => {
                  const friendlyNames: Record<string, string> = {
                    'en-in': 'English',
                    'te-in': 'Telugu',
                    'hi-in': 'Hindi',
                    'ta-in': 'Tamil',
                    'ml-in': 'Malayalam',
                    'kn-in': 'Kannada',
                    'en-te': 'English & Telugu'
                  };
                  return (
                    <Chip key={code} style={styles.languageChip} compact>
                      {friendlyNames[code] || code}
                    </Chip>
                  );
                })}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Addresses */}
        <Card style={styles.sectionCard} elevation={1}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>Addresses</Text>
              <Button icon="plus" mode="outlined" compact onPress={() => { setAddressToEdit(null); setShowAddressModal(true); }}>
                Add
              </Button>
            </View>
            
            {customer.addresses && customer.addresses.length > 0 ? (
              customer.addresses.map((addr) => (
                <Card key={addr.id} style={styles.addressCard} mode="outlined">
                  <Card.Content>
                    <View style={styles.addressTitleRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text variant="titleSmall" style={styles.bold}>{addr.name}</Text>
                        {addr.isDefault && (
                          <Chip style={[styles.defaultChip, { marginLeft: 8 }]} textStyle={styles.defaultChipText} compact>
                            DEFAULT
                          </Chip>
                        )}
                      </View>
                      <Button 
                        mode="text" 
                        compact 
                        onPress={() => { setAddressToEdit(addr); setShowAddressModal(true); }}
                        labelStyle={{ fontSize: 12 }}
                      >
                        Edit
                      </Button>
                    </View>
                    <Text variant="bodySmall" style={styles.addressText}>{addr.phone}</Text>
                    <Text variant="bodySmall" style={styles.addressText}>{addr.line1}</Text>
                    <Text variant="bodySmall" style={styles.addressText}>
                      PIN: {addr.pincode}
                    </Text>
                  </Card.Content>
                </Card>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text variant="bodySmall" style={{ opacity: 0.5 }}>No addresses added yet.</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* WhatsApp Broadcasts */}
        <Card style={styles.sectionCard} elevation={1}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>WhatsApp Broadcast Subscriptions</Text>
            {channelLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 16 }} />
            ) : (
              allChannels.map(channel => {
                const membership = memberships.find(m => m.channelId === channel.id);
                const isSubscribed = membership?.status === 'OPTED_IN';
                
                return (
                  <List.Item
                    key={channel.id}
                    title={channel.name}
                    description={channel.description}
                    left={props => (
                      <List.Icon 
                        {...props} 
                        icon="whatsapp" 
                        color={isSubscribed ? '#25D366' : theme.colors.outline} 
                      />
                    )}
                    right={() => (
                      <Switch 
                        value={isSubscribed} 
                        onValueChange={() => toggleSubscription(channel.id)} 
                        color="#25D366"
                      />
                    )}
                    style={styles.listItem}
                  />
                );
              })
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Portal Modals for Address Form */}
      <Portal>
        <ManageAddressModal
          visible={addressModalVisible}
          onDismiss={() => {
            setAddressModalVisible(false);
            setEditingAddress(null);
          }}
          entityId={id as string}
          entityType="customer"
          addressToEdit={editingAddress}
          onSuccess={() => loadData(false)}
        />

        <CountrySelectorModal 
          visible={showCountrySelector}
          onDismiss={() => setShowCountrySelector(false)}
          countryCodes={countryCodes}
          selectedCountry={selectedCountry}
          onSelect={(country) => {
            setSelectedCountry(country);
            setShowCountrySelector(false);
          }}
        />

        <EditCustomerModal
          visible={showEditModal}
          onDismiss={() => setShowEditModal(false)}
          customer={customer}
          countryCodes={countryCodes}
          availableLanguages={availableLanguages}
          selectedCountry={editSelectedCountry}
          onShowCountrySelector={() => setShowEditCountrySelector(true)}
          onSubmit={handleUpdateCustomer}
        />

        <CountrySelectorModal 
          visible={showEditCountrySelector}
          onDismiss={() => setShowEditCountrySelector(false)}
          countryCodes={countryCodes}
          selectedCountry={editSelectedCountry}
          onSelect={(country) => {
            setEditSelectedCountry(country);
            setShowEditCountrySelector(false);
          }}
        />
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={{ marginBottom: 20 }}
      >
        {snackbarMessage}
      </Snackbar>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 8,
    opacity: 0.7,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
    gap: 12,
  },
  profileCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileMeta: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  phone: {
    opacity: 0.8,
    marginTop: 2,
    color: '#444',
  },
  email: {
    opacity: 0.6,
    marginTop: 2,
  },
  referralRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  referralChip: {
    backgroundColor: '#E8F5E9',
    height: 28,
    justifyContent: 'center',
    borderRadius: 8,
  },
  referralText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1A1A1A',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  instagramSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  handlesRowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    flex: 1,
  },
  instagramSelectableChip: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageChip: {
    backgroundColor: '#EAEAEA',
  },
  addressCard: {
    marginBottom: 8,
    borderRadius: 12,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  addressTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
    color: '#333',
  },
  defaultChip: {
    backgroundColor: '#E3F2FD',
    height: 20,
    justifyContent: 'center',
    borderRadius: 4,
  },
  defaultChipText: {
    color: '#1565C0',
    fontSize: 9,
    fontWeight: 'bold',
  },
  addressText: {
    color: '#666',
    marginTop: 1,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  listItem: {
    paddingHorizontal: 0,
  },
});

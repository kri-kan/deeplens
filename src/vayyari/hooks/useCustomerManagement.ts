import { useState, useEffect, useCallback } from 'react';
import { customerService } from '@/services/customerService';
import { productMgmtApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { whatsappService, WhatsAppChannel, CustomerChannelMembership } from '@/services/whatsappService';
import { Customer, CreateCustomerRequest, CreateAddressRequest } from '@/types/customers';

export interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
}

export const useCustomerManagement = () => {
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

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await customerService.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const loadChannels = useCallback(async () => {
    try {
      const channels = await whatsappService.getChannels();
      setAllChannels(channels);
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  }, []);

  const loadCustomerMemberships = useCallback(async (customerId: string) => {
    try {
      setChannelLoading(true);
      const data = await whatsappService.getCustomerMemberships(customerId);
      setMemberships(data);
    } catch (error) {
      console.error('Failed to load memberships:', error);
    } finally {
      setChannelLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
    loadCountryCodes();
    loadChannels();
  }, [loadCustomers, loadCountryCodes, loadChannels]);

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerMemberships(selectedCustomer.id);
    } else {
      setMemberships([]);
    }
  }, [selectedCustomer, loadCustomerMemberships]);

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
      setCustomers(prev => [newCust, ...prev]);
      
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
      
      const updatedCust = await customerService.getCustomerById(selectedCustomer.id);
      setSelectedCustomer(updatedCust);
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

  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      (c.firstName?.toLowerCase().includes(query)) ||
      (c.lastName?.toLowerCase().includes(query)) ||
      (c.phoneNumber?.includes(query)) ||
      (c.instagramId?.toLowerCase().includes(query))
    );
  });

  return {
    searchQuery,
    setSearchQuery,
    customers,
    loading,
    refreshing,
    handleRefresh,
    filteredCustomers,
    showAddModal,
    setShowAddModal,
    selectedCustomer,
    setSelectedCustomer,
    showAddressModal,
    setShowAddressModal,
    countryCodes,
    selectedCountry,
    setSelectedCountry,
    showCountrySelector,
    setShowCountrySelector,
    allChannels,
    memberships,
    channelLoading,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    phone,
    setPhone,
    instagramId,
    setInstagramId,
    email,
    setEmail,
    addrName,
    setAddrName,
    addrPhone,
    setAddrPhone,
    addrLine1,
    setAddrLine1,
    addrLine2,
    setAddrLine2,
    addrPincode,
    setAddrPincode,
    addrCity,
    setAddrCity,
    addrState,
    setAddrState,
    isDefault,
    setIsDefault,
    handleAddCustomer,
    handleAddAddress,
    toggleSubscription,
  };
};

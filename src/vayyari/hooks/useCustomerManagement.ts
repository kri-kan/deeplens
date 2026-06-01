import { useState, useEffect, useCallback } from 'react';
import { customerService } from '@/services/customerService';
import { productMgmtApiClient } from '@/api/client';
import { API_ROUTES } from '@/constants/api-routes';
import { whatsappService, WhatsAppChannel, CustomerChannelMembership } from '@/services/whatsappService';
import { Customer, CreateCustomerRequest, CreateAddressRequest, Language } from '@/types/customers';

export interface FormInstagramAccount {
  id?: string;
  username: string;
  isPrimary: boolean;
}

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
  const [gender, setGender] = useState<'Male' | 'Female' | undefined>(undefined);

  // Multi-handle Instagram & languages state
  const [instagramAccounts, setInstagramAccounts] = useState<FormInstagramAccount[]>([
    { username: '', isPrimary: true }
  ]);
  const [instagramErrors, setInstagramErrors] = useState<Record<number, string>>({});
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>(['en-in']);



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

  const loadLanguages = useCallback(async () => {
    try {
      const data = await customerService.getLanguages();
      setAvailableLanguages(data);
    } catch (error) {
      console.error('Failed to load languages:', error);
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

  const validateInstagramHandle = useCallback(async (index: number, username: string, customerId?: string) => {
    if (!username.trim()) {
      setInstagramErrors(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return;
    }

    try {
      const res = await customerService.validateInstagram(username.trim(), customerId);
      if (!res.isValid) {
        setInstagramErrors(prev => ({
          ...prev,
          [index]: 'Instagram user exists with another customer'
        }));
      } else {
        setInstagramErrors(prev => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to validate instagram handle:', err);
    }
  }, []);

  const addInstagramAccountField = () => {
    setInstagramAccounts(prev => [
      ...prev,
      { username: '', isPrimary: prev.length === 0 }
    ]);
  };

  const removeInstagramAccountField = (index: number) => {
    setInstagramAccounts(prev => {
      const updated = prev.filter((_, idx) => idx !== index);
      if (prev[index]?.isPrimary && updated.length > 0) {
        updated[0].isPrimary = true;
      }
      return updated;
    });
    setInstagramErrors(prev => {
      const next = { ...prev };
      delete next[index];
      const shifted: Record<number, string> = {};
      Object.entries(next).forEach(([key, val]) => {
        const k = parseInt(key, 10);
        if (k > index) {
          shifted[k - 1] = val;
        } else {
          shifted[k] = val;
        }
      });
      return shifted;
    });
  };

  const updateInstagramAccountUsername = (index: number, username: string, customerId?: string) => {
    setInstagramAccounts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], username };
      return updated;
    });
    validateInstagramHandle(index, username, customerId);
  };

  const setInstagramAccountPrimary = (index: number) => {
    setInstagramAccounts(prev =>
      prev.map((acc, idx) => ({
        ...acc,
        isPrimary: idx === index
      }))
    );
  };

  useEffect(() => {
    loadCustomers();
    loadCountryCodes();
    loadChannels();
    loadLanguages();
  }, [loadCustomers, loadCountryCodes, loadChannels, loadLanguages]);

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

  const handleAddCustomer = async (addresses?: CreateAddressRequest[]) => {
    const hasIg = instagramAccounts.some(acc => acc.username.trim() !== '');
    if (!phone && !hasIg) return;
    
    if (Object.keys(instagramErrors).length > 0) {
      console.warn('Cannot add customer due to validation errors.');
      return;
    }
    
    try {
      const request: CreateCustomerRequest = {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phoneNumber: phone ? `${selectedCountry?.dialCode}${phone}` : undefined,
        instagramId: instagramAccounts.find(a => a.isPrimary)?.username || undefined,
        email: email || undefined,
        instagramAccounts: instagramAccounts
          .filter(a => a.username.trim() !== '')
          .map(a => ({
            id: '00000000-0000-0000-0000-000000000000',
            username: a.username.trim(),
            isPrimary: a.isPrimary
          })),
        preferredLanguages: preferredLanguages,
        addresses: addresses,
        gender: gender
      };
      
      const newCust = await customerService.createCustomer(request);
      setCustomers(prev => [newCust, ...prev]);
      
      // Reset form
      setFirstName('');
      setLastName('');
      setPhone('');
      setInstagramAccounts([{ username: '', isPrimary: true }]);
      setInstagramErrors({});
      setPreferredLanguages(['en-in']);
      setEmail('');
      setGender(undefined);
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to create customer:', error);
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
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const matchesInstagramAccounts = c.instagramAccounts?.some(acc => 
      acc.username?.toLowerCase().includes(query)
    );
    return (
      (c.firstName?.toLowerCase().includes(query)) ||
      (c.lastName?.toLowerCase().includes(query)) ||
      (c.phoneNumber?.includes(query)) ||
      (c.instagramId?.toLowerCase().includes(query)) ||
      matchesInstagramAccounts
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
    instagramAccounts,
    setInstagramAccounts,
    instagramErrors,
    setInstagramErrors,
    availableLanguages,
    preferredLanguages,
    setPreferredLanguages,
    addInstagramAccountField,
    removeInstagramAccountField,
    updateInstagramAccountUsername,
    setInstagramAccountPrimary,
    email,
    setEmail,

    gender,
    setGender,
    handleAddCustomer,

    toggleSubscription,
  };
};

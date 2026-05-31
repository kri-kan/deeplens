import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, IconButton, Modal, useTheme, Chip } from 'react-native-paper';
import { CountryCode, FormInstagramAccount } from '@/hooks/useCustomerManagement';
import { Language, Customer, CreateCustomerRequest, CreateAddressRequest } from '@/types/customers';
import { customerService } from '@/services/customerService';

import { AddressFormComponent, AddressFormState } from './AddressFormComponent';

interface EditCustomerModalProps {
  visible: boolean;
  onDismiss: () => void;
  customer: Customer;
  countryCodes: CountryCode[];
  availableLanguages: Language[];
  selectedCountry: CountryCode | null;
  onShowCountrySelector: () => void;
  onSubmit: (request: CreateCustomerRequest) => Promise<void>;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  visible,
  onDismiss,
  customer,
  countryCodes,
  availableLanguages,
  selectedCountry,
  onShowCountrySelector,
  onSubmit,
}) => {
  const theme = useTheme();

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | undefined>(undefined);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<CreateAddressRequest[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<FormInstagramAccount[]>([]);
  const [instagramErrors, setInstagramErrors] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Initialize fields on open
  useEffect(() => {
    if (visible && customer) {
      setFirstName(customer.firstName || '');
      setLastName(customer.lastName || '');
      setGender(customer.gender);
      setEmail(customer.email || '');
      setPreferredLanguages(customer.preferredLanguages || []);
      
      // Parse addresses
      if (customer.addresses && customer.addresses.length > 0) {
        setAddresses(customer.addresses.map(a => ({
          id: a.id,
          name: a.name,
          phone: a.phone,
          line1: a.line1,
          line2: a.line2,
          pincode: a.pincode,
          city: a.city,
          state: a.state,
          isDefault: a.isDefault
        })));
      } else {
        setAddresses([]);
      }
      
      // Parse phone number
      if (customer.phoneNumber) {
        // Sort countries descending by dial code length to match longest prefix
        const sortedCountries = [...countryCodes].sort((a, b) => b.dialCode.length - a.dialCode.length);
        const country = sortedCountries.find(c => customer.phoneNumber?.startsWith(c.dialCode));
        if (country) {
          setPhone(customer.phoneNumber.substring(country.dialCode.length));
        } else {
          setPhone(customer.phoneNumber);
        }
      } else {
        setPhone('');
      }

      // Parse instagram accounts
      if (customer.instagramAccounts && customer.instagramAccounts.length > 0) {
        setInstagramAccounts(customer.instagramAccounts.map(acc => ({
          id: acc.id,
          username: acc.username,
          isPrimary: acc.isPrimary
        })));
      } else {
        setInstagramAccounts([{ username: '', isPrimary: true }]);
      }
      setInstagramErrors({});
    }
  }, [visible, customer, countryCodes]);

  const handleLanguageToggle = (code: string) => {
    if (preferredLanguages.includes(code)) {
      if (preferredLanguages.length > 1) {
        setPreferredLanguages(preferredLanguages.filter(c => c !== code));
      }
    } else {
      setPreferredLanguages([...preferredLanguages, code]);
    }
  };

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

  const addAddressField = () => {
    setAddresses(prev => [
      ...prev,
      { name: '', phone: '', line1: '', pincode: '', isDefault: prev.length === 0 }
    ]);
  };

  const removeAddressField = (index: number) => {
    setAddresses(prev => prev.filter((_, idx) => idx !== index));
  };

  const setAddressDefault = (index: number, isDefault: boolean) => {
    setAddresses(prev => prev.map((addr, idx) => ({ 
      ...addr, 
      isDefault: idx === index ? isDefault : (isDefault ? false : addr.isDefault) 
    })));
  };

  const getAddressState = (addr: CreateAddressRequest): AddressFormState => {
    const parts = (addr.name || '').split(' ');
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      phone: addr.phone || '',
      pincode: addr.pincode || '',
      fullAddress: addr.line1 || '',
      isDefault: addr.isDefault
    };
  };

  const handleAddressChange = (index: number, state: AddressFormState) => {
    setAddresses(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        name: [state.firstName, state.lastName].filter(Boolean).join(' '),
        phone: state.phone,
        pincode: state.pincode,
        line1: state.fullAddress,
      };
      return updated;
    });
  };

  const handleSaveAddress = async (index: number) => {
    const addr = addresses[index];
    if (!addr.name.trim() || !addr.phone.trim() || !addr.line1.trim() || !addr.pincode.trim()) {
      return; 
    }

    try {
      if (addr.id) {
        await customerService.updateAddress(addr.id, {
          name: addr.name,
          phone: addr.phone,
          line1: addr.line1,
          line2: addr.line2,
          pincode: addr.pincode,
          city: addr.city,
          state: addr.state,
          isDefault: addr.isDefault
        });
      } else {
        const res = await customerService.addAddress(customer.id, {
          name: addr.name,
          phone: addr.phone,
          line1: addr.line1,
          line2: addr.line2,
          pincode: addr.pincode,
          city: addr.city,
          state: addr.state,
          isDefault: addr.isDefault
        });
        setAddresses(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], id: res.id };
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to save address:', err);
    }
  };

  const validateInstagramHandle = async (index: number, username: string) => {
    if (!username.trim()) {
      setInstagramErrors(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return;
    }

    try {
      const res = await customerService.validateInstagram(username.trim(), customer.id);
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
  };

  const updateInstagramAccountUsername = (index: number, username: string) => {
    setInstagramAccounts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], username };
      return updated;
    });
    validateInstagramHandle(index, username);
  };

  const setInstagramAccountPrimary = (index: number) => {
    setInstagramAccounts(prev =>
      prev.map((acc, idx) => ({
        ...acc,
        isPrimary: idx === index
      }))
    );
  };

  const handleSave = async () => {
    const hasIg = instagramAccounts.some(acc => acc.username.trim() !== '');
    if (!phone && !hasIg) return;

    if (Object.keys(instagramErrors).length > 0) {
      console.warn('Cannot save customer due to validation errors.');
      return;
    }

    setSubmitting(true);
    try {
      const request: CreateCustomerRequest = {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phoneNumber: phone ? `${selectedCountry?.dialCode}${phone}` : undefined,
        gender: gender,
        instagramId: instagramAccounts.find(a => a.isPrimary)?.username || undefined,
        email: email || undefined,
        addresses: addresses.filter(a => a.name.trim() !== '' && a.phone.trim() !== '' && a.line1.trim() !== '' && a.pincode.trim() !== ''),
        instagramAccounts: instagramAccounts
          .filter(a => a.username.trim() !== '')
          .map(a => ({
            id: a.id || '00000000-0000-0000-0000-000000000000',
            username: a.username.trim(),
            isPrimary: a.isPrimary
          })),
        preferredLanguages: preferredLanguages
      };
      
      await onSubmit(request);
      onDismiss();
    } catch (error) {
      console.error('Failed to update customer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const hasIgErrors = Object.keys(instagramErrors).length > 0;
  const hasPhone = phone.trim().length > 0;
  const hasIg = instagramAccounts.some(acc => acc.username.trim().length > 0);
  const isSubmitDisabled = (!hasPhone && !hasIg) || hasIgErrors || submitting;

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.content}>
      <View style={styles.handle} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text variant="headlineSmall" style={styles.title}>Edit Customer Details</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Update basic information or Instagram accounts.</Text>

        {/* Name Fields */}
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

        {/* Gender Section */}
        <View style={styles.genderRow}>
          <TouchableOpacity 
            style={[styles.genderButton, gender === 'Male' && styles.genderButtonSelected]}
            onPress={() => setGender('Male')}
          >
            <IconButton 
              icon="face-man" 
              iconColor={gender === 'Male' ? theme.colors.primary : theme.colors.outline} 
              size={24} 
              style={{ margin: 0 }}
            />
            <Text style={[styles.genderText, gender === 'Male' && { color: theme.colors.primary }]}>Male</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.genderButton, gender === 'Female' && styles.genderButtonSelected]}
            onPress={() => setGender('Female')}
          >
            <IconButton 
              icon="face-woman" 
              iconColor={gender === 'Female' ? theme.colors.primary : theme.colors.outline} 
              size={24} 
              style={{ margin: 0 }}
            />
            <Text style={[styles.genderText, gender === 'Female' && { color: theme.colors.primary }]}>Female</Text>
          </TouchableOpacity>
        </View>

        {/* Phone Section */}
        <View style={styles.phoneRow}>
          <TouchableOpacity 
            style={styles.countryPicker} 
            onPress={onShowCountrySelector}
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

        {/* Dynamic Instagram Accounts Section */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Instagram Accounts</Text>
          <Button 
            mode="text" 
            compact 
            icon="plus" 
            onPress={addInstagramAccountField}
            labelStyle={{ color: theme.colors.primary }}
          >
            Add Account
          </Button>
        </View>

        {instagramAccounts.map((acc, index) => {
          const hasError = !!instagramErrors[index];
          return (
            <View key={index} style={styles.instagramCard}>
              <View style={styles.instagramRow}>
                <IconButton
                  icon={acc.isPrimary ? 'star' : 'star-outline'}
                  iconColor={acc.isPrimary ? '#FFD700' : 'rgba(0,0,0,0.4)'}
                  size={24}
                  onPress={() => setInstagramAccountPrimary(index)}
                  style={styles.primaryToggle}
                />
                
                <TextInput
                  label={acc.isPrimary ? 'Instagram ID (Primary)' : 'Instagram ID'}
                  value={acc.username}
                  onChangeText={(val) => updateInstagramAccountUsername(index, val)}
                  mode="outlined"
                  error={hasError}
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  left={<TextInput.Icon icon="instagram" />}
                  autoCapitalize="none"
                />

                {instagramAccounts.length > 1 && (
                  <IconButton
                    icon="close-circle-outline"
                    iconColor={theme.colors.error}
                    size={22}
                    onPress={() => removeInstagramAccountField(index)}
                  />
                )}
              </View>
              {hasError && (
                <View style={styles.errorContainer}>
                  <IconButton icon="alert-circle-outline" iconColor={theme.colors.error} size={16} style={{ margin: 0 }} />
                  <Text style={[styles.errorText, { color: theme.colors.error }]}>
                    {instagramErrors[index]}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Addresses Section */}
        <View style={[styles.sectionHeader, { marginTop: 16 }]}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Addresses</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Button 
              mode="text" 
              compact 
              icon="plus" 
              onPress={addAddressField}
              labelStyle={{ color: theme.colors.primary }}
            >
              Add
            </Button>
          </View>
        </View>

        {addresses.map((addr, index) => (
          <AddressFormComponent
            key={index}
            value={getAddressState(addr)}
            onChange={(state) => handleAddressChange(index, state)}
            title={`Address ${index + 1}`}
            showCardLayout
            onRemove={() => removeAddressField(index)}
            onSetDefault={(val) => setAddressDefault(index, val)}
            onSave={() => handleSaveAddress(index)}
          />
        ))}

        {/* Preferred Languages Section */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 12, marginBottom: 8 }]}>
          Preferred Languages
        </Text>
        <View style={styles.chipContainer}>
          {availableLanguages.map((lang) => {
            const isSelected = preferredLanguages.includes(lang.code);
            return (
              <Chip
                key={lang.code}
                selected={isSelected}
                onPress={() => handleLanguageToggle(lang.code)}
                style={[
                  styles.languageChip,
                  isSelected && { backgroundColor: theme.colors.primaryContainer }
                ]}
                textStyle={isSelected ? { color: theme.colors.onPrimaryContainer, fontWeight: 'bold' } : undefined}
                showSelectedOverlay
              >
                {lang.name}
              </Chip>
            );
          })}
        </View>

        {/* Email Field */}
        <TextInput
          label="Email (Optional)"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          style={[styles.input, { marginTop: 16 }]}
          left={<TextInput.Icon icon="email" />}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        {/* Footer Actions */}
        <View style={styles.actions}>
          <Button mode="text" onPress={onDismiss} disabled={submitting}>Cancel</Button>
          <Button 
            mode="contained" 
            onPress={handleSave} 
            disabled={isSubmitDisabled}
            style={styles.submit}
            loading={submitting}
          >
            Save Changes
          </Button>
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    backgroundColor: 'white',
    padding: 24,
    paddingBottom: 40,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  scroll: {
    paddingBottom: 20,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.6,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    backgroundColor: 'white',
  },
  genderButtonSelected: {
    borderColor: '#6200ee',
    backgroundColor: 'rgba(98, 0, 238, 0.05)',
  },
  genderText: {
    fontWeight: '500',
    marginLeft: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
    backgroundColor: 'white',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  instagramCard: {
    marginBottom: 12,
  },
  instagramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  primaryToggle: {
    margin: 0,
  },
  addressCard: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressInput: {
    marginBottom: 8,
    backgroundColor: 'white',
  },
  addressRow: {
    flexDirection: 'row',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingLeft: 40,
  },
  errorText: {
    fontSize: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageChip: {
    backgroundColor: '#F0F0F0',
  },
  input: {
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
  },
  submit: {
    borderRadius: 8,
  },
});

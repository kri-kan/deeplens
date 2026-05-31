import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, IconButton, Modal, useTheme, Chip } from 'react-native-paper';
import { CountryCode, FormInstagramAccount } from '@/hooks/useCustomerManagement';
import { Language, CreateAddressRequest } from '@/types/customers';
import { AddressFormComponent, AddressFormState } from './AddressFormComponent';

interface AddCustomerModalProps {
  visible: boolean;
  onDismiss: () => void;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  gender: 'Male' | 'Female' | undefined;
  setGender: (v: 'Male' | 'Female' | undefined) => void;
  selectedCountry: CountryCode | null;
  onShowCountrySelector: () => void;
  onSubmit: (addresses: CreateAddressRequest[]) => void;

  // Multi-Instagram & Languages Props
  instagramAccounts: FormInstagramAccount[];
  instagramErrors: Record<number, string>;
  availableLanguages: Language[];
  preferredLanguages: string[];
  setPreferredLanguages: (languages: string[]) => void;
  onAddInstagramField: () => void;
  onRemoveInstagramField: (index: number) => void;
  onUpdateInstagramUsername: (index: number, username: string) => void;
  onSetInstagramPrimary: (index: number) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  visible,
  onDismiss,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  phone,
  setPhone,
  email,
  setEmail,
  gender,
  setGender,
  selectedCountry,
  onShowCountrySelector,
  onSubmit,

  instagramAccounts,
  instagramErrors,
  availableLanguages,
  preferredLanguages,
  setPreferredLanguages,
  onAddInstagramField,
  onRemoveInstagramField,
  onUpdateInstagramUsername,
  onSetInstagramPrimary,
}) => {
  const theme = useTheme();
  const [submitting, setSubmitting] = React.useState(false);
  const [addresses, setAddresses] = React.useState<CreateAddressRequest[]>([]);

  // Clear addresses when modal becomes visible/invisible
  React.useEffect(() => {
    if (visible) setAddresses([]);
  }, [visible]);

  const addAddressField = () => {
    setAddresses(prev => [
      ...prev,
      {
        name: '',
        phone: '',
        line1: '',
        pincode: '',
        isDefault: prev.length === 0
      }
    ]);
  };

  const removeAddressField = (index: number) => {
    setAddresses(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateAddress = (index: number, field: keyof CreateAddressRequest, value: string) => {
    setAddresses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
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

  const handleLanguageToggle = (code: string) => {
    if (preferredLanguages.includes(code)) {
      // Keep at least one language selected
      if (preferredLanguages.length > 1) {
        setPreferredLanguages(preferredLanguages.filter(c => c !== code));
      }
    } else {
      setPreferredLanguages([...preferredLanguages, code]);
    }
  };

  const hasIgErrors = instagramErrors ? Object.keys(instagramErrors).length > 0 : false;
  const hasPhone = (phone || '').trim().length > 0;
  const hasIg = instagramAccounts ? instagramAccounts.some(acc => (acc.username || '').trim().length > 0) : false;
  const isSubmitDisabled = (!hasPhone && !hasIg) || hasIgErrors;

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.content}>
      <View style={styles.handle} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text variant="headlineSmall" style={styles.title}>New Customer</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Phone or Instagram ID is required to create a profile.</Text>
        
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
            onPress={onAddInstagramField}
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
                  onPress={() => onSetInstagramPrimary(index)}
                  style={styles.primaryToggle}
                />
                
                <TextInput
                  label={acc.isPrimary ? 'Instagram ID (Primary)' : 'Instagram ID'}
                  value={acc.username}
                  onChangeText={(val) => onUpdateInstagramUsername(index, val)}
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
                    onPress={() => onRemoveInstagramField(index)}
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
          <Button mode="text" onPress={onDismiss}>Cancel</Button>
          <Button 
            mode="contained" 
            onPress={() => onSubmit(addresses)} 
            disabled={isSubmitDisabled}
            style={styles.submit}
          >
            Create Profile
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
  addressCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
});

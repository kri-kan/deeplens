import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, IconButton, Modal, useTheme, Chip } from 'react-native-paper';
import { CountryCode, FormInstagramAccount } from '@/hooks/useCustomerManagement';
import { Language } from '@/types/customers';

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
  selectedCountry: CountryCode | null;
  onShowCountrySelector: () => void;
  onSubmit: () => void;

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
            onPress={onSubmit} 
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
});

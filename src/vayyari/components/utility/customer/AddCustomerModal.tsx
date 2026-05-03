import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, IconButton, Modal, useTheme } from 'react-native-paper';
import { CountryCode } from '@/hooks/useCustomerManagement';

interface AddCustomerModalProps {
  visible: boolean;
  onDismiss: () => void;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  instagramId: string;
  setInstagramId: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  selectedCountry: CountryCode | null;
  onShowCountrySelector: () => void;
  onSubmit: () => void;
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
  instagramId,
  setInstagramId,
  email,
  setEmail,
  selectedCountry,
  onShowCountrySelector,
  onSubmit,
}) => {
  const theme = useTheme();

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.content}>
      <View style={styles.handle} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text variant="headlineSmall" style={styles.title}>New Customer</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Phone or Instagram ID is required to create a profile.</Text>
        
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

        <View style={styles.actions}>
          <Button mode="text" onPress={onDismiss}>Cancel</Button>
          <Button 
              mode="contained" 
              onPress={onSubmit} 
              disabled={!phone && !instagramId}
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
  input: {
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  submit: {
    borderRadius: 8,
  },
});

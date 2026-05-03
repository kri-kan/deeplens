import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, IconButton, Modal, Checkbox, useTheme } from 'react-native-paper';
import { CountryCode } from '@/hooks/useCustomerManagement';

interface AddAddressModalProps {
  visible: boolean;
  onDismiss: () => void;
  addrName: string;
  setAddrName: (v: string) => void;
  addrPhone: string;
  setAddrPhone: (v: string) => void;
  addrLine1: string;
  setAddrLine1: (v: string) => void;
  addrLine2: string;
  setAddrLine2: (v: string) => void;
  addrCity: string;
  setAddrCity: (v: string) => void;
  addrPincode: string;
  setAddrPincode: (v: string) => void;
  addrState: string;
  setAddrState: (v: string) => void;
  isDefault: boolean;
  setIsDefault: (v: boolean) => void;
  selectedCountry: CountryCode | null;
  onShowCountrySelector: () => void;
  onSubmit: () => void;
}

export const AddAddressModal: React.FC<AddAddressModalProps> = ({
  visible,
  onDismiss,
  addrName,
  setAddrName,
  addrPhone,
  setAddrPhone,
  addrLine1,
  setAddrLine1,
  addrLine2,
  setAddrLine2,
  addrCity,
  setAddrCity,
  addrPincode,
  setAddrPincode,
  addrState,
  setAddrState,
  isDefault,
  setIsDefault,
  selectedCountry,
  onShowCountrySelector,
  onSubmit,
}) => {
  const theme = useTheme();

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.content}>
      <View style={styles.handle} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text variant="headlineSmall" style={styles.title}>New Address</Text>
        
        <TextInput
          label="Recipient Name"
          value={addrName}
          onChangeText={setAddrName}
          mode="outlined"
          style={styles.input}
        />

        <View style={styles.phoneRow}>
           <TouchableOpacity 
            style={styles.countryPicker} 
            onPress={onShowCountrySelector}
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

        <View style={styles.actions}>
          <Button mode="text" onPress={onDismiss}>Cancel</Button>
          <Button 
              mode="contained" 
              onPress={onSubmit} 
              disabled={!addrName || !addrPhone || !addrLine1 || !addrPincode}
              style={styles.submit}
          >
              Save Address
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
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  submit: {
    borderRadius: 8,
  },
});

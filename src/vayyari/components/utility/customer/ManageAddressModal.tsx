import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Modal, Checkbox, useTheme } from 'react-native-paper';
import { AddressFormComponent, AddressFormState } from './AddressFormComponent';
import { customerService } from '@/services/customerService';
import { CustomerAddress } from '@/api/customers';
import { wrapInSpan } from '@/utils/telemetry';

interface ManageAddressModalProps {
  visible: boolean;
  onDismiss: () => void;
  customerId: string;
  addressToEdit?: CustomerAddress | null;
  onSuccess: () => void;
}

export const ManageAddressModal: React.FC<ManageAddressModalProps> = ({
  visible,
  onDismiss,
  customerId,
  addressToEdit,
  onSuccess,
}) => {
  const theme = useTheme();

  const [formState, setFormState] = useState<AddressFormState>({
    firstName: '',
    lastName: '',
    phone: '',
    pincode: '',
    fullAddress: '',
  });
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      if (addressToEdit) {
        const parts = (addressToEdit.name || '').split(' ');
        setFormState({
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || '',
          phone: addressToEdit.phone || '',
          pincode: addressToEdit.pincode || '',
          fullAddress: addressToEdit.line1 || '',
        });
        setIsDefault(addressToEdit.isDefault || false);
      } else {
        setFormState({
          firstName: '',
          lastName: '',
          phone: '',
          pincode: '',
          fullAddress: '',
        });
        setIsDefault(false);
      }
    }
  }, [visible, addressToEdit]);



  const handleSave = async () => {
    const name = [formState.firstName, formState.lastName].filter(Boolean).join(' ');
    if (!name.trim() || !formState.phone.trim() || !formState.fullAddress.trim() || !formState.pincode.trim()) {
      return;
    }

    try {
      setLoading(true);
      const requestData = {
        name,
        phone: formState.phone,
        line1: formState.fullAddress,
        pincode: formState.pincode,
        isDefault
      };

      await wrapInSpan('ManageAddressModal: saveAddress', async () => {
        if (addressToEdit && addressToEdit.id) {
          await customerService.updateAddress(addressToEdit.id, requestData);
        } else {
          await customerService.addAddress(customerId, requestData);
        }
      });
      
      onSuccess();
      onDismiss();
    } catch (error) {
      console.error('Failed to save address:', error);
    } finally {
      setLoading(false);
    }
  };

  const isValid = [formState.firstName, formState.lastName].filter(Boolean).join(' ').trim() && 
                  formState.phone.trim() && 
                  formState.fullAddress.trim() && 
                  formState.pincode.trim();

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.content, { backgroundColor: theme.colors.elevation.level3 }]}>
      <View style={[styles.handle, { backgroundColor: theme.colors.onSurfaceVariant }]} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.sectionHeader}>
          <Text variant="headlineSmall" style={styles.title}>
            {addressToEdit ? 'Edit Address' : 'New Address'}
          </Text>
        </View>



        <AddressFormComponent 
          value={formState}
          onChange={setFormState}
        />
        
        <View style={styles.checkboxRow}>
          <Checkbox
            status={isDefault ? 'checked' : 'unchecked'}
            onPress={() => setIsDefault(!isDefault)}
          />
          <Text variant="bodyMedium">Set as default address</Text>
        </View>

        <View style={styles.actions}>
          <Button mode="text" onPress={onDismiss} disabled={loading}>Cancel</Button>
          <Button 
              mode="contained" 
              onPress={handleSave} 
              disabled={!isValid || loading}
              loading={loading}
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
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
    opacity: 0.4,
  },
  scroll: {
    paddingBottom: 20,
  },
  title: {
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

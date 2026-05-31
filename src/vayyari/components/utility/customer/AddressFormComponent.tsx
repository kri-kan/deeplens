import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, IconButton, Text, useTheme, Switch } from 'react-native-paper';
import { SmartAddressFill, SmartAddressData } from './SmartAddressFill';

export interface AddressFormState {
  firstName: string;
  lastName: string;
  phone: string;
  pincode: string;
  fullAddress: string;
  isDefault?: boolean;
}

interface AddressFormComponentProps {
  value: AddressFormState;
  onChange: (value: AddressFormState) => void;
  disabled?: boolean;
  onRemove?: () => void;
  onSetDefault?: (value: boolean) => void;
  onSave?: () => void;
  title?: string;
  showCardLayout?: boolean;
}

export const AddressFormComponent: React.FC<AddressFormComponentProps> = ({
  value,
  onChange,
  disabled,
  onRemove,
  onSetDefault,
  onSave,
  title,
  showCardLayout = false,
}) => {
  const theme = useTheme();
  const [showSmartFill, setShowSmartFill] = useState(false);

  const handleSmartFill = (data: SmartAddressData) => {
    onChange({
      ...value,
      firstName: data.firstName || value.firstName,
      lastName: data.lastName || value.lastName,
      phone: data.phone || value.phone,
      pincode: data.pincode || value.pincode,
      fullAddress: data.address || value.fullAddress,
    });
    setShowSmartFill(false);
  };

  const updateField = (field: keyof AddressFormState, text: string) => {
    onChange({ ...value, [field]: text });
  };

  const renderContent = () => (
    <View style={{ gap: 12 }}>
      {showSmartFill && !disabled ? (
        <SmartAddressFill 
          onFill={handleSmartFill} 
          onCancel={() => setShowSmartFill(false)} 
        />
      ) : (
        <View style={{ gap: 12 }}>
          {/* Header Controls for inline form if not card layout */}
          {!showCardLayout && !disabled && (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: -4 }}>
              <Button 
                mode="text" 
                compact 
                icon="auto-fix" 
                onPress={() => setShowSmartFill(true)}
                labelStyle={{ color: theme.colors.primary }}
              >
                Smart Fill
              </Button>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput 
              label="First Name" 
              value={value.firstName} 
              onChangeText={(text) => updateField('firstName', text)} 
              mode="outlined" 
              dense 
              style={{ flex: 1 }} 
              disabled={disabled} 
            />
            <TextInput 
              label="Last Name" 
              value={value.lastName} 
              onChangeText={(text) => updateField('lastName', text)} 
              mode="outlined" 
              dense 
              style={{ flex: 1 }} 
              disabled={disabled} 
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput 
              label="Phone Number" 
              value={value.phone} 
              onChangeText={(text) => updateField('phone', text)} 
              mode="outlined" 
              dense 
              style={{ flex: 1 }} 
              keyboardType="phone-pad" 
              disabled={disabled} 
            />
            <TextInput 
              label="Pincode" 
              value={value.pincode} 
              onChangeText={(text) => updateField('pincode', text)} 
              mode="outlined" 
              dense 
              style={{ flex: 1 }} 
              keyboardType="number-pad" 
              disabled={disabled} 
            />
          </View>

          <TextInput 
            label="Full Address" 
            value={value.fullAddress} 
            onChangeText={(text) => updateField('fullAddress', text)} 
            mode="outlined" 
            multiline 
            numberOfLines={3} 
            dense 
            disabled={disabled} 
          />
          {onSetDefault && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
              <Text variant="bodyMedium">Set as Default Address</Text>
              <Switch 
                value={value.isDefault || false} 
                onValueChange={onSetDefault} 
                disabled={disabled} 
                color={theme.colors.primary}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );

  if (showCardLayout) {
    return (
      <View style={styles.addressCard}>
        <View style={styles.addressHeader}>
          <Text variant="titleSmall">{title || 'Address'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!disabled && (
              <Button 
                mode="text" 
                compact 
                icon="auto-fix" 
                onPress={() => setShowSmartFill(!showSmartFill)}
                labelStyle={{ color: theme.colors.primary }}
              >
                Smart Fill
              </Button>
            )}
            {onSave && (
              <IconButton
                icon="content-save-outline"
                iconColor={theme.colors.primary}
                size={20}
                onPress={onSave}
                style={{ marginLeft: 8 }}
                disabled={disabled}
              />
            )}
            {onRemove && (
              <IconButton
                icon="delete-outline"
                iconColor={theme.colors.error}
                size={20}
                onPress={onRemove}
                style={{ marginLeft: 4, marginRight: 0 }}
                disabled={disabled}
              />
            )}
          </View>
        </View>
        {renderContent()}
      </View>
    );
  }

  return renderContent();
};

const styles = StyleSheet.create({
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
